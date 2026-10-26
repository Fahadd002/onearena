import { Injectable } from '@nestjs/common';
import status from 'http-status';
import { Prisma } from '../../../generated/prisma/client';
import {
  PaymentStatus,
  UserRole,
  BookingStatus,
  SlotSatus,
  PaymentType,
  PaymentMethod,
  InvoiceFor,
  InvoiceStatus,
} from '../../../generated/prisma/enums';
import AppError from '../../../config/errorHelpers/AppError';
import prisma from '../../../shared/prisma';
import { IRequestUser } from '../../interfaces/requestUser.interface';

import config from '../../../config';
import { nextDocumentNumber } from '../../utils/document-number';
import {
  BookingListInvoiceDto,
  BookingListItemDto,
  BookingListSlotDto,
  PaginatedBookingListDto,
} from './booking.dto';
import { InvoiceService } from '../invoice/invoice.service';
import { BookingPaymentService } from '../payment/booking-payment.service';
import {
  computeInvoiceTotals,
  filterSuccessfulPayments,
} from '../../helpers/invoice-payment.helper';

export interface BookingSlotPayload {
  slotId: string;
  turfId: string;
  bookingDate: string;
  startMinute: number;
  endMinute: number;
}

export interface BookingPayload {
  slots: BookingSlotPayload[];
  idempotencyKey: string;
  mobile?: string;
  advancePayment?: {
    method: string;
    senderMobile: string;
    transactionId: string;
    amount: number;
  };
}

/** Prisma select for the booking→slot link rows, including the slot itself. */
const bookingSlotsInclude = {
  bookingSlots: {
    include: {
      slot: {
        select: {
          turfId: true,
          slotDate: true,
          startMinute: true,
          endMinute: true,
        },
      },
    },
  },
} as const;

/** Reshape a booking to keep a `slot` (primary) plus a `slots` array for the frontend. */
const withSlots = <T extends { bookingSlots: { slot: unknown }[] }>(booking: T) => ({
  ...booking,
  slot: booking.bookingSlots[0]?.slot ?? null,
  slots: booking.bookingSlots.map((bs) => bs.slot),
});

/** Prisma include for a booking with all of its slots (and their turfs). */
const bookingWithTurf = {
  bookingSlots: { include: { slot: { include: { turf: true } } } },
} as const;

@Injectable()
export class BookingService {
  constructor(
    private readonly invoiceService: InvoiceService,
    private readonly bookingPaymentService: BookingPaymentService,
  ) { }

