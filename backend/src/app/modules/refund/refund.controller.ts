import { Body, Controller, Get, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import status from 'http-status';
import { AuthRoles } from '../../../common/decorators/auth-roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CheckAuthGuard } from '../../../common/guards/check-auth.guard';
import { UserRole } from '../../../generated/prisma/enums';
import sendResponse from '../../../shared/sendResponse';
import { IRequestUser } from '../../interfaces/requestUser.interface';
import { RefundService } from './refund.service';

@Controller('api/v1')
export class RefundController {
  constructor(private readonly refundService: RefundService) {}

  @Get('refunds')
  @AuthRoles(UserRole.USER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseGuards(CheckAuthGuard)
  async list(
    @Res() res: Response,
    @CurrentUser() user: IRequestUser,
    @Query('bookingId') bookingId?: string,
  ) {
    const data = await this.refundService.list(user, bookingId);
    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: 'Refunds fetched successfully',
      data,
    });
  }

  @Post('bookings/:bookingId/refunds')
  @AuthRoles(UserRole.USER, UserRole.ADMIN)
  @UseGuards(CheckAuthGuard)
  async request(
    @CurrentUser() user: IRequestUser,
    @Param('bookingId') bookingId: string,
    @Body() body: { paymentId: string; reason?: string },
    @Res() res: Response,
  ) {
    const data = await this.refundService.request(user, bookingId, body.paymentId, body.reason);
    sendResponse(res, {
      statusCode: status.CREATED,
      success: true,
      message: 'Refund requested successfully',
      data,
    });
  }

  @Post('refunds/:refundId/approve')
  @AuthRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseGuards(CheckAuthGuard)
  async approve(
    @CurrentUser() user: IRequestUser,
    @Param('refundId') refundId: string,
    @Res() res: Response,
  ) {
    const data = await this.refundService.approve(user, refundId);
    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: 'Refund approved successfully',
      data,
    });
  }

  @Post('refunds/:refundId/reject')
  @AuthRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseGuards(CheckAuthGuard)
  async reject(
    @CurrentUser() user: IRequestUser,
    @Param('refundId') refundId: string,
    @Res() res: Response,
  ) {
    const data = await this.refundService.reject(user, refundId);
    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: 'Refund rejected successfully',
      data,
    });
  }

  @Post('refunds/:refundId/process')
  @AuthRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseGuards(CheckAuthGuard)
  async process(
    @CurrentUser() user: IRequestUser,
    @Param('refundId') refundId: string,
    @Res() res: Response,
  ) {
    const data = await this.refundService.markProcessed(user, refundId);
    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: 'Refund marked as processed',
      data,
    });
  }
}
