"use client";

import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ExternalLink,
  FacebookIcon,
  Instagram,
  MessageSquare,
  Quote,
  Star,
  Twitter,
  Youtube,
} from "lucide-react";

import { httpClient } from "@/lib/axios/httpClient";
import { API_ENDPOINTS } from "@/lib/api/config";
import { getFileUrl } from "@/lib/utils";
import type {
  OwnerLandingBlog, OwnerLandingPage, OwnerLandingReview,
} from "@/types/owner-landing.type";

import AboutTab from "./_components/AboutTab";
import CoverHeader from "./_components/CoverHeader";
import FaqTab from "./_components/FaqTab";
import GallerySection from "./_components/GallerySection";
import StoriesTab from "./_components/StoriesTab";
import StoryDrawer from "./_components/StoryDrawer";
import TabNav, { type LandingTab } from "./_components/TabNav";
import VenuesTab from "./_components/VenuesTab";

import type { OwnerLandingSocialLink } from "@/types/owner-landing.type";


const EASE = [0.22, 1, 0.36, 1] as const;
const NAV_OFFSET = 128;

const formatDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
};

/* ─── Reveal wrapper ─── */
function Reveal({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/* ─── Stars ─── */
function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`size-4 ${n <= Math.round(value)
            ? "fill-amber-400 text-amber-400"
            : "text-muted-foreground/30"
            }`}
        />
      ))}
    </span>
  );
}

