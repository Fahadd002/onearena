"use server";

import { httpClient } from "@/lib/axios/httpClient";
import { ApiErrorResponse, ApiResponse } from "@/types/api.type";
import { z } from "zod";

const planSchema = z.object({
  name: z.string().min(1, "Name is required"),
  maxTurfs: z.coerce.number().min(1, "Max turfs is required"),
  active: z.boolean().optional(),
  prices: z.array(z.object({
    period: z.enum(["MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY"]),
    price: z.coerce.number().min(0),
  })),
});

type SubscriptionPlanPayload = z.infer<typeof planSchema>;

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  return fallback;
}

export async function createSubscriptionPlanAction(
  payload: SubscriptionPlanPayload
): Promise<ApiResponse<unknown> | ApiErrorResponse> {
  const parsed = planSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message || "Invalid input" };
  }
  try {
    const response = await httpClient.post<unknown>("/subscription-plans", parsed.data);
    return response;
  } catch (error: unknown) {
    return { success: false, message: getErrorMessage(error, "Failed to create plan") };
  }
}

export async function updateSubscriptionPlanAction(
  id: string,
  payload: Partial<SubscriptionPlanPayload>
): Promise<ApiResponse<unknown> | ApiErrorResponse> {
  try {
    const response = await httpClient.patch<unknown>(`/subscription-plans/${id}`, payload);
    return response;
  } catch (error: unknown) {
    return { success: false, message: getErrorMessage(error, "Failed to update plan") };
  }
}

export async function deleteSubscriptionPlanAction(
  id: string
): Promise<ApiResponse<void> | ApiErrorResponse> {
  try {
    const response = await httpClient.delete<void>(`/subscription-plans/${id}`);
    return response;
  } catch (error: unknown) {
    return { success: false, message: getErrorMessage(error, "Failed to delete plan") };
  }
}