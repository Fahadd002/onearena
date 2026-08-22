"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CalendarDays, LocateFixed, MapPin, Search, Trophy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const stats = [
  { value: "420+", label: "Turfs listed" },
  { value: "38k", label: "Matches played" },
  { value: "12", label: "Cities covered" },
];

const scenes = [
  { key: "football", video: "/assets/hero-football.mp4", label: "Football", caption: "The strike" },
  { key: "cricket", video: "/assets/hero-cricket.mp4", label: "Cricket", caption: "The cover drive" },
] as const;

export function Hero() {
  const [active, setActive] = useState(0);
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);

  useEffect(() => {
    const video = videoRefs.current[active];
    if (!video) return;
    video.currentTime = 0;
    void video.play().catch(() => {});
  }, [active]);

  const advance = () => setActive((current) => (current + 1) % scenes.length);

  return (
    <section className="relative overflow-hidden">
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
          onEnded={advance}
          initial={false}
          animate={{ opacity: active === index ? 0.9 : 0, scale: active === index ? 1 : 1.06 }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          aria-hidden={active !== index}
          className="absolute inset-0 size-full object-cover"
        />
      ))}

      <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/60 to-background" />
      <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-background/25 to-transparent" />
      <div className="bg-flood absolute inset-0 opacity-70" />
      <div className="pitch-lines absolute inset-0 opacity-40" />

      <div className="relative mx-auto w-full max-w-7xl px-4 pb-20 pt-24 sm:px-6 lg:pt-32">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-3xl"
        >
          <span className="surface-panel inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs uppercase tracking-[0.18em] text-primary">
            <Trophy className="size-3.5" /> Football &amp; cricket turfs
          </span>

          <h1 className="mt-6 text-7xl font-bold uppercase sm:text-8xl lg:text-9xl">
            Find. Book. <span className="text-gradient-pitch">Play.</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Real-time availability from verified turf owners across Bangladesh. Lock your slot with a
            small advance and get instant confirmation.
          </p>

          <div className="mt-6 flex items-center gap-3">
            <AnimatePresence mode="wait">
              <motion.span
                key={scenes[active]!.key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35 }}
                className="font-display text-xl uppercase tracking-[0.2em] text-accent"
              >
                {scenes[active]!.label} · {scenes[active]!.caption}
              </motion.span>
            </AnimatePresence>
            <div className="flex gap-1.5">
              {scenes.map((scene, index) => (
                <button
                  key={scene.key}
                  type="button"
                  onClick={() => setActive(index)}
                  aria-label={`Show ${scene.label} scene`}
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    active === index ? "w-8 bg-primary" : "w-3 bg-muted-foreground/40"
                  }`}
                />
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="surface-panel mt-10 rounded-2xl p-4 shadow-elevated sm:p-5"
        >
          <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr_auto]">
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="City, area or turf name"
                className="h-12 border-border bg-background/60 pl-9"
                aria-label="Location"
              />
            </div>

            <Select>
              <SelectTrigger className="h-12 border-border bg-background/60" aria-label="Sport">
                <SelectValue placeholder="Any sport" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="football">Football</SelectItem>
                <SelectItem value="cricket">Cricket</SelectItem>
                <SelectItem value="both">Football &amp; cricket</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input type="date" className="h-12 border-border bg-background/60 pl-9" aria-label="Date" />
            </div>

            <Button variant="hero" size="xl" className="lg:w-auto">
              <Search /> Search
            </Button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <Button variant="glass" size="sm">
              <LocateFixed /> Use my location
            </Button>
            <span>Popular: Dhanmondi · Uttara · Mirpur · Chattogram</span>
          </div>
        </motion.div>

        <div className="mt-12 flex flex-wrap gap-10">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
            >
              <p className="font-display text-4xl text-primary">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
