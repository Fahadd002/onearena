"use client";

import { motion } from "motion/react";
import { Quote, Star, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { httpClient } from "@/lib/axios/httpClient";
import { API_ENDPOINTS } from "@/lib/api/config";

type Review = { id: string; rating: number; comment?: string | null; user: { name: string }; turf: { name: string } };

export function Testimonials() {
  const [testimonials, setTestimonials] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    httpClient.get<Review[]>(API_ENDPOINTS.marketplace.reviews)
      .then((result) => setTestimonials((result.data ?? []).filter((item) => item.comment).slice(0, 6)))
      .catch(() => setTestimonials([]))
      .finally(() => setLoading(false));
  }, []);

  const itemsPerView = typeof window !== 'undefined' ? (window.innerWidth >= 1024 ? 3 : window.innerWidth >= 768 ? 2 : 1) : 3;
  const maxIndex = Math.max(0, testimonials.length - itemsPerView);

  if (loading) {
    return (
      <section className="border-y border-border/60 bg-surface/40 py-16 sm:py-24">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
          <div className="mx-auto text-center mb-16">
            <p className="text-xs uppercase tracking-[0.2em] text-primary mb-2">Loved on the pitch</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
              Proof from the <span className="text-gradient-pitch">pitch</span>
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3" role="status" aria-label="Loading reviews">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-6 animate-pulse">
                <div className="h-6 w-1/3 bg-muted rounded" />
                <div className="mt-4 space-y-3">
                  <div className="h-4 w-full bg-muted rounded" />
                  <div className="h-4 w-3/4 bg-muted rounded" />
                  <div className="h-4 w-1/2 bg-muted rounded" />
                </div>
                <div className="mt-5 flex gap-1">
                  {Array.from({ length: 5 }).map((_, starIndex) => (
                    <div key={starIndex} className="size-4 bg-muted rounded" />
                  ))}
                </div>
                <div className="mt-3 space-y-2">
                  <div className="h-6 w-1/3 bg-muted rounded" />
                  <div className="h-4 w-1/2 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (testimonials.length === 0) {
    return (
      <section className="border-y border-border/60 bg-surface/40 py-16 sm:py-24">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-primary mb-2">Loved on the pitch</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
            Proof from the <span className="text-gradient-pitch">pitch</span>
          </h2>
          <p className="mt-6 text-muted-foreground">Reviews from verified bookings will appear here.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="relative border-y border-border/60 bg-surface/40 py-16 sm:py-24 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/3 to-transparent" />
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto w-full max-w-7xl px-4 sm:px-6 relative z-10"
      >
        <div className="max-w-3xl mx-auto text-center mb-16">
          <p className="text-xs uppercase tracking-[0.2em] text-primary mb-2">Loved on the pitch</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
            Proof from the <span className="text-gradient-pitch">pitch</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Real players, real matches, real feedback
          </p>
        </div>

        <div className="relative">
          <div className="overflow-hidden">
            <motion.div
              layout
              className="flex gap-6 transition-transform duration-500 ease-[0.22,1,0.36,1]"
              style={{ transform: `translateX(-${currentIndex * (100 / itemsPerView)}%)` }}
            >
              {testimonials.map((item, index) => (
                <motion.figure
                  key={item.id}
                  initial={{ opacity: 0, y: 30, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.5, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
                  className="flex-[0_0_100%] min-w-0 max-w-full sm:max-w-[calc(50%-1.5rem)] lg:max-w-[calc(33.333%-2rem)] px-1"
                >
                  <div className="h-full rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10">
                    <Quote className="size-6 text-primary/70" />
                    <blockquote className="mt-4 text-sm leading-relaxed text-foreground/90">
                      {item.comment}
                    </blockquote>
                    <div className="mt-5 flex items-center gap-1 text-accent">
                      {Array.from({ length: item.rating }).map((_, starIndex) => (
                        <Star key={starIndex} className="size-4 fill-current" />
                      ))}
                    </div>
                    <figcaption className="mt-4">
                      <p className="font-display text-lg tracking-wide text-foreground">{item.user.name}</p>
                      <p className="text-xs text-muted-foreground">Verified booking at {item.turf.name}</p>
                    </figcaption>
                  </div>
                </motion.figure>
              ))}
            </motion.div>
          </div>

          {testimonials.length > itemsPerView && (
            <div className="mt-10 flex items-center justify-center gap-3">
              <motion.button
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                whileTap={{ scale: 0.9 }}
                className="flex size-10 items-center justify-center rounded-full border border-border bg-card text-foreground transition-all hover:border-primary/40 hover:bg-primary/5 disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Previous testimonial"
              >
                <ChevronLeft className="size-5" />
              </motion.button>
              <div className="flex gap-1.5" role="tablist" aria-label="Testimonial navigation">
                {Array.from({ length: maxIndex + 1 }).map((_, i) => (
                  <motion.button
                    key={i}
                    onClick={() => setCurrentIndex(i)}
                    whileTap={{ scale: 1.2 }}
                    className={`size-2 rounded-full transition-all ${
                      i === currentIndex ? "bg-primary w-6" : "bg-muted-foreground/40 hover:bg-muted-foreground/60"
                    }`}
                    role="tab"
                    aria-selected={i === currentIndex}
                    aria-label={`Go to testimonial ${i + 1}`}
                  />
                ))}
              </div>
              <motion.button
                onClick={() => setCurrentIndex((prev) => Math.min(maxIndex, prev + 1))}
                disabled={currentIndex === maxIndex}
                whileTap={{ scale: 0.9 }}
                className="flex size-10 items-center justify-center rounded-full border border-border bg-card text-foreground transition-all hover:border-primary/40 hover:bg-primary/5 disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Next testimonial"
              >
                <ChevronRight className="size-5" />
              </motion.button>
            </div>
          )}
        </div>
      </motion.div>
    </section>
  );
}