import { Module } from '@nestjs/common';
import { AuthModule } from './app/modules/auth/auth.module';
import { TurfModule } from './app/modules/turf/turf.module';
import { BookingModule } from './app/modules/booking/booking.module';
import { PaymentModule } from './app/modules/payment/payment.module';
import { AuthorizationModule } from './app/modules/authorization/authorization.module';
import { ReportingModule } from './app/modules/reporting/reporting.module';
import { CategoryModule } from './app/modules/category/category.module';
import { FacilityModule } from './app/modules/facility/facility.module';
import { PackageModule } from './app/modules/package/package.module';
import { TurfImageModule } from './app/modules/turf-image/turf-image.module';
import { InvoiceModule } from './app/modules/invoice/invoice.module';
import { UserModule } from './app/modules/user/user.module';
import { ReviewModule } from './app/modules/review/review.module';
import { RefundModule } from './app/modules/refund/refund.module';
import { OwnerProfileModule } from './app/modules/owner-profile/owner-profile.module';
import { TurfSlotModule } from './app/modules/turf-slots/turf-slot.module';
import { TurfPricingModule } from './app/modules/turf-pricing/turf-pricing.module';
import { SubscriptionModule } from './app/modules/subscription/subscription.module';

@Module({
  imports: [
    AuthModule,
    TurfModule,
    TurfSlotModule,
    TurfPricingModule,
    TurfImageModule,
    CategoryModule,
    FacilityModule,
    PackageModule,
    BookingModule,
    PaymentModule,
    AuthorizationModule,
    ReportingModule,
    InvoiceModule,
    UserModule,
    ReviewModule,
    RefundModule,
    OwnerProfileModule,
    SubscriptionModule,
  ]
})
export class AppModule { }
