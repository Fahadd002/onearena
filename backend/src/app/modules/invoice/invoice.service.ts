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
    
    const invoice = await prisma.invoice.findFirst({ 
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

  async list(
    user: IRequestUser,
    page = 1,
    limit = 10,
    filters?: {
      status?: string;
      search?: string;
      sortBy?: string;
      sortOrder?: string;
    }
  ) {
    const allowedSortFields = ['invoiceDate', 'totalAmount', 'paidAmount', 'createdAt'] as const;
    const sortBy =
      filters?.sortBy && allowedSortFields.includes(filters.sortBy as any)
        ? filters.sortBy
        : 'invoiceDate';
    const sortOrder = filters?.sortOrder === 'asc' ? 'asc' : 'desc';

    const where: Record<string, unknown> = {};
    if (user.role === UserRole.ADMIN) {
      where.booking = { slot: { turf: { ownerId: user.userId } } };
    } else if (user.role === UserRole.MANAGER) {
      where.booking = { slot: { turf: { managers: { some: { managerId: user.userId } } } } };
    } else if (user.role === UserRole.USER) {
      where.booking = { userId: user.userId };
    }

    // Status filter
    if (filters?.status) {
      where.status = filters.status as PaymentStatus;
    }

    // Search filter - search by invoice number, booking number, turf name, user name/email
    if (filters?.search) {
      const searchTerm = filters.search.trim();
      where.OR = [
        { invoiceNumber: { contains: searchTerm, mode: 'insensitive' } },
        { booking: { bookingNumber: { contains: searchTerm, mode: 'insensitive' } } },
        { booking: { slot: { turf: { name: { contains: searchTerm, mode: 'insensitive' } } } } },
        { booking: { user: { name: { contains: searchTerm, mode: 'insensitive' } } } },
        { booking: { user: { email: { contains: searchTerm, mode: 'insensitive' } } } },
      ];
    }

    const skip = (page - 1) * limit;
    const [data, total] = await prisma.$transaction([
      prisma.invoice.findMany({
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
                    },
                  },
                },
              },
            },
          },
          payments: true,
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.invoice.count({ where }),
    ]);

    return {
      data: data.map(invoice => {
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
      }),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}
