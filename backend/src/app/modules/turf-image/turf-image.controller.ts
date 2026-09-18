import { Body, Controller, Delete, Get, Param, Patch, Post, Res, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common'; 
import { FilesInterceptor } from '@nestjs/platform-express';
import { Response } from 'express'; import status from 'http-status';
 import { AuthRoles } from '../../../common/decorators/auth-roles.decorator'; 
 import { CurrentUser } from '../../../common/decorators/current-user.decorator'; 
 import { CheckAuthGuard } from '../../../common/guards/check-auth.guard'; 
 import { UserRole } from '../../../generated/prisma/enums'; 
 import sendResponse from '../../../shared/sendResponse'; 
 import { IRequestUser } from '../../interfaces/requestUser.interface'; 
 import { TurfImageService } from './turf-image.service';
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
  @UseInterceptors(FilesInterceptor('files', 10))
  async uploadMany(
    @CurrentUser() user: IRequestUser,
    @Param('turfId') id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Res() res: Response,
  ) {
    return this.reply(res, this.service.createMany(user, id, files), status.CREATED);
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
