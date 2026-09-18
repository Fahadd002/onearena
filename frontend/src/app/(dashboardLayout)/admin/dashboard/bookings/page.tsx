"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { startOfDay, format } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Badge } from "@/components/premium/Badge";
import { DataTable } from "@/components/premium/DataTable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import { formatTimeWithPeriod } from "@/lib/time-utils";
import { useSort } from "@/hooks/useSort";
import { usePagination } from "@/hooks/usePagination";
import { useSearch } from "@/context/SearchContext";
import { toast } from "sonner";
import { DollarSign, Save, X, CreditCard, Calendar, User, Mail, Phone, Check, Eye, ArrowRight } from "lucide-react";
import {
  listBookingsAction,
  updateBookingStatusAction,
  confirmBookingWithPaymentAction,
  type StoredBooking,
  type BookingStatusValue,
  type PaymentStatusValue,
  type BookingsListResponse,
} from "./_actions";
import { ApiResponse } from "@/types/api.type";

const ALL = "ALL";

const BOOKING_STATUS_OPTIONS: { value: BookingStatusValue; label: string }[] = [
  { value: "PREBOOKED", label: "Pre-booked" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "KICKED_OFF", label: "Kicked Off" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "EXPIRED", label: "Expired" },
];

const PAYMENT_STATUS_OPTIONS: { value: PaymentStatusValue; label: string }[] = [
  { value: "UNPAID", label: "Unpaid" },
  { value: "PENDING", label: "Pending" },
  { value: "PROCESSING", label: "Processing" },
  { value: "PARTIALLY_PAID", label: "Partially Paid" },
  { value: "PAID", label: "Paid" },
  { value: "SUCCEEDED", label: "Succeeded" },
  { value: "PARTIALLY_REFUNDED", label: "Partially Refunded" },
  { value: "FAILED", label: "Failed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "REFUNDED", label: "Refunded" },
];

const bookingStatusVariant: Record<
  BookingStatusValue,
  "success" | "warning" | "destructive" | "outline"
> = {
  PREBOOKED: "warning",
  CONFIRMED: "success",
  KICKED_OFF: "success",
  COMPLETED: "success",
  CANCELLED: "destructive",
  EXPIRED: "warning",
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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function bookingStatusLabel(status: BookingStatusValue | null | undefined): string {
  if (!status) return "Unknown";
  return BOOKING_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
}

export default function AdminBookingsPage() {
  const queryClient = useQueryClient();
  const { sortField, sortDirection, handleSort, getSortParams } = useSort("createdAt", "desc");
  const pagination = usePagination(10);
  const { registerHandler, unregisterHandler, setPlaceholder } = useSearch();

  const [bookingStatusFilter, setBookingStatusFilter] = useState<string>(ALL);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>(ALL);
  const [dateFilter, setDateFilter] = useState<string>(
    () => format(startOfDay(new Date()), "yyyy-MM-dd"),
  );
  const [search, setSearch] = useState("");

  const [selectedBooking, setSelectedBooking] = useState<StoredBooking | null>(null);
  const [paymentOption, setPaymentOption] = useState<"none" | "partial" | "full">("none");
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentReference, setPaymentReference] = useState<string>("");
  const [paymentNote, setPaymentNote] = useState<string>("");

  useEffect(() => {
    setPlaceholder("Search bookings...");
    const onSearch = (query: string) => {
      setSearch(query);
      pagination.resetPage();
    };
    registerHandler(onSearch);
    return () => unregisterHandler();
  }, [registerHandler, unregisterHandler, setPlaceholder, pagination]);

  const { data, isLoading } = useQuery({
    queryKey: [
      "admin-bookings",
      pagination.page,
      pagination.pageSize,
      sortField,
      sortDirection,
      bookingStatusFilter,
      paymentStatusFilter,
      dateFilter,
      search,
    ],
    queryFn: async () => {
      const { sortBy, sortOrder } = getSortParams();
      const result = await listBookingsAction({
        page: String(pagination.page),
        limit: String(pagination.pageSize),
        sortBy,
        sortOrder,
        bookingStatus: bookingStatusFilter === ALL ? undefined : bookingStatusFilter,
        paymentStatus: paymentStatusFilter === ALL ? undefined : paymentStatusFilter,
        startDate: dateFilter,
        endDate: dateFilter,
        search,
      });
      if (!result.success) throw new Error(result.message);
      return (result as ApiResponse<BookingsListResponse>).data;
    },
  });

  if (data?.meta?.total !== undefined && pagination.total !== data.meta.total) {
    pagination.setTotal(data.meta.total);
  }

  const statusUpdateMutation = useMutation({
    mutationFn: (vars: { bookingId: string; bookingStatus: BookingStatusValue }) =>
      updateBookingStatusAction(vars.bookingId, { bookingStatus: vars.bookingStatus }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      toast.success("Booking status updated");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const confirmWithPaymentMutation = useMutation({
    mutationFn: (vars: { 
      bookingId: string; 
      payload: { paymentAmount: number; paymentMethod: 'CASH'; reference?: string; note?: string } 
    }) => confirmBookingWithPaymentAction(vars.bookingId, vars.payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      toast.success("Booking confirmed successfully");
      setSelectedBooking(null);
      setPaymentOption("none");
      setPaymentAmount("");
      setPaymentReference("");
      setPaymentNote("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const bookings: StoredBooking[] = data?.data ?? [];

  const openDrawer = (booking: StoredBooking) => {
    setSelectedBooking(booking);
    setPaymentOption("none");
    setPaymentAmount("");
    setPaymentReference("");
    setPaymentNote("");
  };

  const closeDrawer = () => {
    setSelectedBooking(null);
    setPaymentOption("none");
    setPaymentAmount("");
    setPaymentReference("");
    setPaymentNote("");
  };

  const hasInvoice = selectedBooking?.invoice !== null && selectedBooking?.invoice !== undefined;
  const totalAmount = Number(selectedBooking?.totalAmount ?? 0);
  const paidAmount = Number(selectedBooking?.invoice?.paidAmount ?? 0);
  const remainingAmount = totalAmount - paidAmount;
  const isConfirmed = selectedBooking?.status === "CONFIRMED";

  const handleConfirm = async () => {
    if (!selectedBooking) return;
    
    if (paymentOption === "none") {
      // Just confirm without payment
      await statusUpdateMutation.mutateAsync({
        bookingId: selectedBooking.id,
        bookingStatus: "CONFIRMED",
      });
      closeDrawer();
    } else {
      const amount = paymentOption === "full" ? totalAmount : Number(paymentAmount) || 0;
      if (amount <= 0) return toast.error("Payment amount must be greater than 0");
      if (amount > totalAmount) return toast.error(`Payment amount cannot exceed total amount of ৳${totalAmount.toLocaleString()}`);
      
      await confirmWithPaymentMutation.mutateAsync({
        bookingId: selectedBooking.id,
        payload: {
          paymentAmount: amount,
          paymentMethod: "CASH",
          reference: paymentReference,
          note: paymentNote,
        },
      });
    }
  };

  return (
    <section className="dashboard-section">
      <h1 className="dashboard-title">Bookings</h1>

      <Card className="surface-elevated mt-6">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>All Bookings</CardTitle>
            <div className="flex flex-wrap items-center gap-3">
              <Select value={bookingStatusFilter} onValueChange={setBookingStatusFilter}>
                <SelectTrigger className="w-44 text-sm">
                  <SelectValue placeholder="Booking status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All booking status</SelectItem>
                  {BOOKING_STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                <SelectTrigger className="w-44 text-sm">
                  <SelectValue placeholder="Payment status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All payment status</SelectItem>
                  {PAYMENT_STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <DatePicker
                value={dateFilter}
                onChange={setDateFilter}
                placeholder="Filter by date"
                className="w-40 text-sm"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : (
            <DataTable
              columns={[
                {
                  key: "bookingNumber",
                  header: "Booking",
                  sortable: true,
                  render: (row) => (
                    <div>
                      <p className="font-medium">#{row.bookingNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(row.slot?.slotDate)}
                      </p>
                    </div>
                  ),
                },
                {
                  key: "slot.turf.name",
                  header: "Turf",
                  sortable: true,
                  render: (row) => <p className="truncate">{row.slot?.turf?.name}</p>,
                },
                {
                  key: "slot",
                  header: "Slot",
                  render: (row) => (
                    <p className="text-muted-foreground">
                      {formatTimeWithPeriod(row.slot?.startMinute)} –{" "}
                      {formatTimeWithPeriod(row.slot?.endMinute)}
                    </p>
                  ),
                },
                {
                  key: "user",
                  header: "Customer",
                  render: (row) => (
                    <div>
                      <p className="font-medium">{row.user.name}</p>
                      {/* <p className="text-xs text-muted-foreground flex items-center gap-1">
                        {row.user.email && (
                          <>
                            <Mail className="size-3" />
                            <span>{row.user.email}</span>
                          </>
                        )}
                      </p> */}
                    </div>
                  ),
                },
                {
                  key: "status",
                  header: "Booking Status",
                  sortable: true,
                  render: (row) => (
                    <Badge
                      variant={row.status ? bookingStatusVariant[row.status as BookingStatusValue] : "outline"}
                      size="sm"
                    >
                      {bookingStatusLabel(row.status)}
                    </Badge>
                  ),
                },
                {
                  key: "totalAmount",
                  header: "Total",
                  sortable: true,
                  render: (row) => (
                    <p className="font-medium">৳ {Number(row.totalAmount).toLocaleString()}</p>
                  ),
                },
                {
                  key: "paymentStatus",
                  header: "Payment",
                  sortable: true,
                  render: (row) => (
                    <Badge
                      variant={paymentStatusVariant[row.paymentStatus] ?? "outline"}
                      size="sm"
                    >
                      {row.paymentStatus}
                    </Badge>
                  ),
                },
                {
                  key: "actions",
                  header: "Actions",
                  render: (row) =>
                    row.status === "EXPIRED" ? (
                      <Button size="sm" variant="outline" disabled>
                        <Eye className="mr-1.5 size-3.5" />
                        Expired
                      </Button>
                    ) : row.status === "PREBOOKED" ? (
                      <Button size="sm" variant="default" onClick={() => openDrawer(row)}>
                        <ArrowRight className="mr-1.5 size-3.5" />
                        Confirm Booking
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => openDrawer(row)}>
                        <Eye className="mr-1.5 size-3.5" />
                        View Details
                      </Button>
                    ),
                },
              ]}
              data={bookings}
              sortKey={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              pageSize={pagination.pageSize}
              totalItems={pagination.total}
              onPageChange={pagination.setPage}
              emptyTitle="No bookings found"
              emptyDescription={search ? "Try adjusting your search." : "Bookings will appear here when customers reserve slots."}
            />
          )}
        </CardContent>
      </Card>

      {/* Right Side Drawer */}
      <AnimatePresence>
        {selectedBooking && (
          <>
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeDrawer}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs"
            />

            {/* Slide-In Side Card */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-card shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border bg-secondary/30 p-4">
                <div className="flex items-center gap-2">
                  <Calendar className="size-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">Confirm Booking — #{selectedBooking.bookingNumber}</h3>
                </div>
                <button
                  type="button"
                  onClick={closeDrawer}
                  className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 space-y-5 overflow-y-auto p-5">
                {/* Booking Info */}
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
                        Selected Booking
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

                <div className="space-y-2.5 border-y border-border py-4 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Turf</span>
                    <span className="font-semibold text-foreground truncate pr-2">
                      {selectedBooking.slot?.turf?.name}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Date</span>
                    <span className="font-semibold text-foreground">
                      {formatDate(selectedBooking.slot?.slotDate ?? "")}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Time</span>
                    <span className="font-semibold text-foreground">
                      {formatTimeWithPeriod(selectedBooking.slot?.startMinute)} –{" "}
                      {formatTimeWithPeriod(selectedBooking.slot?.endMinute)}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Customer</span>
                    <span className="font-semibold text-foreground truncate pr-2">
                      {selectedBooking.user?.name ?? "Guest"}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Current Status</span>
                    <Badge variant={bookingStatusVariant[selectedBooking.status as BookingStatusValue] ?? "outline"} size="sm">
                      {bookingStatusLabel(selectedBooking.status)}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Payment Status</span>
                    <Badge variant={paymentStatusVariant[selectedBooking.paymentStatus] ?? "outline"} size="sm">
                      {selectedBooking.paymentStatus}
                    </Badge>
                  </div>
                </div>

                {/* Payment Options */}
                <div className="space-y-4">
                  <Label className="text-sm font-medium">Payment Option</Label>
                  <RadioGroup value={paymentOption} onValueChange={(value) => setPaymentOption(value as "none" | "partial" | "full")} className="space-y-3">
                    <div className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value="none" id="none" />
                      <Label htmlFor="none" className="flex-1 cursor-pointer">
                        <div className="font-medium">Without Payment</div>
                        <div className="text-xs text-muted-foreground">Confirm booking to CONFIRMED without creating invoice/payment</div>
                      </Label>
                    </div>
                    
                    {!hasInvoice && isConfirmed === false && (
                      <>
                        <div className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors">
                          <RadioGroupItem value="partial" id="partial" />
                          <Label htmlFor="partial" className="flex-1 cursor-pointer">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium">With Partial Payment</div>
                                <div className="text-xs text-muted-foreground">Record partial payment, creates invoice with PARTIALLY_PAID status</div>
                              </div>
                              <CreditCard className="size-4 text-primary" />
                            </div>
                          </Label>
                        </div>
                        
                        <div className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors">
                          <RadioGroupItem value="full" id="full" />
                          <Label htmlFor="full" className="flex-1 cursor-pointer">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium">With Full Payment</div>
                                <div className="text-xs text-muted-foreground">Record full payment, creates invoice with PAID status</div>
                              </div>
                              <CreditCard className="size-4 text-primary" />
                            </div>
                          </Label>
                        </div>
                      </>
                    )}

                    {hasInvoice && (
                      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                        <div className="flex items-center gap-2 text-amber-700">
                          <CreditCard className="size-4" />
                          <span className="text-sm font-medium">Invoice already exists</span>
                        </div>
                        <div className="mt-2 text-xs text-amber-700/80">
                          Invoice: {selectedBooking.invoice?.invoiceNumber} | Status: {selectedBooking.invoice?.status} | Paid: ৳{paidAmount.toLocaleString()} / ৳{totalAmount.toLocaleString()}
                        </div>
                      </div>
                    )}

                    {isConfirmed && !hasInvoice && (
                      <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3">
                        <div className="flex items-center gap-2 text-green-700">
                          <Check className="size-4" />
                          <span className="text-sm font-medium">Booking already confirmed</span>
                        </div>
                        <div className="mt-2 text-xs text-green-700/80">
                          This booking is already CONFIRMED. Use payment management to add payments.
                        </div>
                      </div>
                    )}
                  </RadioGroup>

                  {/* Payment Amount Input */}
                  {(paymentOption === "partial" || paymentOption === "full") && !hasInvoice && (
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">
                          Payment Amount (৳) {paymentOption === "full" && <span className="text-muted-foreground">(Auto-filled: full amount)</span>}
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          max={totalAmount}
                          step={1}
                          value={paymentOption === "full" ? String(totalAmount) : paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          disabled={paymentOption === "full"}
                          className="h-8 text-sm"
                          placeholder={paymentOption === "full" ? String(totalAmount) : "Enter amount"}
                        />
                        <p className="text-xs text-muted-foreground">
                          Max: ৳{totalAmount.toLocaleString()} {paymentOption === "partial" && `| Remaining: ৳${remainingAmount.toLocaleString()}`}
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
              </div>

              {/* Footer */}
              <div className="space-y-2 border-t border-border bg-card p-4">
                <Button
                  className="w-full bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary-hover py-3 rounded-lg shadow-xs"
                  disabled={confirmWithPaymentMutation.isPending || statusUpdateMutation.isPending || (paymentOption === "partial" && (!paymentAmount || Number(paymentAmount) <= 0))}
                  onClick={handleConfirm}
                >
                  {confirmWithPaymentMutation.isPending || statusUpdateMutation.isPending ? "Processing..." : 
                    paymentOption === "none" ? "Confirm Booking" :
                    paymentOption === "full" ? `Confirm & Pay Full (৳${totalAmount.toLocaleString()})` :
                    `Confirm & Pay Partial (৳${paymentAmount || 0})`}
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </section>
  );
}