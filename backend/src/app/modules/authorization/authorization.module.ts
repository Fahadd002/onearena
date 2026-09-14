import { Module } from '@nestjs/common';
import { CheckAuthGuard } from '../../../common/guards/check-auth.guard';
import { AuthorizationService } from './authorization.service';
import { AuthorizationController } from './authorization.controller';

@Module({ controllers: [AuthorizationController], providers: [AuthorizationService, CheckAuthGuard], exports: [AuthorizationService] })
export class AuthorizationModule {}
