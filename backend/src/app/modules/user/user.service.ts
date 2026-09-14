import { Injectable } from '@nestjs/common';
import status from 'http-status';
import { UserRole, UserStatus } from '../../../generated/prisma/enums';
import { Prisma } from '../../../generated/prisma/client';
import AppError from '../../../config/errorHelpers/AppError';
import prisma from '../../../shared/prisma';

import IDropdownOption from '../../../types/dropdown';

@Injectable()
export class UserService {
  async listAdminDropdown(): Promise<IDropdownOption[]> {
    const admins = await prisma.user.findMany({
      where: {
        role: UserRole.ADMIN,
        ownerProfile: {
          verificationStatus: 'APPROVED',
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    return admins.map((admin) => ({
      label: `${admin.name} (${admin.email})`,
      value: admin.id,
    }));
  }

  async list(
    search?: string,
    sortBy?: string,
    sortOrder?: string,
    role?: string,
    userStatus?: string,
    page = 1,
    limit = 10,
  ) {
    const where: Prisma.UserWhereInput = { isDeleted: false };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { email: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { ownerProfile: { contactNumber: { contains: search, mode: Prisma.QueryMode.insensitive } } },
      ];
    }

    if (role) {
      where.role = role as UserRole;
    }

    if (userStatus) {
      where.status = userStatus as UserStatus;
    }

    const orderBy = this.buildUserOrderBy(sortBy, sortOrder);
    const skip = (page - 1) * limit;

    const [data, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        select: {
          id: true, name: true, email: true, image: true, role: true, status: true,
          emailVerified: true, createdAt: true, updatedAt: true,
          ownerProfile: { select: { contactNumber: true, verificationStatus: true } },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  private buildUserOrderBy(
    sortBy?: string,
    sortOrder?: string,
  ): Prisma.UserOrderByWithRelationInput {
    const direction = sortOrder === 'asc' ? 'asc' : 'desc';
    const field = sortBy || 'createdAt';

    const sortableFields: Record<string, Prisma.UserOrderByWithRelationInput> = {
      name: { name: direction },
      role: { role: direction },
      status: { status: direction },
      createdAt: { createdAt: direction },
      email: { email: direction },
    };

    return sortableFields[field] || { createdAt: direction };
  }

  async create(body: { name: string; email: string; role: UserRole }) {
    const data = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        role: body.role,
        status: UserStatus.ACTIVE,
      },
      select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
    });
    return data as { id: string; name: string; email: string; role: UserRole; status: UserStatus; createdAt: Date };
  }

  async updateStatus(id: string, status: string) {
    if (!Object.values(UserStatus).includes(status as UserStatus)) {
      throw new AppError(400, 'Invalid status');
    }
    const data = await prisma.user.update({ where: { id }, data: { status: status as UserStatus } });
    return data;
  }

  async updateRole(id: string, role: string) {
    if (!Object.values(UserRole).includes(role as UserRole)) {
      throw new AppError(status.BAD_REQUEST, 'Invalid role');
    }
    const existing = await prisma.user.findFirst({ where: { id, isDeleted: false } });
    if (!existing) throw new AppError(status.NOT_FOUND, 'User not found');
    if (existing.role === UserRole.SUPER_ADMIN) {
      throw new AppError(status.FORBIDDEN, 'Super-admin role cannot be changed');
    }
    if (existing.role === role) {
      return existing;
    }
    const data = await prisma.user.update({
      where: { id },
      data: { role: role as UserRole },
      select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
    });
    return data;
  }

  async remove(id: string) {
    const user = await prisma.user.findFirst({ where: { id } });
    if (!user) throw new AppError(status.NOT_FOUND, 'User not found');
    const data = await prisma.user.update({ where: { id }, data: { isDeleted: true, deletedAt: new Date() } });
    return data;
  }
}
