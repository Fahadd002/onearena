import { Injectable } from '@nestjs/common';
import status from 'http-status';
import { UserRole, PaymentStatus, RefundStatus } from '../../../generated/prisma/enums';
import AppError from '../../../config/errorHelpers/AppError';
import prisma from '../../../shared/prisma';
import { IRequestUser } from '../../interfaces/requestUser.interface';

@Injectable()
export class RefundService {
  async list(user: IRequestUser, bookingId?: string) {
    const where: Record<string, unknown> = {};

    if (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN) {
      if (bookingId) where.bookingId = bookingId;
    } else if (user.role === UserRole.USER) {
      where.booking = { userId: user.userId };
      if (bookingId) where.bookingId = bookingId;
    } else {
      throw new AppError(status.FORBIDDEN, 'Not allowed');
    }

    return prisma.refund.findMany({
      where,
      include: {
        booking: {
          select: {
            id: true,
            status: true,
            slot: {
              include: {
                turf: {
                  select: {
                    name: true,
                    ownerId: true,
                  },
                },
              },
            },
          },
        },
        payment: {
          select: {
            id: true,
            amount: true,
            method: true,
            status: true,
            paidAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async request(user: IRequestUser, bookingId: string, paymentId: string, reason?: string) {
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, userId: user.userId },
      include: {
        invoice: {
          include: {
            payments: {
              where: { id: paymentId },
            },
          },
        },
        slot: {
          include: {
            turf: {
              select: {
                id: true,
                ownerId: true,
              },
            },
          },
        },
      },
    });

    if (!booking) {
      throw new AppError(status.NOT_FOUND, 'Booking not found');
    }

    if (!booking.invoice) {
      throw new AppError(status.BAD_REQUEST, 'No invoice found for this booking');
    }

    const payment = booking.invoice.payments[0];
    if (!payment) {
      throw new AppError(status.NOT_FOUND, 'Payment not found');
    }

    if (payment.status !== PaymentStatus.SUCCEEDED) {
      throw new AppError(status.BAD_REQUEST, 'Only successful payments can be refunded');
    }

    const existing = await prisma.refund.findFirst({
      where: {
        paymentId,
        status: { in: [RefundStatus.REQUESTED, RefundStatus.APPROVED] },
      },
    });

    if (existing) {
      throw new AppError(status.CONFLICT, 'Refund already requested for this payment');
    }

    const data = await prisma.refund.create({
      data: {
        bookingId,
        paymentId,
        amount: Number(payment.amount),
        reason,
        requestedBy: user.userId,
      },
    });

    return data;
  }

  async approve(user: IRequestUser, refundId: string) {
    const refund = await prisma.refund.findFirst({
      where: { id: refundId, status: RefundStatus.REQUESTED },
      include: {
        payment: true,
        booking: {
          include: {
            slot: {
              include: {
                turf: {
                  select: {
                    id: true,
                    ownerId: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!refund) {
      throw new AppError(status.NOT_FOUND, 'Refund request not found');
    }

    if (
      user.role === UserRole.ADMIN &&
      refund.booking.slot?.turf?.ownerId !== user.userId
    ) {
      throw new AppError(status.FORBIDDEN, 'Not allowed');
    }

    const existingRefunds = await prisma.refund.findMany({
      where: {
        paymentId: refund.paymentId,
        status: RefundStatus.APPROVED,
      },
    });

    const totalApprovedRefund = existingRefunds.reduce((sum, r) => sum + Number(r.amount), 0);
    if (totalApprovedRefund + Number(refund.amount) > Number(refund.payment.amount)) {
      throw new AppError(status.BAD_REQUEST, 'Total refund amount exceeds payment amount');
    }

    return prisma.refund.update({
      where: { id: refundId },
      data: {
        status: RefundStatus.APPROVED,
        processedBy: user.userId,
        processedAt: new Date(),
      },
    });
  }

  async reject(user: IRequestUser, refundId: string) {
    const refund = await prisma.refund.findFirst({
      where: { id: refundId, status: RefundStatus.REQUESTED },
      include: {
        booking: {
          include: {
            slot: {
              include: {
                turf: {
                  select: {
                    id: true,
                    ownerId: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!refund) {
      throw new AppError(status.NOT_FOUND, 'Refund request not found');
    }

    if (
      user.role === UserRole.ADMIN &&
      refund.booking.slot?.turf?.ownerId !== user.userId
    ) {
      throw new AppError(status.FORBIDDEN, 'Not allowed');
    }

    return prisma.refund.update({
      where: { id: refundId },
      data: {
        status: RefundStatus.REJECTED,
        processedBy: user.userId,
        processedAt: new Date(),
      },
    });
  }

  async markProcessed(user: IRequestUser, refundId: string) {
    const refund = await prisma.refund.findFirst({
      where: { id: refundId, status: RefundStatus.APPROVED },
      include: {
        payment: true,
        booking: {
          include: {
            slot: {
              include: {
                turf: {
                  select: {
                    id: true,
                    ownerId: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!refund) {
      throw new AppError(status.NOT_FOUND, 'Refund not found or not approved');
    }

    if (user.role !== UserRole.SUPER_ADMIN && user.role !== UserRole.ADMIN) {
      throw new AppError(status.FORBIDDEN, 'Not allowed');
    }

    if (
      user.role === UserRole.ADMIN &&
      refund.booking.slot?.turf?.ownerId !== user.userId
    ) {
      throw new AppError(status.FORBIDDEN, 'Not allowed');
    }

    const totalApprovedRefund = await prisma.refund.aggregate({
      where: {
        paymentId: refund.paymentId,
        status: RefundStatus.PROCESSED,
      },
      _sum: { amount: true },
    });

    const totalProcessedRefund = Number(totalApprovedRefund._sum.amount ?? 0);
    if (totalProcessedRefund + Number(refund.amount) > Number(refund.payment.amount)) {
      throw new AppError(status.BAD_REQUEST, 'Total refunded amount exceeds payment amount');
    }

    return prisma.refund.update({
      where: { id: refundId },
      data: {
        status: RefundStatus.PROCESSED,
        processedBy: user.userId,
        processedAt: new Date(),
      },
    });
  }
}
