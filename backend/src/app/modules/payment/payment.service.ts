import { Injectable } from '@nestjs/common';
import type Stripe from 'stripe';
import httpStatus from 'http-status';
import { PaymentStatus, UserRole, PaymentType, PaymentMethod, FixedPeriod, SubscriptionStatus, SubscriptionAction } from '../../../generated/prisma/enums';
import { Prisma } from '../../../generated/prisma/client';
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

    if (payment.status !== PaymentStatus.UNPAID) {
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

        await tx.invoice.update({
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

      await tx.invoice.update({
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

  async listPaymentsByInvoice(user: IRequestUser, invoiceId: string) {
    // Verify invoice access
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { booking: { include: { slot: { include: { turf: true } } } } },
    });

    if (!invoice) throw new AppError(httpStatus.NOT_FOUND, 'Invoice not found');

    // Authorization checks
    if (user.role === UserRole.ADMIN) {
      if (invoice.booking?.slot.turf.ownerId !== user.userId) {
        throw new AppError(httpStatus.FORBIDDEN, 'Not allowed');
      }
    } else if (user.role === UserRole.MANAGER) {
      const hasPermission = await prisma.turfManager.findFirst({
        where: {
          turfId: invoice.booking?.slot?.turfId,
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

    const payments = await prisma.payment.findMany({
      where: { invoiceId },
      orderBy: { createdAt: 'desc' },
      include: { receivedBy: { select: { id: true, name: true, email: true } } },
    });

    return payments;
  }

  async updatePaymentStatus(user: IRequestUser, paymentId: string, payload: { status: PaymentStatus; note?: string }) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { invoice: { include: { booking: { include: { slot: { include: { turf: true } } } } } } },
    });

    if (!payment) throw new AppError(httpStatus.NOT_FOUND, 'Payment not found');

    // Authorization checks
    if (user.role === UserRole.ADMIN) {
      if (payment.invoice.booking?.slot.turf.ownerId !== user.userId) {
        throw new AppError(httpStatus.FORBIDDEN, 'Not allowed');
      }
    } else if (user.role === UserRole.MANAGER) {
      const hasPermission = await prisma.turfManager.findFirst({
        where: {
          turfId: payment.invoice.booking?.slot.turfId,
          managerId: user.userId,
          permissions: { some: { permission: 'BOOKING_MANAGE' } },
        },
      });
      if (!hasPermission) throw new AppError(httpStatus.FORBIDDEN, 'Not allowed');
    } else {
      throw new AppError(httpStatus.FORBIDDEN, 'Not allowed');
    }

    // Can only update to REFUNDED, FAILED, CANCELLED from SUCCEEDED
    if (payment.status === PaymentStatus.SUCCEEDED && payload.status !== PaymentStatus.REFUNDED && payload.status !== PaymentStatus.FAILED && payload.status !== PaymentStatus.CANCELLED) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Can only refund, fail, or cancel succeeded payments');
    }

    return prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { id: paymentId },
        data: { status: payload.status, note: payload.note },
        include: { receivedBy: { select: { id: true, name: true, email: true } } },
      });

      // If refunding, update invoice paidAmount
      if (payload.status === PaymentStatus.REFUNDED || payload.status === PaymentStatus.FAILED || payload.status === PaymentStatus.CANCELLED) {
        const successfulPayments = await tx.payment.aggregate({
          where: { invoiceId: payment.invoiceId, status: PaymentStatus.SUCCEEDED },
          _sum: { amount: true },
        });
        const newPaidAmount = Number(successfulPayments._sum?.amount ?? 0);
        const invoiceStatus =
          newPaidAmount >= Number(payment.invoice.totalAmount)
            ? PaymentStatus.PAID
            : newPaidAmount > 0
              ? PaymentStatus.PARTIALLY_PAID
              : PaymentStatus.UNPAID;

        await tx.invoice.update({
          where: { id: payment.invoiceId },
          data: {
            paidAmount: newPaidAmount,
            status: invoiceStatus,
            isFullPaid: newPaidAmount >= Number(payment.invoice.totalAmount),
          },
        });
      }

      return updatedPayment;
    });
  }

  // Subscription payment methods
  async initiateSubscriptionPayment(
    user: IRequestUser,
    planId: string,
    billingPeriod: FixedPeriod,
    paymentMethod: PaymentMethod,
    providerTransactionId?: string
  ) {
    // Check if user has existing subscription
    const existingSub = await prisma.subscription.findUnique({
      where: { userId: user.userId },
      include: { plan: { include: { prices: true } } },
    });

    const targetPlan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId },
      include: { prices: true },
    });

    if (!targetPlan) {
      throw new AppError(httpStatus.NOT_FOUND, 'Subscription plan not found');
    }

    const priceData = targetPlan.prices.find((p) => p.period === billingPeriod);
    
    if (!priceData) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Invalid billing period for this plan');
    }

    const price = new Prisma.Decimal(priceData.price.toString());

    // If free trial plan (tierLevel 0), no payment needed
    if (targetPlan.tierLevel === 0) {
      // This will be handled by subscription service
      throw new AppError(httpStatus.BAD_REQUEST, 'Free trial plan does not require payment');
    }

    // Check if there's already an unpaid invoice for this subscription
    if (existingSub) {
      const unpaidInvoice = await prisma.invoice.findFirst({
        where: {
          subscriptionLog: {
            subscriptionId: existingSub.id,
          },
          status: { in: ['UNPAID', 'PARTIALLY_PAID'] },
        },
        include: { payments: true },
      });

      if (unpaidInvoice) {
        // Return existing unpaid invoice for payment
        const paymentNumber = `PAY-SUB-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        const pendingPayment = await prisma.payment.create({
          data: {
            paymentNumber,
            invoiceId: unpaidInvoice.id,
            paidAmount: 0,
            type: PaymentType.FULL,
            method: paymentMethod,
            amount: price,
            status: 'UNPAID',
            providerTransactionId: providerTransactionId || null,
            idempotencyKey: `sub_${existingSub.id}_${Date.now()}`,
          },
        });

        return { invoice: unpaidInvoice, payment: pendingPayment, subscription: existingSub };
      }
    }

    // Create subscription if not exists (with TRIAL status initially)
    let subscription = existingSub;
    let trialLog: { id: string } | null = null;

    if (!subscription) {
      const now = new Date();
      const trialEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      
      subscription = await prisma.subscription.create({
        data: {
          userId: user.userId,
          planId,
          status: SubscriptionStatus.TRIAL,
          startDate: now,
          endDate: trialEnd,
          trialStart: now,
          trialEnd,
          isTrialUsed: true,
        },
        include: { plan: { include: { prices: true } } },
      });

      // Create TRIAL_STARTED log
      trialLog = await prisma.subscriptionLog.create({
        data: {
          subscriptionId: subscription.id,
          action: SubscriptionAction.TRIAL_STARTED,
          status: SubscriptionStatus.TRIAL,
          startDate: subscription.startDate,
          endDate: subscription.endDate,
        },
      });
    }

    // Create invoice for the subscription
    const invoiceData: any = {
      invoiceNumber: `INV-SUB-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      invoiceFor: 'O', // Owner
      subtotal: price,
      discount: new Prisma.Decimal(0),
      totalAmount: price,
      paidAmount: new Prisma.Decimal(0),
      isFullPaid: false,
      status: 'UNPAID',
      userId: user.userId,
    };

    if (trialLog) {
      invoiceData.subscriptionLog = {
        connect: {
          id: trialLog.id,
        },
      };
    }

    const invoice = await prisma.invoice.create({
      data: invoiceData,
    });

    // Create pending payment
    const paymentNumber = `PAY-SUB-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const payment = await prisma.payment.create({
      data: {
        paymentNumber,
        invoiceId: invoice.id,
        paidAmount: 0,
        type: PaymentType.FULL,
        method: paymentMethod,
        amount: price,
        status: 'UNPAID',
        providerTransactionId: providerTransactionId || null,
        idempotencyKey: `sub_${subscription.id}_${Date.now()}`,
      },
    });

    return { invoice, payment, subscription };
  }

  async verifySubscriptionPayment(
    user: IRequestUser,
    invoiceId: string,
    providerTransactionId: string,
    _paymentMethod: PaymentMethod
  ) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { payments: true, subscriptionLog: { include: { subscription: { include: { plan: { include: { prices: true } } } } } } },
    });

    if (!invoice) {
      throw new AppError(httpStatus.NOT_FOUND, 'Invoice not found');
    }

    if (invoice.userId !== user.userId) {
      throw new AppError(httpStatus.FORBIDDEN, 'Access denied');
    }

    if (invoice.status === 'PAID') {
      throw new AppError(httpStatus.BAD_REQUEST, 'Invoice already paid');
    }

    const pendingPayment = invoice.payments.find(
      (p) => p.providerTransactionId === providerTransactionId && p.status === 'UNPAID'
    );

    if (!pendingPayment) {
      throw new AppError(httpStatus.NOT_FOUND, 'Pending payment not found');
    }

    // Verify payment - in production, you'd verify with payment gateway
    // For now, we'll update the payment as succeeded
    const updatedPayment = await prisma.payment.update({
      where: { id: pendingPayment.id },
      data: {
        status: 'PAID',
        paidAmount: pendingPayment.amount,
        paidAt: new Date(),
      },
    });

    // Update invoice
    const totalPaid = invoice.paidAmount.plus(pendingPayment.amount);
    const isFullPaid = totalPaid.gte(invoice.totalAmount);

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        paidAmount: totalPaid,
        status: isFullPaid ? 'PAID' : 'PARTIALLY_PAID',
        isFullPaid,
      },
    });

    // If fully paid, activate subscription
    if (isFullPaid && invoice.subscriptionLog) {
      const subscription = await prisma.subscription.findUnique({
        where: { id: invoice.subscriptionLog.subscriptionId },
        include: { plan: { include: { prices: true } } },
      });

      if (subscription) {
        // Calculate end date based on billing period from subscription plan
        const now = new Date();
        const plan = subscription.plan;
        
        // Get the period from the plan prices that matches the invoice amount
        const priceData = plan.prices.find((p) => p.price.toString() === invoice.totalAmount.toString());
        const period = priceData?.period || FixedPeriod.MONTHLY;

        let endDate = new Date(now);
        if (period === FixedPeriod.YEARLY) {
          endDate.setFullYear(now.getFullYear() + 1);
        } else if (period === FixedPeriod.HALF_YEARLY) {
          endDate.setMonth(now.getMonth() + 6);
        } else if (period === FixedPeriod.QUARTERLY) {
          endDate.setMonth(now.getMonth() + 3);
        } else {
          endDate.setMonth(now.getMonth() + 1);
        }

        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: SubscriptionStatus.ACTIVE,
            startDate: now,
            endDate,
          },
        });

        // Create SUBSCRIBED log
        await prisma.subscriptionLog.create({
          data: {
            subscriptionId: subscription.id,
            action: SubscriptionAction.SUBSCRIBED,
            status: SubscriptionStatus.ACTIVE,
            startDate: now,
            endDate,
            invoice: { connect: { id: invoice.id } },
          },
        });
      }
    }

    return { payment: updatedPayment, invoice };
  }

  async getInvoiceById(invoiceId: string, userId: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { payments: true, subscriptionLog: { include: { subscription: { include: { plan: true } } } } },
    });

    if (!invoice) {
      throw new AppError(httpStatus.NOT_FOUND, 'Invoice not found');
    }

    if (invoice.userId !== userId) {
      throw new AppError(httpStatus.FORBIDDEN, 'Access denied');
    }

    return invoice;
  }
}
