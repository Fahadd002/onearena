"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MapPinOff, RotateCcw } from "lucide-react";

import { ymd } from "@/lib/slotsUtils";
import { NAVBAR_HEIGHT, TURF_SECTION_ID } from "@/lib/turfs";

import { CartBar } from "./CartBar";
import { CheckoutDrawer } from "./CheckoutDrawer";
import { TurfRow, visibleSlotsOf } from "./TurfRow";
import { TurfRowSkeleton } from "./TurfRowSkeleton";
import { TurfSearchDeck } from "./TurfSearchDeck";
import { useTurfExplorer } from "./TurfExplorerProvider";
import { useIsMounted } from "./useIsToday";

/** Strip of video left between the headline block and the sheet, and the sheet's own padding. */
const SHEET_GAP = 48;
const SHEET_PAD = 12;

export function TurfList() {
  const {
    turfs,
    meta,
    isLoading,
    date,
    bucket,
    cart,
    toggle,
    selectSlot,
    drawerOpen,
    openDrawer,
    closeDrawer,
    onCartChange,
    page,
    setPage,
    hasActiveFilters,
    resetAll,
    bannerRef,
    copyRef,
  } = useTurfExplorer();

  const rootRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<HTMLDivElement>(null);
  const mounted = useIsMounted();
  const [solid, setSolid] = useState(false);
  const [deckAtTop, setDeckAtTop] = useState(false);

  useEffect(() => {
    const sync = () => {
      /* The deck sits 64px down while the navbar is up, so it can only take the
         top of the viewport once its own natural top reaches it — sticky never
         pulls an element up to its threshold. The navbar leaves on the same
         line (see site-header.tsx), so the handover leaves no bare banner, and
         the sheet turns solid with it so no translucent strip shows under the
         pinned deck. */
      const y = window.scrollY;
      const rect = rootRef.current?.getBoundingClientRect();
      const atTop =
        y > NAVBAR_HEIGHT &&
        !!rect &&
        rect.top <= 0 &&
        rect.bottom > NAVBAR_HEIGHT;

      setDeckAtTop(atTop);
      setSolid(atTop);
    };

    /* Same rAF cadence as the navbar, so both flip on the same frame. */
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        sync();
      });
    };

    sync();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  useEffect(() => {
    const measure = () => {
      const banner = bannerRef.current;
      const copy = copyRef.current;
      const deck = deckRef.current;
      if (!banner || !copy || !deck) return;

      const bannerBox = banner.getBoundingClientRect();
      const copyBottom = copy.getBoundingClientRect().bottom - bannerBox.top;
      const overlap = Math.max(0, bannerBox.height - copyBottom - SHEET_GAP + SHEET_PAD);

      document.documentElement.style.setProperty("--hero-overlap", `${Math.round(overlap)}px`);
    };

    measure();

    const observer = new ResizeObserver(measure);
    if (deckRef.current) observer.observe(deckRef.current);
    window.addEventListener("resize", measure);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      document.documentElement.style.removeProperty("--hero-overlap");
    };
  }, [bannerRef, copyRef]);

  /* Once a slot is picked, only that turf's row stays: one booking, one venue. */
  const pickedTurfIds = new Set(cart.map((slot) => slot.turfId));
  const pickedTurfs = turfs.filter((turf) => pickedTurfIds.has(turf.id));
  /* A pick restored from another page may not be in this one; then show everything. */
  const hasPicked = pickedTurfs.length > 0;
  const visibleTurfs = (hasPicked ? pickedTurfs : turfs).filter(
    (turf) => visibleSlotsOf(turf, date, bucket, mounted).length > 0,
  );

  return (
    <div
      id={TURF_SECTION_ID}
      ref={rootRef}
      className={`turf-hero-overlap relative z-10 transition-colors duration-[500ms] ${solid ? "bg-background" : "bg-transparent"
        }`}
    >
      <div className="mx-auto max-w-screen-2xl px-4  sm:px-6 lg:px-8">
        <TurfSearchDeck deckRef={deckRef} atTop={deckAtTop} />

        <div
          id="turfs"
          aria-busy={isLoading}
          className={`scroll-mt-40 transition-[padding] duration-[400ms] ${
            deckAtTop ? "pt-12" : "pt-6"
          }`}
        >
          {isLoading ? (
            <TurfRowSkeleton />
          ) : visibleTurfs.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border/60 bg-card/50 py-8 text-center animate-in fade-in slide-in-from-bottom-2">
              <div className="flex size-14 items-center justify-center rounded-full bg-muted">
                <MapPinOff className="size-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">No venues found</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Try adjusting filters, area, or date
                </p>
              </div>
              {hasActiveFilters && (
                <button
                  onClick={resetAll}
                  className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background px-3.5 py-1.5 text-[11px] font-bold text-foreground transition hover:border-neutral-400/50 hover:bg-neutral-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  <RotateCcw className="size-3" />
                  Reset all filters
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              {visibleTurfs.map((turf) => (
                <TurfRow
                  key={turf.id}
                  turf={turf}
                  date={date}
                  bucket={bucket}
                  cart={cart}
                  toggle={toggle}
                  onSelect={selectSlot}
                  surface={solid ? "solid" : "frosted"}
                />
              ))}
            </div>
          )}

          {!hasPicked && meta && meta.totalPages > 1 && (
            <nav
              aria-label="Turf results pages"
              className="mt-5 flex items-center justify-center gap-1"
            >
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                aria-label="Previous page of turf results"
                className="rounded-full border border-border/60 bg-card px-4 py-2 text-xs font-bold text-foreground transition-all hover:border-neutral-400/50 hover:bg-neutral-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-40 disabled:hover:border-border/60 disabled:hover:bg-card"
              >
                ← Previous
              </button>
              <span
                aria-live="polite"
                aria-atomic="true"
                className="min-w-[5rem] rounded-full border border-border/60 bg-card px-3 py-2 text-center text-xs font-bold tabular-nums text-foreground"
              >
                {meta.page} <span className="text-muted-foreground/40">/</span> {meta.totalPages}
              </span>
              <button
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
                aria-label="Next page of turf results"
                className="rounded-full border border-border/60 bg-card px-4 py-2 text-xs font-bold text-foreground transition-all hover:border-neutral-400/50 hover:bg-neutral-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-40 disabled:hover:border-border/60 disabled:hover:bg-card"
              >
                Next →
              </button>
            </nav>
          )}
        </div>
      </div>

      {typeof document !== "undefined" && (
        <>
          {createPortal(<CartBar count={cart.length} onCheckout={openDrawer} />, document.body)}
          {createPortal(<CheckoutDrawer isOpen={drawerOpen} onClose={closeDrawer} cart={cart} date={ymd(date)} onCartChange={onCartChange} />, document.body)}
        </>
      )}
    </div>
  );
}