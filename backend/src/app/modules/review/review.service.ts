import { Injectable } from '@nestjs/common';
import status from 'http-status';

import {
  UserRole,
  BookingStatus,
  SlotSatus,
} from '../../../generated/prisma/enums';

import AppError from '../../../config/errorHelpers/AppError';
import prisma from '../../../shared/prisma';
import { IRequestUser } from '../../interfaces/requestUser.interface';

@Injectable()
export class ReviewService {
  private isBookingReviewable(booking: {
    status: string;
    bookingSlots: Array<{ slot: { slotDate: Date; slotStatus: string } }>;
  }): boolean {
    // A booking is reviewable if it's CONFIRMED and all its slots are PLAYED
    // or if the slot dates have passed and booking is CONFIRMED
    if (booking.status !== BookingStatus.CONFIRMED) {
      return false;
    }

    // Check if all slots are PLAYED
    const allPlayed = booking.bookingSlots.every(
      (bs) => bs.slot?.slotStatus === SlotSatus.PLAYED
    );
    if (allPlayed) {
      return true;
    }

    // Check if all slot dates have passed (in turf timezone, but we check UTC as fallback)
    const now = new Date();
    const allPast = booking.bookingSlots.every(
      (bs) => bs.slot?.slotDate && new Date(bs.slot.slotDate) < now
    );

    return allPast;
  }

  async create(
    user: IRequestUser,
    bookingId: string,
    payload: {
      rating: number;
      comment?: string;
    },
  ) {
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
      },
      include: {
        bookingSlots: {
          include: {
            slot: {
              include: {
                turf: {
                  select: {
                    id: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!booking) {
      throw new AppError(status.NOT_FOUND, 'Booking not found');
    }

    if (user.role !== UserRole.USER || booking.userId !== user.userId) {
      throw new AppError(status.FORBIDDEN, 'Not allowed to review this booking');
    }

    if (!this.isBookingReviewable(booking)) {
      throw new AppError(status.BAD_REQUEST, 'Booking is not eligible for review yet');
    }

    const existing = await prisma.review.findFirst({
      where: {
        bookingId,
      },
    });

    if (existing) {
      throw new AppError(status.CONFLICT, 'Review already exists for this booking');
    }

    const turfId = booking.bookingSlots[0]?.slot?.turf?.id;
    if (!turfId) {
      throw new AppError(status.BAD_REQUEST, 'Turf not found for this booking');
    }

    const data = await prisma.review.create({
      data: {
        bookingId,
        userId: user.userId,
        turfId,
        rating: payload.rating,
        comment: payload.comment,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        turf: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return data;
  }

  async listByTurf(turfId: string) {
    return prisma.review.findMany({
      where: {
        turfId,
        isHidden: false,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        replies: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async list(user?: IRequestUser, page = 1, limit = 10) {
    let where: Record<string, unknown> = {};

    if (user?.role === UserRole.ADMIN) {
      where = { turf: { ownerId: user.userId } };
    } else if (user?.role === UserRole.MANAGER) {
      const assignments = await prisma.turfManager.findMany({
        where: { managerId: user.userId },
        select: { turfId: true },
      });
      where = { turfId: { in: assignments.map((a) => a.turfId) } };
    } else if (user?.role === UserRole.SUPER_ADMIN) {
      where = {};
    } else if (user?.role === UserRole.USER) {
      where = { userId: user.userId };
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
          turf: {
            select: {
              id: true,
              name: true,
            },
          },
          replies: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.review.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findByBooking(bookingId: string) {
    return prisma.review.findFirst({
      where: {
        bookingId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        turf: {
          select: {
            id: true,
            name: true,
          },
        },
        replies: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });
  }

  async checkReviewEligibility(bookingId: string) {
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId },
      include: {
        bookingSlots: {
          include: { slot: { select: { slotDate: true, slotStatus: true, turfId: true } } },
        },
      },
    });

    if (!booking) {
      return { eligible: false, reason: 'Booking not found' };
    }

    const existing = await prisma.review.findFirst({ where: { bookingId } });
    if (existing) {
      return { eligible: false, reason: 'Review already submitted', existingReview: existing };
    }

    const eligible = this.isBookingReviewable(booking);
    if (!eligible) {
      return { eligible: false, reason: 'Booking not yet completed' };
    }

    return { eligible: true, turfId: booking.bookingSlots[0]?.slot?.turfId };
  }

  async hide(reviewId: string) {
    const review = await prisma.review.findFirst({ where: { id: reviewId } });
    if (!review) throw new AppError(status.NOT_FOUND, 'Review not found');

    return prisma.review.update({
      where: { id: reviewId },
      data: { isHidden: true },
    });
  }

  async unhide(reviewId: string) {
    const review = await prisma.review.findFirst({ where: { id: reviewId } });
    if (!review) throw new AppError(status.NOT_FOUND, 'Review not found');

    return prisma.review.update({
      where: { id: reviewId },
      data: { isHidden: false },
    });
  }

  async reply(actor: IRequestUser, reviewId: string, comment: string) {
    const review = await prisma.review.findFirst({ where: { id: reviewId } });
    if (!review) throw new AppError(status.NOT_FOUND, 'Review not found');

    if (actor.role !== UserRole.ADMIN && actor.role !== UserRole.SUPER_ADMIN) {
      throw new AppError(status.FORBIDDEN, 'Only admin or super admin can reply to reviews');
    }

    return prisma.reviewReply.create({
      data: {
        reviewId,
        userId: actor.userId,
        comment,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async remove(reviewId: string) {
    const review = await prisma.review.findFirst({ where: { id: reviewId } });
    if (!review) throw new AppError(status.NOT_FOUND, 'Review not found');

    return prisma.review.delete({ where: { id: reviewId } });
  }
}
