/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { httpClient } from "@/lib/axios/httpClient";
import { API_ENDPOINTS } from "@/lib/api/config";
import { ApiErrorResponse, ApiResponse, paginationParams } from "@/types/api.type";
import { z } from "zod";

const bookingStatusSchema = z.enum(["PREBOOKED", "CONFIRMED", "COMPLETED", "CANCELLED", "EXPIRED", "KICKED_OFF"]);

const paymentStatusSchema = z.enum([
  "PENDING",
  "PROCESSING",
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
  "UNPAID",
  "PARTIALLY_PAID",
  "PAID",
]);

const paymentMethodSchema = z.enum(["CASH"]);

const paymentTypeSchema = z.enum(["ADVANCE", "REMAINING", "FULL"]);

const paymentUpdateSchema = z.object({
  paymentStatus: paymentStatusSchema.optional(),
  totalAmount: z.number().min(0, "Total amount cannot be negative").optional(),
});

const manualPaymentSchema = z.object({
  amount: z.number().min(0.01, "Payment amount must be greater than 0"),
  method: paymentMethodSchema,
  reference: z.string().optional(),
  note: z.string().optional(),
});

function errorMessage(error: any, fallback: string) {
  return error?.response?.data?.message || fallback;
}

export type BookingStatusValue = z.infer<typeof bookingStatusSchema>;
export type PaymentStatusValue = z.infer<typeof paymentStatusSchema>;
export type PaymentMethodValue = z.infer<typeof paymentMethodSchema>;
export type PaymentTypeValue = z.infer<typeof paymentTypeSchema>;
export type PaymentUpdatePayload = z.infer<typeof paymentUpdateSchema>;
export type ManualPaymentPayload = z.infer<typeof manualPaymentSchema>;

export interface StoredPayment {
  id: string;
  bookingId: string;
  amount: string;
  method: string;
  type: PaymentTypeValue;
  status: string;
  paidAt?: string | null;
  reference?: string | null;
  note?: string | null;
}

export interface StoredInvoice {
  id: string;
  invoiceNumber: string;
  bookingId: string;
  status: string;
  totalAmount: string;
  paidAmount: string;
  remainingAmount?: number;
  issueDate: string;
  dueDate?: string | null;
  payments?: StoredPayment[];
}

export type StoredBooking = {
  id: string;
  bookingNumber: string;
  status: BookingStatusValue | null;
  paymentStatus: PaymentStatusValue;
  totalAmount: string;
  mobile: string;
  createdAt: string;
  updatedAt: string;
  user: { id: string; name: string; email: string; phoneNumber?: string | null };
  slot: {
    id: string;
    slotDate: string;
    startMinute: number;
    endMinute: number;
    slotStatus: "AVAILABLE" | "PREBOOKED" | "BOOKED";
    turf: { id: string; name: string };
  };
  invoice?: StoredInvoice | null;
  payments?: StoredPayment[];
}

export interface BookingsListResponse {
  data: StoredBooking[];
  meta: paginationParams;
}

export async function listBookingsAction(params?: {
  page?: string;
  limit?: string;
  sortBy?: string;
  sortOrder?: string;
  bookingStatus?: string;
  paymentStatus?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}): Promise<ApiResponse<BookingsListResponse> | ApiErrorResponse> {
  try {
    const clean: Record<string, string> = {};
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== "") {
          clean[key] = value;
        }
      }
    }
    const response = await httpClient.get<BookingsListResponse>(
      API_ENDPOINTS.marketplace.bookings,
      { params: clean },
    );
    return response;
  } catch (error: any) {
    return { success: false, message: errorMessage(error, "Failed to fetch bookings") };
  }
}

export async function updateBookingStatusAction(
  bookingId: string,
  payload: { bookingStatus: BookingStatusValue },
): Promise<ApiResponse<unknown> | ApiErrorResponse> {
  const parsed = bookingStatusSchema.safeParse(payload.bookingStatus);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message || "Invalid booking status" };
  }
  try {
    const response = await httpClient.patch<unknown>(
      `${API_ENDPOINTS.marketplace.adminBookings}/${bookingId}/slot-status`,
      { bookingStatus: parsed.data },
    );
    return response;
  } catch (error: any) {
    return { success: false, message: errorMessage(error, "Failed to update booking status") };
  }
}

export async function updateBookingPaymentAction(
  bookingId: string,
  payload: PaymentUpdatePayload,
): Promise<ApiResponse<unknown> | ApiErrorResponse> {
  const parsed = paymentUpdateSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message || "Invalid payment data" };
  }
  try {
    const response = await httpClient.patch<unknown>(
      `${API_ENDPOINTS.marketplace.adminBookings}/${bookingId}/payment`,
      parsed.data,
    );
    return response;
  } catch (error: any) {
    return { success: false, message: errorMessage(error, "Failed to update payment") };
  }
}

export async function addManualPaymentAction(
  bookingId: string,
  payload: ManualPaymentPayload,
): Promise<ApiResponse<StoredPayment> | ApiErrorResponse> {
  const parsed = manualPaymentSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message || "Invalid payment amount" };
  }
  try {
    const response = await httpClient.post<StoredPayment>(
      `${API_ENDPOINTS.marketplace.bookings}/${bookingId}/manual-payment`,
      parsed.data,
    );
    return response;
  } catch (error: any) {
    return { success: false, message: errorMessage(error, "Failed to record payment") };
  }
}

export async function confirmBookingWithPaymentAction(
  bookingId: string,
  payload: { paymentAmount: number; paymentMethod: 'CASH'; reference?: string; note?: string },
): Promise<ApiResponse<unknown> | ApiErrorResponse> {
  try {
    const response = await httpClient.post<unknown>(
      `${API_ENDPOINTS.marketplace.adminBookings}/${bookingId}/confirm-with-payment`,
      payload,
    );
    return response;
  } catch (error: any) {
    return { success: false, message: errorMessage(error, "Failed to confirm booking with payment") };
  }
}

export async function fetchBookingInvoiceAction(
  bookingId: string,
): Promise<ApiResponse<StoredInvoice> | ApiErrorResponse> {
  try {
    const response = await httpClient.get<StoredInvoice>(
      `${API_ENDPOINTS.marketplace.bookings}/${bookingId}/invoice`,
    );
    return response;
  } catch (error: any) {
    return { success: false, message: errorMessage(error, "Failed to fetch invoice") };
  }
}

export async function fetchInvoicePaymentsAction(
  invoiceId: string,
): Promise<ApiResponse<StoredPayment[]> | ApiErrorResponse> {
  try {
    const response = await httpClient.get<StoredPayment[]>(
      `${API_ENDPOINTS.payments.invoicePayments.replace(':invoiceId', invoiceId)}`,
    );
    return response;
  } catch (error: any) {
    return { success: false, message: errorMessage(error, "Failed to fetch payments") };
  }
}

export async function updatePaymentStatusAction(
  paymentId: string,
  payload: { status: PaymentStatusValue; note?: string },
): Promise<ApiResponse<StoredPayment> | ApiErrorResponse> {
  try {
    const response = await httpClient.patch<StoredPayment>(
      `${API_ENDPOINTS.payments.paymentStatus.replace(':paymentId', paymentId)}`,
      payload,
    );
    return response;
  } catch (error: any) {
    return { success: false, message: errorMessage(error, "Failed to update payment status") };
  }
}
