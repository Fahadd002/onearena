import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import status from 'http-status';
import { AuthRoles } from '../../../common/decorators/auth-roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CheckAuthGuard } from '../../../common/guards/check-auth.guard';
import { UserRole } from '../../../generated/prisma/enums';
import sendResponse from '../../../shared/sendResponse';
import { IRequestUser } from '../../interfaces/requestUser.interface';
import { PackagePayload, PackageService } from './package.service';

@Controller('api/v1')
export class PackageController {
  constructor(private readonly service: PackageService) {}

  @Get('turfs/:turfId/packages')
  list(@Param('turfId') turfId: string, @Res() res: Response) {
    return this.reply(res, this.service.list(turfId));
  }

  @Get('owner/packages')
  @AuthRoles(UserRole.ADMIN)
  @UseGuards(CheckAuthGuard)
  async listMine(
    @CurrentUser() user: IRequestUser,
    @Query() query: { turfId?: string; search?: string; sortBy?: string; sortOrder?: string; page?: string; limit?: string; active?: string },
    @Res() res: Response,
  ) {
    const data = await this.service.listMine(user, {
      ...query,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
      active: query.active === 'true' ? true : query.active === 'false' ? false : undefined,
    });
    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: 'Owner packages fetched successfully',
      data,
    });
  }

  @Post('owner/turfs/:turfId/packages')
  @AuthRoles(UserRole.ADMIN)
  @UseGuards(CheckAuthGuard)
  create(@CurrentUser() user: IRequestUser, @Param('turfId') turfId: string, @Body() body: PackagePayload, @Res() res: Response) {
    return this.reply(res, this.service.create(user, turfId, body), status.CREATED);
  }

  @Get('owner/packages/:id')
  @AuthRoles(UserRole.ADMIN)
  @UseGuards(CheckAuthGuard)
  async findOne(@CurrentUser() user: IRequestUser, @Param('id') id: string, @Res() res: Response) {
    return this.reply(res, this.service.findOne(user, id));
  }

  @Patch('owner/packages/:id')
  @AuthRoles(UserRole.ADMIN)
  @UseGuards(CheckAuthGuard)
  update(@CurrentUser() user: IRequestUser, @Param('id') id: string, @Body() body: PackagePayload, @Res() res: Response) {
    return this.reply(res, this.service.update(user, id, body));
  }

  @Delete('owner/packages/:id')
  @AuthRoles(UserRole.ADMIN)
  @UseGuards(CheckAuthGuard)
  remove(@CurrentUser() user: IRequestUser, @Param('id') id: string, @Res() res: Response) {
    return this.reply(res, this.service.delete(user, id));
  }

  private async reply(res: Response, operation: Promise<unknown>, code: number = status.OK) {
    return sendResponse(res, { statusCode: code, success: true, message: 'Package operation successful', data: await operation });
  }
}
