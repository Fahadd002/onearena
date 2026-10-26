import { Injectable } from '@nestjs/common';
import status from 'http-status';
import { Prisma } from '../../../generated/prisma/client';
import { UserRole } from '../../../generated/prisma/enums';

import AppError from '../../../config/errorHelpers/AppError';
import prisma from '../../../shared/prisma';
import { IRequestUser } from '../../interfaces/requestUser.interface';

export interface SlotTimePayload {
  timeName: string;
  startMinute: number;
  endMinute: number;
  isPeakTime?: boolean;
  slotDuration?: number;
}

type SlotTimeSortField = 'timeName' | 'createdAt';
type SortOrder = 'asc' | 'desc';

@Injectable()
export class TimeService {
  // =========================
  // Helpers
  // =========================

  private getSortField(sortBy?: string): SlotTimeSortField {
    return ['timeName', 'createdAt'].includes(sortBy ?? '')
      ? (sortBy as SlotTimeSortField)
      : 'createdAt';
  }

  private getSortOrder(sortOrder?: string): SortOrder {
    return sortOrder === 'asc' ? 'asc' : 'desc';
  }

  private validateTime(startMinute: number, endMinute: number) {
    if (!Number.isInteger(startMinute) || !Number.isInteger(endMinute)) {
      throw new AppError(
        status.BAD_REQUEST,
        'Start and end minute must be integers',
      );
    }

    if (startMinute < 0 || startMinute >= 1440) {
      throw new AppError(
        status.BAD_REQUEST,
        'Start minute must be between 0 and 1439',
      );
    }

    if (endMinute < 1 || endMinute > 1440) {
      throw new AppError(
        status.BAD_REQUEST,
        'End minute must be between 1 and 1440',
      );
    }

    if (startMinute >= endMinute) {
      throw new AppError(
        status.BAD_REQUEST,
        'End time must be greater than start time',
      );
    }
  }

