/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { httpClient } from "@/lib/axios/httpClient";
import { API_ENDPOINTS } from "@/lib/api/config";
import { ApiErrorResponse, ApiResponse } from "@/types/api.type";
import { z } from "zod";

const turfActionSchema = z.object({
  name: z.string().trim().min(2, "Turf name must be at least 2 characters"),
  categoryId: z.string().min(1, "Please choose a sport"),
  description: z.string().optional(),
  address: z.string().trim().min(5, "Address must be at least 5 characters"),
  basePrice: z.number().positive("Starting price must be greater than 0"),
  slotMinutes: z.number().min(30, "Slot duration must be at least 30 minutes"),
  latitude: z.number().finite().min(-90).max(90, "Enter a valid latitude"),
  longitude: z.number().finite().min(-180).max(180, "Enter a valid longitude"),
});

export type TurfActionPayload = z.infer<typeof turfActionSchema>;
function errorMessage(error: any, fallback: string) {
  return error?.response?.data?.message || fallback;
}

export async function createTurfAction(payload: TurfActionPayload): Promise<ApiResponse<{ id: string }> | ApiErrorResponse> {
  const parsed = turfActionSchema.safeParse(payload);
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message || "Invalid input" };
  try {
    const response = await httpClient.post<{ id: string }>(API_ENDPOINTS.marketplace.ownerTurfs, parsed.data);
    return response;
  } catch (error: any) {
    return { success: false, message: errorMessage(error, "Failed to create turf") };
  }
}

export async function updateTurfAction(id: string, payload: TurfActionPayload): Promise<ApiResponse<{ id: string }> | ApiErrorResponse> {
  const parsed = turfActionSchema.safeParse(payload);
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message || "Invalid input" };
  try {
    const response = await httpClient.patch<{ id: string }>(`${API_ENDPOINTS.marketplace.ownerTurfs}/${id}`, parsed.data);
    return response;
  } catch (error: any) {
    return { success: false, message: errorMessage(error, "Failed to update turf") };
  }
}

export async function assignTurfFacilitiesAction(id: string, facilityIds: string[]): Promise<ApiResponse<unknown> | ApiErrorResponse> {
  try {
    const response = await httpClient.post<unknown>(`${API_ENDPOINTS.marketplace.ownerTurfs}/${id}/facilities`, { facilityIds });
    return response;
  } catch (error: any) {
    return { success: false, message: errorMessage(error, "Failed to save turf facilities") };
  }
}

export async function uploadTurfImagesAction(id: string, files: File[]): Promise<ApiResponse<unknown> | ApiErrorResponse> {
  try {
    if (!files.length) return { success: true, message: "No images to upload", data: [] };
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    return await httpClient.post(`${API_ENDPOINTS.marketplace.ownerTurfs}/${id}/images/upload`, formData);
  } catch (error: any) {
    return { success: false, message: errorMessage(error, "Failed to upload turf images") };
  }
}

export async function deleteTurfImageAction(id: string): Promise<ApiResponse<unknown> | ApiErrorResponse> {
  try {
    return await httpClient.delete(`/owner/turf-images/${id}`);
  } catch (error: any) {
    return { success: false, message: errorMessage(error, "Failed to remove turf image") };
  }
}

export async function deleteTurfAction(id: string): Promise<ApiResponse<void> | ApiErrorResponse> {
  try {
    const response = await httpClient.delete<void>(`${API_ENDPOINTS.marketplace.ownerTurfs}/${id}`);
    return response;
  } catch (error: any) {
    return { success: false, message: errorMessage(error, "Failed to delete turf") };
  }
}


