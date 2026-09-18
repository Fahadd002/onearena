import { Controller, Get, Param, Query, Res, UseGuards, Post, Body, Delete, Patch } from '@nestjs/common';
import { Response } from 'express';
import status from 'http-status';
import { AuthRoles } from '../../../common/decorators/auth-roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CheckAuthGuard } from '../../../common/guards/check-auth.guard';
import { UserRole } from '../../../generated/prisma/enums';
import sendResponse from '../../../shared/sendResponse';
import { IRequestUser } from '../../interfaces/requestUser.interface';
import { BookingPayload, BookingService } from './booking.service';

@Controller('api/v1')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Get('bookings')
  @AuthRoles(UserRole.USER, UserRole.ADMIN, UserRole.MANAGER)
  @UseGuards(CheckAuthGuard)
  async list(
    @Res() res: Response,
    @CurrentUser() user: IRequestUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('bookingStatus') bookingStatus?: string,
    @Query('paymentStatus') paymentStatus?: string,
    @Query('turfId') turfId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
    @Query('search') search?: string,
  ) {
    const data = await this.bookingService.list(
      user,
      Number(page) || 1,
      Number(limit) || 10,
      { bookingStatus, paymentStatus, turfId, startDate, endDate, sortBy, sortOrder, search },
    );
    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: 'Bookings fetched successfully',
      data,
    });
  }

  @Post('bookings')
  @AuthRoles(UserRole.USER)
  @UseGuards(CheckAuthGuard)
  async create(
    @CurrentUser() user: IRequestUser,
    @Body() body: BookingPayload,
    @Res() res: Response,
  ) {
    const data = await this.bookingService.create(user, body);
    sendResponse(res, {
      statusCode: status.CREATED,
      success: true,
      message: 'Booking created successfully',
      data,
    });
  }

  @Delete('bookings/:bookingId')
  @AuthRoles(UserRole.USER)
  @UseGuards(CheckAuthGuard)
  async cancel(
    @CurrentUser() user: IRequestUser,
    @Param('bookingId') bookingId: string,
    @Res() res: Response,
  ) {
    const data = await this.bookingService.cancel(user, bookingId);
    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: 'Booking cancelled successfully',
      data,
    });
  }

  @Patch('bookings/bulk-payment-status')
  @AuthRoles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  @UseGuards(CheckAuthGuard)
  async bulkPaymentStatus(
    @CurrentUser() user: IRequestUser,
    @Body() body: { bookingIds: string[]; bookingStatus: string },
    @Res() res: Response,
  ) {
    const data = await this.bookingService.bulkUpdatePaymentStatus(
      user,
      body.bookingIds,
      body.bookingStatus as any,
    );
    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: 'Bulk booking status updated',
      data,
    });
  }

  @Patch('admin/bookings/:bookingId/slot-status')
  @AuthRoles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  @UseGuards(CheckAuthGuard)
  async updateBookingStatus(
    @CurrentUser() user: IRequestUser,
    @Param('bookingId') bookingId: string,
    @Body() body: { bookingStatus: string },
    @Res() res: Response,
  ) {
    const data = await this.bookingService.updateBookingStatus(user, bookingId, body);
    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: 'Booking status updated',
      data,
    });
  }

  @Patch('admin/bookings/:bookingId/payment')
  @AuthRoles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  @UseGuards(CheckAuthGuard)
  async updatePayment(
    @CurrentUser() user: IRequestUser,
    @Param('bookingId') bookingId: string,
    @Body() body: { paymentStatus?: string; totalAmount?: number },
    @Res() res: Response,
  ) {
    const data = await this.bookingService.updatePayment(user, bookingId, body);
    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: 'Payment updated',
      data,
    });
  }

  @Post('bookings/:bookingId/confirm')
  @AuthRoles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  @UseGuards(CheckAuthGuard)
  async confirm(
    @CurrentUser() user: IRequestUser,
    @Param('bookingId') bookingId: string,
    @Res() res: Response,
  ) {
    const data = await this.bookingService.confirm(user, bookingId);
    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: 'Booking confirmed successfully',
      data,
    });
  }

  @Post('bookings/:bookingId/reject')
  @AuthRoles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  @UseGuards(CheckAuthGuard)
  async reject(
    @CurrentUser() user: IRequestUser,
    @Param('bookingId') bookingId: string,
    @Res() res: Response,
  ) {
    const data = await this.bookingService.reject(user, bookingId);
    sendResponse(res!, {
      statusCode: status.OK,
      success: true,
      message: 'Booking rejected successfully',
      data,
    });
  }

  @Post('bookings/:bookingId/kick-off')
  @AuthRoles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  @UseGuards(CheckAuthGuard)
  async kickOff(
    @CurrentUser() user: IRequestUser,
    @Param('bookingId') bookingId: string,
    @Res() res: Response,
  ) {
    const data = await this.bookingService.kickOff(user, bookingId);
    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: 'Booking kicked off successfully',
      data,
    });
  }

  @Post('bookings/:bookingId/complete')
  @AuthRoles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  @UseGuards(CheckAuthGuard)
  async complete(
    @CurrentUser() user: IRequestUser,
    @Param('bookingId') bookingId: string,
    @Res() res: Response,
  ) {
    const data = await this.bookingService.complete(user, bookingId);
    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: 'Booking completed successfully',
      data,
    });
  }

  @Post('admin/bookings/:bookingId/confirm-with-payment')
  @AuthRoles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  @UseGuards(CheckAuthGuard)
  async confirmWithPayment(
    @CurrentUser() user: IRequestUser,
    @Param('bookingId') bookingId: string,
    @Body() body: { paymentAmount: number; paymentMethod: 'CASH'; reference?: string; note?: string },
    @Res() res: Response,
  ) {
    const data = await this.bookingService.confirmWithPayment(user, bookingId, body);
    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: 'Booking confirmed successfully',
      data,
    });
  }
}
