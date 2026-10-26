/**
 * Shapes returned by `GET /api/v1/owners/:ownerId/landing`.
 *
 * This endpoint is public, so the backend DTO omits every sensitive owner and
 * business field (email, phone, NID/TIN/BIN, licence documents, drafts).
 * Keep this file in sync with
 * `backend/src/app/modules/owner-landing-page/dto/owner-landing-page.dto.ts`.
 */

export interface OwnerLandingBusiness {
    companyName: string | null;
    address: string | null;
    businessLogo: string | null;
    isVerified: boolean;
}

export interface OwnerLandingOwner {
    id: string;
    name: string;
    image: string | null;
    memberSince: string;
    business: OwnerLandingBusiness;
}

export interface OwnerLandingTurf {
    id: string;
    name: string;
    description: string | null;
    address: string;
    latitude: number;
    longitude: number;
    defaultSlotPrice: number;
    defaultSlotDuration: number;
    categoryName: string | null;
    images: Array<{ url: string; altText: string | null }>;
    facilities: Array<{ name: string }>;
    rating: { average: number; count: number };
}

export interface OwnerLandingGalleryItem {
    id: string;
    imageUrl: string;
    title: string | null;
    description: string | null;
}

export interface OwnerLandingBlog {
    id: string;
    title: string;
    slug: string;
    preview: string;
  content: string;
    coverImage: string | null;
    publishedAt: string | null;
}

export interface OwnerLandingAnnouncement {
    id: string;
    title: string;
    message: string;
    type: string;
    pinned: boolean;
    createdAt: string;
}

export interface OwnerLandingSocialLink {
    id: string;
    platform: string;
    url: string;
    icon: string | null;
}

export interface OwnerLandingStats {
    turfCount: number;
    reviewCount: number;
    averageRating: number;
    galleryCount: number;
    blogCount: number;
    faqCount: number;
}

export interface OwnerLandingHero {
    headline: string;
    subheadline: string | null;
    coverImage: string | null;
    overlayOpacity: number;
    textAlign: "LEFT" | "CENTER" | "RIGHT";
}

export interface OwnerLandingAbout {
    heading: string;
    body: string;
    highlights: Array<{ icon: string | null; label: string; value: string }> | null;
    imageUrl: string | null;
}

export interface OwnerLandingContact {
    heading: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    openingHours: string | null;
}

export interface OwnerLandingFaq {
    id: string;
    question: string;
    answer: string;
}

export interface OwnerLandingReview {
    id: string;
    rating: number;
    comment: string | null;
    createdAt: string;
    reviewerName: string;
    reviewerImage: string | null;
    turfName: string;
}

export interface OwnerLandingPage {
    owner: OwnerLandingOwner;
    hero: OwnerLandingHero | null;
    pinnedNotice: OwnerLandingAnnouncement | null;
    about: OwnerLandingAbout | null;
    turfs: OwnerLandingTurf[];
    reviews: OwnerLandingReview[];
    gallery: OwnerLandingGalleryItem[];
    blogs: OwnerLandingBlog[];
    faqs: OwnerLandingFaq[];
    notices: OwnerLandingAnnouncement[];
    contact: OwnerLandingContact | null;
    socialLinks: OwnerLandingSocialLink[];
    stats: OwnerLandingStats;
}