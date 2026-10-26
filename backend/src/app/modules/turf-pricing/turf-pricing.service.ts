import { Injectable } from '@nestjs/common';
import status from 'http-status';
import { Prisma } from '../../../generated/prisma/client';
import { UserRole } from '../../../generated/prisma/enums';

import AppError from '../../../config/errorHelpers/AppError';
import prisma from '../../../shared/prisma';
import { IRequestUser } from '../../interfaces/requestUser.interface';

@Injectable()
export class TurfPricingService {
  /**
   * Create a slot time setup (owned by user)
   */
  async createSlotTimeSetup(
    owner: IRequestUser,
    data: {
      timeName: string;
      startMinute: number;
      endMinute: number;
    },
  ) {
    if (
      !data.timeName ||
      !Number.isInteger(data.startMinute) ||
      !Number.isInteger(data.endMinute) ||
      data.startMinute < 0 ||
      data.endMinute > 1440 ||
      data.endMinute <= data.startMinute
    ) {
      throw new AppError(status.BAD_REQUEST, 'Invalid slot time setup');
    }

    const existing = await prisma.slotTimeSetup.findFirst({
      where: {
        ownerId: owner.userId,
        startMinute: data.startMinute,
        endMinute: data.endMinute,
        timeName: data.timeName,
      },
    });
    if (existing) {
      throw new AppError(status.CONFLICT, 'Slot time setup already exists');
    }

    return prisma.slotTimeSetup.create({
      data: {
        timeName: data.timeName,
        startMinute: data.startMinute,
        endMinute: data.endMinute,
        ownerId: owner.userId,
      },
    });
  }

  /**
   * Update a slot time setup
   */
  async updateSlotTimeSetup(
    owner: IRequestUser,
    id: string,
    data: {
      timeName?: string;
      startMinute?: number;
      endMinute?: number;
    },
  ) {
    const setup = await prisma.slotTimeSetup.findUnique({ where: { id } });
    if (!setup) {
      throw new AppError(status.NOT_FOUND, 'Slot time setup not found');
    }
    if (setup.ownerId !== owner.userId && owner.role !== UserRole.ADMIN) {
      throw new AppError(status.FORBIDDEN, 'Access denied');
    }

    const startMinute = data.startMinute ?? setup.startMinute;
    const endMinute = data.endMinute ?? setup.endMinute;

    if (
      !Number.isInteger(startMinute) ||
      !Number.isInteger(endMinute) ||
      startMinute < 0 ||
      endMinute > 1440 ||
      endMinute <= startMinute
    ) {
      throw new AppError(status.BAD_REQUEST, 'Invalid slot time setup');
    }

    return prisma.slotTimeSetup.update({
      where: { id },
      data: {
        timeName: data.timeName ?? setup.timeName,
        startMinute,
        endMinute,
      },
    });
  }

  /**
   * Delete a slot time setup
   */
  async deleteSlotTimeSetup(owner: IRequestUser, id: string) {
    const setup = await prisma.slotTimeSetup.findUnique({ where: { id } });
    if (!setup) {
      throw new AppError(status.NOT_FOUND, 'Slot time setup not found');
    }
    if (setup.ownerId !== owner.userId && owner.role !== UserRole.ADMIN) {
      throw new AppError(status.FORBIDDEN, 'Access denied');
    }

    return prisma.slotTimeSetup.delete({ where: { id } });
  }

  // ==========================
  // Pricing Rules
  // ==========================

  /**
   * List price rules for a specific turf
   */
  async listPrices(owner: IRequestUser, turfId: string) {
    await this.assertOwner(owner, turfId);

    return prisma.turfPriceRule.findMany({
      where: { turfId },
      include: { slotTimeSetup: true },
      orderBy: [{ dayOfWeek: 'asc' }, { slotTimeSetup: { startMinute: 'asc' } }],
    });
  }

