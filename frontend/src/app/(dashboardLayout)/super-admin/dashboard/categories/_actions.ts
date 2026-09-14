"use server";

import { httpClient } from "@/lib/axios/httpClient";
import { ApiErrorResponse, ApiResponse } from "@/types/api.type";
import { z } from "zod";

const categorySchema = z.object({
  name: z.string().min(1, "Name is required"),
});

type CategoryPayload = z.infer<typeof categorySchema>;

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  return fallback;
}

export async function createCategoryAction(
  payload: CategoryPayload
): Promise<ApiResponse<unknown> | ApiErrorResponse> {
  const parsed = categorySchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message || "Invalid input" };
  }
  try {
    const response = await httpClient.post<unknown>("/categories", parsed.data);
    return response;
  } catch (error: unknown) {
    return { success: false, message: getErrorMessage(error, "Failed to create category") };
  }
}

export async function updateCategoryAction(
  id: string,
  payload: CategoryPayload
): Promise<ApiResponse<unknown> | ApiErrorResponse> {
  const parsed = categorySchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message || "Invalid input" };
  }
  try {
    const response = await httpClient.patch<unknown>(`/categories/${id}`, parsed.data);
    return response;
  } catch (error: unknown) {
    return { success: false, message: getErrorMessage(error, "Failed to update category") };
  }
}

export async function deleteCategoryAction(
  id: string
): Promise<ApiResponse<void> | ApiErrorResponse> {
  try {
    const response = await httpClient.delete<void>(`/categories/${id}`);
    return response;
  } catch (error: unknown) {
    return { success: false, message: getErrorMessage(error, "Failed to delete category") };
  }
}
