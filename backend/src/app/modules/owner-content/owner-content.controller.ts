import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Res,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import status from 'http-status';
import path from 'path';
import { fileUploader } from '../../../app/helpers/file';
import { AuthRoles } from '../../../common/decorators/auth-roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CheckAuthGuard } from '../../../common/guards/check-auth.guard';
import AppError from '../../../config/errorHelpers/AppError';
import { UserRole } from '../../../generated/prisma/enums';
import sendResponse from '../../../shared/sendResponse';
import { IRequestUser } from '../../interfaces/requestUser.interface';
import { OwnerContentService } from './owner-content.service';

const imageUploadOptions = fileUploader.multerOptions((_req: any) => {
  const userId = _req.user?.userId;
  return `uploads/owner-content/gallery/${userId}`;
}, {
  filename: (_req: any, file: any, cb: any) => {
    cb(
      null,
      `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${path.extname(file.originalname)}`,
    );
  },
  fileFilter: (
    _req: unknown,
    file: Express.Multer.File,
    cb: (error: Error | null, accept: boolean) => void,
  ) =>
    ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'].includes(file.mimetype)
      ? cb(null, true)
      : cb(
        new AppError(status.BAD_REQUEST, 'File type not allowed. Allowed: JPEG, PNG, WebP'),
        false,
      ),
});

@Controller('api/v1/owner/content')
@AuthRoles(UserRole.ADMIN)
@UseGuards(CheckAuthGuard)
export class OwnerContentController {
  constructor(private readonly service: OwnerContentService) {}

  // ================================================================
  // HERO
  // ================================================================
  @Get('hero')
  async getHero(@CurrentUser() user: IRequestUser, @Res() res: Response) {
    return this.reply(res, this.service.getHero(user));
  }

  @Put('hero')
  async upsertHero(
    @CurrentUser() user: IRequestUser,
    @Body()
    body: {
      headline: string;
      subheadline?: string;
      coverImage?: string;
      overlayOpacity?: number;
      textAlign?: 'LEFT' | 'CENTER' | 'RIGHT';
      isVisible?: boolean;
    },
    @Res() res: Response,
  ) {
    return this.reply(res, this.service.upsertHero(user, body));
  }

  @Delete('hero')
  async deleteHero(@CurrentUser() user: IRequestUser, @Res() res: Response) {
    return this.reply(res, this.service.deleteHero(user));
  }

  // ================================================================
  // ABOUT
  // ================================================================
  @Get('about')
  async getAbout(@CurrentUser() user: IRequestUser, @Res() res: Response) {
    return this.reply(res, this.service.getAbout(user));
  }

  @Put('about')
  async upsertAbout(
    @CurrentUser() user: IRequestUser,
    @Body()
    body: {
      heading?: string;
      body: string;
      highlights?: Array<{ icon?: string; label: string; value: string }>;
      imageUrl?: string;
      isVisible?: boolean;
    },
    @Res() res: Response,
  ) {
    return this.reply(res, this.service.upsertAbout(user, body));
  }

  @Delete('about')
  async deleteAbout(@CurrentUser() user: IRequestUser, @Res() res: Response) {
    return this.reply(res, this.service.deleteAbout(user));
  }

  // ================================================================
  // CONTACT
  // ================================================================
  @Get('contact')
  async getContact(@CurrentUser() user: IRequestUser, @Res() res: Response) {
    return this.reply(res, this.service.getContact(user));
  }

  @Put('contact')
  async upsertContact(
    @CurrentUser() user: IRequestUser,
    @Body()
    body: {
      heading?: string;
      phone?: string;
      email?: string;
      address?: string;
      openingHours?: string;
      isVisible?: boolean;
    },
    @Res() res: Response,
  ) {
    return this.reply(res, this.service.upsertContact(user, body));
  }

  @Delete('contact')
  async deleteContact(@CurrentUser() user: IRequestUser, @Res() res: Response) {
    return this.reply(res, this.service.deleteContact(user));
  }

  // ================================================================
  // FAQ
  // ================================================================
  @Get('faqs')
  async listFaqs(@CurrentUser() user: IRequestUser, @Res() res: Response) {
    return this.reply(res, this.service.listFaqs(user));
  }

  @Post('faqs')
  async createFaq(
    @CurrentUser() user: IRequestUser,
    @Body() body: { question: string; answer: string; sortOrder?: number; isActive?: boolean },
    @Res() res: Response,
  ) {
    return this.reply(res, this.service.createFaq(user, body), status.CREATED);
  }

  @Patch('faqs/:id')
  async updateFaq(
    @CurrentUser() user: IRequestUser,
    @Param('id') id: string,
    @Body() body: { question?: string; answer?: string; sortOrder?: number; isActive?: boolean },
    @Res() res: Response,
  ) {
    return this.reply(res, this.service.updateFaq(user, id, body));
  }

  @Delete('faqs/:id')
  async deleteFaq(
    @CurrentUser() user: IRequestUser,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    return this.reply(res, this.service.deleteFaq(user, id));
  }

  // ================================================================
  // GALLERY
  // ================================================================
  @Get('gallery')
  async listGallery(@CurrentUser() user: IRequestUser, @Res() res: Response) {
    return this.reply(res, this.service.listGallery(user));
  }

  @Post('gallery')
  async createGallery(
    @CurrentUser() user: IRequestUser,
    @Body() body: { imageUrl: string; title?: string; description?: string; sortOrder?: number },
    @Res() res: Response,
  ) {
    return this.reply(res, this.service.createGallery(user, body), status.CREATED);
  }

