/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { httpClient } from "@/lib/axios/httpClient";
import { API_ENDPOINTS } from "@/lib/api/config";
import { ApiErrorResponse, ApiResponse } from "@/types/api.type";
import { z } from "zod";

const packageSchema = z.object({
  name: z.string().trim().min(2, "Package name must be at least 2 characters"),
  description: z.string().optional(),
  price: z.number().positive("Price must be greater than 0"),
  active: z.boolean().default(true),
  facilityIds: z.array(z.string()).optional(),
});

export type PackagePayload = z.infer<typeof packageSchema>;

function errorMessage(error: any, fallback: string) {
  return error?.response?.data?.message || fallback;
}

export async function createPackageAction(
  turfId: string,
  payload: PackagePayload
): Promise<ApiResponse<{ id: string }> | ApiErrorResponse> {
  const parsed = packageSchema.safeParse(payload);
  if (!parsed.success)
    return { success: false, message: parsed.error.issues[0]?.message || "Invalid input" };
  try {
    const response = await httpClient.post<{ id: string }>(
      `${API_ENDPOINTS.marketplace.ownerTurfs}/${turfId}/packages`,
      parsed.data
    );
    return response;
  } catch (error: any) {
    return { success: false, message: errorMessage(error, "Failed to create package") };
  }
}

export async function updatePackageAction(
  packageId: string,
  payload: PackagePayload
): Promise<ApiResponse<{ id: string }> | ApiErrorResponse> {
  const parsed = packageSchema.safeParse(payload);
  if (!parsed.success)
    return { success: false, message: parsed.error.issues[0]?.message || "Invalid input" };
  try {
    const response = await httpClient.patch<{ id: string }>(
      `${API_ENDPOINTS.marketplace.ownerPackages}/${packageId}`,
      parsed.data
    );
    return response;
  } catch (error: any) {
    return { success: false, message: errorMessage(error, "Failed to update package") };
  }
}

export async function deletePackageAction(
  packageId: string
): Promise<ApiResponse<void> | ApiErrorResponse> {
  try {
    const response = await httpClient.delete<void>(
      `${API_ENDPOINTS.marketplace.ownerPackages}/${packageId}`
    );
    return response;
  } catch (error: any) {
    return { success: false, message: errorMessage(error, "Failed to delete package") };
  }
}

export async function assignPackageFacilitiesAction(
  packageId: string,
  facilityIds: string[]
): Promise<ApiResponse<unknown> | ApiErrorResponse> {
  try {
    const response = await httpClient.post<unknown>(
      `${API_ENDPOINTS.marketplace.ownerPackages}/${packageId}/facilities`,
      { facilityIds }
    );
    return response;
  } catch (error: any) {
    return { success: false, message: errorMessage(error, "Failed to save package facilities") };
  }
}
