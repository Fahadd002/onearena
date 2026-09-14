/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { ApiResponse, ApiErrorResponse } from "@/types/api.type";
import { httpClient } from "@/lib/axios/httpClient";

export async function listOwnerApplications(
  params?: Record<string, unknown>,
): Promise<ApiResponse<{ data: any[]; meta: { page: number; limit: number; total: number; totalPages: number } }> | ApiErrorResponse> {
  try {
    return await httpClient.get("/owner-applications", { params });
  } catch (error: any) {
    const axiosError = error as any;
    const message =
      axiosError?.response?.data?.message || axiosError?.message || "Failed to fetch owner applications";
    return { success: false, message };
  }
}

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
): Promise<ApiResponse<any> | ApiErrorResponse> {
  try {
    return await httpClient.patch(`/owner-applications/${profileId}/status`, payload);
  } catch (error: any) {
    const axiosError = error as any;
    const message =
      axiosError?.response?.data?.message || axiosError?.message || "Failed to update owner application";
    return { success: false, message };
  }
}
