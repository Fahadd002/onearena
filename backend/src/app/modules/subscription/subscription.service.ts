import { Injectable } from '@nestjs/common';
import httpStatus from 'http-status';
import {
  FixedPeriod,
  SubscriptionAction,
  SubscriptionStatus,
  FeatureType,
  PaymentStatus,
} from '../../../generated/prisma/enums';
import { Prisma } from '../../../generated/prisma/client';
import AppError from '../../../config/errorHelpers/AppError';
import prisma from '../../../shared/prisma';
import { startOfDay } from '../../utils/date';
import { IRequestUser } from '../../interfaces/requestUser.interface';

@Injectable()
export class SubscriptionService {
  constructor() { }
  // Get all active subscription plans ordered by tier level
  async getPlans() {
    return prisma.subscriptionPlan.findMany({
      where: { active: true },
      include: {
        prices: {
          orderBy: { period: 'asc' },
        },
        features: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { tierLevel: 'asc' },
    });
  }

  // Get single plan by ID (Alias/Utility)
  async getPlanById(planId: string) {
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId },
      include: {
        prices: true,
        features: { orderBy: { createdAt: 'asc' } },
      },
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

  async getSetUpPlans(options: {
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
        include: {
          prices: { orderBy: { period: 'asc' } },
          features: { orderBy: { createdAt: 'asc' } },
        },
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

    const now = startOfDay(new Date());
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
            freeStart: existingSub.freeStart ?? now,
            freeEnd: existingSub.freeEnd ?? trialEnd,
            isFreeUsed: existingSub.isFreeUsed,
          },
          include: { plan: { include: { prices: true } } },
        })
        : await tx.subscription.create({
          data: {
            userId: user.userId,
            planId,
            status: SubscriptionStatus.FREE_TRIAL,
            startDate: now,
            endDate: trialEnd,
            freeStart: now,
            freeEnd: trialEnd,
            isFreeUsed: true,
          },
          include: { plan: { include: { prices: true } } },
        });

      // Write Audit Log (skip if an identical log already exists for this exact period)
      const duplicateLog = await tx.subscriptionLog.findFirst({
        where: {
          subscriptionId: subscription.id,
          period: billingPeriod,
          startDate: subscription.startDate,
          endDate: subscription.endDate,
          action: existingSub ? action : SubscriptionAction.TRIAL_STARTED,
        },
      });

      if (!duplicateLog) {
        await tx.subscriptionLog.create({
          data: {
            subscriptionId: subscription.id,
            action: existingSub ? action : SubscriptionAction.TRIAL_STARTED,
            status: subscription.status,
            period: billingPeriod,
            startDate: subscription.startDate,
            endDate: subscription.endDate,
          },
        });
      }

