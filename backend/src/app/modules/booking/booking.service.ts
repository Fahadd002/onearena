import { Injectable, OnModuleInit } from '@nestjs/common';
import cron from 'node-cron';
import status from 'http-status';
import { Prisma } from '../../../generated/prisma/client';
import { PaymentStatus, UserRole, BookingStatus, SlotSatus } from '../../../generated/prisma/enums';
import AppError from '../../../config/errorHelpers/AppError';
import prisma from '../../../shared/prisma';
import { IRequestUser } from '../../interfaces/requestUser.interface';

import config from '../../../config';

export interface BookingPayload {
  turfId: string;
  bookingDate: string;
  startMinute: number;
  endMinute: number;
  idempotencyKey: string;
  slotId: string;
  mobile?: string;
}

@Injectable()
export class BookingService implements OnModuleInit {
  onModuleInit() {
    cron.schedule('0 */6 * * *', () => this.expireUnpaid().catch(() => undefined));
  }

  //Create A new booking
  async create(user: IRequestUser, payload: BookingPayload) {
    if (!payload.slotId) {
      throw new AppError(status.BAD_REQUEST, 'Slot ID is required');
    }

    const idempotencyKey = payload.idempotencyKey?.trim();
    if (!idempotencyKey) {
      throw new AppError(status.BAD_REQUEST, 'Idempotency key is required');
    }

    // Check for duplicate booking using idempotency key
    const duplicate = await prisma.booking.findUnique({
      where: { idempotencyKey },
      include: { slot: { select: { turfId: true, slotDate: true, startMinute: true, endMinute: true } } },
    });

    if (duplicate) {
      if (duplicate.userId !== user.userId) {
        throw new AppError(status.CONFLICT, 'Idempotency key is already in use');
      }
      if (
        duplicate.slot.turfId !== payload.turfId ||
        duplicate.slot.startMinute !== payload.startMinute ||
        duplicate.slot.endMinute !== payload.endMinute ||
        duplicate.slot.slotDate.toISOString().slice(0, 10) !== payload.bookingDate ||
        (duplicate.mobile ?? null) !== (payload.mobile?.trim() || null)
      ) {
        throw new AppError(status.CONFLICT, 'Idempotency key was already used for a different booking request');
      }
      return duplicate;
    }

    const turf = await prisma.turf.findFirst({
      where: { id: payload.turfId, status: 'ACTIVE' },
    });

    if (!turf) {
      throw new AppError(status.BAD_REQUEST, 'Turf is not available for booking');
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.bookingDate)) {
      throw new AppError(status.BAD_REQUEST, 'Invalid booking date');
    }
    const date = new Date(`${payload.bookingDate}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime()) || date.getTime() < Date.now() - 86400000) {
      throw new AppError(status.BAD_REQUEST, 'Booking date must be valid and current');
    }

    const storedSlot = await prisma.turfSlot.findFirst({
      where: {turfId: turf.id,  slotDate: date,
        startMinute: payload.startMinute,
        endMinute: payload.endMinute,
      },
    });

    if (storedSlot && !storedSlot.active) {
      throw new AppError(status.BAD_REQUEST, 'This slot is not available for booking');
    }
    if (storedSlot && storedSlot.slotStatus === SlotSatus.BOOKED) {
      throw new AppError(status.CONFLICT, 'This turf slot is already booked');
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        // Acquire an advisory lock to prevent race conditions for the same turf and booking date
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${turf.id}:${payload.bookingDate}`}))`;

        if (payload.slotId) {
          const existingSlot = await tx.turfSlot.findUnique({
            where: { id: payload.slotId },
            select: { turfId: true, slotDate: true, startMinute: true, endMinute: true, slotStatus: true, active: true },
          });

          if (!existingSlot) {
            throw new AppError(status.NOT_FOUND, 'Slot not found');
          }

          if (!existingSlot.active) {
            throw new AppError(status.BAD_REQUEST, 'This slot is not available for booking');
          }
          if (
            existingSlot.turfId !== turf.id ||
            existingSlot.slotDate.toISOString().slice(0, 10) !== payload.bookingDate ||
            existingSlot.startMinute !== payload.startMinute ||
            existingSlot.endMinute !== payload.endMinute
          ) {
            throw new AppError(status.BAD_REQUEST, 'Slot does not match the requested turf, date, or time');
          }
          if (existingSlot.slotStatus === SlotSatus.BOOKED) {
            throw new AppError(status.CONFLICT, 'This turf slot is already booked');
          }
        }

        const slot = await tx.turfSlot.findUnique({
          where: { id: payload.slotId! },
          select: { price: true },
        });
        const total = slot ? Number(slot.price) : Number(turf.basePrice);

        const turfPrefix = turf.name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase();
        const year = new Date().getUTCFullYear();
        const yearStart = new Date(Date.UTC(year, 0, 1));
        const yearEnd = new Date(Date.UTC(year + 1, 0, 1));

        const existingCount = await tx.booking.count({
          where: {
            slot: { turfId: turf.id },
            createdAt: { gte: yearStart, lt: yearEnd },
          },
        });
        
        const sequence = String(existingCount + 1).padStart(3, '0');
        const bookingNumber = `${turfPrefix}-${year}-${sequence}`;

        const booking = await tx.booking.create({
          data: {
            bookingNumber,
            userId: user.userId,
            slotId: payload.slotId,
            baseAmount: total,
            packageAmount: 0,
            discountAmount: 0,
            subtotal: total,
            totalAmount: total,
            mobile: payload.mobile?.trim() || null,
            status: BookingStatus.PREBOOKED,
            bookingExpiresAt: new Date(
              Date.now() +
                Number(config.bookingPaymentTimeout ?? 15) * 60000
            ),
            idempotencyKey,
          },
        });

        // Update slot to RESERVED (not PREBOOKED - that's only for Booking status)
        if (payload.slotId) {
          await tx.turfSlot.update({
            where: { id: payload.slotId },
            data: { slotStatus: SlotSatus.RESERVED },
          });
        }

        // NOTE: Invoice and Payment are created only during confirmation, not during booking creation
        // This ensures PREBOOKED bookings have no invoice or payments

        return booking;
      });

      return result;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const concurrentDuplicate = await prisma.booking.findUnique({
          where: { idempotencyKey },
          include: { slot: { select: { turfId: true, slotDate: true, startMinute: true, endMinute: true } } },
        });
        if (concurrentDuplicate) {
          if (concurrentDuplicate.userId !== user.userId) {
            throw new AppError(status.CONFLICT, 'Idempotency key is already in use');
          }
          if (
            concurrentDuplicate.slot.turfId !== payload.turfId ||
            concurrentDuplicate.slot.startMinute !== payload.startMinute ||
            concurrentDuplicate.slot.endMinute !== payload.endMinute ||
            concurrentDuplicate.slot.slotDate.toISOString().slice(0, 10) !== payload.bookingDate ||
            (concurrentDuplicate.mobile ?? null) !== (payload.mobile?.trim() || null)
          ) {
            throw new AppError(status.CONFLICT, 'Idempotency key was already used for a different booking request');
          }
          return concurrentDuplicate;
        }
        throw new AppError(status.CONFLICT, 'This turf slot is already booked');
      }
      throw error;
    }
  }

  //List bookings with filters and pagination
  async list(
    user: IRequestUser,
    page = 1,
    limit = 10,
    filters?: { paymentStatus?: string; startDate?: string; endDate?: string; turfId?: string; sortBy?: string; sortOrder?: string }
  ) {
    const allowedSortFields = ['createdAt', 'totalAmount', 'status'] as const;
    const sortBy = filters?.sortBy && allowedSortFields.includes(filters.sortBy as typeof allowedSortFields[number])
      ? filters.sortBy : 'createdAt';
    const sortOrder = filters?.sortOrder === 'asc' ? 'asc' : 'desc';

    const where: Prisma.BookingWhereInput = user.role === UserRole.ADMIN
        ? { slot: { turf: { ownerId: user.userId } } }
        : user.role === UserRole.MANAGER ? {
            slot: {
              turf: {
                managers: {
                  some: {
                    managerId: user.userId,
                    permissions: { some: { permission: 'BOOKING_VIEW' } },
                  },
                },
              },
            },
          }
          : { userId: user.userId };

    // NOTE: paymentStatus filter is deprecated. Filtering by booking status instead.
    // To filter by payment status, use the invoice/payment APIs
    if (filters?.paymentStatus) {
      where.status = filters.paymentStatus as BookingStatus;
    }

    const slotFilter: Prisma.TurfSlotWhereInput = {};

    if (filters?.turfId) slotFilter.turfId = filters.turfId;

    if (filters?.startDate || filters?.endDate) {
      slotFilter.slotDate = {};
      if (filters.startDate) slotFilter.slotDate.gte = new Date(filters.startDate);
      if (filters.endDate) slotFilter.slotDate.lte = new Date(filters.endDate);
    }
    if (Object.keys(slotFilter).length > 0) {
      where.slot = slotFilter;
    }

    const skip = (page - 1) * limit;
    const [data, total] = await prisma.$transaction([
      prisma.booking.findMany({
        where,
        include: {
          slot: { include: { turf: true } },
          invoice: true,
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.booking.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  //Bulk update booking status for multiple bookings
  async bulkUpdatePaymentStatus(user: IRequestUser, bookingIds: string[], nextBookingStatus: BookingStatus) {
    const where: Prisma.BookingWhereInput = { id: { in: bookingIds } };
    if (user.role === UserRole.ADMIN) {
      where.slot = { turf: { ownerId: user.userId } };
    } else if (user.role === UserRole.MANAGER) {
      where.slot = {
        turf: {
          managers: {
            some: {
              managerId: user.userId,
              permissions: { some: { permission: 'BOOKING_MANAGE' } },
            },
          },
        },
      };
    } else {
      throw new AppError(status.FORBIDDEN, 'Not allowed');
    }

    return prisma.booking.updateMany({
      where,
      data: { status: nextBookingStatus },
    });
  }

  //Update booking data for a single booking (totalAmount, notes, etc.)
  async updatePayment(user: IRequestUser, bookingId: string, payload: { paymentStatus?: string; totalAmount?: number }) {
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId },
      include: { slot: { include: { turf: true } } },
    });
    if (!booking) throw new AppError(status.NOT_FOUND, 'Booking not found');

    if (user.role === UserRole.ADMIN) {
      if (booking.slot?.turf?.ownerId !== user.userId) {
        throw new AppError(status.FORBIDDEN, 'Not allowed');
      }
    } else if (user.role === UserRole.MANAGER) {
      const hasPermission = await prisma.turfManager.findFirst({
        where: {
          turfId: booking.slot?.turfId,
          managerId: user.userId,
          permissions: { some: { permission: 'BOOKING_MANAGE' } },
        },
      });
      if (!hasPermission) throw new AppError(status.FORBIDDEN, 'Not allowed');
    } else {
      throw new AppError(status.FORBIDDEN, 'Not allowed');
    }

    const data: Record<string, unknown> = {};
    // paymentStatus is deprecated, use booking status/invoice instead
    // if (payload.paymentStatus) data.paymentStatus = payload.paymentStatus as PaymentStatus;
    if (payload.totalAmount !== undefined) {
      data.totalAmount = payload.totalAmount;
      data.baseAmount = payload.totalAmount;
      data.subtotal = payload.totalAmount;
    }

    return prisma.booking.update({
      where: { id: bookingId },
      data,
    });
  }

  //Cancel a booking
  async cancel(user: IRequestUser, bookingId: string) {
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, userId: user.userId },
    });
    if (!booking) {
      throw new AppError(status.NOT_FOUND, 'Booking not found');
    }
    // Can only cancel PREBOOKED or CONFIRMED bookings
    if (
      booking.status !== BookingStatus.PREBOOKED &&
      booking.status !== BookingStatus.CONFIRMED
    ) {
      throw new AppError(status.BAD_REQUEST, 'Booking cannot be cancelled');
    }

    return prisma.$transaction(async (tx) => {
      const cancelledBooking = await tx.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.CANCELLED },
      });

      // Release slot back to AVAILABLE
      if (booking.slotId) {
        await tx.turfSlot.update({
          where: { id: booking.slotId },
          data: { slotStatus: SlotSatus.AVAILABLE },
        });
      }

      return cancelledBooking;
    });
  }

  //Expire unpaid bookings
  async expireUnpaid() {
    const expired = await prisma.booking.findMany({
      where: {
        status: BookingStatus.PREBOOKED,
        bookingExpiresAt: { lte: new Date() },
      },
      select: { id: true, slotId: true },
    });

    if (expired.length === 0) return { count: 0 };

    const slotIds = expired.filter((b) => b.slotId).map((b) => b.slotId!);

    await prisma.$transaction([
      prisma.booking.updateMany({
        where: { id: { in: expired.map((b) => b.id) } },
        data: { status: BookingStatus.EXPIRED },
      }),
      ...(slotIds.length
        ? [prisma.turfSlot.updateMany({
          where: { id: { in: slotIds } },
          data: { slotStatus: SlotSatus.AVAILABLE },
        })]
        : []),
    ]);

    return { count: expired.length };
  }

  //Update booking status
  async updateBookingStatus(
    user: IRequestUser,
    bookingId: string,
    payload: { bookingStatus: string },
  ) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { slot: { include: { turf: true } } },
    });
    if (!booking) throw new AppError(status.NOT_FOUND, 'Booking not found');

    if (user.role === UserRole.ADMIN) {
      if (booking.slot?.turf?.ownerId !== user.userId) {
        throw new AppError(status.FORBIDDEN, 'Not allowed');
      }
    } else if (user.role === UserRole.MANAGER) {
      const hasPermission = await prisma.turfManager.findFirst({
        where: {
          turfId: booking.slot?.turfId,
          managerId: user.userId,
          permissions: { some: { permission: 'BOOKING_MANAGE' } },
        },
      });
      if (!hasPermission) throw new AppError(status.FORBIDDEN, 'Not allowed');
    } else {
      throw new AppError(status.FORBIDDEN, 'Not allowed');
    }

    const statusValue = payload.bookingStatus as BookingStatus;

    if (!Object.values(BookingStatus).includes(statusValue)) {
      throw new AppError(status.BAD_REQUEST, 'Invalid booking status');
    }

    if (booking.slotId) {
      const slotStatusMap: Record<BookingStatus, SlotSatus> = {
        [BookingStatus.PREBOOKED]: SlotSatus.RESERVED,
        [BookingStatus.CONFIRMED]: SlotSatus.BOOKED,
        [BookingStatus.KICKED_OFF]: SlotSatus.BOOKED,
        [BookingStatus.COMPLETED]: SlotSatus.BOOKED,
        [BookingStatus.CANCELLED]: SlotSatus.AVAILABLE,
        [BookingStatus.EXPIRED]: SlotSatus.AVAILABLE,
      };

      await prisma.turfSlot.update({
        where: { id: booking.slotId },
        data: { slotStatus: slotStatusMap[statusValue] || SlotSatus.AVAILABLE },
      });
    }

    return {
      bookingId: booking.id,
      slotId: booking.slotId,
      bookingStatus: statusValue,
    };
  }

  // Confirm a PREBOOKED booking - creates invoice and transitions to CONFIRMED
  async confirm(user: IRequestUser, bookingId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { slot: { include: { turf: true } } },
    });

    if (!booking) {
      throw new AppError(status.NOT_FOUND, 'Booking not found');
    }

    if (booking.status !== BookingStatus.PREBOOKED) {
      throw new AppError(
        status.BAD_REQUEST,
        `Cannot confirm booking with status ${booking.status}. Only PREBOOKED bookings can be confirmed.`
      );
    }

    // Check authorization
    if (user.role === UserRole.ADMIN) {
      if (booking.slot?.turf?.ownerId !== user.userId) {
        throw new AppError(status.FORBIDDEN, 'Not allowed');
      }
    } else if (user.role === UserRole.MANAGER) {
      const hasPermission = await prisma.turfManager.findFirst({
        where: {
          turfId: booking.slot?.turfId,
          managerId: user.userId,
          permissions: { some: { permission: 'BOOKING_MANAGE' } },
        },
      });
      if (!hasPermission) throw new AppError(status.FORBIDDEN, 'Not allowed');
    } else {
      throw new AppError(status.FORBIDDEN, 'Not allowed');
    }

    // Verify slot is still RESERVED
    const slot = await prisma.turfSlot.findUnique({
      where: { id: booking.slotId },
    });

    if (!slot || slot.slotStatus !== SlotSatus.RESERVED) {
      throw new AppError(
        status.CONFLICT,
        'Slot is no longer available for this booking'
      );
    }

    // Transaction: Update booking, slot, and create invoice
    return prisma.$transaction(async (tx) => {
      // Update booking status
      const updatedBooking = await tx.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.CONFIRMED },
      });

      // Update slot to BOOKED
      await tx.turfSlot.update({
        where: { id: booking.slotId },
        data: { slotStatus: SlotSatus.BOOKED },
      });

      // Create invoice
      const invoice = await tx.bookingInvoice.create({
        data: {
          bookingId: booking.id,
          invoiceNumber: `INV-${new Date().getUTCFullYear()}-${Date.now()}-${booking.id.slice(0, 8)}`,
          subtotal: booking.subtotal,
          discount: booking.discountAmount,
          totalAmount: booking.totalAmount,
          paidAmount: 0,
          status: PaymentStatus.UNPAID,
        },
      });

      return { booking: updatedBooking, invoice };
    });
  }

  // Reject a PREBOOKED booking - cancels and releases slot
  async reject(user: IRequestUser, bookingId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { slot: { include: { turf: true } } },
    });

    if (!booking) {
      throw new AppError(status.NOT_FOUND, 'Booking not found');
    }

    if (booking.status !== BookingStatus.PREBOOKED) {
      throw new AppError(
        status.BAD_REQUEST,
        `Cannot reject booking with status ${booking.status}. Only PREBOOKED bookings can be rejected.`
      );
    }

    // Check authorization
    if (user.role === UserRole.ADMIN) {
      if (booking.slot?.turf?.ownerId !== user.userId) {
        throw new AppError(status.FORBIDDEN, 'Not allowed');
      }
    } else if (user.role === UserRole.MANAGER) {
      const hasPermission = await prisma.turfManager.findFirst({
        where: {
          turfId: booking.slot?.turfId,
          managerId: user.userId,
          permissions: { some: { permission: 'BOOKING_MANAGE' } },
        },
      });
      if (!hasPermission) throw new AppError(status.FORBIDDEN, 'Not allowed');
    } else {
      throw new AppError(status.FORBIDDEN, 'Not allowed');
    }

    // Transaction: Update booking and slot
    return prisma.$transaction(async (tx) => {
      const rejectedBooking = await tx.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.CANCELLED },
      });

      // Release slot back to AVAILABLE
      await tx.turfSlot.update({
        where: { id: booking.slotId },
        data: { slotStatus: SlotSatus.AVAILABLE },
      });

      return rejectedBooking;
    });
  }

  // Kick off a game - transition CONFIRMED → KICKED_OFF
  async kickOff(user: IRequestUser, bookingId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { slot: { include: { turf: true } } },
    });

    if (!booking) {
      throw new AppError(status.NOT_FOUND, 'Booking not found');
    }

    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new AppError(
        status.BAD_REQUEST,
        `Cannot kick off booking with status ${booking.status}. Only CONFIRMED bookings can be kicked off.`
      );
    }

    // Check authorization
    if (user.role === UserRole.ADMIN) {
      if (booking.slot?.turf?.ownerId !== user.userId) {
        throw new AppError(status.FORBIDDEN, 'Not allowed');
      }
    } else if (user.role === UserRole.MANAGER) {
      const hasPermission = await prisma.turfManager.findFirst({
        where: {
          turfId: booking.slot?.turfId,
          managerId: user.userId,
          permissions: { some: { permission: 'BOOKING_MANAGE' } },
        },
      });
      if (!hasPermission) throw new AppError(status.FORBIDDEN, 'Not allowed');
    } else {
      throw new AppError(status.FORBIDDEN, 'Not allowed');
    }

    return prisma.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.KICKED_OFF },
    });
  }

  // Complete a game - transition KICKED_OFF → COMPLETED
  async complete(user: IRequestUser, bookingId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { slot: { include: { turf: true } } },
    });

    if (!booking) {
      throw new AppError(status.NOT_FOUND, 'Booking not found');
    }

    if (booking.status !== BookingStatus.KICKED_OFF) {
      throw new AppError(
        status.BAD_REQUEST,
        `Cannot complete booking with status ${booking.status}. Only KICKED_OFF bookings can be completed.`
      );
    }

    // Check authorization
    if (user.role === UserRole.ADMIN) {
      if (booking.slot?.turf?.ownerId !== user.userId) {
        throw new AppError(status.FORBIDDEN, 'Not allowed');
      }
    } else if (user.role === UserRole.MANAGER) {
      const hasPermission = await prisma.turfManager.findFirst({
        where: {
          turfId: booking.slot?.turfId,
          managerId: user.userId,
          permissions: { some: { permission: 'BOOKING_MANAGE' } },
        },
      });
      if (!hasPermission) throw new AppError(status.FORBIDDEN, 'Not allowed');
    } else {
      throw new AppError(status.FORBIDDEN, 'Not allowed');
    }

    return prisma.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.COMPLETED },
    });
  }

}
