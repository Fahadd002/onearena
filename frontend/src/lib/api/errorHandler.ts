import { AxiosError } from "axios";
import { ApiErrorResponse, ApiResponse } from "@/types/api.type";

export function extractErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data as ApiErrorResponse | undefined;
    if (data?.message) return data.message;
    if (error.message) return error.message;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

export function handleApiError<TData = unknown>(
  error: unknown,
  fallback: string
): ApiErrorResponse<TData> {
  const message = extractErrorMessage(error, fallback);
  return { success: false, message, meta: undefined, data: null };
}

export async function safeApiCall<TData>(
  fn: () => Promise<ApiResponse<TData>>,
  fallbackMessage: string
): Promise<ApiResponse<TData> | ApiErrorResponse<TData>> {
  try {
    return await fn();
  } catch (error) {
    return handleApiError(error, fallbackMessage);
  }
}