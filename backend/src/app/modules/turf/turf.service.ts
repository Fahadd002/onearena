import { Injectable } from '@nestjs/common';
import status from 'http-status';
import { Prisma } from '../../../generated/prisma/client';
import { PaymentMethod, SlotSatus, SubscriptionStatus, TurfStatus, UserRole } from '../../../generated/prisma/enums';

import AppError from '../../../config/errorHelpers/AppError';
import prisma from '../../../shared/prisma';
import { IRequestUser } from '../../interfaces/requestUser.interface';

export interface TurfPayload {
  name: string;
  categoryId: string;
  description?: string;
  address: string;
  timezone?: string;
  establishedSince?: string;
  latitude: number;
  longitude: number;
  defaultSlotPrice: number;
  defaultSlotDuration?: number;
  allowAdvancePayment?: boolean;
  advancePaymentAmount?: number;
  paymentPhoneNumbers?: { method: AdvancePaymentMethod; number: string }[];
}

const ADVANCE_PAYMENT_METHODS = [
  PaymentMethod.BKASH,
  PaymentMethod.ROKET,
  PaymentMethod.NAGAD
] as const;
type AdvancePaymentMethod = (typeof ADVANCE_PAYMENT_METHODS)[number];
const MIN_SLOT_DURATION = 30;
const BD_MOBILE = /^(?:\+8801|01)\d{9}$/;

function parseEstablishedSince(value?: string) {
  const year = value?.slice(0, 4);
  if (
    !value ||
    !/^\d{4}-(0[1-9]|1[0-2])-01$/.test(value) ||
    Number(year) < 1990 ||
    Number(year) > new Date().getFullYear()
  ) {
    throw new AppError(status.BAD_REQUEST, 'Established since must be a valid month and year from 1990 to the current year');
  }
  return new Date(`${value}T00:00:00.000Z`);
}

function validateTimezone(timezone?: string) {
  if (timezone === undefined) return;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
  } catch (error) {
    if (error instanceof RangeError) {
      throw new AppError(status.BAD_REQUEST, 'Invalid timezone');
    }
    throw error;
  }
}

function normalizePaymentPhoneNumbers(
  allowAdvancePayment?: boolean,
  numbers?: { method: string; number: string }[],
) {
  if (!allowAdvancePayment) return [] as Array<{ method: AdvancePaymentMethod; number: string }>;
  const list = (numbers ?? [])
    .filter((n) => n?.method && (n?.number ?? "").trim())
    .map((n) => ({ method: n.method, number: n.number.replace(/[\s-]/g, "") }));
  if (list.length === 0) {
    throw new AppError(
      status.BAD_REQUEST,
      "When advance payment is enabled, at least one payment number is required",
    );
  }
  const methods = new Set<string>();
  for (const n of list) {
    if (!ADVANCE_PAYMENT_METHODS.includes(n.method as AdvancePaymentMethod)) {
      throw new AppError(status.BAD_REQUEST, `Unsupported payment method: ${n.method}`);
    }
    if (!BD_MOBILE.test(n.number)) {
      throw new AppError(status.BAD_REQUEST, `Invalid ${n.method} number. Use a Bangladesh mobile number`);
    }
    if (methods.has(n.method)) {
      throw new AppError(
        status.BAD_REQUEST,
        `Each payment method can only be added once: ${n.method}`,
      );
    }
    methods.add(n.method);
  }
  return list as Array<{ method: AdvancePaymentMethod; number: string }>;
}

function validateSlotDefaults(price?: number, duration?: number) {
  if (price !== undefined && (!Number.isFinite(price) || price <= 0)) {
    throw new AppError(status.BAD_REQUEST, 'Default slot price must be greater than 0');
  }
  if (duration !== undefined && (!Number.isInteger(duration) || duration < MIN_SLOT_DURATION)) {
    throw new AppError(status.BAD_REQUEST, `Default slot duration must be at least ${MIN_SLOT_DURATION} minutes`);
  }
}

@Injectable()
export class TurfService {
  async deactivateTurfsForInactiveSubscriptions() {
    const now = new Date();
    const result = await prisma.turf.updateMany({
      where: {
        status: TurfStatus.ACTIVE,
        owner: {
          OR: [
            {
              subscriptions: {
                is: {
                  OR: [
                    { status: SubscriptionStatus.EXPIRED },
                    { status: SubscriptionStatus.CANCELLED },
                    { endDate: { lte: now } },
                  ],
                },
              },
            },
          ],
        },
      },
      data: { status: TurfStatus.INACTIVE },
    });

    return { count: result.count };
  }