  private async assertNoOverlap(
    ownerId: string,
    startMinute: number,
    endMinute: number,
    excludeId?: string,
  ) {
    const overlapping = await prisma.slotTimeSetup.findFirst({
      where: {
        ownerId,
        ...(excludeId ? { id: { not: excludeId } } : {}),
        startMinute: { lt: endMinute },
        endMinute: { gt: startMinute },
      },
      select: { id: true, timeName: true, startMinute: true, endMinute: true },
    });

    if (overlapping) {
      const fmt = (m: number) =>
        `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
      throw new AppError(
        status.CONFLICT,
        `Time window overlaps with "${overlapping.timeName}" (${fmt(
          overlapping.startMinute,
        )} – ${fmt(overlapping.endMinute)})`,
      );
    }
  }

  // =========================
  // Slot Time Setup — simple list (dropdowns)
  // =========================

  async listSlotTimeSetups(owner: IRequestUser) {
    return prisma.slotTimeSetup.findMany({
      where: { ownerId: owner.userId },
      orderBy: [{ startMinute: 'asc' }, { timeName: 'asc' }],
    });
  }

  // =========================
  // List mine (paginated)
  // =========================

  async listMine(
    owner: IRequestUser,
    query?: {
      search?: string;
      sortBy?: string;
      sortOrder?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const page = Math.max(1, query?.page ?? 1);
    const limit = Math.min(100, Math.max(1, query?.limit ?? 10));

    const where: Prisma.SlotTimeSetupWhereInput = {
      ownerId: owner.userId,
      ...(query?.search?.trim()
        ? {
            timeName: {
              contains: query.search.trim(),
              mode: 'insensitive',
            },
          }
        : {}),
    };

    const sortBy = this.getSortField(query?.sortBy);
    const sortOrder = this.getSortOrder(query?.sortOrder);

    const [data, total] = await prisma.$transaction([
      prisma.slotTimeSetup.findMany({
        where,
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip: (page - 1) * limit,
        take: limit,
      }),

      prisma.slotTimeSetup.count({ where }),
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

  // =========================
  // Find mine
  // =========================

  async findMine(owner: IRequestUser, id: string) {
    const slotTime = await prisma.slotTimeSetup.findFirst({
      where: {
        id,
        ownerId: owner.userId,
      },
    });

    if (!slotTime) {
      throw new AppError(status.NOT_FOUND, 'Slot time setup not found');
    }

    return slotTime;
  }

  // =========================
  // Create
  // =========================

  async create(owner: IRequestUser, payload: SlotTimePayload) {
    if (owner.role !== UserRole.ADMIN) {
      throw new AppError(
        status.FORBIDDEN,
        'Only approved owners can create slot time setups',
      );
    }

    const timeName = payload.timeName?.trim();

    if (!timeName) {
      throw new AppError(status.BAD_REQUEST, 'Time name is required');
    }

    this.validateTime(payload.startMinute, payload.endMinute);

    // Reject if it overlaps any existing window for this owner
    await this.assertNoOverlap(
      owner.userId,
      payload.startMinute,
      payload.endMinute,
    );

    const existing = await prisma.slotTimeSetup.findUnique({
      where: {
        startMinute_endMinute_timeName_ownerId: {
          startMinute: payload.startMinute,
          endMinute: payload.endMinute,
          timeName,
          ownerId: owner.userId,
        },
      },
    });

    if (existing) {
      throw new AppError(status.CONFLICT, 'This slot time already exists');
    }

    return prisma.slotTimeSetup.create({
      data: {
        timeName,
        startMinute: payload.startMinute,
        endMinute: payload.endMinute,
        isPeakTime: payload.isPeakTime ?? false,
        slotDuration: payload.slotDuration ?? 90,
        ownerId: owner.userId,
      },
    });
  }

  // =========================
  // Update
  // =========================

  async update(
    owner: IRequestUser,
    id: string,
    payload: Partial<SlotTimePayload>,
  ) {
    const slotTime = await prisma.slotTimeSetup.findFirst({
      where: {
        id,
        ownerId: owner.userId,
      },
    });

    if (!slotTime) {
      throw new AppError(status.NOT_FOUND, 'Slot time setup not found');
    }

    const timeName =
      payload.timeName !== undefined
        ? payload.timeName.trim()
        : slotTime.timeName;

    const startMinute = payload.startMinute ?? slotTime.startMinute;
    const endMinute = payload.endMinute ?? slotTime.endMinute;

    if (!timeName) {
      throw new AppError(status.BAD_REQUEST, 'Time name is required');
    }

    this.validateTime(startMinute, endMinute);

    // Reject if the new range overlaps any OTHER window for this owner
    await this.assertNoOverlap(owner.userId, startMinute, endMinute, id);

    const duplicate = await prisma.slotTimeSetup.findUnique({
      where: {
        startMinute_endMinute_timeName_ownerId: {
          startMinute,
          endMinute,
          timeName,
          ownerId: owner.userId,
        },
      },
    });

    if (duplicate && duplicate.id !== id) {
      throw new AppError(status.CONFLICT, 'This slot time already exists');
    }

    return prisma.slotTimeSetup.update({
      where: { id },
      data: {
        timeName,
        startMinute,
        endMinute,
        isPeakTime: payload.isPeakTime ?? slotTime.isPeakTime,
        slotDuration: payload.slotDuration ?? slotTime.slotDuration,
      },
    });
  }

  // =========================
  // Delete
  // =========================

  async delete(owner: IRequestUser, id: string) {
    const slotTime = await prisma.slotTimeSetup.findFirst({
      where: {
        id,
        ownerId: owner.userId,
      },
    });

    if (!slotTime) {
      throw new AppError(status.NOT_FOUND, 'Slot time setup not found');
    }

    return prisma.slotTimeSetup.delete({
      where: { id },
    });
  }
}