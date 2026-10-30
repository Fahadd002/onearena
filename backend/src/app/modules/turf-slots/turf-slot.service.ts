import { Injectable } from '@nestjs/common';
import status from 'http-status';
import { Prisma } from '../../../generated/prisma/client';
import { TurfStatus, UserRole, SlotSatus } from '../../../generated/prisma/enums';

import AppError from '../../../config/errorHelpers/AppError';
import prisma from '../../../shared/prisma';
import { IRequestUser } from '../../interfaces/requestUser.interface';
import { addCalendarDays, getMinuteOfDayInTimezone, isDateToday, startOfDayInTimezone } from '../../utils/dateTimeUtils';

type SlotTimeSetupLite = {
  startMinute: number;
  endMinute: number;
  slotDuration: number;
  isPeakTime: boolean;
};

type PriceRuleLite = {
  dayOfWeek: number;
  price: Prisma.Decimal;
  slotTimeSetup: SlotTimeSetupLite;
};

@Injectable()
export class TurfSlotService {
  private static readonly ROLLING_DAYS = 90;

  // =========================
  // Cron helpers
  // =========================

  async cleanupPrebookedSlots() {
    const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const result = await prisma.turfSlot.updateMany({
      where: {
        slotStatus: SlotSatus.WAITLIST,
        updatedAt: { lte: cutoff },
      },
      data: { slotStatus: SlotSatus.AVAILABLE },
    });
    return { count: result.count };
  }

  // async UpdateExpireSlots() {
  //   const now = new Date();
    
  //   const slots = await prisma.turfSlot.findMany({
  //     where: { slotStatus: SlotSatus.AVAILABLE },
  //     select: { id: true, slotDate: true, endMinute: true },
  //   });

  //   const expiredIds = slots
  //     .filter((s) => {
  //       const end = new Date(s.slotDate);
  //       end.setHours(Math.floor(s.endMinute / 60), s.endMinute % 60, 0, 0);
  //       return end <= now;
  //     })
  //     .map((s) => s.id);
  //   if (expiredIds.length === 0) return { count: 0 };
  //   const result = await prisma.turfSlot.updateMany({
  //     where: { id: { in: expiredIds } },
  //     data: { slotStatus: SlotSatus.EXPIRED },
  //   });
  //   return { count: result.count };
  // }


  private buildSlotsForDate(
    turf: {
      id: string;
      defaultSlotDuration: number;
      defaultSlotPrice: Prisma.Decimal;
      priceRules: PriceRuleLite[];
    },
    slotDate: Date,
  ): { startMinute: number; endMinute: number; price: number; isPeakTime: boolean }[] {
    const dayOfWeek = slotDate.getUTCDay();
    const rules = turf.priceRules
      .filter((rule) => rule.dayOfWeek === dayOfWeek)
      .sort((left, right) => left.slotTimeSetup.startMinute - right.slotTimeSetup.startMinute);
    const out: { startMinute: number; endMinute: number; price: number; isPeakTime: boolean }[] = [];
    let cursor = 0;

    const appendSlots = (
      startMinute: number,
      endMinute: number,
      slotDuration: number,
      price: number,
      isPeakTime: boolean,
    ) => {
      for (let start = startMinute; start < endMinute; start += slotDuration) {
        out.push({
          startMinute: start,
          endMinute: Math.min(start + slotDuration, endMinute),
          price,
          isPeakTime,
        });
      }
    };

    for (const rule of rules) {
      const { startMinute, endMinute, slotDuration, isPeakTime } = rule.slotTimeSetup;
      const start = Math.max(cursor, startMinute);
      const end = Math.min(1440, endMinute);
      if (end <= start) continue;

      appendSlots(
        cursor,
        start,
        turf.defaultSlotDuration,
        Number(turf.defaultSlotPrice),
        false,
      );
      appendSlots(start, end, slotDuration, Number(rule.price), isPeakTime);
      cursor = end;
    }

    appendSlots(
      cursor,
      1440,
      turf.defaultSlotDuration,
      Number(turf.defaultSlotPrice),
      false,
    );

    return out;
  }

