"use server";

import { ApiResponse, ApiErrorResponse } from "@/types/api.type";
import { httpClient } from "@/lib/axios/httpClient";


export async function getOwnerApplicationById(
  profileId: string,
): Promise<ApiResponse<any> | ApiErrorResponse> {
  try {
    return await httpClient.get(`/owner-applications/${profileId}`);
  } catch (error: any) {
    const axiosError = error as any;
    const message =
      axiosError?.response?.data?.message || axiosError?.message || "Failed to fetch owner application";
    return { success: false, message };
  }
}

export async function updateOwnerApplicationStatus(
  profileId: string,
  payload: { status: string; reason?: string },
): Promise<ApiResponse<any>> {
  try {
    const result = await httpClient.patch(`/owner-applications/${profileId}/status`, payload);
    if (!result.success) {
      throw new Error(result.message);
    }
    return result;
  } catch (error: any) {
    const axiosError = error as any;
    const message =
      axiosError?.response?.data?.message || axiosError?.message || "Failed to update owner application";
    throw new Error(message);
  }
}
