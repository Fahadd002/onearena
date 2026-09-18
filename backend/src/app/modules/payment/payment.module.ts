import { Module } from '@nestjs/common';
import { CheckAuthGuard } from '../../../common/guards/check-auth.guard';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';

@Module({
  controllers: [PaymentController],
  providers: [PaymentService, CheckAuthGuard],
  exports: [PaymentService],
})
export class PaymentModule {}
