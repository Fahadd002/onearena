import { Controller, Headers, Param, Post, Req, Res, UseGuards, Body } from '@nestjs/common';
import { Request, Response } from 'express';
import status from 'http-status';
import { AuthRoles } from '../../../common/decorators/auth-roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CheckAuthGuard } from '../../../common/guards/check-auth.guard';
import { UserRole } from '../../../generated/prisma/enums';
import sendResponse from '../../../shared/sendResponse';
import { IRequestUser } from '../../interfaces/requestUser.interface';
import { PaymentService } from './payment.service';

@Controller('api/v1')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('bookings/:bookingId/checkout')
  @AuthRoles(UserRole.USER, UserRole.ADMIN, UserRole.MANAGER)
  @UseGuards(CheckAuthGuard)
  async checkout(
    @CurrentUser() user: IRequestUser,
    @Param('bookingId') id: string,
    @Res() res: Response,
  ) {
    const data = await this.paymentService.checkout(user, id);
    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: 'Checkout session created successfully',
      data,
    });
  }

  @Post('bookings/:bookingId/manual-payment')
  @AuthRoles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  @UseGuards(CheckAuthGuard)
  async manualPayment(
    @CurrentUser() user: IRequestUser,
    @Param('bookingId') bookingId: string,
    @Body() body: { amount: number; method: 'CASH'; reference?: string; note?: string },
    @Res() res: Response,
  ) {
    const data = await this.paymentService.manualPayment(user, bookingId, body);
    sendResponse(res, {
      statusCode: status.CREATED,
      success: true,
      message: 'Manual payment recorded successfully',
      data,
    });
  }

  @Post('payments/stripe/webhook')
  async webhook(
    @Req() req: Request,
    @Headers('stripe-signature') signature: string,
    @Res() res: Response,
  ) {
    const data = await this.paymentService.webhook(req.body as Buffer, signature);
    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: 'Webhook received',
      data,
    });
  }
}
