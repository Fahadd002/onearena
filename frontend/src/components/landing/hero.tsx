"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { LocateFixed, MapPin, Search, SlidersHorizontal, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TurfCard } from "@/components/premium/TurfCard";
import { TablePagination } from "@/components/common/TablePagination";
import { toast } from "sonner";
import { httpClient } from "@/lib/axios/httpClient";
import { API_ENDPOINTS } from "@/lib/api/config";
import { useCategoryOptions } from "@/hooks/useCategoryOptions";
import { usePagination } from "@/hooks/usePagination";
import { useQuery } from "@tanstack/react-query";
import type { Turf } from "@/types/turf.type";

const scenes = [
  { key: "football", video: "/assets/hero-football.mp4", label: "Football", caption: "The strike" },
  { key: "cricket", video: "/assets/hero-cricket.mp4", label: "Cricket", caption: "The cover drive" },
] as const;

type SortOption = "recommended" | "price-low" | "price-high" | "rating";

const SORT_MAP: Record<SortOption, { field: string; direction: "asc" | "desc" }> = {
  recommended: { field: "createdAt", direction: "desc" },
  "price-low": { field: "basePrice", direction: "asc" },
  "price-high": { field: "basePrice", direction: "desc" },
  rating: { field: "rating", direction: "desc" },
};

