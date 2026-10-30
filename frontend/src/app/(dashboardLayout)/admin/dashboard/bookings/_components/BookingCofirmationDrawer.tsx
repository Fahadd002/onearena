"use client";

import { format } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { Badge } from "@/components/premium/Badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatTimeWithPeriod } from "@/lib/time-utils";
import {
  bookingSlots,
  bookingTurfNames,
  formatBookingDate,
  groupSlotsByDate,
  slotStatusLabel,
  slotStatusStyle,
} from "@/lib/booking-utils";
import {
  X,
  CreditCard,
  Calendar,
  Check,
  AlertCircle,
  Clock,
  Receipt,
  Smartphone,
  Hash,
  User as UserIcon,
} from "lucide-react";
import {
  type StoredBooking,
  type BookingStatusValue,
  type PaymentStatusValue,
  type StoredPayment,
} from "@/app/(dashboardLayout)/admin/dashboard/bookings/_actions";

const bookingStatusVariant: Record<BookingStatusValue, "success" | "warning" | "destructive"> = {
  PREBOOKED: "warning",
  CONFIRMED: "success",
  CANCELLED: "destructive",
};

const paymentStatusVariant: Record<
  PaymentStatusValue,
  "success" | "warning" | "destructive" | "outline"
> = {
  UNPAID: "warning",
  PENDING: "warning",
  PROCESSING: "warning",
  PARTIALLY_PAID: "warning",
  PARTIALLY_REFUNDED: "warning",
  PAID: "success",
  SUCCEEDED: "success",
  FAILED: "destructive",
  CANCELLED: "destructive",
  REFUNDED: "destructive",
};

function bookingStatusLabel(status: BookingStatusValue | null | undefined): string {
  if (!status) return "Unknown";
  const map: Record<BookingStatusValue, string> = {
    PREBOOKED: "Pre-booked",
    CONFIRMED: "Confirmed",
    CANCELLED: "Cancelled",
  };
  return map[status] ?? status;
}

function getPaymentStatusInfo(status: PaymentStatusValue | null | undefined) {
  if (!status) return { label: "Unknown", variant: "outline" as const, alert: null };
  const variant = paymentStatusVariant[status] ?? "outline";

  let alert: { message: string; type: "warning" | "info" } | null = null;
  if (status === "PROCESSING") {
    alert = {
      message: "Advance payment reported by customer. Verify and mark as received.",
      type: "warning",
    };
  } else if (status === "PARTIALLY_PAID") {
    alert = {
      message: "Partial payment received. Outstanding balance remains.",
      type: "info",
    };
  } else if (status === "UNPAID") {
    alert = {
      message: "No payment received yet. Collect payment or mark as paid.",
      type: "warning",
    };
  }

  const labels: Partial<Record<PaymentStatusValue, string>> = {
    UNPAID: "Unpaid",
    PARTIALLY_PAID: "Partially Paid",
    PAID: "Paid",
    PROCESSING: "Processing",
    PENDING: "Pending",
    SUCCEEDED: "Succeeded",
    FAILED: "Failed",
    CANCELLED: "Cancelled",
    REFUNDED: "Refunded",
    PARTIALLY_REFUNDED: "Partially Refunded",
  };

  return {
    label: labels[status] ?? status,
    variant,
    alert,
  };
}

function formatPaymentMethod(method: string) {
  const labels: Record<string, string> = {
    CASH: "Cash",
    BKASH: "bKash",
    NAGAD: "Nagad",
    ROCKET: "Rocket",
    CARD: "Card",
    BANK_TRANSFER: "Bank Transfer",
  };
  return labels[method] ?? method;
}

function formatPaymentType(type: string | undefined | null) {
  if (!type) return null;
  const labels: Record<string, string> = {
    ADVANCE: "Advance",
    REMAINING: "Remaining",
    FULL: "Full",
  };
  return labels[type] ?? type;
}

interface BookingConfirmationProps {
  open: boolean;
  onClose: () => void;
  selectedBooking: StoredBooking | null;
  isLoadingDetails: boolean;
  isMutating: boolean;
  paymentOption: "none" | "partial" | "full";
  setPaymentOption: (v: "none" | "partial" | "full") => void;
  paymentAmount: string;
  setPaymentAmount: (v: string) => void;
  paymentReference: string;
  setPaymentReference: (v: string) => void;
  paymentNote: string;
  setPaymentNote: (v: string) => void;
  isPartialInvalid: boolean;
  isPartialOverMax: boolean;
  canCollectPayment: boolean;
  paymentDue: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  isPrebooked: boolean;
  isConfirmed: boolean;
  isCancelled: boolean;
  isFullyPaid: boolean;
  hasInvoice: boolean;
  onConfirm: () => void;
  onVerifyAdvance: () => void;
  verifyAdvancePending: boolean;
}

