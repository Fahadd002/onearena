import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import status from 'http-status';
import { AuthRoles } from '../../../common/decorators/auth-roles.decorator';
import { CheckAuthGuard } from '../../../common/guards/check-auth.guard';
import { UserRole } from '../../../generated/prisma/enums';
import sendResponse from '../../../shared/sendResponse';
import { CategoryService } from './category.service';

@Controller('api/v1/categories')
export class CategoryController {
  constructor(private readonly service: CategoryService) {}

  @Get()
  list(
    @Query('search') search: string | undefined,
    @Query('sortBy') sortBy: string | undefined,
    @Query('sortOrder') sortOrder: string | undefined,
    @Query('page') page: string | undefined,
    @Query('limit') limit: string | undefined,
    @Res() res: Response,
  ) {
    return this.reply(res, this.service.list(search, sortBy, sortOrder, Number(page) || 1, Number(limit) || 10));
  }

  @Post()
  @AuthRoles(UserRole.SUPER_ADMIN)
  @UseGuards(CheckAuthGuard)
  create(@Body('name') name: string, @Res() res: Response) {
    return this.reply(res, this.service.create(name), status.CREATED);
  }

  @Patch(':id')
  @AuthRoles(UserRole.SUPER_ADMIN)
  @UseGuards(CheckAuthGuard)
  update(@Param('id') id: string, @Body('name') name: string, @Res() res: Response) {
    return this.reply(res, this.service.update(id, name));
  }

  @Delete(':id')
  @AuthRoles(UserRole.SUPER_ADMIN)
  @UseGuards(CheckAuthGuard)
  remove(@Param('id') id: string, @Res() res: Response) {
    return this.reply(res, this.service.delete(id));
  }

  private async reply(res: Response, operation: Promise<unknown>, code: number = status.OK) {
    return sendResponse(res, { statusCode: code, success: true, message: 'Category operation successful', data: await operation });
  }
}
