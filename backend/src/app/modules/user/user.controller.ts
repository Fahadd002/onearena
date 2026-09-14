import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import status from 'http-status';
import { AuthRoles } from '../../../common/decorators/auth-roles.decorator';
import { CheckAuthGuard } from '../../../common/guards/check-auth.guard';
import { UserRole } from '../../../generated/prisma/enums';
import sendResponse from '../../../shared/sendResponse';
import { UserService } from './user.service';

@Controller('api/v1')
export class UserController {
  constructor(private readonly service: UserService) {}

  @Get('users')
  @AuthRoles(UserRole.SUPER_ADMIN)
  @UseGuards(CheckAuthGuard)
  async list(
    @Res() res: Response,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
    @Query('role') role?: string,
    @Query('status') userStatus?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const data = await this.service.list(
      search,
      sortBy,
      sortOrder,
      role,
      userStatus,
      Number(page) || 1,
      Number(limit) || 10,
    );
    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: 'Users fetched successfully',
      data,
    });
  }

  @Post('users')
  @AuthRoles(UserRole.SUPER_ADMIN)
  @UseGuards(CheckAuthGuard)
  async create(@Body() body: { name: string; email: string; role: UserRole }, @Res() res: Response) {
    const data = await this.service.create(body);
    sendResponse(res, { statusCode: status.CREATED, success: true, message: 'User created successfully', data });
  }

  @Patch('users/:id/status')
  @AuthRoles(UserRole.SUPER_ADMIN)
  @UseGuards(CheckAuthGuard)
  async updateStatus(@Param('id') id: string, @Res() res: Response, @Req() req: Request) {
    const body = req.body as { status: string };
    const data = await this.service.updateStatus(id, body.status);
    sendResponse(res, { statusCode: status.OK, success: true, message: 'User status updated successfully', data });
  }

  @Patch('users/:id/role')
  @AuthRoles(UserRole.SUPER_ADMIN)
  @UseGuards(CheckAuthGuard)
  async updateRole(@Param('id') id: string, @Res() res: Response, @Req() req: Request) {
    const body = req.body as { role: string };
    const data = await this.service.updateRole(id, body.role);
    sendResponse(res, { statusCode: status.OK, success: true, message: 'User role updated successfully', data });
  }

  @Delete('users/:id')
  @AuthRoles(UserRole.SUPER_ADMIN)
  @UseGuards(CheckAuthGuard)
  async remove(@Param('id') id: string, @Res() res: Response) {
    const data = await this.service.remove(id);
    sendResponse(res, { statusCode: status.OK, success: true, message: 'User removed successfully', data });
  }
}
