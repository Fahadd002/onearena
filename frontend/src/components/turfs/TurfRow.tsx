"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Lock,
  ChevronLeft,
  ChevronRight,
  Clock,
  Check,
  Flame,
  MapPin as MapPinIcon,
  ExternalLink,
} from "lucide-react";

import {
  isSameDay,
  inBucket,
  isPastSlot,
  timeLabel,
  timeOfDay,
  isSlotBookable,
  slotStatusKey,
  DAY,
  MONTH,
  DAY_FULL,
  MONTH_FULL,
  ymd,
  type Bucket,
  type TimeTone,
} from "@/lib/slotsUtils";

import { Turf, type TurfSlot } from "@/types/turf.type";
import { GET_FILE_URL } from "@/lib/api/config";
import { formatPrice } from "@/lib/slotsUtils";
import { useIsMounted } from "./useIsToday";
import type { CartSlot } from "./types";

interface Props {
  turf: Turf;
  date: Date;
  bucket: Bucket;
  cart: CartSlot[];
  toggle: (slot: CartSlot) => void;
  onSelect?: (slot: CartSlot) => void;
  /** `frosted` keeps the surface translucent while the row still sits over the video banner. */
  surface?: "solid" | "frosted";
}

const resolveImageUrl = (url: string) =>url && !url.startsWith("http") ? `${GET_FILE_URL}${url}` : url;

const TONE_STYLES: Record<TimeTone, { text: string }> = {
  morning: { text: "text-amber-600 dark:text-amber-400" },
  noon: { text: "text-sky-600 dark:text-sky-400" },
  afternoon: { text: "text-orange-600 dark:text-orange-400" },
  evening: { text: "text-violet-600 dark:text-violet-400" },
  night: { text: "text-indigo-600 dark:text-indigo-400" },
};

/* Slot availability, straight from the backend `SlotSatus` enum:
   AVAILABLE is bookable, WAITLIST is held by an unfinished booking, BOOKED is
   taken. `text` colours the plain status label and its dot inside each chip. */
const SLOT_STATUS: Record<string, { label: string; text: string }> = {
  AVAILABLE: {
    label: "Available",
    text: "text-foreground dark:text-success-400",
  },
  WAITLIST: {
    label: "Waitlist",
    text: "text-amber-600 dark:text-amber-400",
  },
  BOOKED: {
    label: "Booked",
    text: "text-destructive",
  },
};

/* A slot with no status at all must never read as "Available". */
const UNKNOWN_STATUS = {
  label: "Unavailable",
  text: "text-muted-foreground",
};

const slotStatusOf = (s: TurfSlot) => SLOT_STATUS[slotStatusKey(s)] ?? UNKNOWN_STATUS;

const isOpenSlot = isSlotBookable;

/* ═══════════ Auto-sliding image carousel ═══════════ */
function ImageCarousel({
  images,
  alt,
  interval = 4000,
}: {
  images: { url: string }[];
  alt: string;
  interval?: number;
}) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = images.length;

  useEffect(() => {
    if (count <= 1 || paused) return;
    const id = setInterval(() => setCurrent((i) => (i + 1) % count), interval);
    return () => clearInterval(id);
  }, [count, paused, interval]);

  if (count === 0) {
    return (
      <img
        src="/placeholder.jpg"
        alt={alt}
        className="absolute inset-0 h-full w-full object-cover"
      />
    );
  }

  return (
    <>
      <div
        className="absolute inset-0 h-full w-full"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {images.map((img, i) => (
          <img
            key={i}
            src={resolveImageUrl(img.url)}
            alt={`${alt} — ${i + 1}`}
            loading={i === 0 ? "eager" : "lazy"}
            className={`absolute inset-0 h-full w-full object-cover transition-all duration-700 ease-out ${i === current ? "opacity-100 scale-100" : "opacity-0 scale-105"
              }`}
          />
        ))}
      </div>

      {count > 1 && (
        <div className="absolute bottom-1.5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/50 px-1.5 py-0.5 backdrop-blur-md lg:bottom-2 lg:px-2 lg:py-1">
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setCurrent(i);
              }}
              aria-label={`Go to image ${i + 1}`}
              className={`h-1 rounded-full transition-all duration-300 lg:h-1.5 ${i === current ? "w-3 bg-white lg:w-4" : "w-1 bg-white/50 hover:bg-white/80 lg:w-1.5"
                }`}
            />
          ))}
        </div>
      )}
    </>
  );
}


