"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  MapPin,
  Star,
} from "lucide-react";

import { httpClient } from "@/lib/axios/httpClient";
import { API_ENDPOINTS } from "@/lib/api/config";
import { cn, getFileUrl } from "@/lib/utils";
import type { Turf } from "@/types/turf.type";

/* ───────────────────────── helpers ───────────────────────── */

const n = (v: number | string | undefined | null, fallback = 0) => {
  if (v === undefined || v === null) return fallback;
  const parsed = typeof v === "string" ? parseFloat(v) : v;
  return Number.isFinite(parsed) ? parsed : fallback;
};

const bdt = (v: number) => `৳${Math.round(v).toLocaleString("en-BD")}`;

function getRating(turf: Turf) {
  const visible = (turf.reviews ?? []).filter((r) => !r.isHidden);
  if (!visible.length) return null;
  const avg = visible.reduce((s, r) => s + r.rating, 0) / visible.length;
  return { avg: Math.round(avg * 10) / 10, count: visible.length };
}

const slotLabel = (t: Turf) => (t.defaultSlotDuration ? `${t.defaultSlotDuration} min` : "slot");

/* ───────────────────────── Card ───────────────────────── */

function TurfCard({ turf, index }: { turf: Turf; index: number }) {
  const [currentImgIndex, setCurrentImgIndex] = useState(0);

  const images: string[] = turf.images?.length
    ? turf.images
        .map((img) => getFileUrl(img.url))
        .filter((url): url is string => Boolean(url))
    : [];

  // Auto-slide effect for images (smooth crossfade every 4 seconds)
  useEffect(() => {
    if (images.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentImgIndex((prev) => (prev + 1) % images.length);
    }, 4000);

    return () => clearInterval(timer);
  }, [images.length]);

  const sport = (turf.category?.name ?? "Arena").toUpperCase();
  const base = n(turf.defaultSlotPrice);
  const peakHourPrice = n(turf.peakHourPrice ?? base);
  const weekendPrice = n(turf.weekendPrice ?? base);
  const rating = getRating(turf);
  const reviews = turf._count?.reviews ?? turf.reviews?.length ?? 0;
  const location = turf.area || turf.address || "Dhaka";
  const priceRange = bdt(base);
  const number = String(index + 1).padStart(2, "0");

  return (
    <article
      data-field-card
      role="listitem"
      aria-label={`${turf.name}, ${sport}, ${priceRange} per ${slotLabel(turf)}`}
      className="group/card relative shrink-0 snap-center overflow-hidden outline-none bg-black
        h-[min(68vh,28rem)] w-[min(84vw,20rem)] rounded-[1.5rem] border border-[var(--border)]
        shadow-[0_16px_40px_-20px_rgba(0,0,0,0.8)]
        sm:h-[min(82vh,640px)] sm:w-[min(100vw-3rem,360px)] sm:snap-start sm:rounded-[1.75rem]
        sm:border sm:border-[var(--border)] sm:shadow-lg
        md:w-[340px] lg:w-[360px]
        focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
    >
      {/* Background Image Container with Smooth Auto-Slide Crossfade */}
      <div className="absolute inset-0 z-0">
        {images.length > 0 ? (
          <div className="relative h-full w-full overflow-hidden bg-neutral-950">
            {images.map((imgUrl, imgIdx) => (
              <img
                key={imgUrl + imgIdx}
                src={imgUrl}
                alt={turf.name}
                draggable={false}
                loading={index < 2 ? "eager" : "lazy"}
                decoding="async"
                className={cn(
                  "absolute inset-0 h-full w-full object-cover select-none transition-all duration-1000 ease-in-out",
                  imgIdx === currentImgIndex
                    ? "opacity-100 scale-100 sm:group-hover/card:scale-105"
                    : "opacity-0 scale-105 pointer-events-none"
                )}
              />
            ))}
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[var(--muted)] text-[var(--muted-foreground)]">
            <ImageIcon className="size-10" aria-hidden="true" />
          </div>
        )}

        {/* Dark Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/30 pointer-events-none" />
      </div>

      {/* Auto-Slide Dots Indicator */}
      {images.length > 1 && (
        <div className="pointer-events-none absolute top-4 left-4 z-20 flex gap-1.5 transition-opacity duration-300 group-hover/card:opacity-0">
          {images.map((_, idx) => (
            <span
              key={idx}
              className={cn(
                "h-1 rounded-full transition-all duration-500",
                idx === currentImgIndex ? "w-5 bg-white" : "w-1.5 bg-white/30"
              )}
            />
          ))}
        </div>
      )}

      {/* ───────── Mobile overlay ───────── */}
      <div className="absolute inset-0 z-20 flex flex-col justify-between p-4 sm:hidden">
        <div className="flex items-start justify-end gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black/60 text-[11px] font-black text-white/90 backdrop-blur-sm">
            {number}
          </span>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-300">
              {sport} · {location}
            </p>
            <h3 className="mt-1 text-[1.35rem] font-black uppercase leading-[1.05] tracking-tight text-white">
              {turf.name}
            </h3>
            <p className="mt-1.5 font-black tabular-nums text-white">
              {priceRange}
              <span className="ml-1 text-xs font-semibold text-white/60">
                / {slotLabel(turf)}
              </span>
            </p>
            {rating && (
              <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-white/80">
                <Star
                  className="h-3 w-3 text-[var(--warning)] fill-[var(--warning)]"
                  aria-hidden="true"
                />
                {rating.avg} ({reviews} reviews)
              </p>
            )}
          </div>

          <Link
            href={`/turfs/${turf.id}`}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] py-3 text-[14px] font-bold text-[var(--accent-foreground)] transition hover:bg-[var(--accent-hover)] active:scale-[0.99]"
          >
            Book {turf.name}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>

      {/* ───────── Desktop default card footer ───────── */}
      <div className="pointer-events-none absolute bottom-7 left-0 right-0 z-20 hidden px-6 transition-all duration-300 sm:block group-hover/card:opacity-0 group-hover/card:translate-y-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-300">
          {sport} · {location}
        </p>
        <h3 className="mt-1 line-clamp-2 text-2xl font-black uppercase leading-[1.05] tracking-tight text-white sm:text-[1.55rem]">
          {turf.name}
        </h3>
        <p className="mt-2 font-black tabular-nums text-white">
          {priceRange}
          <span className="ml-1 text-sm font-semibold text-white/65">
            / {slotLabel(turf)}
          </span>
        </p>
        <p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-white/45">
          Hover for rates & booking
        </p>
      </div>

      {/* Number Badge (Desktop) */}
      <div className="absolute right-4 top-4 z-20 hidden h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/50 text-xs font-black text-white/90 backdrop-blur-sm sm:flex">
        {number}
      </div>

      {/* ───────── Full Bottom-to-Top Drawer (Hover / Focus) ───────── */}
      <div className="pointer-events-none absolute inset-0 z-30 hidden sm:flex flex-col justify-end p-5 backdrop-blur-md bg-black/90 border-t border-[var(--border)] transition-transform duration-500 cubic-bezier(0.16,1,0.3,1) translate-y-full group-hover/card:translate-y-0 group-focus-within/card:translate-y-0 group-hover/card:pointer-events-auto group-focus-within/card:pointer-events-auto">
        <div className="flex h-full flex-col justify-between pt-6 text-white">
          {/* Header */}
          <div>
            <div className="flex items-center justify-between">
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white/90">
                {sport}
              </span>
              {rating && (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-[var(--warning)]">
                  <Star
                    className="h-3.5 w-3.5 fill-[var(--warning)] text-[var(--warning)]"
                    aria-hidden="true"
                  />
                  {rating.avg} ({reviews})
                </span>
              )}
            </div>

            <h4 className="mt-3 line-clamp-2 text-xl font-black uppercase tracking-tight text-white">
              {turf.name}
            </h4>

            <p className="mt-1 flex items-center gap-1.5 text-xs text-neutral-300">
              <MapPin
                className="h-3.5 w-3.5 text-neutral-400 shrink-0"
                aria-hidden="true"
              />
              {location}
            </p>
          </div>

          {/* Pricing Breakdown */}
          <div className="rounded-xl border border-white/10 bg-neutral-900/80 p-3.5">
            <div className="flex items-baseline justify-between border-b border-white/10 pb-2.5">
              <span className="text-xs font-semibold text-white/60">
                Rate Range
              </span>
              <span className="text-lg font-black tabular-nums text-white">
                {priceRange}
                <span className="ml-1 text-[11px] font-normal text-white/50">
                  /{slotLabel(turf)}
                </span>
              </span>
            </div>

            <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px]">
              <div className="rounded-lg bg-black/50 py-2 border border-white/5">
                <dt className="text-[10px] uppercase tracking-wider text-white/40">
                  Base
                </dt>
                <dd className="mt-0.5 font-bold tabular-nums text-white">
                  {bdt(base)}
                </dd>
              </div>
              <div className="rounded-lg bg-black/50 py-2 border border-white/5">
                <dt className="text-[10px] uppercase tracking-wider text-white/40">
                  Peak
                </dt>
                <dd className="mt-0.5 font-bold tabular-nums text-[var(--slot-peak)]">
                  {bdt(peakHourPrice)}
                </dd>
              </div>
              <div className="rounded-lg bg-black/50 py-2 border border-white/5">
                <dt className="text-[10px] uppercase tracking-wider text-white/40">
                  Weekend
                </dt>
                <dd className="mt-0.5 font-bold tabular-nums text-[var(--warning)]">
                  {bdt(weekendPrice)}
                </dd>
              </div>
            </dl>
          </div>

          {/* Actions */}
          <div className="mt-2">
            <Link
              href={`/turfs/${turf.id}`}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] py-3 text-xs font-bold uppercase tracking-wider text-[var(--accent-foreground)] shadow-lg transition-all hover:bg-[var(--accent-hover)] active:scale-[0.98]"
            >
              Book Turf
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

