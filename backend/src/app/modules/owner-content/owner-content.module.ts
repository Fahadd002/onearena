import { Module } from '@nestjs/common';
import { CheckAuthGuard } from '../../../common/guards/check-auth.guard';
import { OwnerContentController } from './owner-content.controller';
import { OwnerContentService } from './owner-content.service';

@Module({
  controllers: [OwnerContentController],
  providers: [OwnerContentService, CheckAuthGuard],
})
export class OwnerContentModule {}
