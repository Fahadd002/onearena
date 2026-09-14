import { Module } from '@nestjs/common';
import { OwnerProfileController } from './owner-profile.controller';
import { OwnerProfileService } from './owner-profile.service';
import { CheckAuthGuard } from '../../../common/guards/check-auth.guard';

@Module({
  controllers: [OwnerProfileController],
  providers: [OwnerProfileService, CheckAuthGuard],
  exports: [OwnerProfileService],
})
export class OwnerProfileModule {}
