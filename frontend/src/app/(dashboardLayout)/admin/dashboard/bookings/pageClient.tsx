"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/premium/Badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
} from "@/components/ui/table";
import { DataTable } from "@/components/premium/DataTable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SlotCountCell } from "@/components/bookings/SlotCountCell";
import {
  bookingSlots,
  bookingTurfNames,
} from "@/lib/booking-utils";
import { useSort } from "@/hooks/useSort";
import { usePagination } from "@/hooks/usePagination";
import { useSearch } from "@/context/SearchContext";
import { toast } from "sonner";
import { Eye, ArrowRight, Plus } from "lucide-react";
import { httpClient } from "@/lib/axios/httpClient";
import { API_ENDPOINTS } from "@/lib/api/config";
import {
  confirmBookingAction,
  confirmBookingWithPaymentAction,
  addManualPaymentAction,
  verifyAdvancePaymentAction,
  type StoredBooking,
  type BookingStatusValue,
  type PaymentStatusValue,
} from "./_actions";
import BookingCofirmationDrawer from "./_components/BookingCofirmationDrawer";
import { AdminBookingDrawer } from "./_components/AdminBookingDrawer";

const ALL = "ALL";

const BOOKING_STATUS_OPTIONS: { value: BookingStatusValue; label: string }[] = [
  { value: "PREBOOKED", label: "Pre-booked" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "CANCELLED", label: "Cancelled" },
];

const PAYMENT_STATUS_OPTIONS: { value: PaymentStatusValue; label: string }[] = [
  { value: "UNPAID", label: "Unpaid" },
  { value: "PARTIALLY_PAID", label: "Partially Paid" },
  { value: "PAID", label: "Paid" },
  { value: "PROCESSING", label: "Processing" },
];

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
  return BOOKING_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
}

function getPaymentStatusInfo(status: PaymentStatusValue | null | undefined) {
  if (!status) return { label: "Unknown", variant: "outline" as const };
  const variant = paymentStatusVariant[status] ?? "outline";

  return {
    label: PAYMENT_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status,
    variant,
  };
}


