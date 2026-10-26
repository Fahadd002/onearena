import { Injectable } from '@nestjs/common';
import status from 'http-status';
import { UserRole, UserStatus } from '../../../generated/prisma/enums';
import { Prisma } from '../../../generated/prisma/client';
import AppError from '../../../config/errorHelpers/AppError';
import prisma from '../../../shared/prisma';
import { auth } from '../../lib/auth';

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
        { phoneNumber: { contains: search, mode: Prisma.QueryMode.insensitive } },
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
        phoneNumber: body.email,
        role: body.role,
        status: UserStatus.ACTIVE,
      },
      select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
    });
    return data as { id: string; name: string; email: string; role: UserRole; status: UserStatus; createdAt: Date };
  }

  /**
   * Creates a user from the admin/manager dashboard.
   *
   * The user is identified by `phoneNumber` (required, unique). An optional
   * `email` may be supplied; when omitted the account is phone-only.
   *
   * A default password is generated and stored through better-auth's
   * credential account link so the user can log in. `needPasswordChange` is
   * forced to `true` so the user is prompted to set their own password on
   * first login.
   */
  async createByPhone(body: {
    name: string;
    phoneNumber: string;
    email?: string | null;
    role: UserRole;
    defaultPassword: string;
  }) {
    const normalizedPhone = body.phoneNumber.trim();
    if (!normalizedPhone) {
      throw new AppError(status.BAD_REQUEST, 'Phone number is required');
    }
    if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      throw new AppError(status.BAD_REQUEST, 'Invalid email address');
    }

    const existingPhone = await prisma.user.findUnique({ where: { phoneNumber: normalizedPhone } });
    if (existingPhone) {
      throw new AppError(status.CONFLICT, 'A user with this phone number already exists');
    }
    if (body.email) {
      const existingEmail = await prisma.user.findUnique({ where: { email: body.email } });
      if (existingEmail) {
        throw new AppError(status.CONFLICT, 'A user with this email already exists');
      }
    }

    const ctx = await auth.$context;
    const hashedPassword = await ctx.password.hash(body.defaultPassword);

    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email ?? null,
        phoneNumber: normalizedPhone,
        role: body.role,
        status: UserStatus.ACTIVE,
        needPasswordChange: true,
      },
    });

    await ctx.internalAdapter.linkAccount({
      userId: user.id,
      providerId: 'credential',
      issuer: 'local:credential',
      accountId: user.id,
      password: hashedPassword,
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      status: user.status,
      needPasswordChange: user.needPasswordChange,
      createdAt: user.createdAt,
    };
  }

  async findByNameOrPhone(search: string) {
    const normalized = search.trim();
    if (!normalized) return [];
    const users = await prisma.user.findMany({
      where: {
        isDeleted: false,
        role: UserRole.USER,
        OR: [
          { name: { contains: normalized, mode: Prisma.QueryMode.insensitive } },
          { phoneNumber: { contains: normalized, mode: Prisma.QueryMode.insensitive } },
          { email: { contains: normalized, mode: Prisma.QueryMode.insensitive } },
        ],
      },
      select: {
        id: true, name: true, email: true, phoneNumber: true
      },
      take: 20,
    });

    return users;
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
