import { Injectable } from '@nestjs/common';
import status from 'http-status';
import AppError from '../../../config/errorHelpers/AppError';
import prisma from '../../../shared/prisma';
import { Prisma, SubscriptionStatus } from '../../../generated/prisma/client';
import { IRequestUser } from '../../interfaces/requestUser.interface';
import { deleteFile } from '../../helpers/file';

interface IOwnerProfilePayload {
  name?: string;
  image?: string | null;
  // Mandatory profile fields
  companyName?: string;
  bussinessEmail?: string;
  contactNumber?: string;
  address?: string;
  nidNumber?: string;
  tradeLicenseNumber?: string;
  // Non-mandatory profile fields
  etin?: string;
  bin?: string;
}

// Mandatory fields required for profile submission/verification
const MANDATORY_PROFILE_FIELDS = [
  'companyName',
  'bussinessEmail',
  'contactNumber',
  'address',
  'nidNumber',
  'tradeLicenseNumber',
] as const;

// Mandatory document fields required for verification
const MANDATORY_DOCUMENT_FIELDS = [
  'nidImage',
  'tradeLicenseDocument',
  'businessLogo',
] as const;

// Valid document field names for delete/upload
const VALID_DOCUMENT_TYPES = [
  'nidImage',
  'tradeLicenseDocument',
  'businessLogo',
  'etinDocument',
  'binDocument',
] as const;

