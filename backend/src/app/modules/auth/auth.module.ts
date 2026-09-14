import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CheckAuthGuard } from '../../../common/guards/check-auth.guard';
import { OwnerProfileModule } from '../owner-profile/owner-profile.module';

@Module({
  imports: [OwnerProfileModule],
  controllers: [AuthController],
  providers: [AuthService, CheckAuthGuard],
  exports: [AuthService, OwnerProfileModule],
})
export class AuthModule {}
