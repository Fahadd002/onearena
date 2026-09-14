/* eslint-disable @typescript-eslint/no-explicit-any */
/* File upload utilities - runs on client side to avoid Next.js body size limits */
import { httpClient } from "@/lib/axios/httpClient";
import { ApiResponse, ApiErrorResponse } from "@/types/api.type";

export async function uploadDocumentsClient(
  formData: FormData
): Promise<ApiResponse<any> | ApiErrorResponse> {
  try {
    const response = await httpClient.post("/owner-profile/documents/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    return response;
  } catch (error: any) {
    const axiosError = error as any;
    const message =
      axiosError?.response?.data?.message || axiosError?.message || "Failed to upload documents";
    return { success: false, message };
  }
}

export async function activateSubscriptionClient(
  planId: string,
  billingPeriod: "MONTHLY" | "QUARTERLY" | "HALF_YEARLY" | "YEARLY"
): Promise<ApiResponse<any> | ApiErrorResponse> {
  try {
    const response = await httpClient.post("/subscriptions/activate", {
      planId,
      billingPeriod
    });
    return response;
  } catch (error: any) {
    const axiosError = error as any;
    const message =
      axiosError?.response?.data?.message || axiosError?.message || "Failed to activate subscription";
    return { success: false, message };
  }
}

export async function activateFreeTrialClient(): Promise<ApiResponse<unknown> | ApiErrorResponse> {
  try {
    return await httpClient.post("/subscriptions/free-trial", {});
  } catch (error: unknown) {
    return { success: false, message: error instanceof Error ? error.message : "Failed to activate free trial" };
  }
}

export async function getCurrentSubscriptionClient(): Promise<ApiResponse<unknown> | ApiErrorResponse> {
  try {
    return await httpClient.get("/subscription");
  } catch (error: unknown) {
    return { success: false, message: error instanceof Error ? error.message : "Failed to fetch subscription" };
  }
}

export async function getSubscriptionPlansClient(): Promise<ApiResponse<any> | ApiErrorResponse> {
  try {
    const response = await httpClient.get("/subscriptions/plans");
    return response;
  } catch (error: any) {
    const axiosError = error as any;
    const message =
      axiosError?.response?.data?.message || axiosError?.message || "Failed to fetch subscription plans";
    return { success: false, message };
  }
}

export async function deleteDocumentClient(
  documentType: string
): Promise<ApiResponse<any> | ApiErrorResponse> {
  try {
    const response = await httpClient.delete(
      `/owner-profile/documents/${documentType}`
    );
    return response;
  } catch (error: any) {
    const axiosError = error as any;
    const message =
      axiosError?.response?.data?.message || axiosError?.message || "Failed to delete document";
    return { success: false, message };
  }
}
