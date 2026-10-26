import { Injectable } from '@nestjs/common';
import status from 'http-status';
import AppError from '../../../config/errorHelpers/AppError';
import { deleteFile } from '../../helpers/file';
import prisma from '../../../shared/prisma';
import { IRequestUser } from '../../interfaces/requestUser.interface';

@Injectable()
export class OwnerContentService {
  // ================================================================
  // PROFILE RESOLVER — every write/read goes through this
  // ================================================================
  private async resolveProfileId(user: IRequestUser): Promise<string> {
    const profile = await prisma.ownerProfile.findUnique({
      where: { userId: user.userId },
      select: { id: true },
    });
    if (!profile) throw new AppError(status.NOT_FOUND, 'Owner profile not found');
    return profile.id;
  }

  // ================================================================
  // HERO (1:1) — no CTA
  // ================================================================
  async getHero(user: IRequestUser) {
    const ownerProfileId = await this.resolveProfileId(user);
    return prisma.ownerHeroSection.findUnique({ where: { ownerProfileId } });
  }

  async upsertHero(
    user: IRequestUser,
    data: {
      headline: string;
      subheadline?: string;
      coverImage?: string;
      overlayOpacity?: number;
      textAlign?: 'LEFT' | 'CENTER' | 'RIGHT';
      isVisible?: boolean;
    },
  ) {
    if (!data.headline?.trim())
      throw new AppError(status.BAD_REQUEST, 'Headline is required');
    const ownerProfileId = await this.resolveProfileId(user);

    return prisma.ownerHeroSection.upsert({
      where: { ownerProfileId },
      create: { ownerProfileId, ...data, headline: data.headline.trim() },
      update: { ...data, headline: data.headline.trim() },
    });
  }

  async deleteHero(user: IRequestUser) {
    const ownerProfileId = await this.resolveProfileId(user);
    const existing = await prisma.ownerHeroSection.findUnique({ where: { ownerProfileId } });
    if (!existing) throw new AppError(status.NOT_FOUND, 'Hero section not found');
    if (existing.coverImage) deleteFile(existing.coverImage);
    return prisma.ownerHeroSection.delete({ where: { ownerProfileId } });
  }

  // ================================================================
  // ABOUT (1:1)
  // ================================================================
  async getAbout(user: IRequestUser) {
    const ownerProfileId = await this.resolveProfileId(user);
    return prisma.ownerAboutSection.findUnique({ where: { ownerProfileId } });
  }

  async upsertAbout(
    user: IRequestUser,
    data: {
      heading?: string;
      body: string;
      imageUrl?: string;
      isVisible?: boolean;
    },
  ) {
    if (!data.body?.trim()) throw new AppError(status.BAD_REQUEST, 'Body is required');
    const ownerProfileId = await this.resolveProfileId(user);

    return prisma.ownerAboutSection.upsert({
      where: { ownerProfileId },
      create: { ownerProfileId, ...data, body: data.body.trim() },
      update: { ...data, body: data.body.trim() },
    });
  }

  async deleteAbout(user: IRequestUser) {
    const ownerProfileId = await this.resolveProfileId(user);
    const existing = await prisma.ownerAboutSection.findUnique({ where: { ownerProfileId } });
    if (!existing) throw new AppError(status.NOT_FOUND, 'About section not found');
    if (existing.imageUrl) deleteFile(existing.imageUrl);
    return prisma.ownerAboutSection.delete({ where: { ownerProfileId } });
  }

  // ================================================================
  // CONTACT (1:1) — no websiteUrl, no mapEmbedUrl
  // ================================================================
  async getContact(user: IRequestUser) {
    const ownerProfileId = await this.resolveProfileId(user);
    return prisma.ownerContactSection.findUnique({ where: { ownerProfileId } });
  }