  /**
   * List all price rules across all turfs owned by the user
   */
  async listAllPrices(owner: IRequestUser) {
    const turfs = await prisma.turf.findMany({
      where: { ownerId: owner.userId },
      select: { id: true, name: true },
    });
    const turfIds = turfs.map((turf) => turf.id);

    const rules = await prisma.turfPriceRule.findMany({
      where: { turfId: { in: turfIds } },
      include: {
        turf: { select: { id: true, name: true } },
        slotTimeSetup: true,
      },
      orderBy: [{ dayOfWeek: 'asc' }, { slotTimeSetup: { startMinute: 'asc' } }],
    });

    return { rules, turfs };
  }

  /**
   * Create a single price rule for one day of week
   */
  async createPrice(
    owner: IRequestUser,
    turfId: string,
    data: {
      slotTimeSetupId: string;
      dayOfWeek: number;
      price: number;
      active?: boolean;
    },
  ) {
    await this.assertOwner(owner, turfId);

    if (
      !data.slotTimeSetupId ||
      !Number.isInteger(data.dayOfWeek) ||
      data.dayOfWeek < 0 ||
      data.dayOfWeek > 6 ||
      data.price < 0
    ) {
      throw new AppError(status.BAD_REQUEST, 'Invalid pricing rule');
    }

    const setup = await prisma.slotTimeSetup.findUnique({
      where: { id: data.slotTimeSetupId },
    });
    if (!setup) {
      throw new AppError(status.NOT_FOUND, 'Slot time setup not found');
    }
    if (setup.ownerId !== owner.userId && owner.role !== UserRole.ADMIN) {
      throw new AppError(status.FORBIDDEN, 'Slot time setup access denied');
    }

    const overlapping = await prisma.turfPriceRule.findFirst({
      where: {
        turfId,
        dayOfWeek: data.dayOfWeek,
        active: true,
        slotTimeSetupId: { not: data.slotTimeSetupId },
        slotTimeSetup: {
          startMinute: { lt: setup.endMinute },
          endMinute: { gt: setup.startMinute },
        },
      },
    });
    if (overlapping) {
      throw new AppError(
        status.CONFLICT,
        'Pricing rules cannot overlap for the same day',
      );
    }

    return prisma.turfPriceRule.upsert({
      where: {
        turfId_dayOfWeek_slotTimeSetupId: {
          turfId,
          dayOfWeek: data.dayOfWeek,
          slotTimeSetupId: data.slotTimeSetupId,
        },
      },
      create: {
        turfId,
        slotTimeSetupId: data.slotTimeSetupId,
        dayOfWeek: data.dayOfWeek,
        price: new Prisma.Decimal(data.price),
        active: data.active ?? true,
      },
      update: {
        price: new Prisma.Decimal(data.price),
        active: data.active ?? true,
      },
      include: { slotTimeSetup: true },
    });
  }

  /**
   * Create price rules for all 7 days for a given slot time setup
   */
  async createPriceBulk(
    owner: IRequestUser,
    turfId: string,
    data: {
      slotTimeSetupId: string;
      price: number;
      active?: boolean;
    },
  ) {
    await this.assertOwner(owner, turfId);

    if (!data.slotTimeSetupId || data.price < 0) {
      throw new AppError(status.BAD_REQUEST, 'Invalid pricing rule');
    }

    const setup = await prisma.slotTimeSetup.findUnique({
      where: { id: data.slotTimeSetupId },
    });
    if (!setup) {
      throw new AppError(status.NOT_FOUND, 'Slot time setup not found');
    }
    if (setup.ownerId !== owner.userId && owner.role !== UserRole.ADMIN) {
      throw new AppError(status.FORBIDDEN, 'Slot time setup access denied');
    }

    const dayNames = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];

