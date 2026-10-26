"use client";

import { useEffect } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, X } from "lucide-react";

import { getFileUrl } from "@/lib/utils";
import type { OwnerLandingBlog } from "@/types/owner-landing.type";

export default function StoryDialog({
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
          transition={{ duration: 0.25 }}
          onClick={onClose}
          className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/85 p-4 py-10 backdrop-blur-lg sm:p-6"
        >
          <motion.article
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-border bg-card shadow-2xl"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close story"
              className="absolute right-4 top-4 z-10 grid size-10 place-items-center rounded-full border border-white/20 bg-black/50 text-white backdrop-blur-md transition-all hover:scale-110 hover:bg-black/70"
            >
              <X className="size-4" />
            </button>

            {cover && (
              <div className="relative aspect-[16/9] bg-muted">
                <Image
                  src={cover}
                  alt={story.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 48rem"
                  className="object-cover"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                {published && (
                  <span className="absolute bottom-4 left-4 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/40 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white backdrop-blur-md">
                    <CalendarDays className="size-3.5" />
                    {published}
                  </span>
                )}
              </div>
            )}

            <div className="p-6 sm:p-10">
              <h2 className="text-2xl font-black leading-tight tracking-tight text-foreground sm:text-4xl">
                {story.title}
              </h2>
              {!cover && published && (
                <p className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <CalendarDays className="size-3.5" />
                  {published}
                </p>
              )}
              <div className="mt-6 whitespace-pre-line text-[15px] leading-relaxed text-foreground/85">
                {story.content}
              </div>
            </div>
          </motion.article>
        </motion.div>
      )}
    </AnimatePresence>
  );
}