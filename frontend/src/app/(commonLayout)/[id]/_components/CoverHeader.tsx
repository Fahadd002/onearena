"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import {
  MessageCircle,
  ShieldCheck,
} from "lucide-react";

import { getFileUrl } from "@/lib/utils";
import type { OwnerLandingPage } from "@/types/owner-landing.type";
import ContactCard from "./ContactCard";


function useCountUp(end: number, duration = 2, delay = 0, decimals = 0) {
  const [count, setCount] = useState(0);
  const frameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    startTimeRef.current = performance.now() + delay * 1000;

    const animate = (now: number) => {
      const elapsed = now - (startTimeRef.current ?? now);
      if (elapsed < 0) {
        frameRef.current = requestAnimationFrame(animate);
        return;
      }
      const progress = Math.min(elapsed / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(end * eased);
      if (progress < 1) frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [end, duration, delay]);

  return decimals > 0 ? count.toFixed(decimals) : Math.floor(count).toLocaleString();
}

export default function CoverHeader({ data }: { data: OwnerLandingPage }) {
  const { owner, hero, stats, socialLinks, contact } = data;

  const displayName = owner.business.companyName || owner.name;
  const logo = getFileUrl(owner.business.businessLogo);
  const cover = getFileUrl(hero?.coverImage) || null;

  const memberYear = (() => {
    const d = new Date(owner.memberSince);
    return Number.isNaN(d.getTime()) ? null : d.getFullYear();
  })();

  const yearsOfExcellence = memberYear
    ? Math.max(1, new Date().getFullYear() - memberYear)
    : 1;

  const whatsapp = socialLinks.find(
    (s) => s.platform.toLowerCase() === "whatsapp",
  );


  const statItems = [
    {
      label: `${yearsOfExcellence> 1 ? "Years"  : "Year"} of Excellence`,
      value: yearsOfExcellence,
      suffix: "+",
      decimals: 0,
    },
    {
      label:  stats.turfCount > 1 ? `Turfs` : "Turf",
      value: stats.turfCount,
      suffix: "",
      decimals: 0,
    },
    {
      label: stats.reviewCount > 1 ? `Reviews` : "Review",
      value: stats.reviewCount,
      suffix: "",
      decimals: 0,
    },
    ...(stats.reviewCount > 0
      ? [
          {
            label: "Avg Rating",
            value: stats.averageRating,
            suffix: "",
            decimals: 1,
          },
        ]
      : []),
  ];

  const yearsCount = useCountUp(yearsOfExcellence, 2, 0);
  const turfsCount = useCountUp(stats.turfCount, 2, 0.15);
  const reviewsCount = useCountUp(stats.reviewCount, 2, 0.3);
  const ratingCount = stats.reviewCount > 0 ? useCountUp(stats.averageRating, 2, 0.45, 1) : "0";

  return (
    <div className="relative w-full border-b border-border/70 bg-card">
      <div className="relative aspect-[16/7] max-h-[250px] w-full overflow-hidden bg-muted sm:aspect-[16/5]">
        {cover ? (
          <Image
            src={cover}
            alt={`${displayName} cover`}
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
        ) : (
          <div className="size-full bg-gradient-to-br from-primary/40 via-primary/15 to-muted" />
        )}

        {/* Gradient so white text stays legible over the photo (light or dark) */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />

        {/* Subtle top vignette */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-transparent" />

        {/* ─── Stats strip ON the cover image ─── */}
        <div className="absolute bottom-0 left-0 right-0 hidden sm:block">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-4 gap-y-3 px-4 py-3 sm:gap-x-6 sm:py-4 sm:px-6"
          >
            {statItems.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, delay: index * 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="text-center group relative px-3 min-w-[100px]"
                whileHover={{ scale: 1.03 }}
              >
                <div className="relative">
                  <span className="text-2xl sm:text-3xl font-black text-white drop-shadow-[0_3px_10px_rgba(0,0,0,0.95)] tabular-nums transition-all duration-300 group-hover:scale-105">
                    {index === 0 ? yearsCount : index === 1 ? turfsCount : index === 2 ? reviewsCount : ratingCount}
                    {item.suffix}
                  </span>
                  {/* Subtle glow effect on hover */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: index * 0.1 + 0.2 }}
                    className="absolute inset-0 bg-gradient-to-t from-primary/20 via-transparent to-transparent rounded-xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none -z-10"
                  />
                </div>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 + 0.2 }}
                  className="text-[10px] font-semibold uppercase tracking-wider text-white/80 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] sm:text-[11px]"
                >
                  {item.label}
                </motion.p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* ─── Logo + name + actions (aligned with page content) ─── */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative mx-auto w-full max-w-screen-2xl px-4 pb-5 sm:px-6 sm:pb-6"
      >
        <ContactCard
          companyName={displayName}
          contact={contact}
        />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="relative z-10 -mt-12 flex flex-col items-center gap-3 sm:-mt-14 sm:flex-row sm:items-end sm:gap-5"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.7, delay: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
            className="flex size-24 shrink-0 overflow-hidden rounded-full border-4 border-card bg-muted shadow-lg ring-1 ring-border/50 sm:size-28 lg:size-32"
            whileHover={{ scale: 1.05, rotate: 2 }}
          >
            {logo ? (
              <Image
                src={logo}
                alt={`${displayName} logo`}
                width={128}
                height={128}
                className="size-full object-cover"
              />
            ) : (
              <span className="grid size-full place-items-center text-3xl font-black text-muted-foreground">
                {displayName.slice(0, 1).toUpperCase()}
              </span>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.55 }}
            className="min-w-0 flex flex-col items-center gap-2 sm:items-start sm:pb-1"
          >
            {/* ─── Mobile stats (above name) ─── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:hidden"
            >
              {/* Years of Excellence */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="text-center px-2"
              >
                <p className="text-lg font-black text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] tabular-nums">{yearsCount}+</p>
                <p className="text-[9px] font-medium uppercase tracking-wide text-white/70 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] mt-0.5">Years</p>
              </motion.div>

              {/* Divider */}
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "1.5rem" }}
                transition={{ duration: 0.5, delay: 0.35 }}
                className="w-px bg-white/20"
              />

              {/* Turfs */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="text-center px-2"
              >
                <p className="text-lg font-black text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] tabular-nums">{turfsCount}</p>
                <p className="text-[9px] font-medium uppercase tracking-wide text-white/70 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] mt-0.5">Turfs</p>
              </motion.div>

              {/* Divider */}
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "1.5rem" }}
                transition={{ duration: 0.5, delay: 0.45 }}
                className="w-px bg-white/20"
              />

              {/* Reviews */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="text-center px-2"
              >
                <p className="text-lg font-black text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] tabular-nums">{reviewsCount}</p>
                <p className="text-[9px] font-medium uppercase tracking-wide text-white/70 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] mt-0.5">Reviews</p>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="flex flex-wrap items-center justify-center gap-2 sm:justify-start"
            >
              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-xl font-bold tracking-tight text-foreground sm:text-2xl lg:text-3xl"
              >
                {displayName}
              </motion.h1>
              {owner.business.isVerified && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                  className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary"
                >
                  <ShieldCheck className="size-3.5" />
                  Verified
                </motion.span>
              )}
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* ─── Floating WhatsApp ─── */}
      {whatsapp && (
        <motion.a
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8, ease: [0.34, 1.56, 0.64, 1] }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          href={whatsapp.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat on WhatsApp"
          className="group fixed right-5 bottom-5 z-50 flex size-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg sm:right-6 sm:bottom-6"
        >
          <MessageCircle className="size-7" />
          <span className="pointer-events-none absolute -inset-2 rounded-full bg-[#25D366]/40 opacity-0 blur-md transition-opacity group-hover:opacity-100" />
        </motion.a>
      )}
    </div>
  );
}