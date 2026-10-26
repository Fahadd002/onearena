"use server";

import { httpClient } from "@/lib/axios/httpClient";
import { API_ENDPOINTS } from "@/lib/api/config";
import type { ApiErrorResponse, ApiResponse } from "@/types/api.type";
import type { TurfListParams, TurfListPayload } from "@/components/turfs/api";
import type { Turf } from "@/types/turf.type";

/** Builds the shared query so the SSR seed matches the client request shape. */
function toQuery(params: TurfListParams): Record<string, unknown> {
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
  return query;
}

export async function getTurfs(
  params: TurfListParams,
): Promise<ApiResponse<TurfListPayload> | ApiErrorResponse> {
  try {
    const result = await httpClient.get<TurfListPayload>(API_ENDPOINTS.marketplace.turfs, {
      params: toQuery(params),
    });

    if (!result?.success || !("data" in result)) {
      return { success: false, message: result?.message || "Could not load turfs" };
    }

    return result;
  } catch {
    return { success: false, message: "Could not load turfs" };
  }
}

/** Single turf by id — server render for the details page. */
export async function getTurfById(turfId: string): Promise<ApiResponse<Turf> | ApiErrorResponse> {
  try {
    const result = await httpClient.get<Turf>(`${API_ENDPOINTS.marketplace.turfs}/${turfId}`);

    if (!result?.success || !("data" in result)) {
      return { success: false, message: result?.message || "Could not load this turf" };
    }

    return result;
  } catch {
    return { success: false, message: "Could not load this turf" };
  }
}