  private async loadAuthorizedBooking(
    user: IRequestUser,
    bookingId: string,
    permission: 'BOOKING_VIEW' | 'BOOKING_MANAGE',
  ) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: bookingWithTurf,
    });

    if (!booking) throw new AppError(status.NOT_FOUND, 'Booking not found');

    const primarySlot = booking.bookingSlots[0]?.slot ?? null;

    if (user.role === UserRole.ADMIN) {
      if (primarySlot?.turf?.ownerId !== user.userId) {
        throw new AppError(status.FORBIDDEN, 'Not allowed');
      }
    } else if (user.role === UserRole.MANAGER) {
      const hasPermission = await prisma.turfManager.findFirst({
        where: {
          turfId: primarySlot?.turfId,
          managerId: user.userId,
          permissions: { some: { permission } },
        },
      });
      if (!hasPermission) throw new AppError(status.FORBIDDEN, 'Not allowed');
    } else {
      throw new AppError(status.FORBIDDEN, 'Not allowed');
    }

    return { booking, primarySlot };
  }

  // ---------------------------------------------------------------
  // Admin / manager creates a booking on behalf of a target user
  // ---------------------------------------------------------------
  async bookingByAdmin(
    bookedBy: IRequestUser,
    payload: {
      userId: string;
      slotIds: string[];
      discountAmount?: number;
      mobile?: string;
      advancePayment?: {
        method: string;
        senderMobile: string;
        transactionId: string;
        amount: number;
      };
    },
  ) {
    const { userId, slotIds, discountAmount = 0, mobile } = payload;

    if (!userId) throw new AppError(status.BAD_REQUEST, 'User ID is required');
    if (!Array.isArray(slotIds) || slotIds.length === 0) {
      throw new AppError(status.BAD_REQUEST, 'At least one slot is required');
    }

    if (bookedBy.role !== UserRole.ADMIN && bookedBy.role !== UserRole.MANAGER) {
      throw new AppError(status.FORBIDDEN, 'Not allowed');
    }

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) throw new AppError(status.NOT_FOUND, 'User not found');

    const uniqueSlotIds = [...new Set(slotIds)];

    const storedSlots = await prisma.turfSlot.findMany({
      where: { id: { in: uniqueSlotIds } },
      select: {
        id: true,
        price: true,
        turfId: true,
        slotDate: true,
        startMinute: true,
        endMinute: true,
        slotStatus: true,
        active: true,
      },
    });

    if (storedSlots.length !== uniqueSlotIds.length) {
      throw new AppError(status.NOT_FOUND, 'One or more slots were not found');
    }

    const turfIdsArr = [...new Set(storedSlots.map((s) => s.turfId))];
    if (turfIdsArr.length !== 1) {
      throw new AppError(
        status.BAD_REQUEST,
        'All slots in a booking must belong to the same turf',
      );
    }
    const turfId = turfIdsArr[0];

    const turf = await prisma.turf.findFirst({
      where: { id: turfId, status: 'ACTIVE' },
      include: { paymentPhoneNumbers: true },
    });

    if (!turf) throw new AppError(status.BAD_REQUEST, 'Turf is not available for booking');

    if (bookedBy.role === UserRole.ADMIN) {
      if ((turf as any).ownerId !== bookedBy.userId) {
        throw new AppError(status.FORBIDDEN, 'Not allowed');
      }
    } else if (bookedBy.role === UserRole.MANAGER) {
      const hasPermission = await prisma.turfManager.findFirst({
        where: {
          turfId: turf.id,
          managerId: bookedBy.userId,
          permissions: { some: { permission: 'BOOKING_MANAGE' } },
        },
      });
      if (!hasPermission) throw new AppError(status.FORBIDDEN, 'Not allowed');
    }

    let advance: {
      method: PaymentMethod;
      senderMobile: string;
      transactionId: string;
      amount: number;
    } | null = null;

    if (payload.advancePayment) {
      const { method, senderMobile, transactionId } = payload.advancePayment;
      const amount = Number(payload.advancePayment.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new AppError(status.BAD_REQUEST, 'Enter a valid advance amount');
      }
      if (!turf.allowAdvancePayment) {
        throw new AppError(
          status.BAD_REQUEST,
          'This turf does not accept advance payments',
        );
      }
      const accepted = turf.paymentPhoneNumbers.find((p) => p.method === method);
      if (!accepted) {
        throw new AppError(
          status.BAD_REQUEST,
          'Unsupported payment method for this turf',
        );
      }
      const sender = (senderMobile ?? '').replace(/[\s-]/g, '');
      if (!/^(?:\+8801|01)\d{9}$/.test(sender)) {
        throw new AppError(status.BAD_REQUEST, 'Enter a valid sender mobile number');
      }

      const txn = (transactionId ?? '').trim();
      if (txn.length < 4 || txn.length > 64) {
        throw new AppError(status.BAD_REQUEST, 'Enter a valid transaction number');
      }
      advance = {
        method: accepted.method,
        senderMobile: sender,
        transactionId: txn,
        amount,
      };

      const usedTransaction = await prisma.payment.findUnique({
        where: { providerTransactionId: txn },
      });
      if (usedTransaction) {
        throw new AppError(
          status.CONFLICT,
          'This transaction number has already been used',
        );
      }
    }

    for (const slot of storedSlots) {
      if (!slot.active) {
        throw new AppError(
          status.BAD_REQUEST,
          'One or more slots are not available for booking',
        );
      }
      if (slot.slotStatus === SlotSatus.BOOKED) {
        throw new AppError(status.CONFLICT, 'One or more turf slots are already booked');
      }
      if (slot.slotStatus === SlotSatus.WAITLIST) {
        throw new AppError(status.CONFLICT, 'One or more turf slots are already reserved');
      }
    }

    const discount = Number(discountAmount) || 0;
    const total = storedSlots.reduce((sum, s) => sum + Number(s.price), 0);
    if (discount < 0 || discount > total) {
      throw new AppError(status.BAD_REQUEST, 'Invalid discount amount');
    }
    const subtotal = total;
    const finalTotal = subtotal - discount;

    const idempotencyKey = `admin-${bookedBy.userId}-${Math.random().toString(36).slice(2)}`;

    try {
      const result = await prisma.$transaction(async (tx) => {
        const lockKeys = [
          ...new Set(
            storedSlots.map(
              (s) => `${turf.id}:${s.slotDate.toISOString().slice(0, 10)}`,
            ),
          ),
        ];
        for (const lockKey of lockKeys) {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;
        }

        const locked = await tx.turfSlot.findMany({
          where: { id: { in: uniqueSlotIds } },
          select: { id: true, slotStatus: true },
        });
        for (const row of locked) {
          if (row.slotStatus === SlotSatus.BOOKED) {
            throw new AppError(
              status.CONFLICT,
              'One or more turf slots are already booked',
            );
          }
          if (row.slotStatus === SlotSatus.WAITLIST) {
            throw new AppError(
              status.CONFLICT,
              'One or more turf slots are already reserved',
            );
          }
        }

        const booking = await tx.booking.create({
          data: {
            bookingNumber: await nextDocumentNumber(tx, 'BK'),
            userId: targetUser.id,
            bookedById: bookedBy.userId,
            numberOfSlot: uniqueSlotIds.length,
            baseAmount: total,
            packageAmount: 0,
            discountAmount: discount,
            subtotal,
            totalAmount: finalTotal,
            mobile: mobile?.trim() || targetUser.phoneNumber || null,
            bookingExpiresAt: new Date(
              Date.now() + Number(config.bookingPaymentTimeout ?? 15) * 60000,
            ),
            idempotencyKey,
            bookingSlots: {
              create: uniqueSlotIds.map((slotId) => ({ slotId })),
            },
            status: BookingStatus.CONFIRMED,
          },
          include: bookingSlotsInclude,
        });

        await tx.turfSlot.updateMany({
          where: { id: { in: uniqueSlotIds } },
          data: { slotStatus: SlotSatus.BOOKED },
        });

        if (advance) {
          const advanceAmount = advance.amount;
          if (advanceAmount > finalTotal) {
            throw new AppError(
              status.BAD_REQUEST,
              'Advance amount cannot exceed the booking total',
            );
          }
          const invoice = await this.invoiceService.createInvoice(tx, {
            bookingId: booking.id,
            userId: targetUser.id,
            invoiceFor: InvoiceFor.U,
            subtotal: booking.subtotal,
            discount: booking.discountAmount,
            totalAmount: booking.totalAmount,
            paidAmount: advanceAmount,
            status: advanceAmount >= finalTotal ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID,
            isFullPaid: advanceAmount >= finalTotal,
          });

          const paymentNumber = await nextDocumentNumber(tx, 'PAY');
          await tx.payment.create({
            data: {
              paymentNumber,
              invoiceId: invoice.id,
              type: PaymentType.ADVANCE,
              method: advance.method,
              status: PaymentStatus.SUCCEEDED,
              amount: advanceAmount,
              payerMobileNumber: advance.senderMobile,
              providerTransactionId: advance.transactionId,
              reference: advance.transactionId,
              receivedById: bookedBy.userId,
              paidAt: new Date(),
              idempotencyKey: `admin-advance-${idempotencyKey}`,
            },
          });
        }

        return booking;
      });

      return withSlots(result);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new AppError(status.CONFLICT, 'This turf slot is already booked');
      }
      throw error;
    }
  }

  // ---------------------------------------------------------------
  // Self-service booking creation (customer books their own slots)
  // ---------------------------------------------------------------
  async createBooking(user: IRequestUser, payload: BookingPayload) {
    const requestedSlots = payload.slots ?? [];

    if (requestedSlots.length === 0) {
      throw new AppError(status.BAD_REQUEST, 'At least one slot is required');
    }

    const idempotencyKey = payload.idempotencyKey?.trim();
    if (!idempotencyKey) {
      throw new AppError(status.BAD_REQUEST, 'Idempotency key is required');
    }

    // A single booking belongs to exactly one turf
    const turfIds = [...new Set(requestedSlots.map((s) => s.turfId))];
    if (turfIds.length !== 1) {
      throw new AppError(
        status.BAD_REQUEST,
        'All slots in a booking must belong to the same turf',
      );
    }
    const turfId = turfIds[0];

    // Deduplicate slots and normalise mobile once
    const uniqueSlots = [
      ...new Map(requestedSlots.map((s) => [s.slotId, s])).values(),
    ];
    for (const slot of uniqueSlots) {
      if (!slot.slotId) {
        throw new AppError(status.BAD_REQUEST, 'Slot ID is required for every slot');
      }
    }
    const requestedSlotIds = uniqueSlots.map((s) => s.slotId).sort();
    const normalizedMobile = payload.mobile?.trim() || null;

    // Idempotency replay
    const duplicate = await prisma.booking.findUnique({
      where: { idempotencyKey },
      include: bookingSlotsInclude,
    });

    if (duplicate) {
      if (duplicate.userId !== user.userId) {
        throw new AppError(status.CONFLICT, 'Idempotency key is already in use');
      }
      const existingSlotIds = duplicate.bookingSlots
        .map((bs) => bs.slotId)
        .sort();
      const sameSlotSet =
        existingSlotIds.length === requestedSlotIds.length &&
        existingSlotIds.every((id, index) => id === requestedSlotIds[index]);
      if (!sameSlotSet || (duplicate.mobile ?? null) !== normalizedMobile) {
        throw new AppError(
          status.CONFLICT,
          'Idempotency key was already used for a different booking request',
        );
      }
      return withSlots(duplicate);
    }

    const turf = await prisma.turf.findFirst({
      where: { id: turfId, status: 'ACTIVE' },
      include: { paymentPhoneNumbers: true },
    });

    if (!turf) {
      throw new AppError(status.BAD_REQUEST, 'Turf is not available for booking');
    }

    let advance: {
      method: PaymentMethod;
      senderMobile: string;
      transactionId: string;
      amount: number;
    } | null = null;

    if (payload.advancePayment) {
      const { method, senderMobile, transactionId } = payload.advancePayment;
      const amount = Number(payload.advancePayment.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new AppError(status.BAD_REQUEST, 'Enter a valid advance amount');
      }
      if (!turf.allowAdvancePayment) {
        throw new AppError(
          status.BAD_REQUEST,
          'This turf does not accept advance payments',
        );
      }
      const accepted = turf.paymentPhoneNumbers.find((p) => p.method === method);
      if (!accepted) {
        throw new AppError(
          status.BAD_REQUEST,
          'Unsupported payment method for this turf',
        );
      }
      const sender = (senderMobile ?? '').replace(/[\s-]/g, '');
      if (!/^(?:\+8801|01)\d{9}$/.test(sender)) {
        throw new AppError(status.BAD_REQUEST, 'Enter a valid sender mobile number');
      }

      const txn = (transactionId ?? '').trim();
      if (txn.length < 4 || txn.length > 64) {
        throw new AppError(status.BAD_REQUEST, 'Enter a valid transaction number');
      }
      advance = {
        method: accepted.method,
        senderMobile: sender,
        transactionId: txn,
        amount,
      };

      const usedTransaction = await prisma.payment.findUnique({
        where: { providerTransactionId: txn },
      });
      if (usedTransaction) {
        throw new AppError(
          status.CONFLICT,
          'This transaction number has already been used',
        );
      }
    }

    // Validate every requested slot
    for (const slot of uniqueSlots) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(slot.bookingDate ?? '')) {
        throw new AppError(status.BAD_REQUEST, 'Invalid booking date');
      }
      const date = new Date(`${slot.bookingDate}T00:00:00.000Z`);
      if (Number.isNaN(date.getTime()) || date.getTime() < Date.now() - 86400000) {
        throw new AppError(
          status.BAD_REQUEST,
          'Booking date must be valid and current',
        );
      }
    }

    const storedSlots = await prisma.turfSlot.findMany({
      where: { id: { in: uniqueSlots.map((s) => s.slotId) } },
      select: {
        id: true,
        price: true,
        turfId: true,
        slotDate: true,
        startMinute: true,
        endMinute: true,
        slotStatus: true,
        active: true,
      },
    });

    if (storedSlots.length !== uniqueSlots.length) {
      throw new AppError(status.NOT_FOUND, 'One or more slots were not found');
    }

    const storedById = new Map(storedSlots.map((s) => [s.id, s]));

    for (const requested of uniqueSlots) {
      const stored = storedById.get(requested.slotId)!;

      if (!stored.active) {
        throw new AppError(
          status.BAD_REQUEST,
          'One or more slots are not available for booking',
        );
      }
      if (stored.slotStatus === SlotSatus.BOOKED) {
        throw new AppError(status.CONFLICT, 'One or more turf slots are already booked');
      }
      if (stored.slotStatus === SlotSatus.WAITLIST) {
        throw new AppError(
          status.CONFLICT,
          'One or more turf slots are already reserved',
        );
      }
      if (
        stored.turfId !== turf.id ||
        stored.slotDate.toISOString().slice(0, 10) !== requested.bookingDate ||
        stored.startMinute !== requested.startMinute ||
        stored.endMinute !== requested.endMinute
      ) {
        throw new AppError(
          status.BAD_REQUEST,
          'Slot does not match the requested turf, date, or time',
        );
      }
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        const lockKeys = [
          ...new Set(uniqueSlots.map((s) => `${turf.id}:${s.bookingDate}`)),
        ];
        for (const lockKey of lockKeys) {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;
        }

        const locked = await tx.turfSlot.findMany({
          where: { id: { in: requestedSlotIds } },
          select: { id: true, slotStatus: true, price: true },
        });

        for (const row of locked) {
          if (row.slotStatus === SlotSatus.BOOKED) {
            throw new AppError(
              status.CONFLICT,
              'One or more turf slots are already booked',
            );
          }
          if (row.slotStatus === SlotSatus.WAITLIST) {
            throw new AppError(
              status.CONFLICT,
              'One or more turf slots are already reserved',
            );
          }
        }

        const total = locked.reduce((sum, slot) => sum + Number(slot.price), 0);

        const booking = await tx.booking.create({
          data: {
            bookingNumber: await nextDocumentNumber(tx, 'BK'),
            userId: user.userId,
            numberOfSlot: requestedSlotIds.length,
            baseAmount: total,
            packageAmount: 0,
            discountAmount: 0,
            subtotal: total,
            totalAmount: total,
            mobile: normalizedMobile,
            bookingExpiresAt: new Date(Date.now() + Number(config.bookingPaymentTimeout ?? 15) * 60000,),
            idempotencyKey,
            bookingSlots: {
              create: requestedSlotIds.map((slotId) => ({ slotId })),
            },
          },
          include: bookingSlotsInclude,
        });

        await tx.turfSlot.updateMany({
          where: { id: { in: requestedSlotIds } },
          data: { slotStatus: SlotSatus.WAITLIST },
        });

        if (advance) {
          const advanceAmount = advance.amount;
          if (advanceAmount > total) {
            throw new AppError(
              status.BAD_REQUEST,
              'Advance amount cannot exceed the booking total',
            );
          }
          const invoice = await this.invoiceService.createInvoice(tx, {
            bookingId: booking.id,
            userId: user.userId,
            invoiceFor: InvoiceFor.U,
            subtotal: booking.subtotal,
            discount: booking.discountAmount,
            totalAmount: booking.totalAmount,
            paidAmount: advanceAmount,
            status: InvoiceStatus.DRAFT,
            isFullPaid: false,
          });

          await this.bookingPaymentService.createAdvancePayment(
            {
              invoiceId: invoice.id,
              amount: advanceAmount,
              method: advance.method,
              senderMobile: advance.senderMobile,
              transactionId: advance.transactionId,
              idempotencyKey: `advance-${idempotencyKey}`,
            },
            tx,
          );
        }

        return booking;
      });

      return withSlots(result);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const concurrentDuplicate = await prisma.booking.findUnique({
          where: { idempotencyKey },
          include: bookingSlotsInclude,
        });
        if (concurrentDuplicate) {
          if (concurrentDuplicate.userId !== user.userId) {
            throw new AppError(status.CONFLICT, 'Idempotency key is already in use');
          }
          const existingSlotIds = concurrentDuplicate.bookingSlots
            .map((bs) => bs.slotId)
            .sort();
          const sameSlotSet =
            existingSlotIds.length === requestedSlotIds.length &&
            existingSlotIds.every((id, index) => id === requestedSlotIds[index]);
          if (!sameSlotSet || (concurrentDuplicate.mobile ?? null) !== normalizedMobile) {
            throw new AppError(
              status.CONFLICT,
              'Idempotency key was already used for a different booking request',
            );
          }
          return withSlots(concurrentDuplicate);
        }
        throw new AppError(status.CONFLICT, 'This turf slot is already booked');
      }
      throw error;
    }
  }

  // ---------------------------------------------------------------
  // List bookings with filters and pagination
  // ---------------------------------------------------------------
  async list(
    user: IRequestUser,
    page = 1,
    limit = 10,
    filters?: {
      bookingStatus?: string;
      paymentStatus?: string;
      date?: string;
      startDate?: string;
      endDate?: string;
      turfId?: string;
      sortBy?: string;
      sortOrder?: string;
      search?: string;
    },
  ): Promise<PaginatedBookingListDto> {
    const allowedSortFields = ['createdAt', 'totalAmount', 'status'] as const;
    const sortBy =
      filters?.sortBy && allowedSortFields.includes(filters.sortBy as any)
        ? filters.sortBy
        : 'createdAt';
    const sortOrder = filters?.sortOrder === 'asc' ? 'asc' : 'desc';

    // ---------- Base ownership scope ----------
    const where: Prisma.BookingWhereInput =
      user.role === UserRole.ADMIN
        ? { bookingSlots: { some: { slot: { turf: { ownerId: user.userId } } } } }
        : user.role === UserRole.MANAGER
          ? {
            bookingSlots: {
              some: {
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
              },
            },
          }
          : { userId: user.userId };

    const andConditions: Prisma.BookingWhereInput[] = [];

    // ---------- Booking status ----------
    if (filters?.bookingStatus && filters.bookingStatus !== 'ALL') {
      where.status = filters.bookingStatus as BookingStatus;
    }

    // ---------- Payment status ----------
    if (filters?.paymentStatus && filters.paymentStatus !== 'ALL') {
      if (filters.paymentStatus === InvoiceStatus.UNPAID) {
        andConditions.push({
          OR: [
            { invoice: { is: null } },
            { invoice: { is: { status: InvoiceStatus.UNPAID } } },
          ],
        });
      } else if (filters.paymentStatus === PaymentStatus.PROCESSING) {
        andConditions.push({
          OR: [
            { invoice: { is: null } },
            { invoice: { is: { status: InvoiceStatus.DRAFT } } },
          ],
        });
      } else {
        andConditions.push({
          invoice: { is: { status: filters.paymentStatus as InvoiceStatus } },
        });
      }
    }

    // ---------- Slot / date / turf filters ----------
    const slotFilter: Prisma.TurfSlotWhereInput = {};

    if (filters?.turfId) slotFilter.turfId = filters.turfId;

    if (filters?.date) {
      const startOfDay = new Date(filters.date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(filters.date);
      endOfDay.setHours(23, 59, 59, 999);

      slotFilter.slotDate = { gte: startOfDay, lte: endOfDay };
    } else if (filters?.startDate || filters?.endDate) {
      slotFilter.slotDate = {};
      if (filters.startDate) {
        const start = new Date(filters.startDate);
        start.setHours(0, 0, 0, 0);
        (slotFilter.slotDate as Prisma.DateTimeFilter).gte = start;
      }
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        (slotFilter.slotDate as Prisma.DateTimeFilter).lte = end;
      }
    }

    if (Object.keys(slotFilter).length > 0) {
      const existingSlots =
        (where.bookingSlots as Prisma.BookingSlotListRelationFilter) ?? {};
      where.bookingSlots = {
        ...existingSlots,
        some: {
          ...(existingSlots.some ?? {}),
          slot: {
            ...((existingSlots.some as any)?.slot ?? {}),
            ...slotFilter,
          },
        },
      };
    }

    // ---------- Search ----------
    if (filters?.search && filters.search.trim()) {
      const searchTerm = filters.search.trim();
      andConditions.push({
        OR: [
          { bookingNumber: { contains: searchTerm, mode: 'insensitive' } },
          {
            bookingSlots: {
              some: {
                slot: {
                  turf: { name: { contains: searchTerm, mode: 'insensitive' } },
                },
              },
            },
          },
          { user: { email: { contains: searchTerm, mode: 'insensitive' } } },
          { user: { phoneNumber: { contains: searchTerm, mode: 'insensitive' } } },
          { mobile: { contains: searchTerm, mode: 'insensitive' } },
        ],
      });
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    const skip = (page - 1) * limit;

    // ---------- Single query ----------
    const [data, total] = await prisma.$transaction([
      prisma.booking.findMany({
        where,
        select: {
          id: true,
          bookingNumber: true,
          userId: true,
          mobile: true,
          status: true,
          baseAmount: true,
          packageAmount: true,
          discountAmount: true,
          subtotal: true,
          totalAmount: true,
          numberOfSlot: true,
          bookingExpiresAt: true,
          createdAt: true,
          updatedAt: true,

          user: { select: { name: true, phoneNumber: true } },

          bookingSlots: {
            select: {
              slot: {
                select: {
                  id: true,
                  slotDate: true,
                  startMinute: true,
                  endMinute: true,
                  price: true,
                  isPeakTime: true,
                  slotStatus: true,
                  turf: { select: { id: true, name: true } },
                },
              },
            },
          },

          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              invoiceDate: true,
              invoiceFor: true,
              subtotal: true,
              discount: true,
              totalAmount: true,
              paidAmount: true,
              isFullPaid: true,
              status: true,
              payments: {
                select: {
                  id: true,
                  paymentNumber: true,
                  amount: true,
                  method: true,
                  type: true,
                  status: true,
                  paidAt: true,
                  reference: true,
                  note: true,
                  payerMobileNumber: true,
                  providerTransactionId: true,
                  paymentIntentId: true,
                  checkoutSessionId: true,
                  createdAt: true,
                  receivedBy: { select: { id: true, name: true } },
                },
                orderBy: { createdAt: 'desc' },
              },
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.booking.count({ where }),
    ]);

    // ---------- Map to DTO ----------
    const bookings: BookingListItemDto[] = data.map((booking) => {
      const slots: BookingListSlotDto[] = booking.bookingSlots.map((bs) => ({
        id: bs.slot.id,
        slotDate: bs.slot.slotDate,
        startMinute: bs.slot.startMinute,
        endMinute: bs.slot.endMinute,
        price: bs.slot.price.toString(),
        isPeakTime: bs.slot.isPeakTime,
        slotStatus: bs.slot.slotStatus,
        turf: {
          id: bs.slot.turf.id,
          name: bs.slot.turf.name,
        },
      }));

      const invoice: BookingListInvoiceDto | null = booking.invoice
        ? {
          id: booking.invoice.id,
          invoiceNumber: booking.invoice.invoiceNumber,
          invoiceDate: booking.invoice.invoiceDate,
          invoiceFor: booking.invoice.invoiceFor,
          subtotal: booking.invoice.subtotal.toString(),
          discount: booking.invoice.discount.toString(),
          totalAmount: booking.invoice.totalAmount.toString(),
          paidAmount: booking.invoice.paidAmount.toString(),
          isFullPaid: booking.invoice.isFullPaid,
          status: booking.invoice.status,
          payments: booking.invoice.payments.map((p) => ({
            id: p.id,
            paymentNumber: p.paymentNumber,
            amount: p.amount.toString(),
            method: p.method,
            type: p.type,
            status: p.status,
            paidAt: p.paidAt,
            reference: p.reference,
            note: p.note,
            payerMobileNumber: p.payerMobileNumber,
            providerTransactionId: p.providerTransactionId,
            paymentIntentId: p.paymentIntentId,
            checkoutSessionId: p.checkoutSessionId,
            receivedBy: p.receivedBy,
            createdAt: p.createdAt,
          })),
        }
        : null;

      return {
        id: booking.id,
        bookingNumber: booking.bookingNumber,
        userId: booking.userId,
        mobile: booking.mobile,
        customerName: booking.user?.name ?? null,
        customerPhone: booking.user?.phoneNumber ?? null,
        status: booking.status,
        paymentStatus: booking.invoice?.status ?? InvoiceStatus.UNPAID,
        baseAmount: booking.baseAmount.toString(),
        packageAmount: booking.packageAmount.toString(),
        discountAmount: booking.discountAmount.toString(),
        subtotal: booking.subtotal.toString(),
        totalAmount: booking.totalAmount.toString(),
        numberOfSlot: booking.numberOfSlot,
        bookingExpiresAt: booking.bookingExpiresAt,
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt,
        slots,
        slot: slots[0] ?? null,
        invoice,
      };
    });

    return {
      data: bookings,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(user: IRequestUser, bookingId: string): Promise<BookingListItemDto> {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        bookingNumber: true,
        userId: true,
        mobile: true,
        status: true,
        baseAmount: true,
        packageAmount: true,
        discountAmount: true,
        subtotal: true,
        totalAmount: true,
        numberOfSlot: true,
        bookingExpiresAt: true,
        createdAt: true,
        updatedAt: true,

        bookingSlots: {
          select: {
            slot: {
              select: {
                id: true,
                slotDate: true,
                startMinute: true,
                endMinute: true,
                price: true,
                isPeakTime: true,
                slotStatus: true,
                turf: { select: { id: true, name: true } },
              },
            },
          },
        },

        user: { select: { name: true, phoneNumber: true } },

        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            invoiceDate: true,
            invoiceFor: true,
            subtotal: true,
            discount: true,
            totalAmount: true,
            paidAmount: true,
            isFullPaid: true,
            status: true,
            payments: {
              select: {
                id: true,
                paymentNumber: true,
                amount: true,
                method: true,
                type: true,
                status: true,
                paidAt: true,
                reference: true,
                note: true,
                payerMobileNumber: true,
                providerTransactionId: true,
                paymentIntentId: true,
                checkoutSessionId: true,
                createdAt: true,
                receivedBy: { select: { id: true, name: true } },
              },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
    });

    if (!booking) throw new AppError(status.NOT_FOUND, 'Booking not found');

    if (user.role === UserRole.ADMIN) {
      const primarySlot = booking.bookingSlots[0]?.slot;
      if (primarySlot?.turf?.id) {
        const turf = await prisma.turf.findFirst({
          where: { id: primarySlot.turf.id, ownerId: user.userId },
          select: { id: true },
        });
        if (!turf) throw new AppError(status.FORBIDDEN, 'Not allowed');
      }
    } else if (user.role === UserRole.MANAGER) {
      const primarySlot = booking.bookingSlots[0]?.slot;
      if (primarySlot?.turf?.id) {
        const hasPermission = await prisma.turfManager.findFirst({
          where: {
            turfId: primarySlot.turf.id,
            managerId: user.userId,
            permissions: { some: { permission: 'BOOKING_VIEW' } },
          },
        });
        if (!hasPermission) throw new AppError(status.FORBIDDEN, 'Not allowed');
      }
    } else if (booking.userId !== user.userId) {
      throw new AppError(status.FORBIDDEN, 'Not allowed');
    }

    const slots: BookingListSlotDto[] = booking.bookingSlots.map((bs) => ({
      id: bs.slot.id,
      slotDate: bs.slot.slotDate,
      startMinute: bs.slot.startMinute,
      endMinute: bs.slot.endMinute,
      price: bs.slot.price.toString(),
      isPeakTime: bs.slot.isPeakTime,
      slotStatus: bs.slot.slotStatus,
      turf: {
        id: bs.slot.turf.id,
        name: bs.slot.turf.name,
      },
    }));

    const invoice: BookingListInvoiceDto | null = booking.invoice
      ? {
        id: booking.invoice.id,
        invoiceNumber: booking.invoice.invoiceNumber,
        invoiceDate: booking.invoice.invoiceDate,
        invoiceFor: booking.invoice.invoiceFor,
        subtotal: booking.invoice.subtotal.toString(),
        discount: booking.invoice.discount.toString(),
        totalAmount: booking.invoice.totalAmount.toString(),
        paidAmount: booking.invoice.paidAmount.toString(),
        isFullPaid: booking.invoice.isFullPaid,
        status: booking.invoice.status,
        payments: booking.invoice.payments.map((p) => ({
          id: p.id,
          paymentNumber: p.paymentNumber,
          amount: p.amount.toString(),
          method: p.method,
          type: p.type,
          status: p.status,
          paidAt: p.paidAt,
          reference: p.reference,
          note: p.note,
          payerMobileNumber: p.payerMobileNumber,
          providerTransactionId: p.providerTransactionId,
          paymentIntentId: p.paymentIntentId,
          checkoutSessionId: p.checkoutSessionId,
          receivedBy: p.receivedBy,
          createdAt: p.createdAt,
        })),
      }
      : null;

    return {
      id: booking.id,
      bookingNumber: booking.bookingNumber,
      userId: booking.userId,
      mobile: booking.mobile,
      customerName: booking.user?.name ?? null,
      customerPhone: booking.user?.phoneNumber ?? null,
      status: booking.status,
      paymentStatus: booking.invoice?.status ?? InvoiceStatus.UNPAID,
      baseAmount: booking.baseAmount.toString(),
      packageAmount: booking.packageAmount.toString(),
      discountAmount: booking.discountAmount.toString(),
      subtotal: booking.subtotal.toString(),
      totalAmount: booking.totalAmount.toString(),
      numberOfSlot: booking.numberOfSlot,
      bookingExpiresAt: booking.bookingExpiresAt,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
      slots,
      slot: slots[0] ?? null,
      invoice,
    };
  }

  // Bulk update booking status for multiple bookings
  async bulkUpdatePaymentStatus(
    user: IRequestUser,
    bookingIds: string[],
    nextBookingStatus: BookingStatus,
  ) {
    const where: Prisma.BookingWhereInput = { id: { in: bookingIds } };
    if (user.role === UserRole.ADMIN) {
      where.bookingSlots = { some: { slot: { turf: { ownerId: user.userId } } } };
    } else if (user.role === UserRole.MANAGER) {
      where.bookingSlots = {
        some: {
          slot: {
            turf: {
              managers: {
                some: {
                  managerId: user.userId,
                  permissions: { some: { permission: 'BOOKING_MANAGE' } },
                },
              },
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

  // Update booking data for a single booking (totalAmount, notes, etc.)
  async updatePayment(
    user: IRequestUser,
    bookingId: string,
    payload: { paymentStatus?: string; totalAmount?: number },
  ) {
    await this.loadAuthorizedBooking(user, bookingId, 'BOOKING_MANAGE');

    const data: Record<string, unknown> = {};
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

  // Cancel a booking
  async cancel(user: IRequestUser, bookingId: string) {
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, userId: user.userId },
      include: bookingWithTurf,
    });
    if (!booking) {
      throw new AppError(status.NOT_FOUND, 'Booking not found');
    }
    if (booking.status !== BookingStatus.PREBOOKED) {
      throw new AppError(status.BAD_REQUEST, 'Booking cannot be cancelled');
    }

    const slotIds = booking.bookingSlots.map((bs) => bs.slotId);

    return prisma.$transaction(async (tx) => {
      const cancelledBooking = await tx.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.CANCELLED },
      });

      if (slotIds.length) {
        await tx.turfSlot.updateMany({
          where: { id: { in: slotIds } },
          data: { slotStatus: SlotSatus.AVAILABLE },
        });
      }

      return cancelledBooking;
    });
  }

  // Expire unpaid bookings
  async expireUnpaid() {
    const expired = await prisma.booking.findMany({
      where: {
        status: BookingStatus.PREBOOKED,
        bookingExpiresAt: { lte: new Date() },
      },
      select: { id: true, bookingSlots: { select: { slotId: true } } },
    });

    if (expired.length === 0) return { count: 0 };

    const slotIds = [
      ...new Set(expired.flatMap((b) => b.bookingSlots.map((bs) => bs.slotId))),
    ];

    await prisma.$transaction([
      prisma.booking.updateMany({
        where: { id: { in: expired.map((b) => b.id) } },
        data: { status: BookingStatus.CANCELLED },
      }),

      prisma.payment.updateMany({
        where: {
          invoice: { bookingId: { in: expired.map((b) => b.id) } },
          status: PaymentStatus.PROCESSING,
        },
        data: { status: PaymentStatus.CANCELLED },
      }),

      ...(slotIds.length
        ? [
          prisma.turfSlot.updateMany({
            where: { id: { in: slotIds } },
            data: { slotStatus: SlotSatus.AVAILABLE },
          }),
        ]
        : []),
    ]);

    return { count: expired.length };
  }

  // Update booking status
  async updateBookingStatus(
    user: IRequestUser,
    bookingId: string,
    payload: { bookingStatus: string },
  ) {
    const { booking } = await this.loadAuthorizedBooking(
      user,
      bookingId,
      'BOOKING_MANAGE',
    );

    const statusValue = payload.bookingStatus as BookingStatus;

    if (!Object.values(BookingStatus).includes(statusValue)) {
      throw new AppError(status.BAD_REQUEST, 'Invalid booking status');
    }

    const slotIds = booking.bookingSlots.map((bs) => bs.slotId);

    if (slotIds.length) {
      const slotStatusMap: Record<BookingStatus, SlotSatus> = {
        [BookingStatus.PREBOOKED]: SlotSatus.WAITLIST,
        [BookingStatus.CONFIRMED]: SlotSatus.BOOKED,
        [BookingStatus.CANCELLED]: SlotSatus.AVAILABLE,
      };

      await prisma.turfSlot.updateMany({
        where: { id: { in: slotIds } },
        data: { slotStatus: slotStatusMap[statusValue] },
      });
    }

    return {
      bookingId: booking.id,
      slotIds,
      numberOfSlot: booking.numberOfSlot,
      bookingStatus: statusValue,
    };
  }

  // Confirm a PREBOOKED booking - creates invoice and transitions to CONFIRMED
  async confirm(user: IRequestUser, bookingId: string) {
    const { booking } = await this.loadAuthorizedBooking(
      user,
      bookingId,
      'BOOKING_MANAGE',
    );

    if (booking.status !== BookingStatus.PREBOOKED) {
      throw new AppError(
        status.BAD_REQUEST,
        `Cannot confirm booking with status ${booking.status}. Only PREBOOKED bookings can be confirmed.`,
      );
    }

    const slotIds = booking.bookingSlots.map((bs) => bs.slotId);

    if (slotIds.length) {
      const slots = await prisma.turfSlot.findMany({
        where: { id: { in: slotIds } },
        select: { slotStatus: true },
      });
      const notReserved = slots.filter((s) => s.slotStatus !== SlotSatus.WAITLIST);
      if (notReserved.length) {
        throw new AppError(
          status.CONFLICT,
          'One or more slots are no longer available for this booking',
        );
      }
    }

    return prisma.$transaction(async (tx) => {
      const updatedBooking = await tx.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.CONFIRMED },
      });

      if (slotIds.length) {
        await tx.turfSlot.updateMany({
          where: { id: { in: slotIds } },
          data: { slotStatus: SlotSatus.BOOKED },
        });
      }

      const existingInvoice = await this.verifyAdvancePayments(
        tx,
        booking.id,
        user.userId,
      );
      const invoice =
        existingInvoice ??
        (await this.invoiceService.createInvoice(tx, {
          bookingId: booking.id,
          userId: booking.userId,
          invoiceFor: InvoiceFor.U,
          subtotal: booking.subtotal,
          discount: booking.discountAmount,
          totalAmount: booking.totalAmount,
          paidAmount: 0,
          status: InvoiceStatus.UNPAID,
          isFullPaid: false,
        }));

      return { booking: updatedBooking, invoice };
    });
  }

  /**
   * Marks the customer-reported (PROCESSING) payments of a booking's invoice as
   * received and recalculates the invoice totals. Returns null when there is no invoice.
   */
  private async verifyAdvancePayments(
    tx: Prisma.TransactionClient,
    bookingId: string,
    receivedById: string,
  ) {
    const invoice = await tx.invoice.findUnique({ where: { bookingId } });
    if (!invoice) return null;

    await tx.payment.updateMany({
      where: { invoiceId: invoice.id, status: PaymentStatus.PROCESSING },
      data: { status: PaymentStatus.SUCCEEDED, receivedById, paidAt: new Date() },
    });

    const invoiceWithPayments = await this.invoiceService.getInvoiceWithPayments(
      tx,
      invoice.id,
    );
    if (!invoiceWithPayments) return null;

    const successfulPayments = filterSuccessfulPayments(
      invoiceWithPayments.payments,
    );
    const totals = computeInvoiceTotals(
      successfulPayments,
      invoiceWithPayments.totalAmount,
    );

    return tx.invoice.update({
      where: { id: invoice.id },
      data: {
        paidAmount: totals.paidAmount,
        isFullPaid: totals.isFullPaid,
        status: totals.status,
      },
    });
  }

  // Reject a PREBOOKED booking - cancels and releases every slot
  async reject(user: IRequestUser, bookingId: string) {
    const { booking } = await this.loadAuthorizedBooking(
      user,
      bookingId,
      'BOOKING_MANAGE',
    );

    if (booking.status !== BookingStatus.PREBOOKED) {
      throw new AppError(
        status.BAD_REQUEST,
        `Cannot reject booking with status ${booking.status}. Only PREBOOKED bookings can be rejected.`,
      );
    }

    const slotIds = booking.bookingSlots.map((bs) => bs.slotId);

    return prisma.$transaction(async (tx) => {
      const rejectedBooking = await tx.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.CANCELLED },
      });

      await tx.payment.updateMany({
        where: { invoice: { bookingId }, status: PaymentStatus.PROCESSING },
        data: { status: PaymentStatus.CANCELLED },
      });

      if (slotIds.length) {
        await tx.turfSlot.updateMany({
          where: { id: { in: slotIds } },
          data: { slotStatus: SlotSatus.AVAILABLE },
        });
      }

      return rejectedBooking;
    });
  }

  // Mark a CONFIRMED booking's slots as PLAYED (the booking itself stays CONFIRMED)
  async complete(user: IRequestUser, bookingId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { bookingSlots: { select: { slotId: true } } },
    });
    if (!booking) throw new AppError(status.NOT_FOUND, 'Booking not found');

    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new AppError(
        status.BAD_REQUEST,
        `Cannot complete booking with status ${booking.status}. Only CONFIRMED bookings can be completed.`,
      );
    }

    await this.loadAuthorizedBooking(user, bookingId, 'BOOKING_MANAGE');

    await prisma.turfSlot.updateMany({
      where: { id: { in: booking.bookingSlots.map((bs) => bs.slotId) } },
      data: { slotStatus: SlotSatus.PLAYED },
    });

    return { bookingId, slotStatus: SlotSatus.PLAYED };
  }

  // Confirm a PREBOOKED booking with optional payment
  async confirmWithPayment(
    user: IRequestUser,
    bookingId: string,
    payload: {
      paymentAmount: number;
      paymentMethod: 'CASH';
      reference?: string;
      note?: string;
    },
  ) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { ...bookingWithTurf, invoice: true },
    });

    if (!booking) {
      throw new AppError(status.NOT_FOUND, 'Booking not found');
    }

    if (booking.status !== BookingStatus.PREBOOKED) {
      throw new AppError(
        status.BAD_REQUEST,
        `Cannot confirm booking with status ${booking.status}. Only PREBOOKED bookings can be confirmed.`,
      );
    }

    await this.loadAuthorizedBooking(user, bookingId, 'BOOKING_MANAGE');

    const slotIds = booking.bookingSlots.map((bs) => bs.slotId);

    if (slotIds.length) {
      const slots = await prisma.turfSlot.findMany({
        where: { id: { in: slotIds } },
        select: { slotStatus: true },
      });
      const notReserved = slots.filter((s) => s.slotStatus !== SlotSatus.WAITLIST);
      if (notReserved.length) {
        throw new AppError(
          status.CONFLICT,
          'One or more slots are no longer available for this booking',
        );
      }
    }

    const paymentAmount = Number(payload.paymentAmount);
    if (paymentAmount < 0) {
      throw new AppError(status.BAD_REQUEST, 'Payment amount cannot be negative');
    }

    const totalAmount = Number(booking.totalAmount);
    const existingPayments = booking.invoice
      ? await prisma.payment.findMany({
        where: {
          invoiceId: booking.invoice.id,
          status: { in: [PaymentStatus.PROCESSING, PaymentStatus.SUCCEEDED] },
        },
        select: { amount: true },
      })
      : [];
    const alreadyPaid = existingPayments.reduce(
      (sum, p) => sum + Number(p.amount),
      0,
    );
    if (alreadyPaid + paymentAmount > totalAmount) {
      throw new AppError(
        status.BAD_REQUEST,
        `Payment amount exceeds total amount of ${totalAmount}`,
      );
    }

    return prisma.$transaction(async (tx) => {
      const updatedBooking = await tx.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.CONFIRMED },
      });

      if (slotIds.length) {
        await tx.turfSlot.updateMany({
          where: { id: { in: slotIds } },
          data: { slotStatus: SlotSatus.BOOKED },
        });
      }

      let invoice = await this.verifyAdvancePayments(tx, booking.id, user.userId);
      if (!invoice) {
        invoice = await this.invoiceService.createInvoice(tx, {
          bookingId: booking.id,
          userId: booking.userId,
          invoiceFor: InvoiceFor.U,
          subtotal: booking.subtotal,
          discount: booking.discountAmount,
          totalAmount: booking.totalAmount,
          paidAmount: paymentAmount,
          status:
            paymentAmount >= totalAmount
              ? InvoiceStatus.PAID
              : paymentAmount > 0
                ? InvoiceStatus.PARTIALLY_PAID
                : InvoiceStatus.UNPAID,
          isFullPaid: paymentAmount >= totalAmount,
        });
      }

      if (paymentAmount > 0) {
        const paymentNumber = await nextDocumentNumber(tx, 'PAY');
        await tx.payment.create({
          data: {
            paymentNumber,
            invoiceId: invoice.id,
            type: alreadyPaid > 0 ? PaymentType.REMAINING : PaymentType.ADVANCE,
            method: PaymentMethod.CASH,
            status: PaymentStatus.SUCCEEDED,
            amount: paymentAmount,
            receivedById: user.userId,
            reference: payload.reference,
            note: payload.note,
            paidAt: new Date(),
            idempotencyKey: `manual-${bookingId}-${Date.now()}`,
          },
        });
        if (alreadyPaid > 0) {
          await this.invoiceService.recalculateInvoice(tx, invoice.id);
          invoice = await tx.invoice.findUnique({ where: { id: invoice.id } });
        }
      }

      return { booking: updatedBooking, invoice };
    });
  }

  // Verify advance payment (PROCESSING -> SUCCEEDED) and update invoice
  async verifyAdvancePayment(user: IRequestUser, bookingId: string) {
    const { booking } = await this.loadAuthorizedBooking(
      user,
      bookingId,
      'BOOKING_MANAGE',
    );

    if (
      booking.status !== BookingStatus.PREBOOKED &&
      booking.status !== BookingStatus.CONFIRMED
    ) {
      throw new AppError(
        status.BAD_REQUEST,
        `Cannot verify advance payment for booking with status ${booking.status}`,
      );
    }

    return prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({ where: { bookingId } });
      if (!invoice) {
        throw new AppError(status.NOT_FOUND, 'No invoice found for this booking');
      }

      const processingPayments = await tx.payment.findMany({
        where: { invoiceId: invoice.id, status: PaymentStatus.PROCESSING },
      });

      if (processingPayments.length === 0) {
        throw new AppError(
          status.BAD_REQUEST,
          'No pending advance payment to verify',
        );
      }

      const paymentIds = processingPayments.map((p) => p.id);
      await tx.payment.updateMany({
        where: { id: { in: paymentIds } },
        data: {
          status: PaymentStatus.SUCCEEDED,
          receivedById: user.userId,
          paidAt: new Date(),
        },
      });

      await this.invoiceService.recalculateInvoice(tx, invoice.id);

      return {
        invoice: await tx.invoice.findUnique({ where: { id: invoice.id } }),
        verifiedPayments: paymentIds.length,
      };
    });
  }
}