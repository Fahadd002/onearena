"use client";

import { motion } from "motion/react";
import { Clock, Lock, Percent, RefreshCcw, ShieldCheck, Users } from "lucide-react";

const reasons = [
  {
    icon: Lock,
    title: "No double bookings",
    body: "Every slot is reserved inside a database transaction, so two teams can never claim the same hour.",
    color: "from-emerald-500 to-teal-500",
    bgColor: "from-emerald-500/10 to-teal-500/10",
  },
  {
    icon: Percent,
    title: "Transparent pricing",
    body: "Hourly price, advance and remaining balance are shown before you pay, and stored with the booking.",
    color: "from-amber-500 to-orange-500",
    bgColor: "from-amber-500/10 to-orange-500/10",
  },
  {
    icon: RefreshCcw,
    title: "Fair cancellations",
    body: "Refunds follow a published policy tied to how far ahead you cancel — not to the venue's mood.",
    color: "from-sky-500 to-blue-500",
    bgColor: "from-sky-500/10 to-blue-500/10",
  },
  {
    icon: ShieldCheck,
    title: "Verified owners",
    body: "Every venue is reviewed and approved by the OneArena team before it can accept bookings.",
    color: "from-violet-500 to-purple-500",
    bgColor: "from-violet-500/10 to-purple-500/10",
  },
  {
    icon: Clock,
    title: "Held for 15 minutes",
    body: "Your slot is secured while you complete payment, then released automatically if checkout is abandoned.",
    color: "from-rose-500 to-pink-500",
    bgColor: "from-rose-500/10 to-pink-500/10",
  },
  {
    icon: Users,
    title: "Built for regulars",
    body: "Favourites, booking history and reminders keep weekly squads running without group-chat chaos.",
    color: "from-indigo-500 to-blue-500",
    bgColor: "from-indigo-500/10 to-blue-500/10",
  },
];

export function WhyChooseUs() {
  return (
    <section className="relative py-16 sm:py-24 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto w-full max-w-7xl px-4 sm:px-6 relative z-10"
      >
        <div className="mx-auto text-center mb-16">
          <p className="text-xs uppercase tracking-[0.2em] text-primary mb-2">Why OneArena</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
            Built like a <span className="text-gradient-pitch">real marketplace</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Six reasons players and owners trust us for every match
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {reasons.map((reason, index) => (
            <motion.div
              key={reason.title}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="group relative rounded-2xl border border-border bg-card/80 p-6 backdrop-blur-sm transition-all duration-500 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/10 hover:bg-card hover:bg-gradient-to-br hover:from-primary/5 hover:to-accent/5"
            >
              <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" style={{ background: reason.bgColor }} />
              <div className="relative grid size-11 place-items-center rounded-xl text-primary transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3"
                style={{ background: reason.bgColor }}
              >
                <reason.icon className="size-5" />
              </div>
              <h3 className="relative mt-5 font-display text-lg tracking-wide text-foreground">{reason.title}</h3>
              <p className="relative mt-2 text-sm leading-relaxed text-muted-foreground">{reason.body}</p>
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: "100%" }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.3 + index * 0.08, ease: [0.22, 1, 0.36, 1] }}
                className="relative mt-5 h-px rounded-full opacity-50"
                style={{ background: reason.color }}
              />
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}