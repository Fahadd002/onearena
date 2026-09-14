import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import status from 'http-status';
import sendResponse from '../../../shared/sendResponse';
import IDropdownOption from '../../../types/dropdown';
import { CategoryService } from './category.service';

@Controller('api/v1/category-dropdown')
export class CategoryDropdownController {
  constructor(private readonly service: CategoryService) {}

  @Get()
  async list(@Res() res: Response) {
    const result = await this.service.listAll();
    const categoryDropdown: IDropdownOption[] = result.map((category) => ({
      label: category.name,
      value: category.id,
    }));

    return sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: 'Category dropdown fetched successfully',
      data: categoryDropdown,
    });
  }
}
