import { cookies } from "next/headers";

import { API_ENDPOINTS, SERVER_API_BASE_URL } from "@/lib/api/config";
import type { ApiResponse } from "@/types/api.type";
import type {
  AboutSection,
  Announcement,
  Blog,
  ContactSection,
  ContentStudioData,
  FaqItem,
  GalleryItem,
  HeroSection,
  SocialLink,
} from "./_types";

const base = API_ENDPOINTS.marketplace.ownerContent;

async function fetchWithCookies<T>(path: string): Promise<T | null> {
  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");

    const res = await fetch(`${SERVER_API_BASE_URL}${base}${path}`, {
      headers: { "Content-Type": "application/json", Cookie: cookieHeader },
      cache: "no-store",
    });

    if (!res.ok) return null;

    const payload = (await res.json()) as ApiResponse<T>;
    return payload.success ? payload.data : null;
  } catch {
    return null;
  }
}

async function fetchList<T>(path: string): Promise<T[]> {
  const data = await fetchWithCookies<T[]>(path);
  return Array.isArray(data) ? data : [];
}

export async function getOwnerContent(): Promise<ContentStudioData> {
  const [hero, about, contact, faqs, gallery, blogs, announcements, social] =
    await Promise.all([
      fetchWithCookies<HeroSection>("/hero"),
      fetchWithCookies<AboutSection>("/about"),
      fetchWithCookies<ContactSection>("/contact"),
      fetchList<FaqItem>("/faqs"),
      fetchList<GalleryItem>("/gallery"),
      fetchList<Blog>("/blogs"),
      fetchList<Announcement>("/announcements"),
      fetchList<SocialLink>("/social-links"),
    ]);

  return { hero, about, contact, faqs, gallery, blogs, announcements, social };
}