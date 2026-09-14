import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Res } from '@nestjs/common';
import { Response } from 'express';
import httpStatus from 'http-status';
import { FixedPeriod } from '../../../generated/prisma/enums';
import { SubscriptionService } from './subscription.service';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthRoles } from '../../../common/decorators/auth-roles.decorator';
import { CheckAuthGuard } from '../../../common/guards/check-auth.guard';
import sendResponse from '../../../shared/sendResponse';
import { IRequestUser } from '../../interfaces/requestUser.interface';
import { UserRole } from '../../../generated/prisma/enums';

@Controller('/api/v1')
export class SubscriptionController {
  constructor(private subscriptionService: SubscriptionService) {}

  // Get all active subscription plans (public) - New endpoint for frontend
  @Get('subscriptions/plans')
  async getSubscriptionPlans(@Res() res: Response) {
    const plans = await this.subscriptionService.getPlans();
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Subscription plans retrieved',
      data: plans,
    });
  }

  // Get all active subscription plans (legacy endpoint)
  @Get('subscription-plans')
  async getPlans(@Res() res: Response) {
    const plans = await this.subscriptionService.getPlans();
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Subscription plans retrieved',
      data: plans,
    });
  }

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
    const result = await this.subscriptionService.getAdminPlans({ search, sortBy, sortOrder, page: Number(page), limit: Number(limit) });
    sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'Subscription plans retrieved', data: result });
  }

  @Post('subscription-plans')
  @AuthRoles(UserRole.SUPER_ADMIN)
  @UseGuards(CheckAuthGuard)
  async createPlan(@Body() body: any, @Res() res: Response) {
    const plan = await this.subscriptionService.createPlan(body);
    sendResponse(res, { statusCode: httpStatus.CREATED, success: true, message: 'Subscription plan created', data: plan });
  }

  @Patch('subscription-plans/:planId')
  @AuthRoles(UserRole.SUPER_ADMIN)
  @UseGuards(CheckAuthGuard)
  async updatePlan(@Param('planId') planId: string, @Body() body: any, @Res() res: Response) {
    const plan = await this.subscriptionService.updatePlan(planId, body);
    sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'Subscription plan updated', data: plan });
  }

  @Delete('subscription-plans/:planId')
  @AuthRoles(UserRole.SUPER_ADMIN)
  @UseGuards(CheckAuthGuard)
  async deletePlan(@Param('planId') planId: string, @Res() res: Response) {
    await this.subscriptionService.deletePlan(planId);
    sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'Subscription plan deleted', data: null });
  }

  // Get single plan (public)
  @Get('subscription-plans/:planId')
  async getPlan(@Res() res: Response) {
    const plan = await this.subscriptionService.getPlan(res.locals.planId);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Subscription plan retrieved',
      data: plan,
    });
  }

  // Get current subscription (owner only)
  @Get('subscription')
  @AuthRoles(UserRole.ADMIN)
  @UseGuards(CheckAuthGuard)
  async getCurrentSubscription(@CurrentUser() user: IRequestUser, @Res() res: Response) {
    const subscription = await this.subscriptionService.getCurrentSubscription(user);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Current subscription retrieved',
      data: subscription,
    });
  }

  // Subscribe to plan (owner only)
  @Post('subscription/subscribe')
  @AuthRoles(UserRole.ADMIN)
  @UseGuards(CheckAuthGuard)
  async subscribe(
    @CurrentUser() user: IRequestUser,
    @Body() body: { planId: string; billingCycle: FixedPeriod },
    @Res() res: Response
  ) {
    const subscription = await this.subscriptionService.subscribe(
      user,
      body.planId,
      body.billingCycle
    );
    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: 'Subscription created with 30-day free trial',
      data: subscription,
    });
  }

  // Activate subscription (owner only) - New endpoint for frontend
  @Post('subscriptions/activate')
  @AuthRoles(UserRole.ADMIN)
  @UseGuards(CheckAuthGuard)
  async activateSubscription(
    @CurrentUser() user: IRequestUser,
    @Body() body: { planId: string; billingPeriod: FixedPeriod },
    @Res() res: Response
  ) {
    const subscription = await this.subscriptionService.subscribe(
      user,
      body.planId,
      body.billingPeriod
    );
    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: 'Subscription activated! Your 1-month free trial begins now.',
      data: subscription,
    });
  }

  @Post('subscriptions/free-trial')
  @AuthRoles(UserRole.ADMIN)
  @UseGuards(CheckAuthGuard)
  async activateFreeTrial(@CurrentUser() user: IRequestUser, @Res() res: Response) {
    const subscription = await this.subscriptionService.activateFreeTrial(user);
    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: 'Free trial activated for one month',
      data: subscription,
    });
  }

  // Renew subscription (owner only)
  @Post('subscription/renew')
  @AuthRoles(UserRole.ADMIN)
  @UseGuards(CheckAuthGuard)
  async renew(
    @CurrentUser() user: IRequestUser,
    @Body() body: { billingCycle: FixedPeriod },
    @Res() res: Response
  ) {
    const subscription = await this.subscriptionService.renew(user, body.billingCycle);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Subscription renewed',
      data: subscription,
    });
  }

  // Cancel subscription (owner only)
  @Patch('subscription/cancel')
  @AuthRoles(UserRole.ADMIN)
  @UseGuards(CheckAuthGuard)
  async cancel(@CurrentUser() user: IRequestUser, @Res() res: Response) {
    const subscription = await this.subscriptionService.cancel(user);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Subscription cancelled',
      data: subscription,
    });
  }

  // Get subscription history (owner only)
  @Get('subscription/history')
  @AuthRoles(UserRole.ADMIN)
  @UseGuards(CheckAuthGuard)
  async getHistory(@CurrentUser() user: IRequestUser, @Res() res: Response) {
    const history = await this.subscriptionService.getSubscriptionHistory(user);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Subscription history retrieved',
      data: history,
    });
  }
}
