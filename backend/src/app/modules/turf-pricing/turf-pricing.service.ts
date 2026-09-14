import { Injectable } from '@nestjs/common';
import status from 'http-status';
import { Prisma } from '../../../generated/prisma/client';
import { UserRole } from '../../../generated/prisma/enums';

import AppError from '../../../config/errorHelpers/AppError';
import prisma from '../../../shared/prisma';
import { IRequestUser } from '../../interfaces/requestUser.interface';

@Injectable()
export class TurfPricingService {
  async listPrices(
    owner: IRequestUser,
    turfId: string,
    options?: { date?: Date },
  ) {
    await this.assertOwner(owner, turfId);
    const where: Prisma.TurfPriceRuleWhereInput = {
      turfId,
      ...(options?.date
        ? {
            startDate: { lte: options.date },
            endDate: { gte: options.date },
          }
        : {}),
    };
    return prisma.turfPriceRule.findMany({
      where,
      orderBy: [{ dayOfWeek: 'asc' }, { startDate: 'asc' }, { startMinute: 'asc' }],
    });
  }

  async listAllPrices(
    owner: IRequestUser,
    options?: { date?: Date },
  ) {
    const turfs = await prisma.turf.findMany({
      where: { ownerId: owner.userId },
      select: { id: true, name: true },
    });
    const turfIds = turfs.map((turf) => turf.id);
    const where: Prisma.TurfPriceRuleWhereInput = {
      turfId: { in: turfIds },
      ...(options?.date
        ? {
            startDate: { lte: options.date },
            endDate: { gte: options.date },
          }
        : {}),
    };
    const rules = await prisma.turfPriceRule.findMany({
      where,
      orderBy: [{ dayOfWeek: 'asc' }, { startDate: 'asc' }, { startMinute: 'asc' }],
      include: { turf: { select: { id: true, name: true } } },
    });
    return { rules, turfs };
  }

  async createPrice(
    owner: IRequestUser,
    turfId: string,
    data: {
      dayOfWeek: number;
      startMinute: number;
      endMinute: number;
      price: number;
      active?: boolean;
      startDate: Date;
      endDate: Date;
    },
  ) {
    await this.assertOwner(owner, turfId);

    if (
      !Number.isInteger(data.dayOfWeek) ||
      data.dayOfWeek < 0 ||
      data.dayOfWeek > 6 ||
      !Number.isInteger(data.startMinute) ||
      !Number.isInteger(data.endMinute) ||
      data.startMinute < 0 ||
      data.endMinute > 1440 ||
      data.endMinute <= data.startMinute ||
      data.price < 0
    ) {
      throw new AppError(status.BAD_REQUEST, 'Invalid pricing rule');
    }

    if (!data.startDate || !data.endDate) {
      throw new AppError(status.BAD_REQUEST, 'Start date and end date are required');
    }

    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new AppError(status.BAD_REQUEST, 'Invalid date format');
    }
    if (startDate >= endDate) {
      throw new AppError(status.BAD_REQUEST, 'Start date must be before end date');
    }

    const existingRule = await prisma.turfPriceRule.findFirst({
      where: {
        turfId,
        dayOfWeek: data.dayOfWeek,
        startDate,
        endDate,
      },
      select: { id: true },
    });

    const overlap = await prisma.turfPriceRule.findFirst({
      where: {
        turfId,
        dayOfWeek: data.dayOfWeek,
        active: true,
        startDate: { lt: endDate },
        endDate: { gt: startDate },
        startMinute: { lt: data.endMinute },
        endMinute: { gt: data.startMinute },
        ...(existingRule ? { id: { not: existingRule.id } } : {}),
      },
    });
    if (overlap) throw new AppError(status.CONFLICT, 'Pricing rules cannot overlap within the same date range');

