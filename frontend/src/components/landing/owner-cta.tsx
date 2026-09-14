"use client";

import { motion } from "motion/react";
import { ArrowRight, LineChart, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import Link from "next/link";

const highlights = [
  { icon: Wallet, label: "Keep 90%", body: "Flat 10% platform commission, settled per booking." },
  {
    icon: LineChart,
    label: "Own dashboard",
    body: "Revenue, occupancy and settlements in real time.",
  },
];

export function OwnerCta() {
  return (
    <section className="py-20">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-3xl border border-border shadow-elevated"
        >
          <img
            src="/assets/football-turf.jpg"
            alt="Aerial view of a five-a-side turf at golden hour"
            loading="lazy"
            width={1280}
            height={960}
            className="absolute inset-0 size-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/40" />

          <div className="relative grid gap-10 p-8 sm:p-12 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-accent">Become a turf owner</p>
              <h2 className="mt-3 text-4xl uppercase sm:text-5xl">
                Fill your empty hours, <span className="text-gradient-pitch">automatically</span>
              </h2>
              <p className="mt-4 max-w-lg text-muted-foreground">
                List your venue, set your own peak and weekend pricing, block maintenance days and let OneArena handle discovery, advance payments and confirmations.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button variant="hero" size="xl" asChild>
                  <Link href="/my-profile">
                  List your turf <ArrowRight />
                  </Link>
                </Button>
                <Button variant="glass" size="xl" asChild>
                  <Link href="/admin/dashboard"> 
                  See owner dashboard
                  </Link>
                </Button>
              </div>
            </div>

            <div className="grid content-center gap-4">
              {highlights.map((item) => (
                <div key={item.label} className="surface-panel rounded-2xl p-5">
                  <item.icon className="size-5 text-primary" />
                  <p className="mt-3 font-display text-2xl">{item.label}</p>
                  <p className="text-sm text-muted-foreground">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