  async upsertContact(
    user: IRequestUser,
    data: {
      heading?: string;
      phone?: string;
      email?: string;
      address?: string;
      openingHours?: string;
      isVisible?: boolean;
    },
  ) {
    const ownerProfileId = await this.resolveProfileId(user);
    const profile = await prisma.ownerProfile.findUnique({
      where: { id: ownerProfileId },
      select: { contactNumber: true, bussinessEmail: true, address: true },
    });
    const withProfileDefaults = {
      ...data,
      phone: data.phone || profile?.contactNumber || undefined,
      email: data.email || profile?.bussinessEmail || undefined,
      address: data.address || profile?.address || undefined,
    };
    return prisma.ownerContactSection.upsert({
      where: { ownerProfileId },
      create: { ownerProfileId, ...withProfileDefaults },
      update: data,
    });
  }

  async deleteContact(user: IRequestUser) {
    const ownerProfileId = await this.resolveProfileId(user);
    const existing = await prisma.ownerContactSection.findUnique({ where: { ownerProfileId } });
    if (!existing) throw new AppError(status.NOT_FOUND, 'Contact section not found');
    return prisma.ownerContactSection.delete({ where: { ownerProfileId } });
  }

  // ================================================================
  // FAQ (1:N)
  // ================================================================
  async listFaqs(user: IRequestUser) {
    const ownerProfileId = await this.resolveProfileId(user);
    return prisma.ownerFaqItem.findMany({
      where: { ownerProfileId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async createFaq(
    user: IRequestUser,
    data: { question: string; answer: string; sortOrder?: number; isActive?: boolean },
  ) {
    if (!data.question?.trim() || !data.answer?.trim())
      throw new AppError(status.BAD_REQUEST, 'Question and answer are required');
    const ownerProfileId = await this.resolveProfileId(user);

    return prisma.ownerFaqItem.create({
      data: {
        ownerProfileId,
        question: data.question.trim(),
        answer: data.answer.trim(),
        sortOrder: data.sortOrder ?? 0,
        isActive: data.isActive ?? true,
      },
    });
  }

  async updateFaq(
    user: IRequestUser,
    id: string,
    data: { question?: string; answer?: string; sortOrder?: number; isActive?: boolean },
  ) {
    await this.assertFaqOwner(user, id);
    return prisma.ownerFaqItem.update({ where: { id }, data });
  }

  async deleteFaq(user: IRequestUser, id: string) {
    await this.assertFaqOwner(user, id);
    return prisma.ownerFaqItem.delete({ where: { id } });
  }

  private async assertFaqOwner(user: IRequestUser, id: string) {
    const ownerProfileId = await this.resolveProfileId(user);
    const item = await prisma.ownerFaqItem.findFirst({ where: { id, ownerProfileId } });
    if (!item) throw new AppError(status.FORBIDDEN, 'Content access denied');
  }

  // ================================================================
  // GALLERY (1:N)
  // ================================================================
  async listGallery(user: IRequestUser) {
    const ownerProfileId = await this.resolveProfileId(user);
    return prisma.ownerGalleryItem.findMany({
      where: { ownerProfileId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async createGallery(
    user: IRequestUser,
    data: { imageUrl: string; title?: string; description?: string; sortOrder?: number },
  ) {
    if (!data.imageUrl?.trim())
      throw new AppError(status.BAD_REQUEST, 'Gallery image URL is required');
    const ownerProfileId = await this.resolveProfileId(user);

    return prisma.ownerGalleryItem.create({
      data: {
        ownerProfileId,
        imageUrl: data.imageUrl.trim(),
        title: data.title?.trim(),
        description: data.description?.trim(),
        sortOrder: data.sortOrder ?? 0,
      },
    });
  }

  async uploadGallery(
    user: IRequestUser,
    files: Express.Multer.File[],
    meta: { title?: string; description?: string } = {},
  ) {
    if (!files?.length)
      throw new AppError(status.BAD_REQUEST, 'At least one image is required');
    const ownerProfileId = await this.resolveProfileId(user);

    return prisma.ownerGalleryItem.createManyAndReturn({
      data: files.map((file, index) => ({
        ownerProfileId,
        imageUrl: this.fileUrl(user, file),
        title: meta.title?.trim() || undefined,
        description: meta.description?.trim() || undefined,
        sortOrder: index,
      })),
    });
  }

  async updateGallery(
    user: IRequestUser,
    id: string,
    data: {
      imageUrl?: string;
      title?: string;
      description?: string;
      sortOrder?: number;
      active?: boolean;
    },
  ) {
    await this.assertGalleryOwner(user, id);
    return prisma.ownerGalleryItem.update({
      where: { id },
      data: {
        imageUrl: data.imageUrl?.trim(),
        title: data.title,
        description: data.description,
        sortOrder: data.sortOrder,
        active: data.active,
      },
    });
  }

  async deleteGallery(user: IRequestUser, id: string) {
    const item = await this.assertGalleryOwner(user, id);
    if (item.imageUrl) deleteFile(item.imageUrl);
    const deleted = await prisma.ownerGalleryItem.delete({ where: { id } });
    return deleted;
  }

  private async assertGalleryOwner(user: IRequestUser, id: string) {
    const ownerProfileId = await this.resolveProfileId(user);
    const item = await prisma.ownerGalleryItem.findFirst({ where: { id, ownerProfileId } });
    if (!item) throw new AppError(status.FORBIDDEN, 'Content access denied');
    return item;
  }

  // ================================================================
  // BLOGS (1:N)
  // ================================================================
  async listBlogs(user: IRequestUser) {
    const ownerProfileId = await this.resolveProfileId(user);
    return prisma.ownerBlog.findMany({
      where: { ownerProfileId },
      orderBy: [{ published: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  async createBlog(
    user: IRequestUser,
    data: {
      title: string;
      slug: string;
      content: string;
      coverImage?: string;
      readMinutes?: number;
      published?: boolean;
    },
  ) {
    if (!data.title?.trim() || !data.slug?.trim() || !data.content?.trim())
      throw new AppError(status.BAD_REQUEST, 'Title, slug and content are required');
    const ownerProfileId = await this.resolveProfileId(user);

    return prisma.ownerBlog.create({
      data: {
        ownerProfileId,
        title: data.title.trim(),
        slug: data.slug.trim().toLowerCase(),
        content: data.content.trim(),
        coverImage: data.coverImage?.trim(),
        readMinutes: data.readMinutes,
        published: data.published ?? false,
        publishedAt: data.published ? new Date() : null,
      },
    });
  }

  async updateBlog(
    user: IRequestUser,
    id: string,
    data: {
      title?: string;
      slug?: string;
      content?: string;
      coverImage?: string;
      readMinutes?: number;
      published?: boolean;
    },
  ) {
    await this.assertBlogOwner(user, id);
    const existing = await prisma.ownerBlog.findUnique({
      where: { id },
      select: { published: true },
    });

    return prisma.ownerBlog.update({
      where: { id },
      data: {
        ...data,
        slug: data.slug?.trim().toLowerCase(),
        publishedAt:
          data.published === true && !existing?.published
            ? new Date()
            : data.published === false
              ? null
              : undefined,
      },
    });
  }

  async deleteBlog(user: IRequestUser, id: string) {
    await this.assertBlogOwner(user, id);
    const blog = await prisma.ownerBlog.findUnique({ where: { id }, select: { coverImage: true } });
    if (blog?.coverImage) deleteFile(blog.coverImage);
    return prisma.ownerBlog.delete({ where: { id } });
  }

  private async assertBlogOwner(user: IRequestUser, id: string) {
    const ownerProfileId = await this.resolveProfileId(user);
    const blog = await prisma.ownerBlog.findFirst({ where: { id, ownerProfileId } });
    if (!blog) throw new AppError(status.FORBIDDEN, 'Content access denied');
  }

  // ================================================================
  // ANNOUNCEMENTS (1:N)
  // ================================================================
  async listAnnouncements(user: IRequestUser) {
    const ownerProfileId = await this.resolveProfileId(user);
    return prisma.announcement.findMany({
      where: { ownerProfileId },
      orderBy: [{ pinned: 'desc' }, { isActive: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async createAnnouncement(
    user: IRequestUser,
    data: {
      title: string;
      message: string;
      type?: string;
      isActive?: boolean;
      pinned?: boolean;
    },
  ) {
    if (!data.title?.trim() || !data.message?.trim())
      throw new AppError(status.BAD_REQUEST, 'Title and message are required');
    const ownerProfileId = await this.resolveProfileId(user);

    // Only one pinned announcement at a time
    if (data.pinned) {
      await prisma.announcement.updateMany({
        where: { ownerProfileId, pinned: true },
        data: { pinned: false },
      });
    }

    return prisma.announcement.create({
      data: {
        ownerProfileId,
        title: data.title.trim(),
        message: data.message.trim(),
        type: data.type ?? 'INFO',
        isActive: data.isActive ?? true,
        pinned: data.pinned ?? false,
      },
    });
  }

  async updateAnnouncement(
    user: IRequestUser,
    id: string,
    data: {
      title?: string;
      message?: string;
      type?: string;
      isActive?: boolean;
      pinned?: boolean;
    },
  ) {
    await this.assertAnnouncementOwner(user, id);
    const ownerProfileId = await this.resolveProfileId(user);

    if (data.pinned === true) {
      await prisma.announcement.updateMany({
        where: { ownerProfileId, pinned: true, id: { not: id } },
        data: { pinned: false },
      });
    }

    return prisma.announcement.update({ where: { id }, data });
  }

  async deleteAnnouncement(user: IRequestUser, id: string) {
    await this.assertAnnouncementOwner(user, id);
    return prisma.announcement.delete({ where: { id } });
  }

  private async assertAnnouncementOwner(user: IRequestUser, id: string) {
    const ownerProfileId = await this.resolveProfileId(user);
    const item = await prisma.announcement.findFirst({ where: { id, ownerProfileId } });
    if (!item) throw new AppError(status.FORBIDDEN, 'Content access denied');
  }

  // ================================================================
  // SOCIAL LINKS (1:N)
  // ================================================================
  async listSocialLinks(user: IRequestUser) {
    const ownerProfileId = await this.resolveProfileId(user);
    return prisma.ownerSocialLink.findMany({
      where: { ownerProfileId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async createSocialLink(
    user: IRequestUser,
    data: {
      platform: string;
      url: string;
      icon?: string;
      sortOrder?: number;
      isActive?: boolean;
    },
  ) {
    if (!data.platform?.trim() || !data.url?.trim())
      throw new AppError(status.BAD_REQUEST, 'Platform and URL are required');
    const ownerProfileId = await this.resolveProfileId(user);

    return prisma.ownerSocialLink.create({
      data: {
        ownerProfileId,
        platform: data.platform.trim().toLowerCase(),
        url: data.url.trim(),
        icon: data.icon?.trim(),
        sortOrder: data.sortOrder ?? 0,
        isActive: data.isActive ?? true,
      },
    });
  }

  async updateSocialLink(
    user: IRequestUser,
    id: string,
    data: {
      platform?: string;
      url?: string;
      icon?: string;
      sortOrder?: number;
      isActive?: boolean;
    },
  ) {
    await this.assertSocialLinkOwner(user, id);
    return prisma.ownerSocialLink.update({
      where: { id },
      data: {
        ...data,
        platform: data.platform?.trim().toLowerCase(),
        url: data.url?.trim(),
      },
    });
  }

  async deleteSocialLink(user: IRequestUser, id: string) {
    await this.assertSocialLinkOwner(user, id);
    return prisma.ownerSocialLink.delete({ where: { id } });
  }

  private async assertSocialLinkOwner(user: IRequestUser, id: string) {
    const ownerProfileId = await this.resolveProfileId(user);
    const item = await prisma.ownerSocialLink.findFirst({ where: { id, ownerProfileId } });
    if (!item) throw new AppError(status.FORBIDDEN, 'Content access denied');
  }

  // ================================================================
  // FILE UPLOAD
  // ================================================================
  uploadImage(user: IRequestUser, file?: Express.Multer.File) {
    if (!file) throw new AppError(status.BAD_REQUEST, 'Image file is required');
    return { url: this.fileUrl(user, file) };
  }

  private fileUrl(user: IRequestUser, file: Express.Multer.File) {
    return `/uploads/owner-content/gallery/${user.userId}/${file.filename}`;
  }
}