const BookingCofirmationDrawer = (props: BookingConfirmationProps) => {
  const {
    open,
    onClose,
    selectedBooking,
    isLoadingDetails,
    isMutating,
    paymentOption,
    setPaymentOption,
    paymentAmount,
    setPaymentAmount,
    paymentReference,
    setPaymentReference,
    paymentNote,
    setPaymentNote,
    isPartialInvalid,
    isPartialOverMax,
    canCollectPayment,
    paymentDue,
    totalAmount,
    paidAmount,
    remainingAmount,
    isPrebooked,
    isConfirmed,
    isCancelled,
    isFullyPaid,
    hasInvoice,
    onConfirm,
    onVerifyAdvance,
    verifyAdvancePending,
  } = props;

  const invoice = selectedBooking?.invoice;
  const payments = invoice?.payments ?? [];
  const paymentStatusInfo = getPaymentStatusInfo(selectedBooking?.paymentStatus);

  return (
    <AnimatePresence>
      {open && selectedBooking && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l border-border bg-card shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border bg-secondary/30 p-4">
              <div className="flex items-center gap-2">
                <Calendar className="size-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">
                  {isCancelled ? "Cancelled Booking" : isPrebooked ? "Confirm Booking" : "Booking Details"} — #
                  {selectedBooking?.bookingNumber ?? "..."}
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-5">
              {isLoadingDetails ? (
                <div className="space-y-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 mx-auto" />
                  ))}
                </div>
              ) : selectedBooking ? (
                <>
                  {paymentStatusInfo.alert && (
                    <div
                      className={`flex items-start gap-3 rounded-xl border p-4 ${
                        paymentStatusInfo.alert.type === "warning"
                          ? "border-amber-200 bg-amber-50 dark:border-amber-900/30 dark:bg-amber-950/30"
                          : "border-blue-200 bg-blue-50 dark:border-blue-900/30 dark:bg-blue-950/30"
                      }`}
                    >
                      <div className="flex-1">
                        <p
                          className={`text-sm font-medium ${
                            paymentStatusInfo.alert.type === "warning"
                              ? "text-amber-800 dark:text-amber-200"
                              : "text-blue-800 dark:text-blue-200"
                          }`}
                        >
                          {paymentStatusInfo.label}
                        </p>
                        <p
                          className={`mt-0.5 text-xs ${
                            paymentStatusInfo.alert.type === "warning"
                              ? "text-amber-700 dark:text-amber-300"
                              : "text-blue-700 dark:text-blue-300"
                          }`}
                        >
                          {paymentStatusInfo.alert.message}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/10 p-3.5">
                    <div className="flex items-center gap-3">
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 20 }}
                        className="grid size-7 place-items-center rounded-full bg-primary text-primary-foreground shadow-xs"
                      >
                        <Check className="size-4 stroke-[3]" />
                      </motion.span>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-primary">
                          {isPrebooked ? "Selected Booking" : "Booking"}
                        </p>
                        <p className="text-xs font-bold text-foreground">
                          #{selectedBooking.bookingNumber}
                        </p>
                      </div>
                    </div>
                    <span className="text-base font-extrabold text-primary">
                      ৳ {totalAmount.toLocaleString()}
                    </span>
                  </div>

                  <div className="space-y-3 border-y border-border py-4 text-xs">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Turf</span>
                      <span className="truncate pr-2 font-semibold text-foreground">
                        {(() => {
                          const names = bookingTurfNames(bookingSlots(selectedBooking));
                          return names.length ? names.join(", ") : "—";
                        })()}
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Total Slots</span>
                      <span className="font-semibold text-foreground">
                        {selectedBooking.numberOfSlot ?? bookingSlots(selectedBooking).length}
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <UserIcon className="size-3" />
                        Customer Name
                      </span>
                      <span className="truncate pr-2 font-semibold text-foreground">
                        {selectedBooking.customerName?.trim() || "Guest"}
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <UserIcon className="size-3" />
                        Customer Phone
                      </span>
                      <span className="truncate pr-2 font-semibold text-foreground">
                        {selectedBooking.customerPhone?.trim() || selectedBooking.mobile?.trim() || "—"}
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Current Status</span>
                      <Badge
                        variant={
                          bookingStatusVariant[selectedBooking.status as BookingStatusValue] ??
                          "outline"
                        }
                        size="sm"
                      >
                        {bookingStatusLabel(selectedBooking.status)}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Payment Status</span>
                      <Badge
                        variant={paymentStatusVariant[selectedBooking.paymentStatus] ?? "outline"}
                        size="sm"
                      >
                        {selectedBooking.paymentStatus}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-medium">
                      Booked Slots ({bookingSlots(selectedBooking).length})
                    </Label>
                    {groupSlotsByDate(bookingSlots(selectedBooking)).map(([date, group]) => (
                      <div
                        key={date}
                        className="overflow-hidden rounded-xl border border-border bg-muted/30"
                      >
                        <div className="flex items-center gap-2 border-b border-border bg-primary/5 px-3 py-2">
                          <Calendar className="size-3.5 text-primary" />
                          <span className="text-xs font-bold text-foreground">
                            {formatBookingDate(date)}
                          </span>
                          <span className="ml-auto text-[11px] font-medium text-muted-foreground">
                            {group.length} {group.length === 1 ? "slot" : "slots"}
                          </span>
                        </div>
                        <div className="divide-y divide-border">
                          {group.map((slot) => {
                            const slotStatus = String(slot.slotStatus ?? "AVAILABLE");
                            return (
                              <div
                                key={slot.id}
                                className="flex items-center justify-between gap-3 px-3 py-2.5"
                              >
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-foreground">
                                    {formatTimeWithPeriod(slot.startMinute)} –{" "}
                                    {formatTimeWithPeriod(slot.endMinute)}
                                  </p>
                                  <p className="truncate text-[11px] text-muted-foreground">
                                    {slot.turf?.name ?? "—"}
                                    {slot.isPeakTime && (
                                      <span className="ml-1.5 font-bold uppercase text-warning">
                                        Peak
                                      </span>
                                    )}
                                  </p>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                  <span className="text-xs font-bold text-foreground">
                                    ৳{Number(slot.price ?? 0).toLocaleString()}
                                  </span>
                                  <span
                                    className={cn(
                                      "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                                      slotStatusStyle(slotStatus)
                                    )}
                                  >
                                    {slotStatusLabel(slotStatus)}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    {!bookingSlots(selectedBooking).length && (
                      <p className="rounded-lg bg-muted p-3 text-center text-xs text-muted-foreground">
                        No slots attached to this booking.
                      </p>
                    )}
                  </div>

                  {hasInvoice && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Receipt className="size-4 text-primary" />
                        <Label className="text-sm font-medium">Invoice & Payments</Label>
                      </div>

                      <div
                        className={`rounded-xl border p-4 ${
                          isFullyPaid
                            ? "border-success/30 bg-success/10"
                            : "border-amber-500/30 bg-amber-500/10"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground">
                              Invoice #{invoice?.invoiceNumber}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              Date:{" "}
                              {invoice?.invoiceDate
                                ? format(new Date(invoice.invoiceDate), "dd MMM yyyy, hh:mm a")
                                : "—"}
                            </p>
                          </div>
                          <Badge
                            variant={
                              isFullyPaid
                                ? "success"
                                : invoice?.status === "UNPAID"
                                  ? "destructive"
                                  : "warning"
                            }
                            size="sm"
                          >
                            {invoice?.status}
                          </Badge>
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                          <div className="rounded-lg bg-background/50 p-2">
                            <p className="text-[10px] text-muted-foreground">Total</p>
                            <p className="text-xs font-bold">
                              ৳{Number(invoice?.totalAmount ?? 0).toLocaleString()}
                            </p>
                          </div>
                          <div className="rounded-lg bg-background/50 p-2">
                            <p className="text-[10px] text-muted-foreground">Paid</p>
                            <p className="text-xs font-bold text-success">
                              ৳{Number(invoice?.paidAmount ?? 0).toLocaleString()}
                            </p>
                          </div>
                          <div className="rounded-lg bg-background/50 p-2">
                            <p className="text-[10px] text-muted-foreground">Due</p>
                            <p className="text-xs font-bold text-destructive">
                              ৳{remainingAmount.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>

                      {payments.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">
                            Payment History ({payments.length})
                          </p>
                          <div className="space-y-2">
                            {payments.map((payment: StoredPayment) => (
                              <div
                                key={payment.id}
                                className="rounded-lg border border-border bg-muted/30 p-3"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="grid size-6 place-items-center rounded-full bg-primary/10">
                                      <CreditCard className="size-3 text-primary" />
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium">
                                        ৳{Number(payment.amount).toLocaleString()}
                                      </p>
                                      <p className="text-[11px] text-muted-foreground">
                                        {formatPaymentMethod(payment.method)}
                                        {formatPaymentType(payment.type) &&
                                          ` • ${formatPaymentType(payment.type)}`}
                                        {payment.paidAt &&
                                          ` • ${format(
                                            new Date(payment.paidAt),
                                            "dd MMM yyyy, hh:mm a"
                                          )}`}
                                      </p>
                                    </div>
                                  </div>
                                  <Badge
                                    variant={
                                      payment.status === "SUCCEEDED" ||
                                      payment.status === "PAID"
                                        ? "success"
                                        : payment.status === "PROCESSING"
                                          ? "warning"
                                          : "destructive"
                                    }
                                    size="sm"
                                  >
                                    {payment.status}
                                  </Badge>
                                </div>

                                <div className="mt-2 space-y-1 border-t border-border pt-2">
                                  {payment.paymentNumber && (
                                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                      <Hash className="size-3" />
                                      <span className="font-medium text-foreground/80">Payment #</span>
                                      <span>{payment.paymentNumber}</span>
                                    </div>
                                  )}
                                  {payment.type && (
                                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                      <CreditCard className="size-3" />
                                      <span className="font-medium text-foreground/80">Type</span>
                                      <span>{formatPaymentType(payment.type)}</span>
                                    </div>
                                  )}
                                  {payment.reference && (
                                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                      <Hash className="size-3" />
                                      <span className="font-medium text-foreground/80">Ref</span>
                                      <span>{payment.reference}</span>
                                    </div>
                                  )}
                                  {payment.providerTransactionId && (
                                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                      <Hash className="size-3" />
                                      <span className="font-medium text-foreground/80">Transaction</span>
                                      <span>{payment.providerTransactionId}</span>
                                    </div>
                                  )}
                                  {payment.payerMobileNumber && (
                                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                      <Smartphone className="size-3" />
                                      <span className="font-medium text-foreground/80">Payer</span>
                                      <span>{payment.payerMobileNumber}</span>
                                    </div>
                                  )}
                                  {payment.note && (
                                    <p className="text-[11px] italic text-muted-foreground">
                                      Note: {payment.note}
                                    </p>
                                  )}
                                  {payment.receivedBy && (
                                    <p className="text-[11px] text-muted-foreground">
                                      <span className="font-medium text-foreground/80">Received by</span>{" "}
                                      {payment.receivedBy.name}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {payments.length === 0 && (
                        <p className="rounded-lg bg-muted p-3 text-center text-xs text-muted-foreground">
                          No payments recorded yet.
                        </p>
                      )}
                    </div>
                  )}

                  <div className="space-y-4">
                    <Label className="text-sm font-medium">
                      {isCancelled
                        ? "No action available"
                        : isPrebooked
                          ? "Payment Option"
                          : "Collect Payment"}
                    </Label>
                    {!isCancelled && (
                      <RadioGroup
                        value={paymentOption}
                        onValueChange={(value) =>
                          setPaymentOption(value as "none" | "partial" | "full")
                        }
                        className="space-y-3"
                      >
                        {isPrebooked && (
                          <div className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50">
                            <RadioGroupItem value="none" id="none" />
                            <Label htmlFor="none" className="flex-1 cursor-pointer">
                              <div className="font-medium">Without Payment</div>
                              <div className="text-xs text-muted-foreground">
                                Confirm now and create an unpaid invoice.
                              </div>
                            </Label>
                          </div>
                        )}

                        {canCollectPayment && paymentDue > 0 && (
                          <>
                            <div className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50">
                              <RadioGroupItem value="partial" id="partial" />
                              <Label htmlFor="partial" className="flex-1 cursor-pointer">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="font-medium">With Partial Payment</div>
                                    <div className="text-xs text-muted-foreground">
                                      {isPrebooked
                                        ? "Records part of the amount now."
                                        : "Records part of the outstanding balance."}
                                    </div>
                                  </div>
                                  <CreditCard className="size-4 text-primary" />
                                </div>
                              </Label>
                            </div>

                            <div className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50">
                              <RadioGroupItem value="full" id="full" />
                              <Label htmlFor="full" className="flex-1 cursor-pointer">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="font-medium">
                                      {isPrebooked ? "With Full Payment" : "Pay Full Balance"}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {isPrebooked
                                        ? "Records the full amount now."
                                        : "Settles the remaining balance."}
                                    </div>
                                  </div>
                                  <CreditCard className="size-4 text-primary" />
                                </div>
                              </Label>
                            </div>
                          </>
                        )}

                        {isFullyPaid && (
                          <div className="rounded-lg border border-success/30 bg-success/10 p-3">
                            <div className="flex items-center gap-2 text-success">
                              <Check className="size-4" />
                              <span className="text-sm font-medium">Invoice fully paid</span>
                            </div>
                          </div>
                        )}

                        {isConfirmed && !hasInvoice && (
                          <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3">
                            <div className="flex items-center gap-2 text-green-700">
                              <Check className="size-4" />
                              <span className="text-sm font-medium">
                                Booking already confirmed
                              </span>
                            </div>
                          </div>
                        )}

                        {selectedBooking?.paymentStatus === "PROCESSING" && !isPrebooked && !isCancelled && (
                          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900/30 dark:bg-blue-950/30">
                            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                              <Clock className="size-4" />
                              <span className="text-sm font-medium">
                                Advance payment reported by customer
                              </span>
                            </div>
                            <div className="mt-2 text-xs text-blue-700/80 dark:text-blue-300/80">
                              Verify the transaction and mark as received.
                            </div>
                            <Button
                              size="sm"
                              variant="default"
                              className="mt-3 w-full"
                              onClick={onVerifyAdvance}
                              disabled={verifyAdvancePending}
                            >
                              {verifyAdvancePending ? "Verifying..." : "Verify & Mark as Received"}
                            </Button>
                          </div>
                        )}
                      </RadioGroup>
                    )}

                    {(paymentOption === "partial" || paymentOption === "full") &&
                      canCollectPayment &&
                      paymentDue > 0 && (
                        <div className="space-y-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium">
                              Payment Amount (৳){" "}
                              {paymentOption === "full" && (
                                <span className="text-muted-foreground">(Auto-filled)</span>
                              )}
                            </Label>
                            <Input
                              type="number"
                              min={0}
                              max={paymentDue}
                              step={1}
                              value={
                                paymentOption === "full" ? String(paymentDue) : paymentAmount
                              }
                              onChange={(e) => setPaymentAmount(e.target.value)}
                              disabled={paymentOption === "full"}
                              className="h-8 text-sm"
                              placeholder={
                                paymentOption === "full" ? String(paymentDue) : "Enter amount"
                              }
                            />
                            <p className="text-xs text-muted-foreground">
                              Max: ৳{paymentDue.toLocaleString()}
                              {!isPrebooked &&
                                ` | Already paid: ৳${paidAmount.toLocaleString()}`}
                            </p>
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Reference (Optional)</Label>
                            <Input
                              type="text"
                              value={paymentReference}
                              onChange={(e) => setPaymentReference(e.target.value)}
                              className="h-8 text-sm"
                              placeholder="Payment reference number"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Note (Optional)</Label>
                            <Input
                              type="text"
                              value={paymentNote}
                              onChange={(e) => setPaymentNote(e.target.value)}
                              className="h-8 text-sm"
                              placeholder="Payment note"
                            />
                          </div>
                        </div>
                      )}
                  </div>
                </>
              ) : null}
            </div>

            <div className="space-y-2 border-t border-border bg-card p-4">
              <Button
                className="w-full rounded-lg bg-primary py-3 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary-hover"
                disabled={
                  isMutating ||
                  isPartialInvalid ||
                  isPartialOverMax ||
                  isCancelled ||
                  (!isPrebooked && paymentOption === "none") ||
                  (!canCollectPayment && !isPrebooked)
                }
                onClick={onConfirm}
              >
                {isMutating
                  ? "Processing..."
                  : isCancelled
                    ? "Cancelled"
                    : !canCollectPayment && !isPrebooked
                      ? isFullyPaid
                        ? "Fully Paid"
                        : "Nothing to Collect"
                      : paymentOption === "none" && !isPrebooked
                        ? "Select a payment option"
                        : paymentOption === "full"
                          ? isPrebooked
                            ? `Confirm & Pay Full (৳${totalAmount.toLocaleString()})`
                            : `Pay Full Balance (৳${paymentDue.toLocaleString()})`
                          : paymentOption === "partial"
                            ? isPrebooked
                              ? `Confirm & Pay Partial (৳${paymentAmount || 0})`
                              : `Pay ৳${paymentAmount || 0}`
                            : "Confirm Booking"}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default BookingCofirmationDrawer;
