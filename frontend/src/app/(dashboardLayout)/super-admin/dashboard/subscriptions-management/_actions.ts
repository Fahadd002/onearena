"use server";

import { API_ENDPOINTS } from "@/lib/api/config";
import { httpClient } from "@/lib/axios/httpClient";
import { ApiErrorResponse, ApiResponse } from "@/types/api.type";
import { z } from "zod";
import { safeApiCall } from "@/lib/api/errorHandler";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
export type SubscriptionStatus =
  | "FREE_TRIAL"
  | "ACTIVE"
  | "EXPIRING"
  | "EXPIRED"
  | "CANCELLED"
  | "INACTIVE";

export type FixedPeriod = "MONTHLY" | "QUARTERLY" | "HALF_YEARLY" | "YEARLY";

export type InvoiceStatus = "DRAFT" | "UNPAID" | "PARTIALLY_PAID" | "PAID";

export type PaymentStatus =
  | "PROCESSING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELLED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED"
  | "UNPAID"
  | "PARTIALLY_PAID"
  | "PAID";

export interface AdminInvoice {
  invoiceNumber: string;
  totalAmount: string;
  paidAmount: string;
  status: InvoiceStatus;
  payments?: AdminInvoicePayment[];
}

export interface AdminInvoicePayment {
  status: PaymentStatus;
  method: string;
  amount: string;
  paidAmount: string;
  payerMobileNumber: string | null;
  providerTransactionId: string | null;
  reference: string | null;
  note: string | null;
}


export interface AdminLatestLog {
  period: FixedPeriod;
}

export interface AdminSubscriptionPlan {
  name: string;
}

export interface AdminSubscription {
  id: string;
  userId: string;
  planId: string;
  status: SubscriptionStatus;
  startDate: string;
  endDate: string;

  user: { name: string; email: string, companyName: string; ownedTurfs?: string[] };
  plan: AdminSubscriptionPlan;

  // Flattened from backend
  latestLog: AdminLatestLog | null;
  invoice: AdminInvoice | null;
  outstanding: number;
  canAcceptPayment: boolean;
}

// ─────────────────────────────────────────────────────────────
// SCHEMAS
// ─────────────────────────────────────────────────────────────
const statusSchema = z.object({
  status: z.enum([
    "FREE_TRIAL",
    "ACTIVE",
    "EXPIRING",
    "EXPIRED",
    "CANCELLED",
    "INACTIVE",
  ]),
  endDate: z.string().min(1, "End date is required"),
});
type StatusPayload = z.infer<typeof statusSchema>;

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
function buildEndpoint(template: string, params: Record<string, string>) {
  return Object.entries(params).reduce(
    (path, [key, value]) => path.replace(`:${key}`, encodeURIComponent(value)),
    template,
  );
}

// ─────────────────────────────────────────────────────────────
// ACTIONS
// ─────────────────────────────────────────────────────────────
export async function updateSubscriptionAction(
  id: string,
  payload: StatusPayload,
): Promise<ApiResponse<unknown> | ApiErrorResponse> {
  const parsed = statusSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message || "Invalid input",
    } as ApiErrorResponse<unknown>;
  }
  return safeApiCall(
    () =>
      httpClient.patch<AdminSubscription>(
        buildEndpoint(
          API_ENDPOINTS.subscription.updateSubcriptionBySuperAdmin,
          { subscriptionId: id },
        ),
        parsed.data,
      ),
    "Failed to update subscription"
  );
}

export async function confirmOnlinePaymentForSubscription(
  subscriptionId: string,
): Promise<ApiResponse<unknown> | ApiErrorResponse> {
  return safeApiCall(
    () =>
      httpClient.post<unknown>(
        buildEndpoint(
          API_ENDPOINTS.subscription.confirmOnlinePaymentForSubscription,
          { subscriptionId },
        ),
        {},
      ),
    "Failed to confirm online payment"
  );
}

// ─────────────────────────────────────────────────────────────
// SUPER ADMIN — take cash payment (cash in hand)
// ─────────────────────────────────────────────────────────────
export async function takeCashPaymentForSubscription(
  subscriptionId: string,
  payload: { amount?: number; reference?: string; note?: string },
): Promise<ApiResponse<unknown> | ApiErrorResponse> {
  return safeApiCall(
    () =>
      httpClient.post<unknown>(
        buildEndpoint(
          API_ENDPOINTS.subscription.takeCashPaymentForSubscription,
          { subscriptionId },
        ),
        payload,
      ),
    "Failed to record cash payment"
  );
}