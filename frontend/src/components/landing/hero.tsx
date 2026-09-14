"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
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
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);

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

  const repeatedTurfs = [...turfs, ...turfs];

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

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-center px-5 pb-12 pt-24 sm:px-8 lg:px-10">
        <motion.div
          initial={{ opacity: 0, x: -48 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-3xl"
        >
          <h1 className="text-6xl font-bold uppercase sm:text-6xl lg:text-7xl">
            Find. Book. <span className="text-gradient-pitch">Play.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Real-time availability from verified turf owners across Bangladesh. Choose your ground and book your next game.
          </p>
          <div className="mt-6 flex items-center gap-3">
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
            <div className="marquee-mask overflow-hidden py-3">
              <div className="hero-turf-marquee flex w-max gap-3 hover:[animation-play-state:paused]">
                {repeatedTurfs.map((turf, index) => (
                  <Link
                    key={`${turf.id}-${index}`}
                    href={turf.owner?.id ? `/owners/${turf.owner.id}` : `/turfs/${turf.id}`}
                    className="group flex w-[260px] shrink-0 items-center gap-3 rounded-xl bg-background/60 p-2.5 shadow-lg backdrop-blur-md transition hover:bg-background/85 sm:w-[290px]"
                  >
                    <div className="size-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                      {turf.images?.[0]?.url ? (
                        <img src={turf.images[0].url} alt={turf.name} className="size-full object-cover transition duration-500 group-hover:scale-110" />
                      ) : (
                        <div className="grid size-full place-items-center text-xl font-bold text-primary">{turf.name.slice(0, 1)}</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{turf.name}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{turf.address}</p>
                      <p className="mt-1 text-xs font-semibold text-primary">From ৳{Number(turf.basePrice).toLocaleString()}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <div className="px-1 py-8 text-sm text-muted-foreground">Loading active turfs...</div>
          )}
        </motion.div>
      </div>

      <style jsx>{`
        .marquee-mask {
          mask-image: linear-gradient(to right, transparent, black 3%, black 97%, transparent);
        }
        .hero-turf-marquee {
          animation: hero-turf-slide 32s linear infinite;
        }
        @keyframes hero-turf-slide {
          from { transform: translateX(0); }
          to { transform: translateX(calc(-50% - 0.375rem)); }
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-turf-marquee { animation-play-state: paused; }
        }
      `}</style>
    </section>
  );
}
