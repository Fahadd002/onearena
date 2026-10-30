/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { httpClient } from "@/lib/axios/httpClient";
import { API_ENDPOINTS } from "@/lib/api/config";
import { ApiErrorResponse, ApiResponse } from "@/types/api.type";
import { z } from "zod";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function errorMessage(error: any, fallback: string) {
  return error?.response?.data?.message || fallback;
}

/* -------------------------------------------------------------------------- */
/* Slot Time Setup                                                            */
/* -------------------------------------------------------------------------- */

export interface StoredSlotTimeSetup {
  id: string;
  timeName: string;
  startMinute: number;
  endMinute: number;
  ownerId: string;
  createdAt: string;
  updatedAt: string | null;
}

export async function listSlotTimeSetupsAction(): Promise<
  ApiResponse<StoredSlotTimeSetup[]> | ApiErrorResponse
> {
  try {
    const response = await httpClient.get<StoredSlotTimeSetup[]>(
      API_ENDPOINTS.marketplace.ownerSlotTimeDropdown,
    );
    return response;
  } catch (error: any) {
    return {
      success: false,
      message: errorMessage(error, "Failed to fetch slot time setups"),
    };
  }
}

/* -------------------------------------------------------------------------- */
/* Price Rule Schemas                                                         */
/* -------------------------------------------------------------------------- */

const priceRuleSchema = z.object({
  slotTimeSetupId: z.string().min(1, "Slot time is required"),
  dayOfWeek: z.number().int().min(0).max(6, "Day must be 0-6"),
  price: z.number().min(0, "Price cannot be negative"),
  active: z.boolean().default(true),
});

const priceRuleBulkSchema = priceRuleSchema.omit({ dayOfWeek: true });

const slotUpdateSchema = z.object({
  active: z.boolean().optional(),
  price: z.number().min(0, "Price cannot be negative").optional(),
});

export type PriceRulePayload = z.infer<typeof priceRuleSchema>;
export type PriceRuleBulkPayload = z.infer<typeof priceRuleBulkSchema>;
export type SlotUpdatePayload = z.infer<typeof slotUpdateSchema>;

/* -------------------------------------------------------------------------- */
/* Shared Types                                                               */
/* -------------------------------------------------------------------------- */

export interface StoredSlot {
  id: string;
  turfId: string;
  slotDate: string;
  startMinute: number;
  endMinute: number;
  price: string | number;
  active: boolean;
  slotStatus: "AVAILABLE" | "WAITLIST" | "BOOKED" | "EXPIRED" | "PLAYED" | "ABANDONED" | "ABSENT";
  createdAt: string;
  updatedAt: string;
}

export interface StoredPriceRule {
  id: string;
  turfId: string;
  slotTimeSetupId: string;
  dayOfWeek: number;
  price: string | number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  slotTimeSetup: StoredSlotTimeSetup;
}

/* -------------------------------------------------------------------------- */
/* Price Rule Actions                                                         */
/* -------------------------------------------------------------------------- */

export async function createPriceRuleAction(
  turfId: string,
  payload: PriceRulePayload,
): Promise<ApiResponse<StoredPriceRule> | ApiErrorResponse> {
  const parsed = priceRuleSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message || "Invalid pricing rule",
    };
  }
  try {
    const response = await httpClient.post<StoredPriceRule>(
      `${API_ENDPOINTS.marketplace.ownerTurfs}/${turfId}/pricing`,
      parsed.data,
    );
    return response;
  } catch (error: any) {
    return {
      success: false,
      message: errorMessage(error, "Failed to create pricing rule"),
    };
  }
}

export async function createPriceRuleBulkAction(
  turfId: string,
  payload: PriceRuleBulkPayload,
): Promise<ApiResponse<StoredPriceRule[]> | ApiErrorResponse> {
  const parsed = priceRuleBulkSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message || "Invalid pricing rule",
    };
  }
  try {
    const response = await httpClient.post<StoredPriceRule[]>(
      `${API_ENDPOINTS.marketplace.ownerTurfs}/${turfId}/pricing/bulk`,
      parsed.data,
    );
    return response;
  } catch (error: any) {
    return {
      success: false,
      message: errorMessage(error, "Failed to create pricing rules"),
    };
  }
}

