"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Sun, Sparkles, CalendarRange } from "lucide-react";
import { monthTabs, quickOptions } from "./dateRanges";

interface Props {
  today: Date;
  optionKey: string;
  onOption: (key: string) => void;
}

const QUICK_ICONS: Record<string, typeof Sun> = {
  today: Sun,
  tomorrow: CalendarDays,
  weekend: Sparkles,
};

export function DateMonthFilter({ today, optionKey, onOption }: Props) {
  /* These labels and counts are derived from the current day. The server runs
     in UTC and the client in local time, so rendering them during SSR can
     produce different markup and trip a hydration mismatch. Gate on mount. */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const quick = useMemo(() => quickOptions(today), [today]);
  const tabs = useMemo(() => monthTabs(today), [today]);

  // Server HTML and the first client render must match. These chips depend on
  // the current day, so hold back until mounted (the row keeps its height).
  if (!mounted) {
    return (
      <div className="-mx-1 flex snap-x gap-1 overflow-hidden px-1" aria-hidden>
        {["4.5rem", "5rem", "4.75rem", "w-px", "20rem"].map((w, idx) =>
          w === "w-px" ? (
            <span key={idx} className="h-4 w-px shrink-0 self-center bg-border/60" />
          ) : (
            <div
              key={idx}
              className={`h-7 shrink-0 rounded-full bg-muted/40 ${idx === 4 ? "w-full" : ""}`}
              style={{ width: idx === 4 ? undefined : w }}
            />
          ),
        )}
      </div>
    );
  }

  return (
    <div
      className="no-scrollbar -mx-1 flex w-full min-w-0 max-w-full snap-x gap-1 overflow-x-auto overscroll-x-contain px-1 scroll-smooth"
      role="group"
      aria-label="Date range presets"
    >
      {quick.map((opt, idx) => {
        const active = opt.key === optionKey;
        const Icon = QUICK_ICONS[opt.key];
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onOption(opt.key)}
            style={{ animationDelay: `${idx * 25}ms` }}
            className={`group inline-flex min-w-[4.25rem] shrink-0 items-center justify-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-tight transition-colors duration-200 animate-in fade-in ${active
                ? "border-primary bg-gradient-to-r from-primary to-primary-glow text-primary-foreground"
                : "border-border/60 bg-card text-foreground hover:border-neutral-400/50 hover:bg-neutral-500/10"
              }`}
          >
            <Icon
              className={`size-3 ${active ? "" : "group-hover:scale-110"} transition-transform`}
            />
            <span>{opt.label}</span>
          </button>
        );
      })}

      <span className="mx-0.5 h-4 w-px shrink-0 self-center bg-border/60" aria-hidden />

      {/* All + up to four month segments, always equal-width tabs. */}
      <div className="grid w-[20rem] shrink-0 grid-cols-5 gap-1">
        {tabs.map((opt, idx) => {
          const active = opt.key === optionKey;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => onOption(opt.key)}
              style={{ animationDelay: `${(idx + 3) * 20}ms` }}
              className={`group inline-flex items-center justify-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[10px] font-bold transition-colors duration-150 animate-in fade-in ${active
                  ? "border-primary bg-gradient-to-r from-primary to-primary-glow text-primary-foreground"
                  : "border-border/60 bg-card text-foreground hover:border-neutral-400/50 hover:bg-neutral-500/10"
                }`}
            >
              <CalendarRange className="size-2.5 shrink-0" />
              <span>{opt.label}</span>
              <span
                className={`rounded-full size-5 flex items-center justify-center text-[9px] font-black tabular-nums leading-none ${active ? "bg-primary/20 text-primary-foreground" : "bg-muted/70 text-muted-foreground/80"
                  }`}
              >
                {opt.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
