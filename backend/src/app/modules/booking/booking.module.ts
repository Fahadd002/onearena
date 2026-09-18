import { Module } from '@nestjs/common';
import { CheckAuthGuard } from '../../../common/guards/check-auth.guard';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';

@Module({
  controllers: [BookingController],
  providers: [BookingService, CheckAuthGuard],
  exports: [BookingService],
})
export class BookingModule {}
