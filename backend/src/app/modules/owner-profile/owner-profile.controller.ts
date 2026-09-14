import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Res, UploadedFile, UseGuards, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import httpStatus from 'http-status';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
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
  async getOwnerProfile(@CurrentUser() user: IRequestUser, @Res() res: Response) {
    const result = await this.service.getOwnerProfile(user);
    sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'Owner profile fetched successfully', data: result });
  }

  @Get('owner-applications/:profileId')
  @AuthRoles(UserRole.SUPER_ADMIN)
  @UseGuards(CheckAuthGuard)
  async getOwnerApplicationById(@Param('profileId') profileId: string, @Res() res: Response) {
    const result = await this.service.getOwnerApplicationById(profileId);
    sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'Owner application fetched successfully', data: result });
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
    sendResponse(
      res,
      {
        statusCode: httpStatus.OK,
        success: true,
        message: 'Owner profile saved successfully',
        data: result,
      },
    );
  }

  @Post('owner-profile/submit')
  @AuthRoles(UserRole.ADMIN)
  @UseGuards(CheckAuthGuard)
  async submitOwnerProfile(@CurrentUser() user: IRequestUser, @Body() payload: Record<string, unknown>, @Res() res: Response) {
    const result = await this.service.submitOwnerProfile(user, payload);
    sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'Owner profile submitted for verification', data: result });
  }

  @Post('owner-profile/image')
  @AuthRoles(UserRole.ADMIN)
  @UseGuards(CheckAuthGuard)
  @UseInterceptors(FileInterceptor('image'))
  async uploadImage(@CurrentUser() user: IRequestUser, @UploadedFile() file: Express.Multer.File, @Res() res: Response) {
    const result = await this.service.uploadImage(user, file);
    sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'Profile image uploaded successfully', data: result });
  }

  @Post('owner-profile/documents/upload')
  @AuthRoles(UserRole.ADMIN)
  @UseGuards(CheckAuthGuard)
  async uploadDocuments(
    @CurrentUser() user: IRequestUser,
    @Res() res: Response
  ) {
    return new Promise(() => {
      // Create multer storage configuration
      const storage = multer.diskStorage({
        destination: (req: any, _file: any, cb: any) => {
          const userId = req.user?.id || req.user?.userId || user.userId;
          const dir = path.join(process.cwd(), `uploads/owner-profile/${userId}`);

          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }

          cb(null, dir);
        },
        filename: (_req: any, file: any, cb: any) => {
          const timestamp = Date.now();
          const ext = path.extname(file.originalname);

          const fieldMapping: Record<string, string> = {
            nidImageFront: 'nid-front',
            nidImageBack: 'nid-back',
            businessRegistrationDocument: 'business-registration',
            tradeLicenseDocument: 'trade-license',
            taxIdentificationDocument: 'tax-identification',
            businessLogo: 'business-logo'
          };

          const mappedName = fieldMapping[file.fieldname] || file.fieldname;
          cb(null, `${mappedName}-${timestamp}${ext}`);
        }
      });

      // Create multer instance
      const upload = multer({
        storage: storage,
        limits: { fileSize: 10 * 1024 * 1024 },
        fileFilter: (_req, file, cb) => {
          const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
          if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
          } else {
            cb(new BadRequestException(`File type ${file.mimetype} not allowed. Allowed: JPEG, PNG, PDF`));
          }
        }
      }).fields([
        { name: 'nidImageFront', maxCount: 1 },
        { name: 'nidImageBack', maxCount: 1 },
        { name: 'businessRegistrationDocument', maxCount: 1 },
        { name: 'tradeLicenseDocument', maxCount: 1 },
        { name: 'taxIdentificationDocument', maxCount: 1 },
        { name: 'businessLogo', maxCount: 1 }
      ]);

      // Use multer middleware
      const req = res.req as any;
      upload(req, res, async (err: any) => {
        if (err) {
          sendResponse(res, {
            statusCode: httpStatus.BAD_REQUEST,
            success: false,
            message: err.message || 'File upload failed',
            data: null
          });
          return;
        }

        try {
          const result = await this.service.uploadDocuments(user, req.files || {});
          sendResponse(res, {
            statusCode: httpStatus.OK,
            success: true,
            message: 'Documents uploaded successfully',
            data: result
          });
        } catch (error: any) {
          sendResponse(res, {
            statusCode: httpStatus.BAD_REQUEST,
            success: false,
            message: error.message || 'Failed to process documents',
            data: null
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
    @Res() res: Response
  ) {
    const result = await this.service.deleteDocument(user, documentType);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Document deleted successfully',
      data: result
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
    sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'Owner applications fetched successfully', data: result });
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
    const result = await this.service.updateOwnerApplicationStatus(profileId, user, body.status, body.reason);
    sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'Owner application updated', data: result });
  }
}
