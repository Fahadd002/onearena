import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import prisma from '../../../shared/prisma';

@Injectable()
export class FacilityService {
  async list(search?: string, sortBy?: string, sortOrder?: string, page = 1, limit = 10) {
    const where = search ? { name: { contains: search, mode: Prisma.QueryMode.insensitive } } : {};
    const field = sortBy === 'name' ? 'name' : 'createdAt';
    const direction = sortOrder === 'asc' ? 'asc' : 'desc';
    const skip = (page - 1) * limit;

    const [data, total] = await prisma.$transaction([
      prisma.facility.findMany({ where, orderBy: { [field]: direction }, skip, take: limit }),
      prisma.facility.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  create(name: string) { return prisma.facility.create({ data: { name: name.trim() } }); }
  update(id: string, name: string) { return prisma.facility.update({ where: { id }, data: { name: name.trim() } }); }
  delete(id: string) { return prisma.facility.delete({ where: { id } }); }
}
