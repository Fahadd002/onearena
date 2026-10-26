import { Injectable } from '@nestjs/common';
import httpStatus from 'http-status';
import {
  PaymentStatus,
  PaymentType,
  PaymentMethod,
  FixedPeriod,
  SubscriptionStatus,
  SubscriptionAction,
  InvoiceFor,
  InvoiceStatus,
} from '../../../generated/prisma/enums';
import { Prisma } from '../../../generated/prisma/client';
import AppError from '../../../config/errorHelpers/AppError';
import prisma from '../../../shared/prisma';
import { IRequestUser } from '../../interfaces/requestUser.interface';
import { nextDocumentNumber } from '../../utils/document-number';
import { startOfDay } from '../../utils/date';
import { InvoiceService } from '../invoice/invoice.service';
import { computeInvoiceTotals, filterSuccessfulPayments } from '../../helpers/invoice-payment.helper';

type SubscriptionWithPlan = Prisma.SubscriptionGetPayload<{
  include: { plan: { include: { prices: true } } };
}>;

@Injectable()
export class SubscriptionPaymentService {
  constructor(private readonly invoiceService: InvoiceService) {}

  async initiateSubscriptionPayment(
    user: IRequestUser,
    planId: string,
    billingPeriod: FixedPeriod,
    paymentMethod: PaymentMethod,
    providerTransactionId?: string,
    payerMobileNumber?: string
  ) {
    const existingSub = await prisma.subscription.findUnique({
      where: { userId: user.userId },
      include: {
        plan: { include: { prices: true } },
        subscriptionLogs: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { invoice: true },
        },
      },
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
    const isCash = paymentMethod === PaymentMethod.CASH;
    const planChanged = !existingSub || existingSub.planId !== planId;

    return prisma.$transaction(async (tx) => {
      const subscription: SubscriptionWithPlan = await (async () => {
        if (!existingSub) {
          const now = startOfDay(new Date());
          const trialEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

          return tx.subscription.create({
            data: {
              userId: user.userId,
              planId,
              status: SubscriptionStatus.INACTIVE,
              startDate: now,
              endDate: trialEnd,
              freeStart: now,
              freeEnd: trialEnd,
              isFreeUsed: true,
            },
            include: { plan: { include: { prices: true } } },
          });
        }

        if (planChanged) {
          return tx.subscription.update({
            where: { id: existingSub.id },
            data: { planId, status: SubscriptionStatus.INACTIVE },
            include: { plan: { include: { prices: true } } },
          });
        }

        return {
          id: existingSub.id,
          userId: existingSub.userId,
          planId: existingSub.planId,
          status: SubscriptionStatus.INACTIVE,
          startDate: existingSub.startDate,
          endDate: existingSub.endDate,
          freeStart: existingSub.freeStart,
          freeEnd: existingSub.freeEnd,
          isFreeUsed: existingSub.isFreeUsed,
          isFreeActive: existingSub.isFreeActive,
          createdAt: existingSub.createdAt,
          updatedAt: existingSub.updatedAt,
          plan: existingSub.plan,
        } satisfies SubscriptionWithPlan;
      })();

      const action = !existingSub
        ? SubscriptionAction.SUBSCRIBED
        : planChanged
        ? SubscriptionAction.UPGRADED
        : SubscriptionAction.RENEWED;

      const newLog = await tx.subscriptionLog.create({
        data: {
          subscriptionId: subscription.id,
          action,
          status: subscription.status,
          period: billingPeriod,
          startDate: subscription.startDate,
          endDate: subscription.endDate,
        },
      });

      const invoice = await this.invoiceService.createInvoice(tx, {
        subscriptionLogId: newLog.id,
        userId: user.userId,
        invoiceFor: InvoiceFor.O,
        subtotal: price,
        discount: new Prisma.Decimal(0),
        totalAmount: price,
        paidAmount: new Prisma.Decimal(0),
        status: InvoiceStatus.DRAFT,
        isFullPaid: false,
      });

      if (isCash) {
        return { invoice, payment: null, subscription };
      }

      const paymentNumber = await nextDocumentNumber(tx, 'PAY');
      const pendingPayment = await tx.payment.create({
        data: {
          paymentNumber,
          invoiceId: invoice.id,
          type: PaymentType.FULL,
          method: paymentMethod,
          amount: price,
          status: PaymentStatus.PROCESSING,
          providerTransactionId: providerTransactionId ?? null,
          payerMobileNumber: payerMobileNumber ?? null,
          idempotencyKey: `sub_${subscription.id}_${Date.now()}`,
        },
      });

      return { invoice, payment: pendingPayment, subscription };
    });
  }

  async verifySubscriptionPayment(
    user: IRequestUser,
    invoiceId: string,
    providerTransactionId: string,
    paymentMethod: PaymentMethod
  ) {
    return prisma.$transaction(async (tx) => {
      const invoice = await this.invoiceService.getInvoiceWithPayments(tx, invoiceId);

      if (!invoice) {
        throw new AppError(httpStatus.NOT_FOUND, 'Invoice not found');
      }

      if (invoice.userId !== user.userId) {
        throw new AppError(httpStatus.FORBIDDEN, 'Access denied');
      }

      if (invoice.isFullPaid || invoice.status === InvoiceStatus.PAID) {
        throw new AppError(httpStatus.BAD_REQUEST, 'Invoice already paid');
      }

      const pendingPayment = invoice.payments.find(
        (p) =>
          p.status === PaymentStatus.PROCESSING &&
          (p.providerTransactionId === providerTransactionId ||
            (paymentMethod === PaymentMethod.CASH &&
              p.method === PaymentMethod.CASH &&
              !providerTransactionId))
      );

      if (!pendingPayment) {
        throw new AppError(httpStatus.NOT_FOUND, 'Pending payment not found');
      }

      return this.applyPaymentVerification(tx, {
        invoiceId,
        providerTransactionId: providerTransactionId || null,
        paymentMethod,
        pendingPaymentId: pendingPayment.id,
      });
    });
  }

  private async applyPaymentVerification(
    tx: Prisma.TransactionClient,
    opts: {
      invoiceId: string;
      providerTransactionId: string | null;
      paymentMethod: PaymentMethod;
      pendingPaymentId?: string;
    }
  ) {
    const { invoiceId, providerTransactionId, paymentMethod, pendingPaymentId } = opts;

    const invoice = await this.invoiceService.getInvoiceWithPayments(tx, invoiceId);

    if (!invoice) {
      throw new AppError(httpStatus.NOT_FOUND, 'Invoice not found');
    }

    if (invoice.isFullPaid || invoice.status === InvoiceStatus.PAID) {
      const existing = invoice.payments.find((p) => p.status === PaymentStatus.PAID);
      return { invoice, payment: existing ?? null };
    }

    if (!pendingPaymentId) {
      throw new AppError(httpStatus.BAD_REQUEST, 'pendingPaymentId is required for verification');
    }

    const pendingPayment = await tx.payment.findUnique({ where: { id: pendingPaymentId } });

    if (!pendingPayment) {
      throw new AppError(httpStatus.NOT_FOUND, 'Pending payment not found');
    }

    if (
      pendingPayment.providerTransactionId !== providerTransactionId &&
      !(paymentMethod === PaymentMethod.CASH && !providerTransactionId)
    ) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Provider transaction ID mismatch');
    }

    await tx.payment.update({
      where: { id: pendingPayment.id },
      data: { status: PaymentStatus.PAID, amount: pendingPayment.amount, paidAt: new Date() },
    });

    const successfulPayments = filterSuccessfulPayments(invoice.payments);
    const totals = computeInvoiceTotals(
      [...successfulPayments, { amount: pendingPayment.amount, status: PaymentStatus.PAID }],
      invoice.totalAmount
    );

    const updatedInvoice = await tx.invoice.update({
      where: { id: invoice.id },
      data: { paidAmount: totals.paidAmount, status: totals.status, isFullPaid: totals.isFullPaid },
    });

    if (totals.isFullPaid && invoice.subscriptionLogId) {
      const subscriptionLog = await tx.subscriptionLog.findUnique({
        where: { id: invoice.subscriptionLogId },
      });
      if (subscriptionLog) {
        await this.activateSubscriptionInline(tx, {
          subscriptionId: subscriptionLog.subscriptionId,
          subscriptionLogId: subscriptionLog.id,
          period: subscriptionLog.period,
        });
      }
    }

    const updatedPayment = await tx.payment.findUnique({ where: { id: pendingPayment.id } });
    return { invoice: updatedInvoice, payment: updatedPayment };
  }

