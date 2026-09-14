import { Injectable } from '@nestjs/common';
import httpStatus from 'http-status';
import { FixedPeriod, SubscriptionStatus } from '../../../generated/prisma/enums';
import { Prisma } from '../../../generated/prisma/client';
import AppError from '../../../config/errorHelpers/AppError';
import prisma from '../../../shared/prisma';
import { IRequestUser } from '../../interfaces/requestUser.interface';

@Injectable()
export class SubscriptionService {
  // Get all active subscription plans
  async getPlans() {
    return prisma.subscriptionPlan.findMany({
      where: { active: true },
      include: {
        prices: {
          orderBy: { period: 'asc' },
        },
      },
      orderBy: { maxTurfs: 'asc' },
    });
  }

  async getAdminPlans(options: { search?: string; sortBy?: string; sortOrder?: 'asc' | 'desc'; page?: number; limit?: number }) {
    const page = options.page && options.page > 0 ? options.page : 1;
    const limit = options.limit && options.limit > 0 ? Math.min(options.limit, 100) : 10;
    const where: Prisma.SubscriptionPlanWhereInput = options.search
      ? { OR: [{ name: { contains: options.search, mode: 'insensitive' } }] }
      : {};
    const orderBy: Prisma.SubscriptionPlanOrderByWithRelationInput = options.sortBy === 'maxTurfs'
      ? { maxTurfs: options.sortOrder === 'desc' ? 'desc' : 'asc' }
      : { name: options.sortOrder === 'desc' ? 'desc' : 'asc' };
    const [data, total] = await prisma.$transaction([
      prisma.subscriptionPlan.findMany({ where, include: { prices: { orderBy: { period: 'asc' } } }, orderBy, skip: (page - 1) * limit, take: limit }),
      prisma.subscriptionPlan.count({ where }),
    ]);
    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  // Get single plan with prices
  async getPlan(planId: string) {
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId },
      include: { prices: true },
    });

    if (!plan) {
      throw new AppError(httpStatus.NOT_FOUND, 'Subscription plan not found');
    }

    return plan;
  }

  // Get current subscription for owner
  async getCurrentSubscription(user: IRequestUser) {
    const subscription = await prisma.ownerSubscription.findUnique({
      where: { userId: user.userId },
      include: { plan: { include: { prices: true } } },
    });

    return subscription;
  }

  // Subscribe owner to plan (with free trial)
  async subscribe(user: IRequestUser, planId: string, billingCycle: FixedPeriod) {
    const ownerProfile = await prisma.ownerProfile.findUnique({
      where: { userId: user.userId },
      select: { verificationStatus: true },
    });
    if (ownerProfile?.verificationStatus === 'APPROVED') {
      throw new AppError(httpStatus.FORBIDDEN, 'Approved subscriptions cannot be changed');
    }

    // Verify plan exists
    await this.getPlan(planId);

    const existing = await prisma.ownerSubscription.findUnique({
      where: { userId: user.userId },
    });

    const now = new Date();
    const trialEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
    const endDate = new Date(trialEnd); // Trial is the initial period

    return prisma.$transaction(async (tx) => {
      const subscription = existing
        ? await tx.ownerSubscription.update({
        where: { userId: user.userId },
        data: {
          planId,
          status: existing.status === SubscriptionStatus.CANCELLED || existing.status === SubscriptionStatus.EXPIRED
            ? SubscriptionStatus.TRIAL
            : existing.status,
          billingCycle,
          endDate: existing.status === SubscriptionStatus.CANCELLED || existing.status === SubscriptionStatus.EXPIRED ? endDate : existing.endDate,
          trialStart: existing.trialStart ?? now,
          trialEnd: existing.trialEnd ?? trialEnd,
          isTrialUsed: existing.isTrialUsed,
        },
        include: { plan: { include: { prices: true } } },
      })
        : await tx.ownerSubscription.create({
        data: {
          userId: user.userId,
          planId,
          status: SubscriptionStatus.TRIAL,
          startDate: now,
          endDate,
          trialStart: now,
          trialEnd,
          isTrialUsed: true,
          billingCycle,
          autoRenew: true,
        },
        include: { plan: { include: { prices: true } } },
      });

      return subscription;
    });
  }

  async activateFreeTrial(user: IRequestUser) {
    const freeTrialPlan = await prisma.subscriptionPlan.upsert({
      where: { name: 'Free Trial' },
      create: {
        name: 'Free Trial',
        maxTurfs: 1,
        prices: {
          create: [
            { period: FixedPeriod.MONTHLY, price: '0' },
            { period: FixedPeriod.QUARTERLY, price: '0' },
            { period: FixedPeriod.HALF_YEARLY, price: '0' },
            { period: FixedPeriod.YEARLY, price: '0' },
          ],
        },
      },
      update: { active: true },
    });

    return this.subscribe(user, freeTrialPlan.id, FixedPeriod.MONTHLY);
  }

  // Renew subscription
  async renew(user: IRequestUser, billingCycle: FixedPeriod) {
    const subscription = await this.getCurrentSubscription(user);

    if (!subscription) {
      throw new AppError(httpStatus.NOT_FOUND, 'No subscription found');
    }

    const now = new Date();
    let endDate: Date;

    const monthsToAdd = billingCycle === FixedPeriod.MONTHLY
      ? 1
      : billingCycle === FixedPeriod.QUARTERLY
        ? 3
        : billingCycle === FixedPeriod.HALF_YEARLY
          ? 6
          : 12;
    endDate = new Date(now.getFullYear(), now.getMonth() + monthsToAdd, now.getDate());

    return prisma.ownerSubscription.update({
      where: { userId: user.userId },
      data: {
        status: SubscriptionStatus.ACTIVE,
        startDate: now,
        endDate,
        renewalDate: endDate,
        billingCycle,
        autoRenew: true,
      },
      include: { plan: { include: { prices: true } } },
    });
  }

  // Check and update subscription status (for cron job)
  async checkAndUpdateStatus(userId: string) {
    const subscription = await prisma.ownerSubscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      return null;
    }

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
      return prisma.ownerSubscription.update({
        where: { userId },
        data: { status: newStatus },
      });
    }

    return subscription;
  }

  // Get turf limit for owner
  async getTurfLimit(userId: string): Promise<number> {
    const subscription = await prisma.ownerSubscription.findUnique({
      where: { userId },
      include: { plan: true },
    });

    if (!subscription) {
      return 0; // No subscription = no turfs allowed
    }

    if (subscription.status === SubscriptionStatus.EXPIRED || 
        subscription.status === SubscriptionStatus.CANCELLED) {
      return 0; // Cannot create new turfs if expired/cancelled
    }

    return subscription.plan.maxTurfs;
  }

  // Check turf limit before creating turf
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

  // Cancel subscription
  async cancel(user: IRequestUser) {
    const subscription = await this.getCurrentSubscription(user);

    if (!subscription) {
      throw new AppError(httpStatus.NOT_FOUND, 'No subscription found');
    }

    return prisma.ownerSubscription.update({
      where: { userId: user.userId },
      data: {
        status: SubscriptionStatus.CANCELLED,
        autoRenew: false,
      },
      include: { plan: { include: { prices: true } } },
    });
  }

  // Create subscription plan (admin only)
  async createPlan(data: {
    name: string;
    maxTurfs: number;
    prices: Array<{ period: FixedPeriod; price: number }>;
  }) {
    return prisma.subscriptionPlan.create({
      data: {
        name: data.name,
        maxTurfs: data.maxTurfs,
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

  async updatePlan(planId: string, data: { name?: string; maxTurfs?: number; active?: boolean; prices?: Array<{ period: FixedPeriod; price: number }> }) {
    const existing = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!existing) throw new AppError(httpStatus.NOT_FOUND, 'Subscription plan not found');
    return prisma.$transaction(async (tx) => {
      const plan = await tx.subscriptionPlan.update({
        where: { id: planId },
        data: { name: data.name, maxTurfs: data.maxTurfs, active: data.active },
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

  // Get subscription history for owner
  async getSubscriptionHistory(user: IRequestUser) {
    return prisma.ownerSubscription.findMany({
      where: { userId: user.userId },
      include: { plan: { include: { prices: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAdminSubscriptions(options: { status?: SubscriptionStatus; search?: string }) {
    return prisma.ownerSubscription.findMany({
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
    data: { status?: SubscriptionStatus; endDate?: string; autoRenew?: boolean; planId?: string },
  ) {
    const existing = await prisma.ownerSubscription.findUnique({ where: { id: subscriptionId } });
    if (!existing) throw new AppError(httpStatus.NOT_FOUND, 'Subscription not found');

    if (data.planId) {
      await this.getPlan(data.planId);
    }

    return prisma.ownerSubscription.update({
      where: { id: subscriptionId },
      data: {
        status: data.status,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        autoRenew: data.autoRenew,
        planId: data.planId,
      },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        plan: { include: { prices: true } },
      },
    });
  }
}
