/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { httpClient } from "@/lib/axios/httpClient";
import { API_ENDPOINTS } from "@/lib/api/config";
import { ApiErrorResponse, ApiResponse } from "@/types/api.type";
import { z } from "zod";

const priceRuleSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6, "Day must be 0-6"),
  startMinute: z.number().int().min(0).max(1440, "Start must be 0-1440"),
  endMinute: z.number().int().min(0).max(1440, "End must be 0-1440"),
  price: z.number().min(0, "Price cannot be negative"),
  active: z.boolean().default(true),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
});

const priceRuleBulkSchema = priceRuleSchema.omit({ dayOfWeek: true });

const slotUpdateSchema = z.object({
  active: z.boolean().optional(),
  price: z.number().min(0, "Price cannot be negative").optional(),
});

function errorMessage(error: any, fallback: string) {
  return error?.response?.data?.message || fallback;
}

export type PriceRulePayload = z.infer<typeof priceRuleSchema>;
export type PriceRuleBulkPayload = z.infer<typeof priceRuleBulkSchema>;
export type SlotUpdatePayload = z.infer<typeof slotUpdateSchema>;

export interface StoredSlot {
  id: string;
  turfId: string;
  slotDate: string;
  startMinute: number;
  endMinute: number;
  price: string | number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function createPriceRuleAction(turfId: string, payload: PriceRulePayload): Promise<ApiResponse<unknown> | ApiErrorResponse> {
  const parsed = priceRuleSchema.safeParse(payload);
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message || "Invalid pricing rule" };
  try {
    const response = await httpClient.post<unknown>(`${API_ENDPOINTS.marketplace.ownerTurfs}/${turfId}/pricing`, parsed.data);
    return response;
  } catch (error: any) {
    return { success: false, message: errorMessage(error, "Failed to create pricing rule") };
  }
}

export async function createPriceRuleBulkAction(turfId: string, payload: PriceRuleBulkPayload): Promise<ApiResponse<unknown> | ApiErrorResponse> {
  const parsed = priceRuleBulkSchema.safeParse(payload);
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message || "Invalid pricing rule" };
  try {
    const response = await httpClient.post<unknown>(`${API_ENDPOINTS.marketplace.ownerTurfs}/${turfId}/pricing/bulk`, parsed.data);
    return response;
  } catch (error: any) {
    return { success: false, message: errorMessage(error, "Failed to create pricing rules") };
  }
}

export async function updatePriceRuleAction(priceRuleId: string, payload: Partial<PriceRulePayload>): Promise<ApiResponse<unknown> | ApiErrorResponse> {
  const parsed = priceRuleSchema.partial().safeParse(payload);
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message || "Invalid pricing rule" };
  try {
    const response = await httpClient.patch<unknown>(`${API_ENDPOINTS.marketplace.ownerPricing}/${priceRuleId}`, parsed.data);
    return response;
  } catch (error: any) {
    return { success: false, message: errorMessage(error, "Failed to update pricing rule") };
  }
}

export async function deletePriceRuleAction(priceRuleId: string): Promise<ApiResponse<void> | ApiErrorResponse> {
  try {
    const response = await httpClient.delete<void>(`${API_ENDPOINTS.marketplace.ownerPricing}/${priceRuleId}`);
    return response;
  } catch (error: any) {
    return { success: false, message: errorMessage(error, "Failed to delete pricing rule") };
  }
}

export async function generateSlotsAction(turfId: string, payload?: { days?: number }): Promise<ApiResponse<unknown> | ApiErrorResponse> {
  try {
    const response = await httpClient.post<unknown>(`${API_ENDPOINTS.marketplace.ownerTurfs}/${turfId}/slots/generate`, payload ?? {});
    return response;
  } catch (error: any) {
    return { success: false, message: errorMessage(error, "Failed to generate slots") };
  }
}

export async function listTurfSlotsAction(turfId: string, options?: { date?: string; activeOnly?: boolean }): Promise<ApiResponse<StoredSlot[]> | ApiErrorResponse> {
  try {
    const params = new URLSearchParams();
    if (options?.date) params.set("date", options.date);
    if (options?.activeOnly) params.set("activeOnly", "true");
    const qs = params.toString();
    const response = await httpClient.get<StoredSlot[]>(`${API_ENDPOINTS.marketplace.ownerTurfs}/${turfId}/slots${qs ? `?${qs}` : ""}`);
    return response;
  } catch (error: any) {
    return { success: false, message: errorMessage(error, "Failed to fetch slots") };
  }
}

export async function listAllSlotsAction(options?: { date?: string }): Promise<ApiResponse<{ turfs: Array<{ id: string; name: string }>; slots: StoredSlot[] }> | ApiErrorResponse> {
  try {
    const params = new URLSearchParams();
    if (options?.date) params.set("date", options.date);
    const qs = params.toString();
    const response = await httpClient.get<{ turfs: Array<{ id: string; name: string }>; slots: StoredSlot[] }>(`${API_ENDPOINTS.marketplace.ownerSlots}${qs ? `?${qs}` : ""}`);
    return response;
  } catch (error: any) {
    return { success: false, message: errorMessage(error, "Failed to fetch slots") };
  }
}

export async function updateSlotAction(slotId: string, payload: SlotUpdatePayload): Promise<ApiResponse<unknown> | ApiErrorResponse> {
  const parsed = slotUpdateSchema.safeParse(payload);
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message || "Invalid slot update" };
  try {
    const response = await httpClient.patch<unknown>(`${API_ENDPOINTS.marketplace.ownerSlots}/${slotId}`, parsed.data);
    return response;
  } catch (error: any) {
    return { success: false, message: errorMessage(error, "Failed to update slot") };
  }
}
