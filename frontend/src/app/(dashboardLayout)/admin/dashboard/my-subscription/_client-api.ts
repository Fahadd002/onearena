import { httpClient } from "@/lib/axios/httpClient";
import { ApiResponse, ApiErrorResponse } from "@/types/api.type";
import { API_ENDPOINTS } from "@/lib/api/config";

export async function getSubscriptionHistoryClient(): Promise<ApiResponse<unknown> | ApiErrorResponse> {
  try {
    return await httpClient.get(API_ENDPOINTS.subscription.subscriptionHistory);
  } catch (error: unknown) {
    return { success: false, message: error instanceof Error ? error.message : "Failed to fetch subscription history" };
  }
}

export async function updateSubscriptionClient(
  subscriptionId: string,
  data: {
    period: string;
    planId?: string;
    paymentMethod?: string;
    providerTransactionId?: string;
    payerMobileNumber?: string;
  }
): Promise<ApiResponse<unknown> | ApiErrorResponse> {
  try {
    const url = API_ENDPOINTS.subscription.subscriptionUpdate.replace(":subscriptionId", subscriptionId);
    const response = await httpClient.patch(url, data);
    return response;
  } catch (error: unknown) {
    return { success: false, message: error instanceof Error ? error.message : "Failed to update subscription" };
  }
}