/* ─── Reviews ─── */
function ReviewsTab({
  reviews,
}: {
  reviews: OwnerLandingReview[];
  stats: OwnerLandingPage["stats"];
}) {
  if (!reviews.length) {
    return (
      <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-2">
          <Star className="size-4 text-primary" />
          <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            What Players Say
          </h2>
        </div>
        <p className="mt-5 text-sm text-muted-foreground">No reviews yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-2">
        <Star className="size-4 text-primary" />
        <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          What Players Say
        </h2>
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {reviews.map((review, i) => {
          const avatar = getFileUrl(review.reviewerImage);
          const date = formatDate(review.createdAt);
          return (
            <motion.article
              key={review.id}
              initial={{ opacity: 0, y: 30, scale: 0.98 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.55, delay: (i % 3) * 0.1, ease: EASE }}
              whileHover={{ y: -8, rotateX: 2 }}
              className="group relative flex flex-col overflow-hidden rounded-xl border-l-4 border-l-primary/70 border-border/60 bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10"
            >
              <div className="absolute inset-0 -z-10 rounded-2xl bg-gradient-to-br from-primary/5 via-transparent to-amber-400/5 opacity-0 group-hover:opacity-100 transition-opacity" />

              <Stars value={review.rating} />
              {review.comment && (
                <blockquote className="mt-3 flex gap-2 pl-1">
                  <Quote className="mt-0.5 size-5 shrink-0 -scale-x-100 text-primary/40" />
                  <span className="line-clamp-5 text-[15px] leading-relaxed italic text-foreground/90 px-1">
                    {review.comment}
                  </span>
                  <Quote className="mt-0.5 size-5 shrink-0 text-primary/40" />
                </blockquote>
              )}
              <div className="mt-auto flex items-center gap-3 pt-4">
                <div className="relative size-10 shrink-0 overflow-hidden rounded-full bg-muted ring-2 ring-primary/20">
                  {avatar ? (
                    <Image src={avatar} alt={review.reviewerName} fill sizes="40px" className="object-cover" />
                  ) : (
                    <span className="grid size-full place-items-center text-sm font-black">
                      {review.reviewerName.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-foreground">
                    {review.reviewerName}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {review.turfName}
                    {date ? ` · ${date}` : ""}
                  </p>
                </div>
              </div>
            </motion.article>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Social Links ─── */
function SocialLinks({ links }: { links: OwnerLandingSocialLink[] }) {
  if (!links.length) return null;

  const getPlatformConfig = (platform: string) => {
    const p = platform.toLowerCase();
    if (p.includes("facebook"))
      return {
        icon: <FacebookIcon className="size-5" />,
        label: "Facebook",
        brand: "group-hover:bg-[#1877F2] group-hover:border-[#1877F2] group-hover:shadow-[#1877F2]/30",
      };
    if (p.includes("instagram"))
      return {
        icon: <Instagram className="size-5" />,
        label: "Instagram",
        brand:
          "group-hover:bg-gradient-to-br group-hover:from-[#F58529] group-hover:via-[#DD2A7B] group-hover:to-[#8134AF] group-hover:border-transparent group-hover:shadow-[#DD2A7B]/30",
      };
    if (p.includes("twitter") || p === "x")
      return {
        icon: <Twitter className="size-5" />,
        label: "Twitter",
        brand: "group-hover:bg-[#1DA1F2] group-hover:border-[#1DA1F2] group-hover:shadow-[#1DA1F2]/30",
      };
    if (p.includes("youtube"))
      return {
        icon: <Youtube className="size-5" />,
        label: "YouTube",
        brand: "group-hover:bg-[#FF0000] group-hover:border-[#FF0000] group-hover:shadow-[#FF0000]/30",
      };
    return {
      icon: <ExternalLink className="size-5" />,
      label: platform.charAt(0).toUpperCase() + platform.slice(1),
      brand: "group-hover:bg-primary group-hover:border-primary group-hover:shadow-primary/30",
    };
  };

  return (
    <section id="section-social" className="scroll-mt-32">
      <Reveal>
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card p-6 shadow-sm sm:p-8">
          {/* Ambient accent glow */}
          <div className="pointer-events-none absolute -top-24 -right-24 size-60 rounded-full bg-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 size-60 rounded-full bg-amber-400/5 blur-3xl" />

          <div className="relative">
            {/* Centered header */}
            <div className="flex flex-col items-center text-center">
              <div className="flex items-center gap-2">
                <MessageSquare className="size-4 text-primary" />
                <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  Connect With Us
                </h2>
              </div>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Follow us for updates, matches & community highlights
              </p>
            </div>

            {/* Centered icon grid */}
            <div className="mt-7 flex flex-wrap items-center justify-center gap-4 sm:gap-5">
              {links.map((link) => {
                const { icon, label, brand } = getPlatformConfig(link.platform);
                return (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Follow us on ${label}`}
                    className="group flex flex-col items-center gap-2.5"
                  >
                    {/* Icon circle */}
                    <span
                      className={`grid size-14 place-items-center rounded-full border border-border/60 bg-background text-foreground shadow-sm ring-1 ring-border/40 transition-all duration-300 group-hover:-translate-y-1.5 group-hover:text-white group-hover:shadow-xl ${brand}`}
                    >
                      {icon}
                    </span>

                    {/* Label */}
                    <span className="text-xs font-semibold text-muted-foreground transition-colors group-hover:text-foreground">
                      {label}
                    </span>
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ─── Page ─── */
export default function OwnerLandingPageClient() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<LandingTab | null>(null);
  const [openStory, setOpenStory] = useState<OwnerLandingBlog | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["owner-landing", id],
    queryFn: async () =>
      (
        await httpClient.get<OwnerLandingPage>(
          API_ENDPOINTS.marketplace.ownerLanding.replace(":ownerId", id),
        )
      ).data,
    enabled: Boolean(id),
    retry: false,
  });

  const tabs: LandingTab[] = data
    ? [
      ...(data.about ? (["about"] as const) : []),
      "venues",
      ...(data.reviews.length ? (["reviews"] as const) : []),
      ...(data.gallery.length ? (["gallery"] as const) : []),
      ...(data.blogs.length ? (["stories"] as const) : []),
      ...(data.faqs.length ? (["faq"] as const) : []),
      ...(data.socialLinks.length ? (["social"] as const) : []),
    ]
    : [];
  const tabsKey = tabs.join(",");

  useEffect(() => {
    if (!tabsKey) return;
    const onScroll = () => {
      let current = tabsKey.split(",")[0] as LandingTab;
      for (const key of tabsKey.split(",") as LandingTab[]) {
        const el = document.getElementById(`section-${key}`);
        if (el && el.getBoundingClientRect().top <= NAV_OFFSET + 8) current = key;
      }
      setActiveTab(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [tabsKey]);

  const scrollToSection = (key: LandingTab) => {
    const el = document.getElementById(`section-${key}`);
    if (!el) return;
    window.scrollTo({
      top: el.getBoundingClientRect().top + window.scrollY - NAV_OFFSET,
      behavior: "smooth",
    });
  };

  if (isLoading) {
    return (
      <main className="mx-auto max-w-screen-2xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="h-96 animate-pulse rounded-3xl bg-muted" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((k) => (
            <div key={k} className="h-72 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      </main>
    );
  }

  if (isError || !data) {
    return (
      <main className="mx-auto flex min-h-[70vh] w-full max-w-3xl flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-3xl font-black">Owner not found</h1>
        <p className="text-sm text-muted-foreground">
          This owner page is unavailable or has been removed.
        </p>
        <Link
          href="/#turfs"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          Browse turfs <ArrowRight className="size-4" />
        </Link>
      </main>
    );
  }

  const tab = activeTab && tabs.includes(activeTab) ? activeTab : tabs[0];

  return (
    <main className="min-h-screen bg-background">
      <CoverHeader data={data} />

      <div className="mx-auto w-full max-w-screen-2xl px-4 sm:px-6 lg:px-8 pb-8">
        <TabNav tabs={tabs} active={tab} onChange={scrollToSection} />

        <div className="mt-10 space-y-16 sm:mt-12 sm:space-y-20 lg:space-y-24">
          {tabs.includes("about") && (
            <section id="section-about" className="scroll-mt-32">
              <Reveal>
                <AboutTab data={data} />
              </Reveal>
            </section>
          )}

          <section id="section-venues" className="scroll-mt-32">
            <Reveal>
              <VenuesTab data={data} />
            </Reveal>
          </section>

          {tabs.includes("reviews") && (
            <section id="section-reviews" className="scroll-mt-32">
              <Reveal>
                <ReviewsTab reviews={data.reviews} stats={data.stats} />
              </Reveal>
            </section>
          )}

          {tabs.includes("gallery") && (
            <section id="section-gallery" className="scroll-mt-32">
              <Reveal>
                <GallerySection items={data.gallery} />
              </Reveal>
            </section>
          )}

          {tabs.includes("stories") && (
            <section id="section-stories" className="scroll-mt-32">
              <Reveal>
                <StoriesTab data={data} onOpenStory={setOpenStory} />
              </Reveal>
            </section>
          )}

          {tabs.includes("faq") && (
            <section id="section-faq" className="scroll-mt-32">
              <Reveal>
                <FaqTab data={data} />
              </Reveal>
            </section>
          )}

          {tabs.includes("social") && (
            <section id="section-social" className="scroll-mt-32">
              <Reveal>
                <SocialLinks links={data.socialLinks} />
              </Reveal>
            </section>
          )}
        </div>
      </div>

      <StoryDrawer story={openStory} onClose={() => setOpenStory(null)} />
    </main>
  );
}