"use client";

import { motion } from "motion/react";
import { Quote, Star } from "lucide-react";

const testimonials = [
  {
    quote:
      "We run a Friday night league of six teams. Booking used to be five phone calls — now it takes a minute.",
    name: "Tanvir Hasan",
    role: "Team captain, Dhanmondi",
    rating: 5,
  },
  {
    quote:
      "The advance payment killed our no-show problem. Occupancy on weekday evenings is up nearly 40%.",
    name: "Rifat Chowdhury",
    role: "Owner, Arena 11 Sports Club",
    rating: 5,
  },
  {
    quote:
      "Cricket nets with clear slot timings and honest pricing. The confirmation email has everything.",
    name: "Nusrat Jahan",
    role: "Club coach, Uttara",
    rating: 4,
  },
];

export function Testimonials() {
  return (
    <section className="border-y border-border/60 bg-surface/40 py-20">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        <p className="text-xs uppercase tracking-[0.2em] text-primary">Loved on the pitch</p>
        <h2 className="mt-3 text-4xl uppercase sm:text-5xl">What players and owners say</h2>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {testimonials.map((item, index) => (
            <motion.figure
              key={item.name}
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
              className="rounded-2xl border border-border bg-card p-6"
            >
              <Quote className="size-6 text-primary/70" />
              <blockquote className="mt-4 text-sm leading-relaxed text-foreground/90">
                {item.quote}
              </blockquote>
              <div className="mt-5 flex items-center gap-1 text-accent">
                {Array.from({ length: item.rating }).map((_, starIndex) => (
                  <Star key={starIndex} className="size-4 fill-current" />
                ))}
              </div>
              <figcaption className="mt-3">
                <p className="font-display text-xl tracking-wide">{item.name}</p>
                <p className="text-xs text-muted-foreground">{item.role}</p>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}
