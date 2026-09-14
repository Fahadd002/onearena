import { Injectable } from '@nestjs/common';
import status from 'http-status';
import { ManagerPermission, UserRole } from '../../../generated/prisma/enums';
import AppError from '../../../config/errorHelpers/AppError';
import prisma from '../../../shared/prisma';
import { IRequestUser } from '../../interfaces/requestUser.interface';

@Injectable()
export class AuthorizationService {
  async listManagers(owner: IRequestUser) {
    if (owner.role !== UserRole.ADMIN) throw new AppError(status.FORBIDDEN, 'Only owners can view managers');
    return prisma.user.findMany({ where: { role: UserRole.MANAGER, isDeleted: false, status: 'ACTIVE' }, select: { id: true, name: true, email: true }, orderBy: { name: 'asc' } });
  }

  async listAssignments(owner: IRequestUser, turfId: string) {
    const turf = await prisma.turf.findFirst({ where: { id: turfId, ownerId: owner.userId } });
    if (!turf) throw new AppError(status.NOT_FOUND, 'Turf not found');
    return prisma.turfManager.findMany({ where: { turfId }, include: { permissions: true, manager: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: 'desc' } });
  }
  async assignManager(owner: IRequestUser, turfId: string, managerId: string, permissions: ManagerPermission[]) {
    if (owner.role !== UserRole.ADMIN) throw new AppError(status.FORBIDDEN, 'Only owners can assign managers');
    const turf = await prisma.turf.findFirst({ where: { id: turfId, ownerId: owner.userId } });
    const manager = await prisma.user.findFirst({ where: { id: managerId, role: UserRole.MANAGER } });
    if (!turf || !manager) throw new AppError(status.NOT_FOUND, 'Turf or manager not found');

    const data = await prisma.turfManager.upsert({
      where: { turfId_managerId: { turfId, managerId } },
      create: { turfId, managerId, permissions: { create: permissions.map((permission) => ({ permission })) } },
      update: { permissions: { deleteMany: {}, create: permissions.map((permission) => ({ permission })) } },
      include: { permissions: true, manager: { select: { id: true, name: true, email: true } }, turf: { select: { id: true, name: true } } },
    });
    return data;
  }

  async canManage(user: IRequestUser, turfId: string, permission: ManagerPermission) {
    if (user.role === UserRole.ADMIN) {
      return Boolean(await prisma.turf.findFirst({ where: { id: turfId, ownerId: user.userId } }));
    }
    if (user.role !== UserRole.MANAGER) return false;
    return Boolean(await prisma.turfManager.findFirst({ where: { turfId, managerId: user.userId, permissions: { some: { permission } } } }));
  }

  async unassignManager(owner: IRequestUser, turfId: string, managerId: string) {
    const turf = await prisma.turf.findFirst({ where: { id: turfId, ownerId: owner.userId } });
    if (!turf) throw new AppError(status.NOT_FOUND, 'Turf not found');
    const data = await prisma.turfManager.delete({ where: { turfId_managerId: { turfId, managerId } } });
    return data;
  }
}

