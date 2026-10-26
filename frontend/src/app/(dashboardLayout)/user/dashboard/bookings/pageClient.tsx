"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { CalendarDays, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/premium/Badge";
import { DataTable } from "@/components/premium/DataTable";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { httpClient } from "@/lib/axios/httpClient";
import { API_ENDPOINTS } from "@/lib/api/config";
import { useSearch } from "@/context/SearchContext";
import { useSort } from "@/hooks/useSort";
import { usePagination } from "@/hooks/usePagination";
import { SlotCountCell } from "@/components/bookings/SlotCountCell";
import {
  bookingSlots,
  bookingTurfNames,
  formatBookingDateRange,
  type BookingSlotLike,
} from "@/lib/booking-utils";
import { toast } from "sonner";

type BookingSlot = BookingSlotLike & {
  turf: { id: string; name: string };
};

type Booking = {
  id: string;
  bookingNumber: string;
  status: string | null;
  numberOfSlot?: number;
  slot: BookingSlot | null;
  slots: BookingSlot[];
  totalAmount: string | number;
  paymentStatus?: string | null;
  invoice?: { invoiceNumber: string; status: string } | null;
};

/** Only these statuses can be cancelled; mirrors the backend `cancel` guard. */
const CANCELLABLE_STATUSES = ["PREBOOKED"];

/** Booking statuses where a review can be written (CONFIRMED + slots PLAYED or past) */
const REVIEWABLE_STATUSES = ["CONFIRMED"];

function isReviewable(booking: Booking): boolean {
  if (!REVIEWABLE_STATUSES.includes(String(booking.status ?? ""))) {
    return false;
  }
  // Check if all slots are PLAYED or past date
  const slots = bookingSlots(booking);
  if (!slots.length) return false;
  const now = new Date();
  return slots.every((s) => s.slotStatus === "PLAYED" || (s.slotDate && new Date(s.slotDate) < now));
}

const BOOKING_STATUS_VARIANTS: Record<string, "default" | "success" | "warning" | "destructive" | "outline"> = {
  PREBOOKED: "warning",
  CONFIRMED: "success",
  KICKED_OFF: "default",
  COMPLETED: "success",
  CANCELLED: "destructive",
  EXPIRED: "destructive",
};

const BOOKING_STATUS_LABELS: Record<string, string> = {
  PREBOOKED: "Pre-booked",
  CONFIRMED: "Confirmed",
  KICKED_OFF: "Kicked Off",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
};

const PAYMENT_STATUS_VARIANTS: Record<
  string,
  "success" | "warning" | "destructive" | "outline"
> = {
  SUCCEEDED: "success",
  PAID: "success",
  PARTIALLY_PAID: "warning",
  PENDING: "warning",
  PROCESSING: "warning",
  PARTIALLY_REFUNDED: "warning",
  UNPAID: "outline",
  REFUNDED: "destructive",
  FAILED: "destructive",
  CANCELLED: "destructive",
};

function bookingStatusLabel(status: string | null | undefined): string {
  if (!status) return "Unknown";
  return BOOKING_STATUS_LABELS[status] ?? status;
}

function getPaymentStatus(booking: Booking): string {
  return booking.paymentStatus ?? booking.invoice?.status ?? "UNPAID";
}

function isCancellable(booking: Booking): boolean {
  return CANCELLABLE_STATUSES.includes(String(booking.status ?? ""));
}

