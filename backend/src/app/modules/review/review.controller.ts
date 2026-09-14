import { Controller, Get, Param, Patch, Post, Query, Delete, Req, Res, UseGuards, Body } from '@nestjs/common';
import { Request, Response } from 'express';
import status from 'http-status';
import { AuthRoles } from '../../../common/decorators/auth-roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CheckAuthGuard } from '../../../common/guards/check-auth.guard';
import { UserRole } from '../../../generated/prisma/enums';
import sendResponse from '../../../shared/sendResponse';
import AppError from '../../../config/errorHelpers/AppError';
import { IRequestUser } from '../../interfaces/requestUser.interface';
import { ReviewService } from './review.service';

@Controller('api/v1')
export class ReviewController {
  constructor(private readonly service: ReviewService) {}

  @Get('reviews')
  async list(@Res() res: Response, @Query('page') page?: string, @Query('limit') limit?: string) {
    const data = await this.service.list(undefined, Number(page) || 1, Number(limit) || 10);
    sendResponse(res, { statusCode: status.OK, success: true, message: 'Reviews fetched successfully', data });
  }

  @Get('manager/reviews')
  @AuthRoles(UserRole.MANAGER)
  @UseGuards(CheckAuthGuard)
  async listForManager(@CurrentUser() user: IRequestUser, @Res() res: Response, @Query('page') page?: string, @Query('limit') limit?: string) {
    const data = await this.service.list(user, Number(page) || 1, Number(limit) || 10);
    sendResponse(res, { statusCode: status.OK, success: true, message: 'Reviews fetched successfully', data });
  }

  @Post('bookings/:bookingId/reviews')
  @AuthRoles(UserRole.USER)
  @UseGuards(CheckAuthGuard)
  async create(@CurrentUser() user: IRequestUser, @Param('bookingId') bookingId: string, @Req() req: Request, @Res() res: Response) {
    const body = req.body as { rating: number; comment?: string };
    const data = await this.service.create(user, bookingId, body);
    sendResponse(res, { statusCode: status.CREATED, success: true, message: 'Review created successfully', data });
  }

  @Get('turfs/:turfId/reviews')
  async listByTurf(@Param('turfId') turfId: string, @Res() res: Response) {
    const data = await this.service.listByTurf(turfId);
    sendResponse(res, { statusCode: status.OK, success: true, message: 'Reviews fetched successfully', data });
  }

  @Get('bookings/:bookingId/reviews')
  @AuthRoles(UserRole.USER, UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  @UseGuards(CheckAuthGuard)
  async findByBooking(@Param('bookingId') bookingId: string, @Res() res: Response) {
    const data = await this.service.findByBooking(bookingId);
    sendResponse(res, { statusCode: status.OK, success: true, message: 'Review fetched successfully', data });
  }

  @Patch('reviews/:reviewId/hide')
  @AuthRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseGuards(CheckAuthGuard)
  async hide(@CurrentUser() _user: IRequestUser, @Param('reviewId') reviewId: string, @Res() res: Response) {
    const data = await this.service.hide(reviewId);
    sendResponse(res, { statusCode: status.OK, success: true, message: 'Review hidden successfully', data });
  }

  @Patch('reviews/:reviewId/unhide')
  @AuthRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseGuards(CheckAuthGuard)
  async unhide(@CurrentUser() _user: IRequestUser, @Param('reviewId') reviewId: string, @Res() res: Response) {
    const data = await this.service.unhide(reviewId);
    sendResponse(res, { statusCode: status.OK, success: true, message: 'Review unhidden successfully', data });
  }

  @Patch('reviews/:reviewId/reply')
  @AuthRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseGuards(CheckAuthGuard)
  async reply(@CurrentUser() user: IRequestUser, @Param('reviewId') reviewId: string, @Body('comment') comment: string, @Res() res: Response) {
    if (!comment || !comment.trim()) {
      throw new AppError(status.BAD_REQUEST, 'Reply comment is required');
    }
    const data = await this.service.reply(user, reviewId, comment.trim());
    sendResponse(res, { statusCode: status.OK, success: true, message: 'Reply added successfully', data });
  }

  @Delete('reviews/:reviewId')
  @AuthRoles(UserRole.SUPER_ADMIN)
  @UseGuards(CheckAuthGuard)
  async remove(@CurrentUser() _user: IRequestUser, @Param('reviewId') reviewId: string, @Res() res: Response) {
    const data = await this.service.remove(reviewId);
    sendResponse(res, { statusCode: status.OK, success: true, message: 'Review removed successfully', data });
  }
}
