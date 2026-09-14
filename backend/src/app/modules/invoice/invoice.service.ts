import { Injectable } from '@nestjs/common';
import httpStatus from 'http-status';
import { UserRole, PaymentStatus } from '../../../generated/prisma/enums';
import AppError from '../../../config/errorHelpers/AppError';
import prisma from '../../../shared/prisma';
import { IRequestUser } from '../../interfaces/requestUser.interface';

@Injectable()
export class InvoiceService {
  async byBooking(user: IRequestUser, bookingId: string) {
    const where: Record<string, unknown> = { bookingId };
    
    // Authorization checks
    if (user.role === UserRole.ADMIN) {
      where.booking = { slot: { turf: { ownerId: user.userId } } };
    } else if (user.role === UserRole.MANAGER) {
      where.booking = { slot: { turf: { managers: { some: { managerId: user.userId } } } } };
    } else if (user.role === UserRole.USER) {
      where.booking = { userId: user.userId };
    }
    
    const invoice = await prisma.bookingInvoice.findFirst({ 
      where, 
      include: { 
        booking: { 
          include: { 
            slot: { 
              include: { 
                turf: { 
                  select: { 
                    id: true, 
                    name: true, 
                    address: true 
                  } 
                } 
              } 
            }
          } 
        },
        payments: true
      } 
    });
    
    if (!invoice) throw new AppError(httpStatus.NOT_FOUND, 'Invoice not found');

    const successfulPayments = (invoice.payments ?? []).filter((p: any) => p.status === PaymentStatus.SUCCEEDED);
    const paidAmount = successfulPayments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
    const totalAmount = Number(invoice.totalAmount);
    const remainingAmount = totalAmount - paidAmount;

    let invoiceStatus: PaymentStatus = PaymentStatus.UNPAID;
    if (paidAmount > 0 && paidAmount < totalAmount) {
      invoiceStatus = PaymentStatus.PARTIALLY_PAID;
    } else if (paidAmount >= totalAmount) {
      invoiceStatus = PaymentStatus.PAID;
    }

    return {
      ...invoice,
      paidAmount,
      remainingAmount,
      status: invoiceStatus,
      payments: successfulPayments,
    };
  }

  async list(user: IRequestUser) {
    const where: Record<string, unknown> = {};
    if (user.role === UserRole.ADMIN) {
      where.booking = { slot: { turf: { ownerId: user.userId } } };
    } else if (user.role === UserRole.MANAGER) {
      where.booking = { slot: { turf: { managers: { some: { managerId: user.userId } } } } };
    } else if (user.role === UserRole.USER) {
      where.booking = { userId: user.userId };
    }
    
    const invoices = await prisma.bookingInvoice.findMany({ 
      where, 
      include: { 
        booking: { 
          include: { 
            slot: { 
              include: { 
                turf: { 
                  select: { 
                    id: true, 
                    name: true 
                  } 
                } 
              } 
            }
          } 
        },
        payments: true
      }, 
      orderBy: { invoiceDate: 'desc' } 
    });

    return invoices.map(invoice => {
      const successfulPayments = (invoice.payments ?? []).filter((p: any) => p.status === PaymentStatus.SUCCEEDED);
      const paidAmount = successfulPayments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
      const totalAmount = Number(invoice.totalAmount);
      const remainingAmount = totalAmount - paidAmount;

      let invoiceStatus: PaymentStatus = PaymentStatus.UNPAID;
      if (paidAmount > 0 && paidAmount < totalAmount) {
        invoiceStatus = PaymentStatus.PARTIALLY_PAID;
      } else if (paidAmount >= totalAmount) {
        invoiceStatus = PaymentStatus.PAID;
      }

      return {
        ...invoice,
        paidAmount,
        remainingAmount,
        status: invoiceStatus,
      };
    });
  }
}