export default function UserBookingsPage() {
  const queryClient = useQueryClient();
  const { registerHandler, unregisterHandler, setPlaceholder } = useSearch();
  const { sortField, sortDirection, handleSort, getSortParams } = useSort(
    "createdAt",
    "desc"
  );
  const pagination = usePagination(10);
  const [search, setSearch] = useState("");
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);
  const searchParams = useSearchParams();
  const date = searchParams.get("date");

  const { data, isLoading } = useQuery({
    queryKey: [
      "user-bookings",
      pagination.page,
      pagination.pageSize,
      sortField,
      sortDirection,
      search,
    ],
    queryFn: async () => {
      const { sortBy, sortOrder } = getSortParams();
      const params: Record<string, unknown> = {
        page: String(pagination.page),
        limit: String(pagination.pageSize),
        sortBy,
        sortOrder,
        ...(search ? { search } : {}),
      };
      const result = await httpClient.get<{
        data: Booking[];
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

  const { resetPage, setTotal } = pagination;
  const total = data?.meta?.total;

  useEffect(() => {
    setPlaceholder("Search bookings...");
    const onSearch = (query: string) => {
      setSearch(query);
      resetPage();
    };
    registerHandler(onSearch);
    return () => unregisterHandler();
  }, [registerHandler, unregisterHandler, setPlaceholder, resetPage]);

  useEffect(() => {
    if (total !== undefined) setTotal(total);
  }, [total, setTotal]);

  const bookings = useMemo<Booking[]>(() => data?.data ?? [], [data?.data]);

  const cancelBooking = useMutation({
    mutationFn: (bookingId: string) =>
      httpClient.delete(`${API_ENDPOINTS.marketplace.bookings}/${bookingId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["user-bookings"] });
      toast.success("Booking cancelled", {
        description: "All reserved slots have been released.",
      });
      setBookingToCancel(null);
      // Step back a page if this was the last row on the current page.
      if (bookings.length === 1 && pagination.page > 1) pagination.prevPage();
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Booking could not be cancelled";
      toast.error(message);
    },
  });

  const confirmCancel = useCallback(() => {
    if (!bookingToCancel) return;
    if (cancelBooking.isPending) return;
    cancelBooking.mutate(bookingToCancel.id);
  }, [bookingToCancel, cancelBooking]);

  const cancelTargetSlots = useMemo(
    () => (bookingToCancel ? bookingSlots(bookingToCancel) : []),
    [bookingToCancel]
  );

  return (
    <section className="dashboard-section space-y-6">
      <Card className="surface-elevated">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-xl font-bold">All Bookings</CardTitle>
           <Button asChild variant="outline" size="sm">
             <Link href={date ? `/?date=${date}` : "/"}>Find a Turf</Link>
           </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-12 animate-pulse rounded-lg bg-muted"
                />
              ))}
            </div>
          ) : (
            <DataTable
              columns={[
                {
                  key: "bookingNumber",
                  header: "Booking",
                  render: (row) => (
                    <div>
                      <p className="font-medium text-foreground">
                        #{row.bookingNumber || row.id.slice(-6)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatBookingDateRange(bookingSlots(row))}
                      </p>
                    </div>
                  ),
                },
                {
                  key: "slot.turf.name",
                  header: "Turf",
                  sortable: true,
                  render: (row) => {
                    const names = bookingTurfNames(bookingSlots(row));
                    if (!names.length)
                      return <span className="text-muted-foreground">—</span>;
                    return (
                      <p
                        className="max-w-[160px] truncate text-muted-foreground"
                        title={names.join(", ")}
                      >
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
                  key: "status",
                  header: "Booking Status",
                  sortable: true,
                  render: (row) => (
                    <Badge
                      variant={
                        BOOKING_STATUS_VARIANTS[String(row.status ?? "")] ?? "outline"
                      }
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
                    <p className="whitespace-nowrap font-medium text-foreground">
                      ৳ {Number(row.totalAmount || 0).toLocaleString()}
                    </p>
                  ),
                },
                {
                  key: "paymentStatus",
                  header: "Payment",
                  sortable: true,
                  render: (row) => {
                    const paymentStatus = getPaymentStatus(row);
                    return (
                      <Badge
                        variant={PAYMENT_STATUS_VARIANTS[paymentStatus] || "outline"}
                        size="sm"
                      >
                        {paymentStatus.replace(/_/g, " ")}
                      </Badge>
                    );
                  },
                },
                {
                  key: "actions",
                  header: "Actions",
                  sortable: false,
                  render: (row) => {
                    const actions = [];
                    if (isCancellable(row)) {
                      actions.push(
                        <Button
                          key="cancel"
                          size="sm"
                          variant="outline"
                          className="whitespace-nowrap text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setBookingToCancel(row)}
                        >
                          Cancel
                        </Button>
                      );
                    }
                    if (isReviewable(row)) {
                      actions.push(
                        <Button
                          key="review"
                          size="sm"
                          variant="default"
                          className="whitespace-nowrap"
                          onClick={() => window.open(`/user/dashboard/reviews?write=${row.id}`, "_self")}
                        >
                          <Star className="h-4 w-4 mr-1" /> Write Review
                        </Button>
                      );
                    }
                    if (actions.length === 0) {
                      return <span className="text-muted-foreground">—</span>;
                    }
                    return <div className="flex gap-2">{actions}</div>;
                  },
                },
              ]}
              data={bookings}
              minWidth={1060}
              sortKey={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              pageSize={pagination.pageSize}
              totalItems={pagination.total}
              onPageChange={pagination.setPage}
              emptyTitle="No bookings found"
              emptyDescription="Your booking history will appear here."
            />
          )}
        </CardContent>
      </Card>

      {bookings.length === 0 && !isLoading && !search && (
        <div className="mt-6 text-center">
          <CalendarDays className="mx-auto h-12 w-12 text-muted-foreground/30" />
          <h3 className="mt-3 text-lg font-semibold">No bookings yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Book your first turf to get started.
          </p>
           <Link href={date ? `/?date=${date}` : "/"} className="mt-4 inline-block">
            <Button variant="default">Find a turf</Button>
          </Link>
        </div>
      )}

      <AlertDialog
        open={bookingToCancel !== null}
        onOpenChange={(open) => !open && !cancelBooking.isPending && setBookingToCancel(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
            <AlertDialogDescription>
              Booking{" "}
              <span className="font-semibold text-foreground">
                #{bookingToCancel?.bookingNumber || bookingToCancel?.id.slice(-6)}
              </span>{" "}
              will be cancelled
              {cancelTargetSlots.length > 0 && (
                <>
                  {" "}
                  and all{" "}
                  <span className="font-semibold text-foreground">
                    {cancelTargetSlots.length}{" "}
                    {cancelTargetSlots.length === 1 ? "slot" : "slots"}
                  </span>{" "}
                  will be released for others to book
                </>
              )}
              . This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelBooking.isPending}>Keep booking</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmCancel();
              }}
              disabled={cancelBooking.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelBooking.isPending ? "Cancelling..." : "Yes, cancel booking"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