      return subscription;
    });
  }

  // Cron job status sync
  async checkAndUpdateStatus(userId: string) {
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
      include: { subscriptionLogs: { orderBy: { createdAt: 'desc' }, take: 1 } },
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
              period: subscription.subscriptionLogs[0]?.period ?? FixedPeriod.MONTHLY,
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
          period: subscription.subscriptionLogs[0]?.period ?? FixedPeriod.MONTHLY,
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
    isFreeTrialAllowed?: boolean;
    freeTrialDuration?: number;
    features: Array<{ name: string; description?: string; type: FeatureType; key?: string }>;
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

    // Validate premium features must have a key
    const premiumFeatures = data.features.filter(f => f.type === FeatureType.PREMIUM);
    const generalFeatures = data.features.filter(f => f.type === FeatureType.GENERAL);

    for (const feature of premiumFeatures) {
      if (!feature.key || feature.key.trim() === '') {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          'Premium features must have a unique key for permission checks.'
        );
      }
    }

    // Check for duplicate keys among premium features
    const premiumKeys = premiumFeatures.map(f => f.key!.trim()).filter(Boolean);
    const uniqueKeys = new Set(premiumKeys);
    if (premiumKeys.length !== uniqueKeys.size) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Premium feature keys must be unique.'
      );
    }

    return prisma.$transaction(async (tx) => {
      const plan = await tx.subscriptionPlan.create({
        data: {
          name: data.name,
          tierLevel: data.tierLevel,
          maxTurfs: data.maxTurfs,
          isFreeTrialAllowed: data.isFreeTrialAllowed ?? false,
          freeTrialDuration: data.freeTrialDuration ?? 0,
          prices: {
            create: data.prices.map((p) => ({
              period: p.period,
              price: p.price.toString(),
            })),
          },
        },
      });

      // Create features - link both general and premium features to this plan
      await tx.feature.createMany({
        data: [
          ...generalFeatures.map(f => ({
            name: f.name,
            description: f.description,
            type: FeatureType.GENERAL,
            planId: plan.id,
          })),
          ...premiumFeatures.map(f => ({
            name: f.name,
            description: f.description,
            type: FeatureType.PREMIUM,
            key: f.key!.trim(),
            planId: plan.id,
          })),
        ],
      });

      return tx.subscriptionPlan.findUnique({
        where: { id: plan.id },
        include: { prices: true, features: true },
      });
    });
  }

  async updatePlan(
    planId: string,
    data: {
      name?: string;
      tierLevel?: number;
      maxTurfs?: number;
      isFreeTrialAllowed?: boolean;
      freeTrialDuration?: number;
      features?: Array<{ id?: string; name: string; description?: string; type: FeatureType; key?: string }>;
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

    // Validate premium features if provided
    if (data.features !== undefined) {
      const premiumFeatures = data.features.filter(f => f.type === FeatureType.PREMIUM);

      for (const feature of premiumFeatures) {
        if (!feature.key || feature.key.trim() === '') {
          throw new AppError(
            httpStatus.BAD_REQUEST,
            'Premium features must have a unique key for permission checks.'
          );
        }
      }

      // Check for duplicate keys among premium features
      const premiumKeys = premiumFeatures.map(f => f.key!.trim()).filter(Boolean);
      const uniqueKeys = new Set(premiumKeys);
      if (premiumKeys.length !== uniqueKeys.size) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          'Premium feature keys must be unique.'
        );
      }

      // Check if any key conflicts with existing features in other plans
      const existingKeys = await prisma.feature.findMany({
        where: {
          key: { in: premiumKeys },
          NOT: { planId: planId },
        },
        select: { key: true },
      });
      if (existingKeys.length > 0) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          `Premium feature keys already in use: ${existingKeys.map(k => k.key).join(', ')}`
        );
      }
    }

    return prisma.$transaction(async (tx) => {
      // Update plan basic fields
      const plan = await tx.subscriptionPlan.update({
        where: { id: planId },
        data: {
          name: data.name,
          tierLevel: data.tierLevel,
          maxTurfs: data.maxTurfs,
          isFreeTrialAllowed: data.isFreeTrialAllowed,
          freeTrialDuration: data.freeTrialDuration,
          active: data.active,
        },
      });

      // Handle features update if provided
      if (data.features !== undefined) {
        const incomingFeatureIds = data.features
          .filter(f => f.id)
          .map(f => f.id!);

        // Delete features not in the incoming list (for this plan's premium features + general features)
        await tx.feature.deleteMany({
          where: {
            OR: [
              { planId: planId, id: { notIn: incomingFeatureIds } }, // Premium features not in update
              { planId: null, id: { notIn: incomingFeatureIds } }, // General features not in update
            ],
          },
        });

        // Upsert features
        for (const feature of data.features) {
          if (feature.id) {
            // Update existing feature
            await tx.feature.update({
              where: { id: feature.id },
              data: {
                name: feature.name,
                description: feature.description,
                type: feature.type,
                key: feature.type === FeatureType.PREMIUM ? feature.key?.trim() : null,
                // Ensure premium features are linked to this plan, general features have null planId
                planId: feature.type === FeatureType.PREMIUM ? planId : null,
              },
            });
          } else {
            // Create new feature
            await tx.feature.create({
              data: {
                name: feature.name,
                description: feature.description,
                type: feature.type,
                key: feature.type === FeatureType.PREMIUM ? feature.key?.trim() : null,
                planId: feature.type === FeatureType.PREMIUM ? planId : null,
              },
            });
          }
        }
      }

      if (data.prices) {
        for (const price of data.prices) {
          await tx.subscriptionPrice.upsert({
            where: { planId_period: { planId, period: price.period } },
            create: { planId, period: price.period, price: price.price.toString() },
            update: { price: price.price.toString() },
          });
        }
      }

      return tx.subscriptionPlan.findUnique({ where: { id: plan.id }, include: { prices: true, features: true } });
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

    const logs = await prisma.subscriptionLog.findMany({
      where: { subscriptionId: subscription.id },
      include: { invoice: true },
      orderBy: { createdAt: 'desc' },
    });

    const seen = new Map<string, typeof logs[0]>();
    for (const log of logs) {
      const startDate = new Date(log.startDate);
      const endDate = new Date(log.endDate);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);
      const key = `${startDate.toISOString()}|${endDate.toISOString()}`;

      const existing = seen.get(key);
      if (!existing || (log.invoice && !existing.invoice)) {
        seen.set(key, log);
      }
    }

    const result = Array.from(seen.values()).map((log) => {
      const startDate = new Date(log.startDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(log.endDate);
      endDate.setHours(0, 0, 0, 0);
      return {
        ...log,
        startDate,
        endDate,
      };
    });

    result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return result;
  }

  async getAllOwnerSubscriptions(options: {
    status?: SubscriptionStatus;
    search?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    page?: number;
    limit?: number;
  }) {
    const page = options.page && options.page > 0 ? options.page : 1;
    const limit =
      options.limit && options.limit > 0 ? Math.min(options.limit, 100) : 10;

    // ── Where ─────────────────────────────────────────────────────
    const where: Prisma.SubscriptionWhereInput = {
      ...(options.status ? { status: options.status } : {}),
      ...(options.search
        ? {
          user: {
            OR: [
              { name: { contains: options.search, mode: "insensitive" } },
              { email: { contains: options.search, mode: "insensitive" } },
            ],
          },
        }
        : {}),
    };

    // ── Order By ──────────────────────────────────────────────────
    const dir = options.sortOrder === "asc" ? "asc" : "desc";
    let orderBy: Prisma.SubscriptionOrderByWithRelationInput = {
      updatedAt: "desc",
    };
    if (options.sortBy === "endDate") orderBy = { endDate: dir };
    else if (options.sortBy === "status") orderBy = { status: dir };
    else if (options.sortBy === "startDate") orderBy = { startDate: dir };
    else if (options.sortOrder) orderBy = { updatedAt: dir };

    // ── Query ─────────────────────────────────────────────────────
    const [rows, total] = await prisma.$transaction([
      prisma.subscription.findMany({
        where,
        select: {
          id: true,
          userId: true,
          planId: true,
          status: true,
          startDate: true,
          endDate: true,
          user: {
            select: { name: true, email: true, ownerProfile: { select: { companyName: true } } },
          },
          plan: {
            select: { name: true },
          },

          // Latest log only — will be flattened to `latestLog` below
          subscriptionLogs: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              period: true,
              
              invoice: {
                select: {
                  invoiceNumber: true,
                  totalAmount: true,
                  paidAmount: true,
                  status: true,
                  payments: {
                    select: {
                      status: true,
                      method: true,
                      amount: true,
                      providerTransactionId: true,
                      payerMobileNumber: true,
                      reference: true,
                      note: true,
                    },
                    orderBy: { createdAt: "desc" },
                  },
                },
              },
            },
          },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.subscription.count({ where }),
    ]);

    // ── Flatten: subscriptionLogs[0] → latestLog ─────────────────
    const data = rows.map((sub) => {
      const { subscriptionLogs, ...rest } = sub;
      const latestLog = subscriptionLogs[0] ?? null;
      const invoice = latestLog?.invoice ?? null;
      const paidTotal = (invoice?.payments ?? []).filter((payment) => payment.status === PaymentStatus.PAID || PaymentStatus.PROCESSING).reduce((sum, payment) => sum + Number(payment.amount), 0);
      const outstanding = invoice ? Math.max(0, Number(invoice.totalAmount) - paidTotal) : 0;

       const { ownerProfile, ...userRest } = (sub.user ?? {}) as any;
       return {
         ...rest,
         user: { ...userRest, companyName: ownerProfile?.companyName ?? null },
         latestLog,
         invoice,
         outstanding,
         canAcceptPayment: !!invoice && outstanding > 0,
       };
    });

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

  async updateSubscriptionBySuperAdmin(
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

      return updated;
    });
  }


  async updateSubscription(
    subscriptionId: string,
    data: { status?: SubscriptionStatus; endDate?: string; planId?: string }
  ) {
    const existing = await prisma.subscription.findUnique({ where: { id: subscriptionId } });
    if (!existing) throw new AppError(httpStatus.NOT_FOUND, 'Subscription not found');

    if (data.planId) {
      await this.getPlanById(data.planId);
    }

    return prisma.$transaction(async (tx) => {
      const latestLog = await tx.subscriptionLog.findFirst({
        where: { subscriptionId },
        orderBy: { createdAt: 'desc' },
        select: { period: true },
      });

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
          period: latestLog?.period ?? FixedPeriod.MONTHLY,
          action: SubscriptionAction.RENEWED,
          status: updated.status,
          startDate: updated.startDate,
          endDate: updated.endDate,
        },
      });

      return updated;
    });
  }


  async createFreeTrial(user: IRequestUser) {
    const freePlan = await prisma.subscriptionPlan.findFirst({
      where: { active: true, isFreeTrialAllowed: true },
    });

    if (!freePlan) {
      throw new AppError(
        httpStatus.NOT_FOUND,
        "Free trial is not allowed",
      );
    }

    const existingSub = await prisma.subscription.findUnique({
      where: { userId: user.userId },
    });

    if (existingSub?.isFreeUsed) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Free trial has already been used",
      );
    }

    // Use the plan's freeTrialDuration or default to 30 days
    const trialDurationDays = freePlan.freeTrialDuration > 0 ? freePlan.freeTrialDuration : 30;

    return prisma.$transaction(async (tx) => {
      const now = startOfDay(new Date());
      const trialEnd = new Date(now.getTime() + trialDurationDays * 24 * 60 * 60 * 1000);

      const subscription = await tx.subscription.create({
        data: {
          userId: user.userId,
          planId: freePlan.id,
          status: SubscriptionStatus.FREE_TRIAL,
          startDate: now,
          endDate: trialEnd,
          freeStart: now,
          freeEnd: trialEnd,
          isFreeUsed: true,
          isFreeActive: true,
        },
        include: { plan: { include: { prices: true } } },
      });

      await tx.subscriptionLog.create({
        data: {
          subscriptionId: subscription.id,
          action: SubscriptionAction.SUBSCRIBED,
          status: SubscriptionStatus.FREE_TRIAL,
          period: FixedPeriod.MONTHLY,
          startDate: now,
          endDate: trialEnd,
        },
      });

      return subscription;
    });
  }
}