  /**
   * Delete future AVAILABLE unbooked slots for a turf, starting from `fromDate`.
   * Never touches past dates, BOOKED slots, or WAITLIST slots.
   */
  private async deleteFutureAvailableSlots(
    turfId: string,
    fromDate: Date,
  ): Promise<number> {
    const result = await prisma.turfSlot.deleteMany({
      where: {
        turfId,
        slotDate: { gte: fromDate },
        slotStatus: SlotSatus.AVAILABLE,
        bookingLinks: { none: {} },
      },
    });
    return result.count;
  }

  // Manual generate (owner-triggered)
  async generateSlots(
    owner: IRequestUser,
    turfId: string,
    options: { days?: number },
  ) {
    await this.assertOwner(owner, turfId);

    const turf = await prisma.turf.findUnique({
      where: { id: turfId },
      include: {
        priceRules: {
          where: { active: true },
          include: { slotTimeSetup: true },
        },
      },
    });

    if (!turf) throw new AppError(status.NOT_FOUND, 'Turf not found');

    const days = options.days ?? 90;
    const today = startOfDayInTimezone(new Date(), turf.timezone);

    // Destructive rebuild: wipe future AVAILABLE unbooked slots
    const deletedCount = await this.deleteFutureAvailableSlots(turfId, today);

    const created: { slotDate: Date; count: number }[] = [];

    for (let d = 0; d < days; d++) {
      const slotDate = addCalendarDays(today, d);

      const desired = this.buildSlotsForDate(turf, slotDate);
      if (desired.length === 0) continue;

      const toCreate = desired.map((slot) => ({
        turfId,
        slotDate,
        startMinute: slot.startMinute,
        endMinute: slot.endMinute,
        price: slot.price,
        isPeakTime: slot.isPeakTime,
      }));

      if (toCreate.length > 0) {
        await prisma.turfSlot.createMany({ data: toCreate });
      }

      created.push({ slotDate, count: desired.length });
    }

    return {
      turfId,
      daysGenerated: days,
      slotsPerDay: created[0]?.count ?? 0,
      deletedCount,
      created,
    };
  }

  // =========================
  // List (owner)
  // =========================

  async listTurfSlots(
    owner: IRequestUser,
    turfId: string,
    options: { date?: string; activeOnly?: boolean },
  ) {
    await this.assertOwner(owner, turfId);

    const where: Prisma.TurfSlotWhereInput = { turfId };
    if (options.date) {
      where.slotDate = new Date(`${options.date}T00:00:00.000Z`);
    }
    if (options.activeOnly) {
      where.active = true;
    }

    return prisma.turfSlot.findMany({
      where,
      orderBy: [{ slotDate: 'asc' }, { startMinute: 'asc' }],
    });
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
      where.slotDate = new Date(`${options.date}T00:00:00.000Z`);
    }

