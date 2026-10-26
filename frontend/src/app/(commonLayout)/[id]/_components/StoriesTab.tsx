"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, CalendarDays, FileText, Sparkles } from "lucide-react";

import { getFileUrl } from "@/lib/utils";
import type { OwnerLandingBlog, OwnerLandingPage } from "@/types/owner-landing.type";

/* ─────────────────────────────────────────────
   Foggy Card Carousel
   ───────────────────────────────────────────── */
function StoryCarousel({
  blogs,
  onOpenStory,
}: {
  blogs: OwnerLandingBlog[];
  onOpenStory: (story: OwnerLandingBlog) => void;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const total = blogs.length;

  const go = useCallback(
    (dir: 1 | -1) => setIndex((i) => (i + dir + total) % total),
    [total],
  );

  // Auto-advance
  useEffect(() => {
    if (paused || total <= 1) return;
    const t = setInterval(() => go(1), 6500);
    return () => clearInterval(t);
  }, [paused, go, total]);

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  // Compute visible trio
  const positions = [-1, 0, 1] as const;
  const [offset, setOffset] = useState(340);

  useEffect(() => {
    const update = () => {
      if (typeof window === "undefined") return;
      setOffset(window.innerWidth < 640 ? 240 : 340);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Ambient glow behind active card */}
      <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.6, 0.4] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="h-72 w-72 rounded-full bg-primary/25 blur-3xl sm:h-96 sm:w-96"
        />
      </div>

      {/* Card stage */}
      <div className="relative mx-auto flex h-[460px] max-w-6xl items-center justify-center px-4 sm:h-[520px]">
        {positions.map((pos) => {
          const i = (index + pos + total) % total;
          const blog = blogs[i];
          if (!blog) return null;

          const isActive = pos === 0;
          const cover = getFileUrl(blog.coverImage);
          const published = blog.publishedAt
            ? new Date(blog.publishedAt).toLocaleDateString("en-US", {
                day: "numeric", month: "short", year: "numeric",
              })
            : null;

          return (
            <motion.article
              key={`${blog.id}-${pos}`}
              initial={false}
              animate={{
                x: pos === 0 ? 0 : pos === -1 ? -offset : offset,
                scale: pos === 0 ? 1 : 0.88,
                opacity: pos === 0 ? 1 : 0.55,
                filter: pos === 0 ? "blur(0px)" : "blur(5px)",
                zIndex: pos === 0 ? 20 : pos === -1 ? 10 : 5,
              }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="absolute w-[88vw] max-w-[440px] sm:w-[440px] z-[5]"
              style={{ pointerEvents: isActive ? "auto" : "none", zIndex: pos === 0 ? 20 : pos === -1 ? 10 : 5 }}
            >
              <div
                className={`group overflow-hidden rounded-xl border bg-card shadow-lg transition-all duration-500 ${
                  isActive
                    ? "border-primary/40 shadow-primary/15 shadow-2xl ring-1 ring-primary/10"
                    : "border-border/70"
                }`}
              >
                {/* Cover */}
                <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                  {cover ? (
                    <Image
                      src={cover}
                      alt={blog.title}
                      fill
                      sizes="(max-width: 640px) 88vw, 440px"
                      className={`object-cover transition-transform duration-[1200ms] ease-out ${
                        isActive ? "group-hover:scale-[1.06]" : ""
                      }`}
                    />
                  ) : (
                    <div className="size-full bg-gradient-to-br from-primary/30 to-muted" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                  {/* Badge */}
                  <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-[10px] font-black uppercase tracking-wider text-primary-foreground shadow-lg">
                    <Sparkles className="size-3" />
                    Story
                  </span>

                  {/* Date on image */}
                  {published && (
                    <span className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/40 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-md">
                      <CalendarDays className="size-3" />
                      {published}
                    </span>
                  )}
                </div>

                {/* Body */}
                <div className="p-5 sm:p-6">
                  <h3 className="line-clamp-2 text-xl font-black leading-tight text-foreground sm:text-2xl">
                    {blog.title}
                  </h3>
                  <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                    {blog.preview}
                  </p>
                  <button
                    type="button"
                    onClick={() => onOpenStory(blog)}
                    className="group/btn mt-5 inline-flex items-center gap-2 text-sm font-bold text-primary transition-all hover:gap-3"
                  >
                    Read story
                    <ArrowRight className="size-4 transition-transform group-hover/btn:translate-x-0.5" />
                  </button>
                </div>
              </div>
            </motion.article>
          );
        })}
      </div>

      {/* Controls */}
      {total > 1 && (
        <div className="mt-8 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous story"
            className="grid size-11 place-items-center rounded-full border border-border bg-card text-foreground transition-all hover:scale-110 hover:border-primary hover:text-primary"
          >
            <ArrowLeft className="size-4" />
          </button>

{/* Dot indicators */}
          <div className="flex items-center gap-2">
            {blogs.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Go to story ${i + 1}`}
                className="group relative h-1.5 overflow-hidden rounded-full bg-border transition-all"
                style={{ width: i === index ? 28 : 8 }}
              >
                <motion.span
                  layout
                  className="absolute inset-0 rounded-full bg-primary"
                  initial={false}
                  animate={{ opacity: i === index ? 1 : 0 }}
                  transition={{ duration: 0.3 }}
                />
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next story"
            className="grid size-11 place-items-center rounded-full border border-border bg-card text-foreground transition-all hover:scale-110 hover:border-primary hover:text-primary"
          >
            <ArrowRight className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Tab wrapper
   ───────────────────────────────────────────── */
export default function StoriesTab({
  data,
  onOpenStory,
}: {
  data: OwnerLandingPage;
  onOpenStory: (story: OwnerLandingBlog) => void;
}) {
  const blogs = data.blogs;

  if (!blogs.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
        <FileText className="mx-auto size-8 text-muted-foreground/50" />
        <p className="mt-3 text-sm text-muted-foreground">No stories published yet.</p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/60 bg-card p-5 shadow-sm sm:p-6">
      {/* Section header */}
      <div className="mb-6 flex flex-col items-center text-center sm:mb-8">
        <motion.h2
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-xl font-bold tracking-tight text-foreground sm:text-2xl"
        >
          Stories & Updates
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground"
        >
          Behind the scenes, match highlights, and announcements from the pitch.
        </motion.p>
      </div>

      <StoryCarousel blogs={blogs} onOpenStory={onOpenStory} />
    </div>
  );
}