"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Expand, Image as ImageIcon, ImageOff, X } from "lucide-react";
import { getFileUrl } from "@/lib/utils";

type GalleryItem = {
  id: string;
  imageUrl: string;
  title?: string | null;
  description?: string | null;
};

function GalleryTile({
  item,
  index,
  onOpen,
}: {
  item: GalleryItem;
  index: number;
  onOpen: (i: number) => void;
}) {
  const src = getFileUrl(item.imageUrl);
  const [ratio, setRatio] = useState<number | null>(null);

  return (
    <motion.figure
      initial={{ opacity: 0, scale: 0.92, y: 20 }}
      whileInView={{ opacity: 1, scale: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{
        duration: 0.5,
        delay: (index % 8) * 0.06,
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={{ y: -4 }}
      style={ratio ? { aspectRatio: String(ratio) } : undefined}
      className={`group relative mb-3 break-inside-avoid overflow-hidden rounded-lg bg-muted ring-1 ring-border/40 transition-shadow duration-300 hover:shadow-lg ${ratio ? "" : "aspect-[4/3]"} sm:mb-4`}
    >
      {src ? (
        <>
          <Image
            src={src}
            alt={item.title || "Gallery image"}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            onLoad={(e) => {
              const img = e.currentTarget;
              if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                setRatio(img.naturalWidth / img.naturalHeight);
              }
            }}
            className="object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.08]"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          <div className="pointer-events-none absolute right-3 top-3 flex size-9 translate-y-2 items-center justify-center rounded-full border border-white/25 bg-white/15 text-white opacity-0 backdrop-blur transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
            <Expand className="size-4" />
          </div>
          <button
            type="button"
            onClick={() => onOpen(index)}
            aria-label={
              item.title ? `View ${item.title}` : `View gallery image ${index + 1}`
            }
            className="absolute inset-0 cursor-zoom-in"
          />
          {(item.title || item.description) && (
            <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-3 p-4 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
              {item.title && (
                <p className="line-clamp-1 text-sm font-bold text-white drop-shadow">
                  {item.title}
                </p>
              )}
              {item.description && (
                <p className="mt-0.5 line-clamp-2 text-xs text-white/85">
                  {item.description}
                </p>
              )}
            </figcaption>
          )}
        </>
      ) : (
        /* The stored path could not be resolved — keep the slot so the item is
           still counted and visible instead of vanishing from the grid. */
        <div className="absolute inset-0 grid place-items-center bg-muted p-4 text-center">
          <div>
            <ImageOff className="mx-auto size-6 text-muted-foreground/60" />
            <p className="mt-2 line-clamp-1 text-xs font-medium text-muted-foreground">
              {item.title || "Image unavailable"}
            </p>
          </div>
        </div>
      )}
    </motion.figure>
  );
}

function Lightbox({
  items,
  index,
  onClose,
  onPrev,
  onNext,
}: {
  items: GalleryItem[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const item = items[index];
  const src = item ? getFileUrl(item.imageUrl) : null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, onPrev, onNext]);

  if (!src) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 z-10 flex size-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
      >
        <X className="size-5" />
      </button>
      <div className="absolute left-4 top-4 z-10 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
        {index + 1} / {items.length}
      </div>
      {items.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          aria-label="Previous"
          className="absolute left-3 top-1/2 z-10 flex size-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20 sm:left-6"
        >
          <ChevronLeft className="size-6" />
        </button>
      )}
      {items.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          aria-label="Next"
          className="absolute right-3 top-1/2 z-10 flex size-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20 sm:right-6"
        >
          <ChevronRight className="size-6" />
        </button>
      )}
      <AnimatePresence mode="wait">
        <motion.div
          key={item.id}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="relative mx-4 max-h-[85vh] w-full max-w-5xl"
        >
          <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-black shadow-2xl">
            <Image
              src={src}
              alt={item.title || "Gallery image"}
              fill
              sizes="90vw"
              className="object-contain"
              priority
            />
          </div>
          {(item.title || item.description) && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.4 }}
              className="mx-auto mt-4 max-w-2xl rounded-xl border border-white/10 bg-white/5 px-5 py-4 text-center backdrop-blur"
            >
              {item.title && (
                <p className="text-base font-bold text-white">{item.title}</p>
              )}
              {item.description && (
                <p className="mt-1 text-sm text-white/70">
                  {item.description}
                </p>
              )}
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

export default function GallerySection({ items }: { items: GalleryItem[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const open = useCallback((i: number) => setActiveIndex(i), []);
  const close = useCallback(() => setActiveIndex(null), []);
const prev = useCallback(
    () =>
      setActiveIndex((i) =>
        i === null ? null : (i - 1 + items.length) % items.length,
      ),
    [items.length],
  );
  const next = useCallback(
    () => setActiveIndex((i) => (i === null ? null : (i + 1) % items.length)),
    [items.length],
  );

if (!items.length) return null;

  return (
    <div className="rounded-xl border border-border/70 bg-card p-5 shadow-sm sm:p-7">
      <div className="flex items-center gap-2">
        <ImageIcon className="size-4 text-primary" />
        <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Gallery
        </h2>
      </div>

      <div className="mt-4 columns-2 gap-3 sm:columns-3 sm:gap-4 lg:columns-4">
        {items.map((item, i) => (
          <GalleryTile
            key={item.id}
            item={item}
            index={i}
            onOpen={open}
          />
        ))}
      </div>

      <AnimatePresence>
        {activeIndex !== null && (
          <Lightbox
            items={items}
            index={activeIndex}
            onClose={close}
            onPrev={prev}
            onNext={next}
          />
        )}
      </AnimatePresence>
    </div>
  );
}