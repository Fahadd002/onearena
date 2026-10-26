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
import { OptionalAuthGuard } from '../../../common/guards/optional-auth.guard';
import { UserRole } from '../../../generated/prisma/enums';
import sendResponse from '../../../shared/sendResponse';

import { IRequestUser } from '../../interfaces/requestUser.interface';
import { TurfPayload, TurfService } from './turf.service';

@Controller('api/v1')
export class TurfController {
  constructor(
    private readonly turfService: TurfService,
  ) { }

  @Get('super-admin/turfs')
  @AuthRoles(UserRole.SUPER_ADMIN)
  @UseGuards(CheckAuthGuard)
  async listForAdmin(
    @Query() query: { search?: string; categoryId?: string; status?: string; facilityId?: string; sortBy?: string; sortOrder?: string; page?: string; limit?: string },
    @Res() res: Response,
  ) {
    const data = await this.turfService.listForAdmin({ ...query, page: query.page ? Number(query.page) : undefined, limit: query.limit ? Number(query.limit) : undefined });
    sendResponse(res, { statusCode: status.OK, success: true, message: 'All turfs fetched successfully', data });
  }

  @Get('super-admin/turfs/:id')
  @AuthRoles(UserRole.SUPER_ADMIN)
  @UseGuards(CheckAuthGuard)
  async getForAdmin(@Param('id') id: string, @Res() res: Response) {
    const data = await this.turfService.findForAdmin(id);
    sendResponse(res, { statusCode: status.OK, success: true, message: 'Turf fetched successfully', data });
  }

  @Patch('super-admin/turfs/:id/status')
  @AuthRoles(UserRole.SUPER_ADMIN)
  @UseGuards(CheckAuthGuard)
  async updateStatus(@Param('id') id: string, @Body('status') nextStatus: string, @Res() res: Response) {
    const data = await this.turfService.updateStatus(id, nextStatus);
    sendResponse(res, { statusCode: status.OK, success: true, message: 'Turf status updated successfully', data });
  }

  @Delete('super-admin/turfs/:id')
  @AuthRoles(UserRole.SUPER_ADMIN)
  @UseGuards(CheckAuthGuard)
  async removeForAdmin(@Param('id') id: string, @Res() res: Response) {
    const data = await this.turfService.deleteForAdmin(id);
    sendResponse(res, { statusCode: status.OK, success: true, message: 'Turf removed successfully', data });
  }

  @Get('turfs')
  @UseGuards(OptionalAuthGuard)
  async list(
    @CurrentUser() user: IRequestUser,
    @Query() query: Record<string, string>,
    @Res() res: Response
  ) {
    const data = await this.turfService.list(
      user,
      {
        area: query.area,
        categoryId: query.categoryId,
        minPrice: query.minPrice ? Number(query.minPrice) : undefined,
        maxPrice: query.maxPrice ? Number(query.maxPrice) : undefined,
        lat: query.lat ? Number(query.lat) : undefined,
        lng: query.lng ? Number(query.lng) : undefined,
        radius: query.radius ? Number(query.radius) : undefined,
        page: query.page ? Number(query.page) : undefined,
        limit: query.limit ? Number(query.limit) : undefined,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder as "asc" | "desc" | undefined,
        date: query.date,
      });

    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: "Turfs fetched successfully",
      data,
    });
  }

  @Get('turfs/:turfId')
  async getActiveTurfById(
    @Param('turfId') id: string,
    @Res() res: Response,
  ) {
    const data =
      await this.turfService.findActiveTurfById(id);

    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: 'Turf fetched successfully',
      data,
    });
  }

  @Post('owner/turfs')
  @AuthRoles(UserRole.ADMIN)
  @UseGuards(CheckAuthGuard)
  async create(
    @CurrentUser() user: IRequestUser,
    @Body() body: TurfPayload,
    @Res() res: Response,
  ) {
    const data =
      await this.turfService.create(user, body);

    sendResponse(res, {
      statusCode: status.CREATED,
      success: true,
      message: 'Turf created successfully',
      data,
    });
  }

  @Patch('owner/turfs/:id')
  @AuthRoles(UserRole.ADMIN)
  @UseGuards(CheckAuthGuard)
  async update(
    @CurrentUser() user: IRequestUser,
    @Param('id') id: string,
    @Body() body: Partial<TurfPayload>,
    @Res() res: Response,
  ) {
    const data =
      await this.turfService.update(
        user,
        id,
        body,
      );

    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: 'Turf updated successfully',
      data,
    });
  }

  @Delete('owner/turfs/:id')
  @AuthRoles(UserRole.ADMIN)
  @UseGuards(CheckAuthGuard)
  async remove(
    @CurrentUser() user: IRequestUser,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const data =
      await this.turfService.delete(user, id);

    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: 'Turf deleted successfully',
      data,
    });
  }

  @Get('owner/turfs')
  @AuthRoles(UserRole.ADMIN)
  @UseGuards(CheckAuthGuard)
  async listMine(
    @CurrentUser() user: IRequestUser,
    @Query() query: { search?: string; categoryId?: string; sortBy?: string; sortOrder?: string; page?: string; limit?: string },
    @Res() res: Response,
  ) {
    const hasListQuery = Object.values(query).some(Boolean);
    const data = await this.turfService.listMine(
      user,
      hasListQuery
        ? {
          ...query,
          page: query.page ? Number(query.page) : undefined,
          limit: query.limit ? Number(query.limit) : undefined,
        }
        : undefined,
    );

    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: 'Owner turfs fetched successfully',
      data,
    });
  }

  @Post('owner/turfs/:turfId/facilities')
  @AuthRoles(UserRole.ADMIN)
  @UseGuards(CheckAuthGuard)
  async assignFacilities(
    @CurrentUser() user: IRequestUser,
    @Param('turfId') turfId: string,
    @Body('facilityIds') facilityIds: string[],
    @Res() res: Response,
  ) {
    const data = await this.turfService.assignFacilities(user, turfId, facilityIds ?? []);
    sendResponse(res, { statusCode: status.OK, success: true, message: 'Turf facilities updated successfully', data });
  }

  @Get('owner/turfs/:turfId')
  @AuthRoles(UserRole.ADMIN)
  @UseGuards(CheckAuthGuard)
  async getMine(
    @CurrentUser() user: IRequestUser,
    @Param('turfId') turfId: string,
    @Res() res: Response,
  ) {
    const data = await this.turfService.findMineById(user, turfId);
    sendResponse(res, { statusCode: status.OK, success: true, message: 'Turf fetched successfully', data });
  }
}
