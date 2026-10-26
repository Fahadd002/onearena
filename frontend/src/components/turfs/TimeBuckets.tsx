"use client";

import { BUCKETS, type Bucket } from "@/lib/slotsUtils";
import { Sun, CloudSun, Cloud, Sunset, Moon, LayoutGrid } from "lucide-react";

interface Props {
  value: Bucket;
  onChange: (b: Bucket) => void;
  className?: string;
}

const BUCKET_META: Record<Bucket, { Icon: typeof Sun; activeClass: string }> = {
  all: { Icon: LayoutGrid, activeClass: "bg-foreground text-background border-foreground" },
  morning: { Icon: Sun, activeClass: "bg-amber-500 text-white border-amber-500" },
  noon: { Icon: CloudSun, activeClass: "bg-sky-500 text-white border-sky-500" },
  afternoon: { Icon: Cloud, activeClass: "bg-orange-500 text-white border-orange-500" },
  evening: { Icon: Sunset, activeClass: "bg-violet-500 text-white border-violet-500" },
  night: { Icon: Moon, activeClass: "bg-indigo-500 text-white border-indigo-500" },
};

export function TimeBuckets({ value, onChange, className = "" }: Props) {
  return (
    <div
      role="tablist"
      aria-label="Time of day"
      className={`no-scrollbar flex min-w-0 items-center gap-1 overflow-x-auto py-0.5 ${className}`}
    >
      {BUCKETS.map((b, idx) => {
        const active = value === b.key;
        const { Icon, activeClass } = BUCKET_META[b.key];

        return (
          <button
            key={b.key}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(b.key)}
            style={{ animationDelay: `${idx * 25}ms` }}
            className={`group inline-flex min-w-[4.25rem] shrink-0 items-center justify-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-tight whitespace-nowrap transition-colors duration-200 animate-in fade-in slide-in-from-bottom-1 ${
              active
                ? activeClass
                : "border-border/60 bg-card text-muted-foreground hover:border-neutral-400/50 hover:bg-neutral-500/10 hover:text-foreground"
            }`}
          >
            <Icon
              className={`size-3 transition-transform ${active ? "" : "group-hover:scale-110"}`}
            />
            <span>{b.label}</span>
          </button>
        );
      })}
    </div>
  );
}
