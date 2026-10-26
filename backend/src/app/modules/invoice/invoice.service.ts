import { Injectable } from '@nestjs/common';
import httpStatus from 'http-status';
import { Prisma } from '../../../generated/prisma/client';
import { UserRole, PaymentStatus, InvoiceFor, InvoiceStatus } from '../../../generated/prisma/enums';
import AppError from '../../../config/errorHelpers/AppError';
import prisma from '../../../shared/prisma';
import { IRequestUser } from '../../interfaces/requestUser.interface';
import { nextDocumentNumber } from '../../utils/document-number';
import {
  computeInvoiceTotals,
  filterSuccessfulPayments,
  InvoiceTotals,
} from '../../helpers/invoice-payment.helper';

export interface InvoiceListPaymentDto {
  id: string;
  paymentNumber: string;
  amount: string;
  method: string;
  type: string;
  status: string;
  paidAt: Date | null;
  reference: string | null;
  note: string | null;
  payerMobileNumber: string | null;
  providerTransactionId: string | null;
  paymentIntentId: string | null;
  checkoutSessionId: string | null;
  receivedBy: { id: string; name: string } | null;
  createdAt: Date;
}

export interface InvoiceListBookingSlotDto {
  id: string;
  slotDate: Date;
  startMinute: number;
  endMinute: number;
  turf: { id: string; name: string };
}

export interface InvoiceListBookingDto {
  id: string;
  bookingNumber: string;
  status: string;
  slot: InvoiceListBookingSlotDto | null;
  slots: InvoiceListBookingSlotDto[];
  user: { id: string; name: string; email: string; phoneNumber: string | null } | null;
}

export interface InvoiceListDto {
  id: string;
  invoiceNumber: string;
  invoiceDate: Date;
  invoiceFor: string;
  status: string;
  subtotal: string;
  discount: string;
  totalAmount: string;
  paidAmount: string;
  isFullPaid: boolean;
  remainingAmount: number;
  booking: InvoiceListBookingDto | null;
  payments: InvoiceListPaymentDto[];
}

export interface PaginatedInvoiceListDto {
  data: InvoiceListDto[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

@Injectable()
export class InvoiceService {
  async createInvoice(
    tx: Prisma.TransactionClient,
    data: {
      bookingId?: string;
      subscriptionLogId?: string;
      userId: string;
      invoiceFor: InvoiceFor;
      subtotal: Prisma.Decimal | number;
      discount?: Prisma.Decimal | number;
      totalAmount: Prisma.Decimal | number;
      paidAmount?: Prisma.Decimal | number;
      status?: InvoiceStatus;
      isFullPaid?: boolean;
    }
  ) {
    return tx.invoice.create({
      data: {
        ...data,
        invoiceNumber: await nextDocumentNumber(tx, 'INV'),
        discount: data.discount ?? new Prisma.Decimal(0),
        paidAmount: data.paidAmount ?? new Prisma.Decimal(0),
        status: data.status ?? InvoiceStatus.UNPAID,
        isFullPaid: data.isFullPaid ?? false,
      },
    });
  }

  async recalculateInvoice(
    tx: Prisma.TransactionClient,
    invoiceId: string
  ): Promise<InvoiceTotals> {
    const invoice = await tx.invoice.findUnique({
      where: { id: invoiceId },
      include: { payments: true },
    });

    if (!invoice) {
      throw new AppError(httpStatus.NOT_FOUND, 'Invoice not found');
    }

    const successfulPayments = filterSuccessfulPayments(invoice.payments);
    const totals = computeInvoiceTotals(successfulPayments, invoice.totalAmount);

    await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        paidAmount: totals.paidAmount,
        status: totals.status,
        isFullPaid: totals.isFullPaid,
      },
    });

