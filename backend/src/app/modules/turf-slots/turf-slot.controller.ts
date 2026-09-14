import {
  Body,
  Controller,
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
import { TurfSlotService } from './turf-slot.service';

@Controller('api/v1')
export class TurfSlotController {
  constructor(private readonly turfService: TurfSlotService) {}

  @Get('turfs/:turfId/slots')
  async getSlots(
    @Param('turfId') turfId: string,
    @Query('date') date: string,
    @Res() res: Response,
  ) {
    const data = await this.turfService.getSlotsByDate(turfId, date);
    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: 'Slots fetched successfully',
      data,
    });
  }

  @Post('owner/turfs/:turfId/slots/generate')
  @AuthRoles(UserRole.ADMIN)
  @UseGuards(CheckAuthGuard)
  async generateSlots(
    @CurrentUser() user: IRequestUser,
    @Param('turfId') turfId: string,
    @Body()
    body: { days?: number },
    @Res() res: Response,
  ) {
    const data = await this.turfService.generateSlots(user, turfId, body ?? {});
    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: 'Slots generated successfully',
      data,
    });
  }

  @Get('owner/turfs/:turfId/slots')
  @AuthRoles(UserRole.ADMIN)
  @UseGuards(CheckAuthGuard)
  async listSlots(
    @CurrentUser() user: IRequestUser,
    @Param('turfId') turfId: string,
    @Query('date') date: string,
    @Query('activeOnly') activeOnly: string,
    @Res() res: Response,
  ) {
    const data = await this.turfService.listTurfSlots(user, turfId, {
      date,
      activeOnly: activeOnly === 'true',
    });
    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: 'Slots fetched successfully',
      data,
    });
  }

  @Get('owner/slots')
  @AuthRoles(UserRole.ADMIN)
  @UseGuards(CheckAuthGuard)
  async listAllSlots(
    @CurrentUser() user: IRequestUser,
    @Query('date') date: string,
    @Res() res: Response,
  ) {
    const data = await this.turfService.listAllSlotsForOwner(user, { date });
    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: 'Slots fetched successfully',
      data,
    });
  }

  @Patch('owner/slots/:slotId')
  @AuthRoles(UserRole.ADMIN)
  @UseGuards(CheckAuthGuard)
  async updateSlot(
    @CurrentUser() user: IRequestUser,
    @Param('slotId') slotId: string,
    @Body()
    body: { active?: boolean; price?: number },
    @Res() res: Response,
  ) {
    const data = await this.turfService.updateSlot(user, slotId, body);
    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: 'Slot updated successfully',
      data,
    });
  }
}
