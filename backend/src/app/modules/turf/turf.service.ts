import { Injectable } from '@nestjs/common';
import status from 'http-status';
import { Prisma } from '../../../generated/prisma/client';
import { TurfStatus, UserRole } from '../../../generated/prisma/enums';

import AppError from '../../../config/errorHelpers/AppError';
import prisma from '../../../shared/prisma';
import { IRequestUser } from '../../interfaces/requestUser.interface';


export interface TurfPayload {
  name: string;
  categoryId: string;
  description?: string;
  address: string;
  latitude: number;
  longitude: number;
  basePrice: number;
  slotMinutes?: number;
}

@Injectable()
export class TurfService {

  private validateCoordinates(payload: TurfPayload) {
    if (
      !Number.isFinite(payload.latitude) ||
      payload.latitude < -90 ||
      payload.latitude > 90 ||
      !Number.isFinite(payload.longitude) ||
      payload.longitude < -180 ||
      payload.longitude > 180
    ) {
      throw new AppError(status.BAD_REQUEST, 'Valid latitude and longitude are required');
    }
  }
  
  // Turf List For Admin
  async listForAdmin(query?: {
    search?: string;
    categoryId?: string;
    status?: string;
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

    const sortField = ['name', 'address', 'basePrice', 'createdAt', 'updatedAt', 'status'].includes(query?.sortBy ?? '')
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
        priceRules: { orderBy: [{ dayOfWeek: 'asc' }, { startMinute: 'asc' }] },
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

  async list(query: {
    categoryId?: string;
    minPrice?: number;
    maxPrice?: number;
    lat?: number;
    lng?: number;
    radius?: number;
  }) {
    const where: Prisma.TurfWhereInput = {
      status: TurfStatus.ACTIVE,
      categoryId: query.categoryId,
      basePrice: {
        gte: query.minPrice !== undefined ? new Prisma.Decimal(query.minPrice) : undefined,
        lte: query.maxPrice !== undefined ? new Prisma.Decimal(query.maxPrice) : undefined,
      },
    };

    const turfs = await prisma.turf.findMany({
      where,
      include: {
        category: true,
        images: { orderBy: { sortOrder: 'asc' }, take: 1 },
        facilities: {
          include: { facility: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (query.lat === undefined || query.lng === undefined) {
      return turfs;
    }

    const radiusKm = query.radius ?? 10;
    const earthRadius = 6371;
    const userLatitude = query.lat;
    const userLongitude = query.lng;

    const withDistance = turfs
      .map((turf) => {
        if (turf.latitude === null || turf.longitude === null) {
          return null;
        }

        const lat = Number(turf.latitude);
        const lng = Number(turf.longitude);

        const dLat = this.toRad(lat - userLatitude);
        const dLng = this.toRad(lng - userLongitude);

        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos(this.toRad(userLatitude)) * Math.cos(this.toRad(lat)) * Math.sin(dLng / 2) ** 2;

        const distance = earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return { ...turf, distance };
      })
      .filter((turf): turf is NonNullable<typeof turf> => turf !== null)
      .filter((turf) => turf.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance);

    return withDistance;
  }

  private toRad(value: number): number {
    return (value * Math.PI) / 180;
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
    const sortField = ['name', 'address', 'basePrice', 'createdAt', 'status'].includes(query?.sortBy ?? '')
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

  async findMine(owner: IRequestUser, id: string) {
    const turf = await prisma.turf.findFirst({
      where: { id, ownerId: owner.userId },
      include: {
        category: true,
        facilities: { include: { facility: true } },
        images: { orderBy: { sortOrder: 'asc' } },
        priceRules: { orderBy: [{ dayOfWeek: 'asc' }, { startMinute: 'asc' }] },
        packages: { include: { facilities: { include: { facility: true } } } },
      },
    });

    if (!turf) throw new AppError(status.NOT_FOUND, 'Turf not found');
    return turf;
  }

  async findActive(id: string) {
    const turf = await prisma.turf.findFirst({
      where: {
        id,
        status: TurfStatus.ACTIVE,
      },
      include: {
        category: true,
        facilities: {
          include: { facility: true },
        },
        images: {
          orderBy: { sortOrder: 'asc' },
        },
        packages: {
          where: { active: true },
          include: { facilities: { include: { facility: true } } },
        },
        priceRules: {
          where: { active: true },
        },
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
    this.validateCoordinates(payload);

    const data = await prisma.turf.create({
      data: {
        ownerId: owner.userId,
        categoryId: payload.categoryId,
        name: payload.name,
        description: payload.description,
        address: payload.address,
        latitude: new Prisma.Decimal(payload.latitude),
        longitude: new Prisma.Decimal(payload.longitude),
        basePrice: new Prisma.Decimal(payload.basePrice),
        slotMinutes: payload.slotMinutes ?? 60,
        status: TurfStatus.PENDING_APPROVAL,
      },
    });

    return data;
  }

  async createForAdmin(payload: TurfPayload) {
    this.validateCoordinates(payload);
    const data = await prisma.turf.create({
      data: {
        ownerId: (await prisma.user.findFirst({ where: { role: UserRole.ADMIN }, select: { id: true } }))?.id ?? '',
        categoryId: payload.categoryId,
        name: payload.name,
        description: payload.description,
        address: payload.address,
        latitude: new Prisma.Decimal(payload.latitude),
        longitude: new Prisma.Decimal(payload.longitude),
        basePrice: new Prisma.Decimal(payload.basePrice),
        slotMinutes: payload.slotMinutes ?? 60,
        status: TurfStatus.PENDING_APPROVAL,
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

    return prisma.turf.update({
      where: { id },
      data: {
        name: payload.name,
        categoryId: payload.categoryId,
        description: payload.description,
        address: payload.address,
        slotMinutes: payload.slotMinutes,
        status: TurfStatus.PENDING_APPROVAL,
        basePrice: payload.basePrice !== undefined ? new Prisma.Decimal(payload.basePrice) : undefined,
        ...(payload.latitude === undefined ? {} : { latitude: new Prisma.Decimal(payload.latitude) }),
        ...(payload.longitude === undefined ? {} : { longitude: new Prisma.Decimal(payload.longitude) }),
      },
    });
  }

  async delete(owner: IRequestUser, id: string) {
    const turf = await prisma.turf.findFirst({
      where: { id, ownerId: owner.userId },
    });

    if (!turf) {
      throw new AppError(status.NOT_FOUND, 'Turf not found');
    }

    return prisma.turf.delete({ where: { id } });
  }

  async deleteForAdmin(id: string) {
    const turf = await prisma.turf.findUnique({ where: { id } });
    if (!turf) throw new AppError(status.NOT_FOUND, 'Turf not found');
    return prisma.turf.delete({ where: { id } });
  }
}