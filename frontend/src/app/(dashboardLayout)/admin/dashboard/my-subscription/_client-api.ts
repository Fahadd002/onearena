import { httpClient } from "@/lib/axios/httpClient";
import { ApiResponse, ApiErrorResponse } from "@/types/api.type";

export async function getSubscriptionHistoryClient(): Promise<ApiResponse<unknown> | ApiErrorResponse> {
  try {
    return await httpClient.get("/subscription/history");
  } catch (error: unknown) {
    return { success: false, message: error instanceof Error ? error.message : "Failed to fetch subscription history" };
  }
}