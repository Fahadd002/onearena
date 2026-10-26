"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type RefObject,
  type SetStateAction,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth";
import type { paginationParams } from "@/types/api.type";
import type { Turf } from "@/types/turf.type";
import { ymd, type Bucket } from "@/lib/slotsUtils";

import { fetchTurfs, toPriceParams, type TurfListPayload } from "./api";
import { readPendingCart, savePendingCart } from "./pendingCart";
import {
  focusOf,
  rangeOf,
  resolveDateOption,
  startOfISODate,
  startOfToday,
  type DateRange,
} from "./dateRanges";
import { DEFAULT_FILTERS, DEFAULT_SORT, activeFilterCount, type Filters } from "./searchFilters";
import { useIsToday } from "./useIsToday";
import type { CartSlot } from "./types";

export interface TurfExplorerValue {
  /* Results */
  turfs: Turf[];
  meta?: paginationParams;
  isLoading: boolean;

  /* Search + filters */
  area: string;
  setArea: (v: string) => void;
  bucket: Bucket;
  setBucket: (b: Bucket) => void;
  filters: Filters;
  setFilters: (f: Filters) => void;
  geo: { lat: number; lng: number } | null;
  locating: boolean;
  findNearby: () => void;
  radius: number;
  setRadius: (v: number) => void;

  /* Date */
  today: Date;
  date: Date;
  setDate: (d: Date) => void;
  range: DateRange;
  dateOptionKey: string;
  selectDateOption: (key: string) => void;
  isToday: boolean;

  /* Cart */
  cart: CartSlot[];
  toggle: (slot: CartSlot) => void;
  selectSlot: (slot: CartSlot) => void;
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  onCartChange: (cart: CartSlot[]) => void;

  /* Paging + reset */
  page: number;
  setPage: Dispatch<SetStateAction<number>>;
  hasActiveFilters: boolean;
  resetAll: () => void;

  /** Banner + headline block, measured by TurfList to place the turf sheet. */
  bannerRef: RefObject<HTMLDivElement | null>;
  copyRef: RefObject<HTMLDivElement | null>;
}

const TurfExplorerContext = createContext<TurfExplorerValue | null>(null);

/**
 * Owns every piece of state the home turf section shares: the search + filter
 * deck, the turf rows and the slot cart. It is mounted once on the home page
 * so the rows keep one cart while the deck and the rows live in different parts
 * of the layout.
 */
