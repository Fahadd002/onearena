"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { CalendarDays, CircleCheck, MapPinned, Clock } from "lucide-react";
import { httpClient } from "@/lib/axios/httpClient";
import { API_ENDPOINTS } from "@/lib/api/config";
import { KpiCard } from "@/components/premium/KpiCard";
import { Badge } from "@/components/premium/Badge";

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
    paymentStatus: string;
};

type UserOverview = {
    upcomingBookings: number;
    recentBookings: Booking[];
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
  PAID: "success",
  PARTIALLY_PAID: "warning",
  UNPAID: "warning",
  REFUNDED: "destructive",
};

export default function UserDashboardPage() {
    const { data, isLoading, isError } = useQuery({
        queryKey: ["user-overview"],
        queryFn: async () =>
            (await httpClient.get<UserOverview>(API_ENDPOINTS.marketplace.userDashboard))
                .data,
    });

    return (
        <div className="space-y-8">
            <div>
                <p className="dashboard-meta">Player area</p>
                <h1 className="dashboard-title">Your dashboard</h1>
                <p className="mt-3 text-muted-foreground">
                    Track upcoming matches, view booking history, and find new venues.
                </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
                <KpiCard
                    icon={CalendarDays}
                    label="Upcoming bookings"
                    value={data?.upcomingBookings ?? 0}
                    loading={isLoading}
                />
                <KpiCard
                    icon={CircleCheck}
                    label="Recent bookings"
                    value={data?.recentBookings?.length ?? 0}
                    loading={isLoading}
                />
                <Link href="/turfs" className="block">
                    <KpiCard
                        icon={MapPinned}
                        label="Next move"
                        value="Find a turf"
                        loading={false}
                    />
                </Link>
            </div>

            {isLoading ? (
                <div className="space-y-4">
                    <div className="h-8 w-1/4 animate-pulse rounded bg-muted"></div>
                    <div className="space-y-2">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div
                                key={i}
                                className="h-16 animate-pulse rounded-xl bg-muted"
                            />
                        ))}
                    </div>
                </div>
            ) : isError ? (
                <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-8 text-center">
                    <p className="text-destructive">
                        Your activity could not be loaded.
                    </p>
                </div>
            ) : (
                <>
                    {data?.recentBookings?.length ? (
                        <div className="space-y-4">
                            <p className="dashboard-meta">Your timeline</p>
                            <h2 className="text-title-2xl font-semibold">Recent bookings</h2>
                            <div className="mt-4 space-y-3">
                                {data.recentBookings.map((booking) => (
                                    <div
                                        key={booking.id}
                                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-secondary/20 px-4 py-3"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                                <Clock className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="font-medium">{booking.slot?.turf?.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {formatDate(booking.slot?.slotDate)} ·{" "}
                                                    {formatTime(booking.slot?.startMinute)} –{" "}
                                                    {formatTime(booking.slot?.endMinute)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge
                                                variant={
                                                    statusColors[booking.paymentStatus] ??
                                                    "outline"
                                                }
                                                size="sm"
                                            >
                                                {booking.paymentStatus.replace(
                                                    /_/g,
                                                    " "
                                                )}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="py-12 text-center">
                            <CalendarDays className="mx-auto h-12 w-12 text-muted-foreground/30" />
                            <h3 className="mt-3 text-title-md font-semibold">
                                No bookings yet
                            </h3>
                            <p className="mt-2 text-muted-foreground">
                                Find a turf to get your first match on the calendar.
                            </p>
                            <Link href="/turfs" className="mt-4 inline-block">
                                <Badge
                                    variant="primary"
                                    size="lg"
                                >
                                    Browse turfs
                                </Badge>
                            </Link>
                        </div>
                    )}
                </>
            )}

            <Link
                href="/user/dashboard/bookings"
                className="block rounded-xl border border-border bg-secondary/20 px-4 py-3 text-center text-sm font-medium text-primary hover:bg-secondary/40"
            >
                View all bookings →
            </Link>
        </div>
    );
}
