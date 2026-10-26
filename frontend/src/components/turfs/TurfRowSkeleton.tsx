"use client";

import { Skeleton } from "@/components/ui/skeleton";

/* ═══════════ Skeleton — same grid, sizes and radius as TurfRow ═══════════ */
export function TurfRowSkeleton() {
  return (
    <div className="grid grid-cols-1 overflow-hidden rounded-xl border border-border/60 bg-card lg:grid-cols-[280px_1fr] lg:rounded-2xl">
      {/* LEFT — image + mobile info */}
      <div className="flex items-stretch gap-2.5 p-2.5 lg:flex-col lg:gap-0 lg:p-0">
        <Skeleton className="size-[96px] shrink-0 rounded-[5px] lg:min-h-[200px] lg:w-full lg:rounded-none" />

        <div className="flex min-w-0 flex-1 flex-col gap-1 lg:hidden">
          {/* Category + date badge row */}
          <div className="flex items-center gap-1">
            <Skeleton className="h-3 w-16 rounded-md" />
            <Skeleton className="ml-auto h-3 w-[4.5rem] rounded-md" />
          </div>

          {/* Name (line-clamp-2) */}
          <Skeleton className="h-[13px] w-4/5 rounded" />
          <Skeleton className="h-[13px] w-1/2 rounded" />

          {/* Address, up to two lines */}
          <Skeleton className="h-2.5 w-full rounded" />
          <Skeleton className="h-2.5 w-2/3 rounded" />

          {/* Rating / distance chips */}
          <div className="mt-auto flex items-center gap-1 pt-1">
            <Skeleton className="h-4 w-[3.25rem] rounded-full" />
            <Skeleton className="h-4 w-[3.75rem] rounded-full" />
          </div>
        </div>
      </div>

      {/* RIGHT — desktop header strip + slot rail */}
      <div className="flex flex-col border-t border-border/50 lg:border-l lg:border-t-0">
        <div className="hidden items-center justify-between gap-2 border-b border-border/40 px-4 py-2.5 lg:flex">
          <Skeleton className="h-[11px] w-56 rounded" />
          <div className="flex shrink-0 items-center gap-1.5">
            <Skeleton className="h-[11px] w-20 rounded" />
            <Skeleton className="size-7 rounded-lg" />
            <Skeleton className="size-7 rounded-lg" />
          </div>
        </div>

        <div className="flex items-stretch gap-1.5 overflow-hidden px-3.5 py-2 lg:gap-2 lg:px-6 lg:py-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-[62px] w-[96px] shrink-0 rounded-[5px] lg:h-[104px] lg:w-[124px] lg:rounded-md"
            />
          ))}
        </div>
      </div>
    </div>
  );
}