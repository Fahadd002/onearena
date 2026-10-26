/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { httpClient } from "@/lib/axios/httpClient";
import { API_ENDPOINTS } from "@/lib/api/config";
import {
  ApiErrorResponse,
  ApiResponse,
  PaginationMeta,
} from "@/types/api.type";
import { z } from "zod";

/* -------------------------------------------------------------------------- */
/* Schemas                                                                    */
/* -------------------------------------------------------------------------- */

const slotTimeSchema = z
  .object({
    timeName: z
      .string()
      .min(1, "Time name is required")
      .max(100, "Time name is too long"),

    startMinute: z
      .number()
      .int("Start minute must be an integer")
      .min(0, "Start minute cannot be negative")
      .max(1439, "Start minute cannot exceed 1439"),

    endMinute: z
      .number()
      .int("End minute must be an integer")
      .min(1, "End minute must be greater than 0")
      .max(1440, "End minute cannot exceed 1440"),

    isPeakTime: z.boolean().optional(),
    slotDuration: z.number().int().positive().optional(),
  })
  .refine((data) => data.endMinute > data.startMinute, {
    message: "End time must be after start time",
    path: ["endMinute"],
  });

const updateSlotTimeSchema = z.object({
  timeName: z
    .string()
    .min(1, "Time name is required")
    .max(100, "Time name is too long")
    .optional(),

  startMinute: z
    .number()
    .int("Start minute must be an integer")
    .min(0, "Start minute cannot be negative")
    .max(1439, "Start minute cannot exceed 1439")
    .optional(),

  endMinute: z
    .number()
    .int("End minute must be an integer")
    .min(1, "End minute must be greater than 0")
    .max(1440, "End minute cannot exceed 1440")
    .optional(),

  isPeakTime: z.boolean().optional(),
  slotDuration: z.number().int().positive().optional(),
});

export type SlotTime = {
  id: string;
  timeName: string;
  startMinute: number;
  endMinute: number;
  createdAt?: string;
  updatedAt?: string;
};

export type SlotTimePayload = z.infer<typeof slotTimeSchema>;
export type UpdateSlotTimePayload = z.infer<typeof updateSlotTimeSchema>;

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

import { AxiosError } from "axios";

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data as ApiErrorResponse | undefined;
    if (data?.message) return data.message;
    if (error.message) return error.message;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

/* -------------------------------------------------------------------------- */
/* List — matches pricing setup pattern: data = array, meta = sibling         */
/* -------------------------------------------------------------------------- */

export async function listSlotTimesAction(params?: {
  page?: string;
  limit?: string;
  sortBy?: string;
  sortOrder?: string;
  search?: string;
}): Promise<
  | (ApiResponse<SlotTime[]> & { meta?: PaginationMeta })
  | ApiErrorResponse
> {
  try {
    const clean: Record<string, string> = {};

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== "") {
          clean[key] = value;
        }
      }
    }

    const response = await httpClient.get<SlotTime[]>(
      API_ENDPOINTS.marketplace.ownerSlotTime,
      { params: clean },
    );

    return response;
  } catch (error: unknown) {
    return {
      success: false,
      message: errorMessage(error, "Failed to fetch slot times")
    };
  }
}

/* -------------------------------------------------------------------------- */
/* Create                                                                     */
/* -------------------------------------------------------------------------- */

export async function createSlotTimeAction(
  payload: SlotTimePayload,
): Promise<ApiResponse<SlotTime> | ApiErrorResponse> {
  const parsed = slotTimeSchema.safeParse(payload);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message || "Invalid slot time data",
    };
  }

  try {
    const response = await httpClient.post<SlotTime>(
      API_ENDPOINTS.marketplace.ownerSlotTime,
      parsed.data,
    );

    return response;
  } catch (error: any) {
    return {
      success: false,
      message: errorMessage(error, "Failed to create slot time"),
    };
  }
}

/* -------------------------------------------------------------------------- */
/* Update                                                                     */
/* -------------------------------------------------------------------------- */

export async function updateSlotTimeAction(
  slotTimeId: string,
  payload: UpdateSlotTimePayload,
): Promise<ApiResponse<SlotTime> | ApiErrorResponse> {
  const parsed = updateSlotTimeSchema.safeParse(payload);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message || "Invalid slot time data",
    };
  }

  try {
    const response = await httpClient.patch<SlotTime>(
      `${API_ENDPOINTS.marketplace.ownerSlotTime}/${slotTimeId}`,
      parsed.data,
    );

    return response;
  } catch (error: any) {
    return {
      success: false,
      message: errorMessage(error, "Failed to update slot time"),
    };
  }
}

/* -------------------------------------------------------------------------- */
/* Delete                                                                     */
/* -------------------------------------------------------------------------- */

export async function deleteSlotTimeAction(
  slotTimeId: string,
): Promise<ApiResponse<unknown> | ApiErrorResponse> {
  try {
    const response = await httpClient.delete<unknown>(
      `${API_ENDPOINTS.marketplace.ownerSlotTime}/${slotTimeId}`,
    );

    return response;
  } catch (error: any) {
    return {
      success: false,
      message: errorMessage(error, "Failed to delete slot time"),
    };
  }
}