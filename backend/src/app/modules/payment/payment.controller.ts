import { Controller, Get, Headers, Param, Patch, Post, Req, Res, UseGuards, Body } from '@nestjs/common';
import { Request, Response } from 'express';
import status from 'http-status';
import { AuthRoles } from '../../../common/decorators/auth-roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CheckAuthGuard } from '../../../common/guards/check-auth.guard';
import { FixedPeriod, PaymentMethod, PaymentStatus, UserRole } from '../../../generated/prisma/enums';
import sendResponse from '../../../shared/sendResponse';
import { IRequestUser } from '../../interfaces/requestUser.interface';
import { BookingPaymentService } from './booking-payment.service';
import { SubscriptionPaymentService } from './subscription-payment.service';

@Controller('api/v1')
export class PaymentController {
  constructor(
    private readonly bookingPaymentService: BookingPaymentService,
    private readonly subscriptionPaymentService: SubscriptionPaymentService
  ) { }

  @Post('bookings/:bookingId/checkout')
  @AuthRoles(UserRole.USER, UserRole.ADMIN, UserRole.MANAGER)
  @UseGuards(CheckAuthGuard)
  async checkout(
    @CurrentUser() user: IRequestUser,
    @Param('bookingId') id: string,
    @Res() res: Response,
  ) {
    const data = await this.bookingPaymentService.checkout(user, id);
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
    const data = await this.bookingPaymentService.manualPayment(user, bookingId, body);
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
    const data = await this.bookingPaymentService.webhook(req.body as Buffer, signature);
    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: 'Webhook received',
      data,
    });
  }

  @Get('invoices/:invoiceId/payments')
  @AuthRoles(UserRole.USER, UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  @UseGuards(CheckAuthGuard)
  async listPaymentsByInvoice(
    @CurrentUser() user: IRequestUser,
    @Param('invoiceId') invoiceId: string,
    @Res() res: Response,
  ) {
    const data = await this.bookingPaymentService.listPaymentsByInvoice(user, invoiceId);
    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: 'Payments fetched successfully',
      data,
    });
  }

  @Patch('payments/:paymentId/status')
  @AuthRoles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  @UseGuards(CheckAuthGuard)
  async updatePaymentStatus(
    @CurrentUser() user: IRequestUser,
    @Param('paymentId') paymentId: string,
    @Body() body: { status: PaymentStatus; note?: string },
    @Res() res: Response,
  ) {
    const data = await this.bookingPaymentService.updatePaymentStatus(user, paymentId, body);
    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: 'Payment status updated successfully',
      data,
    });
  }

  // Subscription Payment Starts

  @Post('subscription/payment/initiate')
  @AuthRoles(UserRole.ADMIN)
  @UseGuards(CheckAuthGuard)
  async initiateSubscriptionPayment(
    @CurrentUser() user: IRequestUser,
    @Body()
    body: {
      planId: string;
      billingPeriod: FixedPeriod;
      paymentMethod: PaymentMethod;
      providerTransactionId?: string;
      payerMobileNumber?: string;
    },
    @Res() res: Response,
  ) {
    const data = await this.subscriptionPaymentService.initiateSubscriptionPayment(
      user,
      body.planId,
      body.billingPeriod,
      body.paymentMethod,
      body.providerTransactionId,
      body.payerMobileNumber,
    );
    sendResponse(res, {
      statusCode: status.CREATED,
      success: true,
      message: 'Payment initiated successfully',
      data,
    });
  }

  @Post('subscription/payment/verify')
  @AuthRoles(UserRole.ADMIN)
  @UseGuards(CheckAuthGuard)
  async verifySubscriptionPayment(
    @CurrentUser() user: IRequestUser,
    @Body()
    body: {
      invoiceId: string;
      providerTransactionId: string;
      paymentMethod: PaymentMethod;
    },
    @Res() res: Response,
  ) {
    const data = await this.subscriptionPaymentService.verifySubscriptionPayment(
      user,
      body.invoiceId,
      body.providerTransactionId,
      body.paymentMethod,
    );
    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: 'Payment verified successfully',
      data,
    });
  }

  @Post("subscriptions/:subscriptionId/take-cash-payment")
  @AuthRoles(UserRole.SUPER_ADMIN)
  @UseGuards(CheckAuthGuard)
  async takeCashPaymentForSubscription(
    @Param("subscriptionId") subscriptionId: string,
    @CurrentUser() user: IRequestUser,
    @Body()
    body: {
      amount?: number;
      reference?: string;
      note?: string;
    },
    @Res() res: Response,
  ) {
    const result = await this.subscriptionPaymentService.takeCashPaymentForSubscription(
      subscriptionId,
      user,
      body,
    );
    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: "Cash payment recorded and subscription activated",
      data: result,
    });
  }

  @Post("subscriptions/:subscriptionId/confirm-online-payment")
  @AuthRoles(UserRole.SUPER_ADMIN)
  @UseGuards(CheckAuthGuard)
  async confirmOnlinePaymentForSubscription(
    @Param("subscriptionId") subscriptionId: string,
    @CurrentUser() user: IRequestUser,
    @Res() res: Response,
  ) {
    const result =
      await this.subscriptionPaymentService.confirmOnlinePaymentForSubscription(
        subscriptionId,
        user,
      );
    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: "Online subscription payment confirmed and subscription activated",
      data: result,
    });
  }
}
