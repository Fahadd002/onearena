import {
  Controller,
  Get,
  Res,
  UseGuards,
} from '@nestjs/common';

import { Response } from 'express';
import status from 'http-status';

import { AuthRoles } from '../../../common/decorators/auth-roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CheckAuthGuard } from '../../../common/guards/check-auth.guard';
import { UserRole } from '../../../generated/prisma/enums';
import sendResponse from '../../../shared/sendResponse';

import { IRequestUser } from '../../interfaces/requestUser.interface';
import { ReportingService } from './reporting.service';

@Controller('api/v1')
export class ReportingController {
  constructor(
    private readonly service: ReportingService,
  ) {}

  @Get('owner/dashboard')
  @AuthRoles(UserRole.ADMIN)
  @UseGuards(CheckAuthGuard)
  async owner(
    @CurrentUser() user: IRequestUser,
    @Res() res: Response,
  ) {
    const data =
      await this.service.ownerOverview(user);

    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: 'Owner dashboard fetched successfully',
      data,
    });
  }

  @Get('admin/dashboard')
  @AuthRoles(UserRole.SUPER_ADMIN)
  @UseGuards(CheckAuthGuard)
  async admin(
    @Res() res: Response,
  ) {
    const data =
      await this.service.platformOverview();

    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: 'Platform dashboard fetched successfully',
      data,
    });
  }

  @Get('dashboard')
  @AuthRoles(UserRole.USER)
  @UseGuards(CheckAuthGuard)
  async user(
    @CurrentUser() user: IRequestUser,
    @Res() res: Response,
  ) {
    const data =
      await this.service.userOverview(user);

    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: 'User dashboard fetched successfully',
      data,
    });
  }

  @Get('manager/dashboard')
  @AuthRoles(UserRole.MANAGER)
  @UseGuards(CheckAuthGuard)
  async manager(
    @CurrentUser() user: IRequestUser,
    @Res() res: Response,
  ) {
    const data =
      await this.service.managerOverview(user);

    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: 'Manager dashboard fetched successfully',
      data,
    });
  }
}
