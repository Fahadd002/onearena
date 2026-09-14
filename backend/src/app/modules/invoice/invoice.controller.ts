import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import status from 'http-status';
import { AuthRoles } from '../../../common/decorators/auth-roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CheckAuthGuard } from '../../../common/guards/check-auth.guard';
import { UserRole } from '../../../generated/prisma/enums';
import sendResponse from '../../../shared/sendResponse';
import { IRequestUser } from '../../interfaces/requestUser.interface';
import { InvoiceService } from './invoice.service';

@Controller('api/v1')
export class InvoiceController {
  constructor(private readonly service: InvoiceService) {}

  @Get('bookings/:bookingId/invoice')
  @AuthRoles(UserRole.USER, UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  @UseGuards(CheckAuthGuard)
  async byBooking(@CurrentUser() user: IRequestUser, @Param('bookingId') bookingId: string, @Res() res: Response) {
    const data = await this.service.byBooking(user, bookingId);
    sendResponse(res, { statusCode: status.OK, success: true, message: 'Invoice fetched successfully', data });
  }

  @Get('invoices')
  @AuthRoles(UserRole.USER, UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  @UseGuards(CheckAuthGuard)
  async list(@CurrentUser() user: IRequestUser, @Res() res: Response) {
    const data = await this.service.list(user);
    sendResponse(res, { statusCode: status.OK, success: true, message: 'Invoices fetched successfully', data });
  }
}

