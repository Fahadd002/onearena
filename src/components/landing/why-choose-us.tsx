"use client";

import { motion } from "motion/react";
import { Clock, Lock, Percent, RefreshCcw, ShieldCheck, Users } from "lucide-react";

const reasons = [
  {
    icon: Lock,
    title: "No double bookings",
    body: "Every slot is reserved inside a database transaction, so two teams can never claim the same hour.",
  },
  {
    icon: Percent,
    title: "Transparent pricing",
    body: "Hourly price, advance and remaining balance are shown before you pay, and stored with the booking.",
  },
  {
    icon: RefreshCcw,
    title: "Fair cancellations",
    body: "Refunds follow a published policy tied to how far ahead you cancel — not to the venue's mood.",
  },
  {
    icon: ShieldCheck,
    title: "Verified owners",
    body: "Every venue is reviewed and approved by the OneArena team before it can accept bookings.",
  },
  {
    icon: Clock,
    title: "Held for 10 minutes",
    body: "Your slot is held while you pay, then released automatically if checkout is abandoned.",
  },
  {
    icon: Users,
    title: "Built for regulars",
    body: "Favourites, booking history and reminders keep weekly squads running without group-chat chaos.",
  },
];

export function WhyChooseUs() {
  return (
    <section className="py-20">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Why OneArena</p>
          <h2 className="mt-3 text-4xl uppercase sm:text-5xl">Built like a real marketplace</h2>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {reasons.map((reason, index) => (
            <motion.div
              key={reason.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: index * 0.06 }}
              className="rounded-2xl border border-border bg-card/70 p-6 transition-colors hover:border-primary/40"
            >
              <reason.icon className="size-5 text-primary" />
              <h3 className="mt-4 font-display text-xl tracking-wide">{reason.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{reason.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
