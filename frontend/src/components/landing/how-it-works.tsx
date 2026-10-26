"use client";

import { motion } from "motion/react";
import { BadgeCheck, CalendarClock, CreditCard, MapPinned } from "lucide-react";

const steps = [
  {
    icon: MapPinned,
    title: "Find a turf",
    body: "Search by city or share your location to see verified turfs ranked by distance, price and rating.",
    color: "from-emerald-500 to-teal-500",
    bgColor: "from-emerald-500/10 to-teal-500/10",
  },
  {
    icon: CalendarClock,
    title: "Pick your slot",
    body: "Live availability per date. Peak, weekend and holiday pricing is calculated server-side — no surprises.",
    color: "from-amber-500 to-orange-500",
    bgColor: "from-amber-500/10 to-orange-500/10",
  },
  {
    icon: CreditCard,
    title: "Pay the advance",
    body: "Hold the slot with a small advance. The remainder is settled at the venue on match day.",
    color: "from-sky-500 to-blue-500",
    bgColor: "from-sky-500/10 to-blue-500/10",
  },
  {
    icon: BadgeCheck,
    title: "Play",
    body: "Instant confirmation with booking code, plus email reminders for you and the turf owner.",
    color: "from-violet-500 to-purple-500",
    bgColor: "from-violet-500/10 to-purple-500/10",
  },
];

export function HowItWorks() {
  return (
    <section className="relative border-y border-border/60 bg-surface/40 py-16 sm:py-24 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto w-full max-w-7xl px-4 sm:px-6 relative z-10"
      >
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-primary mb-2">How it works</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
            From search to <span className="text-gradient-pitch">kick-off</span> in four steps
          </h2>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="group relative rounded-3xl border border-border bg-card/80 p-7 backdrop-blur-sm transition-all duration-500 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/10 hover:bg-card hover:bg-gradient-to-br hover:from-primary/5 hover:to-accent/5"
            >
              <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: step.bgColor }} />
              <span className="font-display absolute right-5 top-4 text-3xl sm:text-5xl text-muted/60">
                0{index + 1}
              </span>
              <div className="relative grid size-12 place-items-center rounded-xl text-primary transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3"
                style={{ background: step.bgColor }}
              >
                <step.icon className="size-6" />
              </div>
              <h3 className="relative mt-6 font-display text-xl sm:text-2xl text-foreground">{step.title}</h3>
              <p className="relative mt-3 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: "100%" }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.3 + index * 0.1, ease: [0.22, 1, 0.36, 1] }}
                className="relative mt-6 h-px rounded-full opacity-50"
                style={{ background: step.color }}
              />
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}