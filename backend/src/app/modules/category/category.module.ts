import { Module } from '@nestjs/common';
import { CheckAuthGuard } from '../../../common/guards/check-auth.guard';
import { CategoryController } from './category.controller';
import { CategoryDropdownController } from './category-dropdown.controller';
import { CategoryService } from './category.service';

@Module({
  controllers: [CategoryController, CategoryDropdownController],
  providers: [CategoryService, CheckAuthGuard],
})
export class CategoryModule {}