export async function updatePriceRuleAction(
  priceRuleId: string,
  payload: Partial<PriceRulePayload>,
): Promise<ApiResponse<StoredPriceRule> | ApiErrorResponse> {
  const parsed = priceRuleSchema.partial().safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message || "Invalid pricing rule",
    };
  }
  try {
    const response = await httpClient.patch<StoredPriceRule>(
      `${API_ENDPOINTS.marketplace.ownerPricing}/${priceRuleId}`,
      parsed.data,
    );
    return response;
  } catch (error: any) {
    return {
      success: false,
      message: errorMessage(error, "Failed to update pricing rule"),
    };
  }
}

export async function deletePriceRuleAction(
  priceRuleId: string,
): Promise<ApiResponse<void> | ApiErrorResponse> {
  try {
    const response = await httpClient.delete<void>(
      `${API_ENDPOINTS.marketplace.ownerPricing}/${priceRuleId}`,
    );
    return response;
  } catch (error: any) {
    return {
      success: false,
      message: errorMessage(error, "Failed to delete pricing rule"),
    };
  }
}

/* -------------------------------------------------------------------------- */
/* Slot Actions                                                               */
/* -------------------------------------------------------------------------- */

export async function generateSlotsAction(
  turfId: string,
  payload?: { days?: number },
): Promise<ApiResponse<unknown> | ApiErrorResponse> {
  try {
    const response = await httpClient.post<unknown>(
      `${API_ENDPOINTS.marketplace.ownerTurfs}/${turfId}/slots/generate`,
      payload ?? {},
    );
    return response;
  } catch (error: any) {
    return {
      success: false,
      message: errorMessage(error, "Failed to generate slots"),
    };
  }
}

export async function listTurfSlotsAction(
  turfId: string,
  options?: { date?: string; activeOnly?: boolean },
): Promise<ApiResponse<StoredSlot[]> | ApiErrorResponse> {
  try {
    const params = new URLSearchParams();
    if (options?.date) params.set("date", options.date);
    if (options?.activeOnly) params.set("activeOnly", "true");
    const qs = params.toString();
    const response = await httpClient.get<StoredSlot[]>(
      `${API_ENDPOINTS.marketplace.ownerTurfs}/${turfId}/slots${qs ? `?${qs}` : ""}`,
    );
    return response;
  } catch (error: any) {
    return {
      success: false,
      message: errorMessage(error, "Failed to fetch slots"),
    };
  }
}

export async function listAllSlotsAction(options?: {
  date?: string;
}): Promise<
  ApiResponse<{
    turfs: Array<{ id: string; name: string }>;
    slots: StoredSlot[];
  }> | ApiErrorResponse
> {
  try {
    const params = new URLSearchParams();
    if (options?.date) params.set("date", options.date);
    const qs = params.toString();
    const response = await httpClient.get<{
      turfs: Array<{ id: string; name: string }>;
      slots: StoredSlot[];
    }>(`${API_ENDPOINTS.marketplace.ownerSlots}${qs ? `?${qs}` : ""}`);
    return response;
  } catch (error: any) {
    return {
      success: false,
      message: errorMessage(error, "Failed to fetch slots"),
    };
  }
}

export async function updateSlotAction(
  slotId: string,
  payload: SlotUpdatePayload,
): Promise<ApiResponse<unknown> | ApiErrorResponse> {
  const parsed = slotUpdateSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message || "Invalid slot update",
    };
  }
  try {
    const response = await httpClient.patch<unknown>(
      `${API_ENDPOINTS.marketplace.ownerSlots}/${slotId}`,
      parsed.data,
    );
    return response;
  } catch (error: any) {
    return {
      success: false,
      message: errorMessage(error, "Failed to update slot"),
    };
  }
}

export async function deleteAvailableSlotAction(
  slotId: string,
): Promise<ApiResponse<void> | ApiErrorResponse> {
  try {
    return await httpClient.delete<void>(
      `${API_ENDPOINTS.marketplace.ownerSlots}/${slotId}`,
    );
  } catch (error: any) {
    return {
      success: false,
      message: errorMessage(error, "Failed to delete slot"),
    };
  }
}