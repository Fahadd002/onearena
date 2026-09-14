"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/premium/Badge";
import { httpClient } from "@/lib/axios/httpClient";
import { API_BASE_URL, API_ENDPOINTS } from "@/lib/api/config";
import { toast } from "sonner";
import {
    CheckCircle,
    Calendar,
    Clock,
    MapPin,
    Download,
    FileText,
    ArrowLeft,
} from "lucide-react";

type BookingDetail = {
    id: string;
    bookingNumber: string;
    bookingDate: string;
    startMinute: number;
    endMinute: number;
    totalAmount: string | number;
    status: string;
    paymentStatus: string;
    turf?: { name: string; address?: string | null; area?: string | null };
    invoice?: { invoiceNumber: string };
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
        year: "numeric",
    });
}

function generateICS(booking: BookingDetail): string {
    const start = new Date(booking.bookingDate);
    const startHour = Math.floor(booking.startMinute / 60);
    const startMin = booking.startMinute % 60;
    const startDateTime = new Date(start);
    startDateTime.setHours(startHour, startMin, 0, 0);

    const endHour = Math.floor(booking.endMinute / 60);
    const endMin = booking.endMinute % 60;
    const endDateTime = new Date(start);
    endDateTime.setHours(endHour, endMin, 0, 0);

    const formatICSDate = (d: Date) =>
        d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//OneArena//Booking//EN
BEGIN:VEVENT
UID:${booking.bookingNumber}@onearena
DTSTART:${formatICSDate(startDateTime)}
DTEND:${formatICSDate(endDateTime)}
SUMMARY:Booking at ${booking.turf?.name || "Turf"}
DESCRIPTION:Booking Code: ${booking.bookingNumber}
LOCATION:${booking.turf?.address || ""}
END:VEVENT
END:VCALENDAR`;
}

export default function BookingConfirmationPage() {
    const searchParams = useSearchParams();
    const bookingId = searchParams.get("bookingId");
    const [booking, setBooking] = useState<BookingDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!bookingId) {
            setLoading(false);
            return;
        }

        httpClient
            .get<BookingDetail>(`/bookings/${bookingId}`)
            .then((result) => {
                setBooking(result.data ?? null);
                setError(null);
            })
            .catch(() => {
                setError("Could not load booking details.");
                setBooking(null);
            })
            .finally(() => setLoading(false));
    }, [bookingId]);

    const downloadICS = () => {
        if (!booking) return;
        const icsContent = generateICS(booking);
        const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `onearena-${booking.bookingNumber}.ics`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const downloadInvoice = () => {
        if (!booking?.invoice?.invoiceNumber) return;
        // The invoice download endpoint should be available
        window.open(
            `${API_BASE_URL}${API_ENDPOINTS.marketplace.invoices}/${booking.invoice.invoiceNumber}/download`,
            "_blank"
        );
    };

    if (loading) {
        return (
            <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
                <div className="animate-pulse text-center">
                    <div className="mx-auto mb-6 h-20 w-20 rounded-full bg-muted"></div>
                    <div className="mx-auto mb-4 h-6 w-3/4 rounded bg-muted"></div>
                    <div className="mx-auto h-4 w-1/2 rounded bg-muted"></div>
                </div>
            </main>
        );
    }

    if (!booking || !bookingId) {
        return (
            <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
                <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-8 text-center">
                    <p className="text-destructive">
                        {error ?? "Booking not found."}
                    </p>
                </div>
            </main>
        );
    }

    const totalAmount = Number(booking.totalAmount);
    const isPaymentVerified =
        booking.paymentStatus === "SUCCEEDED" ||
        booking.paymentStatus === "PARTIALLY_PAID" ||
        booking.status === "CONFIRMED";

    return (
        <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
            <div className="text-center">
                <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-glow">
                    <CheckCircle className="h-12 w-12 text-primary-foreground" />
                </div>
                <h1 className="text-display-lg font-display">
                    Booking confirmed!
                </h1>
                <p className="mt-3 text-muted-foreground">
                    Your reservation has been verified and is ready to go.
                </p>
            </div>

            <Card className="surface-elevated mt-8">
                <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Booking code
                            </p>
                            <p className="text-title-lg font-semibold">
                                 {booking.bookingNumber}
                            </p>
                        </div>
                        <Badge
                            variant={
                                isPaymentVerified ? "success" : "warning"
                            }
                            size="lg"
                        >
                            {isPaymentVerified
                                ? "Payment confirmed"
                                : "Payment pending"}
                        </Badge>
                    </div>

                    <div className="mt-6 space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <Calendar className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Date
                                </p>
                                <p className="font-medium">
                                    {formatDate(booking.bookingDate)}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <Clock className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Time
                                </p>
                                <p className="font-medium">
                                    {formatTime(booking.startMinute)} –{" "}
                                    {formatTime(booking.endMinute)}
                                </p>
                            </div>
                        </div>

                        {booking.turf && (
                            <div className="flex items-center gap-4">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                    <MapPin className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        Venue
                                    </p>
                                    <p className="font-medium">
                                        {booking.turf.name}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {booking.turf.address}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-6 space-y-2 border-t border-border pt-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                                Total paid
                            </span>
                            <span className="text-lg font-semibold">
                                ৳ {totalAmount.toLocaleString()}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                                Remaining at venue
                            </span>
                            <span className="text-sm font-medium text-primary">
                                ৳ {(totalAmount * 0.8).toLocaleString()}
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Button variant="outline" size="lg" asChild>
                    <Link href="/user/dashboard/bookings">
                        <FileText className="h-4 w-4" />
                        View all bookings
                    </Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                    <Link href="/turfs">
                        <ArrowLeft className="h-4 w-4" />
                        Back to discovery
                    </Link>
                </Button>
                {booking.invoice?.invoiceNumber && (
                    <Button
                        variant="outline"
                        size="lg"
                        onClick={downloadInvoice}
                    >
                        <Download className="h-4 w-4" />
                        Download invoice
                    </Button>
                )}
                <Button variant="outline" size="lg" onClick={downloadICS}>
                    <Calendar className="h-4 w-4" />
                    Add to calendar
                </Button>
            </div>
        </main>
    );
}
