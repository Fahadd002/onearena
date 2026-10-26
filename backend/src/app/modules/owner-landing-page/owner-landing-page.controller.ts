import { Controller, Get, Param, Res } from '@nestjs/common';

import { Response } from 'express';
import status from 'http-status';

import sendResponse from '../../../shared/sendResponse';
import { OwnerLandingPageService } from './owner-landing-page.service';

@Controller('api/v1/owners')
export class OwnerLandingPageController {
  constructor(private readonly service: OwnerLandingPageService) {}

  /**
   * Public owner landing page. Intentionally unauthenticated — no
   * `@UseGuards(CheckAuthGuard)` and no `@AuthRoles(...)`.
   *
   * The response is shaped by `OwnerLandingPageDto`, which excludes all
   * sensitive owner and business data.
   */
  @Get(':ownerId/landing')
  async getLandingPage(
    @Param('ownerId') ownerId: string,
    @Res() res: Response,
  ) {
    const data = await this.service.getLandingPage(ownerId);

    return sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: 'Owner landing page fetched successfully',
      data,
    });
  }
}
