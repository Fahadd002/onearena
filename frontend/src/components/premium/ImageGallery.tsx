"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { TurfImage } from "@/types/turf.type";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ImageGalleryProps {
    images: TurfImage[];
    alt: string;
    className?: string;
}

export function ImageGallery({ images, alt, className }: ImageGalleryProps) {
    const [current, setCurrent] = useState(0);
    const [errorIndex, setErrorIndex] = useState<Set<number>>(new Set());
    const [touchStart, setTouchStart] = useState<number | null>(null);

    if (!images || images.length === 0) {
        return (
            <div className={cn("relative aspect-[16/9] w-full overflow-hidden rounded-2xl bg-muted", className)}>
                <div className="flex h-full w-full items-center justify-center">
                    <span className="text-3xl font-display text-muted-foreground/30">{alt || "Turf"}</span>
                </div>
            </div>
        );
    }

    const sortedImages = [...images].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    const currentImage = sortedImages[current];
    const hasError = errorIndex.has(current);
    const imageUrl = hasError ? "" : currentImage?.url;

    const next = () => setCurrent((c) => (c + 1) % sortedImages.length);
    const prev = () => setCurrent((c) => (c - 1 + sortedImages.length) % sortedImages.length);

    return (
        <div className={cn("relative group", className)}>
            <div
                className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl"
                onTouchStart={(event) => setTouchStart(event.touches[0]?.clientX ?? null)}
                onTouchEnd={(event) => {
                    if (touchStart === null) return;
                    const delta = (event.changedTouches[0]?.clientX ?? touchStart) - touchStart;
                    if (Math.abs(delta) > 40) (delta < 0 ? next : prev)();
                    setTouchStart(null);
                }}
            >
                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt={currentImage?.altText || `${alt} — image ${current + 1}`}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading={current === 0 ? "eager" : "lazy"}
                        onError={() => setErrorIndex((prev) => new Set(prev).add(current))}
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-secondary to-background">
                        <span className="text-3xl font-display text-muted-foreground/30">{alt || "Turf"}</span>
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
                {sortedImages.length > 1 && (
                    <>
                        <button
                            type="button"
                            onClick={prev}
                            className="absolute top-1/2 left-4 -translate-y-1/2 rounded-full bg-background/20 p-2 text-foreground/80 backdrop-blur-sm transition-all duration-200 hover:bg-background/40 hover:text-foreground"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button
                            type="button"
                            onClick={next}
                            className="absolute top-1/2 right-4 -translate-y-1/2 rounded-full bg-background/20 p-2 text-foreground/80 backdrop-blur-sm transition-all duration-200 hover:bg-background/40 hover:text-foreground"
                        >
                            <ChevronRight className="h-5 w-5" />
                        </button>
                    </>
                )}
                {sortedImages.length > 1 && (
                    <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
                        {sortedImages.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrent(idx)}
                                className={cn(
                                    "h-1.5 w-6 rounded-full transition-all duration-200",
                                    idx === current
                                        ? "w-10 bg-primary"
                                        : "bg-border/40 hover:bg-border/60"
                                )}
                            />
                        ))}
                    </div>
                )}
            </div>
            {sortedImages.length > 1 && (
                <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-6 lg:grid-cols-8">
                    {sortedImages.map((image, index) => (
                        <button
                            key={image.id}
                            type="button"
                            onClick={() => setCurrent(index)}
                            aria-label={`Show image ${index + 1}`}
                            className={cn("aspect-[4/3] overflow-hidden rounded-lg border-2 transition", index === current ? "border-primary" : "border-transparent opacity-70 hover:opacity-100")}
                        >
                            <img src={image.url} alt="" className="h-full w-full object-cover" loading="lazy" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
