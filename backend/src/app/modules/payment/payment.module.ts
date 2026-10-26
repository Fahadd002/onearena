import { Module } from '@nestjs/common';
import { CheckAuthGuard } from '../../../common/guards/check-auth.guard';
import { PaymentController } from './payment.controller';
import { BookingPaymentService } from './booking-payment.service';
import { SubscriptionPaymentService } from './subscription-payment.service';
import { InvoiceModule } from '../invoice/invoice.module';

@Module({
  imports: [InvoiceModule],
  controllers: [PaymentController],
  providers: [BookingPaymentService, SubscriptionPaymentService, CheckAuthGuard],
  exports: [BookingPaymentService, SubscriptionPaymentService],
})
export class PaymentModule {}
