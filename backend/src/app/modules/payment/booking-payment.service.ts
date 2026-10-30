import { Injectable } from '@nestjs/common';
import httpStatus from 'http-status';
import { PaymentStatus, UserRole, PaymentType, PaymentMethod } from '../../../generated/prisma/enums';
import { Prisma } from '../../../generated/prisma/client';
import AppError from '../../../config/errorHelpers/AppError';
import prisma from '../../../shared/prisma';
import { IRequestUser } from '../../interfaces/requestUser.interface';
import { nextDocumentNumber } from '../../utils/document-number';
import { InvoiceService } from '../invoice/invoice.service';
import { computeInvoiceTotals, filterSuccessfulPayments } from '../../helpers/invoice-payment.helper';

export interface CreateAdvancePaymentData {
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  senderMobile: string;
  transactionId: string;
  idempotencyKey: string;
}

@Injectable()
export class BookingPaymentService {
  constructor(private readonly invoiceService: InvoiceService) {}

  async createAdvancePayment(
    data: CreateAdvancePaymentData,
    tx?: Prisma.TransactionClient
  ) {
    const client = tx ?? prisma;
    const paymentNumber = await nextDocumentNumber(client, 'PAY');
    return client.payment.create({
      data: {
        paymentNumber,
        invoiceId: data.invoiceId,
        type: PaymentType.ADVANCE,
        method: data.method,
        status: PaymentStatus.PROCESSING,
        amount: data.amount,
        payerMobileNumber: data.senderMobile,
        providerTransactionId: data.transactionId,
        reference: data.transactionId,
        idempotencyKey: data.idempotencyKey,
      },
    });
  }


