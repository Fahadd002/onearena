// owner-profile.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import httpStatus from 'http-status';
import path from 'path';
import { fileUploader, documentFileFilter } from '../../../app/helpers/file';
import { AuthRoles } from '../../../common/decorators/auth-roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CheckAuthGuard } from '../../../common/guards/check-auth.guard';
import { UserRole } from '../../../generated/prisma/enums';
import sendResponse from '../../../shared/sendResponse';
import { IRequestUser } from '../../interfaces/requestUser.interface';
import { OwnerProfileService } from './owner-profile.service';

@Controller('api/v1')
export class OwnerProfileController {
  constructor(private readonly service: OwnerProfileService) {}

  @Get('owner-profile')
  @AuthRoles(UserRole.ADMIN)
  @UseGuards(CheckAuthGuard)
  async getOwnerProfile(
    @CurrentUser() user: IRequestUser,
    @Res() res: Response,
  ) {
    const result = await this.service.getOwnerProfile(user);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Owner profile fetched successfully',
      data: result,
    });
  }

  @Get('owner-applications/:profileId')
  @AuthRoles(UserRole.SUPER_ADMIN)
  @UseGuards(CheckAuthGuard)
  async getOwnerApplicationById(
    @Param('profileId') profileId: string,
    @Res() res: Response,
  ) {
    const result = await this.service.getOwnerApplicationById(profileId);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Owner application fetched successfully',
      data: result,
    });
  }

  @Put('owner-profile')
  @AuthRoles(UserRole.ADMIN)
  @UseGuards(CheckAuthGuard)
  async updateOwnerProfile(
    @CurrentUser() user: IRequestUser,
    @Body() payload: Record<string, unknown>,
    @Res() res: Response,
  ) {
    const result = await this.service.updateOwnerProfile(user, payload);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Owner profile saved successfully',
      data: result,
    });
  }

  @Post('owner-profile/submit')
  @AuthRoles(UserRole.ADMIN)
  @UseGuards(CheckAuthGuard)
  async submitOwnerProfile(
    @CurrentUser() user: IRequestUser,
    @Body() payload: Record<string, unknown>,
    @Res() res: Response,
  ) {
    const result = await this.service.submitOwnerProfile(user, payload);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Owner profile submitted for verification',
      data: result,
    });
  }

  @Post('owner-profile/documents/upload')
  @AuthRoles(UserRole.ADMIN)
  @UseGuards(CheckAuthGuard)
  async uploadDocuments(
    @CurrentUser() user: IRequestUser,
    @Res() res: Response,
  ) {
    return new Promise(() => {
      const upload = fileUploader.multerInstance(
        (req: any) => {
          const userId = req.user?.id || req.user?.userId || user.userId;
          return `uploads/company-profile/${userId}`;
        },
        {
          filename: (_req: any, file: any, cb: any) => {
            const timestamp = Date.now();
            const ext = path.extname(file.originalname);

            // Matches Prisma schema field names
            const fieldMapping: Record<string, string> = {
              nidImage: 'nid',
              tradeLicenseDocument: 'trade-license',
              businessLogo: 'business-logo',
              etinDocument: 'etin',
              binDocument: 'bin',
            };

            const mappedName = fieldMapping[file.fieldname] || file.fieldname;
            cb(null, `${mappedName}-${timestamp}${ext}`);
          },
          limits: { fileSize: 10 * 1024 * 1024 },
          fileFilter: documentFileFilter,
        },
      ).fields([
        { name: 'nidImage', maxCount: 1 },
        { name: 'tradeLicenseDocument', maxCount: 1 },
        { name: 'businessLogo', maxCount: 1 },
        { name: 'etinDocument', maxCount: 1 },
        { name: 'binDocument', maxCount: 1 },
      ]);

      const req = res.req as any;
      upload(req, res, async (err: any) => {
        if (err) {
          sendResponse(res, {
            statusCode: httpStatus.BAD_REQUEST,
            success: false,
            message: err.message || 'File upload failed',
            data: null,
          });
          return;
        }

        try {
          const result = await this.service.uploadDocuments(
            user,
            req.files || {},
          );
          sendResponse(res, {
            statusCode: httpStatus.OK,
            success: true,
            message: 'Documents uploaded successfully',
            data: result,
          });
        } catch (error: any) {
          sendResponse(res, {
            statusCode: httpStatus.BAD_REQUEST,
            success: false,
            message: error.message || 'Failed to process documents',
            data: null,
          });
        }
      });
    });
  }

  @Delete('owner-profile/documents/:documentType')
  @AuthRoles(UserRole.ADMIN)
  @UseGuards(CheckAuthGuard)
  async deleteDocument(
    @CurrentUser() user: IRequestUser,
    @Param('documentType') documentType: string,
    @Res() res: Response,
  ) {
    const result = await this.service.deleteDocument(user, documentType);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Document deleted successfully',
      data: result,
    });
  }

  @Get('owner-applications')
  @AuthRoles(UserRole.SUPER_ADMIN)
  @UseGuards(CheckAuthGuard)
  async listOwnerApplications(
    @Query('search') search: string | undefined,
    @Query('sortBy') sortBy: string | undefined,
    @Query('sortOrder') sortOrder: string | undefined,
    @Query('page') page: string | undefined,
    @Query('limit') limit: string | undefined,
    @Query('status') status: string | undefined,
    @Res() res: Response,
  ) {
    const result = await this.service.listOwnerApplications(
      search,
      sortBy,
      sortOrder,
      Number(page) || 1,
      Number(limit) || 10,
      status,
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Owner applications fetched successfully',
      data: result,
    });
  }

  @Patch('owner-applications/:profileId/status')
  @AuthRoles(UserRole.SUPER_ADMIN)
  @UseGuards(CheckAuthGuard)
  async updateOwnerApplicationStatus(
    @CurrentUser() user: IRequestUser,
    @Param('profileId') profileId: string,
    @Body() body: { status: string; reason?: string },
    @Res() res: Response,
  ) {
    const result = await this.service.updateOwnerApplicationStatus(
      profileId,
      user,
      body.status,
      body.reason,
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Owner application updated',
      data: result,
    });
  }
}