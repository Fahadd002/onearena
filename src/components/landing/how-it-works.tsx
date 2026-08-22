"use client";

import { motion } from "motion/react";
import { BadgeCheck, CalendarClock, CreditCard, MapPinned } from "lucide-react";

const steps = [
  {
    icon: MapPinned,
    title: "Find a turf",
    body: "Search by city or share your location to see verified turfs ranked by distance, price and rating.",
  },
  {
    icon: CalendarClock,
    title: "Pick your slot",
    body: "Live availability per date. Peak, weekend and holiday pricing is calculated server-side — no surprises.",
  },
  {
    icon: CreditCard,
    title: "Pay the advance",
    body: "Hold the slot with a small advance. The remainder is settled at the venue on match day.",
  },
  {
    icon: BadgeCheck,
    title: "Play",
    body: "Instant confirmation with booking code, plus email reminders for you and the turf owner.",
  },
];

export function HowItWorks() {
  return (
    <section className="border-y border-border/60 bg-surface/40 py-20">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        <p className="text-xs uppercase tracking-[0.2em] text-primary">How it works</p>
        <h2 className="mt-3 max-w-2xl text-4xl uppercase sm:text-5xl">
          From search to kick-off in four steps
        </h2>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: index * 0.09 }}
              className="relative rounded-2xl border border-border bg-card p-6"
            >
              <span className="font-display absolute right-5 top-4 text-5xl text-muted/60">
                0{index + 1}
              </span>
              <span className="grid size-11 place-items-center rounded-xl bg-primary/15 text-primary">
                <step.icon className="size-5" />
              </span>
              <h3 className="mt-5 font-display text-2xl">{step.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
