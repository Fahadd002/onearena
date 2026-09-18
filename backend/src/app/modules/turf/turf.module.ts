import { Module } from '@nestjs/common';

import { CheckAuthGuard } from '../../../common/guards/check-auth.guard';

import { TurfController } from './turf.controller';
import { TurfService } from './turf.service';

@Module({
  controllers: [TurfController],

  providers: [
    TurfService,
    CheckAuthGuard,
  ],

  exports: [
    TurfService,
  ],
})
export class TurfModule {}