/* ───────────────────────── Skeleton Card ───────────────────────── */

function TurfCardSkeleton() {
  return (
    <article
      data-field-card
      className="shrink-0 snap-center overflow-hidden outline-none bg-black
        h-[min(68vh,28rem)] w-[min(84vw,20rem)] rounded-[1.5rem] border border-[var(--border)]
        shadow-[0_16px_40px_-20px_rgba(0,0,0,0.8)]
        sm:h-[min(82vh,640px)] sm:w-[min(100vw-3rem,360px)] sm:snap-start sm:rounded-[1.75rem]
        md:w-[340px] lg:w-[360px]"
    >
      <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 bg-[length:200%_100%]" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/30 pointer-events-none" />
      <div className="absolute bottom-7 left-0 right-0 z-20 hidden px-6 sm:block">
        <div className="h-2 w-1/4 bg-white/10 rounded animate-pulse mb-2" />
        <div className="h-5 w-3/4 bg-white/10 rounded animate-pulse mb-1" />
        <div className="h-4 w-1/2 bg-white/10 rounded animate-pulse mb-2" />
        <div className="h-2 w-1/3 bg-white/5 rounded animate-pulse" />
      </div>
      <div className="absolute right-4 top-4 z-20 hidden h-9 w-9 sm:flex rounded-full border border-white/15 bg-black/50" />
    </article>
  );
}