    const slots = await prisma.turfSlot.findMany({
      where,
      orderBy: [{ slotDate: 'asc' }, { turfId: 'asc' }, { startMinute: 'asc' }],
      include: { turf: { select: { id: true, name: true } } },
    });
    return { turfs, slots };
  }

  // =========================
  // Public — customer-facing
  // =========================

  async getSlotsByDate(turfId: string, date: string) {
    const turf = await prisma.turf.findFirst({
      where: { id: turfId, status: TurfStatus.ACTIVE },
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

    return slots
      .filter((slot) => !isToday || slot.startMinute >= currentMinuteOfDay)
      .map((slot) => ({
        id: slot.id,
        startMinute: slot.startMinute,
        endMinute: slot.endMinute,
        price: Number(slot.price),
        available: slot.slotStatus === SlotSatus.AVAILABLE,
        status: slot.slotStatus,
      }));
  }

  // =========================
  // Update slot (owner)
  // =========================

  async updateSlot(
    owner: IRequestUser,
    slotId: string,
    payload: { active?: boolean; price?: number },
  ) {
    const slot = await prisma.turfSlot.findUnique({
      where: { id: slotId },
      include: { turf: true },
    });
    if (!slot) throw new AppError(status.NOT_FOUND, 'Slot not found');

    await this.assertOwner(owner, slot.turfId);

    if (payload.price !== undefined && payload.price < 0) {
      throw new AppError(status.BAD_REQUEST, 'Price cannot be negative');
    }

    return prisma.turfSlot.update({
      where: { id: slotId },
      data: {
        ...(payload.active !== undefined ? { active: payload.active } : {}),
        ...(payload.price !== undefined
          ? { price: new Prisma.Decimal(payload.price) }
          : {}),
      },
    });
  }

  async deleteAvailableSlot(owner: IRequestUser, slotId: string) {
    const slot = await prisma.turfSlot.findUnique({
      where: { id: slotId },
      select: { id: true, turfId: true, slotStatus: true },
    });
    if (!slot) throw new AppError(status.NOT_FOUND, 'Slot not found');

    await this.assertOwner(owner, slot.turfId);
    if (slot.slotStatus !== SlotSatus.AVAILABLE) {
      throw new AppError(status.CONFLICT, 'Only available slots can be deleted');
    }

    const result = await prisma.turfSlot.deleteMany({
      where: {
        id: slotId,
        turfId: slot.turfId,
        slotStatus: SlotSatus.AVAILABLE,
        bookingLinks: { none: {} },
      },
    });
    if (result.count === 0) {
      throw new AppError(status.CONFLICT, 'Slot is no longer available to delete');
    }

    return { id: slotId };
  }

  // Runs daily. Only creates missing days in the rolling window.
  // Never deletes anything.
  //
  async generateRollingSlots() {
    const turfs = await prisma.turf.findMany({
      where: { status: TurfStatus.ACTIVE },
      include: {
        priceRules: {
          where: { active: true },
          include: { slotTimeSetup: true },
        },
      },
    });

    let totalSlots = 0;
    let totalTurfs = 0;
    let totalDays = 0;

    for (const turf of turfs) {
      const turfNow = new Date();
      const today = startOfDayInTimezone(turfNow, turf.timezone);
      const windowEnd = addCalendarDays(today, TurfSlotService.ROLLING_DAYS - 1);

      const lastExisting = await prisma.turfSlot.findFirst({
        where: { turfId: turf.id },
        orderBy: { slotDate: 'desc' },
        select: { slotDate: true },
      });

      let cursor = new Date(today);
      if (lastExisting) {
        const next = addCalendarDays(lastExisting.slotDate, 1);
        if (next > cursor) cursor = next;
      }

      let daysGeneratedForTurf = 0;

      while (cursor <= windowEnd) {
        const slotDate = new Date(cursor);

        const desired = this.buildSlotsForDate(turf, slotDate);
        if (desired.length > 0) {
          const existing = await prisma.turfSlot.findMany({
            where: { turfId: turf.id, slotDate },
            select: { startMinute: true, endMinute: true },
          });
          const existingKeys = new Set(
            existing.map((s) => `${s.startMinute}-${s.endMinute}`),
          );

          const toCreate = desired
            .filter((s) => !existingKeys.has(`${s.startMinute}-${s.endMinute}`))
            .map((s) => ({
              turfId: turf.id,
              slotDate,
              startMinute: s.startMinute,
              endMinute: s.endMinute,
              price: s.price,
              isPeakTime: s.isPeakTime,
            }));

          if (toCreate.length > 0) {
            await prisma.turfSlot.createMany({ data: toCreate });
            totalSlots += toCreate.length;
            daysGeneratedForTurf += 1;
          }
        }

        cursor = addCalendarDays(cursor, 1);
      }

      if (daysGeneratedForTurf > 0) {
        totalTurfs += 1;
        totalDays += daysGeneratedForTurf;
      }
    }

    return { totalTurfs, totalDays, totalSlots };
  }

  // =========================
  // Ownership assertion
  // =========================

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