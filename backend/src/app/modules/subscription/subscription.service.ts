import { Injectable } from '@nestjs/common';
import httpStatus from 'http-status';
import {
  FixedPeriod,
  SubscriptionAction,
  SubscriptionStatus,
  FeatureType,
  PaymentStatus,
  PaymentMethod,
  PaymentType,
  InvoiceFor,
  InvoiceStatus,
} from '../../../generated/prisma/enums';
import { Prisma } from '../../../generated/prisma/client';
import AppError from '../../../config/errorHelpers/AppError';
import prisma from '../../../shared/prisma';
import { startOfDay } from '../../utils/date';
import { nextDocumentNumber } from '../../utils/document-number';
import { IRequestUser } from '../../interfaces/requestUser.interface';
import { InvoiceService } from '../invoice/invoice.service';

@Injectable()
export class SubscriptionService {
  constructor(private readonly invoiceService: InvoiceService) { }
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
              { ownerProfile: { companyName: { contains: options.search, mode: "insensitive" } } }
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
            select: { name: true, email: true, ownedTurfs: { select: { name: true } }, ownerProfile: { select: { companyName: true } } },
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

      const { ownerProfile, ownedTurfs, ...userRest } = (sub.user ?? {}) as any;
      return {
        ...rest,
        user: { ...userRest, companyName: ownerProfile?.companyName ?? null, ownedTurfs: (ownedTurfs ?? []).map((t: any) => t.name) },
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
    data: { period: FixedPeriod; planId?: string; status?: SubscriptionStatus; paymentMethod?: PaymentMethod; providerTransactionId?: string; payerMobileNumber?: string }
  ) {
    const existing = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        plan: { include: { prices: true } },
        subscriptionLogs: {
          orderBy: { createdAt: 'desc' },
          take: 2,
        },
      },
    });
    if (!existing) throw new AppError(httpStatus.NOT_FOUND, 'Subscription not found');

    // Admin Restriction Rule: Limit of 2 Active Logs
    const logs = existing.subscriptionLogs;
    if (logs.length >= 2) {
      const now = new Date();
      const allActive = logs.every((log) => new Date(log.endDate) > now);
      if (allActive) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          'Cannot update subscription: maximum of 2 active subscription logs allowed spanning the current time.'
        );
      }
    }

    // Validate plan if changing
    let targetPlan = existing.plan;
    if (data.planId && data.planId !== existing.planId) {
      targetPlan = await this.getPlanById(data.planId);
    }

    const priceData = targetPlan.prices.find((p) => p.period === data.period);
    if (!priceData) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Invalid billing period for this plan');
    }

    const price = new Prisma.Decimal(priceData.price.toString());
    const isCash = data.paymentMethod === PaymentMethod.CASH;

    const now = startOfDay(new Date());
    const periodMonths =
      data.period === FixedPeriod.YEARLY
        ? 12
        : data.period === FixedPeriod.HALF_YEARLY
          ? 6
          : data.period === FixedPeriod.QUARTERLY
            ? 3
            : 1;

    // End Date Calculation
    let newEndDate: Date;
    if (now <= existing.endDate) {
      // Active: start from day after current end date
      newEndDate = new Date(existing.endDate);
      newEndDate.setDate(newEndDate.getDate() + 1);
      newEndDate.setMonth(newEndDate.getMonth() + periodMonths);
    } else {
      // Expired: start from current date
      newEndDate = new Date(now);
      newEndDate.setMonth(newEndDate.getMonth() + periodMonths);
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.subscription.update({
        where: { id: subscriptionId },
        data: {
          endDate: newEndDate,
          planId: data.planId,
          status: data.status ?? existing.status,
        },
      });

      const log = await tx.subscriptionLog.create({
        data: {
          subscriptionId: updated.id,
          action: data.planId && data.planId !== existing.planId ? SubscriptionAction.UPGRADED : SubscriptionAction.RENEWED,
          status: updated.status,
          period: data.period,
          startDate: now,
          endDate: newEndDate,
        },
      });

      const invoice = await this.invoiceService.createInvoice(tx, {
        subscriptionLogId: log.id,
        userId: existing.userId,
        invoiceFor: InvoiceFor.O,
        subtotal: price,
        discount: new Prisma.Decimal(0),
        totalAmount: price,
        paidAmount: new Prisma.Decimal(0),
        status: InvoiceStatus.DRAFT,
        isFullPaid: false,
      });

      if (isCash) {
        return { subscription: updated, invoice, payment: null, subscriptionLog: log };
      }

      const paymentNumber = await nextDocumentNumber(tx, 'PAY');
      const pendingPayment = await tx.payment.create({
        data: {
          paymentNumber,
          invoiceId: invoice.id,
          type: PaymentType.FULL,
          method: data.paymentMethod!,
          amount: price,
          status: PaymentStatus.PROCESSING,
          providerTransactionId: data.providerTransactionId ?? null,
          payerMobileNumber: data.payerMobileNumber ?? null,
          idempotencyKey: `sub_update_${subscriptionId}_${Date.now()}`,
        },
      });

      return { subscription: updated, invoice, payment: pendingPayment, subscriptionLog: log };
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