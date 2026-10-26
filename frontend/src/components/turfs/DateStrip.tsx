"use client";

import { DAY, MONTH, ymd } from "@/lib/slotsUtils";
import { WEEKEND_DAY, daysInRange, type DateRange } from "./dateRanges";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

interface Props {
  /** Days to offer. The parent derives this from the selected tab. */
  range: DateRange;
  /** Anchors the strip; also the day sent to the API. */
  value: Date;
  onChange: (d: Date) => void;
  today: Date;
  className?: string;
}

export function DateStrip({ range, value, onChange, today, className = "" }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  /* The strip is derived from the current day, so it must not be computed at
     module scope: the server (UTC) and the client (local) would produce
     different dates and React would report a hydration mismatch. */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const dates = useMemo(() => daysInRange(range), [range]);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [value, range]);

  const scroll = (dir: "left" | "right") =>
    scrollRef.current?.scrollBy({ left: dir === "left" ? -280 : 280, behavior: "smooth" });

  const isToday = (d: Date) => ymd(d) === ymd(today);

  // Hold back a same-height placeholder until mounted so the server and the
  // first client paint agree.
  if (!mounted) {
    return (
      <div aria-hidden className={`relative flex min-w-0 items-center gap-1 p-0.5 ${className}`}>
        <div className="size-7 shrink-0 rounded-lg bg-muted/40" />
        <div className="flex min-w-0 flex-1 gap-1 overflow-hidden px-0.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              style={{ animationDelay: `${i * 20}ms` }}
              className="h-[54px] min-w-[2.75rem] shrink-0 animate-pulse rounded-lg bg-muted/40"
            />
          ))}
        </div>
        <div className="size-7 shrink-0 rounded-lg bg-muted/40" />{" "}
      </div>
    );
  }

  return (
    <div className={`relative flex min-w-0 items-center gap-0.5 p-0.5 ${className}`}>
      <button
        onClick={() => scroll("left")}
        aria-label="Scroll dates left"
        className="flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-all hover:-translate-x-0.5 hover:bg-neutral-500/10 hover:text-foreground active:scale-95"
      >
        <ChevronLeft className="size-3.5" />
      </button>

      <div
        ref={scrollRef}
        className="no-scrollbar flex min-w-0 flex-1 gap-1 overflow-x-auto scroll-smooth px-0.5 py-0.5"
      >
        {dates.map((d, idx) => {
          const active = ymd(d) === ymd(value);
          const todayCell = isToday(d);
          // Friday is the weekend, so it always carries the weekend tint.
          const friday = d.getDay() === WEEKEND_DAY;
          const monthStart = d.getDate() === 1;

          return (
            <button
              key={ymd(d)}
              ref={active ? activeRef : undefined}
              onClick={() => onChange(d)}
              aria-pressed={active}
              aria-label={`${DAY[d.getDay()]} ${d.getDate()} ${MONTH[d.getMonth()]}${todayCell ? ", today" : ""}${friday ? ", weekend" : ""}`}
              style={{ animationDelay: `${Math.min(idx, 10) * 20}ms` }}
              className={`group relative flex min-w-[2.75rem] shrink-0 flex-col items-center justify-center -space-y-0.5 rounded-lg border py-1 transition-all duration-200 animate-in fade-in slide-in-from-bottom-1 ${active
                  ? "border-primary bg-primary text-primary-foreground"
                  : friday
                    ? "border-amber-400/40 bg-amber-400/5 text-foreground hover:-translate-y-0.5 hover:border-amber-400/80 hover:bg-amber-400/15"
                    : "border-border/60 bg-card/60 text-muted-foreground hover:-translate-y-0.5 hover:border-neutral-400/60 hover:bg-neutral-500/10 hover:text-foreground"
                }`}
            >
              {friday && !active && (
                <span className="absolute right-1 top-1 size-1 rounded-full bg-amber-400" />
              )}

              {todayCell && !active && (
                <span className="absolute left-1 top-1 size-1 rounded-full bg-primary" />
              )}

              <span
                className={`text-[8px] font-bold uppercase tracking-wider transition ${active
                    ? "text-primary-foreground/80"
                    : friday
                      ? "text-amber-600"
                      : "text-muted-foreground group-hover:text-foreground"
                  }`}
              >
                {DAY[d.getDay()]}
              </span>

              <span
                className={`text-[10px] sm:text-[12px] font-extrabold tabular-nums leading-tight transition ${active ? "text-primary-foreground" : "text-foreground"
                  }`}
              >
                {d.getDate()}
              </span>

              {/* Month on every cell, brightened when the month rolls over. */}
              <span
                className={`text-[8px] font-bold uppercase tracking-wider transition ${active
                    ? "text-primary-foreground/70"
                    : monthStart
                      ? "text-foreground/80"
                      : "text-muted-foreground/70"
                  }`}
              >
                {MONTH[d.getMonth()]}
              </span>
            </button>
          );
        })}
      </div>

      <button
        onClick={() => scroll("right")}
        aria-label="Scroll dates right"
        className="flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-all hover:translate-x-0.5 hover:bg-neutral-500/10 hover:text-foreground active:scale-95"
      >
        <ChevronRight className="size-3.5" />
      </button>
    </div>
  );
}
