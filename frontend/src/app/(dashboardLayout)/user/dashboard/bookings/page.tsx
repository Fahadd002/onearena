"use client";

import { useState, useMemo, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/premium/Badge";
import { DataTable } from "@/components/premium/DataTable";
import { httpClient } from "@/lib/axios/httpClient";
import { API_ENDPOINTS } from "@/lib/api/config";
import { useSearch } from "@/context/SearchContext";
import { useSort } from "@/hooks/useSort";
import { usePagination } from "@/hooks/usePagination";
import { toast } from "sonner";

type Booking = {
    id: string;
    bookingNumber: string;
    slot: {
        slotDate: string;
        startMinute: number;
        endMinute: number;
        turf: { id: string; name: string };
    };
    totalAmount: string | number;
    paymentStatus?: string | null;
    invoice?: { invoiceNumber: string; status: string };
};

function formatTime(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const period = h < 12 ? "AM" : "PM";
    const displayHour = h % 12 === 0 ? 12 : h % 12;
    return `${displayHour}:${m.toString().padStart(2, "0")} ${period}`;
}

function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
    });
}

const statusColors: Record<string, "success" | "warning" | "destructive" | "outline"> = {
    SUCCEEDED: "success",
    PARTIALLY_PAID: "warning",
    UNPAID: "warning",
    REFUNDED: "destructive",
};

function getPaymentStatus(booking: Booking): string {
    return booking.paymentStatus ?? booking.invoice?.status ?? "UNPAID";
}

export default function UserBookingsPage() {
    const queryClient = useQueryClient();
    const { registerHandler, unregisterHandler, setPlaceholder } = useSearch();
    const { sortField, sortDirection, handleSort, getSortParams } = useSort("createdAt", "desc");
    const pagination = usePagination(10);

    const { data, isLoading } = useQuery({
        queryKey: ["user-bookings", pagination.page, pagination.pageSize, sortField, sortDirection],
        queryFn: async () => {
            const { sortBy, sortOrder } = getSortParams();
            const params: Record<string, unknown> = {
                page: String(pagination.page),
                limit: String(pagination.pageSize),
                sortBy,
                sortOrder,
            };
            const result = await httpClient.get<{
                data: Booking[];
                meta: { page: number; limit: number; total: number; totalPages: number };
            }>(API_ENDPOINTS.marketplace.bookings, { params });
            return result.data ?? { data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } };
        },
    });

    useEffect(() => {
        setPlaceholder("Search bookings...");
        const onSearch = (query: string) => {
            pagination.resetPage();
        };
        registerHandler(onSearch);
        return () => unregisterHandler();
    }, [registerHandler, unregisterHandler, setPlaceholder, pagination]);

    useEffect(() => {
        if (data?.meta?.total !== undefined) {
            pagination.setTotal(data.meta.total);
        }
    }, [data?.meta?.total, pagination]);

    const bookings = data?.data ?? [];

    const cancelBooking = useMutation({
        mutationFn: (bookingId: string) =>
            httpClient.delete(`${API_ENDPOINTS.marketplace.bookings}/${bookingId}`),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["user-bookings"] });
            toast.success("Booking cancelled");
        },
        onError: () => toast.error("Booking could not be cancelled"),
    });

    return (
        <section className="dashboard-section">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="dashboard-meta">Your activity</p>
                    <h1 className="dashboard-title">Bookings</h1>
                </div>
                <Button asChild variant="outline">
                    <Link href="/turfs">Find a Turf</Link>
                </Button>
            </div>

            <Card className="surface-elevated mt-6">
                <CardHeader>
                    <CardTitle>All Bookings</CardTitle>
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
                                    key: "id",
                                    header: "Booking",
                                    render: (row) => (
                                        <p className="font-medium text-foreground">
                                            #{row.id.slice(-6)}
                                        </p>
                                    ),
                                },
                                {
                                    key: "slot.turf.name",
                                    header: "Turf",
                                    sortable: true,
                                    render: (row) => (
                                        <p className="text-muted-foreground">{row.slot?.turf?.name}</p>
                                    ),
                                },
                                {
                                    key: "slot.slotDate",
                                    header: "Date",
                                    sortable: true,
                                    render: (row) => (
                                        <p className="text-muted-foreground">{formatDate(row.slot?.slotDate)}</p>
                                    ),
                                },
                                {
                                    key: "slot",
                                    header: "Slot",
                                    render: (row) => (
                                        <p className="text-muted-foreground">
                                            {formatTime(row.slot.startMinute)} –{" "}
                                            {formatTime(row.slot.endMinute)}
                                        </p>
                                    ),
                                },
                                {
                                    key: "totalAmount",
                                    header: "Total",
                                    sortable: true,
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
                                    render: (row) => {
                                        const paymentStatus = getPaymentStatus(row);

                                        return (
                                            <Badge
                                                variant={statusColors[paymentStatus] || "outline"}
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
                                    render: (row) =>
                                        getPaymentStatus(row) === "UNPAID" ? (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-destructive hover:text-destructive"
                                                onClick={() => {
                                                    if (
                                                        window.confirm(
                                                            "Cancel this booking?"
                                                        )
                                                    ) {
                                                        cancelBooking.mutate(
                                                            row.id
                                                        );
                                                    }
                                                }}
                                                disabled={cancelBooking.isPending}
                                            >
                                                Cancel
                                            </Button>
                                        ) : null,
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
                            emptyDescription="Your booking history will appear here."
                        />
                    )}
                </CardContent>
            </Card>

            {bookings.length === 0 && !isLoading && (
                <div className="mt-6 text-center">
                    <CalendarDays className="mx-auto h-12 w-12 text-muted-foreground/30" />
                    <h3 className="mt-3 text-title-md font-semibold">
                        No bookings yet
                    </h3>
                    <p className="mt-2 text-muted-foreground">
                        Book your first turf to get started.
                    </p>
                    <Link href="/turfs" className="mt-4 inline-block">
                        <Button variant="hero">Find a turf</Button>
                    </Link>
                </div>
            )}
        </section>
    );
}
