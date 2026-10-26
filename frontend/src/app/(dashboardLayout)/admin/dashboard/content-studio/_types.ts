// ═════════════════════════════════════════════════════════════════
// SERVER TYPES (match DTO returned by the API)
// ═════════════════════════════════════════════════════════════════

export type HeroSection = {
  headline: string;
  subheadline: string | null;
  coverImage: string | null;
  overlayOpacity: number;
  textAlign: "LEFT" | "CENTER" | "RIGHT";
  isVisible: boolean;
};

export type AboutSection = {
  heading: string;
  body: string;
  imageUrl: string | null;
  isVisible: boolean;
};

export type ContactSection = {
  heading: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  openingHours: string | null;
  isVisible: boolean;
};

export type GalleryItem = {
  id: string;
  title: string | null;
  description: string | null;
  imageUrl: string;
  sortOrder: number;
  active: boolean;
  createdAt?: string;
};

export type Blog = {
  id: string;
  title: string;
  slug: string;
  content: string;
  coverImage: string | null;
  readMinutes: number | null;
  published: boolean;
  publishedAt: string | null;
  updatedAt?: string;
};

export type Announcement = {
  id: string;
  title: string;
  message: string;
  type: string;
  isActive: boolean;
  pinned: boolean;
  createdAt: string;
};

export type SocialLink = {
  id: string;
  platform: string;
  url: string;
  icon: string | null;
  sortOrder: number;
  isActive: boolean;
};

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
  isActive: boolean;
};

// ═════════════════════════════════════════════════════════════════
// FORM STATES (strings for controlled inputs)
// ═════════════════════════════════════════════════════════════════

export type HeroForm = {
  headline: string;
  subheadline: string;
  coverImage: string;      // ← renamed from backgroundImage
  overlayOpacity: number;
  textAlign: "LEFT" | "CENTER" | "RIGHT";
  isVisible: boolean;
};

export type AboutForm = {
  heading: string;
  body: string;
  imageUrl: string;
  isVisible: boolean;
};

export type ContactForm = {
  heading: string;
  phone: string;
  email: string;
  address: string;
  openingHours: string;    // ← mapEmbedUrl removed
  isVisible: boolean;
};

export type FaqForm = {
  question: string;
  answer: string;
  sortOrder: number;
  isActive: boolean;
};

export type BlogForm = {
  title: string;
  slug: string;
  content: string;
  coverImage: string;
  readMinutes: number | "";
  published: boolean;
};

export type AnnouncementForm = {
  title: string;
  message: string;
  type: string;
  isActive: boolean;
  pinned: boolean;
};

export type SocialForm = {
  platform: string;
  url: string;
  icon: string;
  sortOrder: number;
  isActive: boolean;
};

// ═════════════════════════════════════════════════════════════════
// PAGE BUNDLE (SSR seed)
// ═════════════════════════════════════════════════════════════════

export type ContentStudioData = {
  hero: HeroSection | null;
  about: AboutSection | null;
  contact: ContactSection | null;
  faqs: FaqItem[];
  gallery: GalleryItem[];
  blogs: Blog[];
  announcements: Announcement[];
  social: SocialLink[];
};

// ═════════════════════════════════════════════════════════════════
// DEFAULTS
// ═════════════════════════════════════════════════════════════════

export const emptyHero: HeroForm = {
  headline: "",
  subheadline: "",
  coverImage: "",          // ← renamed
  overlayOpacity: 40,
  textAlign: "CENTER",
  isVisible: true,
};

export const emptyAbout: AboutForm = {
  heading: "About Us",
  body: "",
  imageUrl: "",
  isVisible: true,
};

export const emptyContact: ContactForm = {
  heading: "Contact Us",
  phone: "",
  email: "",
  address: "",
  openingHours: "",        // ← mapEmbedUrl removed
  isVisible: true,
};

export const emptyFaq: FaqForm = {
  question: "",
  answer: "",
  sortOrder: 0,
  isActive: true,
};

export const emptyBlog: BlogForm = {
  title: "",
  slug: "",
  content: "",
  coverImage: "",
  readMinutes: "",
  published: false,
};

export const emptyAnnouncement: AnnouncementForm = {
  title: "",
  message: "",
  type: "INFO",
  isActive: true,
  pinned: false,
};

export const emptySocial: SocialForm = {
  platform: "facebook",
  url: "",
  icon: "",
  sortOrder: 0,
  isActive: true,
};

// ═════════════════════════════════════════════════════════════════
// CONSTANTS
// ═════════════════════════════════════════════════════════════════

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const PLATFORM_OPTIONS = [
  "facebook",
  "instagram",
  "youtube",
  "tiktok",
  "whatsapp",
  "linkedin",
  "x",
];

export const ANNOUNCEMENT_TYPES = ["INFO", "WARNING", "PROMO"];

// ═════════════════════════════════════════════════════════════════
// HELPERS
// ═════════════════════════════════════════════════════════════════

export const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const PREVIEW_MAX_LENGTH = 140;

export const toPreview = (content: string): string => {
  const flat = content.replace(/\s+/g, " ").trim();
  if (flat.length <= PREVIEW_MAX_LENGTH) return flat;
  const clipped = flat.slice(0, PREVIEW_MAX_LENGTH);
  const lastSpace = clipped.lastIndexOf(" ");
  return `${(lastSpace > PREVIEW_MAX_LENGTH * 0.6 ? clipped.slice(0, lastSpace) : clipped).trimEnd()}…`;
};