    return prisma.$transaction(async (tx) => {
      const results = [];

      for (let day = 0; day < 7; day++) {
        const overlap = await tx.turfPriceRule.findFirst({
          where: {
            turfId,
            dayOfWeek: day,
            active: true,
            slotTimeSetupId: { not: data.slotTimeSetupId },
            slotTimeSetup: {
              startMinute: { lt: setup.endMinute },
              endMinute: { gt: setup.startMinute },
            },
          },
        });
        if (overlap) {
          throw new AppError(
            status.CONFLICT,
            `Pricing rules cannot overlap on ${dayNames[day]}`,
          );
        }

        const existing = await tx.turfPriceRule.findFirst({
          where: {
            turfId,
            dayOfWeek: day,
            slotTimeSetupId: data.slotTimeSetupId,
          },
          select: { id: true },
        });

        if (existing) {
          results.push(
            await tx.turfPriceRule.update({
              where: { id: existing.id },
              data: {
                price: new Prisma.Decimal(data.price),
                active: data.active ?? true,
              },
              include: { slotTimeSetup: true },
            }),
          );
        } else {
          results.push(
            await tx.turfPriceRule.create({
              data: {
                turfId,
                slotTimeSetupId: data.slotTimeSetupId,
                dayOfWeek: day,
                price: new Prisma.Decimal(data.price),
                active: data.active ?? true,
              },
              include: { slotTimeSetup: true },
            }),
          );
        }
      }

      return results;
    });
  }

  /**
   * Update a single price rule
   */
  async updatePrice(
    owner: IRequestUser,
    id: string,
    data: {
      slotTimeSetupId?: string;
      dayOfWeek?: number;
      price?: number;
      active?: boolean;
    },
  ) {
    const rule = await prisma.turfPriceRule.findUnique({ where: { id } });
    if (!rule) {
      throw new AppError(status.NOT_FOUND, 'Price rule not found');
    }

    await this.assertOwner(owner, rule.turfId);

    const dayOfWeek = data.dayOfWeek ?? rule.dayOfWeek;
    const slotTimeSetupId = data.slotTimeSetupId ?? rule.slotTimeSetupId;

    if (
      !Number.isInteger(dayOfWeek) ||
      dayOfWeek < 0 ||
      dayOfWeek > 6 ||
      (data.price !== undefined && data.price < 0)
    ) {
      throw new AppError(status.BAD_REQUEST, 'Invalid pricing rule');
    }

    const setup = await prisma.slotTimeSetup.findUnique({
      where: { id: slotTimeSetupId },
    });
    if (!setup) {
      throw new AppError(status.NOT_FOUND, 'Slot time setup not found');
    }
    if (setup.ownerId !== owner.userId && owner.role !== UserRole.ADMIN) {
      throw new AppError(status.FORBIDDEN, 'Slot time setup access denied');
    }

    const overlap = await prisma.turfPriceRule.findFirst({
      where: {
        id: { not: id },
        turfId: rule.turfId,
        dayOfWeek,
        active: data.active ?? rule.active,
        slotTimeSetupId: { not: slotTimeSetupId },
        slotTimeSetup: {
          startMinute: { lt: setup.endMinute },
          endMinute: { gt: setup.startMinute },
        },
      },
    });
    if (overlap) {
      throw new AppError(
        status.CONFLICT,
        'Pricing rules cannot overlap for the same day',
      );
    }

    return prisma.turfPriceRule.update({
      where: { id },
      data: {
        slotTimeSetupId: data.slotTimeSetupId,
        dayOfWeek: data.dayOfWeek,
        price:
          data.price !== undefined ? new Prisma.Decimal(data.price) : undefined,
        active: data.active,
      },
      include: { slotTimeSetup: true },
    });
  }

  /**
   * Delete a single price rule
   */
  async deletePrice(owner: IRequestUser, id: string) {
    const rule = await prisma.turfPriceRule.findUnique({ where: { id } });

    if (!rule) {
      throw new AppError(status.NOT_FOUND, 'Price rule not found');
    }

    await this.assertOwner(owner, rule.turfId);

    return prisma.turfPriceRule.delete({ where: { id } });
  }

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