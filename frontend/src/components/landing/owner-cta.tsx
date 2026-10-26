"use client";

import { motion } from "motion/react";
import { ArrowRight, LineChart, Wallet, Zap, Shield, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import Link from "next/link";

const highlights = [
  {
    icon: LineChart,
    label: "Own dashboard",
    body: "Revenue, occupancy and settlements in real time.",
  },
  { icon: Zap, label: "Instant payouts", body: "Automatic settlements after every completed match." },
  { icon: Shield, label: "Verified players", body: "Every booking comes from a verified user account." },
];

export function OwnerCta() {
  return (
    <section className="relative py-16 sm:py-24 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/3 to-transparent" />
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto w-full max-w-7xl px-4 sm:px-6 relative z-10"
      >
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="relative overflow-hidden rounded-3xl border border-border shadow-elevated bg-gradient-to-br from-background via-background to-muted/20"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5" />
          
          <div className="relative grid gap-10 p-8 sm:p-12 lg:grid-cols-[1.2fr_1fr]">
            <div className="relative z-10">
              <p className="text-xs uppercase tracking-[0.2em] text-accent">Become a turf owner</p>
              <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
                Fill your empty hours, <span className="text-gradient-pitch">automatically</span>
              </h2>
              <p className="mt-4 max-w-lg text-lg text-muted-foreground">
                List your venue, set your own peak and weekend pricing, block maintenance days and let OneArena handle discovery, advance payments and confirmations.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button variant="hero" size="xl" asChild>
                  <Link href="/my-profile">
                    <span className="flex items-center gap-2">List your turf <ArrowRight className="size-5" /></span>
                  </Link>
                </Button>
                <Button variant="glass" size="xl" asChild>
                  <Link href="/admin/dashboard">
                    <span className="flex items-center gap-2">See owner dashboard</span>
                  </Link>
                </Button>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="mt-10 flex items-center gap-6 text-sm text-muted-foreground"
              >
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="size-4 text-primary" />
                  </div>
                  <span className="font-medium text-foreground">500+ venues</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Shield className="size-4 text-primary" />
                  </div>
                  <span className="font-medium text-foreground">100% verified</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Zap className="size-4 text-primary" />
                  </div>
                  <span className="font-medium text-foreground">Instant payouts</span>
                </div>
              </motion.div>
            </div>

            <div className="relative z-10 grid content-center gap-4">
              {highlights.map((item, index) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.2 + index * 0.1, ease: [0.22, 1, 0.36, 1] }}
                  className="group relative rounded-2xl border border-border bg-card/80 p-5 backdrop-blur-sm transition-all duration-500 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/10 hover:bg-card hover:bg-gradient-to-br hover:from-primary/5 hover:to-accent/5"
                >
                  <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" style={{ background: `linear-gradient(135deg, ${item.icon === Wallet ? 'var(--primary)' : item.icon === LineChart ? 'var(--accent)' : item.icon === Zap ? 'var(--destructive)' : 'var(--success)'}15, transparent)` }} />
                  <div className="relative grid size-11 place-items-center rounded-xl text-primary transition-transform duration-500 group-hover:scale-110"
                    style={{ background: `linear-gradient(135deg, ${item.icon === Wallet ? 'var(--primary)' : item.icon === LineChart ? 'var(--accent)' : item.icon === Zap ? 'var(--destructive)' : 'var(--success)'}15, transparent)` }}
                  >
                    <item.icon className="size-5" />
                  </div>
                  <p className="relative mt-4 font-display text-lg sm:text-xl font-semibold text-foreground">{item.label}</p>
                  <p className="relative mt-2 text-sm text-muted-foreground">{item.body}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}