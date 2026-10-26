import { Injectable } from '@nestjs/common';
import status from 'http-status';

import AppError from '../../../config/errorHelpers/AppError';
import { TurfStatus, UserRole, UserStatus } from '../../../generated/prisma/enums';
import prisma from '../../../shared/prisma';
import type {
  OwnerLandingAnnouncementDto,
  OwnerLandingBlogDto,
  OwnerLandingGalleryItemDto,
  OwnerLandingPageDto,
  OwnerLandingReviewDto,
  OwnerLandingSocialLinkDto,
  OwnerLandingTurfDto,
} from './dto/owner-landing-page.dto';

const PREVIEW_MAX_LENGTH = 160;
const RECENT_REVIEWS_LIMIT = 9;
const round2 = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class OwnerLandingPageService {
  async getLandingPage(ownerId: string): Promise<OwnerLandingPageDto> {
    const profile = await prisma.ownerProfile.findUnique({
      where: { userId: ownerId },
      select: {
        id: true,
        companyName: true,
        address: true,
        businessLogo: true,
        contactNumber: true,
        bussinessEmail: true,
        verificationStatus: true,

        heroSection: {
          select: {
            headline: true,
            subheadline: true,
            coverImage: true,
            overlayOpacity: true,
            textAlign: true,
            isVisible: true,
          },
        },

        aboutSection: {
          select: {
            heading: true,
            body: true,
            highlights: true,
            imageUrl: true,
            isVisible: true,
          },
        },

        contactSection: {
          select: {
            heading: true,
            phone: true,
            email: true,
            address: true,
            openingHours: true,
            isVisible: true,
          },
        },

        ownerFaqItems: {
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
          select: { id: true, question: true, answer: true },
        },

        announcements: {
          where: { isActive: true },
          orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
          select: {
            id: true,
            title: true,
            message: true,
            type: true,
            pinned: true,
            createdAt: true,
          },
        },

        ownerGallery: {
          where: { active: true },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
          select: { id: true, imageUrl: true, title: true, description: true },
        },

        ownerBlogs: {
          where: { published: true },
          orderBy: { publishedAt: 'desc' },
          select: {
            id: true,
            title: true,
            slug: true,
            content: true,
            coverImage: true,
            readMinutes: true,
            publishedAt: true,
          },
        },

        socialLinksOwner: {
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
          select: { id: true, platform: true, url: true, icon: true },
        },

        user: {
          select: {
            id: true,
            name: true,
            image: true,
            createdAt: true,
            role: true,
            status: true,
            isDeleted: true,

            ownedTurfs: {
              where: { status: TurfStatus.ACTIVE },
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                name: true,
                description: true,
                address: true,
                latitude: true,
                longitude: true,
                defaultSlotPrice: true,
                defaultSlotDuration: true,
                category: { select: { name: true } },
                images: {
                  orderBy: { sortOrder: 'asc' },
                  select: { url: true, altText: true },
                },
                facilities: {
                  select: { facility: { select: { name: true } } },
                },
                reviews: {
                  where: { isHidden: false },
                  orderBy: { createdAt: 'desc' },
                  select: {
                    id: true,
                    rating: true,
                    comment: true,
                    createdAt: true,
                    user: { select: { name: true, image: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!profile || !profile.user) {
      throw new AppError(status.NOT_FOUND, 'Owner page not found');
    }

    const account = profile.user;
    if (
      account.role !== UserRole.ADMIN ||
      account.status !== UserStatus.ACTIVE ||
      account.isDeleted
    ) {
      throw new AppError(status.NOT_FOUND, 'Owner page not found');
    }

    // ---------- Turfs ----------
    const turfs: OwnerLandingTurfDto[] = account.ownedTurfs.map((turf) => {
      const reviewCount = turf.reviews.length;
      const ratingSum = turf.reviews.reduce((sum, r) => sum + r.rating, 0);

      return {
        id: turf.id,
        name: turf.name,
        description: turf.description,
        address: turf.address,
        latitude: Number(turf.latitude) || 0,
        longitude: Number(turf.longitude) || 0,
        defaultSlotPrice: Number(turf.defaultSlotPrice) || 0,
        defaultSlotDuration: turf.defaultSlotDuration,
        categoryName: turf.category?.name ?? null,
        images: turf.images.map((img) => ({ url: img.url, altText: img.altText })),
        facilities: turf.facilities.map((f) => ({ name: f.facility.name })),
        rating: {
          average: reviewCount ? round2(ratingSum / reviewCount) : 0,
          count: reviewCount,
        },
      };
    });

    const reviews: OwnerLandingReviewDto[] = account.ownedTurfs
      .flatMap((turf) =>
        turf.reviews.map((r) => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          createdAt: r.createdAt.toISOString(),
          reviewerName: r.user.name,
          reviewerImage: r.user.image,
          turfName: turf.name,
        })),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, RECENT_REVIEWS_LIMIT);

    const ratingPairs = turfs.filter((t) => t.rating.count > 0).map((t) => t.rating.average);
    const reviewCount = turfs.reduce((sum, t) => sum + t.rating.count, 0);
    const averageRating = ratingPairs.length
      ? round2(ratingPairs.reduce((s, v) => s + v, 0) / ratingPairs.length)
      : 0;

    // ---------- Hero ----------
    const hero = profile.heroSection?.isVisible
      ? {
          headline: profile.heroSection.headline,
          subheadline: profile.heroSection.subheadline,
          coverImage: profile.heroSection.coverImage,
          overlayOpacity: profile.heroSection.overlayOpacity,
          textAlign: profile.heroSection.textAlign.toUpperCase() as
            | 'LEFT'
            | 'CENTER'
            | 'RIGHT',
        }
      : null;

    // ---------- About ----------
    const about = profile.aboutSection?.isVisible
      ? {
          heading: profile.aboutSection.heading,
          body: profile.aboutSection.body,
          imageUrl: profile.aboutSection.imageUrl,
        }
      : null;

    // ---------- Contact: section values win, owner profile fills the gaps ----------
    const contactSection = profile.contactSection;
    const contactPhone = contactSection?.phone || profile.contactNumber;
    const contactEmail = contactSection?.email || profile.bussinessEmail;
    const contactAddress = contactSection?.address || profile.address;
    const contactHours = contactSection?.openingHours ?? null;
    const contact =
      (contactSection?.isVisible ?? true) &&
      (contactPhone || contactEmail || contactAddress || contactHours)
        ? {
            heading: contactSection?.heading ?? 'Contact Us',
            phone: contactPhone,
            email: contactEmail,
            address: contactAddress,
            openingHours: contactHours,
          }
        : null;

    // ---------- Announcements ----------
    const toAnnouncementDto = (
      a: (typeof profile.announcements)[number],
    ): OwnerLandingAnnouncementDto => ({
      id: a.id,
      title: a.title,
      message: a.message,
      type: a.type,
      pinned: a.pinned,
      createdAt: a.createdAt.toISOString(),
    });

    const pinnedNotice = profile.announcements.find((a) => a.pinned);
    const notices = profile.announcements.filter((a) => !a.pinned);

    // ---------- Blogs ----------
    const blogs: OwnerLandingBlogDto[] = profile.ownerBlogs.map((b) => {
      const flat = b.content.replace(/\s+/g, ' ').trim();
      const preview =
        flat.length <= PREVIEW_MAX_LENGTH
          ? flat
          : `${flat.slice(0, PREVIEW_MAX_LENGTH).replace(/\s\S*$/, '')}…`;

      return {
        id: b.id,
        title: b.title,
        slug: b.slug,
        preview,
        content: b.content,
        coverImage: b.coverImage,
        readMinutes: b.readMinutes,
        publishedAt: b.publishedAt ? b.publishedAt.toISOString() : null,
      };
    });

    // ---------- Gallery + Social ----------
    const gallery: OwnerLandingGalleryItemDto[] = profile.ownerGallery.map((g) => ({
      id: g.id,
      imageUrl: g.imageUrl,
      title: g.title,
      description: g.description,
    }));

    const socialLinks: OwnerLandingSocialLinkDto[] = profile.socialLinksOwner.map((s) => ({
      id: s.id,
      platform: s.platform,
      url: s.url,
      icon: s.icon,
    }));

    return {
      owner: {
        id: account.id,
        name: account.name,
        image: account.image,
        memberSince: account.createdAt.toISOString(),
        business: {
          companyName: profile.companyName,
          address: profile.address,
          businessLogo: profile.businessLogo,
          isVerified: profile.verificationStatus === 'APPROVED',
        },
      },
      hero,
      pinnedNotice: pinnedNotice ? toAnnouncementDto(pinnedNotice) : null,
      about,
      turfs,
      reviews,
      gallery,
      blogs,
      faqs: profile.ownerFaqItems,
      notices: notices.map(toAnnouncementDto),
      contact,
      socialLinks,
      stats: {
        turfCount: turfs.length,
        reviewCount,
        averageRating,
        galleryCount: gallery.length,
        blogCount: blogs.length,
        faqCount: profile.ownerFaqItems.length,
      },
    };
  }
}