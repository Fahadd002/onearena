import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import prisma from '../../../shared/prisma';

@Injectable()
export class CategoryService {
  async list(search?: string, sortBy?: string, sortOrder?: string, page = 1, limit = 10) {
    const where = search ? { name: { contains: search, mode: Prisma.QueryMode.insensitive } } : {};
    const field = sortBy === 'name' ? 'name' : 'createdAt';
    const direction = sortOrder === 'asc' ? 'asc' : 'desc';
    const skip = (page - 1) * limit;

    const [data, total] = await prisma.$transaction([
      prisma.turfCategory.findMany({ where, orderBy: { [field]: direction }, skip, take: limit }),
      prisma.turfCategory.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async listAll(): Promise<{ id: string; name: string }[]> {
    return prisma.turfCategory.findMany({ orderBy: { name: 'asc' } });
  }

  create(name: string) { return prisma.turfCategory.create({ data: { name: name.trim() } }); }
  update(id: string, name: string) { return prisma.turfCategory.update({ where: { id }, data: { name: name.trim() } }); }
  delete(id: string) { return prisma.turfCategory.delete({ where: { id } }); }
}
