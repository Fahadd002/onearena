import Link from "next/link";
import { ArrowUpRight, ExternalLink, MapPin, ShieldCheck, Star } from "lucide-react";

import { Badge } from "@/components/premium/Badge";
import { FacilityIcon } from "@/components/premium/facilityIcons";
import { cn } from "@/lib/utils";
import type { Turf } from "@/types/turf.type";

interface TurfCardProps {
  turf: Turf;
  className?: string;
  distance?: number;
}

export function TurfCard({ turf, className, distance }: TurfCardProps) {
  const image = turf.images?.[0];
  const facilities = turf.facilities?.map(({ facility }) => facility).slice(0, 3) ?? [];
  const reviewCount = turf._count?.reviews ?? turf.reviews?.length ?? 0;
  const rating = turf.reviews?.length
    ? turf.reviews.reduce((total, review) => total + review.rating, 0) / turf.reviews.length
    : null;
  const price = Number(turf.basePrice);

  return (
    <Link href={`/turfs/${turf.id}`} className={cn("group block h-full", className)}>
      <article className="surface-card relative flex h-full flex-col overflow-hidden rounded-3xl transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-elevated">
        <div className="relative aspect-[16/10] overflow-hidden bg-secondary">
          {image?.url ? (
            <img
              src={image.url}
              alt={image.altText || turf.name}
              className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex size-full items-center justify-center bg-gradient-to-br from-primary/20 via-secondary to-background">
              <span className="font-display text-4xl uppercase text-muted-foreground/40">{turf.name}</span>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-background/70 to-transparent" />
          <div className="absolute left-4 top-4 flex items-center gap-2">
            <Badge variant="primary" size="sm">{turf.category?.name || "Sports turf"}</Badge>
            <span className="inline-flex items-center gap-1 rounded-full bg-background/80 px-2.5 py-1 text-[11px] font-semibold text-foreground backdrop-blur">
              <ShieldCheck className="size-3 text-primary" /> Verified
            </span>
          </div>
          <span className="absolute bottom-4 left-4 text-xs font-medium text-foreground/90">Live availability</span>
        </div>

        <div className="flex flex-1 flex-col p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="line-clamp-1 text-xl font-semibold tracking-tight transition-colors group-hover:text-primary">{turf.name}</h3>
              <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="size-3.5 shrink-0" />
                <span className="line-clamp-1">{turf.area || turf.address}</span>
                {typeof distance === "number" && (
                  <span className="ml-auto shrink-0 text-xs text-primary">· {distance.toFixed(1)} km</span>
                )}
                {turf.latitude && turf.longitude && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      window.open(`https://www.google.com/maps/search/?api=1&query=${turf.latitude},${turf.longitude}`, "_blank");
                    }}
                    className="ml-auto inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
                    aria-label="Open map"
                  >
                    <ExternalLink className="size-3" /> Map
                  </button>
                )}
              </p>
            </div>
            {rating ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent/15 px-2.5 py-1 text-xs font-bold text-accent">
                <Star className="size-3 fill-current" /> {rating.toFixed(1)}
              </span>
            ) : null}
          </div>

          <div className="mt-5 flex min-h-7 flex-wrap gap-1.5">
            {facilities.map((facility) => (
              <span key={facility.id} className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-2 py-1 text-xs text-muted-foreground">
                <FacilityIcon name={facility.name} className="size-3" /> {facility.name}
              </span>
            ))}
            {reviewCount > 0 && <span className="self-center text-xs text-muted-foreground">{reviewCount} reviews</span>}
          </div>

          <div className="mt-5 flex items-end justify-between border-t border-border pt-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">From</p>
              <p className="mt-1 text-xl font-bold tracking-tight">৳ {price.toLocaleString()}<span className="ml-1 text-xs font-medium text-muted-foreground">/ slot</span></p>
            </div>
            <span className="inline-flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1">
              <ArrowUpRight className="size-4" />
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}