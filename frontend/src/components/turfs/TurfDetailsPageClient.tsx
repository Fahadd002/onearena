"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flame,
  Lock,
  MapPin,
  MessageSquare,
  RotateCcw,
  Star,
} from "lucide-react";
import { FacilityIcon } from "@/components/premium/facilityIcons";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchTurfById, fetchTurfSlots } from "./api";
import { readPendingCart, savePendingCart } from "./pendingCart";
import { getFileUrl } from "@/lib/utils";
import {
  DAY,
  MONTH,
  timeLabel,
  timeOfDay,
  inBucket,
  isPastSlot,
  ymd,
  isSlotBookable,
  slotStatusKey,
  formatPrice,
  type Bucket,
  type TimeTone,
} from "@/lib/slotsUtils";
import type { Turf, TurfFacility, TurfSlot } from "@/types/turf.type";

import { DateStrip } from "./DateStrip";
import { DateMonthFilter } from "./DateMonthFilter";
import { TimeBuckets } from "./TimeBuckets";
import { CartBar } from "./CartBar";
import { CheckoutDrawer } from "./CheckoutDrawer";
import { useIsToday } from "./useIsToday";
import { focusOf, rangeOf, resolveDateOption, startOfISODate, startOfToday } from "./dateRanges";
import type { CartSlot } from "./types";

/* ═══════════ Helpers ═══════════ */
/* Gallery images slide in from the side the user moved towards. */
const gallerySlide = {
  enter: (direction: number) => ({ opacity: 0, x: direction * 72 }),
  center: { opacity: 1, x: 0 },
  exit: (direction: number) => ({ opacity: 0, x: direction * -72 }),
};

/* The server action returns the raw API payload, so image paths are relative
   until they are made absolute for the browser. */
const withAbsoluteImages = (turf: Turf): Turf => turf.images ? { ...turf, images: turf.images.map((img) => ({ ...img, url: getFileUrl(img.url) ?? img.url })) }: turf;

const TONE: Record<TimeTone, string> = {
  morning: "text-amber-600 dark:text-amber-400",
  noon: "text-sky-600 dark:text-sky-400",
  afternoon: "text-orange-600 dark:text-orange-400",
  evening: "text-violet-600 dark:text-violet-400",
  night: "text-indigo-600 dark:text-indigo-400",
};

/**
 * A slot is bookable when the endpoint reports it AVAILABLE. The turf list
 * payload carries `slotStatus`; the public slots endpoint aliases it as `status`.
 */
const slotOpen = isSlotBookable;

/* Slot availability, straight from the backend `SlotSatus` enum.
   `text` colours the plain status label and its dot. */
const SLOT_STATUS: Record<string, { label: string; text: string }> = {
  AVAILABLE: { label: "Available", text: "text-success-600 dark:text-success-400" },
  WAITLIST: { label: "Waitlist", text: "text-amber-600 dark:text-amber-400" },
  BOOKED: { label: "Booked", text: "text-destructive" },
};

/* A slot with no status at all must never read as "Available". */
const UNKNOWN_STATUS = { label: "Unavailable", text: "text-muted-foreground" };

const slotStatusOf = (s: TurfSlot) => SLOT_STATUS[slotStatusKey(s)] ?? UNKNOWN_STATUS;

