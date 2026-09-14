"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { startOfDay, format } from "date-fns";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { formatTimeWithPeriod } from "@/lib/time-utils";
import { useSearch } from "@/context/SearchContext";
import { useSort } from "@/hooks/useSort";
import { usePagination } from "@/hooks/usePagination";
import { toast } from "sonner";
import { DollarSign, Save } from "lucide-react";
import {
  listBookingsAction,
  updateBookingStatusAction,
  updateBookingPaymentAction,
  type StoredBooking,
  type BookingStatusValue,
  type PaymentStatusValue,
  type PaymentUpdatePayload,
  type BookingsListResponse,
} from "./_actions";
import { ApiResponse } from "@/types/api.type";

const BOOKING_STATUS_OPTIONS: { value: BookingStatusValue; label: string }[] = [
  { value: "PREBOOKED", label: "Pre-booked" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "EXPIRED", label: "Expired" },
];

const PAYMENT_STATUS_OPTIONS: { value: PaymentStatusValue; label: string }[] = [
  { value: "UNPAID", label: "Unpaid" },
  { value: "PENDING", label: "Pending" },
  { value: "PROCESSING", label: "Processing" },
  { value: "PARTIALLY_PAID", label: "Partially Paid" },
  { value: "PARTIALLY_REFUNDED", label: "Partially Refunded" },
  { value: "SUCCEEDED", label: "Succeeded" },
  { value: "FAILED", label: "Failed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "REFUNDED", label: "Refunded" },
];

const bookingStatusVariant: Record<
  NonNullable<BookingStatusValue>,
  "success" | "warning" | "destructive" | "outline"
> = {
  PREBOOKED: "warning",
  CONFIRMED: "success",
  COMPLETED: "success",
  CANCELLED: "destructive",
  EXPIRED: "warning",
};

const bookingStatusClass: Record<NonNullable<BookingStatusValue>, string> = {
  PREBOOKED: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  CONFIRMED: "",
  COMPLETED: "",
  CANCELLED: "",
  EXPIRED: "",
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
  SUCCEEDED: "success",
  FAILED: "destructive",
  CANCELLED: "destructive",
  REFUNDED: "destructive",
};

const paymentStatusLabel: Record<PaymentStatusValue, string> = {
  UNPAID: "Unpaid",
  PENDING: "Pending",
  PROCESSING: "Processing",
  PARTIALLY_PAID: "Partially Paid",
  PARTIALLY_REFUNDED: "Partially Refunded",
  SUCCEEDED: "Succeeded",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function bookingStatusLabel(status: BookingStatusValue | null | undefined): string {
  if (!status) {
    return "Unknown";
  }
  return BOOKING_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status.replace(/_/g, " ");
}

export default function AdminBookingsPage() {
  const queryClient = useQueryClient();
  const { registerHandler, unregisterHandler, setPlaceholder } = useSearch();
  const { sortField, sortDirection, handleSort, getSortParams } = useSort("createdAt", "desc");
  const pagination = usePagination(10);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("");
  const [dateFilter, setDateFilter] = useState<string>(() => format(startOfDay(new Date()), "yyyy-MM-dd"));
  const [editingBooking, setEditingBooking] = useState<StoredBooking | null>(null);
  const [editForm, setEditForm] = useState<{ paymentStatus: string; totalAmount: string }>({
    paymentStatus: "",
    totalAmount: "",
  });

  useEffect(() => {
    setPlaceholder("Search bookings:");
    const onSearch = () => {
      pagination.resetPage();
    };
    registerHandler(onSearch);
    return () => unregisterHandler();
  }, [registerHandler, unregisterHandler, setPlaceholder, pagination]);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-bookings", pagination.page, pagination.pageSize, sortField, sortDirection, paymentStatusFilter, dateFilter],
    queryFn: async () => {
      const { sortBy, sortOrder } = getSortParams();
      const result = await listBookingsAction({
        page: String(pagination.page),
        limit: String(pagination.pageSize),
        sortBy,
        sortOrder,
        paymentStatus: paymentStatusFilter,
        startDate: dateFilter,
        endDate: dateFilter,
      });
      if (!result.success) throw new Error(result.message);
      return (result as ApiResponse<BookingsListResponse>).data;
    },
  });

  useEffect(() => {
    if (data?.meta?.total !== undefined) {
      pagination.setTotal(data.meta.total);
    }
  }, [data?.meta?.total, pagination]);

  const statusUpdateMutation = useMutation({
    mutationFn: (vars: { bookingId: string; bookingStatus: BookingStatusValue }) =>
      updateBookingStatusAction(vars.bookingId, { bookingStatus: vars.bookingStatus }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      toast.success("Booking status updated");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to update booking status"),
  });

  const updateMutation = useMutation({
    mutationFn: (vars: { bookingId: string; payload: PaymentUpdatePayload }) =>
      updateBookingPaymentAction(vars.bookingId, vars.payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      toast.success("Payment updated successfully");
      setEditingBooking(null);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to update payment"),
  });

  const bookings: StoredBooking[] = data?.data ?? [];

  const openEdit = (booking: StoredBooking) => {
    setEditingBooking(booking);
    setEditForm({
      paymentStatus: booking.paymentStatus,
      totalAmount: String(booking.totalAmount ?? 0),
    });
  };

  const handleSave = () => {
    if (!editingBooking) return;
    const total = Number(editForm.totalAmount) || 0;
    if (total < 0) {
      toast.error("Total amount cannot be negative");
      return;
    }
    updateMutation.mutate({
      bookingId: editingBooking.id,
      payload: {
        paymentStatus: editForm.paymentStatus as PaymentStatusValue,
        totalAmount: total,
      },
    });
  };

  return (
    <section className="dashboard-section">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="dashboard-meta">Manage reservations</p>
          <h1 className="dashboard-title">Bookings</h1>
        </div>
      </div>

      <Card className="surface-elevated mt-6">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>All Bookings</CardTitle>
            <div className="flex flex-wrap items-center gap-3">
              <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                <SelectTrigger className="w-44 text-sm">
                  <SelectValue placeholder="Payment status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All</SelectItem>
                  {PAYMENT_STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
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
          <TooltipProvider delayDuration={200}>
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
                    className: "min-w-[110px]",
                    render: (row) => (
                      <div>
                        <p className="font-medium text-foreground">#{row.bookingNumber}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(row.slot?.slotDate)}</p>
                      </div>
                    ),
                  },
                  {
                    key: "slot.turf.name",
                    header: "Turf",
                    sortable: true,
                    className: "min-w-[180px]",
                    render: (row) => (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p className="truncate cursor-default">{row.slot?.turf?.name}</p>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{row.slot?.turf?.name}</p>
                        </TooltipContent>
                      </Tooltip>
                    ),
                  },
                  {
                    key: "slot",
                    header: "Slot",
                    className: "min-w-[130px]",
                    render: (row) => (
                      <p className="text-muted-foreground">
                        {formatTimeWithPeriod(row.slot?.startMinute)} – {formatTimeWithPeriod(row.slot?.endMinute)}
                      </p>
                    ),
                  },
                  {
                    key: "status",
                    header: "Booking Status",
                    sortable: true,
                    className: "min-w-[160px]",
                    render: (row) => {
                      const current = row.status ?? "";
                      return (
                        <Select
                          value={current}
                          onValueChange={(value) => {
                            if (value === current) return;
                            statusUpdateMutation.mutate({
                              bookingId: row.id,
                              bookingStatus: value as BookingStatusValue,
                            });
                          }}
                        >
                          <SelectTrigger className="h-7 w-[150px] text-xs">
                            <Badge
                              variant={current ? bookingStatusVariant[current] : "outline"}
                              size="sm"
                              className={current ? bookingStatusClass[current] : undefined}
                            >
                              {bookingStatusLabel(row.status)}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            {BOOKING_STATUS_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                <Badge
                                  variant={bookingStatusVariant[o.value]}
                                  size="sm"
                                  className={bookingStatusClass[o.value]}
                                >
                                  {o.label}
                                </Badge>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      );
                    },
                  },
                  {
                    key: "totalAmount",
                    header: "Total",
                    sortable: true,
                    className: "min-w-[100px]",
                    render: (row) => (
                      <p className="font-medium text-foreground">
                        ৳ {Number(row.totalAmount).toLocaleString()}
                      </p>
                    ),
                  },
                  {
                    key: "paymentStatus",
                    header: "Payment",
                    sortable: true,
                    className: "min-w-[130px]",
                    render: (row) => (
                      <Badge
                        variant={paymentStatusVariant[row.paymentStatus] || "outline"}
                        size="sm"
                        className={row.paymentStatus === "SUCCEEDED" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : undefined}
                      >
                        {paymentStatusLabel[row.paymentStatus] ?? row.paymentStatus.replace(/_/g, " ")}
                      </Badge>
                    ),
                  },
                  {
                    key: "invoice",
                    header: "Invoice",
                    className: "min-w-[110px]",
                    render: (row) =>
                      row.invoice ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="outline" size="sm" className="cursor-default">
                              {row.invoice.invoiceNumber}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{row.invoice.invoiceNumber}</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      ),
                  },
                  {
                    key: "actions",
                    header: "Actions",
                    sortable: false,
                    className: "min-w-[80px]",
                    render: (row) => (
                      <Dialog open={editingBooking?.id === row.id} onOpenChange={(open) => !open && setEditingBooking(null)}>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEdit(row)}
                          >
                            <DollarSign className="mr-1.5 size-3.5" />
                            Manage
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>Manage Payment — #{row.bookingNumber}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium">Payment Status</Label>
                              <Select value={editForm.paymentStatus} onValueChange={(v) => setEditForm({ ...editForm, paymentStatus: v as PaymentStatusValue })}>
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {PAYMENT_STATUS_OPTIONS.map((o) => (
                                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium">Total Amount (৳)</Label>
                              <Input
                                type="number"
                                min={0}
                                value={editForm.totalAmount}
                                onChange={(e) => setEditForm({ ...editForm, totalAmount: e.target.value })}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="outline" onClick={() => setEditingBooking(null)}>
                                Cancel
                              </Button>
                              <Button size="sm" variant="hero" onClick={handleSave} disabled={updateMutation.isPending}>
                                <Save className="mr-1.5 size-3.5" />
                                Save
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
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
                emptyDescription="Bookings will appear here when customers reserve slots."
              />
            )}
          </TooltipProvider>
        </CardContent>
      </Card>
    </section>
  );
}
