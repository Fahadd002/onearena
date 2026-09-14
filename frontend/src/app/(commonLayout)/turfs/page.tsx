"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LocateFixed, MapPin, Search, SlidersHorizontal, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TurfCard } from "@/components/premium/TurfCard";
import { TablePagination } from "@/components/common/TablePagination";
import { httpClient } from "@/lib/axios/httpClient";
import { API_ENDPOINTS } from "@/lib/api/config";
import { useCategoryOptions } from "@/hooks/useCategoryOptions";
import { usePagination } from "@/hooks/usePagination";
import type { Turf } from "@/types/turf.type";
import { useQuery } from "@tanstack/react-query";

type SortOption = "recommended" | "price-low" | "price-high" | "rating";

const SORT_MAP: Record<SortOption, { field: string; direction: "asc" | "desc" }> = {
  recommended: { field: "createdAt", direction: "desc" },
  "price-low": { field: "basePrice", direction: "asc" },
  "price-high": { field: "basePrice", direction: "desc" },
  rating: { field: "rating", direction: "desc" },
};

export default function TurfsPage() {
  const searchParams = useSearchParams();
  const [area, setArea] = useState(() => searchParams.get("area") ?? "");
  const [categoryId, setCategoryId] = useState(() => searchParams.get("categoryId") ?? "");
  const [date, setDate] = useState(() => searchParams.get("date") ?? "");
  const [today, setToday] = useState("");
  const [sort, setSort] = useState<SortOption>("recommended");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationMessage, setLocationMessage] = useState("");
  const [turfDistances, setTurfDistances] = useState<Record<string, number>>({});
  const { options: categories } = useCategoryOptions();
  const pagination = usePagination(12);
  const sortConfig = SORT_MAP[sort];

  useEffect(() => {
    setToday(new Date().toISOString().slice(0, 10));
  }, []);

  const { data, isLoading, error } = useQuery({
    queryKey: ["turfs", area, categoryId, date, sortConfig.field, sortConfig.direction, pagination.page, pagination.pageSize, location?.lat, location?.lng],
    queryFn: async () => {
      const isNearby = !!location;
      const params: Record<string, unknown> = {
        page: String(pagination.page),
        limit: String(isNearby ? 1000 : pagination.pageSize),
        sortBy: sortConfig.field,
        sortOrder: sortConfig.direction,
      };
      if (area.trim()) params.area = area.trim();
      if (categoryId) params.categoryId = categoryId;
      if (date) params.date = date;

      const result = await httpClient.get<{ data: Turf[]; meta: { page: number; limit: number; total: number; totalPages: number } } | Turf[]>(
        API_ENDPOINTS.marketplace.turfs,
        { params }
      );
      const payload = result.data;
      if (Array.isArray(payload)) {
        return { data: payload, meta: { page: 1, limit: payload.length, total: payload.length, totalPages: 1 } };
      }
      return payload ?? { data: [], meta: { page: 1, limit: 12, total: 0, totalPages: 0 } };
    },
  });

  useEffect(() => {
    if (data && "meta" in data && data.meta?.total !== undefined) {
      pagination.setTotal(data.meta.total);
    }
  }, [data, pagination]);

  useEffect(() => {
    pagination.resetPage();
  }, [area, categoryId, date, sort, pagination]);

  const turfs = data && "data" in data ? data.data : [];

  const findNearby = () => {
    if (!navigator.geolocation) {
      setLocationMessage("Location is not available in this browser.");
      return;
    }
    setLocationMessage("Finding nearby venues...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        setLocationMessage("Sorted by distance");
      },
      () => setLocationMessage("Location permission was denied. Showing all venues."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const deg2rad = (deg: number) => deg * (Math.PI / 180);

  useEffect(() => {
    if (!location) {
      setTurfDistances({});
      return;
    }
    const distances: Record<string, number> = {};
    turfs.forEach((turf) => {
      if (turf.latitude && turf.longitude) {
        const lat = Number(turf.latitude);
        const lng = Number(turf.longitude);
        if (!isNaN(lat) && !isNaN(lng)) {
          distances[turf.id] = getDistanceFromLatLonInKm(location.lat, location.lng, lat, lng);
        }
      }
    });
    setTurfDistances(distances);
  }, [turfs, location]);

  const sortedTurfs = useMemo(() => {
    const items = [...turfs];
    if (location) {
      items.sort((a, b) => (turfDistances[a.id] ?? Infinity) - (turfDistances[b.id] ?? Infinity));
    }
    return items;
  }, [turfs, location, turfDistances]);

  const activeFilters = [area, categoryId, date].filter(Boolean).length;
  const clearFilters = () => { setArea(""); setCategoryId(""); setDate(""); };

  const meta = data && "meta" in data ? data.meta : null;
  const totalPages = meta?.totalPages ?? 0;
  const total = meta?.total ?? 0;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,color-mix(in_oklab,var(--primary)_12%,transparent),transparent_32rem)]">
      <section className="border-b border-border bg-background/80 pt-28 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 pb-10 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary"><Sparkles className="size-3.5" /> OneArena</p>
              <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">Your next game starts here.</h1>
              <p className="mt-4 text-base leading-7 text-muted-foreground">Compare verified venues, live prices, and available times before you book.</p>
            </div>
            <div className="rounded-2xl border border-border bg-card px-4 py-3 text-sm shadow-sm">
              <span className="font-semibold text-primary">{turfs.length}</span><span className="ml-1 text-muted-foreground">venues ready to book</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2"><SlidersHorizontal className="size-4 text-muted-foreground" /><Select value={sort} onValueChange={(value) => setSort(value as SortOption)}><SelectTrigger className="h-9 w-44 bg-card text-sm"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="recommended">Recommended</SelectItem><SelectItem value="price-low">Price: low to high</SelectItem><SelectItem value="price-high">Price: high to low</SelectItem><SelectItem value="rating">Top rated</SelectItem></SelectContent></Select></div>
        </div>

        {isLoading ? <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="aspect-[16/15] animate-pulse rounded-3xl bg-muted" />)}</div> : error ? <div className="rounded-3xl border border-destructive/30 bg-destructive/10 p-10 text-center"><p className="font-medium text-destructive">{error instanceof Error ? error.message : "We could not load the marketplace right now."}</p><Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>Try again</Button></div> : sortedTurfs.length === 0 ? <div className="rounded-3xl border border-dashed border-border bg-card px-6 py-20 text-center"><Search className="mx-auto size-8 text-primary" /><h2 className="mt-4 text-xl font-semibold">No venues match that search</h2><p className="mt-2 text-sm text-muted-foreground">Remove a filter or choose another area to see more options.</p><Button variant="outline" className="mt-5" onClick={clearFilters}>Reset search</Button></div> : <><div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{sortedTurfs.map((turf) => <TurfCard key={turf.id} turf={turf} distance={turfDistances[turf.id]} />)}</div>{!location && totalPages > 1 && (<div className="mt-10 flex justify-center"><TablePagination page={pagination.page} totalPages={totalPages} total={total} pageSize={pagination.pageSize} onPageChange={pagination.setPage} onPageSizeChange={pagination.setPageSize} /></div>)}</>}
      </section>
    </main>
  );
}