/* ═══════════════════════════════════════════════════════════ */
export default function TurfDetailsPageClient({
  initialTurf,
  todayISO,
}: {
  initialTurf?: Turf | null;
  /** Server's "today" as YYYY-MM-DD, so SSR and the client agree. */
  todayISO: string;
}) {
  const { turfId } = useParams<{ turfId: string }>();

  const [turf, setTurf] = useState<Turf | null>(null);
  const [slotsByDate, setSlotsByDate] = useState<Record<string, TurfSlot[]>>({});
  const [turfLoading, setTurfLoading] = useState(!initialTurf);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [turfError, setTurfError] = useState<string | null>(null);
  const [slotError, setSlotError] = useState<string | null>(null);
  const [date, setDate] = useState(() => startOfISODate(todayISO));
  const [dateOptionKey, setDateOptionKey] = useState("all");
  const selectedDate = ymd(date);

  const [today, setToday] = useState(() => startOfISODate(todayISO));

  /* The strip shows exactly the days the selected tab covers: the full 90-day
     window on "All", or just that month's remaining days on a month tab. */
  const activeOption = useMemo(
    () => resolveDateOption(dateOptionKey, today),
    [dateOptionKey, today],
  );
  const range = useMemo(() => rangeOf(activeOption), [activeOption]);

  useEffect(() => {
    const now = new Date();
    const msToMidnight =
      new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime();
    const timer = setTimeout(() => {
      setToday(startOfToday());
      setDateOptionKey("all");
    }, msToMidnight + 1000);
    return () => clearTimeout(timer);
  }, [today]);

  const [bucket, setBucket] = useState<Bucket>("all");
  const [cart, setCart] = useState<CartSlot[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  /* Slots picked before the login round-trip. Restored in an effect, never in a
     state initialiser: the server has no sessionStorage, so seeding it there
     would desync the first client render (hydration mismatch). */
  const restored = useRef(false);
  useEffect(() => {
    const pending = readPendingCart();
    if (!pending) return;
    /* Only this turf's slots come back — a selection made on the list page
       belongs to that page's drawer. */
    const mine = pending.slots.filter((s) => s.turfId === turfId);
    restored.current = true;
    if (mine.length === 0) return;
    setCart(mine);
    setDate(startOfISODate(pending.date));
    if (pending.checkout) setDrawerOpen(true);
  }, [turfId]);

  /* Mirror the selection so a redirect to /login (or any full navigation) cannot
     drop it. `drawerOpen` is saved too: the user left mid-checkout. Held back
     until the restore above ran, so this page never wipes another page's cart. */
  useEffect(() => {
    if (!restored.current) return;
    savePendingCart(cart, selectedDate, drawerOpen);
  }, [cart, selectedDate, drawerOpen]);

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  /* 1 = moving forward through the gallery, -1 = going back; drives the
     left/right slide of the main image. */
  const [imageDirection, setImageDirection] = useState(1);

  const slotsScrollRef = useRef<HTMLDivElement>(null);

  /* ── Load turf ──
     The server already rendered `initialTurf`, so this only runs for client-side
     navigation to another turf id. */
  useEffect(() => {
    if (!turfId) return;
    if (initialTurf && initialTurf.id === turfId) {
      setTurf(withAbsoluteImages(initialTurf));
      setTurfLoading(false);
      return;
    }

    setTurfLoading(true);
    fetchTurfById(turfId)
      .then((data) => {
        if (!data) throw new Error("not found");
        setTurf(withAbsoluteImages(data));
      })
      .catch(() => {
        setTurf(null);
        setTurfError("This turf could not be loaded.");
      })
      .finally(() => setTurfLoading(false));
  }, [turfId, initialTurf]);

  /* Fetch slots for the selected date. Keyed on selectedDate so changing the
     date actually refetches (the old effect depended on `windowStart`, which
     was only ever set once on mount, so the list never updated). */
  useEffect(() => {
    if (!turfId) return;
    let cancelled = false;
    setSlotsLoading(true);
    setSlotError(null);
    fetchTurfSlots(turfId, selectedDate)
      .then((slots) => {
        if (cancelled) return;
        setSlotsByDate((prev) => ({ ...prev, [selectedDate]: slots }));
      })
      .catch(() => {
        if (!cancelled) {
          setSlotError("Availability is temporarily unavailable.");
        }
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [turfId, selectedDate]);

  /* ── Slots for currently selected date ── */
  const slotsForDate = useMemo(() => slotsByDate[selectedDate] ?? [], [slotsByDate, selectedDate]);

  const visibleSlots = useMemo(
    () =>
      slotsForDate
        // `active` is not part of this endpoint's payload - the backend already
        // filters inactive slots out, so filtering on it here hid every slot.
        .filter(
          (s) =>
            inBucket(s.startMinute, bucket) &&
            // never show slots whose start time has already passed today
            !isPastSlot(date, s.startMinute),
        )
        .sort((a, b) => a.startMinute - b.startMinute),
    [slotsForDate, bucket, date],
  );

  const averageRating = useMemo(
    () =>
      !turf?.reviews?.length
        ? 0
        : turf.reviews.reduce((sum, r) => sum + r.rating, 0) / turf.reviews.length,
    [turf?.reviews],
  );

  const isToday = useIsToday(date);

  const hasActiveFilters = bucket !== "all" || !isToday || dateOptionKey !== "all";

  /* `date` is already a local-midnight Date, so local getters are correct here
     (the previous UTC-based helpers rendered the wrong weekday/day/month). */
  const dateAsDate = date;

  /* ── Cart (same shape/behaviour as the home turf list) ── */
  const toggleSlot = (slot: CartSlot) =>
    setCart((c) =>
      c.some((x) => x.id === slot.id) ? c.filter((x) => x.id !== slot.id) : [...c, slot],
    );

  const handleSlotSelect = (s: TurfSlot) =>
    toggleSlot({
      id: s.id,
      startMinute: s.startMinute,
      endMinute: s.endMinute,
      price: Number(s.price),
      turfId,
      turfName: turf?.name ?? "Turf",
      date: selectedDate,
    });

  const handleCartChange = (newCart: CartSlot[]) => {
    setCart(newCart);
    if (newCart.length === 0) setDrawerOpen(false);
  };

  const handleDateChange = (d: Date) => {
    const next = new Date(d);
    next.setHours(0, 0, 0, 0);
    setDate(next);
  };

  const scrollSlots = (dir: "left" | "right") =>
    slotsScrollRef.current?.scrollBy({
      left: dir === "left" ? -220 : 220,
      behavior: "smooth",
    });

  const selectDateOption = (key: string) => {
    setDateOptionKey(key);
    handleDateChange(focusOf(resolveDateOption(key, today)));
  };

  const resetAll = () => {
    setBucket("all");
    setDateOptionKey("all");
    setDate(startOfToday());
  };

  /* ── Loading / error ── */
  if (turfLoading) return <TurfDetailsSkeleton />;
  if (!turf) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-8 text-center">
          <p className="text-destructive">{turfError ?? "Turf not found."}</p>
          <Link
            href="/#turfs"
            className="mt-4 inline-block font-medium text-primary hover:underline"
          >
            Back to turfs
          </Link>
        </div>
      </main>
    );
  }

  const images = turf.images?.length ? turf.images    : [{ url: "/placeholder.svg", id: "placeholder" }];

  /* Moves through the gallery, wrapping at both ends and sliding in the
     direction of travel. */
  const goToImage = (next: number) => {
    const count = images.length;
    const target = (next + count) % count;
    setImageDirection(target > activeImageIndex ? 1 : -1);
    setActiveImageIndex(target);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-muted/30 to-background pb-24 pt-20">
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
        {/* ═══════════ Gallery + Info ═══════════ */}
        <div className="mb-4 rounded-3xl border border-border/60 bg-card p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
            <div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-muted md:col-span-8">
              <AnimatePresence mode="wait" custom={imageDirection} initial={false}>
                <motion.img
                  key={activeImageIndex}
                  src={images[activeImageIndex]?.url}
                  alt={`${turf.name} ${activeImageIndex + 1}`}
                  custom={imageDirection}
                  variants={gallerySlide}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-0 size-full object-cover"
                />
              </AnimatePresence>

              {/* Arrows let the gallery be driven left/right without the thumbs */}
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="Previous image"
                    onClick={() => goToImage(activeImageIndex - 1)}
                    className="absolute left-3 top-1/2 z-20 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 text-foreground backdrop-blur-md transition hover:bg-background active:scale-95"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next image"
                    onClick={() => goToImage(activeImageIndex + 1)}
                    className="absolute right-3 top-1/2 z-20 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 text-foreground backdrop-blur-md transition hover:bg-background active:scale-95"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </>
              )}

              <div className="absolute bottom-3 left-3 z-20 rounded-md bg-background/80 px-2 py-1 text-xs font-semibold backdrop-blur-md">
                {activeImageIndex + 1} / {images.length}
              </div>
            </div>

            <div className="grid max-h-[445px] grid-cols-4 gap-2 overflow-y-auto pr-1 md:col-span-4 md:grid-cols-1">
              {images.map((img, idx) => (
                <motion.button
                  key={img.id || idx}
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => goToImage(idx)}
                  className={`relative aspect-[4/3] overflow-hidden rounded-lg border-2 transition-all ${
                    activeImageIndex === idx
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                >
                  <img src={img.url} alt={`Thumb ${idx + 1}`} className="size-full object-cover" />
                </motion.button>
              ))}
            </div>
          </div>

          <div className="mt-5 border-t border-border pt-4">
            <h1 className="text-2xl font-bold">{turf.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-xs font-semibold text-muted-foreground">
              <span className="capitalize">{turf.category?.name || "Football"}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MapPin className="size-3.5" />
                {turf.address}
                {turf.area ? `, ${turf.area}` : ""}
              </span>
            </div>
            {turf.description && (
              <p className="mt-3 text-xs leading-relaxed text-foreground/80">{turf.description}</p>
            )}
            {turf.facilities?.length ? (
              <div className="mt-4 flex flex-wrap gap-5 border-t border-border pt-3">
                {turf.facilities.map((item: TurfFacility) => (
                  <div key={item.facility.id} className="flex items-center gap-1.5">
                    <FacilityIcon name={item.facility.name} className="size-4 text-primary" />
                    <span className="text-xs font-semibold">{item.facility.name}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {/* ═══════════ Sticky Filter Deck — 50/50 ═══════════ */}
        <div className="sticky top-16 z-[55] mb-3 rounded-2xl border border-border/60 bg-card/60 p-2 backdrop-blur-xl">
          <div className="grid grid-cols-1 items-start gap-2 lg:grid-cols-2">
            {/* Left: date presets + date strip */}
            <div className="flex min-w-0 flex-col gap-1.5">
              <DateMonthFilter
                today={today}
                optionKey={dateOptionKey}
                onOption={selectDateOption}
              />
              <DateStrip
                range={range}
                value={dateAsDate}
                onChange={handleDateChange}
                today={today}
                className="min-w-0"
              />
            </div>

            {/* Right: time buckets */}
            <div className="flex min-w-0 flex-col gap-1.5 lg:border-l lg:border-border/50 lg:pl-3">
              <TimeBuckets value={bucket} onChange={setBucket} />
              {hasActiveFilters && (
                <button
                  onClick={resetAll}
                  className="group inline-flex h-7 min-w-[4.25rem] shrink-0 items-center justify-center gap-1 self-start rounded-full border border-border/60 bg-card px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground transition-colors duration-200 hover:border-neutral-400/50 hover:bg-neutral-500/10 hover:text-foreground"
                >
                  <RotateCcw className="size-3 transition-transform group-hover:-rotate-45" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ═══════════ Slot Carousel ═══════════ */}
        <section className="rounded-3xl border border-border/60 bg-card">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 px-3 py-2.5 lg:px-4">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <MapPin className="size-3.5 shrink-0 text-primary" />
              <p className="truncate text-xs font-bold">{turf.address}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1.5">
                <Clock className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="text-xs font-bold tabular-nums">
                  {DAY[dateAsDate.getDay()]}, {dateAsDate.getDate()} {MONTH[dateAsDate.getMonth()]}
                </span>
              </div>
              <button
                type="button"
                aria-label="Scroll slots left"
                onClick={() => scrollSlots("left")}
                className="flex size-7 items-center justify-center rounded-lg border border-border/60 bg-background text-muted-foreground transition-all hover:-translate-x-0.5 hover:border-neutral-400/50 hover:bg-neutral-500/10 hover:text-foreground active:scale-95"
              >
                <ChevronLeft className="size-3.5" />
              </button>
              <button
                type="button"
                aria-label="Scroll slots right"
                onClick={() => scrollSlots("right")}
                className="flex size-7 items-center justify-center rounded-lg border border-border/60 bg-background text-muted-foreground transition-all hover:translate-x-0.5 hover:border-neutral-400/50 hover:bg-neutral-500/10 hover:text-foreground active:scale-95"
              >
                <ChevronRight className="size-3.5" />
              </button>
            </div>
          </div>

          <div
            ref={slotsScrollRef}
            className="no-scrollbar flex snap-x snap-proximity items-stretch gap-1.5 overflow-x-auto scroll-smooth px-3.5 py-2 lg:gap-2 lg:px-6 lg:py-3"
          >
            {slotsLoading ? (
              <SlotSkeleton />
            ) : slotError ? (
              <div className="w-full py-8 text-center text-xs font-medium text-muted-foreground">
                {slotError}
              </div>
            ) : !visibleSlots.length ? (
              <div className="w-full py-8 text-center text-xs font-medium text-muted-foreground">
                No slots available for this day.
              </div>
            ) : (
              visibleSlots.map((s, idx) => {
                const open = slotOpen(s);
                const status = slotStatusOf(s);
                const picked = cart.some((c) => c.id === s.id);
                const tod = timeOfDay(s.startMinute);
                const price = Number(s.price);

                return (
                  <button
                    key={s.id}
                    disabled={!open}
                    aria-label={`${timeLabel(s.startMinute)} to ${timeLabel(s.endMinute)}: ${status.label}${picked ? ", selected" : ""}, ৳${formatPrice(price)}`}
                    onClick={() => open && handleSlotSelect(s)}
                    aria-pressed={picked}
                    style={{ animationDelay: `${idx * 30}ms` }}
                    className={`group/slot relative flex min-h-[62px] w-[96px] shrink-0 snap-start flex-col justify-between gap-0.5 overflow-hidden rounded-[5px] border p-1.5 text-left transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 active:scale-[0.97] lg:min-h-0 lg:w-[124px] lg:gap-2 lg:rounded-md lg:p-2.5 ${
                      !open
                        ? "cursor-not-allowed border-border/30 bg-muted/20 opacity-60"
                        : picked
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border/70 bg-card hover:-translate-y-1 hover:border-primary/50"
                    }`}
                  >
                    {picked && (
                      <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm animate-in zoom-in-50 lg:right-2 lg:top-2 lg:size-5">
                        <Check
                          className="size-2.5 text-primary-foreground lg:size-3"
                          strokeWidth={3}
                        />
                      </span>
                    )}

                    <div className="flex items-center gap-1">
                      <span className="text-[10px] leading-none lg:text-[11px]">{tod.icon}</span>
                      <span
                        className={`text-[9px] font-bold uppercase tracking-wider lg:text-[9px] ${
                          picked ? "text-primary-foreground/80" : TONE[tod.tone]
                        }`}
                      >
                        {tod.label}
                      </span>
                    </div>

                    {/* Start → End — struck through when the slot is not bookable */}
                    <div
                      className={`leading-tight ${
                        open
                          ? ""
                          : "text-muted-foreground/70 decoration-muted-foreground/40 line-through"
                      }`}
                    >
                      <p
                        className={`text-[10px] font-extrabold tabular-nums lg:text-[12px] ${
                          picked
                            ? "text-primary-foreground"
                            : open
                              ? "text-foreground"
                              : "text-muted-foreground"
                        }`}
                      >
                        {timeLabel(s.startMinute)}
                      </p>
                      <p
                        className={`text-[8px] font-bold tabular-nums lg:text-[10px] ${
                          picked ? "text-primary-foreground/70" : "text-muted-foreground"
                        }`}
                      >
                        → {timeLabel(s.endMinute)}
                      </p>
                    </div>

                    {/* Availability — plain label + dot, no pill. Peak sits beside the price. */}
                    <div className="flex items-end justify-between gap-1">
                      <div className="min-w-0">
                        <span
                          className={`inline-flex w-fit max-w-full items-center gap-1 whitespace-nowrap text-[9px] font-bold uppercase leading-none tracking-wide lg:text-[10px] ${
                            picked ? "text-primary-foreground/80" : status.text
                          }`}
                        >
                          <span
                            aria-hidden="true"
                            className="size-1.5 shrink-0 rounded-full bg-current"
                          />
                          {picked ? "Selected" : status.label}
                        </span>

                        <p
                          className={`mt-0.5 flex items-baseline gap-0.5 text-[11px] font-[950] tabular-nums lg:text-[13px] ${
                            picked
                              ? "text-primary-foreground"
                              : open
                                ? "text-primary"
                                : "text-muted-foreground"
                          }`}
                        >
                          <span className="text-[13px] font-[950] leading-none lg:text-[16px]">
                            ৳
                          </span>
                          {formatPrice(price)}
                        </p>
                      </div>

                      {/* Peak keeps its time-of-day tone, and switches to the picked foreground once
                          the slot is selected */}
                      {open && s.isPeakTime && (
                        <span
                          className={`flex shrink-0 items-center gap-0.5 text-[8px] font-semibold lg:text-[10px] ${
                            picked ? "text-primary-foreground/80" : TONE[tod.tone]
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

                    {open && !picked && (
                      <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover/slot:translate-x-full" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </section>

        {/* ═══════════ Rating & Reviews ═══════════ */}
        <section className="mt-3 rounded-xl border border-border/60 bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-lg font-extrabold text-amber-500">
                {averageRating ? averageRating.toFixed(1) : "0.0"}
              </div>
              <div>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`size-4 ${
                        i < Math.round(averageRating)
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted-foreground/30"
                      }`}
                    />
                  ))}
                </div>
                <p className="mt-1 text-xs font-semibold">
                  {turf.reviews?.length
                    ? `${turf.reviews.length} Verified Reviews`
                    : "No reviews yet"}
                </p>
              </div>
            </div>
            {turf.reviews?.length ? (
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <MessageSquare className="size-4 text-primary" />
                <span>Highest rated for turf quality</span>
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <CartBar count={cart.length} onCheckout={() => setDrawerOpen(true)} />

      <CheckoutDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        cart={cart}
        date={selectedDate}
        onCartChange={handleCartChange}
      />
    </main>
  );
}

/* ═══════════ Skeletons — same layout, sizes and radius as this page ═══════════ */
function SlotSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-[62px] w-[96px] shrink-0 rounded-[5px] lg:h-[104px] lg:w-[124px] lg:rounded-md"
        />
      ))}
    </>
  );
}

