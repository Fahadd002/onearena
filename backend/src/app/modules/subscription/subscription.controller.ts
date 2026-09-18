import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import httpStatus from 'http-status';
import { FixedPeriod, SubscriptionStatus, UserRole, PaymentMethod } from '../../../generated/prisma/enums';
import { SubscriptionService } from './subscription.service';
import { PaymentService } from '../payment/payment.service';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthRoles } from '../../../common/decorators/auth-roles.decorator';
import { CheckAuthGuard } from '../../../common/guards/check-auth.guard';
import sendResponse from '../../../shared/sendResponse';
import { IRequestUser } from '../../interfaces/requestUser.interface';

@Controller('/api/v1')
export class SubscriptionController {
  constructor(
    private subscriptionService: SubscriptionService,
    private paymentService: PaymentService
  ) {}

  // -------------------------------------------------------------
  // Super Admin Endpoints (Plan & Subscription Management)
  // -------------------------------------------------------------

  @Get('subscription-plans/admin')
  @AuthRoles(UserRole.SUPER_ADMIN)
  @UseGuards(CheckAuthGuard)
  async getAdminPlans(
    @Query('search') search: string,
    @Query('sortBy') sortBy: string,
    @Query('sortOrder') sortOrder: 'asc' | 'desc',
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Res() res: Response,
  ) {
    const result = await this.subscriptionService.getAdminPlans({
      search,
      sortBy,
      sortOrder,
      page: Number(page) || 1,
      limit: Number(limit) || 10,
    });
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'All subscription plans retrieved successfully',
      data: result,
    });
  }

  @Get('subscription-plans')
  async getPlansLegacy(@Res() res: Response) {
    const plans = await this.subscriptionService.getPlans();
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Active subscription plans retrieved successfully',
      data: plans,
    });
  }

  @Get('subscription-plans/:planId')
  async getPlan(@Param('planId') planId: string, @Res() res: Response) {
    const plan = await this.subscriptionService.getPlanById(planId);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Subscription plan retrieved successfully',
      data: plan,
    });
  }

  @Post('subscription-plans')
  @AuthRoles(UserRole.SUPER_ADMIN)
  @UseGuards(CheckAuthGuard)
  async createPlan(
    @Body()
    body: {
      name: string;
      tierLevel: number;
      maxTurfs: number;
      features: string[];
      prices: { period: FixedPeriod; price: number }[];
    },
    @Res() res: Response,
  ) {
    const plan = await this.subscriptionService.createPlan(body);
    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: 'Subscription plan created successfully',
      data: plan,
    });
  }

  @Patch('subscription-plans/:planId')
  @AuthRoles(UserRole.SUPER_ADMIN)
  @UseGuards(CheckAuthGuard)
  async updatePlan(
    @Param('planId') planId: string,
    @Body()
    body: {
      name?: string;
      tierLevel?: number;
      maxTurfs?: number;
      features?: string[];
      active?: boolean;
    },
    @Res() res: Response,
  ) {
    const plan = await this.subscriptionService.updatePlan(planId, body);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Subscription plan updated successfully',
      data: plan,
    });
  }

  @Delete('subscription-plans/:planId')
  @AuthRoles(UserRole.SUPER_ADMIN)
  @UseGuards(CheckAuthGuard)
  async deletePlan(@Param('planId') planId: string, @Res() res: Response) {
    await this.subscriptionService.deletePlan(planId);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Subscription plan deleted successfully',
      data: null,
    });
  }

  @Get('subscriptions/admin')
  @AuthRoles(UserRole.SUPER_ADMIN)
  @UseGuards(CheckAuthGuard)
  async getAdminSubscriptions(
    @Query('status') statusFilter: SubscriptionStatus,
    @Query('search') search: string,
    @Res() res: Response,
  ) {
    const subscriptions = await this.subscriptionService.getAdminSubscriptions({
      status: statusFilter,
      search,
    });
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Owner subscriptions retrieved successfully',
      data: subscriptions,
    });
  }

  @Patch('subscriptions/admin/:subscriptionId')
  @AuthRoles(UserRole.SUPER_ADMIN)
  @UseGuards(CheckAuthGuard)
  async updateAdminSubscription(
    @Param('subscriptionId') subscriptionId: string,
    @Body() body: { status?: SubscriptionStatus; endDate?: string; planId?: string },
    @Res() res: Response,
  ) {
    const subscription = await this.subscriptionService.updateAdminSubscription(
      subscriptionId,
      body,
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Owner subscription updated successfully',
      data: subscription,
    });
  }

  // -------------------------------------------------------------
  // Owner Endpoints (User Subscription Actions)
  // -------------------------------------------------------------

  @Get('subscription')
  @AuthRoles(UserRole.ADMIN)
  @UseGuards(CheckAuthGuard)
  async getCurrentSubscription(
    @CurrentUser() user: IRequestUser,
    @Res() res: Response,
  ) {
    const subscription = await this.subscriptionService.getCurrentSubscription(user);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Current subscription retrieved successfully',
      data: subscription,
    });
  }


  @Post('subscription/subscribe')
  @AuthRoles(UserRole.ADMIN)
  @UseGuards(CheckAuthGuard)
  async subscribe(
    @CurrentUser() user: IRequestUser,
    @Body() body: { planId: string; billingCycle: FixedPeriod },
    @Res() res: Response,
  ) {
    const subscription = await this.subscriptionService.subscribeOrUpgrade(
      user,
      body.planId,
      body.billingCycle,
    );
    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: 'Subscription process executed successfully',
      data: subscription,
    });
  }

  @Post('subscriptions/activate')
  @AuthRoles(UserRole.ADMIN)
  @UseGuards(CheckAuthGuard)
  async activateSubscription(
    @CurrentUser() user: IRequestUser,
    @Body() body: { planId: string; billingPeriod: FixedPeriod },
    @Res() res: Response,
  ) {
    const subscription = await this.subscriptionService.subscribeOrUpgrade(
      user,
      body.planId,
      body.billingPeriod,
    );
    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: 'Subscription activated successfully',
      data: subscription,
    });
  }

  @Patch('subscription/cancel')
  @AuthRoles(UserRole.ADMIN)
  @UseGuards(CheckAuthGuard)
  async cancel(@CurrentUser() user: IRequestUser, @Res() res: Response) {
    const subscription = await this.subscriptionService.cancel(user);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Subscription cancelled successfully',
      data: subscription,
    });
  }

  @Get('subscription/history')
  @AuthRoles(UserRole.ADMIN)
  @UseGuards(CheckAuthGuard)
  async getHistory(@CurrentUser() user: IRequestUser, @Res() res: Response) {
    const history = await this.subscriptionService.getSubscriptionHistory(user);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Subscription audit history retrieved successfully',
      data: history,
    });
  }

  // -------------------------------------------------------------
  // Owner Payment Endpoints
  // -------------------------------------------------------------

  @Post('subscription/payment/initiate')
  @AuthRoles(UserRole.ADMIN)
  @UseGuards(CheckAuthGuard)
  async initiatePayment(
    @CurrentUser() user: IRequestUser,
    @Body() body: { planId: string; billingPeriod: FixedPeriod; paymentMethod: PaymentMethod; providerTransactionId?: string },
    @Res() res: Response,
  ) {
    const result = await this.paymentService.initiateSubscriptionPayment(
      user,
      body.planId,
      body.billingPeriod,
      body.paymentMethod,
      body.providerTransactionId
    );
    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: 'Payment initiated successfully',
      data: result,
    });
  }

  @Post('subscription/payment/verify')
  @AuthRoles(UserRole.ADMIN)
  @UseGuards(CheckAuthGuard)
  async verifyPayment(
    @CurrentUser() user: IRequestUser,
    @Body() body: { invoiceId: string; providerTransactionId: string; paymentMethod: PaymentMethod },
    @Res() res: Response,
  ) {
    const result = await this.paymentService.verifySubscriptionPayment(
      user,
      body.invoiceId,
      body.providerTransactionId,
      body.paymentMethod
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Payment verified successfully',
      data: result,
    });
  }
}