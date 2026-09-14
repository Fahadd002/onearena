import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import status from 'http-status';
import sendResponse from '../../../shared/sendResponse';
import { UserService } from './user.service';

@Controller('api/v1/user-dropdown')
export class UserDropdownController {
  constructor(private readonly service: UserService) {}

  @Get()
  async list(@Res() res: Response) {
    const result = await this.service.listAdminDropdown();

    return sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: 'Admin dropdown fetched successfully',
      data: result,
    });
  }
}
