import { Injectable } from '@nestjs/common';
import status from 'http-status';
import AppError from '../../../config/errorHelpers/AppError';
import { uploadFileToCloudinary } from '../../../config/cloudinary.config';
import prisma from '../../../shared/prisma';
import { Prisma } from '../../../generated/prisma/client';
import { IRequestUser } from '../../interfaces/requestUser.interface';
import fs from 'fs';
import path from 'path';

interface IOwnerProfilePayload {
  name?: string;
  image?: string | null;
  companyName?: string;
  bussinessEmail?: string;
  contactNumber?: string;
  address?: string;
  nidNumber?: string;
  businessRegistrationNumber?: string;
  tradeLicenseNumber?: string;
}

@Injectable()
export class OwnerProfileService {
  async getOwnerProfile(user: IRequestUser) {
    return prisma.ownerProfile.findUnique({
      where: { userId: user.userId },
      include: { user: { select: { id: true, name: true, email: true, image: true, role: true } } },
    });
  }

  async getOwnerApplicationById(profileId: string) {
    const profile = await prisma.ownerProfile.findUnique({
      where: { id: profileId },
      include: { user: { select: { id: true, name: true, email: true, image: true, role: true } } },
    });

    if (!profile) {
      throw new AppError(status.NOT_FOUND, 'Owner application not found');
    }

    return profile;
  }

  async updateOwnerProfile(user: IRequestUser, payload: IOwnerProfilePayload) {
    const { name, image, ...profileData } = payload;

    const requiredFields = [
      profileData.companyName,
      profileData.bussinessEmail,
      profileData.contactNumber,
      profileData.address,
      profileData.nidNumber,
      profileData.businessRegistrationNumber,
      profileData.tradeLicenseNumber,
    ];
    if (requiredFields.some((field) => !field)) {
      throw new AppError(status.BAD_REQUEST, 'Complete all owner profile fields before submitting');
    }

    return prisma.$transaction(async (tx) => {
      if (name !== undefined || image !== undefined) {
        await tx.user.update({
          where: { id: user.userId },
          data: { name, image },
        });
      }

      const existingProfile = await tx.ownerProfile.findUnique({
        where: { userId: user.userId },
      });

      if (!existingProfile) {
        return tx.ownerProfile.create({
          data: {
            userId: user.userId,
            companyName: profileData.companyName || '',
            bussinessEmail: profileData.bussinessEmail || '',
            contactNumber: profileData.contactNumber || '',
            address: profileData.address || '',
            nidNumber: profileData.nidNumber || '',
            businessRegistrationNumber: profileData.businessRegistrationNumber || '',
            tradeLicenseNumber: profileData.tradeLicenseNumber || '',
            verificationStatus: 'SUBMITTED',
          },
          include: { user: { select: { id: true, name: true, email: true, image: true, role: true } } },
        });
      }

      // A rejected owner can resubmit by saving again. Otherwise the httpStatus
      // is owned exclusively by the super-admin and must not change.
      const isResubmissionAfterRejection = existingProfile.verificationStatus === 'REJECTED';
      const nextStatus = isResubmissionAfterRejection ? 'SUBMITTED' : existingProfile.verificationStatus;

      return tx.ownerProfile.update({
        where: { userId: user.userId },
        data: {
          ...profileData,
          verificationStatus: nextStatus,
          rejectionReason: isResubmissionAfterRejection ? null : existingProfile.rejectionReason,
        },
        include: { user: { select: { id: true, name: true, email: true, image: true, role: true } } },
      });
    });
  }

  async submitOwnerProfile(user: IRequestUser, payload: IOwnerProfilePayload) {
    const { name, image, ...profileData } = payload;

    const requiredFields = [
      profileData.companyName,
      profileData.bussinessEmail,
      profileData.contactNumber,
      profileData.address,
      profileData.nidNumber,
      profileData.businessRegistrationNumber,
      profileData.tradeLicenseNumber,
    ];
    if (requiredFields.some((field) => !field)) {
      throw new AppError(status.BAD_REQUEST, 'Complete all owner profile fields before submitting');
    }

    return prisma.$transaction(async (tx) => {
      if (name !== undefined || image !== undefined) {
        await tx.user.update({
          where: { id: user.userId },
          data: { name, image },
        });
      }

      return tx.ownerProfile.upsert({
        where: { userId: user.userId },
        create: {
          userId: user.userId,
          companyName: profileData.companyName || '',
          bussinessEmail: profileData.bussinessEmail || '',
          contactNumber: profileData.contactNumber || '',
          address: profileData.address || '',
          nidNumber: profileData.nidNumber || '',
          businessRegistrationNumber: profileData.businessRegistrationNumber || '',
          tradeLicenseNumber: profileData.tradeLicenseNumber || '',
          verificationStatus: 'SUBMITTED',
        },
        update: {
          ...profileData,
          verificationStatus: 'SUBMITTED',
          rejectionReason: null,
        },
        include: { user: { select: { id: true, name: true, email: true, image: true, role: true } } },
      });
    });
  }