  private validateCoordinates(payload: TurfPayload) {
    if (
      !Number.isFinite(payload.latitude) || payload.latitude < -90 || payload.latitude > 90 ||
      !Number.isFinite(payload.longitude) || payload.longitude < -180 || payload.longitude > 180
    ) {
      throw new AppError(status.BAD_REQUEST, 'Valid latitude and longitude are required');
    }
  }

  // Turf List For Admin
  async listForAdmin(query?: {
    search?: string;
    categoryId?: string;
    status?: string;
    facilityId?: string;
    sortBy?: string;
    sortOrder?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, query?.page ?? 1);
    const limit = Math.min(100, Math.max(1, query?.limit ?? 10));

    const where: Prisma.TurfWhereInput = {
      ...(query?.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query?.status && Object.values(TurfStatus).includes(query.status as TurfStatus)
        ? { status: query.status as TurfStatus }
        : {}),
      ...(query?.facilityId
        ? { facilities: { some: { facilityId: query.facilityId } } }
        : {}),
      ...(query?.search
        ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { address: { contains: query.search, mode: 'insensitive' } },
            { owner: { name: { contains: query.search, mode: 'insensitive' } } },
            { owner: { email: { contains: query.search, mode: 'insensitive' } } },
          ],
        }
        : {}),
    };

    const sortField = ['name', 'address', 'defaultSlotPrice', 'createdAt', 'updatedAt', 'status'].includes(query?.sortBy ?? '')
      ? query?.sortBy!
      : 'updatedAt';
    const sortOrder = query?.sortOrder === 'asc' ? 'asc' : 'desc';

    const [data, total] = await prisma.$transaction([
      prisma.turf.findMany({
        where,
        include: {
          category: true,
          owner: { select: { id: true, name: true, email: true } },
          images: { orderBy: { sortOrder: 'asc' }, take: 1 },
        },
        orderBy: { [sortField]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.turf.count({ where }),
    ]);

    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findForAdmin(id: string) {
    const turf = await prisma.turf.findUnique({
      where: { id },
      include: {
        category: true,
        owner: { select: { id: true, name: true, email: true } },
        facilities: { include: { facility: true } },
        images: { orderBy: { sortOrder: 'asc' } },
        priceRules: { orderBy: [{ dayOfWeek: 'asc' }] },
        paymentPhoneNumbers: true,
        packages: { include: { facilities: { include: { facility: true } } } },
      },
    });
    if (!turf) throw new AppError(status.NOT_FOUND, 'Turf not found');
    return turf;
  }

  async updateStatus(id: string, nextStatus: string) {
    if (!Object.values(TurfStatus).includes(nextStatus as TurfStatus)) {
      throw new AppError(status.BAD_REQUEST, 'Invalid turf status');
    }
    const approvalStatuses: TurfStatus[] = [TurfStatus.ACTIVE, TurfStatus.REJECTED, TurfStatus.INACTIVE];
    if (!approvalStatuses.includes(nextStatus as TurfStatus)) {
      throw new AppError(status.BAD_REQUEST, 'Invalid approval status');
    }
    const turf = await prisma.turf.findUnique({ where: { id } });
    if (!turf) throw new AppError(status.NOT_FOUND, 'Turf not found');
    const data = await prisma.turf.update({ where: { id }, data: { status: nextStatus as TurfStatus } });

    return data;
  }

  async list(
    user: IRequestUser,
    query: {
      area?: string;
      categoryId?: string;
      minPrice?: number;
      maxPrice?: number;
      lat?: number;
      lng?: number;
      radius?: number;
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
      date?: string;
    }) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(50, Math.max(1, query.limit ?? 10));

    // owners with active subscription
    const subs = await prisma.subscription.findMany({
      where: { status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.FREE_TRIAL] } },
      select: { userId: true },
    });

    // target date for slots - parse as UTC midnight for Prisma DateTime comparison
    const targetDate = query.date ? new Date(query.date + 'T00:00:00.000Z') : new Date();
    targetDate.setUTCHours(0, 0, 0, 0);

    const where: Prisma.TurfWhereInput = {
      status: TurfStatus.ACTIVE,
      categoryId: query.categoryId,
      slots: { some: { slotDate: { equals: targetDate }, active: true } },
      ...(user?.role === UserRole.ADMIN ? { ownerId: user.userId } : { ownerId: { in: subs.map((s) => s.userId) } }),
      ...(query.area?.trim()
        ? {
          OR: [
            { name: { contains: query.area.trim(), mode: Prisma.QueryMode.insensitive } },
            { address: { contains: query.area.trim(), mode: Prisma.QueryMode.insensitive } },
          ],
        }
        : {}),
      defaultSlotPrice: {
        gte: query.minPrice !== undefined ? new Prisma.Decimal(query.minPrice) : undefined,
        lte: query.maxPrice !== undefined ? new Prisma.Decimal(query.maxPrice) : undefined,
      },
    };

    const include = {
      category: { select: { name: true } },
      paymentPhoneNumbers: { select: { method: true, number: true } },
      owner: { select: { id: true, name: true, image: true } },
      images: { orderBy: { sortOrder: "asc" as const } },
      facilities: { select: { facility: { select: { name: true } } } },
      slots: {
        where: { slotDate: { equals: targetDate }, slotStatus: { not: SlotSatus.EXPIRED }, active: true },
        orderBy: { startMinute: "asc" as const },
      },
    };


    /* ---------- GEO ---------- */
    if (query.lat !== undefined && query.lng !== undefined) {
      const radius = query.radius ?? 10;
      const turfs = await prisma.turf.findMany({ where, include });

      const toRad = (d: number) => (d * Math.PI) / 180;

      const nearby = turfs
        .map((t) => {
          const lat = Number(t.latitude);
          const lng = Number(t.longitude);
          const dLat = toRad(lat - query.lat!);
          const dLng = toRad(lng - query.lng!);
          const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(query.lat!)) * Math.cos(toRad(lat)) * Math.sin(dLng / 2) ** 2;
          return { ...t, distance: 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) };
        })
        .filter((t) => t.distance <= radius)
        .sort((a, b) => a.distance - b.distance);

      const total = nearby.length;
      return {
        data: nearby.slice((page - 1) * limit, page * limit),
        meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      };
    }

    /* ---------- NORMAL ---------- */
    const sortField = ["createdAt", "defaultSlotPrice", "name"].includes(query.sortBy ?? "")
      ? query.sortBy!
      : "createdAt";

    const [data, total] = await Promise.all([
      prisma.turf.findMany({
        where,
        include,
        orderBy: { [sortField]: query.sortOrder === "asc" ? "asc" : "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.turf.count({ where }),
    ]);

    return { data, meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
  }

  async listMine(
    owner: IRequestUser,
    query?: { search?: string; categoryId?: string; sortBy?: string; sortOrder?: string; page?: number; limit?: number },
  ) {
    const page = Math.max(1, query?.page ?? 1);
    const limit = Math.min(100, Math.max(1, query?.limit ?? 10));
    const where: Prisma.TurfWhereInput = {
      ownerId: owner.userId,
      ...(query?.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query?.search
        ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { address: { contains: query.search, mode: 'insensitive' } },
          ],
        }
        : {}),
    };
    const sortField = ['name', 'address', 'defaultSlotPrice', 'createdAt', 'status'].includes(query?.sortBy ?? '')
      ? query?.sortBy!
      : 'createdAt';
    const sortOrder = query?.sortOrder === 'asc' ? 'asc' : 'desc';
    const [data, total] = await prisma.$transaction([
      prisma.turf.findMany({
        where,
        include: { category: true, facilities: { include: { facility: true } } },
        orderBy: { [sortField]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.turf.count({ where }),
    ]);
    return query ? { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } } : data;
  }

  async assignFacilities(owner: IRequestUser, turfId: string, facilityIds: string[]) {
    const turf = await prisma.turf.findFirst({ where: { id: turfId, ownerId: owner.userId } });
    if (!turf) throw new AppError(status.NOT_FOUND, 'Turf not found');
    await prisma.$transaction([
      prisma.turfFacility.deleteMany({ where: { turfId } }),
      prisma.turfFacility.createMany({
        data: [...new Set(facilityIds)].map((facilityId) => ({ turfId, facilityId })),
      }),
    ]);
    return prisma.turf.findUnique({ where: { id: turfId }, include: { facilities: { include: { facility: true } } } });
  }

  async findMineById(owner: IRequestUser, id: string) {
    const turf = await prisma.turf.findFirst({
      where: { id, ownerId: owner.userId },
      include: {
        category: true,
        facilities: { include: { facility: true } },
        images: { orderBy: { sortOrder: 'asc' } },
        priceRules: { orderBy: [{ dayOfWeek: 'asc' }] },
        paymentPhoneNumbers: true,
        packages: { include: { facilities: { include: { facility: true } } } },
      },
    });

    if (!turf) throw new AppError(status.NOT_FOUND, 'Turf not found');
    return turf;
  }

  async findActiveTurfById(id: string) {
    const turf = await prisma.turf.findFirst({
      where: {
        id,
      },
      include: {
        category: true,
        facilities: {
          include: { facility: true },
        },
        images: {
          orderBy: { sortOrder: 'asc' },
        },
        paymentPhoneNumbers: { select: { method: true, number: true } },
        packages: {
          where: { active: true },
          include: { facilities: { include: { facility: true } } },
        }
      },
    });

    if (!turf) {
      throw new AppError(status.NOT_FOUND, 'Turf not found');
    }

    return turf;
  }

  async create(owner: IRequestUser, payload: TurfPayload) {
    if (owner.role !== UserRole.ADMIN) {
      throw new AppError(status.FORBIDDEN, 'Only approved owners can create turfs');
    }

    const subscription = await prisma.subscription.findUnique({
      where: { userId: owner.userId },
      include: { plan: true },
    });
    if (!subscription) {
      throw new AppError(status.FORBIDDEN, 'An active subscription is required before creating a turf');
    }
    if (
      (subscription.status !== SubscriptionStatus.FREE_TRIAL &&
        subscription.status !== SubscriptionStatus.ACTIVE &&
        subscription.status !== SubscriptionStatus.EXPIRING) ||
      subscription.endDate <= new Date()
    ) {
      throw new AppError(status.FORBIDDEN, 'Your subscription is expired or cancelled. Renew it before creating a turf');
    }
    if (!subscription.plan.active) {
      throw new AppError(status.FORBIDDEN, 'Your subscription plan is no longer available');
    }

    const turfCount = await prisma.turf.count({ where: { ownerId: owner.userId } });
    if (turfCount >= subscription.plan.maxTurfs) {
      throw new AppError(
        status.FORBIDDEN,
        `Your subscription allows ${subscription.plan.maxTurfs} turf(s). Upgrade your plan to create another turf`,
      );
    }

    this.validateCoordinates(payload);
    validateSlotDefaults(payload.defaultSlotPrice, payload.defaultSlotDuration);
    validateTimezone(payload.timezone);

    const phoneNumbers = normalizePaymentPhoneNumbers(
      payload.allowAdvancePayment,
      payload.paymentPhoneNumbers,
    );

    const data = await prisma.turf.create({
      data: {
        ownerId: owner.userId,
        categoryId: payload.categoryId,
        name: payload.name,
        description: payload.description,
        address: payload.address,
        timezone: payload.timezone ?? 'Asia/Dhaka',
        establishedSince: parseEstablishedSince(payload.establishedSince),
        allowAdvancePayment: payload.allowAdvancePayment ?? false,
        advancePaymentAmount: new Prisma.Decimal(payload.advancePaymentAmount ?? 0),
        latitude: new Prisma.Decimal(payload.latitude),
        longitude: new Prisma.Decimal(payload.longitude),
        defaultSlotDuration: payload.defaultSlotDuration ?? 90,
        defaultSlotPrice: new Prisma.Decimal(payload.defaultSlotPrice),
        paymentPhoneNumbers: phoneNumbers.length ? { create: phoneNumbers } : undefined,
      },
    });

    return data;
  }

  async update(owner: IRequestUser, id: string, payload: Partial<TurfPayload>) {
    const turf = await prisma.turf.findFirst({
      where: { id, ownerId: owner.userId },
    });

    if (!turf) {
      throw new AppError(status.NOT_FOUND, 'Turf not found');
    }

    validateSlotDefaults(payload.defaultSlotPrice, payload.defaultSlotDuration);
    validateTimezone(payload.timezone);

    return prisma.$transaction(async (tx) => {
      if (payload.allowAdvancePayment !== undefined || payload.paymentPhoneNumbers !== undefined) {
        const allow = payload.allowAdvancePayment ?? turf.allowAdvancePayment;
        const numbers = normalizePaymentPhoneNumbers(allow, payload.paymentPhoneNumbers);
        await tx.paymentPhoneNumber.deleteMany({ where: { turfId: id } });
        if (numbers.length) {
          await tx.paymentPhoneNumber.createMany({ data: numbers.map((n) => ({ ...n, turfId: id })) });
        }
      }

      return tx.turf.update({
        where: { id },
        data: {
          name: payload.name,
          categoryId: payload.categoryId,
          description: payload.description,
          address: payload.address,
          timezone: payload.timezone,
          ...(payload.establishedSince === undefined
            ? {}
            : { establishedSince: parseEstablishedSince(payload.establishedSince) }),
          allowAdvancePayment: payload.allowAdvancePayment,
          advancePaymentAmount: payload.advancePaymentAmount !== undefined ? new Prisma.Decimal(payload.advancePaymentAmount) : undefined,
          defaultSlotDuration: payload.defaultSlotDuration,
          defaultSlotPrice: payload.defaultSlotPrice !== undefined ? new Prisma.Decimal(payload.defaultSlotPrice) : undefined,
          ...(payload.latitude === undefined ? {} : { latitude: new Prisma.Decimal(payload.latitude) }),
          ...(payload.longitude === undefined ? {} : { longitude: new Prisma.Decimal(payload.longitude) }),
        },
        include: { paymentPhoneNumbers: true },
      });
    });
  }
}
