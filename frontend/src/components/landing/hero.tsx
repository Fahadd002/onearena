"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";

import { useTurfExplorer } from "@/components/turfs/TurfExplorerProvider";

const scenes = [
  { key: "football", video: "/assets/hero-football.mp4", label: "Football", caption: "The strike" },
  { key: "cricket", video: "/assets/hero-cricket.mp4", label: "Cricket", caption: "The cover drive" },
] as const;

export function Hero({ className = "" }: { className?: string }) {
  const [activeScene, setActiveScene] = useState(0);
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);
  const { bannerRef, copyRef } = useTurfExplorer();

  useEffect(() => {
    const video = videoRefs.current[activeScene];
    if (!video) return;
    video.currentTime = 0;
    void video.play().catch(() => undefined);
  }, [activeScene]);

  return (
    <section className={`relative isolate ${className}`}>
      <div ref={bannerRef} className="hero-banner relative overflow-hidden">
        {scenes.map((scene, index) => (
          <motion.video
            key={scene.key}
            ref={(node) => {
              videoRefs.current[index] = node;
            }}
            src={scene.video}
            poster="/assets/hero-turf-3d.jpg"
            muted
            playsInline
            preload="auto"
            autoPlay={index === 0}
            onEnded={() => setActiveScene((current) => (current + 1) % scenes.length)}
            animate={{
              opacity: activeScene === index ? 1 : 0,
              scale: activeScene === index ? 1 : 1.06,
            }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
            aria-hidden={activeScene !== index}
            className={`hero-banner-video absolute inset-0 size-full object-cover ${activeScene === index ? "is-active" : ""}`}
          />
        ))}

        <div className="hero-banner-veil absolute inset-0 bg-gradient-to-b from-background/20 via-background/30 to-background/60" />
        <div className="hero-banner-scrim absolute inset-0 bg-gradient-to-r from-background/40 via-transparent to-transparent" />

        <div className="relative mx-auto flex h-full w-full max-w-7xl items-start px-5 pt-18 sm:px-8 lg:px-10">
          <motion.div
            ref={copyRef}
            initial={{ opacity: 0, x: 48 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="hero-banner-copy w-full"
          >
            <h1 className="text-3xl font-bold uppercase sm:text-4xl lg:text-5xl">
              Find. Book. <span className="text-gradient-pitch">Play.</span>
            </h1>
            <p className="mt-3 max-w-xl text-sm text-muted-foreground sm:mt-4 sm:text-base lg:text-lg">
              Real-time availability from verified turf owners across Bangladesh. Choose your ground and book your next
              game.
            </p>
            <div className="mt-3 flex items-center gap-3 sm:mt-4">
              <span className="font-display text-sm uppercase tracking-[0.2em] text-primary sm:text-base lg:text-xl">
                {scenes[activeScene].label} · {scenes[activeScene].caption}
              </span>
              <div className="flex gap-1.5">
                {scenes.map((scene, index) => (
                  <button
                    key={scene.key}
                    type="button"
                    onClick={() => setActiveScene(index)}
                    aria-label={`Show ${scene.label} scene`}
                    className={`h-1.5 rounded-full transition-all duration-500 ${
                      activeScene === index ? "w-8 bg-primary" : "w-3 bg-muted-foreground/40"
                    }`}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}