  async uploadImage(user: IRequestUser, file: Express.Multer.File) {
    if (!file) {
      throw new AppError(status.BAD_REQUEST, 'No file provided');
    }

    const uploadResult = await uploadFileToCloudinary(
      file.buffer,
      file.originalname,
    );

    return prisma.user.update({
      where: { id: user.userId },
      data: { image: uploadResult.secure_url },
    });
  }

  async listOwnerApplications(search?: string, sortBy?: string, sortOrder?: string, page = 1, limit = 10, httpStatus?: string) {
    const where: Prisma.OwnerProfileWhereInput = {};

    if (httpStatus && httpStatus !== 'ALL') {
      where.verificationStatus = httpStatus as 'PENDING' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
    }

    if (search) {
      where.OR = [
        { user: { name: { contains: search, mode: Prisma.QueryMode.insensitive } } },
        { user: { email: { contains: search, mode: Prisma.QueryMode.insensitive } } },
        { contactNumber: { contains: search, mode: Prisma.QueryMode.insensitive } } ,
        { nidNumber: { contains: search, mode: Prisma.QueryMode.insensitive } } ,
        { address: { contains: search, mode: Prisma.QueryMode.insensitive } } ,
        { businessRegistrationNumber: { contains: search, mode: Prisma.QueryMode.insensitive } } ,
        { tradeLicenseNumber: { contains: search, mode: Prisma.QueryMode.insensitive } } ,
      ];
    }

    const orderBy = this.buildOwnerApplicationOrderBy(sortBy, sortOrder);
    const skip = (page - 1) * limit;

    const [data, total] = await prisma.$transaction([
      prisma.ownerProfile.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true, image: true, role: true } } },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.ownerProfile.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  private buildOwnerApplicationOrderBy(sortBy?: string, sortOrder?: string): Prisma.OwnerProfileOrderByWithRelationInput {
    const direction = sortOrder === 'asc' ? 'asc' : 'desc';
    const field = sortBy || 'updatedAt';

    switch (field) {
      case 'contactNumber':
        return { contactNumber: direction };
      case 'nidNumber':
        return { nidNumber: direction };
      case 'businessRegistrationNumber':
        return { businessRegistrationNumber: direction };
      case 'tradeLicenseNumber':
        return { tradeLicenseNumber: direction };
      case 'updatedAt':
        return { updatedAt: direction };
      case 'createdAt':
        return { createdAt: direction };
      default:
        return { updatedAt: direction };
    }
  }


  async updateOwnerApplicationStatus(profileId: string, reviewer: IRequestUser, httpStatus: string, reason?: string) {
    const profile = await prisma.ownerProfile.findUnique({ where: { id: profileId } });
    if (!profile) throw new AppError(status.NOT_FOUND, 'Owner application not found');

    if (httpStatus === 'APPROVED') {
      if (profile.verificationStatus === 'REJECTED') {
        throw new AppError(status.BAD_REQUEST, 'A rejected application must be submitted again before approval');
      }

      return prisma.ownerProfile.update({
        where: { id: profileId },
        data: {
          verificationStatus: 'APPROVED',
          verifiedById: reviewer.userId,
          verifiedAt: new Date(),
          rejectionReason: null,
        },
        include: { user: { select: { id: true, name: true, email: true, image: true, role: true } } },
      });
    }

    if (httpStatus === 'REJECTED') {
      if (!reason?.trim()) throw new AppError(status.BAD_REQUEST, 'A rejection reason is required');
      return prisma.ownerProfile.update({
        where: { id: profileId },
        data: { verificationStatus: 'REJECTED', rejectionReason: reason.trim(), verifiedById: null, verifiedAt: null },
        include: { user: { select: { id: true, name: true, email: true, image: true, role: true } } },
      });
    }

    if (httpStatus === 'PENDING') {
      if (!reason?.trim()) throw new AppError(status.BAD_REQUEST, 'A reason is required');
      return prisma.ownerProfile.update({
        where: { id: profileId },
        data: { verificationStatus: 'PENDING', rejectionReason: reason.trim(), verifiedById: null, verifiedAt: null },
        include: { user: { select: { id: true, name: true, email: true, image: true, role: true } } },
      });
    }

    throw new AppError(status.BAD_REQUEST, 'Invalid httpStatus');
  }