/* ───────────────────────── Showcase ───────────────────────── */

export function TurfShowcase() {
  const [turfs, setTurfs] = useState<Turf[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    httpClient
      .get<{
        data: Turf[];
        meta: { page: number; limit: number; total: number; totalPages: number };
      }>(API_ENDPOINTS.marketplace.turfs, {
        params: { limit: "6", sortBy: "createdAt", sortOrder: "desc" },
      })
      .then((r) => setTurfs(r.data.data))
      .catch(() => {
        setTurfs([]);
        setError(true);
      })
      .finally(() => setLoading(false));
  }, []);

  const total = turfs.length;

  const scrollByCard = (dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-field-card]");
    const step = card ? card.offsetWidth + 16 : el.clientWidth * 0.85;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  const handleScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-field-card]");
    const step = card ? card.offsetWidth + 16 : 1;
    setActiveIndex(Math.round(el.scrollLeft / step));
  };

  return (
    <section
      id="fields"
      className="relative overflow-x-clip border-b border-[var(--border)] bg-background sm:scroll-mt-[7rem]"
      aria-labelledby="fields-heading"
    >
      {/* ───────── Banner background ───────── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[100px] bg-cover bg-center bg-no-repeat sm:h-[130px] md:h-[160px]"
        style={{ backgroundImage: "url('/assets/pick_turf_banner.png')" }}
      />

      {/* Theme-aware overlay so text stays readable in both light & dark */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[100px] bg-gradient-to-b from-white/75 via-white/55 to-white/85
                   sm:h-[130px] md:h-[160px]
                   dark:from-black/75 dark:via-black/55 dark:to-black/85"
      />

      {/* Brand accent glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[100px] bg-[radial-gradient(60%_100%_at_20%_0%,rgba(22,97,49,0.18),transparent_70%)]
                   sm:h-[130px] md:h-[160px]"
      />

      {/* ───────── Header content ───────── */}
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <header className="relative flex min-h-[100px] flex-col justify-center gap-2 py-4 sm:min-h-[130px] sm:gap-3 sm:py-6 md:min-h-[160px] md:py-8">
          {/* Eyebrow */}
          <div className="flex items-center gap-3">
            <span className="h-px w-8 bg-[var(--primary)]" aria-hidden="true" />
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--primary)] sm:text-[11px]">
              Turfs & pricing
            </p>
          </div>

          {/* Title — forced readable colors in both themes */}
          <h2
            id="fields-heading"
            className="max-w-2xl text-balance text-[1.5rem] font-black leading-[1.1] tracking-tight text-zinc-900
                       sm:text-4xl sm:leading-[1.08]
                       md:text-[2.65rem]
                       dark:text-white dark:drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
          >
            Pick your{" "}
            <span className="text-[var(--primary)] drop-shadow-none">turf</span>
          </h2>
        </header>
      </div>

      {/* ───────── Dark carousel band ───────── */}
      <div className="relative border-y border-[var(--border)] bg-[var(--secondary)]">
        {/* Mobile status bar */}
        {!loading && !error && total > 0 && (
          <div className="relative z-[1] flex items-center gap-3 pl-4 pr-4 sm:pl-6 sm:pr-6 lg:pl-[max(1.5rem,calc((100%-72rem)/2+1.5rem))] lg:pr-[max(1.5rem,calc((100%-72rem)/2+1.5rem))] pt-3 pb-1 sm:hidden">
            <p className="min-w-0 flex-1 truncate text-xs text-[var(--muted-foreground)]">
              <span className="font-bold text-[var(--primary)]">
                {String(activeIndex + 1).padStart(2, "0")}
              </span>
              <span> / </span>
              {String(total).padStart(2, "0")}
              <span> · </span>swipe
            </p>

            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                aria-label="Previous turf"
                onClick={() => scrollByCard(-1)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-black/40 text-white active:scale-95"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Next turf"
                onClick={() => scrollByCard(1)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-black/40 text-white active:scale-95"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Desktop status bar */}
        <div className="relative z-[1] hidden items-center gap-3 sm:flex pl-4 pr-4 sm:pl-6 sm:pr-6 lg:pl-[max(1.5rem,calc((100%-72rem)/2+1.5rem))] lg:pr-[max(1.5rem,calc((100%-72rem)/2+1.5rem))] pt-4 pb-2">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--primary)]">
              Live rates {total}
            </p>
          </div>
          <div className="flex shrink-0 gap-1.5">
            <button
              type="button"
              aria-label="Scroll turfs left"
              onClick={() => scrollByCard(-1)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-black/40 text-white transition hover:bg-black/80 active:scale-95"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Scroll turfs right"
              onClick={() => scrollByCard(1)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-black/40 text-white transition hover:bg-black/80 active:scale-95"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Card list */}
        {loading ? (
          <div
            ref={scrollerRef}
            role="list"
            tabIndex={0}
            className="no-scrollbar relative z-[1] flex snap-x snap-mandatory gap-4 overflow-x-auto overflow-y-hidden overscroll-x-contain scroll-smooth pb-6 pt-2 [-webkit-overflow-scrolling:touch] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] sm:pb-10 sm:pt-4 pl-4 pr-4 sm:pl-6 sm:pr-6 lg:pl-[max(1.5rem,calc((100%-72rem)/2+1.5rem))] lg:pr-[max(1.5rem,calc((100%-72rem)/2+1.5rem))]"
            aria-busy="true"
          >
            <TurfCardSkeleton />
            <TurfCardSkeleton />
            <TurfCardSkeleton />
            <div className="w-2 shrink-0 sm:hidden" aria-hidden="true" />
          </div>
        ) : error ? (
          <p
            className="relative z-[1] py-20 text-center text-sm text-[var(--muted-foreground)]"
            role="alert"
          >
            Popular turfs are temporarily unavailable.
          </p>
        ) : total === 0 ? (
          <div className="relative z-[1] py-20 px-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--muted)] mb-4">
              <svg className="h-8 w-8 text-[var(--muted-foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 18.657A8 8 0 016.343 7.343M11 4a7 7 0 11-8 7m8-7v7m0 0l-4 4m4-4l4 4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">No turfs available</h3>
            <p className="text-sm text-[var(--muted-foreground)] mb-4">We couldn't find any active turfs at the moment.</p>
            <Link
              href="/#turfs"
              className="inline-flex items-center gap-2 text-sm font-medium text-[var(--primary)] hover:underline"
            >
              Browse all turfs
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <div
            ref={scrollerRef}
            onScroll={handleScroll}
            role="list"
            tabIndex={0}
            className="no-scrollbar relative z-[1] flex snap-x snap-mandatory gap-4 overflow-x-auto overflow-y-hidden overscroll-x-contain scroll-smooth pb-6 pt-2 [-webkit-overflow-scrolling:touch] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] sm:pb-10 sm:pt-4 pl-4 pr-4 sm:pl-6 sm:pr-6 lg:pl-[max(1.5rem,calc((100%-72rem)/2+1.5rem))] lg:pr-[max(1.5rem,calc((100%-72rem)/2+1.5rem))]"
          >
            {turfs.map((turf, index) => (
              <TurfCard key={turf.id} turf={turf} index={index} />
            ))}
            <div className="w-2 shrink-0 sm:hidden" aria-hidden="true" />
          </div>
        )}

        {/* Footer band */}
        <div className="relative z-[1] border-t border-[var(--border)] px-4 py-4 sm:px-6 sm:py-5">
          <div className="mx-auto flex max-w-6xl flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <p className="inline-flex items-center gap-2 text-xs text-[var(--muted-foreground)]" />
            <Link
              href="/#turfs"
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] bg-black/30 px-4 py-2.5 text-sm font-bold text-[var(--primary)] transition hover:bg-black/60 sm:min-h-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0"
            >
              Browse all turfs
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default TurfShowcase;