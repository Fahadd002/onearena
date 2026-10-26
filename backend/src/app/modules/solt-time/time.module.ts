import { Module } from "@nestjs/common";
import { CheckAuthGuard } from "../../../common/guards/check-auth.guard";
import { TimeController } from "./time.controller";
import { TimeService } from "./time.service";

@Module({
  controllers: [TimeController],
  providers: [TimeService, CheckAuthGuard],
})
export class TimeStupModule {}