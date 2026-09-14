import { Injectable, OnModuleInit } from '@nestjs/common';
import cron from 'node-cron';
import status from 'http-status';
import { Prisma } from '../../../generated/prisma/client';
import { TurfStatus, UserRole, SlotSatus } from '../../../generated/prisma/enums';

import AppError from '../../../config/errorHelpers/AppError';
import prisma from '../../../shared/prisma';
import { IRequestUser } from '../../interfaces/requestUser.interface';
import { getMinuteOfDayInTimezone, isDateToday } from '../../utils/dateTimeUtils';

@Injectable()
export class TurfSlotService implements OnModuleInit {
  onModuleInit() {
    cron.schedule('0 0 * * *', () => this.generateSlotsForNextMonth().catch(() => undefined));
    cron.schedule('0 * * * *', () => this.cleanupPrebookedSlots().catch(() => undefined));
  }

  async cleanupPrebookedSlots() {
    const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const result = await prisma.turfSlot.updateMany({
      where: {
        slotStatus: SlotSatus.RESERVED,
        updatedAt: { lte: cutoff },
      },
      data: { slotStatus: SlotSatus.AVAILABLE },
    });
    return { count: result.count };
  }

  async generateSlots(
    owner: IRequestUser,
    turfId: string,
    options: { days?: number },
  ) {
    await this.assertOwner(owner, turfId);

    const turf = await prisma.turf.findUnique({
      where: { id: turfId },
      include: { priceRules: { where: { active: true } } },
    });
    if (!turf) throw new AppError(status.NOT_FOUND, 'Turf not found');

    const days = options.days ?? 30;
    const created: { slotDate: Date; count: number }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let d = 0; d < days; d++) {
      const slotDate = new Date(today);
      slotDate.setDate(today.getDate() + d);

      const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: turf.timezone }).format(slotDate);
      const dayOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekday);

      const slots: { turfId: string; slotDate: Date; startMinute: number; endMinute: number; price: number }[] = [];
      for (let i = 0; i < Math.floor(1440 / turf.slotMinutes); i++) {
        const startMinute = i * turf.slotMinutes;
        const endMinute = startMinute + turf.slotMinutes;
        const rule = turf.priceRules.find(
          (r) =>
            r.dayOfWeek === dayOfWeek &&
            r.startDate <= slotDate &&
            r.endDate >= slotDate &&
            r.startMinute <= startMinute &&
            r.endMinute >= endMinute,
        );
        const price = Number(rule?.price ?? turf.basePrice);

        const existing = await prisma.turfSlot.findFirst({
          where: {
            turfId,
            slotDate,
            startMinute,
            endMinute,
          },
          select: { id: true },
        });

        if (existing) {
          await prisma.turfSlot.update({
            where: { id: existing.id },
            data: { price: new Prisma.Decimal(price) },
          });
        } else {
          slots.push({ turfId, slotDate, startMinute, endMinute, price });
        }
      }

      if (slots.length > 0) {
        await prisma.turfSlot.createMany({ data: slots });
      }
      created.push({ slotDate, count: Math.floor(1440 / turf.slotMinutes) });
    }
    return { turfId, daysGenerated: days, slotsPerDay: Math.floor(1440 / turf.slotMinutes), created };
  }

  async listTurfSlots(
    owner: IRequestUser,
    turfId: string,
    options: { date?: string; activeOnly?: boolean },
  ) {
    await this.assertOwner(owner, turfId);

    const where: Prisma.TurfSlotWhereInput = { turfId };
    if (options.date) {
      const d = new Date(`${options.date}T00:00:00.000Z`);
      where.slotDate = d;
    }
    if (options.activeOnly) {
      where.active = true;
    }

    const slots = await prisma.turfSlot.findMany({
      where,
      orderBy: [{ slotDate: 'asc' }, { startMinute: 'asc' }],
    });
    return slots;
  }

  async listAllSlotsForOwner(
    owner: IRequestUser,
    options: { date?: string },
  ) {
    const turfs = await prisma.turf.findMany({
      where: { ownerId: owner.userId },
      select: { id: true, name: true },
    });
    const turfIds = turfs.map((t) => t.id);

    const where: Prisma.TurfSlotWhereInput = {
      turfId: { in: turfIds.length ? turfIds : ['__none__'] },
    };
    if (options.date) {
      const d = new Date(`${options.date}T00:00:00.000Z`);
      where.slotDate = d;
    }

    const slots = await prisma.turfSlot.findMany({
      where,
      orderBy: [{ slotDate: 'asc' }, { turfId: 'asc' }, { startMinute: 'asc' }],
      include: { turf: { select: { id: true, name: true } } },
    });
    return { turfs, slots };
  }

  async getSlotsByDate(turfId: string, date: string) {
    const turf = await prisma.turf.findFirst({
      where: { id: turfId, status: TurfStatus.ACTIVE },
      include: { priceRules: { where: { active: true } } },
    });
    if (!turf) throw new AppError(status.NOT_FOUND, 'Turf not found');

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new AppError(status.BAD_REQUEST, 'Invalid date');
    }

    const slotDate = new Date(`${date}T00:00:00.000Z`);

    const now = new Date();
    const currentMinuteOfDay = getMinuteOfDayInTimezone(now, turf.timezone);
    const isToday = isDateToday(date, now, turf.timezone);

    const slots = await prisma.turfSlot.findMany({
      where: { turfId, slotDate, active: true },
      orderBy: { startMinute: 'asc' },
    });

    if (slots.length > 0) {
      return slots
        .filter((slot) => !isToday || slot.startMinute >= currentMinuteOfDay)
        .map((slot) => ({
          startMinute: slot.startMinute,
          endMinute: slot.endMinute,
          available: slot.slotStatus === SlotSatus.AVAILABLE,
          status: slot.slotStatus,
          price: Number(slot.price),
          id: slot.id,
        }));
    }
    return [];
  }

  async updateSlot(owner: IRequestUser, slotId: string, payload: { active?: boolean; price?: number }) {
    const slot = await prisma.turfSlot.findUnique({
      where: { id: slotId },
      include: { turf: true },
    });
    if (!slot) throw new AppError(status.NOT_FOUND, 'Slot not found');

    await this.assertOwner(owner, slot.turfId);

    return prisma.turfSlot.update({
      where: { id: slotId },
      data: {
        ...(payload.active !== undefined ? { active: payload.active } : {}),
        ...(payload.price !== undefined ? { price: new Prisma.Decimal(payload.price) } : {}),
      },
    });
  }

  async generateSlotsForNextMonth() {
    const turfs = await prisma.turf.findMany({
      where: { status: TurfStatus.ACTIVE },
      include: { priceRules: { where: { active: true } } },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let totalSlots = 0;
    let totalTurfs = 0;

    for (const turf of turfs) {
      for (let d = 0; d < 30; d++) {
        const slotDate = new Date(today);
        slotDate.setDate(today.getDate() + d);

        const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: turf.timezone }).format(slotDate);
        const dayOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekday);

        const slotsToCreate: { turfId: string; slotDate: Date; startMinute: number; endMinute: number; price: number }[] = [];
        for (let i = 0; i < Math.floor(1440 / turf.slotMinutes); i++) {
          const startMinute = i * turf.slotMinutes;
          const endMinute = startMinute + turf.slotMinutes;

          const existing = await prisma.turfSlot.findFirst({
            where: { turfId: turf.id, slotDate, startMinute, endMinute },
            select: { id: true },
          });
          if (existing) continue;

          const rule = turf.priceRules.find(
            (r) =>
              r.dayOfWeek === dayOfWeek &&
              r.startDate <= slotDate &&
              r.endDate >= slotDate &&
              r.startMinute <= startMinute &&
              r.endMinute >= endMinute,
          );
          const price = Number(rule?.price ?? turf.basePrice);
          slotsToCreate.push({ turfId: turf.id, slotDate, startMinute, endMinute, price });
        }

        if (slotsToCreate.length > 0) {
          await prisma.turfSlot.createMany({ data: slotsToCreate });
          totalSlots += slotsToCreate.length;
          totalTurfs += 1;
        }
      }
    }

    return { totalTurfs, totalSlots };
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
