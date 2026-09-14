import { Module } from '@nestjs/common';
import { CheckAuthGuard } from '../../../common/guards/check-auth.guard';
import { TurfSlotController } from './turf-slot.controller';
import { TurfSlotService } from './turf-slot.service';

@Module({
  controllers: [TurfSlotController],
  providers: [TurfSlotService, CheckAuthGuard],
  exports: [TurfSlotService],
})
export class TurfSlotModule {}