  private async activateSubscriptionInline(
    tx: Prisma.TransactionClient,
    opts: { subscriptionId: string; subscriptionLogId: string; period: FixedPeriod }
  ) {
    const { subscriptionId, subscriptionLogId, period } = opts;
    const now = startOfDay(new Date());
    const endDate = new Date(now);

    if (period === FixedPeriod.YEARLY) endDate.setFullYear(now.getFullYear() + 1);
    else if (period === FixedPeriod.HALF_YEARLY) endDate.setMonth(now.getMonth() + 6);
    else if (period === FixedPeriod.QUARTERLY) endDate.setMonth(now.getMonth() + 3);
    else endDate.setMonth(now.getMonth() + 1);

    await tx.subscription.update({
      where: { id: subscriptionId },
      data: { status: SubscriptionStatus.ACTIVE, startDate: now, endDate, isFreeActive: false },
    });

    await tx.subscriptionLog.update({
      where: { id: subscriptionLogId },
      data: { status: SubscriptionStatus.ACTIVE, startDate: now, endDate },
    });
  }

  async getInvoiceById(invoiceId: string, userId: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { payments: true, subscriptionLog: { include: { subscription: { include: { plan: true } } } } },
    });

    if (!invoice) throw new AppError(httpStatus.NOT_FOUND, 'Invoice not found');
    if (invoice.userId !== userId) throw new AppError(httpStatus.FORBIDDEN, 'Access denied');
    return invoice;
  }

  async takeCashPaymentForSubscription(
    subscriptionId: string,
    reviewer: IRequestUser,
    body: { amount?: number; reference?: string; note?: string }
  ) {
    return prisma.$transaction(async (tx) => {
      const subscription = await tx.subscription.findUnique({
        where: { id: subscriptionId },
        include: {
          subscriptionLogs: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: { invoice: true },
          },
        },
      });

      if (!subscription) throw new AppError(httpStatus.NOT_FOUND, 'Subscription not found');

      const latestLog = subscription.subscriptionLogs[0];
      const invoice = latestLog?.invoice;

      if (!latestLog || !invoice) {
        throw new AppError(httpStatus.BAD_REQUEST, 'No invoice found for this subscription');
      }

      const settledPayments = await tx.payment.findMany({
        where: { invoiceId: invoice.id, status: PaymentStatus.PAID },
        select: { amount: true },
      });
      const settledTotal = settledPayments.reduce(
        (sum, payment) => sum.add(payment.amount),
        new Prisma.Decimal(0)
      );

      if (invoice.status === InvoiceStatus.PAID || settledTotal.gte(invoice.totalAmount)) {
        throw new AppError(httpStatus.BAD_REQUEST, 'Invoice already paid');
      }

      const outstanding = invoice.totalAmount.minus(settledTotal).toNumber();
      const paidAmount = new Prisma.Decimal(body.amount ?? outstanding);

      if (paidAmount.lte(0)) {
        throw new AppError(httpStatus.BAD_REQUEST, 'Payment amount must be greater than zero');
      }

      const paymentNumber = await nextDocumentNumber(tx, 'PAY');
      const cashPayment = await tx.payment.create({
        data: {
          paymentNumber,
          invoiceId: invoice.id,
          amount: paidAmount,
          type: PaymentType.FULL,
          method: PaymentMethod.CASH,
          status: PaymentStatus.PAID,
          paidAt: new Date(),
          receivedById: reviewer.userId,
          reference: body.reference?.trim() || null,
          note: body.note?.trim() || null,
          idempotencyKey: `cash_${invoice.id}_${Date.now()}`,
        },
      });

      const totals = computeInvoiceTotals(
        [...settledPayments, { amount: paidAmount, status: PaymentStatus.PAID }],
        invoice.totalAmount
      );

      const updatedInvoice = await tx.invoice.update({
        where: { id: invoice.id },
        data: { paidAmount: totals.paidAmount, status: totals.status, isFullPaid: totals.isFullPaid },
      });

      if (totals.isFullPaid) {
        await this.activateSubscriptionInline(tx, {
          subscriptionId: subscription.id,
          subscriptionLogId: latestLog.id,
          period: latestLog.period,
        });
      }

      return { invoice: updatedInvoice, payment: cashPayment, recordedBy: reviewer.userId };
    });
  }

  async confirmOnlinePaymentForSubscription(subscriptionId: string, reviewer: IRequestUser) {
    return prisma.$transaction(async (tx) => {
      const subscription = await tx.subscription.findUnique({
        where: { id: subscriptionId },
        include: {
          subscriptionLogs: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: { invoice: { include: { payments: { orderBy: { createdAt: 'desc' } } } } },
          },
        },
      });

      if (!subscription) throw new AppError(httpStatus.NOT_FOUND, 'Subscription not found');

      const latestLog = subscription.subscriptionLogs[0];
      const invoice = latestLog?.invoice;
      const latestPayment = invoice?.payments[0];

      if (!latestLog || !invoice || !latestPayment) {
        throw new AppError(httpStatus.BAD_REQUEST, 'No online payment found for this subscription');
      }

      if (invoice.status !== InvoiceStatus.DRAFT) {
        throw new AppError(httpStatus.BAD_REQUEST, 'Only draft invoices can be confirmed');
      }

      if (
        latestPayment.status !== PaymentStatus.PROCESSING ||
        latestPayment.method === PaymentMethod.CASH ||
        !latestPayment.providerTransactionId
      ) {
        throw new AppError(httpStatus.BAD_REQUEST, 'The latest payment is not a verifiable online payment');
      }

      const paymentUpdate = await tx.payment.updateMany({
        where: { id: latestPayment.id, status: PaymentStatus.PROCESSING },
        data: { status: PaymentStatus.PAID, amount: latestPayment.amount, paidAt: new Date(), receivedById: reviewer.userId },
      });

      if (paymentUpdate.count !== 1) {
        throw new AppError(httpStatus.CONFLICT, 'The payment has already been processed');
      }

      const paidPayments = await tx.payment.findMany({
        where: { invoiceId: invoice.id, status: PaymentStatus.PAID },
        select: { amount: true },
      });
      const totalPaid = paidPayments.reduce((sum, payment) => sum.add(payment.amount), new Prisma.Decimal(0));

      if (totalPaid.lt(invoice.totalAmount)) {
        throw new AppError(httpStatus.BAD_REQUEST, 'The confirmed payments do not cover the full invoice amount');
      }

      const updatedInvoice = await tx.invoice.update({
        where: { id: invoice.id },
        data: { paidAmount: totalPaid, status: InvoiceStatus.PAID, isFullPaid: true },
      });

      await this.activateSubscriptionInline(tx, {
        subscriptionId: subscription.id,
        subscriptionLogId: latestLog.id,
        period: latestLog.period,
      });

      const [payment, updatedSubscription] = await Promise.all([
        tx.payment.findUniqueOrThrow({ where: { id: latestPayment.id } }),
        tx.subscription.findUniqueOrThrow({ where: { id: subscription.id } }),
      ]);

      return { invoice: updatedInvoice, payment, subscription: updatedSubscription };
    });
  }
}