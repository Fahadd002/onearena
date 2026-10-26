
export interface OwnerLandingBusinessDto {
  companyName: string | null;
  address: string | null;
  businessLogo: string | null;
  isVerified: boolean;
}

export interface OwnerLandingOwnerDto {
  id: string;
  name: string;
  image: string | null;
  memberSince: string;
  business: OwnerLandingBusinessDto;
}

// ─────────────────────────────────────────────────────────────
// HERO — no CTA
// ─────────────────────────────────────────────────────────────

export interface OwnerLandingHeroDto {
  headline: string;
  subheadline: string | null;
  coverImage: string | null;
  overlayOpacity: number;
  textAlign: "LEFT" | "CENTER" | "RIGHT";
}

// ─────────────────────────────────────────────────────────────
// ABOUT
// ─────────────────────────────────────────────────────────────

export interface OwnerLandingAboutDto {
  heading: string;
  body: string;
  imageUrl: string | null;
}

// ─────────────────────────────────────────────────────────────
// CONTACT — no websiteUrl, no mapEmbedUrl
// ─────────────────────────────────────────────────────────────

export interface OwnerLandingContactDto {
  heading: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  openingHours: string | null;
}

// ─────────────────────────────────────────────────────────────
// FAQ
// ─────────────────────────────────────────────────────────────

export interface OwnerLandingFaqDto {
  id: string;
  question: string;
  answer: string;
}

// ─────────────────────────────────────────────────────────────
// TURFS
// ─────────────────────────────────────────────────────────────

export interface OwnerLandingImageDto {
  url: string;
  altText: string | null;
}

export interface OwnerLandingFacilityDto {
  name: string;
}

export interface OwnerLandingRatingDto {
  average: number;
  count: number;
}

export interface OwnerLandingTurfDto {
  id: string;
  name: string;
  description: string | null;
  address: string;
  latitude: number;
  longitude: number;
  defaultSlotPrice: number;
  defaultSlotDuration: number;
  categoryName: string | null;
  images: OwnerLandingImageDto[];
  facilities: OwnerLandingFacilityDto[];
  rating: OwnerLandingRatingDto;
}

// ─────────────────────────────────────────────────────────────
// GALLERY / BLOGS / ANNOUNCEMENTS / SOCIAL
// ─────────────────────────────────────────────────────────────

export interface OwnerLandingReviewDto {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  reviewerName: string;
  reviewerImage: string | null;
  turfName: string;
}

export interface OwnerLandingGalleryItemDto {
  id: string;
  imageUrl: string;
  title: string | null;
  description: string | null;
}

export interface OwnerLandingBlogDto {
  id: string;
  title: string;
  slug: string;
  preview: string;
  content: string;
  coverImage: string | null;
  readMinutes: number | null;
  publishedAt: string | null;
}

export interface OwnerLandingAnnouncementDto {
  id: string;
  title: string;
  message: string;
  type: string;
  pinned: boolean;
  createdAt: string;
}

export interface OwnerLandingSocialLinkDto {
  id: string;
  platform: string;
  url: string;
  icon: string | null;
}

// ─────────────────────────────────────────────────────────────
// STATS
// ─────────────────────────────────────────────────────────────

export interface OwnerLandingStatsDto {
  turfCount: number;
  reviewCount: number;
  averageRating: number;
  galleryCount: number;
  blogCount: number;
  faqCount: number;
}

// ─────────────────────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────────────────────

export interface OwnerLandingPageDto {
  owner: OwnerLandingOwnerDto;
  hero: OwnerLandingHeroDto | null;
  pinnedNotice: OwnerLandingAnnouncementDto | null;
  about: OwnerLandingAboutDto | null;
  turfs: OwnerLandingTurfDto[];
  reviews: OwnerLandingReviewDto[];
  gallery: OwnerLandingGalleryItemDto[];
  blogs: OwnerLandingBlogDto[];
  faqs: OwnerLandingFaqDto[];
  notices: OwnerLandingAnnouncementDto[];
  contact: OwnerLandingContactDto | null;
  socialLinks: OwnerLandingSocialLinkDto[];
  stats: OwnerLandingStatsDto;
}