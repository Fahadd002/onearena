"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SlidersHorizontal, LocateFixed, ArrowUpDown, ChevronDown, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useCategoryOptions } from "@/hooks/useCategoryOptions";
import { AnchoredPopover } from "./AnchoredPopover";
import {
  SORT_OPTIONS,
  DEFAULT_SORT,
  activeFilterCount,
  sanitizeAmount,
  isPriceRangeInverted,
  type Filters,
} from "./searchFilters";

interface Props {
  geo: { lat: number; lng: number } | null;
  locating: boolean;
  onNearby: () => void;
  radius: number;
  onRadius: (v: number) => void;
  filters: Filters;
  onFilters: (f: Filters) => void;
}

/** Category / filters / nearby / sort controls, shown above the time buckets. */
export function SearchBar({
  geo,
  locating,
  onNearby,
  radius,
  onRadius,
  filters,
  onFilters,
}: Props) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const filtersBtnRef = useRef<HTMLButtonElement>(null);
  const sortBtnRef = useRef<HTMLButtonElement>(null);
  const categoryBtnRef = useRef<HTMLButtonElement>(null);
  const { options: categories, loading: categoriesLoading } = useCategoryOptions();

  const categoryChoices = useMemo(
    () => [{ value: "", label: "All categories" }, ...categories],
    [categories],
  );
  const selectedCategory = categories.find((c) => c.value === filters.categoryId)?.label;

  // Only one popover at a time.
  useEffect(() => {
    if (!filtersOpen && !sortOpen && !categoryOpen) return;
    const onScroll = (e: Event) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest?.("[data-popover-panel]")) return;
      setFiltersOpen(false);
      setSortOpen(false);
      setCategoryOpen(false);
    };
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, [filtersOpen, sortOpen, categoryOpen]);

  const set = (patch: Partial<Filters>) => onFilters({ ...filters, ...patch });

  const activeCount = activeFilterCount(filters);
  const sortOption =
    SORT_OPTIONS.find((o) => o.sortBy === filters.sortBy && o.sortOrder === filters.sortOrder) ??
    DEFAULT_SORT;

  const clearFilters = () =>
    set({
      categoryId: "",
      minPrice: "",
      maxPrice: "",
      sortBy: DEFAULT_SORT.sortBy,
      sortOrder: DEFAULT_SORT.sortOrder,
    });
  const priceError = isPriceRangeInverted(filters.minPrice, filters.maxPrice);

  const categoryButton = (
    <div className="relative shrink-0">
      <button
        ref={categoryBtnRef}
        type="button"
        role="combobox"
        aria-controls="turf-filter-category-list"
        aria-expanded={categoryOpen}
        aria-label="Filter by category"
        onClick={() => {
          setCategoryOpen((o) => !o);
          setFiltersOpen(false);
          setSortOpen(false);
        }}
        className={`inline-flex h-7 max-w-[7rem] min-w-[4.25rem] items-center justify-between gap-1 rounded-full border px-2 text-[10px] font-semibold transition-colors duration-200 ${
          categoryOpen || filters.categoryId
            ? "border-primary/50 bg-primary/10 text-primary"
            : "border-border/60 bg-card text-foreground hover:border-neutral-400/50 hover:bg-neutral-500/10"
        }`}
      >
        <span className={`truncate ${filters.categoryId ? "" : "text-muted-foreground"}`}>
          {selectedCategory ?? (categoriesLoading ? "Loading…" : "All categories")}
        </span>
        <ChevronDown
          className={`size-2.5 shrink-0 transition-transform ${categoryOpen ? "rotate-180" : ""}`}
        />
      </button>

      <AnchoredPopover
        open={categoryOpen}
        onClose={() => setCategoryOpen(false)}
        anchorRef={categoryBtnRef}
        width={150}
        maxHeight={288}
      >
        <ul
          id="turf-filter-category-list"
          role="listbox"
          aria-label="Category"
          className="max-h-[288px] overflow-y-auto overscroll-contain p-1"
        >
          {categoryChoices.map((c) => {
            const selected = c.value === filters.categoryId;
            return (
              <li key={c.value || "__all"}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    set({ categoryId: c.value });
                    setCategoryOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold transition ${
                    selected
                      ? "bg-primary/10 text-primary"
                      : "text-foreground/80 hover:bg-neutral-500/10"
                  }`}
                >
                  <span className="truncate">{c.label}</span>
                  {selected && <Check className="size-3.5 shrink-0" strokeWidth={3} />}
                </button>
              </li>
            );
          })}
        </ul>
      </AnchoredPopover>
    </div>
  );

  const filtersButton = (
    <div className="relative shrink-0">
      <button
        ref={filtersBtnRef}
        type="button"
        onClick={() => {
          setFiltersOpen((o) => !o);
          setSortOpen(false);
          setCategoryOpen(false);
        }}
        aria-expanded={filtersOpen}
        aria-label="Open filters"
        className={`group inline-flex h-7 min-w-[4.25rem] shrink-0 items-center justify-center gap-1 rounded-full border px-2 text-[10px] font-bold transition-colors duration-200 ${
          filtersOpen || activeCount
? "border-primary bg-gradient-to-r from-primary to-primary-glow text-primary-foreground"
            : "border-border/60 bg-card text-foreground hover:border-neutral-400/50 hover:bg-neutral-500/10"
        }`}
      >
        <SlidersHorizontal
          className={`size-3 transition-transform group-hover:rotate-90 ${
            filtersOpen || activeCount ? "" : "text-foreground/70"
          }`}
        />
        <span>Filters</span>
        
        <ChevronDown
          className={`size-2.5 shrink-0 transition-transform ${filtersOpen ? "rotate-180" : ""}`}
        />
      </button>

      <AnchoredPopover
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        anchorRef={filtersBtnRef}
        width={290}
        maxHeight={460}
      >
        <div className="max-h-[460px] overflow-y-auto overscroll-contain p-4">
          {/* Price range */}
          <div className="space-y-1.5">
            <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Price range (৳)
            </span>
            <div className="flex items-center gap-2">
              <Input
                type="text"
                inputMode="decimal"
                placeholder="Min"
                aria-label="Minimum price"
                value={filters.minPrice}
                onChange={(e) => set({ minPrice: sanitizeAmount(e.target.value) })}
                className="h-10 rounded-xl border-border text-xs tabular-nums shadow-none"
              />
              <span className="shrink-0 text-muted-foreground">–</span>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="Max"
                aria-label="Maximum price"
                value={filters.maxPrice}
                onChange={(e) => set({ maxPrice: sanitizeAmount(e.target.value) })}
                className={`h-10 rounded-xl border-border text-xs tabular-nums shadow-none ${
                  priceError ? "border-destructive" : ""
                }`}
              />
            </div>
            {priceError && (
              <p className="text-[10px] font-semibold text-destructive">
                Min price must be less than max.
              </p>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3">
            <span className="text-[10px] font-semibold text-muted-foreground">
              {activeCount
                ? `${activeCount} filter${activeCount > 1 ? "s" : ""} active`
                : "No filters applied"}
            </span>
            <button
              type="button"
              onClick={clearFilters}
              disabled={!activeCount}
              className="rounded-full border border-border/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground transition hover:border-neutral-400/50 hover:bg-neutral-500/10 hover:text-foreground disabled:opacity-40 disabled:hover:border-border/60 disabled:hover:bg-transparent"
            >
              Clear
            </button>
          </div>
        </div>
      </AnchoredPopover>
    </div>
  );

  const nearbyButton = (
    <button
      type="button"
      onClick={onNearby}
      disabled={locating}
      aria-pressed={!!geo}
      className={`group inline-flex h-7 min-w-[4.25rem] shrink-0 items-center justify-center gap-1 rounded-full border px-2 text-[10px] font-bold transition-colors duration-200 disabled:opacity-60 ${
        geo
          ? "border-primary bg-gradient-to-r from-primary to-primary-glow text-primary-foreground"
          : "border-border/60 bg-card text-foreground hover:border-neutral-400/50 hover:bg-neutral-500/10"
      }`}
    >
      <LocateFixed
        className={`size-3 transition-transform ${
          locating ? "animate-spin" : "group-hover:scale-110"
        }`}
      />
      <span>{geo ? "Near me" : "Nearby"}</span>
    </button>
  );

  const sortButton = (
    <div className="relative min-w-0 shrink-0">
      <button
        ref={sortBtnRef}
        type="button"
        onClick={() => {
          setSortOpen((o) => !o);
          setFiltersOpen(false);
          setCategoryOpen(false);
        }}
        aria-expanded={sortOpen}
        aria-label="Sort results"
        className="group inline-flex h-7 min-w-[4.25rem] max-w-[9rem] shrink-0 items-center justify-center gap-1 rounded-full border border-border/60 bg-card px-2 text-[10px] font-bold text-foreground transition-colors duration-200 hover:border-neutral-400/50 hover:bg-neutral-500/10"
      >
        <ArrowUpDown className="size-3 shrink-0 text-foreground/70 transition-transform group-hover:scale-110" />
        <span className="truncate">{sortOption.label}</span>
        <ChevronDown
          className={`size-2.5 shrink-0 transition-transform ${sortOpen ? "rotate-180" : ""}`}
        />
      </button>

      <AnchoredPopover
        open={sortOpen}
        onClose={() => setSortOpen(false)}
        anchorRef={sortBtnRef}
        width={210}
        maxHeight={300}
      >
        <div className="max-h-[300px] overflow-y-auto overscroll-contain p-1.5">
          {SORT_OPTIONS.map((o) => {
            const selected = o.sortBy === filters.sortBy && o.sortOrder === filters.sortOrder;
            return (
              <button
                key={o.label}
                type="button"
                onClick={() => {
                  set({ sortBy: o.sortBy, sortOrder: o.sortOrder });
                  setSortOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-semibold transition ${
                  selected
                    ? "bg-primary/10 text-primary"
                    : "text-foreground/80 hover:bg-neutral-500/10"
                }`}
              >
                <span className="truncate">{o.label}</span>
                {selected && <Check className="size-3.5 shrink-0" strokeWidth={3} />}
              </button>
            );
          })}
        </div>
      </AnchoredPopover>
    </div>
  );

  const radiusRow = geo ? (
    /* `appearance-none` strips the native thumb, so it is restyled below. */
    <div className="flex min-w-0 items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 py-0.5 pl-2.5 pr-1 animate-in fade-in slide-in-from-top-1">
      <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider text-primary/80">
        Radius
      </span>
      <input
        type="range"
        min={1}
        max={50}
        step={1}
        value={radius}
        onChange={(e) => onRadius(Number(e.target.value))}
        aria-label="Search radius in kilometers"
        aria-valuetext={`${radius} kilometers`}
        className="h-3.5 min-w-0 flex-1 cursor-pointer appearance-none bg-transparent
          [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-primary/20
          [&::-webkit-slider-thumb]:mt-[-5px] [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-thumb]:bg-background [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:active:scale-110
          [&::-moz-range-track]:h-1 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-primary/20
          [&::-moz-range-thumb]:size-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-primary [&::-moz-range-thumb]:bg-background"
      />
      <span className="w-10 shrink-0 rounded-full bg-primary/10 py-px text-center text-[9px] font-extrabold tabular-nums text-primary">
        {radius} km
      </span>
    </div>
  ) : null;

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="no-scrollbar -mx-1 flex snap-x items-center gap-1 overflow-x-auto px-1">
        {categoryButton}
        {filtersButton}
        {nearbyButton}
        {sortButton}
      </div>
      {radiusRow}
    </div>
  );
}