  @Post('gallery/upload')
  @UseInterceptors(FilesInterceptor('files', 20, imageUploadOptions))
  async uploadGallery(
    @CurrentUser() user: IRequestUser,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: { title?: string; description?: string },
    @Res() res: Response,
  ) {
    return this.reply(res, this.service.uploadGallery(user, files, body), status.CREATED);
  }

  @Post('upload-image')
  @UseInterceptors(FileInterceptor('file', imageUploadOptions))
  async uploadImage(
    @CurrentUser() user: IRequestUser,
    @UploadedFile() file: Express.Multer.File,
    @Res() res: Response,
  ) {
    return this.reply(res, Promise.resolve(this.service.uploadImage(user, file)), status.CREATED);
  }

  @Patch('gallery/:id')
  async updateGallery(
    @CurrentUser() user: IRequestUser,
    @Param('id') id: string,
    @Body()
    body: {
      imageUrl?: string;
      title?: string;
      description?: string;
      sortOrder?: number;
      active?: boolean;
    },
    @Res() res: Response,
  ) {
    return this.reply(res, this.service.updateGallery(user, id, body));
  }

  @Delete('gallery/:id')
  async deleteGallery(
    @CurrentUser() user: IRequestUser,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    return this.reply(res, this.service.deleteGallery(user, id));
  }

  // ================================================================
  // BLOGS
  // ================================================================
  @Get('blogs')
  async listBlogs(@CurrentUser() user: IRequestUser, @Res() res: Response) {
    return this.reply(res, this.service.listBlogs(user));
  }

  @Post('blogs')
  async createBlog(
    @CurrentUser() user: IRequestUser,
    @Body()
    body: {
      title: string;
      slug: string;
      content: string;
      coverImage?: string;
      readMinutes?: number;
      published?: boolean;
    },
    @Res() res: Response,
  ) {
    return this.reply(res, this.service.createBlog(user, body), status.CREATED);
  }

  @Patch('blogs/:id')
  async updateBlog(
    @CurrentUser() user: IRequestUser,
    @Param('id') id: string,
    @Body()
    body: {
      title?: string;
      slug?: string;
      content?: string;
      coverImage?: string;
      readMinutes?: number;
      published?: boolean;
    },
    @Res() res: Response,
  ) {
    return this.reply(res, this.service.updateBlog(user, id, body));
  }

  @Delete('blogs/:id')
  async deleteBlog(
    @CurrentUser() user: IRequestUser,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    return this.reply(res, this.service.deleteBlog(user, id));
  }

  // ================================================================
  // ANNOUNCEMENTS
  // ================================================================
  @Get('announcements')
  async listAnnouncements(@CurrentUser() user: IRequestUser, @Res() res: Response) {
    return this.reply(res, this.service.listAnnouncements(user));
  }

  @Post('announcements')
  async createAnnouncement(
    @CurrentUser() user: IRequestUser,
    @Body()
    body: {
      title: string;
      message: string;
      type?: string;
      isActive?: boolean;
      pinned?: boolean;
    },
    @Res() res: Response,
  ) {
    return this.reply(res, this.service.createAnnouncement(user, body), status.CREATED);
  }

  @Patch('announcements/:id')
  async updateAnnouncement(
    @CurrentUser() user: IRequestUser,
    @Param('id') id: string,
    @Body()
    body: {
      title?: string;
      message?: string;
      type?: string;
      isActive?: boolean;
      pinned?: boolean;
    },
    @Res() res: Response,
  ) {
    return this.reply(res, this.service.updateAnnouncement(user, id, body));
  }

  @Delete('announcements/:id')
  async deleteAnnouncement(
    @CurrentUser() user: IRequestUser,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    return this.reply(res, this.service.deleteAnnouncement(user, id));
  }

  // ================================================================
  // SOCIAL LINKS
  // ================================================================
  @Get('social-links')
  async listSocialLinks(@CurrentUser() user: IRequestUser, @Res() res: Response) {
    return this.reply(res, this.service.listSocialLinks(user));
  }

  @Post('social-links')
  async createSocialLink(
    @CurrentUser() user: IRequestUser,
    @Body()
    body: {
      platform: string;
      url: string;
      icon?: string;
      sortOrder?: number;
      isActive?: boolean;
    },
    @Res() res: Response,
  ) {
    return this.reply(res, this.service.createSocialLink(user, body), status.CREATED);
  }

  @Patch('social-links/:id')
  async updateSocialLink(
    @CurrentUser() user: IRequestUser,
    @Param('id') id: string,
    @Body()
    body: {
      platform?: string;
      url?: string;
      icon?: string;
      sortOrder?: number;
      isActive?: boolean;
    },
    @Res() res: Response,
  ) {
    return this.reply(res, this.service.updateSocialLink(user, id, body));
  }

  @Delete('social-links/:id')
  async deleteSocialLink(
    @CurrentUser() user: IRequestUser,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    return this.reply(res, this.service.deleteSocialLink(user, id));
  }

  // ================================================================
  // REPLY HELPER
  // ================================================================
  private async reply(
    res: Response,
    operation: Promise<unknown>,
    statusCode: number = status.OK,
  ) {
    return sendResponse(res, {
      statusCode,
      success: true,
      message: 'Owner content operation successful',
      data: await operation,
    });
  }
}