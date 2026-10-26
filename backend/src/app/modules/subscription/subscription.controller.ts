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
import { FixedPeriod, SubscriptionStatus, UserRole, FeatureType } from '../../../generated/prisma/enums';
import { SubscriptionService } from './subscription.service';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthRoles } from '../../../common/decorators/auth-roles.decorator';
import { CheckAuthGuard } from '../../../common/guards/check-auth.guard';
import sendResponse from '../../../shared/sendResponse';
import { IRequestUser } from '../../interfaces/requestUser.interface';

@Controller('/api/v1')
export class SubscriptionController {
  constructor(
    private subscriptionService: SubscriptionService
  ) { }

  // -------------------------------------------------------------
  // Super Admin Endpoints plans-pricing Setup
  // -------------------------------------------------------------

  @Get('plans-pricing')
  @AuthRoles(UserRole.SUPER_ADMIN)
  @UseGuards(CheckAuthGuard)
  async getSetUpPlans(
    @Query('search') search: string,
    @Query('sortBy') sortBy: string,
    @Query('sortOrder') sortOrder: 'asc' | 'desc',
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Res() res: Response,
  ) {
    const result = await this.subscriptionService.getSetUpPlans({
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

  @Post('plans-pricing')
  @AuthRoles(UserRole.SUPER_ADMIN)
  @UseGuards(CheckAuthGuard)
  async createPlan(
    @Body()
    body: {
      name: string;
      tierLevel: number;
      maxTurfs: number;
      isFreeTrialAllowed?: boolean;
      freeTrialDuration?: number;
      features: Array<{ name: string; description?: string; type: FeatureType; key?: string }>;
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

  @Patch('plans-pricing/:planId')
  @AuthRoles(UserRole.SUPER_ADMIN)
  @UseGuards(CheckAuthGuard)
  async updatePlan(
    @Param('planId') planId: string,
    @Body()
    body: {
      name?: string;
      tierLevel?: number;
      maxTurfs?: number;
      isFreeTrialAllowed?: boolean;
      freeTrialDuration?: number;
      features?: Array<{ id?: string; name: string; description?: string; type: FeatureType; key?: string }>;
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

  @Delete('plans-pricing/:planId')
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

  @Get('all-subscriptions')
  @AuthRoles(UserRole.SUPER_ADMIN)
  @UseGuards(CheckAuthGuard)
  async getAllOwnerSubscriptions(
    @Query('status') statusFilter: SubscriptionStatus,
    @Query('search') search: string,
    @Query('sortBy') sortBy: string,
    @Query('sortOrder') sortOrder: 'asc' | 'desc',
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Res() res: Response,
  ) {
    const result = await this.subscriptionService.getAllOwnerSubscriptions({
      status: statusFilter,
      search,
      sortBy,
      sortOrder,
      page: Number(page) || 1,
      limit: Number(limit) || 10,
    });
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Owner subscriptions retrieved successfully',
      data: result,
    });
  }

  @Patch('subscriptions/super-admin/:subscriptionId')
  @AuthRoles(UserRole.SUPER_ADMIN)
  @UseGuards(CheckAuthGuard)
  async updateSubscriptionBySuperAdmin(
    @Param('subscriptionId') subscriptionId: string,
    @Body() body: { status?: SubscriptionStatus; endDate?: string; planId?: string },
    @Res() res: Response,
  ) {
    const subscription = await this.subscriptionService.updateSubscriptionBySuperAdmin(
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

  @Get('my-subscription')
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

@Post('active-free')
  @AuthRoles(UserRole.ADMIN)
  @UseGuards(CheckAuthGuard)
  async activateFreeTrialSubscription(
    @CurrentUser() user: IRequestUser,
    @Res() res: Response,
  ) {
    const subscription = await this.subscriptionService.createFreeTrial(
      user,
    );
    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: 'Free trial activated successfully',
      data: subscription,
    });
  }

  @Patch('subscriptions/:subscriptionId')
  @AuthRoles(UserRole.ADMIN)
  @UseGuards(CheckAuthGuard)
  async updateSubscription(
    @Param('subscriptionId') subscriptionId: string,
    @Body() body: { status?: SubscriptionStatus; endDate?: string; planId?: string },
    @Res() res: Response,
  ) {
    const subscription = await this.subscriptionService.updateSubscription(
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
}