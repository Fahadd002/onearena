import { Injectable } from '@nestjs/common';
import httpStatus from 'http-status';
import {
  FixedPeriod,
  SubscriptionAction,
  SubscriptionStatus,
} from '../../../generated/prisma/enums';
import { Prisma } from '../../../generated/prisma/client';
import AppError from '../../../config/errorHelpers/AppError';
import prisma from '../../../shared/prisma';
import { IRequestUser } from '../../interfaces/requestUser.interface';

@Injectable()
export class SubscriptionService {
  constructor() {}
  // Get all active subscription plans ordered by tier level
  async getPlans() {
    return prisma.subscriptionPlan.findMany({
      where: { active: true },
      include: {
        prices: {
          orderBy: { period: 'asc' },
        },
      },
      orderBy: { tierLevel: 'asc' },
    });
  }

  // Get single plan by ID (Alias/Utility)
  async getPlanById(planId: string) {
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId },
      include: { prices: true },
    });

    if (!plan) {
      throw new AppError(httpStatus.NOT_FOUND, 'Subscription plan not found');
    }

    return plan;
  }

  // Legacy/Standard single plan retrieval
  async getPlan(planId: string) {
    return this.getPlanById(planId);
  }

  async getAdminPlans(options: {
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }) {
    const page = options.page && options.page > 0 ? options.page : 1;
    const limit = options.limit && options.limit > 0 ? Math.min(options.limit, 100) : 10;
    const where: Prisma.SubscriptionPlanWhereInput = options.search
      ? { OR: [{ name: { contains: options.search, mode: 'insensitive' } }] }
      : {};

    let orderBy: Prisma.SubscriptionPlanOrderByWithRelationInput = {
      tierLevel: options.sortOrder === 'desc' ? 'desc' : 'asc',
    };
    if (options.sortBy === 'maxTurfs') {
      orderBy = { maxTurfs: options.sortOrder === 'desc' ? 'desc' : 'asc' };
    } else if (options.sortBy === 'name') {
      orderBy = { name: options.sortOrder === 'desc' ? 'desc' : 'asc' };
    }

    const [data, total] = await prisma.$transaction([
      prisma.subscriptionPlan.findMany({
        where,
        include: { prices: { orderBy: { period: 'asc' } } },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.subscriptionPlan.count({ where }),
    ]);

    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  // Get current subscription for owner
  async getCurrentSubscription(user: IRequestUser) {
    const subscription = await prisma.subscription.findUnique({
      where: { userId: user.userId },
      include: {
        plan: { include: { prices: true } },
        subscriptionLogs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    return subscription;
  }

  // Explicit handler for Subscribe / Upgrade operations
  async subscribeOrUpgrade(
    user: IRequestUser,
    planId: string,
    billingPeriod: FixedPeriod = FixedPeriod.MONTHLY
  ) {
    const ownerProfile = await prisma.ownerProfile.findUnique({
      where: { userId: user.userId },
      select: { verificationStatus: true },
    });

    const targetPlan = await this.getPlanById(planId);

    const existingSub = await prisma.subscription.findUnique({
      where: { userId: user.userId },
      include: { plan: true },
    });

    let action: SubscriptionAction = SubscriptionAction.SUBSCRIBED;

    // Downgrade prevention ONLY applies if owner profile is APPROVED
    if (ownerProfile?.verificationStatus === 'APPROVED') {
      if (existingSub && existingSub.status === SubscriptionStatus.ACTIVE) {
        if (targetPlan.tierLevel < existingSub.plan.tierLevel) {
          throw new AppError(
            httpStatus.BAD_REQUEST,
            "Downgrading to a lower tier plan is not allowed"
          );
        }
        if (targetPlan.tierLevel === existingSub.plan.tierLevel) {
          action = SubscriptionAction.RENEWED;
        } else {
          action = SubscriptionAction.UPGRADED;
        }
      }
    }

    const now = new Date();
    const trialEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Compute Subscription Duration based on period
    const endDate = new Date(now);
    if (billingPeriod === FixedPeriod.YEARLY) {
      endDate.setFullYear(now.getFullYear() + 1);
    } else if (billingPeriod === FixedPeriod.HALF_YEARLY) {
      endDate.setMonth(now.getMonth() + 6);
    } else if (billingPeriod === FixedPeriod.QUARTERLY) {
      endDate.setMonth(now.getMonth() + 3);
    } else {
      endDate.setMonth(now.getMonth() + 1);
    }

    return prisma.$transaction(async (tx) => {
      const subscription = existingSub
        ? await tx.subscription.update({
          where: { userId: user.userId },
          data: {
            planId,
            status: SubscriptionStatus.ACTIVE,
            startDate: now,
            endDate,
            trialStart: existingSub.trialStart ?? now,
            trialEnd: existingSub.trialEnd ?? trialEnd,
            isTrialUsed: existingSub.isTrialUsed,
          },
          include: { plan: { include: { prices: true } } },
        })
        : await tx.subscription.create({
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

      // Write Audit Log
      await tx.subscriptionLog.create({
        data: {
          subscriptionId: subscription.id,
          action: existingSub ? action : SubscriptionAction.TRIAL_STARTED,
          status: subscription.status,
          startDate: subscription.startDate,
          endDate: subscription.endDate,
        },
      });

      return subscription;
    });
  }

  // Cron job status sync
  async checkAndUpdateStatus(userId: string) {
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) return null;

    const now = new Date();
    const daysUntilExpiry = Math.ceil(
      (subscription.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    let newStatus = subscription.status;

    if (daysUntilExpiry <= 0) {
      newStatus = SubscriptionStatus.EXPIRED;
    } else if (daysUntilExpiry <= 7 && subscription.status !== SubscriptionStatus.EXPIRED) {
      newStatus = SubscriptionStatus.EXPIRING;
    }

    if (newStatus !== subscription.status) {
      return prisma.$transaction(async (tx) => {
        const updated = await tx.subscription.update({
          where: { userId },
          data: { status: newStatus },
        });

        if (newStatus === SubscriptionStatus.EXPIRED) {
          await tx.subscriptionLog.create({
            data: {
              subscriptionId: updated.id,
              action: SubscriptionAction.EXPIRED,
              status: newStatus,
              startDate: updated.startDate,
              endDate: updated.endDate,
            },
          });
        }

        return updated;
      });
    }

    return subscription;
  }

  // Get turf limit for owner
  async getTurfLimit(userId: string): Promise<number> {
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
      include: { plan: true },
    });

    if (!subscription) return 0;

    if (
      subscription.status === SubscriptionStatus.EXPIRED ||
      subscription.status === SubscriptionStatus.CANCELLED
    ) {
      return 0;
    }

    return subscription.plan.maxTurfs;
  }

  // Validate turf creation limit
  async validateTurfCreation(userId: string) {
    const limit = await this.getTurfLimit(userId);
    const currentTurfs = await prisma.turf.count({
      where: { ownerId: userId },
    });

    if (currentTurfs >= limit) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        `Turf limit reached. Your subscription allows ${limit} turf(s). Please upgrade your subscription.`
      );
    }
  }

  async cancel(user: IRequestUser) {
    const subscription = await this.getCurrentSubscription(user);

    if (!subscription) {
      throw new AppError(httpStatus.NOT_FOUND, 'No subscription found');
    }

    return prisma.$transaction(async (tx) => {
      const updatedSub = await tx.subscription.update({
        where: { userId: user.userId },
        data: {
          status: SubscriptionStatus.CANCELLED,
        },
        include: { plan: { include: { prices: true } } },
      });

      await tx.subscriptionLog.create({
        data: {
          subscriptionId: updatedSub.id,
          action: SubscriptionAction.CANCELLED,
          status: SubscriptionStatus.CANCELLED,
          startDate: updatedSub.startDate,
          endDate: updatedSub.endDate,
        },
      });

      return updatedSub;
    });
  }

  async createPlan(data: {
    name: string;
    tierLevel: number;
    maxTurfs: number;
    features: string[];
    prices: Array<{ period: FixedPeriod; price: number }>;
  }) {
    const existingLevel = await prisma.subscriptionPlan.findUnique({
      where: { tierLevel: data.tierLevel },
    });

    if (existingLevel) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Plan tier level ${data.tierLevel} is already assigned to "${existingLevel.name}". Levels must be unique.`
      );
    }

    return prisma.subscriptionPlan.create({
      data: {
        name: data.name,
        tierLevel: data.tierLevel,
        maxTurfs: data.maxTurfs,
        features: data.features || [],
        prices: {
          create: data.prices.map((p) => ({
            period: p.period,
            price: p.price.toString(),
          })),
        },
      },
      include: { prices: true },
    });
  }

  async updatePlan(
    planId: string,
    data: {
      name?: string;
      tierLevel?: number;
      maxTurfs?: number;
      features?: string[];
      active?: boolean;
      prices?: Array<{ period: FixedPeriod; price: number }>;
    }
  ) {
    const existing = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!existing) throw new AppError(httpStatus.NOT_FOUND, 'Subscription plan not found');

    if (data.tierLevel) {
      const existingLevel = await prisma.subscriptionPlan.findFirst({
        where: { tierLevel: data.tierLevel, NOT: { id: planId } },
      });
      if (existingLevel) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          `Plan tier level ${data.tierLevel} is already used by another plan.`
        );
      }
    }

    return prisma.$transaction(async (tx) => {
      const plan = await tx.subscriptionPlan.update({
        where: { id: planId },
        data: {
          name: data.name,
          tierLevel: data.tierLevel,
          maxTurfs: data.maxTurfs,
          features: data.features,
          active: data.active,
        },
      });

      if (data.prices) {
        for (const price of data.prices) {
          await tx.subscriptionPrice.upsert({
            where: { planId_period: { planId, period: price.period } },
            create: { planId, period: price.period, price: price.price.toString() },
            update: { price: price.price.toString() },
          });
        }
      }

      return tx.subscriptionPlan.findUnique({ where: { id: plan.id }, include: { prices: true } });
    });
  }

  async deletePlan(planId: string) {
    const existing = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!existing) throw new AppError(httpStatus.NOT_FOUND, 'Subscription plan not found');
    return prisma.subscriptionPlan.delete({ where: { id: planId } });
  }

  // Get Subscription Audit History for Owner
  async getSubscriptionHistory(user: IRequestUser) {
    const subscription = await prisma.subscription.findUnique({
      where: { userId: user.userId },
    });

    if (!subscription) {
      return [];
    }

    return prisma.subscriptionLog.findMany({
      where: { subscriptionId: subscription.id },
      include: { invoice: true },
      orderBy: { createdAt: 'desc' },
    });
  }


  async getAdminSubscriptions(options: { status?: SubscriptionStatus; search?: string }) {
    return prisma.subscription.findMany({
      where: {
        ...(options.status ? { status: options.status } : {}),
        ...(options.search
          ? {
            user: {
              OR: [
                { name: { contains: options.search, mode: 'insensitive' } },
                { email: { contains: options.search, mode: 'insensitive' } },
              ],
            },
          }
          : {}),
      },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        plan: { include: { prices: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async updateAdminSubscription(
    subscriptionId: string,
    data: { status?: SubscriptionStatus; endDate?: string; planId?: string }
  ) {
    const existing = await prisma.subscription.findUnique({ where: { id: subscriptionId } });
    if (!existing) throw new AppError(httpStatus.NOT_FOUND, 'Subscription not found');

    if (data.planId) {
      await this.getPlanById(data.planId);
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: data.status,
          endDate: data.endDate ? new Date(data.endDate) : undefined,
          planId: data.planId,
        },
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
          plan: { include: { prices: true } },
        },
      });

      // Write Admin Audit Log Entry
      await tx.subscriptionLog.create({
        data: {
          subscriptionId: updated.id,
          action: SubscriptionAction.RENEWED,
          status: updated.status,
          startDate: updated.startDate,
          endDate: updated.endDate,
        },
      });

      return updated;
    });
  }
}