@Injectable()
export class OwnerProfileService {
  async getOwnerProfile(user: IRequestUser) {
    return prisma.ownerProfile.findUnique({
      where: { userId: user.userId },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true, role: true },
        },
      },
    });
  }

  async getOwnerApplicationById(profileId: string) {
    const profile = await prisma.ownerProfile.findUnique({
      where: { id: profileId },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true, role: true },
        },
      },
    });

    if (!profile) {
      throw new AppError(status.NOT_FOUND, 'Owner application not found');
    }

    return profile;
  }

  /**
   * Save profile (draft). All fields optional.
   * Status only moves to SUBMITTED on explicit submit or resubmission after rejection.
   */
  async updateOwnerProfile(user: IRequestUser, payload: IOwnerProfilePayload) {
    const { name, image, ...profileData } = payload;

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

      // Only pass through fields that exist in schema (strip undefined)
      const cleanProfileData = this.pickDefinedFields(profileData);

      if (!existingProfile) {
        return tx.ownerProfile.create({
          data: {
            userId: user.userId,
            ...cleanProfileData,
            verificationStatus: 'CREATED',
          },
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true, role: true },
            },
          },
        });
      }

      // Resubmission after rejection resets to SUBMITTED
      const isResubmissionAfterRejection =
        existingProfile.verificationStatus === 'REJECTED';

      const nextStatus = isResubmissionAfterRejection
        ? 'SUBMITTED'
        : existingProfile.verificationStatus;

      return tx.ownerProfile.update({
        where: { userId: user.userId },
        data: {
          ...cleanProfileData,
          verificationStatus: nextStatus,
          rejectionReason: isResubmissionAfterRejection
            ? null
            : existingProfile.rejectionReason,
        },
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true, role: true },
          },
        },
      });
    });
  }

  /**
   * Submit profile for verification.
   * Validates all mandatory PROFILE + DOCUMENT fields are present.
   */
  async submitOwnerProfile(user: IRequestUser, payload: IOwnerProfilePayload) {
    const { name, image, ...profileData } = payload;

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

      const cleanProfileData = this.pickDefinedFields(profileData);

      // Merge incoming payload with existing profile to validate completeness
      const merged = {
        ...(existingProfile ?? {}),
        ...cleanProfileData,
      } as Record<string, unknown>;

      // Validate mandatory profile fields
      const missingProfileFields = MANDATORY_PROFILE_FIELDS.filter(
        (field) => !merged[field],
      );

      if (missingProfileFields.length > 0) {
        throw new AppError(
          status.BAD_REQUEST,
          `Complete all mandatory profile fields before submitting: ${missingProfileFields.join(', ')}`,
        );
      }

      // Validate mandatory document fields
      const missingDocuments = MANDATORY_DOCUMENT_FIELDS.filter(
        (field) => !merged[field],
      );

      if (missingDocuments.length > 0) {
        throw new AppError(
          status.BAD_REQUEST,
          `Upload all mandatory documents before submitting: ${missingDocuments.join(', ')}`,
        );
      }

      return tx.ownerProfile.upsert({
        where: { userId: user.userId },
        create: {
          userId: user.userId,
          ...cleanProfileData,
          verificationStatus: 'SUBMITTED',
        },
        update: {
          ...cleanProfileData,
          verificationStatus: 'SUBMITTED',
          rejectionReason: null,
        },
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true, role: true },
          },
        },
      });
    });
  }

  async listOwnerApplications(
    search?: string,
    sortBy?: string,
    sortOrder?: string,
    page = 1,
    limit = 10,
    verificationStatus?: string,
  ) {
    const where: Prisma.OwnerProfileWhereInput = {};

    if (verificationStatus && verificationStatus !== 'ALL') {
      where.verificationStatus = verificationStatus as
        | 'CREATED'
        | 'SUBMITTED'
        | 'APPROVED'
        | 'REJECTED'
        | 'PENDING';
    }

    if (search) {
      where.OR = [
        { user: { name: { contains: search, mode: Prisma.QueryMode.insensitive } } },
        { user: { email: { contains: search, mode: Prisma.QueryMode.insensitive } } },
        { contactNumber: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { nidNumber: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { address: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { tradeLicenseNumber: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { etin: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { bin: { contains: search, mode: Prisma.QueryMode.insensitive } },
      ];
    }

    const orderBy = this.buildOwnerApplicationOrderBy(sortBy, sortOrder);
    const skip = (page - 1) * limit;

    const [data, total] = await prisma.$transaction([
      prisma.ownerProfile.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true, role: true },
          },
        },
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

  private buildOwnerApplicationOrderBy(
    sortBy?: string,
    sortOrder?: string,
  ): Prisma.OwnerProfileOrderByWithRelationInput {
    const direction = sortOrder === 'asc' ? 'asc' : 'desc';
    const field = sortBy || 'updatedAt';

    switch (field) {
      case 'contactNumber':
        return { contactNumber: direction };
      case 'nidNumber':
        return { nidNumber: direction };
      case 'tradeLicenseNumber':
        return { tradeLicenseNumber: direction };
      case 'etin':
        return { etin: direction };
      case 'bin':
        return { bin: direction };
      case 'updatedAt':
        return { updatedAt: direction };
      case 'createdAt':
        return { createdAt: direction };
      default:
        return { updatedAt: direction };
    }
  }

  async updateOwnerApplicationStatus(
    profileId: string,
    reviewer: IRequestUser,
    newStatus: string,
    reason?: string,
  ) {

    const profile = await prisma.ownerProfile.findUnique({
      where: { id: profileId },
    });

    
    if (!profile) throw new AppError(status.NOT_FOUND, 'Owner application not found');
    
     const hasValidSubscription = await prisma.subscription.findUnique({where: { userId: profile?.userId }});
     if (!hasValidSubscription) throw new AppError(status.NOT_FOUND, 'No subscription is activated, Tell the owner to take a subscription');
     if (hasValidSubscription.status === SubscriptionStatus.INACTIVE) throw new AppError(status.BAD_REQUEST, 'You need to confirm the subscription before approving this application');

    if (newStatus === 'APPROVED') {
      if (profile.verificationStatus === 'REJECTED') {
        throw new AppError(
          status.BAD_REQUEST,
          'A rejected application must be submitted again before approval',
        );
      }

      // Verify mandatory fields are present before approving
      const missingProfileFields = MANDATORY_PROFILE_FIELDS.filter(
        (field) => !profile[field],
      );
      const missingDocuments = MANDATORY_DOCUMENT_FIELDS.filter(
        (field) => !profile[field],
      );

      if (missingProfileFields.length > 0 || missingDocuments.length > 0) {
        throw new AppError(
          status.BAD_REQUEST,
          'Cannot approve: mandatory profile fields or documents are missing',
        );
      }

      return prisma.ownerProfile.update({
        where: { id: profileId },
        data: {
          verificationStatus: 'APPROVED',
          verifiedById: reviewer.userId,
          verifiedAt: new Date(),
          rejectionReason: null,
        },
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true, role: true },
          },
        },
      });
    }

    if (newStatus === 'REJECTED') {
      if (!reason?.trim())
        throw new AppError(status.BAD_REQUEST, 'A rejection reason is required');
      return prisma.ownerProfile.update({
        where: { id: profileId },
        data: {
          verificationStatus: 'REJECTED',
          rejectionReason: reason.trim(),
          verifiedById: null,
          verifiedAt: null,
        },
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true, role: true },
          },
        },
      });
    }

    if (newStatus === 'PENDING') {
      if (!reason?.trim())
        throw new AppError(status.BAD_REQUEST, 'A reason is required');
      return prisma.ownerProfile.update({
        where: { id: profileId },
        data: {
          verificationStatus: 'PENDING',
          rejectionReason: reason.trim(),
          verifiedById: null,
          verifiedAt: null,
        },
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true, role: true },
          },
        },
      });
    }

    throw new AppError(status.BAD_REQUEST, 'Invalid status');
  }

  /**
   * Upload documents. Validates only schema-allowed fields.
   * Does NOT force SUBMITTED — only marks SUBMITTED if profile was CREATED or REJECTED.
   */
  async uploadDocuments(
    user: IRequestUser,
    files: Record<string, Express.Multer.File[]>,
  ) {
    if (!files || Object.keys(files).length === 0) {
      throw new AppError(status.BAD_REQUEST, 'No files provided');
    }

    const documentPaths: Record<string, string> = {};

    Object.entries(files).forEach(([fieldName, fileArray]) => {
      if (!VALID_DOCUMENT_TYPES.includes(fieldName as any)) return;

      if (fileArray && fileArray.length > 0) {
        const file = fileArray[0];
        const relativePath = `/uploads/company-profile/${user.userId}/${file.filename}`;
        documentPaths[fieldName] = relativePath;
      }
    });

    if (Object.keys(documentPaths).length === 0) {
      throw new AppError(status.BAD_REQUEST, 'No valid document fields provided');
    }

    const currentProfile = await prisma.ownerProfile.findUnique({
      where: { userId: user.userId },
    });

    // If no profile exists yet, create a skeleton with uploaded docs
    if (!currentProfile) {
      return prisma.ownerProfile.create({
        data: {
          userId: user.userId,
          ...documentPaths,
          verificationStatus: 'CREATED',
        },
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true, role: true },
          },
        },
      });
    }

    // Don't allow document changes on approved profiles
    if (currentProfile.verificationStatus === 'APPROVED') {
      throw new AppError(
        status.FORBIDDEN,
        'Cannot modify documents on an approved profile',
      );
    }

    // Only move to SUBMITTED if it was CREATED or REJECTED (not if already SUBMITTED/PENDING)
    const shouldResubmit =
      currentProfile.verificationStatus === 'CREATED' ||
      currentProfile.verificationStatus === 'REJECTED';

    return prisma.ownerProfile.update({
      where: { userId: user.userId },
      data: {
        ...documentPaths,
        ...(shouldResubmit
          ? { verificationStatus: 'SUBMITTED', rejectionReason: null }
          : {}),
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true, role: true },
        },
      },
    });
  }

  async deleteDocument(user: IRequestUser, documentType: string) {
    if (!VALID_DOCUMENT_TYPES.includes(documentType as any)) {
      throw new AppError(status.BAD_REQUEST, 'Invalid document type');
    }

    const profile = await prisma.ownerProfile.findUnique({
      where: { userId: user.userId },
    });

    if (!profile) {
      throw new AppError(status.NOT_FOUND, 'Owner profile not found');
    }

    if (profile.verificationStatus === 'APPROVED') {
      throw new AppError(
        status.FORBIDDEN,
        'Cannot delete documents from an approved profile',
      );
    }

    const currentDocPath = profile[
      documentType as keyof typeof profile
    ] as string | null;

    if (currentDocPath) {
      deleteFile(currentDocPath);
    }

    return prisma.ownerProfile.update({
      where: { userId: user.userId },
      data: { [documentType]: null },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true, role: true },
        },
      },
    });
  }

  /**
   * Helper: strip undefined keys so we don't accidentally overwrite with undefined.
   */
  private pickDefinedFields(
    data: Record<string, unknown>,
  ): Record<string, unknown> {
    const allowedProfileFields = [
      'companyName',
      'bussinessEmail',
      'contactNumber',
      'address',
      'nidNumber',
      'tradeLicenseNumber',
      'etin',
      'bin',
    ];

    const result: Record<string, unknown> = {};
    for (const key of allowedProfileFields) {
      if (data[key] !== undefined) {
        result[key] = data[key];
      }
    }
    return result;
  }
}