export function Hero({ className = "" }: { className?: string }) {
  const [active, setActive] = useState(0);
  const [location, setLocation] = useState("");
  const [sport, setSport] = useState("");
  const { options: categories } = useCategoryOptions();
  const [date, setDate] = useState("");
  const [today, setToday] = useState("");
  const [sort, setSort] = useState<SortOption>("recommended");
  const [drawerLocation, setDrawerLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [drawerLocationMessage, setDrawerLocationMessage] = useState("");
  const [drawerDistances, setDrawerDistances] = useState<Record<string, number>>({});
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);

  const [overlayOpen, setOverlayOpen] = useState(false);
  const [overlayParams, setOverlayParams] = useState<{ area: string; categoryId: string; date: string } | null>(null);
  const pagination = usePagination(12);
  const sortConfig = SORT_MAP[sort];

  useEffect(() => {
    setToday(new Date().toISOString().slice(0, 10));
  }, []);

  useEffect(() => {
    const video = videoRefs.current[active];
    if (!video) return;
    video.currentTime = 0;
    void video.play().catch(() => {});
  }, [active]);

  const advance = () => setActive((current) => (current + 1) % scenes.length);

  const handleSearch = (overrideArea?: string) => {
    const area = overrideArea !== undefined ? overrideArea : location.trim();
    setOverlayParams({ area, categoryId: sport, date });
    setOverlayOpen(true);
    setDrawerLocation(null);
    setDrawerLocationMessage("");
    setDrawerDistances({});
    pagination.resetPage();
  };

  const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Location unavailable", { description: "Please enter your area manually." });
      return;
    }
    setDrawerLocationMessage("Finding nearby venues...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setDrawerLocation({ lat: latitude, lng: longitude });
        setDrawerLocationMessage("Sorted by distance");
      },
      () => setDrawerLocationMessage("Location permission was denied. Showing all venues."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const { data: overlayData, isLoading: overlayLoading } = useQuery({
    queryKey: ["hero-turf-search", overlayParams, pagination.page, pagination.pageSize, sortConfig.field, sortConfig.direction],
    queryFn: async () => {
      if (!overlayParams) return { data: [], meta: { page: 1, limit: 12, total: 0, totalPages: 0 } };
      const params: Record<string, unknown> = {
        page: String(pagination.page),
        limit: String(pagination.pageSize),
        sortBy: sortConfig.field,
        sortOrder: sortConfig.direction,
      };
      if (overlayParams.area) params.area = overlayParams.area;
      if (overlayParams.categoryId) params.categoryId = overlayParams.categoryId;
      if (overlayParams.date) params.date = overlayParams.date;

      const result = await httpClient.get<{ data: Turf[]; meta: { page: number; limit: number; total: number; totalPages: number } } | Turf[]>(
        API_ENDPOINTS.marketplace.turfs,
        { params }
      );
      const payload = result.data;
      if (Array.isArray(payload)) {
        return { data: payload, meta: { page: 1, limit: payload.length, total: payload.length, totalPages: 1 } };
      }
      if (payload && Array.isArray(payload.data)) {
        return payload;
      }
      return { data: [], meta: { page: 1, limit: 12, total: 0, totalPages: 0 } };
    },
    enabled: overlayOpen && !!overlayParams,
  });

  useEffect(() => {
    if (overlayData?.meta?.total !== undefined) {
      pagination.setTotal(overlayData.meta.total);
    }
  }, [overlayData?.meta?.total, pagination]);

  const overlayTurfs = useMemo(() => overlayData?.data ?? [], [overlayData]);
  const overlayMeta = overlayData?.meta;
  const overlayTotalPages = overlayMeta?.totalPages ?? 0;

  useEffect(() => {
    if (!drawerLocation) {
      setDrawerDistances({});
      return;
    }
    const distances: Record<string, number> = {};
    overlayTurfs.forEach((turf) => {
      if (turf.latitude && turf.longitude) {
        const lat = Number(turf.latitude);
        const lng = Number(turf.longitude);
        if (!isNaN(lat) && !isNaN(lng)) {
          distances[turf.id] = getDistanceFromLatLonInKm(drawerLocation.lat, drawerLocation.lng, lat, lng);
        }
      }
    });
    setDrawerDistances(distances);
  }, [overlayTurfs, drawerLocation]);

  const sortedOverlayTurfs = useMemo(() => {
    const items = [...overlayTurfs];
    if (drawerLocation) {
      items.sort((a, b) => (drawerDistances[a.id] ?? Infinity) - (drawerDistances[b.id] ?? Infinity));
    }
    return items;
  }, [overlayTurfs, drawerLocation, drawerDistances]);

  const activeFilters = [location, sport, date].filter(Boolean).length;
  const clearFilters = () => { setLocation(""); setSport(""); setDate(""); };

  return (
    <section className={`relative min-h-screen overflow-hidden ${className}`}>
      {scenes.map((scene, index) => (
        <motion.video
          key={scene.key}
          ref={(node) => {
            videoRefs.current[index] = node;
          }}
          src={scene.video}
          poster="/assets/hero-turf-3d.jpg"
          muted
          playsInline
          preload="auto"
          autoPlay={index === 0}
          onEnded={advance}
          initial={false}
          animate={{ opacity: active === index ? 0.9 : 0, scale: active === index ? 1 : 1.06 }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          aria-hidden={active !== index}
          className="absolute inset-0 size-full object-cover"
        />
      ))}

      <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/60 to-background" />
      <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-background/25 to-transparent" />
      <div className="bg-flood absolute inset-0 opacity-70" />
      <div className="pitch-lines absolute inset-0 opacity-40" />

      <AnimatePresence>
        {!overlayOpen && (
          <motion.div
            initial={{ opacity: 0, x: -60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="relative mx-auto w-full max-w-7xl px-6 pt-20 pb-10 sm:px-8 lg:px-10"
          >
            <div className="max-w-3xl">
              <h1 className="text-6xl font-bold uppercase sm:text-6xl lg:text-7xl">
                Find. Book. <span className="text-gradient-pitch">Play.</span>
              </h1>

              <p className="mt-6 max-w-xl text-lg text-muted-foreground">
                Real-time availability from verified turf owners across Bangladesh. Lock your slot with a
                small advance and get instant confirmation.
              </p>

              <div className="mt-6 flex items-center gap-3">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={scenes[active]!.key}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.35 }}
                    className="font-display text-xl uppercase tracking-[0.2em] text-accent"
                  >
                    {scenes[active]!.label} · {scenes[active]!.caption}
                  </motion.span>
                </AnimatePresence>
                <div className="flex gap-1.5">
                  {scenes.map((scene, index) => (
                    <button
                      key={scene.key}
                      type="button"
                      onClick={() => setActive(index)}
                      aria-label={`Show ${scene.label} scene`}
                      className={`h-1.5 rounded-full transition-all duration-500 ${
                        active === index ? "w-8 bg-primary" : "w-3 bg-muted-foreground/40"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="surface-panel mt-10 rounded-2xl p-3 shadow-elevated sm:p-5"
            >
              <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr_auto]">
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="City, area or turf name"
                  className="h-12 border-0 bg-secondary/70 pl-10 shadow-none"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  aria-label="Location"
                />
                <Button variant="ghost" size="icon" className="absolute right-1.5 top-1/2 size-8 -translate-y-1/2" onClick={() => handleSearch()} aria-label="Search">
                  <Search className="size-4" />
                </Button>
              </div>

              <Select value={sport} onValueChange={(value) => { setSport(value); handleSearch(); }}>
                <SelectTrigger className="h-12 border-0 bg-secondary/70" aria-label="Sport">
                  <SelectValue placeholder="Any sport">
                    {categories.find((c) => c.value === sport)?.label}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any sport</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.value} value={category.value}>{category.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <DatePicker
                value={date}
                onChange={(value) => { setDate(value); handleSearch(); }}
                min={today || undefined}
                placeholder="Pick a date"
                className="h-12 border-0 bg-secondary/70 shadow-none"
                ariaLabel="Date"
              />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 px-1">
                <span className="mr-1 text-xs font-medium text-muted-foreground">Popular:</span>
                {categories.slice(0, 4).map((category) => (
                  <button
                    key={category.value}
                    onClick={() => { setSport(category.value === sport ? "all" : category.value); handleSearch(); }}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                      sport === category.value ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {category.label}
                  </button>
                ))}
                {activeFilters > 0 && (
                  <button onClick={clearFilters} className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground">
                    Clear filters
                  </button>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {overlayOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center bg-background/95 backdrop-blur-xl"
          >
            <div className="flex h-screen w-full max-w-7xl flex-col">
              <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Search Results</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {drawerLocationMessage || (overlayLoading ? "Searching..." : `${overlayMeta?.total ?? 0} venue${(overlayMeta?.total ?? 0) !== 1 ? 's' : ''} found`)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="size-4 text-muted-foreground" />
                    <Select value={sort} onValueChange={(value) => { setSort(value as SortOption); pagination.resetPage(); }}>
                      <SelectTrigger className="h-9 w-44 bg-card/80 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="recommended">Recommended</SelectItem>
                        <SelectItem value="price-low">Price: low to high</SelectItem>
                        <SelectItem value="price-high">Price: high to low</SelectItem>
                        <SelectItem value="rating">Top rated</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button variant="glass" size="sm" onClick={handleUseMyLocation}>
                    <LocateFixed className="size-4" /> Use my location
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setOverlayOpen(false)}>
                    <X className="size-5" />
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-6">
                {overlayLoading ? (
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="aspect-[16/15] animate-pulse rounded-3xl bg-muted"
                      />
                    ))}
                  </div>
                ) : sortedOverlayTurfs.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-border bg-card/50 px-6 py-20 text-center">
                    <Search className="mx-auto size-8 text-primary" />
                    <h3 className="mt-4 text-xl font-semibold">No venues match that search</h3>
                    <p className="mt-2 text-sm text-muted-foreground">Remove a filter or choose another area to see more options.</p>
                    {activeFilters > 0 && (
                      <Button variant="outline" className="mt-5" onClick={clearFilters}>Reset search</Button>
                    )}
                  </div>
                ) : (
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {sortedOverlayTurfs.map((turf, index) => (
                      <motion.div
                        key={turf.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.08 }}
                      >
                        <TurfCard turf={turf} distance={drawerDistances[turf.id]} />
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {overlayTotalPages > 1 && (
                <div className="border-t border-border/50 p-4">
                  <TablePagination
                    page={pagination.page}
                    totalPages={overlayTotalPages}
                    total={overlayMeta?.total ?? 0}
                    pageSize={pagination.pageSize}
                    onPageChange={pagination.setPage}
                    onPageSizeChange={pagination.setPageSize}
                  />
                </div>
              )}

              <div className="border-t border-border/50 px-6 pb-6 pt-4">
                <Button variant="glass" className="w-full" asChild>
                  <a href={`/turfs?${new URLSearchParams({ area: location, categoryId: sport, date }).toString()}`}>
                    View all venues
                  </a>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
