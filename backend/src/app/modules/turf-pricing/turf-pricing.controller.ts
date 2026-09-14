import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
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
import { TurfPricingService } from './turf-pricing.service';

@Controller('api/v1')
export class TurfPricingController {
  constructor(private readonly turfService: TurfPricingService) {}

  @Get('owner/turfs/:turfId/pricing')
  @AuthRoles(UserRole.ADMIN)
  @UseGuards(CheckAuthGuard)
  async prices(
    @CurrentUser() user: IRequestUser,
    @Param('turfId') turfId: string,
    @Query('date') date: string,
    @Res() res: Response,
  ) {
    const data =
      await this.turfService.listPrices(
        user,
        turfId,
        date ? { date: new Date(date) } : undefined,
      );

    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: 'Pricing rules fetched successfully',
      data,
    });
  }

  @Get('owner/pricing')
  @AuthRoles(UserRole.ADMIN)
  @UseGuards(CheckAuthGuard)
  async allPrices(
    @CurrentUser() user: IRequestUser,
    @Query('date') date: string,
    @Res() res: Response,
  ) {
    const data = await this.turfService.listAllPrices(user, date ? { date: new Date(date) } : undefined);
    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: 'All pricing rules fetched successfully',
      data,
    });
  }

  @Post('owner/turfs/:turfId/pricing')
  @AuthRoles(UserRole.ADMIN)
  @UseGuards(CheckAuthGuard)
  async createPrice(
    @CurrentUser() user: IRequestUser,
    @Param('turfId') turfId: string,
    @Body()
    body: {
      dayOfWeek: number;
      startMinute: number;
      endMinute: number;
      price: number;
      active?: boolean;
      startDate: Date;
      endDate: Date;
    },
    @Res() res: Response,
  ) {
    const data =
      await this.turfService.createPrice(
        user,
        turfId,
        body,
      );

    sendResponse(res, {
      statusCode: status.CREATED,
      success: true,
      message: 'Pricing rule created successfully',
      data,
    });
  }

  @Post('owner/turfs/:turfId/pricing/bulk')
  @AuthRoles(UserRole.ADMIN)
  @UseGuards(CheckAuthGuard)
  async createPriceBulk(
    @CurrentUser() user: IRequestUser,
    @Param('turfId') turfId: string,
    @Body()
    body: {
      startMinute: number;
      endMinute: number;
      price: number;
      active?: boolean;
      startDate: Date;
      endDate: Date;
    },
    @Res() res: Response,
  ) {
    const data =
      await this.turfService.createPriceBulk(
        user,
        turfId,
        body,
      );

    sendResponse(res, {
      statusCode: status.CREATED,
      success: true,
      message: 'Pricing rules created for all days successfully',
      data,
    });
  }

  @Patch('owner/pricing/:id')
  @AuthRoles(UserRole.ADMIN)
  @UseGuards(CheckAuthGuard)
  async updatePrice(
    @CurrentUser() user: IRequestUser,
    @Param('id') id: string,
    @Body()
    body: {
      dayOfWeek?: number;
      startMinute?: number;
      endMinute?: number;
      price?: number;
      active?: boolean;
      startDate?: Date;
      endDate?: Date;
    },
    @Res() res: Response,
  ) {
    const data =
      await this.turfService.updatePrice(
        user,
        id,
        body,
      );

    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: 'Pricing rule updated successfully',
      data,
    });
  }

  @Delete('owner/pricing/:id')
  @AuthRoles(UserRole.ADMIN)
  @UseGuards(CheckAuthGuard)
  async deletePrice(
    @CurrentUser() user: IRequestUser,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const data = await this.turfService.deletePrice(
        user,
        id,
      );

    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: 'Pricing rule deleted successfully',
      data,
    });
  }
}
