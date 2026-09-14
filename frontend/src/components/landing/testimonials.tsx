"use client";

import { motion } from "motion/react";
import { Quote, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { httpClient } from "@/lib/axios/httpClient";
import { API_ENDPOINTS } from "@/lib/api/config";

type Review = { id: string; rating: number; comment?: string | null; user: { name: string }; turf: { name: string } };

export function Testimonials() {
  const [testimonials, setTestimonials] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    httpClient.get<Review[]>(API_ENDPOINTS.marketplace.reviews)
      .then((result) => setTestimonials((result.data ?? []).filter((item) => item.comment).slice(0, 3)))
      .catch(() => setTestimonials([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="border-y border-border/60 bg-surface/40 py-20">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        <p className="text-xs uppercase tracking-[0.2em] text-primary">Loved on the pitch</p>
        <h2 className="mt-3 text-4xl uppercase sm:text-5xl">Proof from the pitch</h2>

        {loading ? <p className="mt-10 text-muted-foreground" role="status">Loading reviews...</p> : testimonials.length === 0 ? <p className="mt-10 text-muted-foreground">Reviews from verified bookings will appear here.</p> : <div className="mt-12 grid gap-6 md:grid-cols-3">
          {testimonials.map((item, index) => (
            <motion.figure
              key={item.id}
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
              className="rounded-2xl border border-border bg-card p-6"
            >
              <Quote className="size-6 text-primary/70" />
              <blockquote className="mt-4 text-sm leading-relaxed text-foreground/90">
                {item.comment}
              </blockquote>
              <div className="mt-5 flex items-center gap-1 text-accent">
                {Array.from({ length: item.rating }).map((_, starIndex) => (
                  <Star key={starIndex} className="size-4 fill-current" />
                ))}
              </div>
              <figcaption className="mt-3">
                <p className="font-display text-xl tracking-wide">{item.user.name}</p>
                <p className="text-xs text-muted-foreground">Verified booking at {item.turf.name}</p>
              </figcaption>
            </motion.figure>
          ))}
        </div>}
      </div>
    </section>
  );
}