export default function AdminBookingsPage() {
  const queryClient = useQueryClient();
  const { sortField, sortDirection, handleSort, getSortParams } = useSort("createdAt", "desc");
  const pagination = usePagination(10);
  const { registerHandler, unregisterHandler, setPlaceholder } = useSearch();

  const [bookingStatusFilter, setBookingStatusFilter] = useState<string>(ALL);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>(ALL);
  const [search, setSearch] = useState("");
  const [turfDrawerOpen, setTurfDrawerOpen] = useState(false);

  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
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

  // ----------------------------------------------------------------
  // Bookings list — direct httpClient pattern
  // ----------------------------------------------------------------
  const { data: bookingsData, isLoading: isLoadingBookings } = useQuery({
    queryKey: [
      "admin-bookings",
      search,
      sortField,
      sortDirection,
      pagination.page,
      pagination.pageSize,
      bookingStatusFilter,
      paymentStatusFilter,
    ],
    queryFn: async () => {
      const { sortBy, sortOrder } = getSortParams();
      const params: Record<string, unknown> = {
        search,
        sortBy,
        sortOrder,
        page: String(pagination.page),
        limit: String(pagination.pageSize),
      };
      if (bookingStatusFilter !== ALL) params.bookingStatus = bookingStatusFilter;
      if (paymentStatusFilter !== ALL) params.paymentStatus = paymentStatusFilter;

      const result = await httpClient.get<{
        data: StoredBooking[];
        meta: { page: number; limit: number; total: number; totalPages: number };
      }>(API_ENDPOINTS.marketplace.bookings, { params });

      return (
        result.data ?? {
          data: [],
          meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
        }
      );
    },
  });

  const { data: selectedBooking, isLoading: isLoadingDetails } = useQuery({
    queryKey: ["booking-details", selectedBookingId],
    queryFn: async () => {
      if (!selectedBookingId) return null;
      const result = await httpClient.get<StoredBooking>(
        `${API_ENDPOINTS.marketplace.bookings}/${selectedBookingId}`
      );
      return result.data ?? null;
    },
    enabled: !!selectedBookingId,
  });

  const invoice = selectedBooking?.invoice;

  const { data: turfsData } = useQuery({
    queryKey: ["admin-turfs"],
    queryFn: async () => {
      const result = await httpClient.get<any>(API_ENDPOINTS.marketplace.turfs);
      return result.data ?? [];
    },
  });
  const turfs = Array.isArray(turfsData) ? turfsData : turfsData?.data ?? [];

  const confirmWithPaymentMutation = useMutation({
    mutationFn: (vars: {
      bookingId: string;
      payload: { paymentAmount: number; paymentMethod: string; reference?: string; note?: string };
    }) => confirmBookingWithPaymentAction(vars.bookingId, vars.payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      void queryClient.invalidateQueries({ queryKey: ["booking-details"] });
      toast.success("Booking confirmed successfully");
      closeDrawer();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const confirmWithoutPaymentMutation = useMutation({
    mutationFn: (bookingId: string) => confirmBookingAction(bookingId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      void queryClient.invalidateQueries({ queryKey: ["booking-details"] });
      toast.success("Booking confirmed");
      closeDrawer();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const addPaymentMutation = useMutation({
    mutationFn: (vars: { bookingId: string; amount: number; reference?: string; note?: string }) =>
      addManualPaymentAction(vars.bookingId, {
        amount: vars.amount,
        method: "CASH",
        reference: vars.reference,
        note: vars.note,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      void queryClient.invalidateQueries({ queryKey: ["booking-details"] });
      toast.success("Payment recorded successfully");
      resetPaymentForm();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const verifyAdvancePaymentMutation = useMutation({
    mutationFn: (bookingId: string) => verifyAdvancePaymentAction(bookingId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      void queryClient.invalidateQueries({ queryKey: ["booking-details"] });
      toast.success("Advance payment verified and marked as received");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to verify advance payment"),
  });

  const isMutating =
    confirmWithPaymentMutation.isPending ||
    confirmWithoutPaymentMutation.isPending ||
    addPaymentMutation.isPending ||
    verifyAdvancePaymentMutation.isPending;

  const bookings: StoredBooking[] = bookingsData?.data ?? [];
  const meta = bookingsData?.meta;

  const openDrawer = (booking: StoredBooking) => {
    setSelectedBookingId(booking.id);
    resetPaymentForm();
  };

  const closeDrawer = () => {
    setSelectedBookingId(null);
    resetPaymentForm();
  };

  const resetPaymentForm = () => {
    setPaymentOption("none");
    setPaymentAmount("");
    setPaymentReference("");
    setPaymentNote("");
  };

  const hasInvoice = !!invoice;
  const totalAmount = Number(selectedBooking?.totalAmount ?? 0);
  const paidAmount = Number(invoice?.paidAmount ?? 0);
  const remainingAmount = totalAmount - paidAmount;
  const isConfirmed = selectedBooking?.status === "CONFIRMED";
  const isPrebooked = selectedBooking?.status === "PREBOOKED";
  const isCancelled = selectedBooking?.status === "CANCELLED";

  const isFullyPaid =
    hasInvoice &&
    (Boolean(invoice?.isFullPaid) ||
      remainingAmount <= 0 ||
      selectedBooking?.paymentStatus === "PAID" ||
      selectedBooking?.paymentStatus === "SUCCEEDED");

  const canCollectPayment = isCancelled
    ? false
    : isPrebooked
      ? !hasInvoice
      : !isFullyPaid;
  const paymentDue = isPrebooked ? totalAmount : remainingAmount;

  const partialAmount = Number(paymentAmount) || 0;
  const isPartialInvalid = paymentOption === "partial" && partialAmount <= 0;
  const isPartialOverMax = paymentOption === "partial" && partialAmount > paymentDue;

  const handleConfirm = async () => {
    if (!selectedBooking) return;
    if (isMutating) return;
    const bookingId = selectedBooking.id;

    try {
      if (!isPrebooked) {
        if (paymentOption === "none") return;
        const amount = paymentOption === "full" ? paymentDue : Number(paymentAmount) || 0;
        if (amount <= 0) return toast.error("Payment amount must be greater than 0");
        if (amount > paymentDue)
          return toast.error(
            `Payment amount cannot exceed the outstanding balance of ৳${paymentDue.toLocaleString()}`
          );
        await addPaymentMutation.mutateAsync({
          bookingId,
          amount,
          reference: paymentReference,
          note: paymentNote,
        });
        return;
      }

      if (paymentOption === "none") {
        await confirmWithoutPaymentMutation.mutateAsync(bookingId);
      } else {
        const amount = paymentOption === "full" ? totalAmount : Number(paymentAmount) || 0;
        if (amount <= 0) return toast.error("Payment amount must be greater than 0");
        if (amount > totalAmount)
          return toast.error(
            `Payment amount cannot exceed total amount of ৳${totalAmount.toLocaleString()}`
          );
        await confirmWithPaymentMutation.mutateAsync({
          bookingId,
          payload: {
            paymentAmount: amount,
            paymentMethod: "CASH",
            reference: paymentReference,
            note: paymentNote,
          },
        });
      }
    } catch {
      /* handled by onError */
    }
  };

  const handleVerifyAdvance = () => {
    if (!selectedBooking) return;
    verifyAdvancePaymentMutation.mutate(selectedBooking.id);
  };

  return (
    <section className="dashboard-section">
      <Card className="surface-elevated">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>All Bookings</CardTitle>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" className="h-8" onClick={() => setTurfDrawerOpen(true)} disabled={isLoadingBookings}>
                <Plus className="mr-1.5 h-4 w-4" />
                Book Slot
              </Button>
              {isLoadingBookings ? (
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-44 rounded-lg bg-muted" />
                  <Skeleton className="h-8 w-44 rounded-lg bg-muted" />
                </div>
              ) : (
                <>
                  <Select value={bookingStatusFilter} onValueChange={setBookingStatusFilter}>
                    <SelectTrigger className="w-44 text-sm h-8">
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
                    <SelectTrigger className="w-44 text-sm h-8">
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
                </>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isLoadingBookings ? (
            <div className="overflow-x-auto border rounded-xl bg-card">
              <Table>
                <TableHeader className="bg-muted/40 border-b border-border">
                  <TableRow className="hover:bg-transparent border-b border-border">
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                      <Skeleton className="h-3 w-12 rounded" />
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                      <Skeleton className="h-3 w-8 rounded" />
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                      <Skeleton className="h-3 w-10 rounded" />
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                      <Skeleton className="h-3 w-14 rounded" />
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                      <Skeleton className="h-3 w-10 rounded" />
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                      <Skeleton className="h-3 w-6 rounded" />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...Array(5)].map((_, i) => (
                    <TableRow key={i} className="border-b border-border">
                      <TableCell className="py-3.5">
                        <Skeleton className="h-8 w-8 rounded-full" />
                      </TableCell>
                      <TableCell className="py-3.5">
                        <Skeleton className="h-4 w-40 rounded" />
                      </TableCell>
                      <TableCell className="py-3.5">
                        <Skeleton className="h-4 w-24 rounded" />
                      </TableCell>
                      <TableCell className="py-3.5">
                        <Skeleton className="h-4 w-20 rounded" />
                      </TableCell>
                      <TableCell className="py-3.5">
                        <Skeleton className="h-4 w-20 rounded" />
                      </TableCell>
                      <TableCell className="py-3.5">
                        <Skeleton className="h-4 w-20 rounded" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <DataTable
              columns={[
                {
                  key: "bookingNumber",
                  header: "Booking",
                  sortable: true,
                  render: (row) => {
                    return (
                      <div>
                        <p className="font-medium">#{row.bookingNumber}</p>
                      </div>
                    );
                  },
                },
                {
                  key: "slot.turf.name",
                  header: "Turf",
                  sortable: true,
                  render: (row) => {
                    const names = bookingTurfNames(bookingSlots(row));
                    if (!names.length) return <span className="text-muted-foreground">—</span>;
                    return (
                      <p className="max-w-[160px] truncate" title={names.join(", ")}>
                        {names.join(", ")}
                      </p>
                    );
                  },
                },
                {
                  key: "slot",
                  header: "Slots",
                  render: (row) => {
                    const slots = bookingSlots(row);
                    if (!slots.length) return <p className="text-muted-foreground">—</p>;
                    return <SlotCountCell slots={slots} />;
                  },
                },
                {
                  key: "customerName",
                  header: "Customer Name",
                  render: (row) => {
                    const name = row.customerName?.trim();
                    return name ? (
                      <p className="truncate font-medium" title={name}>
                        {name}
                      </p>
                    ) : (
                      <span className="text-muted-foreground">Guest</span>
                    );
                  },
                },
                {
                  key: "customerPhone",
                  header: "Phone",
                  render: (row) => {
                    const phone = row.customerPhone?.trim() || row.mobile?.trim();
                    return phone ? (
                      <p className="truncate text-muted-foreground" title={phone}>
                        {phone}
                      </p>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    );
                  },
                },
                {
                  key: "status",
                  header: "Booking Status",
                  sortable: true,
                  render: (row) => (
                    <Badge variant={row.status ? bookingStatusVariant[row.status as BookingStatusValue] : "outline"}
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
                  render: (row) => {
                    const { label, variant } = getPaymentStatusInfo(row.paymentStatus);
                    return (
                      <div className="flex items-center gap-1.5">
                        <Badge variant={variant} size="sm">
                          {label}
                        </Badge>
                      </div>
                    );
                  },
                },
                {
                  key: "actions",
                  header: "Actions",
                  render: (row) => {
                    if (row.status === "CANCELLED") return null;
                    if (row.status === "PREBOOKED") {
                      return (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => openDrawer(row)}
                          className="whitespace-nowrap"
                        >
                          <ArrowRight className="mr-1.5 size-3.5" />
                          Confirm
                        </Button>
                      );
                    }
                    return (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openDrawer(row)}
                        className="whitespace-nowrap border-primary/40 text-primary hover:border-primary hover:bg-primary/10"
                        title="View details"
                      >
                        <Eye className="mr-1.5 size-3.5" />
                        View Details
                      </Button>
                    );
                  },
                },
              ]}
              data={bookings}
              minWidth={1120}
              sortKey={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
              currentPage={pagination.page}
              totalPages={meta?.totalPages ?? 0}
              pageSize={pagination.pageSize}
              totalItems={meta?.total ?? 0}
              onPageChange={pagination.setPage}
              onPageSizeChange={pagination.setPageSize}
              emptyTitle="No bookings found"
              emptyDescription={
                search
                  ? "Try adjusting your search."
                  : "Bookings will appear here when customers reserve slots."
              }
            />
          )}
        </CardContent>
      </Card>

      <BookingCofirmationDrawer
        open={!!selectedBookingId && !!selectedBooking}
        onClose={closeDrawer}
        selectedBooking={selectedBooking ?? null}
        isLoadingDetails={isLoadingDetails}
        isMutating={isMutating}
        paymentOption={paymentOption}
        setPaymentOption={setPaymentOption}
        paymentAmount={paymentAmount}
        setPaymentAmount={setPaymentAmount}
        paymentReference={paymentReference}
        setPaymentReference={setPaymentReference}
        paymentNote={paymentNote}
        setPaymentNote={setPaymentNote}
        isPartialInvalid={isPartialInvalid}
        isPartialOverMax={isPartialOverMax}
        canCollectPayment={canCollectPayment}
        paymentDue={paymentDue}
        totalAmount={totalAmount}
        paidAmount={paidAmount}
        remainingAmount={remainingAmount}
        isPrebooked={isPrebooked}
        isConfirmed={isConfirmed}
        isCancelled={isCancelled}
        isFullyPaid={isFullyPaid}
        hasInvoice={hasInvoice}
        onConfirm={handleConfirm}
        onVerifyAdvance={handleVerifyAdvance}
        verifyAdvancePending={verifyAdvancePaymentMutation.isPending}
      />

      <AdminBookingDrawer isOpen={turfDrawerOpen} onClose={() => setTurfDrawerOpen(false)} turfs={turfs} />
    </section>
  );
}