    return prisma.turfPriceRule.upsert({
      where: {
        turfId_dayOfWeek_startDate_endDate_startMinute_endMinute: {
          turfId,
          dayOfWeek: data.dayOfWeek,
          startDate,
          endDate,
          startMinute: data.startMinute,
          endMinute: data.endMinute,
        },
      },
      create: {
        turfId,
        dayOfWeek: data.dayOfWeek,
        startMinute: data.startMinute,
        endMinute: data.endMinute,
        price: new Prisma.Decimal(data.price),
        active: data.active ?? true,
        startDate,
        endDate,
      },
      update: {
        price: new Prisma.Decimal(data.price),
        active: data.active ?? true,
        startDate,
        endDate,
      },
    });
  }

  async createPriceBulk(
    owner: IRequestUser,
    turfId: string,
    data: {
      startMinute: number;
      endMinute: number;
      price: number;
      active?: boolean;
      startDate: Date;
      endDate: Date;
    },
  ) {
    await this.assertOwner(owner, turfId);

    if (
      !Number.isInteger(data.startMinute) ||
      !Number.isInteger(data.endMinute) ||
      data.startMinute < 0 ||
      data.endMinute > 1440 ||
      data.endMinute <= data.startMinute ||
      data.price < 0
    ) {
      throw new AppError(status.BAD_REQUEST, 'Invalid pricing rule');
    }

    if (!data.startDate || !data.endDate) {
      throw new AppError(status.BAD_REQUEST, 'Start date and end date are required');
    }

    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new AppError(status.BAD_REQUEST, 'Invalid date format');
    }
    if (startDate >= endDate) {
      throw new AppError(status.BAD_REQUEST, 'Start date must be before end date');
    }

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return prisma.$transaction(async (tx) => {
      const results = [];
      for (let day = 0; day < 7; day++) {
        const existing = await tx.turfPriceRule.findFirst({
          where: {
            turfId,
            dayOfWeek: day,
            startDate,
            endDate,
            startMinute: data.startMinute,
            endMinute: data.endMinute,
          },
          select: { id: true },
        });

        const overlap = await tx.turfPriceRule.findFirst({
          where: {
            turfId,
            dayOfWeek: day,
            active: true,
            startDate: { lt: endDate },
            endDate: { gt: startDate },
            startMinute: { lt: data.endMinute },
            endMinute: { gt: data.startMinute },
            ...(existing ? { id: { not: existing.id } } : {}),
          },
        });
        if (overlap) {
          throw new AppError(
            status.CONFLICT,
            `Pricing rules cannot overlap on ${dayNames[day]} within the same date range`,
          );
        }

        if (existing) {
          results.push(
            await tx.turfPriceRule.update({
              where: { id: existing.id },
              data: {
                price: new Prisma.Decimal(data.price),
                active: data.active ?? true,
                startDate,
                endDate,
              },
            }),
          );
        } else {
          results.push(
            await tx.turfPriceRule.create({
              data: {
                turfId,
                dayOfWeek: day,
                startMinute: data.startMinute,
                endMinute: data.endMinute,
                price: new Prisma.Decimal(data.price),
                active: data.active ?? true,
                startDate,
                endDate,
              },
            }),
          );
        }
      }
      return results;
    });
  }

  async updatePrice(
    owner: IRequestUser,
    id: string,
    data: {
      dayOfWeek?: number;
      startMinute?: number;
      endMinute?: number;
      price?: number;
      active?: boolean;
      startDate?: Date;
      endDate?: Date;
    },
  ) {
    const rule = await prisma.turfPriceRule.findUnique({ where: { id } });

    if (!rule) {
      throw new AppError(status.NOT_FOUND, 'Price rule not found');
    }

    await this.assertOwner(owner, rule.turfId);

    const startMinute = data.startMinute ?? rule.startMinute;
    const endMinute = data.endMinute ?? rule.endMinute;
    const dayOfWeek = data.dayOfWeek ?? rule.dayOfWeek;
    const startDate = data.startDate ? new Date(data.startDate) : rule.startDate;
    const endDate = data.endDate ? new Date(data.endDate) : rule.endDate;

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new AppError(status.BAD_REQUEST, 'Invalid date format');
    }

    if (
      !Number.isInteger(dayOfWeek) ||
      dayOfWeek < 0 ||
      dayOfWeek > 6 ||
      !Number.isInteger(startMinute) ||
      !Number.isInteger(endMinute) ||
      startMinute < 0 ||
      endMinute > 1440 ||
      endMinute <= startMinute ||
      (data.price !== undefined && data.price < 0)
    ) {
      throw new AppError(status.BAD_REQUEST, 'Invalid pricing rule');
    }

    if (startDate >= endDate) {
      throw new AppError(status.BAD_REQUEST, 'Start date must be before end date');
    }

    const overlap = await prisma.turfPriceRule.findFirst({
      where: {
        id: { not: id },
        turfId: rule.turfId,
        dayOfWeek,
        active: data.active ?? rule.active,
        startDate: { lt: endDate },
        endDate: { gt: startDate },
        startMinute: { lt: endMinute },
        endMinute: { gt: startMinute },
      },
    });
    if (overlap) throw new AppError(status.CONFLICT, 'Pricing rules cannot overlap within the same date range');

    return prisma.turfPriceRule.update({
      where: { id },
      data: {
        ...data,
        startDate,
        endDate,
        price: data.price !== undefined ? new Prisma.Decimal(data.price) : undefined,
      },
    });
  }

  async deletePrice(owner: IRequestUser, id: string) {
    const rule = await prisma.turfPriceRule.findUnique({ where: { id } });

    if (!rule) {
      throw new AppError(status.NOT_FOUND, 'Price rule not found');
    }

    await this.assertOwner(owner, rule.turfId);

    return prisma.turfPriceRule.delete({ where: { id } });
  }

  // Fixed ownership assertion: allows admin or the actual owner
  private async assertOwner(owner: IRequestUser, turfId: string) {
    const turf = await prisma.turf.findFirst({ where: { id: turfId } });
    if (!turf) {
      throw new AppError(status.NOT_FOUND, 'Turf not found');
    }
    if (owner.role !== UserRole.ADMIN && turf.ownerId !== owner.userId) {
      throw new AppError(status.FORBIDDEN, 'Turf access denied');
    }
  }
}
