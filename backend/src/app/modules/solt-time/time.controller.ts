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
import { SlotTimePayload, TimeService } from './time.service';

export interface CreateTimeDto {
  timeName: string;
  startMinute: number;
  endMinute: number;
}

export interface UpdateTimeDto {
  timeName?: string;
  startMinute?: number;
  endMinute?: number;
}

@Controller('api/v1/owner/slot-times')
export class TimeController {
  constructor(private readonly timeService: TimeService) {}

  // =========================
  // Dropdown / tab helper — simple unpaginated list
  // =========================

  @Get('/dorpdown')
  @AuthRoles(UserRole.ADMIN)
  @UseGuards(CheckAuthGuard)
  async listSlotTimeSetups(
    @CurrentUser() user: IRequestUser,
    @Res() res: Response,
  ) {
    const data = await this.timeService.listSlotTimeSetups(user);
    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: 'Slot time setups fetched successfully',
      data,
    });
  }

  // =========================
  // Paginated list
  // =========================

  @Get()
  @AuthRoles(UserRole.ADMIN)
  @UseGuards(CheckAuthGuard)
  async listMine(
    @CurrentUser() user: IRequestUser,
    @Query('search') search: string | undefined,
    @Query('sortBy') sortBy: string | undefined,
    @Query('sortOrder') sortOrder: string | undefined,
    @Query('page') page: string | undefined,
    @Query('limit') limit: string | undefined,
    @Res() res: Response,
  ) {
    const result = await this.timeService.listMine(user, {
      search,
      sortBy,
      sortOrder,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });

    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: 'Slot time setups fetched successfully',
      data: result.data,
      meta: result.meta,
    });
  }

  // =========================
  // Find one
  // =========================

  @Get(':id')
  @AuthRoles(UserRole.ADMIN)
  @UseGuards(CheckAuthGuard)
  async findMine(
    @CurrentUser() user: IRequestUser,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const data = await this.timeService.findMine(user, id);
    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: 'Slot time setup fetched successfully',
      data,
    });
  }

  // =========================
  // Create
  // =========================

  @Post()
  @AuthRoles(UserRole.ADMIN)
  @UseGuards(CheckAuthGuard)
  async create(
    @CurrentUser() user: IRequestUser,
    @Body() payload: SlotTimePayload,
    @Res() res: Response,
  ) {
    const data = await this.timeService.create(user, payload);
    sendResponse(res, {
      statusCode: status.CREATED,
      success: true,
      message: 'Slot time setup created successfully',
      data,
    });
  }

  // =========================
  // Update
  // =========================

  @Patch(':id')
  @AuthRoles(UserRole.ADMIN)
  @UseGuards(CheckAuthGuard)
  async update(
    @CurrentUser() user: IRequestUser,
    @Param('id') id: string,
    @Body() payload: Partial<SlotTimePayload>,
    @Res() res: Response,
  ) {
    const data = await this.timeService.update(user, id, payload);
    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: 'Slot time setup updated successfully',
      data,
    });
  }

  // =========================
  // Delete
  // =========================

  @Delete(':id')
  @AuthRoles(UserRole.ADMIN)
  @UseGuards(CheckAuthGuard)
  async delete(
    @CurrentUser() user: IRequestUser,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const data = await this.timeService.delete(user, id);
    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: 'Slot time setup deleted successfully',
      data,
    });
  }
}