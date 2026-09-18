"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, ChevronLeft, ChevronRight, MapPin, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { httpClient } from "@/lib/axios/httpClient";
import { API_ENDPOINTS } from "@/lib/api/config";
import type { Turf } from "@/types/turf.type";

const scenes = [
  { key: "football", video: "/assets/hero-football.mp4", label: "Football", caption: "The strike" },
  { key: "cricket", video: "/assets/hero-cricket.mp4", label: "Cricket", caption: "The cover drive" },
] as const;

export function Hero({ className = "" }: { className?: string }) {
  const [activeScene, setActiveScene] = useState(0);
  const [turfs, setTurfs] = useState<Turf[]>([]);
  const [activeTurfIndex, setActiveTurfIndex] = useState(0);
  const [isTurfRailPaused, setIsTurfRailPaused] = useState(false);
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);
  const turfRailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    httpClient.get<{ data: Turf[] } | Turf[]>(API_ENDPOINTS.marketplace.turfs, {
      params: { limit: "100", sortBy: "createdAt", sortOrder: "desc" },
    }).then((response) => {
      const payload = response.data;
      setTurfs(Array.isArray(payload) ? payload : payload?.data ?? []);
    }).catch(() => setTurfs([]));
  }, []);

  useEffect(() => {
    const video = videoRefs.current[activeScene];
    if (!video) return;
    video.currentTime = 0;
    void video.play().catch(() => undefined);
  }, [activeScene]);

  useEffect(() => {
    if (turfs.length < 2 || isTurfRailPaused) return;

    const interval = window.setInterval(() => {
      setActiveTurfIndex((current) => (current + 1) % turfs.length);
    }, 4500);

    return () => window.clearInterval(interval);
  }, [isTurfRailPaused, turfs.length]);

  useEffect(() => {
    const card = turfRailRef.current?.children[activeTurfIndex] as HTMLElement | undefined;
    card?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
  }, [activeTurfIndex, turfs.length]);

  const moveTurfRail = (direction: -1 | 1) => {
    setActiveTurfIndex((current) => (current + direction + turfs.length) % turfs.length);
  };

  return (
    <section className={`relative min-h-screen overflow-hidden ${className}`}>
      {scenes.map((scene, index) => (
        <motion.video
          key={scene.key}
          ref={(node) => { videoRefs.current[index] = node; }}
          src={scene.video}
          poster="/assets/hero-turf-3d.jpg"
          muted
          playsInline
          preload="auto"
          autoPlay={index === 0}
          onEnded={() => setActiveScene((current) => (current + 1) % scenes.length)}
          animate={{ opacity: activeScene === index ? 0.9 : 0, scale: activeScene === index ? 1 : 1.06 }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          aria-hidden={activeScene !== index}
          className="absolute inset-0 size-full object-cover"
        />
      ))}

      <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/60 to-background" />
      <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-background/25 to-transparent" />
      <div className="bg-flood absolute inset-0 opacity-70" />
      <div className="pitch-lines absolute inset-0 opacity-40" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col mt-24 px-5 sm:px-8 lg:px-10">
        <motion.div
          initial={{ opacity: 0, x: -48 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-3xl"
        >
          <h1 className="text-6xl font-bold uppercase">
            Find. Book. <span className="text-gradient-pitch">Play.</span>
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted-foreground">
            Real-time availability from verified turf owners across Bangladesh. Choose your ground and book your next game.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <span className="font-display text-xl uppercase tracking-[0.2em] text-primary">
              {scenes[activeScene].label} · {scenes[activeScene].caption}
            </span>
            <div className="flex gap-1.5">
              {scenes.map((scene, index) => (
                <button
                  key={scene.key}
                  type="button"
                  onClick={() => setActiveScene(index)}
                  aria-label={`Show ${scene.label} scene`}
                  className={`h-1.5 rounded-full transition-all duration-500 ${activeScene === index ? "w-8 bg-primary" : "w-3 bg-muted-foreground/40"}`}
                />
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="mt-14"
        >
          {turfs.length > 0 ? (
            <div
              className="relative"
              onMouseEnter={() => setIsTurfRailPaused(true)}
              onMouseLeave={() => setIsTurfRailPaused(false)}
            >
              <div
                ref={turfRailRef}
                className="turf-rail flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none]"
              >
                {turfs.map((turf) => (
                  <article
                    key={turf.id}
                    className="group relative w-[260px] shrink-0 snap-start overflow-hidden rounded-lg border border-border/70 bg-background/70 shadow-lg backdrop-blur-md transition duration-300 hover:-translate-y-1 hover:border-primary/60 hover:bg-background/90 hover:shadow-glow sm:w-[290px]"
                  >
                    <Link href={`/owners/${turf.owner.id}`} className="block">
                      <div className="relative aspect-[16/8] overflow-hidden bg-muted">
                        {turf.images?.[0]?.url ? (
                          <>
                            <img src={turf.images[0].url} alt={turf.images[0].altText || turf.name} className="size-full object-cover transition duration-500 group-hover:scale-105" />
                            {turf.images[1]?.url && (
                              <img
                                src={turf.images[1].url}
                                alt={turf.images[1].altText || turf.name}
                                className="absolute bottom-0 left-0 z-10 h-[20%] w-[20%] rounded-tr-[3rem] object-cover opacity-0 transition-all duration-500 ease-out group-hover:h-full group-hover:w-full group-hover:rounded-none group-hover:opacity-100"
                              />
                            )}
                          </>
                        ) : (
                          <div className="grid size-full place-items-center text-3xl font-bold text-primary">{turf.name.slice(0, 1)}</div>
                        )}
                        <span className="absolute left-3 top-3 rounded-md bg-background/85 px-2 py-1 text-[11px] font-semibold text-primary backdrop-blur">
                          {turf.category?.name || "Sports turf"}
                        </span>
                      </div>
                      <div className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="line-clamp-1 text-sm font-semibold transition-colors group-hover:text-primary">{turf.name}</h3>
                          {turf.reviews?.length ? (
                            <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-accent">
                              <Star className="size-3 fill-current" />
                              {(turf.reviews.reduce((total, review) => total + review.rating, 0) / turf.reviews.length).toFixed(1)}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="size-3 shrink-0" /><span className="truncate">{turf.area || turf.address}</span></p>
                        
                      </div>
                    </Link>
                    <div className="flex items-center justify-between gap-3 border-t border-border/70 px-3 py-2.5">
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">From</p>
                        <p className="text-sm font-bold text-primary">৳{Number(turf.basePrice).toLocaleString()}<span className="ml-1 text-[10px] font-medium text-muted-foreground">/ slot</span></p>
                      </div>
                      <Button variant="hero" size="sm" asChild className="shrink-0">
                        <Link href={`/turfs/${turf.id}`}>Book <ArrowRight /></Link>
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
              {turfs.length > 1 ? (
                <div className="mt-3 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => moveTurfRail(-1)}
                    aria-label="Show previous turf"
                    className="grid size-9 place-items-center rounded-md border border-border/70 bg-background/80 text-foreground transition hover:border-primary/60 hover:bg-primary hover:text-primary-foreground"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveTurfRail(1)}
                    aria-label="Show next turf"
                    className="grid size-9 place-items-center rounded-md border border-border/70 bg-background/80 text-foreground transition hover:border-primary/60 hover:bg-primary hover:text-primary-foreground"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="px-1 py-8 text-sm text-muted-foreground">Loading active turfs...</div>
          )}
        </motion.div>
      </div>

      <style jsx>{`
        .turf-rail::-webkit-scrollbar { display: none; }
      `}</style>
    </section>
  );
}
