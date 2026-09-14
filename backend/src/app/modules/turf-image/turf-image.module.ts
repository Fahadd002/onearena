import { Module } from '@nestjs/common'; 
import { CheckAuthGuard } from '../../../common/guards/check-auth.guard'; 
import { TurfImageController } from './turf-image.controller'; 
import { TurfImageService } from './turf-image.service';
 @Module({ controllers: 
    [TurfImageController], providers: [TurfImageService, CheckAuthGuard]
 }) export class TurfImageModule {}