/** Mirrors the gallery + info card, the filter deck and the slot section. */
function TurfDetailsSkeleton() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-muted/30 to-background pb-24 pt-20">
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
        {/* Gallery + info */}
        <div className="mb-4 rounded-3xl border border-border/60 bg-card p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
            <Skeleton className="relative aspect-[16/9] overflow-hidden rounded-2xl md:col-span-8" />

            <div className="grid max-h-[445px] grid-cols-4 gap-2 overflow-hidden md:col-span-4 md:grid-cols-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[4/3] rounded-lg" />
              ))}
            </div>
          </div>

          <div className="mt-5 border-t border-border pt-4">
            <Skeleton className="h-7 w-56 rounded-md" />

            <div className="mt-2 flex items-center gap-4">
              <Skeleton className="h-3 w-20 rounded" />
              <Skeleton className="h-3 w-64 max-w-full rounded" />
            </div>

            <Skeleton className="mt-3 h-3 w-full max-w-xl rounded" />
            <Skeleton className="mt-2 h-3 w-4/5 max-w-lg rounded" />

            <div className="mt-4 flex flex-wrap gap-5 border-t border-border pt-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-3 w-20 rounded" />
              ))}
            </div>
          </div>
        </div>

        {/* Filter deck */}
        <div className="sticky top-16 z-[55] mb-3 rounded-2xl border border-border/60 bg-card/60 p-2">
          <div className="grid grid-cols-1 items-start gap-2 lg:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <div className="flex gap-1.5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-7 w-16 rounded-full" />
                ))}
              </div>
              <Skeleton className="h-16 w-full rounded-lg" />
            </div>

            <div className="flex flex-col gap-1.5 lg:border-l lg:border-border/50 lg:pl-3">
              <Skeleton className="h-9 w-full rounded-lg" />
              <div className="flex gap-1.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-7 w-14 rounded-full" />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Slot section */}
        <section className="rounded-3xl border border-border/60 bg-card">
          <div className="flex items-center justify-between gap-2 border-b border-border/40 px-3 py-2.5 lg:px-4">
            <Skeleton className="h-3 w-56 rounded" />
            <div className="flex shrink-0 items-center gap-1.5">
              <Skeleton className="h-3 w-24 rounded" />
              <Skeleton className="size-7 rounded-lg" />
              <Skeleton className="size-7 rounded-lg" />
            </div>
          </div>

          <div className="flex items-stretch gap-1.5 overflow-hidden px-3.5 py-2 lg:gap-2 lg:px-6 lg:py-3">
            <SlotSkeleton />
          </div>
        </section>
      </div>
    </main>
  );
}