    return totals;
  }

  async getInvoiceWithPayments(tx: Prisma.TransactionClient, invoiceId: string) {
    return tx.invoice.findUnique({
      where: { id: invoiceId },
      include: { payments: true },
    });
  }

  async byBooking(user: IRequestUser, bookingId: string) {
    const where: Record<string, unknown> = { bookingId };

    // Authorization checks
    if (user.role === UserRole.ADMIN) {
      where.booking = { bookingSlots: { some: { slot: { turf: { ownerId: user.userId } } } } };
    } else if (user.role === UserRole.MANAGER) {
      where.booking = { bookingSlots: { some: { slot: { turf: { managers: { some: { managerId: user.userId } } } } } } };
    } else if (user.role === UserRole.USER) {
      where.booking = { userId: user.userId };
    }

    const invoice = await prisma.invoice.findFirst({
      where,
      include: {
        booking: {
          include: {
            bookingSlots: {
              include: {
                slot: {
                  include: {
                    turf: {
                      select: {
                        id: true,
                        name: true,
                        address: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        payments: true,
      },
    });

    if (!invoice) throw new AppError(httpStatus.NOT_FOUND, 'Invoice not found');

    const successfulPayments = filterSuccessfulPayments(invoice.payments);
    const totals = computeInvoiceTotals(successfulPayments, invoice.totalAmount);

    const primarySlot = invoice.booking?.bookingSlots[0]?.slot ?? null;

    return {
      ...invoice,
      booking: invoice.booking
        ? {
            ...invoice.booking,
            slot: primarySlot,
            slots: invoice.booking.bookingSlots.map((bs) => bs.slot),
          }
        : invoice.booking,
      paidAmount: totals.paidAmount,
      remainingAmount: Number(invoice.totalAmount) - Number(totals.paidAmount),
      status: totals.status,
      payments: successfulPayments,
    };
  }

async list(
    user: IRequestUser,
    page = 1,
    limit = 10,
    filters?: {
      status?: string;
      paymentStatus?: string;
      startDate?: string;
      endDate?: string;
      search?: string;
      sortBy?: string;
      sortOrder?: string;
    }
  ): Promise<PaginatedInvoiceListDto> {
    const allowedSortFields = ['invoiceDate', 'totalAmount', 'paidAmount', 'createdAt'] as const;
    const sortBy =
      filters?.sortBy && allowedSortFields.includes(filters.sortBy as any)
        ? filters.sortBy
        : 'invoiceDate';
    const sortOrder = filters?.sortOrder === 'asc' ? 'asc' : 'desc';

    const where: Prisma.InvoiceWhereInput = { invoiceFor: InvoiceFor.U };

    if (user.role === UserRole.ADMIN) {
      where.booking = { bookingSlots: { some: { slot: { turf: { ownerId: user.userId } } } } };
    } else if (user.role === UserRole.MANAGER) {
      where.booking = { bookingSlots: { some: { slot: { turf: { managers: { some: { managerId: user.userId } } } } } } };
    } else if (user.role === UserRole.USER) {
      where.booking = { userId: user.userId };
    }

    // Invoice status filter (InvoiceStatus values)
    if (filters?.status) {
      const statusValue = filters.status as InvoiceStatus;
      if (Object.values(InvoiceStatus).includes(statusValue)) {
        where.status = statusValue;
      }
    }

    // Payment status filter — invoice-level statuses map directly,
    // payment-level statuses require a matching payment row.
    if (filters?.paymentStatus && filters.paymentStatus !== 'ALL') {
      const ps = filters.paymentStatus as PaymentStatus;
      const invoiceLevel = [InvoiceStatus.UNPAID, InvoiceStatus.PAID, InvoiceStatus.PARTIALLY_PAID];
      if (invoiceLevel.some(s => s === ps)) {
        where.status = ps as unknown as InvoiceStatus;
      } else if (Object.values(PaymentStatus).includes(ps)) {
        where.payments = { some: { status: ps } };
      }
    }

    // Date range filter on invoiceDate
    if (filters?.startDate || filters?.endDate) {
      where.invoiceDate = {};
      if (filters.startDate) {
        const start = new Date(filters.startDate);
        start.setHours(0, 0, 0, 0);
        (where.invoiceDate as Prisma.DateTimeFilter).gte = start;
      }
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        (where.invoiceDate as Prisma.DateTimeFilter).lte = end;
      }
    }

    // Search filter - search by invoice number, booking number, turf name, user name/email
    if (filters?.search) {
      const searchTerm = filters.search.trim();
      where.OR = [
        { invoiceNumber: { contains: searchTerm, mode: 'insensitive' } },
        { booking: { bookingNumber: { contains: searchTerm, mode: 'insensitive' } } },
        { booking: { bookingSlots: { some: { slot: { turf: { name: { contains: searchTerm, mode: 'insensitive' } } } } } } },
        { booking: { user: { name: { contains: searchTerm, mode: 'insensitive' } } } },
        { booking: { user: { email: { contains: searchTerm, mode: 'insensitive' } } } },
      ];
    }

    const skip = (page - 1) * limit;
    const [data, total] = await prisma.$transaction([
      prisma.invoice.findMany({
        where,
        select: {
          id: true,
          invoiceNumber: true,
          invoiceDate: true,
          invoiceFor: true,
          status: true,
          subtotal: true,
          discount: true,
          totalAmount: true,
          paidAmount: true,
          isFullPaid: true,
          booking: {
            select: {
              id: true,
              bookingNumber: true,
              status: true,
              user: { select: { id: true, name: true, email: true, phoneNumber: true } },
              bookingSlots: {
                select: {
                  slot: {
                    select: { id: true, slotDate: true, startMinute: true, endMinute: true, turf: { select: { id: true, name: true } } },
                  },
                },
              },
            },
          },
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
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.invoice.count({ where }),
    ]);

    const toPaymentDto = (p: any): InvoiceListPaymentDto => ({
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
    });

    const toBookingDto = (booking: any): InvoiceListBookingDto | null => {
      if (!booking) return null;
      const slots: InvoiceListBookingSlotDto[] = booking.bookingSlots.map((bs: any) => ({
        id: bs.slot.id,
        slotDate: bs.slot.slotDate,
        startMinute: bs.slot.startMinute,
        endMinute: bs.slot.endMinute,
        turf: { id: bs.slot.turf.id, name: bs.slot.turf.name },
      }));
      return {
        id: booking.id,
        bookingNumber: booking.bookingNumber,
        status: booking.status,
        slot: slots[0] ?? null,
        slots,
        user: booking.user
          ? { id: booking.user.id, name: booking.user.name, email: booking.user.email, phoneNumber: booking.user.phoneNumber ?? null }
          : null,
      };
    };

    return {
      data: data.map((invoice) => {
        const successfulPayments = filterSuccessfulPayments(invoice.payments);
        const totals = computeInvoiceTotals(successfulPayments, invoice.totalAmount);
        const remainingAmount = Number(invoice.totalAmount) - Number(totals.paidAmount);

        return {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          invoiceDate: invoice.invoiceDate,
          invoiceFor: invoice.invoiceFor,
          status: totals.status,
          subtotal: invoice.subtotal.toString(),
          discount: invoice.discount.toString(),
          totalAmount: invoice.totalAmount.toString(),
          paidAmount: totals.paidAmount.toString(),
          isFullPaid: totals.isFullPaid,
          remainingAmount,
          booking: toBookingDto(invoice.booking),
          payments: invoice.payments.map(toPaymentDto),
        };
      }),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}
