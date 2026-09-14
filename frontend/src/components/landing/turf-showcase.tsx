"use client";

import { motion } from "motion/react";
import { MapPin, Star } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { httpClient } from "@/lib/axios/httpClient";
import { API_ENDPOINTS } from "@/lib/api/config";

type ShowcaseTurf = {
  id: string;
  name: string;
  area: string | null;
  address: string;
  basePrice: string | number;
  rating: number;
  reviews: number;
  category: { id: string; name: string };
  distance?: number;
  images?: Array<{ url: string; altText?: string | null }>;
};

export function TurfShowcase() {
  const [turfs, setTurfs] = useState<ShowcaseTurf[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    httpClient.get<ShowcaseTurf[]>(API_ENDPOINTS.marketplace.turfs)
      .then((result) => setTurfs(result.data ?? []))
      .catch(() => { setTurfs([]); setError(true); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="pitch-lines relative py-20">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary">Nearby &amp; popular</p>
            <h2 className="mt-3 text-4xl uppercase sm:text-5xl">Turfs playing tonight</h2>
          </div>
          <Button variant="glass" size="lg" asChild>
            <Link href="/turfs">Browse all turfs</Link>
          </Button>
        </div>

        {loading ? (
          <p className="mt-10 text-muted-foreground">Loading turfs...</p>
        ) : error ? (
          <p className="mt-10 text-sm text-destructive" role="alert">Popular turfs are temporarily unavailable.</p>
        ) : (
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {turfs.map((turf, index) => (
              <motion.article
                key={turf.id}
                initial={{ opacity: 0, y: 26 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.55, delay: index * 0.08 }}
                className="group overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-glow"
              >
                <Link href={`/turfs/${turf.id}`} className="block">
                    <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                      {turf.images?.[0]?.url ? <img src={turf.images[0].url} alt={turf.images[0].altText || turf.name} className="size-full object-cover transition-transform duration-500 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center"><span className="font-display text-4xl text-muted-foreground/30">{turf.name[0]}</span></div>}
                    <Badge className="absolute left-3 top-3 bg-background/80 text-foreground backdrop-blur">
                      {turf.category.name}
                    </Badge>
                    {typeof turf.distance === "number" && (
                      <span className="absolute right-3 top-3 rounded-full bg-background/80 px-2.5 py-1 text-xs text-muted-foreground backdrop-blur">
                        {turf.distance.toFixed(1)} km
                      </span>
                    )}
                  </div>
                  <div className="space-y-3 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-display text-2xl leading-tight group-hover:text-primary transition-colors">{turf.name}</h3>
                      <span className="flex items-center gap-1 text-sm text-accent">
                        <Star className="size-4 fill-current" />
                        {turf.rating ?? "4.5"}
                      </span>
                    </div>
                    <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="size-3.5" /> {turf.area || turf.address}
                    </p>
                    <div className="flex items-center justify-between border-t border-border pt-4">
                      <div>
                        <p className="font-display text-2xl text-primary">
                          ৳{Number(turf.basePrice).toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">per hour</p>
                      </div>
                      <Button variant="hero" size="sm">
                        Book slot
                      </Button>
                    </div>
                  </div>
                </Link>
              </motion.article>
            ))}
            {!loading && !error && turfs.length === 0 && (
              <p className="text-muted-foreground">No active turfs found.</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
