"use client";

import { Search, X, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Props {
  area: string;
  onArea: (v: string) => void;
  /** Always rendered beside the field. */
  onReset: () => void;
}

/**
 * The search field with its clear button and the always-visible Reset control.
 * Rendered below the filter controls and the time buckets.
 */
export function SearchField({ area, onArea, onReset }: Props) {
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <div className="relative min-w-[8rem] flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/70" />
        <Input
          placeholder="Search turfs, areas…"
          value={area}
          onChange={(e) => onArea(e.target.value)}
          className="h-9 rounded-full border-border/60 bg-card pl-9 pr-8 text-[13px] font-medium tracking-tight shadow-none placeholder:text-muted-foreground/60 focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/20"
        />
        {area && (
          <button
            onClick={() => onArea("")}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition hover:bg-neutral-500/10 hover:text-foreground animate-in fade-in zoom-in-75"
          >
            <X className="size-3" />
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={onReset}
        aria-label="Reset all filters"
        className="group inline-flex h-9 shrink-0 items-center justify-center gap-1 rounded-full border border-border/60 bg-card px-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground transition-colors duration-200 hover:border-neutral-400/50 hover:bg-neutral-500/10 hover:text-foreground"
      >
        <RotateCcw className="size-3 transition-transform group-hover:-rotate-45" />
        <span>Reset</span>
      </button>
    </div>
  );
}
