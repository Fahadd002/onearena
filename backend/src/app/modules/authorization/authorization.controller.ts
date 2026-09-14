import { Body, Controller, Delete, Get, Param, Post, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import status from 'http-status';
import { AuthRoles } from '../../../common/decorators/auth-roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CheckAuthGuard } from '../../../common/guards/check-auth.guard';
import { ManagerPermission, UserRole } from '../../../generated/prisma/enums';
import sendResponse from '../../../shared/sendResponse';
import { IRequestUser } from '../../interfaces/requestUser.interface';
import { AuthorizationService } from './authorization.service';

@Controller('api/v1/owner')
export class AuthorizationController {
  constructor(private readonly service: AuthorizationService) {}
  @Get('managers') @AuthRoles(UserRole.ADMIN) @UseGuards(CheckAuthGuard) async managers(@CurrentUser() user: IRequestUser, @Res() res: Response) { const data = await this.service.listManagers(user); sendResponse(res, { statusCode: status.OK, success: true, message: 'Managers fetched successfully', data }); }
  @Get('turfs/:turfId/managers') @AuthRoles(UserRole.ADMIN) @UseGuards(CheckAuthGuard) async assignments(@CurrentUser() user: IRequestUser, @Param('turfId') turfId: string, @Res() res: Response) { const data = await this.service.listAssignments(user, turfId); sendResponse(res, { statusCode: status.OK, success: true, message: 'Manager assignments fetched successfully', data }); }
  @Post('turfs/:turfId/managers') @AuthRoles(UserRole.ADMIN) @UseGuards(CheckAuthGuard) async assign(@CurrentUser() user: IRequestUser, @Param('turfId') turfId: string, @Body() body: { managerId: string; permissions: ManagerPermission[] }, @Res() res: Response) { const data = await this.service.assignManager(user, turfId, body.managerId, body.permissions); sendResponse(res, { statusCode: status.OK, success: true, message: 'Manager permissions saved successfully', data }); }
  @Delete('turfs/:turfId/managers/:managerId') @AuthRoles(UserRole.ADMIN) @UseGuards(CheckAuthGuard) async unassign(@CurrentUser() user: IRequestUser, @Param('turfId') turfId: string, @Param('managerId') managerId: string, @Res() res: Response) { const data = await this.service.unassignManager(user, turfId, managerId); sendResponse(res, { statusCode: status.OK, success: true, message: 'Manager unassigned successfully', data }); }
}