/** Slots a row shows for the chosen date and time bucket; a row with none is not rendered. */
export function visibleSlotsOf(turf: Turf, date: Date, bucket: Bucket, mounted: boolean) {
  return (turf.slots ?? [])
    // `active` is absent from some slot payloads, so only reject an explicit false
    .filter(
      (s) =>
        s.slotDate &&
        isSameDay(s.slotDate, date) &&
        s.active !== false &&
        inBucket(s.startMinute, bucket) &&
        // never show slots whose start time has already passed today
        (!mounted || !isPastSlot(date, s.startMinute)),
    )
    .sort((a, b) => a.startMinute - b.startMinute);
}

/* ═══════════ TurfRow ═══════════ */
export function TurfRow({ turf, date, bucket, cart, toggle, onSelect, surface = "solid" }: Props) {
  const slotsScrollRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  /* Whether today's clock is known yet. The server cannot know the browser's
     local time, so past-slot filtering waits for mount; otherwise the server
     HTML and the first client render disagree on which slots still exist. */
  const mounted = useIsMounted();
  /* Tracks whether the slot rail has more content past each edge so the
     chevrons can disable at the ends and the mobile edge fades only appear
     when there is actually something hidden. */
  const [edges, setEdges] = useState({ left: false, right: false });

  const slots = visibleSlotsOf(turf, date, bucket, mounted);
  if (!slots.length) return null;

  const syncEdges = useCallback(() => {
    const el = slotsScrollRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const left = el.scrollLeft > 4;
    const right = max > 4 && el.scrollLeft < max - 4;
    setEdges((prev) => (prev.left === left && prev.right === right ? prev : { left, right }));
  }, []);

  useEffect(() => {
    syncEdges();
  }, [syncEdges, slots.length]);

  useEffect(() => {
    const el = slotsScrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(syncEdges);
    ro.observe(el);
    return () => ro.disconnect();
  }, [syncEdges]);



  const friday = date.getDay() === 5;
  const images = turf.images ?? [];

  const scrollSlots = (dir: "left" | "right") =>
    slotsScrollRef.current?.scrollBy({
      left: dir === "left" ? -240 : 240,
      behavior: "smooth",
    });

  return (
    <article
      className={`group/card relative scroll-mt-40 overflow-hidden rounded-xl border transition-colors duration-[400ms] lg:rounded-2xl ${surface === "frosted"
          ? "border-white/20 bg-background/25 backdrop-blur-xl hover:bg-background/30"
          : `bg-card ${friday ? "border-amber-400/40 hover:border-amber-400/60" : "border-border/60 hover:border-border"}`
        }`}
    >
      {friday && (
        <div className="absolute inset-x-0 top-0 z-20 h-1 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400" />
      )}

      <div className="grid gap-0 lg:grid-cols-[280px_1fr] lg:items-stretch">
        {/* LEFT — Image (opens owner page in new tab) + Info (navigates in-page) */}
        <div className="group flex items-stretch gap-2.5 p-2.5 lg:flex-col lg:gap-0 lg:p-0">
          <div className="relative size-[96px] shrink-0 overflow-hidden rounded-[5px] bg-muted lg:h-full lg:min-h-[200px] lg:w-full lg:rounded-none">
            <button
              type="button"
              onClick={() => window.open(`/${turf.owner?.id ?? ""}`, "_blank", "noopener,noreferrer")}
              className="absolute inset-0 z-10 cursor-pointer"
              aria-label={`View ${turf.name} owner page in new tab`}
            >
            </button>
            <ImageCarousel images={images} alt={turf.name} />

            {/* New-tab affordance — appears on hover */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute right-1.5 top-1.5 z-10 hidden size-6 items-center justify-center rounded-full bg-black/50 text-white opacity-0 backdrop-blur-md transition-opacity group-hover:opacity-100 lg:inline-flex"
            >
              <ExternalLink className="size-3" />
            </span>

            <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/0 to-black/0 lg:from-black/70" />

            {/* Friday — dot only on mobile, the amber rail and border carry it on desktop */}
            {friday && (
              <span
                aria-label="Weekend"
                className="absolute left-1.5 top-1.5 z-10 size-2 rounded-full bg-amber-400 ring-2 ring-amber-950/30 lg:hidden"
              />
            )}

            {/* Category + name overlay — desktop only */}
            <div className="absolute inset-x-0 bottom-0 z-10 hidden p-3 lg:block">
              {turf.category?.name && (
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">
                  {turf.category.name}
                </p>
              )}
              <h3 className="truncate text-sm font-bold text-white transition group-hover:text-primary">
                {turf.name}
              </h3>
            </div>
          </div>

          {/* Mobile info — clickable card navigates to owner page, button opens map */}
          <div
            className="group/link flex min-w-0 flex-1 flex-col gap-0.5 lg:hidden cursor-pointer"
            onClick={() => router.push(`/owners/${turf.owner?.id ?? ""}`)}
          >
            <div className="flex flex-wrap items-center gap-1">
              {turf.category?.name && (
                <span className="truncate text-[9px] font-extrabold uppercase leading-none tracking-wider text-primary">
                  {turf.category.name}
                </span>
              )}
              {friday && (
                <span className="shrink-0 text-[9px] font-extrabold uppercase leading-none tracking-wider text-amber-700 dark:text-amber-300">
                  Weekend
                </span>
              )}
              <span className="ml-auto flex items-center gap-1 text-[9px] font-bold leading-none tracking-wider text-muted-foreground">
                <Clock className="size-2.5" />
                {DAY[date.getDay()]}, {date.getDate()} {MONTH[date.getMonth()]}
              </span>
            </div>

            <h3 className="line-clamp-2 text-[13px] font-extrabold leading-tight text-foreground transition group-hover/link:text-primary">
              {turf.name}
            </h3>

            {/* Full address under turf name on mobile */}
            <p className="text-[10px] leading-tight text-muted-foreground line-clamp-2">
              {turf.address}
            </p>

            {/* Map button — stops propagation so card click doesn't fire */}
            {turf.latitude && turf.longitude && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  window.open(`https://maps.google.com/?q=${turf.latitude},${turf.longitude}`, "_blank", "noopener,noreferrer");
                }}
                className="mt-1 inline-flex items-center gap-1 text-[9px] font-bold text-primary hover:underline"
              >
                <MapPin className="size-2.5" />
                <span>View in map</span>
              </button>
            )}
          </div>
        </div>

        {/* RIGHT — Header + Slots */}
        <div className="flex min-w-0 flex-col border-t border-border/50 lg:border-l lg:border-t-0">
          {/* Header — desktop only. On mobile the address and the date badge both
              live in the info block above. */}
          <div className="hidden lg:flex items-center justify-between gap-2 border-b border-border/40 px-4 py-2.5">
            {/* Address left */}
            <div className="shrink-0 flex items-center gap-1.5">
              <MapPin className="size-3 shrink-0 text-primary" />
              <p className="text-[13px] font-bold text-foreground leading-tight">{turf.address}</p>
              {turf.latitude && turf.longitude && (
                <a
                  href={`https://maps.google.com/?q=${turf.latitude},${turf.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 flex items-center gap-1 text-[13px] font-bold text-foreground hover:text-primary hover:underline"
                  aria-label="Open in Google Maps"
                >
                  <MapPinIcon className="size-3" />
                  <span className="hidden sm:inline">View in map</span>
                </a>
              )}
            </div>

            {/* Full date at right */}
            <div className="shrink-0 flex items-center gap-1.5">
              <p className="text-[13px] font-bold tabular-nums text-foreground">
                {DAY_FULL[date.getDay()]}, {date.getDate()} {MONTH_FULL[date.getMonth()]}
              </p>
            </div>
          </div>

            {/* Slot carousel */}
            <div className="relative flex min-w-0 flex-1 flex-col">
              <div
                ref={slotsScrollRef}
                onScroll={syncEdges}
                className="no-scrollbar flex snap-x snap-proximity items-stretch gap-1.5 overflow-x-auto scroll-smooth px-3.5 py-2 lg:gap-2 lg:px-6 lg:py-3"
              >
                {slots.map((s, idx) => {
                const open = isOpenSlot(s);
                const status = slotStatusOf(s);
                const picked = cart.some((c) => c.id === s.id);
                const tod = timeOfDay(s.startMinute);
                const tone = TONE_STYLES[tod.tone];

                return (
                  <button
                    key={s.id}
                    disabled={!open}
                    aria-label={`${timeLabel(s.startMinute)} to ${timeLabel(s.endMinute)}: ${status.label}${picked ? ", selected" : ""}, ৳${formatPrice(s.price)}`}
                    onClick={() => {
                      if (open && onSelect) {
                        onSelect({
                          id: s.id,
                          startMinute: s.startMinute,
                          endMinute: s.endMinute,
                          price: Number(s.price),
                          turfId: turf.id,
                          turfName: turf.name,
                          date: ymd(date),
                        });
                      } else if (!picked) {
                        toggle({
                          id: s.id,
                          startMinute: s.startMinute,
                          endMinute: s.endMinute,
                          price: Number(s.price),
                          turfId: turf.id,
                          turfName: turf.name,
                          date: ymd(date),
                        });
                      }
                    }}
                    aria-pressed={picked}
                    style={{ animationDelay: `${idx * 30}ms` }}
                    className={`group/slot relative flex min-h-[62px] w-[96px] shrink-0 snap-start flex-col justify-between gap-0.5 overflow-hidden rounded-[5px] border p-1.5 text-left transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 active:scale-[0.97] lg:min-h-0 lg:w-[124px] lg:gap-2 lg:rounded-md lg:p-2.5 ${!open
                        ? "cursor-not-allowed border-border/30 bg-muted/20 opacity-60"
                        : picked
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border/70 bg-card hover:-translate-y-1 hover:border-primary/50"
                      }`}
                  >
                    {/* Picked check */}
                    {picked && (
                      <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm animate-in zoom-in-50 lg:right-2 lg:top-2 lg:size-5">
                        <Check
                          className="size-2.5 text-primary-foreground lg:size-3"
                          strokeWidth={3}
                        />
                      </span>
                    )}

                    {/* Time-of-day (🌙 Night for 12AM–6AM) */}
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] leading-none lg:text-[11px]">{tod.icon}</span>
                      <span
                        className={`text-[9px] font-bold uppercase tracking-wider lg:text-[9px] ${picked ? "text-primary-foreground/80" : tone.text
                          }`}
                      >
                        {tod.label}
                      </span>
                    </div>

                    {/* Start → End — struck through when the slot is not bookable */}
                    <div
                      className={`leading-tight ${open
                          ? ""
                          : "text-muted-foreground/70 decoration-muted-foreground/40 line-through"
                        }`}
                    >
                      <p
                        className={`text-[10px] font-extrabold tabular-nums lg:text-[12px] ${picked
                            ? "text-primary-foreground"
                            : open
                              ? "text-foreground"
                              : "text-muted-foreground"
                          }`}
                      >
                        {timeLabel(s.startMinute)}
                      </p>
                      <p
                        className={`text-[8px] font-bold tabular-nums lg:text-[10px] ${picked ? "text-primary-foreground/70" : "text-muted-foreground"
                          }`}
                      >
                        → {timeLabel(s.endMinute)}
                      </p>
                    </div>

                    {/* Availability — plain label + dot, no pill. Peak sits beside the price. */}
                    <div className="flex items-end justify-between gap-1">
                      <div className="min-w-0">
                        <span
                          className={`inline-flex w-fit max-w-full items-center gap-1 whitespace-nowrap text-[9px] font-bold uppercase leading-none tracking-wide lg:text-[10px] ${picked ? "text-primary-foreground/80" : status.text
                            }`}
                        >
                          <span
                            aria-hidden="true"
                            className="size-1.5 shrink-0 rounded-full bg-current"
                          />
                          {status.label}
                        </span>

                        <p
                          className={`mt-0.5 flex items-baseline gap-0.5 text-[11px] font-[950] tabular-nums lg:text-[13px] ${picked
                              ? "text-primary-foreground"
                              : open
                                ? "text-primary"
                                : "text-muted-foreground"
                            }`}
                        >
                          <span className="text-[13px] font-[950] leading-none lg:text-[16px]">
                            ৳
                          </span>
                          {formatPrice(s.price)}
                        </p>
                      </div>

                      {/* Peak keeps its time-of-day tone, and switches to the picked foreground once
                          the slot is selected */}
                      {open && s.isPeakTime && (
                        <span
                          className={`flex shrink-0 items-center gap-0.5 text-[8px] font-semibold lg:text-[10px] ${picked ? "text-primary-foreground/80" : tone.text
                            }`}
                        >
                          <Flame className="size-2.5 lg:size-3" />
                          Peak
                        </span>
                      )}

                      {!open && (
                        <div className="flex size-4 shrink-0 items-center justify-center rounded-full bg-muted/60 lg:size-6">
                          <Lock className="size-2 text-muted-foreground/70 lg:size-3" />
                        </div>
                      )}
                    </div>

                    {/* Hover shine */}
                    {open && !picked && (
                      <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover/slot:translate-x-full" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Floating chevrons over slots row */}
            <div className="absolute inset-y-0 left-0 z-40 flex items-center justify-between w-full px-2 lg:px-4 pointer-events-none">
              {edges.left && (
                <button
                  type="button"
                  aria-label="Scroll slots left"
                  onClick={() => scrollSlots("left")}
                  className="pointer-events-auto z-40 flex size-8 items-center justify-center rounded-full border border-border/60 bg-neutral-400 dark:bg-neutral-600 text-muted-foreground dark:text-foreground shadow-sm cursor-pointer transition-all hover:border-neutral-500/50 dark:hover:border-neutral-400 hover:bg-neutral-500 dark:hover:bg-neutral-700 hover:text-foreground active:scale-95"
                >
                  <ChevronLeft className="size-4" />
                </button>
              )}
              {edges.right && (
                <button
                  type="button"
                  aria-label="Scroll slots right"
                  onClick={() => scrollSlots("right")}
                  className="pointer-events-auto z-40 flex size-8 items-center justify-center rounded-full border border-border/60 bg-neutral-400 dark:bg-neutral-600 text-muted-foreground dark:text-foreground shadow-sm cursor-pointer transition-all hover:border-neutral-500/50 dark:hover:border-neutral-400 hover:bg-neutral-500 dark:hover:bg-neutral-700 hover:text-foreground active:scale-95"
                >
                  <ChevronRight className="size-4" />
                </button>
              )}
            </div>
            <div
              aria-hidden
              className={`pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-card to-transparent transition-opacity duration-200 lg:hidden ${edges.left ? "opacity-100" : "opacity-0"
                }`}
            />
            <div
              aria-hidden
              className={`pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-card to-transparent transition-opacity duration-200 lg:hidden ${edges.right ? "opacity-100" : "opacity-0"
                }`}
            />
          </div>
        </div>
      </div>
    </article>
  );
}
