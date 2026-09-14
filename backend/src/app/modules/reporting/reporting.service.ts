import { Injectable } from '@nestjs/common';
import {
  PaymentStatus,
  UserRole,
} from '../../../generated/prisma/enums';
import prisma from '../../../shared/prisma';
import { IRequestUser } from '../../interfaces/requestUser.interface';

@Injectable()
export class ReportingService {
  async ownerOverview(user: IRequestUser) {
    const [turfs, bookings, revenue] = await Promise.all([
      prisma.turf.count({
        where: { ownerId: user.userId },
      }),
      prisma.booking.count({
        where: {
          slot: { turf: { ownerId: user.userId } },
        },
      }),
      prisma.bookingInvoice.aggregate({
        where: {
          booking: { slot: { turf: { ownerId: user.userId } } },
          status: {
            in: [PaymentStatus.SUCCEEDED, PaymentStatus.PARTIALLY_PAID, PaymentStatus.PAID],
          },
        },
        _sum: {
          totalAmount: true,
        },
      }),
    ]);

    const grossRevenue = revenue._sum?.totalAmount?.toNumber() ?? 0;
    const netRevenue = grossRevenue;

    return {
      turfs,
      bookings,
      grossRevenue,
      netRevenue,
    };
  }

  async platformOverview() {
    const [
      users,
      owners,
      managers,
      turfs,
      bookings,
      pendingOwners,
      revenue,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: UserRole.ADMIN } }),
      prisma.user.count({ where: { role: UserRole.MANAGER } }),
      prisma.turf.count(),
      prisma.booking.count(),
      prisma.ownerProfile.count({
        where: {
          verificationStatus: 'PENDING',
        },
      }),
      prisma.bookingInvoice.aggregate({
        where: { payments: { some: { status: PaymentStatus.PENDING } } },
        _sum: {
          totalAmount: true,
        },
      }),
    ]);

    const pendingPayments = await prisma.bookingInvoice.count({
      where: { payments: { some: { status: PaymentStatus.PENDING } } },
    });

    const totalRevenue = revenue._sum?.totalAmount?.toNumber() ?? 0;


    return {
      users,
      owners,
      managers,
      turfs,
      bookings,
      pendingOwners,
      totalRevenue,
      pendingPayments,
    };
  }

  async userOverview(user: IRequestUser) {
    const [upcoming, recent] = await Promise.all([
      prisma.booking.count({
        where: {
          userId: user.userId,
          slot: { slotDate: { gte: new Date() } },
          invoice: {
            status: {
              in: [PaymentStatus.PARTIALLY_PAID, PaymentStatus.PAID],
            },
          },
        },
      }),
      prisma.booking.findMany({
        where: { userId: user.userId },
        include: {
          slot: { include: { turf: { select: { name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    const ownerProfile = await prisma.ownerProfile.findUnique({
      where: { userId: user.userId },
      select: {
        verificationStatus: true,
      },
    });

    return {
      upcomingBookings: upcoming,
      recentBookings: recent,
      ownerOnboarding: ownerProfile,
    };
  }

  async managerOverview(user: IRequestUser) {
    const assignments = await prisma.turfManager.findMany({
      where: { managerId: user.userId },
      include: {
        permissions: true,
        turf: {
          select: { id: true, name: true },
        },
      },
    });

    const bookings = await prisma.booking.count({
      where: {
        slot: {
          turf: {
            managers: {
              some: { managerId: user.userId },
            },
          },
        },
        invoice: {
          status: {
            in: [PaymentStatus.PARTIALLY_PAID, PaymentStatus.PAID],
          },
        },
      },
    });

    return {
      assignedTurfs: assignments.map((assignment) => ({
        ...assignment.turf,
        permissions: assignment.permissions.map((item) => item.permission),
      })),
      activeBookings: bookings,
    };
  }
}
