import { Module } from '@nestjs/common';
import { CheckAuthGuard } from '../../../common/guards/check-auth.guard';
import { TurfPricingController } from './turf-pricing.controller';
import { TurfPricingService } from './turf-pricing.service';


@Module({
  controllers: [TurfPricingController],
  providers: [TurfPricingService, CheckAuthGuard],
  exports: [TurfPricingService],
})
export class TurfPricingModule {}
