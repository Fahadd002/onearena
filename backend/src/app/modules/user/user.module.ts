import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UserDropdownController } from './user-dropdown.controller';

@Module({
  controllers: [UserController, UserDropdownController],
  providers: [UserService],
  exports: [UserService],

})
export class UserModule {}
