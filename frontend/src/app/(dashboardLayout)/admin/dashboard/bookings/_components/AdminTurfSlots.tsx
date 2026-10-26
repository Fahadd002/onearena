"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Flame, Lock, ChevronLeft, ChevronRight } from "lucide-react";
import { isSameDay, inBucket, isPastSlot, timeLabel, timeOfDay, isSlotBookable, slotStatusKey, ymd, type Bucket, type TimeTone } from "@/lib/slotsUtils";
import { formatPrice } from "@/lib/slotsUtils";
import { useIsMounted } from "@/components/turfs/useIsToday";
import type { Turf, TurfSlot } from "@/types/turf.type";

interface CartSlot {
  id: string;
  turfId: string;
  turfName: string;
  startMinute: number;
  endMinute: number;
  price: number;
  date: string;
}

interface Props {
  turf: Turf;
  date: Date;
  bucket: Bucket;
  cart: CartSlot[];
  toggle: (slot: CartSlot) => void;
}

const TONE_STYLES: Record<TimeTone, { text: string }> = {
  morning: { text: "text-amber-600 dark:text-amber-400" },
  noon: { text: "text-sky-600 dark:text-sky-400" },
  afternoon: { text: "text-orange-600 dark:text-orange-400" },
  evening: { text: "text-violet-600 dark:text-violet-400" },
  night: { text: "text-indigo-600 dark:text-indigo-400" },
};

const SLOT_STATUS: Record<string, { label: string; text: string }> = {
  AVAILABLE: { label: "Available", text: "text-foreground dark:text-success-400" },
  WAITLIST: { label: "Waitlist", text: "text-amber-600 dark:text-amber-400" },
  BOOKED: { label: "Booked", text: "text-destructive" },
};

const UNKNOWN_STATUS = { label: "Unavailable", text: "text-muted-foreground" };
const slotStatusOf = (s: TurfSlot) => SLOT_STATUS[slotStatusKey(s)] ?? UNKNOWN_STATUS;
const isOpenSlot = isSlotBookable;

export function visibleSlotsOf(turf: Turf, date: Date, bucket: Bucket, mounted: boolean) {
  return (turf.slots ?? [])
    .filter(
      (s) =>
        s.slotDate &&
        isSameDay(s.slotDate, date) &&
        s.active !== false &&
        inBucket(s.startMinute, bucket) &&
        (!mounted || !isPastSlot(date, s.startMinute)),
    )
    .sort((a, b) => a.startMinute - b.startMinute);
}

export function AdminTurfSlots({ turf, date, bucket, cart, toggle }: Props) {
  const slotsScrollRef = useRef<HTMLDivElement>(null);
  const mounted = useIsMounted();
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

  const scrollSlots = (dir: "left" | "right") =>
    slotsScrollRef.current?.scrollBy({ left: dir === "left" ? -240 : 240, behavior: "smooth" });

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-3 py-2">
        <p className="text-sm font-semibold text-foreground">{turf.name}</p>
      </div>
      <div className="relative">
        <div ref={slotsScrollRef} onScroll={syncEdges} className="no-scrollbar flex snap-x snap-proximity items-stretch gap-1.5 overflow-x-auto scroll-smooth px-3 py-2">
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
                onClick={() => {
                  if (!open) return;
                  toggle({ id: s.id, startMinute: s.startMinute, endMinute: s.endMinute, price: Number(s.price), turfId: turf.id, turfName: turf.name, date: ymd(date) });
                }}
                aria-pressed={picked}
                style={{ animationDelay: `${idx * 30}ms` }}
                className={`relative flex min-h-[58px] w-[92px] shrink-0 snap-start flex-col justify-between gap-0.5 overflow-hidden rounded-md border p-1.5 text-left transition-all duration-200 active:scale-[0.97] ${!open ? "cursor-not-allowed border-border/30 bg-muted/20 opacity-60" : picked ? "border-primary bg-primary text-primary-foreground" : "border-border/70 bg-card hover:-translate-y-1 hover:border-primary/50"}`}
              >
                {picked && (
                  <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                    <Check className="size-2.5 text-primary-foreground" strokeWidth={3} />
                  </span>
                )}
                <div className="flex items-center gap-1">
                  <span className="text-[10px] leading-none">{tod.icon}</span>
                  <span className={`text-[9px] font-bold uppercase tracking-wider ${picked ? "text-primary-foreground/80" : tone.text}`}>{tod.label}</span>
                </div>
                <div className={`leading-tight ${open ? "" : "text-muted-foreground/70 decoration-muted-foreground/40 line-through"}`}>
                  <p className={`text-[10px] font-extrabold tabular-nums ${picked ? "text-primary-foreground" : open ? "text-foreground" : "text-muted-foreground"}`}>{timeLabel(s.startMinute)}</p>
                  <p className={`text-[8px] font-bold tabular-nums ${picked ? "text-primary-foreground/70" : "text-muted-foreground"}`}>→ {timeLabel(s.endMinute)}</p>
                </div>
                <div className="flex items-end justify-between gap-1">
                  <div className="min-w-0">
                    <span className={`inline-flex w-fit max-w-full items-center gap-1 whitespace-nowrap text-[9px] font-bold uppercase leading-none tracking-wide ${picked ? "text-primary-foreground/80" : status.text}`}>
                      <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-current" />
                      {status.label}
                    </span>
                    <p className={`mt-0.5 flex items-baseline gap-0.5 text-[11px] font-[950] tabular-nums ${picked ? "text-primary-foreground" : open ? "text-primary" : "text-muted-foreground"}`}>
                      <span className="text-[13px] font-[950] leading-none">৳</span>
                      {formatPrice(s.price)}
                    </p>
                  </div>
                  {open && s.isPeakTime && (
                    <span className={`flex shrink-0 items-center gap-0.5 text-[8px] font-semibold ${picked ? "text-primary-foreground/80" : tone.text}`}>
                      <Flame className="size-2.5" />
                      Peak
                    </span>
                  )}
                  {!open && (
                    <div className="flex size-4 shrink-0 items-center justify-center rounded-full bg-muted/60">
                      <Lock className="size-2 text-muted-foreground/70" />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
        <div className="absolute inset-y-0 left-0 z-40 flex items-center justify-between w-full px-2 pointer-events-none">
          {edges.left && (
            <button type="button" aria-label="Scroll slots left" onClick={() => scrollSlots("left")} className="pointer-events-auto z-40 flex size-7 items-center justify-center rounded-full border border-border/60 bg-card shadow-sm">
              <ChevronLeft className="size-3.5" />
            </button>
          )}
          {edges.right && (
            <button type="button" aria-label="Scroll slots right" onClick={() => scrollSlots("right")} className="pointer-events-auto z-40 flex size-7 items-center justify-center rounded-full border border-border/60 bg-card shadow-sm">
              <ChevronRight className="size-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
