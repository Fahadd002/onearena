import { Injectable } from '@nestjs/common';
import status from 'http-status';

import AppError from '../../../config/errorHelpers/AppError';
import { uploadFileToCloudinary } from '../../../config/cloudinary.config';
import prisma from '../../../shared/prisma';
import { IRequestUser } from '../../interfaces/requestUser.interface';

@Injectable()
export class TurfImageService {
  list(turfId: string) {
    return prisma.turfImage.findMany({
      where: {
        turfId,
      },
      orderBy: {
        sortOrder: 'asc',
      },
    });
  }

  async create(
    user: IRequestUser,
    turfId: string,
    data: {
      url: string;
      altText?: string;
      sortOrder?: number;
    },
  ) {
    await this.assertOwner(user, turfId);

    return prisma.turfImage.create({
      data: {
        turfId,
        url: data.url,
        altText: data.altText,
        sortOrder: data.sortOrder ?? 0,
      },
    });
  }

  async createMany(user: IRequestUser, turfId: string, files: Express.Multer.File[]) {
    await this.assertOwner(user, turfId);
    if (!files?.length) throw new AppError(status.BAD_REQUEST, 'At least one image is required');

    const uploads = await Promise.all(
      files.map((file) => uploadFileToCloudinary(file.buffer, file.originalname)),
    );

    return prisma.turfImage.createManyAndReturn({
      data: uploads.map((upload, index) => ({
        turfId,
        url: upload.secure_url,
        sortOrder: index,
      })),
    });
  }

  async update(
    user: IRequestUser,
    id: string,
    data: {
      url?: string;
      altText?: string;
      sortOrder?: number;
    },
  ) {
    const image = await prisma.turfImage.findUnique({
      where: {
        id,
      },
    });

    if (!image) {
      throw new AppError(
        status.NOT_FOUND,
        'Turf image not found',
      );
    }

    await this.assertOwner(user, image.turfId);

    return prisma.turfImage.update({
      where: {
        id,
      },
      data,
    });
  }

  async delete(
    user: IRequestUser,
    id: string,
  ) {
    const image = await prisma.turfImage.findUnique({
      where: {
        id,
      },
    });

    if (!image) {
      throw new AppError(
        status.NOT_FOUND,
        'Turf image not found',
      );
    }

    await this.assertOwner(user, image.turfId);

    return prisma.turfImage.delete({
      where: {
        id,
      },
    });
  }

  private async assertOwner(
    user: IRequestUser,
    turfId: string,
  ) {
    const turf = await prisma.turf.findFirst({
      where: {
        id: turfId,
        ownerId: user.userId,
      },
    });

    if (user.role !== 'ADMIN' || !turf) {
      throw new AppError(
        status.FORBIDDEN,
        'Turf access denied',
      );
    }
  }
}