import { Module } from '@nestjs/common';
import { CheckAuthGuard } from '../../../common/guards/check-auth.guard';
import { RefundController } from './refund.controller';
import { RefundService } from './refund.service';

@Module({
  controllers: [RefundController],
  providers: [RefundService, CheckAuthGuard],
  exports: [RefundService],
})
export class RefundModule {}
