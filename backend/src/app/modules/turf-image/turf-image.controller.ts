import { Body, Controller, Delete, Get, Param, Patch, Post, Res, UseGuards } from '@nestjs/common'; 
import { Response } from 'express'; import status from 'http-status';
import multer from 'multer';
import { BadRequestException } from '@nestjs/common';
import { AuthRoles } from '../../../common/decorators/auth-roles.decorator'; 
import { CurrentUser } from '../../../common/decorators/current-user.decorator'; 
import { CheckAuthGuard } from '../../../common/guards/check-auth.guard'; 
import { UserRole } from '../../../generated/prisma/enums'; 
import sendResponse from '../../../shared/sendResponse'; 
import { IRequestUser } from '../../interfaces/requestUser.interface'; 
import { TurfImageService } from './turf-image.service';
import { diskStorage } from '../../helpers/file';
@Controller('api/v1')
export class TurfImageController {
  constructor(private readonly service: TurfImageService) {}

  @Get('turfs/:turfId/images')
  list(
    @Param('turfId') id: string,
    @Res() res: Response,
  ) {
    return this.reply(
      res,
      this.service.list(id),
    );
  }

  @Post('owner/turfs/:turfId/images')
  @AuthRoles(UserRole.ADMIN)
  @UseGuards(CheckAuthGuard)
  create(
    @CurrentUser() user: IRequestUser,
    @Param('turfId') id: string,
    @Body()
    body: {
      url: string;
      altText?: string;
      sortOrder?: number;
    },
    @Res() res: Response,
  ) {
    return this.reply(
      res,
      this.service.create(user, id, body),
      status.CREATED,
    );
  }

  @Post('owner/turfs/:turfId/images/upload')
  @AuthRoles(UserRole.ADMIN)
  @UseGuards(CheckAuthGuard)
  async uploadMany(
    @CurrentUser() user: IRequestUser,
    @Param('turfId') id: string,
    @Res() res: Response,
  ) {
    const storage = diskStorage(`uploads/turfs/${id}`);

    const upload = multer({
      storage,
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Only JPEG, PNG, and WebP images are allowed'));
        }
      },
    }).array('files', 10);

    const req = res.req as any;
    upload(req, res, async (err: any) => {
      if (err) {
        return sendResponse(res, {
          statusCode: status.BAD_REQUEST,
          success: false,
          message: err.message || 'File upload failed',
          data: null,
        });
      }

      try {
        const result = await this.service.createMany(user, id, req.files as Express.Multer.File[]);
        return sendResponse(res, {
          statusCode: status.CREATED,
          success: true,
          message: 'Turf images uploaded successfully',
          data: result,
        });
      } catch (error: any) {
        return sendResponse(res, {
          statusCode: status.BAD_REQUEST,
          success: false,
          message: error.message || 'Failed to process images',
          data: null,
        });
      }
    });
  }

  @Patch('owner/turf-images/:id')
  @AuthRoles(UserRole.ADMIN)
  @UseGuards(CheckAuthGuard)
  update(
    @CurrentUser() user: IRequestUser,
    @Param('id') id: string,
    @Body()
    body: {
      url?: string;
      altText?: string;
      sortOrder?: number;
    },
    @Res() res: Response,
  ) {
    return this.reply(
      res,
      this.service.update(user, id, body),
    );
  }

  @Delete('owner/turf-images/:id')
  @AuthRoles(UserRole.ADMIN)
  @UseGuards(CheckAuthGuard)
  remove(
    @CurrentUser() user: IRequestUser,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    return this.reply(
      res,
      this.service.delete(user, id),
    );
  }

  private async reply(
    res: Response,
    operation: Promise<unknown>,
    code: number = status.OK,
  ) {
    return sendResponse(res, {
      statusCode: code,
      success: true,
      message: 'Turf image operation successful',
      data: await operation,
    });
  }
}