  async uploadDocuments(user: IRequestUser, files: Record<string, Express.Multer.File[]>) {
    if (!files || Object.keys(files).length === 0) {
      throw new AppError(status.BAD_REQUEST, 'No files provided');
    }

    // Extract file paths from uploaded files
    const documentPaths: Record<string, string> = {};
    
    Object.entries(files).forEach(([fieldName, fileArray]) => {
      if (fileArray && fileArray.length > 0) {
        const file = fileArray[0];
        // Store relative path for accessing via Express.static
        const relativePath = `/uploads/owner-profile/${user.userId}/${file.filename}`;
        documentPaths[fieldName] = relativePath;
      }
    });

    // Get current profile to check existing documents
    const currentProfile = await prisma.ownerProfile.findUnique({
      where: { userId: user.userId },
    });

    // Build update data with only new files
    const updateData: any = {
      verificationStatus: 'SUBMITTED',
    };

    // Only update fields that have new files
    if (documentPaths.nidImageFront) updateData.nidImageFront = documentPaths.nidImageFront;
    if (documentPaths.nidImageBack) updateData.nidImageBack = documentPaths.nidImageBack;
    if (documentPaths.businessRegistrationDocument)
      updateData.businessRegistrationDocument = documentPaths.businessRegistrationDocument;
    if (documentPaths.tradeLicenseDocument) updateData.tradeLicenseDocument = documentPaths.tradeLicenseDocument;
    if (documentPaths.taxIdentificationDocument) updateData.taxIdentificationDocument = documentPaths.taxIdentificationDocument;
    if (documentPaths.businessLogo) updateData.businessLogo = documentPaths.businessLogo;

    // After update, check if all required documents will be present
    const requiredDocumentFields = [
      'nidImageFront',
      'nidImageBack',
      'businessRegistrationDocument',
      'tradeLicenseDocument',
      'taxIdentificationDocument',
      'businessLogo',
    ];

    // Check if all required documents exist (either new or existing)
    const missingDocuments = requiredDocumentFields.filter((field) => {
      const hasNewFile = !!updateData[field];
      const hasExistingFile = currentProfile && !!currentProfile[field as keyof typeof currentProfile];
      return !hasNewFile && !hasExistingFile;
    });

    if (missingDocuments.length > 0) {
      throw new AppError(
        status.BAD_REQUEST,
        `Missing required documents: ${missingDocuments.join(', ')}`
      );
    }

    return prisma.ownerProfile.update({
      where: { userId: user.userId },
      data: updateData,
      include: { user: { select: { id: true, name: true, email: true, image: true, role: true } } },
    });
  }

  async deleteDocument(user: IRequestUser, documentType: string) {
    // Validate document type
    const validDocumentTypes = [
      'nidImageFront',
      'nidImageBack',
      'businessRegistrationDocument',
      'tradeLicenseDocument',
      'taxIdentificationDocument',
      'businessLogo',
    ];

    if (!validDocumentTypes.includes(documentType)) {
      throw new AppError(status.BAD_REQUEST, 'Invalid document type');
    }

    // Get current profile
    const profile = await prisma.ownerProfile.findUnique({
      where: { userId: user.userId },
    });

    if (!profile) {
      throw new AppError(status.NOT_FOUND, 'Owner profile not found');
    }

    // Check if profile is already approved - cannot delete documents if approved
    if (profile.verificationStatus === 'APPROVED') {
      throw new AppError(
        status.FORBIDDEN,
        'Cannot delete documents from an approved profile'
      );
    }

    // Get the current document path
    const currentDocPath = profile[documentType as keyof typeof profile] as string | null;

    // Delete file from filesystem if it exists
    if (currentDocPath) {
      try {
        const filePath = path.join(process.cwd(), currentDocPath.replace(/^\//, ''));
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (error) {
        // Log error but continue with database update
        console.error(`Failed to delete file at ${currentDocPath}:`, error);
      }
    }

    // Update profile to remove the document reference
    const updateData: any = { [documentType]: null };

    return prisma.ownerProfile.update({
      where: { userId: user.userId },
      data: updateData,
      include: { user: { select: { id: true, name: true, email: true, image: true, role: true } } },
    });
  }
}
