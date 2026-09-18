/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { ApiResponse, ApiErrorResponse } from "@/types/api.type";
import { httpClient } from "@/lib/axios/httpClient";

export async function getOwnerProfile(): Promise<ApiResponse<any> | ApiErrorResponse> {
  try {
    return await httpClient.get("/owner-profile");
  } catch (error: any) {
    const axiosError = error as any;
    const message =
      axiosError?.response?.data?.message || axiosError?.message || "Failed to fetch owner profile";
    return { success: false, message };
  }
}

export async function updateOwnerProfile(payload: {
  name?: string;
  image?: string | null;
  companyName?: string;
  bussinessEmail?: string;
  contactNumber?: string;
  address?: string;
  nidNumber?: string;
  businessRegistrationNumber?: string;
  tradeLicenseNumber?: string;
}): Promise<ApiResponse<any> | ApiErrorResponse> {
  try {
    return await httpClient.put("/owner-profile", payload);
  } catch (error: any) {
    const axiosError = error as any;
    const message =
      axiosError?.response?.data?.message || axiosError?.message || "Failed to update owner profile";
    return { success: false, message };
  }
}

export async function uploadProfileImage(file: File): Promise<ApiResponse<any> | ApiErrorResponse> {
  try {
    const formData = new FormData();
    formData.append("image", file);

    const response = await httpClient.post("/owner-profile/image", formData);
    return response;
  } catch (error: any) {
    const axiosError = error as any;
    const message =
      axiosError?.response?.data?.message || axiosError?.message || "Failed to upload image";
    return { success: false, message };
  }
}

export async function uploadDocuments(
  formData: FormData
): Promise<ApiResponse<any> | ApiErrorResponse> {
  try {
    return await httpClient.post("/owner-profile/documents/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
  } catch (error: any) {
    const axiosError = error as any;
    const message =
      axiosError?.response?.data?.message || axiosError?.message || "Failed to upload documents";
    return { success: false, message };
  }
}



export async function activateSubscription(
  planId: string,
  billingPeriod: "MONTHLY" | "QUARTERLY" | "HALF_YEARLY" | "YEARLY"
): Promise<ApiResponse<any> | ApiErrorResponse> {
  try {
    return await httpClient.post("/subscriptions/activate", {
      planId,
      billingPeriod
    });
  } catch (error: any) {
    const axiosError = error as any;
    const message =
      axiosError?.response?.data?.message || axiosError?.message || "Failed to activate subscription";
    return { success: false, message };
  }
}