import { Injectable } from '@nestjs/common';
import status from 'http-status';
import { uploadFileToCloudinary } from '../../../config/cloudinary.config';
import AppError from '../../../config/errorHelpers/AppError';
import prisma from '../../../shared/prisma';
import { IRequestUser } from '../../interfaces/requestUser.interface';

@Injectable()
export class OwnerContentService {
  listGallery(user: IRequestUser) {
    return prisma.ownerGalleryItem.findMany({ where: { ownerId: user.userId }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }] });
  }

  async createGallery(user: IRequestUser, data: { imageUrl: string; title?: string; description?: string; sortOrder?: number }) {
    if (!data.imageUrl?.trim()) throw new AppError(status.BAD_REQUEST, 'Gallery image URL is required');
    return prisma.ownerGalleryItem.create({ data: { ownerId: user.userId, imageUrl: data.imageUrl.trim(), title: data.title?.trim(), description: data.description?.trim(), sortOrder: data.sortOrder ?? 0 } });
  }

  async uploadGallery(user: IRequestUser, files: Express.Multer.File[]) {
    if (!files?.length) throw new AppError(status.BAD_REQUEST, 'At least one gallery image is required');
    const uploads = await Promise.all(files.map((file) => uploadFileToCloudinary(file.buffer, file.originalname)));
    return prisma.ownerGalleryItem.createManyAndReturn({ data: uploads.map((upload, index) => ({ ownerId: user.userId, imageUrl: upload.secure_url, sortOrder: index })) });
  }

  async updateGallery(user: IRequestUser, id: string, data: { imageUrl?: string; title?: string; description?: string; sortOrder?: number; active?: boolean }) {
    await this.assertGalleryOwner(user, id);
    return prisma.ownerGalleryItem.update({ where: { id }, data });
  }

  async deleteGallery(user: IRequestUser, id: string) {
    await this.assertGalleryOwner(user, id);
    return prisma.ownerGalleryItem.delete({ where: { id } });
  }

  listBlogs(user: IRequestUser) {
    return prisma.ownerBlog.findMany({ where: { ownerId: user.userId }, orderBy: [{ published: 'desc' }, { updatedAt: 'desc' }] });
  }

  async createBlog(user: IRequestUser, data: { title: string; slug: string; excerpt?: string; content: string; coverImage?: string; published?: boolean }) {
    if (!data.title?.trim() || !data.slug?.trim() || !data.content?.trim()) throw new AppError(status.BAD_REQUEST, 'Title, slug, and content are required');
    return prisma.ownerBlog.create({ data: { ownerId: user.userId, title: data.title.trim(), slug: data.slug.trim().toLowerCase(), excerpt: data.excerpt?.trim(), content: data.content.trim(), coverImage: data.coverImage?.trim(), published: data.published ?? false, publishedAt: data.published ? new Date() : null } });
  }

  async updateBlog(user: IRequestUser, id: string, data: { title?: string; slug?: string; excerpt?: string; content?: string; coverImage?: string; published?: boolean }) {
    await this.assertBlogOwner(user, id);
    const existing = await prisma.ownerBlog.findUnique({ where: { id }, select: { published: true } });
    return prisma.ownerBlog.update({ where: { id }, data: { ...data, slug: data.slug?.trim().toLowerCase(), publishedAt: data.published && !existing?.published ? new Date() : undefined } });
  }

  async deleteBlog(user: IRequestUser, id: string) {
    await this.assertBlogOwner(user, id);
    return prisma.ownerBlog.delete({ where: { id } });
  }

  private async assertGalleryOwner(user: IRequestUser, id: string) {
    const item = await prisma.ownerGalleryItem.findFirst({ where: { id, ownerId: user.userId } });
    if (user.role !== 'ADMIN' || !item) throw new AppError(status.FORBIDDEN, 'Content access denied');
  }

  private async assertBlogOwner(user: IRequestUser, id: string) {
    const blog = await prisma.ownerBlog.findFirst({ where: { id, ownerId: user.userId } });
    if (user.role !== 'ADMIN' || !blog) throw new AppError(status.FORBIDDEN, 'Content access denied');
  }
}