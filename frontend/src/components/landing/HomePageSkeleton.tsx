"use client";

import { motion } from "motion/react";
import { Skeleton } from "@/components/ui/skeleton";

function SkeletonCard() {
  return (
    <Skeleton className="rounded-2xl border border-border bg-card p-6 h-40" />
  );
}

function SkeletonGrid({ cols = 4, rows = 1 }) {
  return (
    <div className={`grid gap-6 ${cols === 2 ? "sm:grid-cols-2" : ""} ${cols === 3 ? "md:grid-cols-2 lg:grid-cols-3" : ""} ${cols === 4 ? "lg:grid-cols-4" : ""}`}>
      {Array.from({ length: rows * cols }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

function SkeletonRow({ height = 40, width = "full" }) {
  return <Skeleton className={`h-${height} w-${width} rounded`} />;
}

export function HomePageSkeleton() {
  return (
    <div className="bg-background min-h-screen overflow-x-hidden">
      {/* Hero Skeleton */}
      <section className="relative isolate">
        <div className="hero-banner relative overflow-hidden">
          <Skeleton className="absolute inset-0" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/30 to-background/60" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/40 via-transparent to-transparent" />
          <div className="relative mx-auto flex h-full w-full max-w-7xl items-start px-5 pt-18 sm:px-8 lg:px-10">
            <div className="hero-banner-copy w-full max-w-3xl space-y-4">
              <Skeleton className="h-8 w-48 rounded-full" />
              <Skeleton className="h-12 w-full rounded" />
              <Skeleton className="h-8 w-3/4 rounded" />
              <Skeleton className="h-6 w-56 rounded" />
            </div>
          </div>
        </div>
      </section>

      {/* Turf Explorer Skeleton */}
      <div className="relative pb-12 pt-2">
        <div className="turf-hero-overlap relative z-10 transition-colors duration-[500ms] bg-background">
          <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
            {/* Search Deck Skeleton */}
            <div className="sticky z-[55] rounded-xl border-white/20 bg-background/25 backdrop-blur-xl p-2 top-16 transition-all duration-500">
              <div className="mx-auto w-full max-w-screen-2xl">
                <div className="grid grid-cols-1 items-start gap-2 lg:grid-cols-2">
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <Skeleton className="h-10 w-1/3 rounded" />
                    <div className="flex gap-1 overflow-x-auto pb-1">
                      {Array.from({ length: 7 }).map((_, i) => (
                        <Skeleton key={i} className="flex min-w-[2.75rem] shrink-0 flex-col items-center justify-center gap-px rounded-lg border border-muted bg-muted/40 py-1 h-20" />
                      ))}
                    </div>
                  </div>
                  <div className="flex min-w-0 flex-col gap-1.5 lg:border-l lg:border-border/50 lg:pl-3">
                    <Skeleton className="h-10 w-full rounded" />
                    <Skeleton className="h-10 w-full rounded" />
                    <Skeleton className="h-10 w-full rounded" />
                    <Skeleton className="h-10 w-full rounded" />
                  </div>
                </div>
              </div>
            </div>

            {/* Turf List Skeleton */}
            <div id="turfs" className="scroll-mt-40 transition-[padding] duration-[400ms] pt-6">
              <div className="space-y-2.5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-border bg-card p-4">
                    <div className="flex gap-3">
                      <Skeleton className="relative size-[96px] shrink-0 overflow-hidden rounded-[5px] lg:h-48 lg:w-full lg:rounded-none" />
                      <div className="flex-1 min-w-0 space-y-3">
                        <Skeleton className="h-4 w-20 rounded" />
                        <Skeleton className="h-5 w-3/4 rounded" />
                        <Skeleton className="h-4 w-1/2 rounded" />
                        <Skeleton className="h-10 w-full rounded" />
                        <div className="flex gap-2">
                          <Skeleton className="h-6 w-20 rounded" />
                          <Skeleton className="h-6 w-20 rounded" />
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <Skeleton key={j} className="flex min-h-[62px] w-[96px] shrink-0 snap-start flex-col justify-between gap-0.5 overflow-hidden rounded-[5px] border border-muted bg-muted/30 p-1.5" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* HowItWorks Skeleton */}
      <section className="relative border-y border-border/60 bg-surface/40 py-16 sm:py-24 overflow-hidden">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <Skeleton className="h-4 w-40 rounded mx-auto mb-2" />
            <Skeleton className="h-10 w-full rounded mx-auto mb-2" />
            <Skeleton className="h-6 w-3/4 rounded mx-auto" />
          </div>
          <SkeletonGrid cols={4} rows={1} />
        </div>
      </section>

      {/* WhyChooseUs Skeleton */}
      <section className="relative py-16 sm:py-24 overflow-hidden">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <Skeleton className="h-4 w-32 rounded mx-auto mb-2" />
            <Skeleton className="h-10 w-full rounded mx-auto mb-2" />
            <Skeleton className="h-6 w-3/4 rounded mx-auto" />
          </div>
          <SkeletonGrid cols={3} rows={2} />
        </div>
      </section>

      {/* Testimonials Skeleton */}
      <section className="relative border-y border-border/60 bg-surface/40 py-16 sm:py-24 overflow-hidden">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <Skeleton className="h-4 w-32 rounded mx-auto mb-2" />
            <Skeleton className="h-10 w-full rounded mx-auto mb-2" />
            <Skeleton className="h-6 w-3/4 rounded mx-auto" />
          </div>
          <div className="overflow-hidden">
            <div className="flex gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex-[0_0_100%] min-w-0 max-w-full sm:max-w-[calc(50%-1.5rem)] lg:max-w-[calc(33.333%-2rem)] px-1">
                  <Skeleton className="h-64 rounded-2xl border border-border bg-card p-6" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* OwnerCta Skeleton */}
      <section className="relative py-16 sm:py-24 overflow-hidden">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
          <Skeleton className="rounded-3xl border border-border shadow-elevated bg-gradient-to-br from-background via-background to-muted/20 p-8 sm:p-12 lg:grid lg:grid-cols-[1.2fr_1fr] gap-10 h-96" />
        </div>
      </section>

      {/* Faq Skeleton */}
      <section className="relative py-16 sm:py-24 overflow-hidden">
        <div className="mx-auto w-full max-w-4xl px-4 sm:px-6">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <Skeleton className="h-4 w-40 rounded mx-auto mb-2" />
            <Skeleton className="h-10 w-full rounded mx-auto mb-2" />
            <Skeleton className="h-6 w-3/4 rounded mx-auto" />
          </div>
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="rounded-xl border border-border bg-card/80 p-6 h-16" />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}