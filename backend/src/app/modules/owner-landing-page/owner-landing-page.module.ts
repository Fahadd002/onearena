import { Module } from '@nestjs/common';

import { OwnerLandingPageController } from './owner-landing-page.controller';
import { OwnerLandingPageService } from './owner-landing-page.service';

@Module({
  controllers: [OwnerLandingPageController],
  providers: [OwnerLandingPageService],
})
export class OwnerLandingPageModule {}
