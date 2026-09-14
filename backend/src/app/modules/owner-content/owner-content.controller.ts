import { Body, Controller, Delete, Get, Param, Patch, Post, Res, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import status from 'http-status';
import { AuthRoles } from '../../../common/decorators/auth-roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CheckAuthGuard } from '../../../common/guards/check-auth.guard';
import { UserRole } from '../../../generated/prisma/enums';
import sendResponse from '../../../shared/sendResponse';
import { IRequestUser } from '../../interfaces/requestUser.interface';
import { OwnerContentService } from './owner-content.service';

@Controller('api/v1/owner/content')
@AuthRoles(UserRole.ADMIN)
@UseGuards(CheckAuthGuard)
export class OwnerContentController {
  constructor(private readonly service: OwnerContentService) {}

  @Get('gallery') async listGallery(@CurrentUser() user: IRequestUser, @Res() res: Response) { return this.reply(res, this.service.listGallery(user)); }
  @Post('gallery') async createGallery(@CurrentUser() user: IRequestUser, @Body() body: { imageUrl: string; title?: string; description?: string; sortOrder?: number }, @Res() res: Response) { return this.reply(res, this.service.createGallery(user, body), status.CREATED); }
  @Post('gallery/upload') @UseInterceptors(FilesInterceptor('files', 20)) async uploadGallery(@CurrentUser() user: IRequestUser, @UploadedFiles() files: Express.Multer.File[], @Res() res: Response) { return this.reply(res, this.service.uploadGallery(user, files), status.CREATED); }
  @Patch('gallery/:id') async updateGallery(@CurrentUser() user: IRequestUser, @Param('id') id: string, @Body() body: { imageUrl?: string; title?: string; description?: string; sortOrder?: number; active?: boolean }, @Res() res: Response) { return this.reply(res, this.service.updateGallery(user, id, body)); }
  @Delete('gallery/:id') async deleteGallery(@CurrentUser() user: IRequestUser, @Param('id') id: string, @Res() res: Response) { return this.reply(res, this.service.deleteGallery(user, id)); }

  @Get('blogs') async listBlogs(@CurrentUser() user: IRequestUser, @Res() res: Response) { return this.reply(res, this.service.listBlogs(user)); }
  @Post('blogs') async createBlog(@CurrentUser() user: IRequestUser, @Body() body: { title: string; slug: string; excerpt?: string; content: string; coverImage?: string; published?: boolean }, @Res() res: Response) { return this.reply(res, this.service.createBlog(user, body), status.CREATED); }
  @Patch('blogs/:id') async updateBlog(@CurrentUser() user: IRequestUser, @Param('id') id: string, @Body() body: { title?: string; slug?: string; excerpt?: string; content?: string; coverImage?: string; published?: boolean }, @Res() res: Response) { return this.reply(res, this.service.updateBlog(user, id, body)); }
  @Delete('blogs/:id') async deleteBlog(@CurrentUser() user: IRequestUser, @Param('id') id: string, @Res() res: Response) { return this.reply(res, this.service.deleteBlog(user, id)); }

  private async reply(res: Response, operation: Promise<unknown>, statusCode: number = status.OK) {
    return sendResponse(res, { statusCode, success: true, message: 'Owner content operation successful', data: await operation });
  }
}