export function TurfExplorerProvider({
  initialData,
  todayISO,
  children,
}: {
  initialData?: TurfListPayload;
  /** Server's "today" as YYYY-MM-DD, so SSR and the client agree. */
  todayISO: string;
  children: ReactNode;
}) {
  const { session, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [area, setArea] = useState("");
  const [bucket, setBucket] = useState<Bucket>("all");
  const [radius, setRadius] = useState(10);
  const [cart, setCart] = useState<CartSlot[]>([]);
  const [page, setPage] = useState(1);
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const bannerRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);

  /* Built from the server's date string, never from `new Date()` — the server
     runs in UTC, so its local day can differ from the browser's. */
  const [today, setToday] = useState(() => startOfISODate(todayISO));

  const [date, setDate] = useState(() => startOfISODate(todayISO));
  const [dateOptionKey, setDateOptionKey] = useState("all");

  /* Slots picked before the login round-trip. Restored in an effect, never in a
     state initialiser: the server has no sessionStorage, so seeding it there
     would desync the first client render (hydration mismatch). */
  useEffect(() => {
    const pending = readPendingCart();
    if (!pending) return;
    setCart(pending.slots);
    if (pending.date) setDate(startOfISODate(pending.date));
    if (pending.checkout) setDrawerOpen(true);
  }, []);

  /* Mirror the selection so a redirect to /login (or any full navigation) cannot
     drop it. `drawerOpen` is saved too: the user left mid-checkout. */
  useEffect(() => {
    savePendingCart(cart, ymd(date), drawerOpen);
  }, [cart, date, drawerOpen]);

  const activeOption = useMemo(() => resolveDateOption(dateOptionKey, today), [dateOptionKey, today]);
  const range = useMemo(() => rangeOf(activeOption), [activeOption]);

  /* Roll the selection over to the new "today" once local midnight passes. */
  useEffect(() => {
    const now = new Date();
    const msToMidnight =
      new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime();
    const timer = setTimeout(() => {
      setToday(startOfToday());
      setDateOptionKey("all");
    }, msToMidnight + 1000);
    return () => clearTimeout(timer);
  }, [today]);

  const prices = toPriceParams(filters.minPrice, filters.maxPrice);

  /* The server prefetches today's first page, so only the very first paint is
     served from HTML. `initialDataUpdatedAt` keeps React Query from refetching
     it the moment the client mounts. */
  const isFirstPage =
    page === 1 &&
    ymd(date) === ymd(today) &&
    !area &&
    !filters.categoryId &&
    filters.minPrice === "" &&
    filters.maxPrice === "" &&
    filters.sortBy === DEFAULT_SORT.sortBy &&
    filters.sortOrder === DEFAULT_SORT.sortOrder &&
    !geo;

  const { data: pageData, isLoading } = useQuery({
    queryKey: [
      "turfs",
      session?.user?.id,
      session?.user?.role,
      area,
      page,
      ymd(date),
      geo?.lat,
      geo?.lng,
      radius,
      filters.categoryId,
      filters.sortBy,
      filters.sortOrder,
      filters.minPrice,
      filters.maxPrice,
    ],
    queryFn: async () =>
      fetchTurfs({
        area,
        categoryId: filters.categoryId || undefined,
        ...prices,
        date: ymd(date),
        page,
        limit: 10,
        lat: geo?.lat,
        lng: geo?.lng,
        radius,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      }),
    initialData: isFirstPage ? initialData : undefined,
    initialDataUpdatedAt: isFirstPage ? Date.now() : undefined,
  });

  const turfs = pageData?.data ?? [];
  const meta = pageData?.meta;

  useEffect(() => {
    setPage(1);
  }, [area, date, geo, radius, filters]);

  const findNearby = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setGeo({ lat: p.coords.latitude, lng: p.coords.longitude });
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  /* Guests cannot pick slots: send them to sign in and bring them back here.
     Only users with role "USER" can book slots. Returns true when the pick may go ahead. */
  const requireLogin = () => {
    if (authLoading) return false;
    if (!session) {
      toast.info("Please sign in to book a slot");
      router.push(`/login?redirect=${encodeURIComponent(`${pathname}?date=${ymd(date)}`)}`);
      return false;
    }
  if (session.user?.role === "ADMIN") {
      toast.error("Only regular users can book slots.");
      return false;
    }
    return true;
  };

  const toggle = (slot: CartSlot) => {
    if (!requireLogin()) return;
    setCart((c) => {
      const existing = c.find((x) => x.id === slot.id);
      if (existing) return c.filter((x) => x.id !== slot.id);
      if (c.length > 0 && c[0].turfId !== slot.turfId) {
        toast.error("You can only book slots from one turf at a time");
        return c;
      }
      return [...c, slot];
    });
  };

  const selectSlot = (slot: CartSlot) => {
    if (!requireLogin()) return;
    setCart((c) => {
      const existing = c.find((x) => x.id === slot.id);
      if (existing) return c.filter((x) => x.id !== slot.id);
      if (c.length > 0 && c[0].turfId !== slot.turfId) {
        toast.error("You can only book slots from one turf at a time");
        return c;
      }
      return [...c, { ...slot, date: ymd(date) }];
    });
  };

  const closeDrawer = () => setDrawerOpen(false);

  const onCartChange = (newCart: CartSlot[]) => {
    setCart(newCart);
    if (newCart.length === 0) closeDrawer();
  };

  const isToday = useIsToday(date);

  const selectDateOption = (key: string) => {
    setDateOptionKey(key);
    setDate(focusOf(resolveDateOption(key, today)));
  };

  const hasActiveFilters =
    !!area ||
    bucket !== "all" ||
    !!geo ||
    activeFilterCount(filters) > 0 ||
    filters.sortBy !== DEFAULT_SORT.sortBy ||
    filters.sortOrder !== DEFAULT_SORT.sortOrder ||
    !isToday ||
    dateOptionKey !== "all";

  const resetAll = () => {
    setArea("");
    setBucket("all");
    setGeo(null);
    setPage(1);
    setFilters(DEFAULT_FILTERS);
    setDateOptionKey("all");
    setDate(startOfToday());
  };

  const value: TurfExplorerValue = {
    turfs,
    meta,
    isLoading,

    area,
    setArea,
    bucket,
    setBucket,
    filters,
    setFilters,
    geo,
    locating,
    findNearby,
    radius,
    setRadius,

    today,
    date,
    setDate,
    range,
    dateOptionKey,
    selectDateOption,
    isToday,

    cart,
    toggle,
    selectSlot,
    drawerOpen,
    openDrawer: () => setDrawerOpen(true),
    closeDrawer,
    onCartChange,

    page,
    setPage,
    hasActiveFilters,
    resetAll,

    bannerRef,
    copyRef,
  };

  return <TurfExplorerContext.Provider value={value}>{children}</TurfExplorerContext.Provider>;
}

/** Turf state for the home page deck, rows and cart. Throws outside the provider. */
export function useTurfExplorer() {
  const value = useContext(TurfExplorerContext);
  if (!value) {
    throw new Error("useTurfExplorer must be used inside <TurfExplorerProvider>");
  }
  return value;
}