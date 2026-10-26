"use client";

import { useEffect } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, X } from "lucide-react";

import { getFileUrl } from "@/lib/utils";
import type { OwnerLandingBlog } from "@/types/owner-landing.type";

const DRAWER_EASE = [0.25, 0.46, 0.45, 0.94] as const;

export default function StoryDrawer({
  story,
  onClose,
}: {
  story: OwnerLandingBlog | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!story) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [story, onClose]);

  const cover = story ? getFileUrl(story.coverImage) : null;
  const published = story?.publishedAt
    ? new Date(story.publishedAt).toLocaleDateString("en-US", {
        day: "numeric", month: "long", year: "numeric",
      })
    : null;

  return (
    <AnimatePresence>
      {story && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: DRAWER_EASE }}
          onClick={onClose}
          className="fixed inset-0 z-[100]"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: DRAWER_EASE }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* Bottom Drawer - smooth slide from bottom */}
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ duration: 0.45, ease: DRAWER_EASE }}
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-0 left-0 right-0 max-h-[90vh] w-full overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl flex flex-col"
          >
            {/* Drag Handle */}
            <div className="flex items-center justify-center pt-4 pb-3 px-4 border-b border-border/50">
              <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Close Button - top right corner of drawer */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close story"
              className="absolute right-4 top-4 z-20 grid size-10 place-items-center rounded-full bg-card/90 text-foreground backdrop-blur-md shadow-lg transition-all hover:scale-110 hover:shadow-xl border border-border/50"
            >
              <X className="size-5" />
            </button>

            {/* Content - 50/50 split on lg+ */}
            <div className="flex-1 overflow-y-auto lg:flex lg:min-h-[70vh]">
              {/* Left: Image Column (lg+) - 50%, no rounded corners */}
              {cover && (
                <div className="hidden lg:block lg:w-1/2 lg:flex-shrink-0 relative overflow-hidden">
                  <div className="absolute inset-0">
                    <Image
                      src={cover}
                      alt={story.title}
                      fill
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      className="object-cover"
                      priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
                    {published && (
                      <span className="absolute bottom-6 left-6 flex items-center gap-2 text-white/90 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                        <CalendarDays className="size-4" />
                        <span className="text-sm font-medium">{published}</span>
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Right: Content Column - 50% on lg+, full on mobile */}
              <div className="flex-1 flex flex-col px-5 sm:px-8 lg:px-10 lg:w-1/2 lg:py-10">
                {/* Mobile image - full width, at top */}
                {cover && (
                  <div className="lg:hidden relative aspect-[16/9] w-full mb-6 overflow-hidden bg-muted">
                    <Image
                      src={cover}
                      alt={story.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover"
                      priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    {published && (
                      <span className="absolute bottom-4 left-4 flex items-center gap-2 text-white/90 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
                        <CalendarDays className="size-4" />
                        <span className="text-sm font-medium">{published}</span>
                      </span>
                    )}
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 flex flex-col justify-center lg:pr-4">
                  {!cover && published && (
                    <p className="mb-4 flex items-center gap-1.5 text-sm font-medium text-muted-foreground lg:hidden">
                      <CalendarDays className="size-4" />
                      {published}
                    </p>
                  )}

                  {published && !cover && (
                    <p className="mb-4 lg:block flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                      <CalendarDays className="size-4" />
                      {published}
                    </p>
                  )}

                  <h2 className="text-2xl font-black leading-tight tracking-tight text-foreground sm:text-3xl lg:text-2xl">
                    {story.title}
                  </h2>

                  <div className="mt-6 whitespace-pre-line text-[15px] leading-relaxed text-foreground/85 lg:text-base lg:leading-relaxed max-w-xl">
                    {story.content}
                  </div>
                </div>

                {/* Bottom padding for safe area */}
                <div className="h-20 sm:h-24 lg:h-0" />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}