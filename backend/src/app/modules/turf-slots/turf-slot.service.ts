import { Injectable } from '@nestjs/common';
import status from 'http-status';
import { Prisma } from '../../../generated/prisma/client';
import { TurfStatus, UserRole, SlotSatus } from '../../../generated/prisma/enums';

import AppError from '../../../config/errorHelpers/AppError';
import prisma from '../../../shared/prisma';
import { IRequestUser } from '../../interfaces/requestUser.interface';
import { getMinuteOfDayInTimezone, isDateToday, startOfDayInTimezone } from '../../utils/dateTimeUtils';

type SlotTimeSetupLite = {
  id: string;
  timeName: string;
  startMinute: number;
  endMinute: number;
  slotDuration: number;
  isPeakTime: boolean;
};

type PriceRuleLite = {
  slotTimeSetupId: string;
  dayOfWeek: number;
  price: Prisma.Decimal;
  active: boolean;
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


  private async getOwnerSlotTimeSetups(
    ownerId: string,
    defaultSlotDuration: number,
  ): Promise<SlotTimeSetupLite[]> {
    const setups = await prisma.slotTimeSetup.findMany({
      where: { ownerId },
      select: { id: true, timeName: true, startMinute: true, endMinute: true, slotDuration:true, isPeakTime:true },
      orderBy: { startMinute: 'asc' },
    });
    if (setups.length > 0) return setups;

    // No custom setup: fall back to a full 24-hour day using the turf defaults
    return [
      {
        id: 'default',
        timeName: 'Default',
        startMinute: 0,
        endMinute: 1440,
        slotDuration: defaultSlotDuration,
        isPeakTime: false,
      },
    ];
  }

  private resolvePrice(
    rules: PriceRuleLite[],
    dayOfWeek: number,
    slotTimeSetupId: string,
    defaultSlotPrice: Prisma.Decimal,
  ): number {
    const rule = rules.find(
      (r) => r.dayOfWeek === dayOfWeek && r.slotTimeSetupId === slotTimeSetupId,
    );
    return Number(rule?.price ?? defaultSlotPrice);
  }

  private buildSlotsForDate(
    turf: {
      id: string;
      timezone: string;
      defaultSlotDuration: number;
      defaultSlotPrice: Prisma.Decimal;
      priceRules: PriceRuleLite[];
    },
    setups: SlotTimeSetupLite[],
    slotDate: Date,
  ): { startMinute: number; endMinute: number; price: number; isPeakTime: boolean }[] {
    if (setups.length === 0) return [];

    const weekday = new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      timeZone: turf.timezone,
    }).format(slotDate);
    const dayOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(
      weekday,
    );

    const out: { startMinute: number; endMinute: number; price: number; isPeakTime: boolean }[] = [];

    for (const setup of setups) {
      const price = this.resolvePrice(
        turf.priceRules,
        dayOfWeek,
        setup.id,
        turf.defaultSlotPrice,
      );

      for (
        let start = setup.startMinute;
        start < setup.endMinute;
        start += setup.slotDuration
      ) {
        const end = Math.min(start + setup.slotDuration, setup.endMinute);
        out.push({ startMinute: start, endMinute: end, price, isPeakTime: setup.isPeakTime });
      }
    }

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

  // =========================
  // Manual generate (owner-triggered)
  // =========================
  //
  // This is the DESTRUCTIVE path. Called from the UI. It wipes future
  // AVAILABLE unbooked slots and rebuilds them from current setups + rules.
  // Past dates, BOOKED slots, and WAITLIST slots are preserved.

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

    const setups = await this.getOwnerSlotTimeSetups(turf.ownerId, turf.defaultSlotDuration);

    const days = options.days ?? 90;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Destructive rebuild: wipe future AVAILABLE unbooked slots
    const deletedCount = await this.deleteFutureAvailableSlots(turfId, today);

    const created: { slotDate: Date; count: number }[] = [];

    for (let d = 0; d < days; d++) {
      const slotDate = new Date(today);
      slotDate.setDate(today.getDate() + d);

      const desired = this.buildSlotsForDate(turf, setups, slotDate);
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

  // =========================
  // Cron — rolling window (NON-destructive)
  // =========================
  //
  // Runs daily. Only creates missing days in the rolling window.
  // Never deletes anything.
  //
  // `timeZone` defaults to the cron timezone (Asia/Dhaka) so the rolling
  // window's "today" matches the calendar day the cron fired on, even when
  // the host process runs in a different local timezone.

  async generateRollingSlots(timeZone: string = 'Asia/Dhaka') {
    const turfs = await prisma.turf.findMany({
      where: { status: TurfStatus.ACTIVE },
      include: { priceRules: { where: { active: true } } },
    });

    const today = startOfDayInTimezone(new Date(), timeZone);

    const windowEnd = new Date(today);
    windowEnd.setDate(today.getDate() + TurfSlotService.ROLLING_DAYS - 1);

    let totalSlots = 0;
    let totalTurfs = 0;
    let totalDays = 0;

    for (const turf of turfs) {
      const setups = await this.getOwnerSlotTimeSetups(turf.ownerId, turf.defaultSlotDuration);

      const lastExisting = await prisma.turfSlot.findFirst({
        where: { turfId: turf.id },
        orderBy: { slotDate: 'desc' },
        select: { slotDate: true },
      });

      let cursor = new Date(today);
      if (lastExisting) {
        const next = new Date(lastExisting.slotDate);
        next.setDate(next.getDate() + 1);
        if (next > cursor) cursor = next;
      }

      let daysGeneratedForTurf = 0;

      while (cursor <= windowEnd) {
        const slotDate = new Date(cursor);

        const desired = this.buildSlotsForDate(turf, setups, slotDate);
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

        cursor.setDate(cursor.getDate() + 1);
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