"use server";

import { httpClient } from "@/lib/axios/httpClient";
import { API_ENDPOINTS } from "@/lib/api/config";
import { ApiErrorResponse, ApiResponse } from "@/types/api.type";
import { planSchema, updatePlanSchema, type SubscriptionPlanPayload, type UpdatePlanPayload } from "./schema";
import axios, { AxiosError } from "axios";

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorResponse>;
    if (axiosError.response?.data?.message) {
      return axiosError.response.data.message;
    }
    return axiosError.message;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

export async function createSubscriptionPlanAction(
  payload: SubscriptionPlanPayload
): Promise<ApiResponse<unknown> | ApiErrorResponse> {
  const parsed = planSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message || "Invalid input parameters" };
  }
  try {
    const response = await httpClient.post<unknown>(API_ENDPOINTS.subscription.plansPricing, parsed.data);
    return response;
  } catch (error: unknown) {
    return { success: false, message: getErrorMessage(error, "Failed to create subscription plan") };
  }
}

export async function updateSubscriptionPlanAction(
  id: string,
  payload: UpdatePlanPayload
): Promise<ApiResponse<unknown> | ApiErrorResponse> {
  const parsed = updatePlanSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message || "Invalid update payload" };
  }
  try {
    const response = await httpClient.patch<unknown>(`${API_ENDPOINTS.subscription.plansPricing}/${id}`, parsed.data);
    return response;
  } catch (error: unknown) {
    return { success: false, message: getErrorMessage(error, "Failed to update subscription plan") };
  }
}

export async function deleteSubscriptionPlanAction(
  id: string
): Promise<ApiResponse<void> | ApiErrorResponse> {
  try {
    const response = await httpClient.delete<void>(`${API_ENDPOINTS.subscription.plansPricing}/${id}`);
    return response;
  } catch (error: unknown) {
    return { success: false, message: getErrorMessage(error, "Failed to delete subscription plan") };
  }
}