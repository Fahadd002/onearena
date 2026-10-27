/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { httpClient } from "@/lib/axios/httpClient";
import { API_ENDPOINTS } from "@/lib/api/config";
import { ApiErrorResponse, ApiResponse } from "@/types/api.type";
import { z } from "zod";

const bookingStatusSchema = z.enum(["PREBOOKED", "CONFIRMED", "CANCELLED"]);

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

const paymentMethodSchema = z.enum(["CASH", "BKASH", "NAGAD", "ROCKET", "CARD", "BANK_TRANSFER"]);

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
export type ManualPaymentPayload = z.infer<typeof manualPaymentSchema>;

export interface StoredPayment {
  id: string;
  paymentNumber: string;
  amount: string;
  method: string;
  type: string;
  status: string;
  paidAt?: string | null;
  reference?: string | null;
  note?: string | null;
  payerMobileNumber?: string | null;
  providerTransactionId?: string | null;
  paymentIntentId?: string | null;
  checkoutSessionId?: string | null;
  receivedBy?: { id: string; name: string } | null;
  createdAt: string;
}

export interface StoredInvoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  invoiceFor?: string;
  status: string;
  subtotal: string;
  discount: string;
  totalAmount: string;
  paidAmount: string;
  isFullPaid: boolean;
  payments: StoredPayment[];
}

export interface StoredBookingSlot {
  id: string;
  slotDate: string;
  startMinute: number;
  endMinute: number;
  price?: string | number;
  isPeakTime?: boolean;
  slotStatus: "AVAILABLE" | "WAITLIST" | "BOOKED";
  turf: { id: string; name: string };
}

/**
 * Matches the backend BookingListItemDto.
 * `user` relation is intentionally removed — Booking carries `userId` + `mobile`.
 */
export type StoredBooking = {
  id: string;
  bookingNumber: string;
  userId: string;
  mobile: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  status: BookingStatusValue | null;
  paymentStatus: PaymentStatusValue;
  baseAmount?: string;
  packageAmount?: string;
  discountAmount?: string;
  subtotal?: string;
  totalAmount: string;
  numberOfSlot: number;
  bookingExpiresAt?: string | null;
  createdAt: string;
  updatedAt: string;

  // Both shapes for backward compat with helpers + sort keys
  slot: StoredBookingSlot | null;
  slots: StoredBookingSlot[];

  invoice?: StoredInvoice | null;
};
// ----------------------------------------------------------------
// Payments
// ----------------------------------------------------------------
export async function addManualPaymentAction(
  bookingId: string,
  payload: ManualPaymentPayload
): Promise<ApiResponse<StoredPayment> | ApiErrorResponse> {
  const parsed = manualPaymentSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message || "Invalid payment amount" };
  }
  try {
    const response = await httpClient.post<StoredPayment>(
      `${API_ENDPOINTS.marketplace.bookings}/${bookingId}/manual-payment`,
      parsed.data
    );
    return response;
  } catch (error: any) {
    return { success: false, message: errorMessage(error, "Failed to record payment") };
  }
}

// ----------------------------------------------------------------
// Confirm booking (with / without payment)
// ----------------------------------------------------------------
export async function confirmBookingAction(
  bookingId: string
): Promise<ApiResponse<unknown> | ApiErrorResponse> {
  try {
    const response = await httpClient.post<unknown>(
      `${API_ENDPOINTS.marketplace.bookings}/${bookingId}/confirm`,
      undefined
    );
    return response;
  } catch (error: any) {
    return { success: false, message: errorMessage(error, "Failed to confirm booking") };
  }
}

export async function confirmBookingWithPaymentAction(
  bookingId: string,
  payload: { paymentAmount: number; paymentMethod: string; reference?: string; note?: string }
): Promise<ApiResponse<unknown> | ApiErrorResponse> {
  try {
    const response = await httpClient.post<unknown>(
      `${API_ENDPOINTS.marketplace.adminBookings}/${bookingId}/confirm-with-payment`,
      payload
    );
    return response;
  } catch (error: any) {
    return { success: false, message: errorMessage(error, "Failed to confirm booking with payment") };
  }
}

export async function verifyAdvancePaymentAction(
  bookingId: string
): Promise<ApiResponse<unknown> | ApiErrorResponse> {
  try {
    const response = await httpClient.patch<unknown>(
      `${API_ENDPOINTS.marketplace.bookings}/${bookingId}/verify-advance`,
      {}
    );
    return response;
  } catch (error: any) {
    return { success: false, message: errorMessage(error, "Failed to verify advance payment") };
  }
}

// ----------------------------------------------------------------
// Admin: create a user + create a booking on behalf of a user
// ----------------------------------------------------------------
const createUserByAdminSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phoneNumber: z.string().min(1, "Phone number is required"),
});

const adminBookingAdvanceSchema = z.object({
  method: z.string().min(1, "Payment method is required"),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  senderMobile: z.string().optional(),
  transactionId: z.string().optional(),
  reference: z.string().optional(),
  note: z.string().optional(),
});

const adminBookingSchema = z.object({
  userId: z.string().min(1, "User is required"),
  slotIds: z.array(z.string().min(1)).min(1, "At least one slot is required"),
  discountAmount: z.number().min(0).optional(),
  mobile: z.string().optional(),
  advancePayment: adminBookingAdvanceSchema.optional(),
});

export type CreateUserByAdminPayload = z.infer<typeof createUserByAdminSchema>;
export type AdminBookingAdvancePayload = z.infer<typeof adminBookingAdvanceSchema>;
export type AdminBookingPayload = z.infer<typeof adminBookingSchema>;

export interface CreatedUser {
  id: string;
  name: string;
  email: string | null;
  phoneNumber: string | null;
  tempPassword?: string | null;
}

export interface CreatedBooking {
  id: string;
  bookingNumber: string;
}

export async function createUserByAdminAction(
  payload: CreateUserByAdminPayload
): Promise<ApiResponse<CreatedUser> | ApiErrorResponse> {
  const parsed = createUserByAdminSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message || "Invalid user data" };
  }
  try {
    const response = await httpClient.post<CreatedUser>(
      API_ENDPOINTS.marketplace.usersByPhone,
      parsed.data
    );
    return response;
  } catch (error: any) {
    return { success: false, message: errorMessage(error, "Failed to create user") };
  }
}

export async function createBookingByAdminAction(
  payload: AdminBookingPayload
): Promise<ApiResponse<CreatedBooking> | ApiErrorResponse> {
  const parsed = adminBookingSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message || "Invalid booking data" };
  }
  try {
    const response = await httpClient.post<CreatedBooking>(
      API_ENDPOINTS.marketplace.adminBookings,
      parsed.data
    );
    return response;
  } catch (error: any) {
    return { success: false, message: errorMessage(error, "Failed to create booking") };
  }
}