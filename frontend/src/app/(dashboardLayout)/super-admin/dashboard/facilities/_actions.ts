/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { httpClient } from "@/lib/axios/httpClient";
import { ApiErrorResponse, ApiResponse } from "@/types/api.type";
import { z } from "zod";

const facilitySchema = z.object({
  name: z.string().min(1, "Name is required"),
});

export async function createFacilityAction(
  payload: { name: string }
): Promise<ApiResponse<any> | ApiErrorResponse> {
  const parsed = facilitySchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message || "Invalid input" };
  }
  try {
    const response = await httpClient.post<any>("/facilities", parsed.data);
    return response;
  } catch (error: any) {
    return { success: false, message: error?.response?.data?.message || "Failed to create facility" };
  }
}

export async function updateFacilityAction(
  id: string,
  payload: { name: string }
): Promise<ApiResponse<any> | ApiErrorResponse> {
  const parsed = facilitySchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message || "Invalid input" };
  }
  try {
    const response = await httpClient.patch<any>(`/facilities/${id}`, parsed.data);
    return response;
  } catch (error: any) {
    return { success: false, message: error?.response?.data?.message || "Failed to update facility" };
  }
}

export async function deleteFacilityAction(
  id: string
): Promise<ApiResponse<void> | ApiErrorResponse> {
  try {
    const response = await httpClient.delete<void>(`/facilities/${id}`);
    return response;
  } catch (error: any) {
    return { success: false, message: error?.response?.data?.message || "Failed to delete facility" };
  }
}