  async manualPayment(
    user: IRequestUser,
    bookingId: string,
    payload: { amount: number; method: 'CASH'; reference?: string; note?: string }
  ) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { bookingSlots: { include: { slot: { include: { turf: true } } } }, invoice: true },
    });

    if (!booking) throw new AppError(httpStatus.NOT_FOUND, 'Booking not found');

    const primarySlot = booking.bookingSlots[0]?.slot ?? null;

    if (!booking.invoice) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'No invoice found for this booking. Booking must be confirmed first.'
      );
    }

    if (booking.invoice.isFullPaid) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Invoice is already fully paid');
    }

    if (user.role === UserRole.ADMIN) {
      if (primarySlot?.turf?.ownerId !== user.userId) {
        throw new AppError(httpStatus.FORBIDDEN, 'Not allowed');
      }
    } else if (user.role === UserRole.MANAGER) {
      const hasPermission = await prisma.turfManager.findFirst({
        where: {
          turfId: primarySlot?.turfId,
          managerId: user.userId,
          permissions: { some: { permission: 'BOOKING_MANAGE' } },
        },
      });
      if (!hasPermission) throw new AppError(httpStatus.FORBIDDEN, 'Not allowed');
    } else {
      throw new AppError(httpStatus.FORBIDDEN, 'Not allowed');
    }

    const amount = Number(payload.amount);
    if (amount <= 0) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Payment amount must be greater than 0');
    }

    const invoice = await this.invoiceService.getInvoiceWithPayments(prisma, booking.invoice.id);
    if (!invoice) throw new AppError(httpStatus.NOT_FOUND, 'Invoice not found');

    const successfulPayments = filterSuccessfulPayments(invoice.payments);
    const paidAmount = successfulPayments.reduce((sum, p) => sum.add(new Prisma.Decimal(p.amount.toString())), new Prisma.Decimal(0));
    const remaining = Number(invoice.totalAmount) - Number(paidAmount);

    if (amount > remaining) {
      throw new AppError(httpStatus.BAD_REQUEST, `Payment amount exceeds remaining balance of ${remaining}`);
    }

    return prisma.$transaction(async (tx) => {
      const paymentNumber = await nextDocumentNumber(tx, 'PAY');
      const payment = await tx.payment.create({
        data: {
          paymentNumber,
          invoiceId: booking.invoice!.id,
          type: Number(paidAmount) === 0 ? PaymentType.ADVANCE : PaymentType.REMAINING,
          method: PaymentMethod.CASH,
          status: PaymentStatus.SUCCEEDED,
          amount,
          receivedById: user.userId,
          reference: payload.reference,
          note: payload.note,
          paidAt: new Date(),
          idempotencyKey: `manual-${bookingId}-${Date.now()}`,
        },
        include: { receivedBy: { select: { id: true, name: true, email: true } } },
      });

      const totals = computeInvoiceTotals(
        [...successfulPayments, { amount, status: PaymentStatus.SUCCEEDED }],
        invoice.totalAmount
      );

      await tx.invoice.update({
        where: { id: booking.invoice!.id },
        data: {
          paidAmount: totals.paidAmount,
          status: totals.status,
          isFullPaid: totals.isFullPaid,
        },
      });

      return payment;
    });
  }

  async listPaymentsByInvoice(user: IRequestUser, invoiceId: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { booking: { include: { bookingSlots: { include: { slot: { include: { turf: true } } } } } } },
    });

    if (!invoice) throw new AppError(httpStatus.NOT_FOUND, 'Invoice not found');

    const primarySlot = invoice.booking?.bookingSlots[0]?.slot ?? null;

    if (user.role === UserRole.ADMIN) {
      if (primarySlot?.turf.ownerId !== user.userId) {
        throw new AppError(httpStatus.FORBIDDEN, 'Not allowed');
      }
    } else if (user.role === UserRole.MANAGER) {
      const hasPermission = await prisma.turfManager.findFirst({
        where: {
          turfId: primarySlot?.turfId,
          managerId: user.userId,
          permissions: { some: { permission: 'BOOKING_MANAGE' } },
        },
      });
      if (!hasPermission) throw new AppError(httpStatus.FORBIDDEN, 'Not allowed');
    } else if (user.role === UserRole.USER) {
      if (invoice.booking?.userId !== user.userId) {
        throw new AppError(httpStatus.FORBIDDEN, 'Not allowed');
      }
    }

    return prisma.payment.findMany({
      where: { invoiceId },
      orderBy: { createdAt: 'desc' },
      include: { receivedBy: { select: { id: true, name: true, email: true } } },
    });
  }

  async updatePaymentStatus(
    user: IRequestUser,
    paymentId: string,
    payload: { status: PaymentStatus; note?: string }
  ) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { invoice: { include: { booking: { include: { bookingSlots: { include: { slot: { include: { turf: true } } } } } } } } },
    });

    if (!payment) throw new AppError(httpStatus.NOT_FOUND, 'Payment not found');

    const primarySlot = payment.invoice.booking?.bookingSlots[0]?.slot ?? null;

    if (user.role === UserRole.ADMIN) {
      if (primarySlot?.turf.ownerId !== user.userId) {
        throw new AppError(httpStatus.FORBIDDEN, 'Not allowed');
      }
    } else if (user.role === UserRole.MANAGER) {
      const hasPermission = await prisma.turfManager.findFirst({
        where: {
          turfId: primarySlot?.turfId,
          managerId: user.userId,
          permissions: { some: { permission: 'BOOKING_MANAGE' } },
        },
      });
      if (!hasPermission) throw new AppError(httpStatus.FORBIDDEN, 'Not allowed');
    } else {
      throw new AppError(httpStatus.FORBIDDEN, 'Not allowed');
    }

    if (
      payment.status === PaymentStatus.SUCCEEDED &&
      payload.status !== PaymentStatus.REFUNDED &&
      payload.status !== PaymentStatus.FAILED &&
      payload.status !== PaymentStatus.CANCELLED
    ) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Can only refund, fail, or cancel succeeded payments');
    }

    return prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { id: paymentId },
        data: { status: payload.status, note: payload.note },
        include: { receivedBy: { select: { id: true, name: true, email: true } } },
      });

      if (
        payload.status === PaymentStatus.REFUNDED ||
        payload.status === PaymentStatus.FAILED ||
        payload.status === PaymentStatus.CANCELLED
      ) {
        const invoice = await this.invoiceService.getInvoiceWithPayments(tx, payment.invoiceId);
        if (invoice) {
          const successfulPayments = filterSuccessfulPayments(invoice.payments);
          const totals = computeInvoiceTotals(successfulPayments, invoice.totalAmount);

          await tx.invoice.update({
            where: { id: payment.invoiceId },
            data: {
              paidAmount: totals.paidAmount,
              status: totals.status,
              isFullPaid: totals.isFullPaid,
            },
          });
        }
      }

      return updatedPayment;
    });
  }
}