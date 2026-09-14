import { Injectable } from '@nestjs/common';
import type Stripe from 'stripe';
import httpStatus from 'http-status';
import { PaymentStatus, UserRole, PaymentType, PaymentMethod } from '../../../generated/prisma/enums';
import AppError from '../../../config/errorHelpers/AppError';
import prisma from '../../../shared/prisma';
import { stripe } from '../../helpers/stripe';
import { IRequestUser } from '../../interfaces/requestUser.interface';

@Injectable()
export class PaymentService {
  async checkout(user: IRequestUser, bookingId: string) {
    // Get booking and verify ownership
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        invoice: true,
        slot: { include: { turf: true } },
      },
    });

    if (!booking || booking.userId !== user.userId) {
      throw new AppError(httpStatus.NOT_FOUND, 'Booking not found');
    }

    if (!booking.invoice) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'No invoice found for this booking. Booking must be confirmed first.'
      );
    }

    // Get first payment for the invoice (payment should exist for checkout)
    const payment = await prisma.payment.findFirst({
      where: {
        invoiceId: booking.invoice.id,
      },
    });

    if (!payment) {
      throw new AppError(httpStatus.NOT_FOUND, 'Payment not found');
    }

    if (payment.status !== PaymentStatus.PENDING) {
      return payment;
    }

    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        line_items: [
          {
            price_data: {
              currency: 'bdt',
              product_data: {
                name: booking.slot?.turf?.name ?? 'Turf Booking',
              },
              unit_amount: Math.round(Number(payment.amount) * 100),
            },
            quantity: 1,
          },
        ],
        success_url:
          `${process.env.FRONTEND_URL}/user/dashboard/payment/success?bookingId=${bookingId}`,
        cancel_url:
          `${process.env.FRONTEND_URL}/user/dashboard/payment/cancel?bookingId=${bookingId}`,
        metadata: {
          bookingId,
          paymentId: payment.id,
        },
      },
      {
        idempotencyKey: `checkout-${payment.id}`,
      },
    );

    const paymentRecord = await prisma.payment.update({
      where: { id: payment.id },
      data: { checkoutSessionId: session.id },
    });

    return {
      ...paymentRecord,
      checkoutUrl: session.url,
    };
  }

  async webhook(payload: Buffer, signature: string) {
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET as string,
      );
    } catch {
      throw new AppError(httpStatus.BAD_REQUEST, 'Invalid Stripe webhook signature');
    }

    if (event.type !== 'checkout.session.completed') {
      return { received: true };
    }

    const session = event.data.object as Stripe.Checkout.Session;
    const paymentId = session.metadata?.paymentId;
    const bookingId = session.metadata?.bookingId;

    if (!paymentId || !bookingId) {
      return { received: true };
    }

    return prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
        include: { invoice: { include: { booking: true } } },
      });

      if (!payment || payment.rawEventId === event.id) {
        return { received: true };
      }

      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.SUCCEEDED,
          checkoutSessionId: session.id,
          rawEventId: event.id,
          paidAt: new Date(),
        },
      });

      // Update invoice paidAmount
      if (payment.invoice) {
        const updatedPaidAmount =
          Number(payment.invoice.paidAmount) + Number(payment.amount);
        const invoiceStatus =
          updatedPaidAmount >= Number(payment.invoice.totalAmount)
            ? PaymentStatus.PAID
            : PaymentStatus.PARTIALLY_PAID;

        await tx.bookingInvoice.update({
          where: { id: payment.invoiceId },
          data: {
            paidAmount: updatedPaidAmount,
            status: invoiceStatus,
            isFullPaid: updatedPaidAmount >= Number(payment.invoice.totalAmount),
          },
        });
      }

      return { received: true };
    });
  }

  async manualPayment(user: IRequestUser, bookingId: string, payload: { amount: number; method: 'CASH'; reference?: string; note?: string }) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { slot: { include: { turf: true } }, invoice: true },
    });

    if (!booking) throw new AppError(httpStatus.NOT_FOUND, 'Booking not found');

    if (!booking.invoice) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'No invoice found for this booking. Booking must be confirmed first.'
      );
    }

    if (user.role === UserRole.ADMIN) {
      if (booking.slot?.turf?.ownerId !== user.userId) {
        throw new AppError(httpStatus.FORBIDDEN, 'Not allowed');
      }
    } else if (user.role === UserRole.MANAGER) {
      const hasPermission = await prisma.turfManager.findFirst({
        where: {
          turfId: booking.slot?.turfId,
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

    const successfulPayments = await prisma.payment.aggregate({
      where: { invoiceId: booking.invoice.id, status: PaymentStatus.SUCCEEDED },
      _sum: { amount: true },
    });
    const paidAmount = Number(successfulPayments._sum?.amount ?? 0);
    const remaining = Number(booking.invoice.totalAmount) - paidAmount;

    if (amount > remaining) {
      throw new AppError(httpStatus.BAD_REQUEST, `Payment amount exceeds remaining balance of ${remaining}`);
    }

    return prisma.$transaction(async (tx) => {
      const paymentNumber = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const payment = await tx.payment.create({
        data: {
          paymentNumber,
          invoiceId: booking.invoice!.id,
          type: paidAmount === 0 ? PaymentType.ADVANCE : PaymentType.REMAINING,
          method: PaymentMethod.CASH,
          status: PaymentStatus.SUCCEEDED,
          amount,
          receivedById: user.userId,
          reference: payload.reference,
          note: payload.note,
          paidAt: new Date(),
          idempotencyKey: `manual-${bookingId}-${Date.now()}`,
        },
        include: {
          receivedBy: { select: { id: true, name: true, email: true } },
        },
      });

      const newPaidAmount = paidAmount + amount;
      const invoiceStatus =
        newPaidAmount >= Number(booking.invoice!.totalAmount)
          ? PaymentStatus.PAID
          : PaymentStatus.PARTIALLY_PAID;

      await tx.bookingInvoice.update({
        where: { id: booking.invoice!.id },
        data: {
          paidAmount: newPaidAmount,
          status: invoiceStatus,
          isFullPaid: newPaidAmount >= Number(booking.invoice!.totalAmount),
        },
      });

      return payment;
    });
  }
}
