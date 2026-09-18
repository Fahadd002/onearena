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

export interface InitiatePaymentRequest {
  planId: string;
  billingPeriod: "MONTHLY" | "QUARTERLY" | "HALF_YEARLY" | "YEARLY";
  paymentMethod: "BKASH" | "ROKET" | "NAGAD" | "CASH" | "OTHERS";
  providerTransactionId?: string;
}

export interface InitiatePaymentResponse {
  invoice: {
    id: string;
    invoiceNumber: string;
    totalAmount: number;
    status: string;
  };
  payment: {
    id: string;
    paymentNumber: string;
    amount: number;
    status: string;
    providerTransactionId: string | null;
  };
  subscription: {
    id: string;
    planId: string;
    status: string;
  };
}

export async function initiateSubscriptionPaymentClient(
  data: InitiatePaymentRequest
): Promise<ApiResponse<InitiatePaymentResponse> | ApiErrorResponse> {
  try {
    const response = await httpClient.post("/subscription/payment/initiate", data);
    return response;
  } catch (error: any) {
    const axiosError = error as any;
    const message =
      axiosError?.response?.data?.message || axiosError?.message || "Failed to initiate payment";
    return { success: false, message };
  }
}

export interface VerifyPaymentRequest {
  invoiceId: string;
  providerTransactionId: string;
  paymentMethod: "BKASH" | "ROKET" | "NAGAD" | "CASH" | "OTHERS";
}

export interface VerifyPaymentResponse {
  payment: {
    id: string;
    paymentNumber: string;
    amount: number;
    status: string;
    paidAt: string | null;
  };
  invoice: {
    id: string;
    invoiceNumber: string;
    totalAmount: number;
    paidAmount: number;
    status: string;
    isFullPaid: boolean;
  };
}

export async function verifySubscriptionPaymentClient(
  data: VerifyPaymentRequest
): Promise<ApiResponse<VerifyPaymentResponse> | ApiErrorResponse> {
  try {
    const response = await httpClient.post("/subscription/payment/verify", data);
    return response;
  } catch (error: any) {
    const axiosError = error as any;
    const message =
      axiosError?.response?.data?.message || axiosError?.message || "Failed to verify payment";
    return { success: false, message };
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
    const response = await httpClient.get("/subscription-plans");
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
