import { httpClient } from "@/lib/axios/httpClient";
import { API_ENDPOINTS } from "@/lib/api/config";
import type { Turf, TurfSlot } from "@/types/turf.type";
import type { PaginationMeta } from "@/types/api.type";

export interface TurfListPayload {
  data: Turf[];
  meta: PaginationMeta;
}

export type TurfSortField = "createdAt" | "defaultSlotPrice" | "name";
export type SortOrder = "asc" | "desc";

export interface TurfListParams {
  area?: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  date: string;
  page: number;
  limit: number;
  lat?: number;
  lng?: number;
  radius?: number;
  sortBy?: TurfSortField;
  sortOrder?: SortOrder;
}

export async function fetchTurfs(params: TurfListParams): Promise<TurfListPayload> {
  const query: Record<string, unknown> = {
    page: String(params.page),
    limit: String(params.limit),
    date: params.date,
  };
  if (params.area?.trim()) query.area = params.area.trim();
  if (params.categoryId) query.categoryId = params.categoryId;
  if (params.minPrice !== undefined) query.minPrice = String(params.minPrice);
  if (params.maxPrice !== undefined) query.maxPrice = String(params.maxPrice);
  if (params.sortBy) {
    query.sortBy = params.sortBy;
    query.sortOrder = params.sortOrder ?? "desc";
  }
  if (params.lat !== undefined && params.lng !== undefined) {
    query.lat = String(params.lat);
    query.lng = String(params.lng);
    query.radius = String(params.radius ?? 10);
  }

  const result = await httpClient.get<TurfListPayload>(API_ENDPOINTS.marketplace.turfs, {
    params: query,
  });

  return result.data ?? { data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } };
}

/**
 * Price bounds are entered as free text. Blank / "." means "no bound", and an
 * inverted range (min > max) is dropped rather than returning zero results.
 */
export function toPriceParams(min: string, max: string) {
  const parse = (v: string) => {
    const t = v.trim();
    if (!t || t === ".") return undefined;
    const n = Number(t);
    return Number.isFinite(n) && n >= 0 ? n : undefined;
  };
  const minPrice = parse(min);
  const maxPrice = parse(max);
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    return {};
  }
  return {
    ...(minPrice !== undefined ? { minPrice } : {}),
    ...(maxPrice !== undefined ? { maxPrice } : {}),
  };
}

export interface CategoryOption {
  id: string;
  name: string;
}

/** Single turf by id — client-side fetch used after the server-rendered turf. */
export async function fetchTurfById(turfId: string): Promise<Turf | null> {
  const result = await httpClient.get<Turf>(`${API_ENDPOINTS.marketplace.turfs}/${turfId}`);
  return result.data ?? null;
}

/** Slots for one date — the details page refetches this on every date change. */
export async function fetchTurfSlots(turfId: string, date: string): Promise<TurfSlot[]> {
  const result = await httpClient.get<TurfSlot[]>(
    `${API_ENDPOINTS.marketplace.turfs}/${turfId}/slots`,
    { params: { date } },
  );
  return result.data ?? [];
}
