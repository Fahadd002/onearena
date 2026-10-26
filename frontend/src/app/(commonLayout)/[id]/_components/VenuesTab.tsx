"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { Building2, Clock, MapPin, Star, Zap } from "lucide-react";

import { getFileUrl } from "@/lib/utils";
import type { OwnerLandingPage } from "@/types/owner-landing.type";

const EASE = [0.22, 1, 0.36, 1] as const;

export default function VenuesTab({ data }: { data: OwnerLandingPage }) {
  const router = useRouter();

  if (!data.turfs.length) {
    return (
      <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-2">
          <Building2 className="size-4 text-primary" />
          <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Our Playing Grounds
          </h2>
        </div>
        <p className="mt-5 text-sm text-muted-foreground">No venues listed yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-2">
        <Building2 className="size-4 text-primary" />
        <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Our Playing Grounds
        </h2>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Handpicked turf destinations, ready for your next match.
      </p>

      <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {data.turfs.map((turf, i) => {
          const cover = getFileUrl(turf.images[0]?.url);
          const mapUrl = `https://www.google.com/maps/search/?api=1&query=${turf.latitude},${turf.longitude}`;
          return (
            <motion.div
              key={turf.id}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: (i % 3) * 0.1, ease: EASE }}
              whileHover={{ y: -6 }}
              onClick={() => router.push(`/turfs/${turf.id}`)}
              className="group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-border/60 bg-card transition-shadow duration-500 hover:shadow-2xl hover:shadow-primary/10"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-muted/50">
                {cover ? (
                  <Image
                    src={cover}
                    alt={turf.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.08]"
                  />
                ) : (
                  <div className="grid size-full place-items-center text-xs text-muted-foreground">
                    No image
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

                {turf.categoryName && (
                  <span className="absolute left-3 top-3 rounded-full border border-white/20 bg-white/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white backdrop-blur-md">
                    {turf.categoryName}
                  </span>
                )}

                {turf.rating.average && (
                  <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full border border-white/20 bg-black/40 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-md">
                    <Star className="size-3 fill-amber-400 text-amber-400" />
                    {turf.rating.average}
                  </span>
                )}

                <h3 className="absolute bottom-3 left-3 right-3 line-clamp-1 text-lg font-black text-white drop-shadow-lg">
                  {turf.name}
                </h3>
              </div>

              <div className="flex flex-1 flex-col gap-3 p-4">
                {turf.description && (
                  <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {turf.description}
                  </p>
                )}

                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <MapPin className="size-3.5 shrink-0 text-primary" />
                  <span className="line-clamp-2 min-w-0 flex-1">{turf.address}</span>
                  {turf.latitude && turf.longitude && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        window.open(mapUrl, "_blank", "noopener,noreferrer");
                      }}
                      className="shrink-0 whitespace-nowrap text-[10px] font-bold text-primary hover:underline"
                    >
                      Map →
                    </button>
                  )}
                </div>

                {turf.facilities.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {turf.facilities.slice(0, 4).map((f) => (
                      <span
                        key={f.name}
                        className="inline-flex items-center gap-1 rounded-md bg-muted/70 px-2 py-0.5 text-[10px] font-medium text-muted-foreground ring-1 ring-border/40"
                      >
                        <Zap className="size-3 text-primary/70" />
                        {f.name}
                      </span>
                    ))}
                    {turf.facilities.length > 4 && (
                      <span className="text-[10px] font-medium text-muted-foreground">
                        +{turf.facilities.length - 4}
                      </span>
                    )}
                  </div>
                )}

                <div className="mt-auto flex items-center justify-between border-t border-border/40 pt-3">
                  <div className="flex items-center gap-1.5">
                    <Star className="size-3.5 fill-amber-400 text-amber-400" />
                    <span className="text-sm font-bold text-foreground">
                      {turf.rating.average || "New"}
                    </span>
                    {turf.rating.count > 0 && (
                      <span className="text-[10px] text-muted-foreground">
                        ({turf.rating.count})
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-primary">
                      ৳{turf.defaultSlotPrice.toLocaleString()}
                    </p>
                    <p className="flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
                      <Clock className="size-3" />
                      {turf.defaultSlotDuration} min
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}