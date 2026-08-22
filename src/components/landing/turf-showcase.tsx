"use client";

import { motion } from "motion/react";
import { MapPin, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type ShowcaseTurf = {
  name: string;
  area: string;
  sport: string;
  price: number;
  rating: number;
  reviews: number;
  image: string;
  distance: string;
};

const turfs: ShowcaseTurf[] = [
  {
    name: "Arena 11 Sports Club",
    area: "Bashundhara R/A, Dhaka",
    sport: "Football",
    price: 2400,
    rating: 4.8,
    reviews: 214,
    image: "/assets/football-turf.jpg",
    distance: "2.1 km",
  },
  {
    name: "Skyline Cricket Nets",
    area: "Uttara Sector 7, Dhaka",
    sport: "Cricket",
    price: 1800,
    rating: 4.6,
    reviews: 132,
    image: "/assets/cricket-turf.jpg",
    distance: "4.7 km",
  },
  {
    name: "Floodlight Turf Dhanmondi",
    area: "Dhanmondi 27, Dhaka",
    sport: "Football & cricket",
    price: 3000,
    rating: 4.9,
    reviews: 341,
    image: "/assets/hero-turf.jpg",
    distance: "1.3 km",
  },
];

export function TurfShowcase() {
  return (
    <section className="pitch-lines relative py-20">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary">Nearby &amp; popular</p>
            <h2 className="mt-3 text-4xl uppercase sm:text-5xl">Turfs playing tonight</h2>
          </div>
          <Button variant="glass" size="lg">
            Browse all turfs
          </Button>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {turfs.map((turf, index) => (
            <motion.article
              key={turf.name}
              initial={{ opacity: 0, y: 26 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.55, delay: index * 0.08 }}
              className="group overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-glow"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <img
                  src={turf.image}
                  alt={`${turf.name} in ${turf.area}`}
                  loading="lazy"
                  width={1280}
                  height={960}
                  className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <Badge className="absolute left-3 top-3 bg-background/80 text-foreground backdrop-blur">
                  {turf.sport}
                </Badge>
                <span className="absolute right-3 top-3 rounded-full bg-background/80 px-2.5 py-1 text-xs text-muted-foreground backdrop-blur">
                  {turf.distance}
                </span>
              </div>

              <div className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-display text-2xl leading-tight">{turf.name}</h3>
                  <span className="flex items-center gap-1 text-sm text-accent">
                    <Star className="size-4 fill-current" />
                    {turf.rating}
                  </span>
                </div>

                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="size-3.5" /> {turf.area}
                </p>

                <div className="flex items-center justify-between border-t border-border pt-4">
                  <div>
                    <p className="font-display text-2xl text-primary">
                      ৳{turf.price.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">per hour · {turf.reviews} reviews</p>
                  </div>
                  <Button variant="hero" size="sm">
                    Book slot
                  </Button>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
