"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Badge } from "@/components/premium/Badge";
import { SlotSelector } from "@/components/premium/SlotSelector";
import { ImageGallery } from "@/components/premium/ImageGallery";
import { PriceSummary } from "@/components/premium/PriceSummary";
import { FacilityIcon } from "@/components/premium/facilityIcons";
import { httpClient } from "@/lib/axios/httpClient";
import { API_BASE_URL, API_ENDPOINTS } from "@/lib/api/config";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { MapPin, Star, Phone, MessageSquare } from "lucide-react";
import { DAY_NAMES, getDayOfWeekIndex } from "@/lib/time-utils";
import type { Turf, TurfSlot, TurfFacility } from "@/types/turf.type";

const getImageUrl = (url: string): string => {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    const origin = API_BASE_URL.replace(/\/api\/v1$/, "");
    return `${origin}${url}`;
};

export default function TurfDetailsPage() {
    const { turfId } = useParams<{ turfId: string }>();
    const router = useRouter();
    const { session, loading: authLoading } = useAuth();

    const [turf, setTurf] = useState<Turf | null>(null);
    const [date, setDate] = useState("");
    const [today, setToday] = useState("");
    const [slots, setSlots] = useState<TurfSlot[]>([]);
    const [selectedSlot, setSelectedSlot] = useState<TurfSlot | null>(null);
    const [booking, setBooking] = useState(false);
    const [turfLoading, setTurfLoading] = useState(true);
    const [turfError, setTurfError] = useState<string | null>(null);
    const [slotError, setSlotError] = useState<string | null>(null);
    const [mobile, setMobile] = useState("");
    const [dayOfWeek, setDayOfWeek] = useState<number>(0);

    useEffect(() => {
        const currentDate = new Date().toISOString().slice(0, 10);
        setToday(currentDate);
        setDate(currentDate);
    }, []);

    useEffect(() => {
        httpClient.get<Turf>(`${API_ENDPOINTS.marketplace.turfs}/${turfId}`)
            .then((result) => {
                const data = result.data ?? null;
                if (data && data.images) {
                    data.images = data.images.map((img) => ({...img, url: getImageUrl(img.url || ""),
                    }));
                }
                setTurf(data);
            })
            .catch(() => {
                setTurf(null);
                setTurfError("This turf could not be loaded.");
            })
            .finally(() => setTurfLoading(false));
    }, [turfId]);

    useEffect(() => {
        if (!turf?.timezone || !date) return;
        setDayOfWeek(getDayOfWeekIndex(date, turf.timezone));
    }, [date, turf?.timezone]);

    useEffect(() => {
        if (!turfId || !date) return;
        httpClient.get<TurfSlot[]>(`${API_ENDPOINTS.marketplace.turfs}/${turfId}/slots?date=${date}`)
            .then((result) => {
                setSlots(result.data ?? []);
                setSelectedSlot(null);
            })
            .catch(() => {
                setSlots([]);
                setSlotError("Availability is temporarily unavailable.");
            });
    }, [date, turfId]);

    const avgRating = useMemo(() => {
        if (!turf?.reviews?.length) return 0;
        return turf.reviews.reduce((sum, r) => sum + r.rating, 0) / turf.reviews.length;
    }, [turf?.reviews]);

    const selectedSlotPrice = useMemo(() => Number(selectedSlot?.price ?? turf?.basePrice ?? 0), [selectedSlot, turf?.basePrice]);

    const handleBook = async () => {
        if (!session && !authLoading) {
            const redirectUrl = `/turfs/${turfId}?date=${date}`;
            router.push(`/login?redirect=${encodeURIComponent(redirectUrl)}`);
            return;
        }

        if (!selectedSlot?.id || !turf || !session) return;

        setBooking(true);
        try {
            const result = await httpClient.post<{ id: string }>(
                API_ENDPOINTS.marketplace.bookings,
                {
                    turfId,
                    bookingDate: date,
                    startMinute: selectedSlot.startMinute,
                    endMinute: selectedSlot.endMinute,
                    slotId: selectedSlot.id,
                    mobile,
                    idempotencyKey: crypto.randomUUID(),
                }
            );

            toast.success("Booking request submitted.");
            router.push("/user/dashboard/bookings");
        } catch (error) {
            console.error("Booking failed:", error);
            toast.error("Booking failed", {
                description: "Please choose another slot or try again.",
            });
        } finally {
            setBooking(false);
        }
    };

    if (turfLoading) {
        return (
            <main className="mx-auto max-w-7xl px-4 pt-20 pb-10 sm:px-6">
                <div className="animate-pulse space-y-6">
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                        <div className="lg:col-span-8">
                            <div className="aspect-[16/9] w-full rounded-2xl bg-muted"></div>
                        </div>
                        <div className="lg:col-span-4 space-y-4">
                            <div className="h-12 w-full rounded-lg bg-muted"></div>
                            <div className="space-y-2">
                                {Array.from({ length: 6 }).map((_, i) => (
                                    <div key={i} className="h-10 w-full rounded-lg bg-muted"></div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        );
    }

    if (!turf) {
        return (
            <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
                <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-8 text-center">
                    <p className="text-destructive">
                        {turfError ?? "Turf not found."}
                    </p>
                    <Link href="/turfs" className="mt-4 inline-block text-primary">
                        ← Back
                    </Link>
                </div>
            </main>
        );
    }

    const facilities = turf.facilities ?? [];

    return (
        <main className="mx-auto max-w-7xl px-4 pt-20 pb-10 sm:px-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                <div className="lg:col-span-8 space-y-6">
                    <ImageGallery
                        images={turf.images ?? []}
                        alt={turf.name}
                        className="mb-6"
                    />

                    <div>
                        <Badge variant="primary" size="sm">
                            {turf.category?.name || "Turf"}
                        </Badge>
                        <h1 className="text-display-md mt-3 font-display">
                            {turf.name}
                        </h1>

                        <div className="mt-4 flex flex-wrap items-center gap-4">
                            {turf.reviews && turf.reviews.length > 0 ? (
                                <>
                                    <div className="flex items-center gap-1.5">
                                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                        <span className="font-medium">
                                            {avgRating.toFixed(1)}
                                        </span>
                                    </div>
                                    <span className="text-sm text-muted-foreground">
                                        {turf.reviews.length} reviews
                                    </span>
                                </>
                            ) : (
                                <span className="text-sm text-muted-foreground">
                                    New venue — be the first to review
                                </span>
                            )}
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                                <MapPin className="h-4 w-4" />
                                <span className="text-sm">
                                    {turf.address}
                                    {turf.area ? `, ${turf.area}` : ""}
                                </span>
                            </div>
                        </div>
                    </div>

                    {turf.description && (
                        <div>
                            <h2 className="text-title-2xl">About this venue</h2>
                            <p className="mt-3 text-muted-foreground">
                                {turf.description}
                            </p>
                        </div>
                    )}

                    {facilities.length > 0 && (
                        <div>
                            <h2 className="text-title-2xl">Facilities</h2>
                            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
                                {facilities.map((f: TurfFacility) => (
                                    <div
                                        key={`${f.facility.id}-${f.facility.name}`}
                                        className="flex items-center gap-3 rounded-xl bg-secondary/50 px-4 py-3"
                                    >
                                        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                            <FacilityIcon name={f.facility.name} className="h-5 w-5" />
                                        </span>
                                        <span className="text-sm font-medium">
                                            {f.facility.name}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

              
                    {(turf.reviews && turf.reviews.length > 0) ? (
                        <div>
                            <h2 className="text-title-2xl">
                                Reviews ({turf.reviews?.length ?? 0})
                            </h2>

                            <div className="mt-4 space-y-4">
                                {turf.reviews?.map((review: any) => (
                                    <div
                                        key={review.id}
                                        className="rounded-xl border border-border p-4"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary/50 text-xs font-bold">
                                                {review.user?.name?.[0]?.toUpperCase() ??
                                                    "?"}
                                            </span>
                                            <div>
                                                <p className="font-medium">
                                                    {review.user?.name ?? "Anonymous"}
                                                </p>
                                                <div className="flex items-center gap-0.5">
                                                    {Array.from({ length: 5 }).map(
                                                        (_, i) => (
                                                            <Star
                                                                key={i}
                                                                className={`h-3 w-3 ${
                                                                    i < review.rating
                                                                        ? "fill-yellow-400 text-yellow-400"
                                                                        : "text-border"
                                                                }`}
                                                            />
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                            {review.isHidden && (
                                                <span className="ml-auto text-xs rounded-full bg-destructive/10 px-2 py-0.5 text-destructive">Hidden</span>
                                            )}
                                        </div>
                                        <p className="mt-2 text-sm text-muted-foreground">
                                            {review.isHidden ? "[Hidden by moderation]" : (review.comment || "No comment")}
                                        </p>
                                        {review.replies && review.replies.length > 0 && (
                                            <div className="mt-3 space-y-2">
                                                {review.replies.map((reply: any) => (
                                                    <div key={reply.id} className="flex gap-2 rounded-lg bg-secondary/30 p-2">
                                                        <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                                                        <div>
                                                            <p className="text-sm font-medium">{reply.user?.name}</p>
                                                            <p className="text-sm text-muted-foreground">{reply.comment}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div>
                            <h2 className="text-title-2xl">Reviews</h2>
                            <p className="mt-2 text-sm text-muted-foreground">No reviews yet. Be the first to review!</p>
                        </div>
                    )}
                </div>

                <div className="lg:col-span-4">
                    <div className="sticky top-24 space-y-4">
                        <Card className="surface-elevated">
                            <CardContent className="p-5">
                                <div className="space-y-4">
                                    <div>
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                Pick a date
                                            </label>
                                            {date && (
                                                <span className="text-xs font-medium text-muted-foreground">
                                                    {DAY_NAMES[new Date(date).getDay()]}
                                                </span>
                                            )}
                                        </div>
                                        <DatePicker
                                            value={date}
                                            onChange={(d) => {
                                                setDate(d);
                                                setSelectedSlot(null);
                                                setSlotError(null);
                                            }}
                                            min={today}
                                            placeholder="Pick a date"
                                            className="mt-2 surface-input h-9 pl-9 text-sm"
                                        />
                                    </div>

                                    {slotError ? (
                                        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                                            {slotError}
                                        </div>
                                    ) : (
                                        <SlotSelector
                                            slots={slots}
                                            priceRules={turf.priceRules}
                                            basePrice={Number(turf.basePrice)}
                                            date={date}
                                            selectedSlot={selectedSlot}
                                            onSelect={setSelectedSlot}
                                            disabled={booking}
                                            dayOfWeek={dayOfWeek}
                                        />
                                    )}

                                    {selectedSlot && (
                                        <div className="rounded-xl border border-border bg-secondary/20 p-4">
                                            <PriceSummary
                                                turf={turf}
                                                selectedSlotPrice={selectedSlotPrice}
                                                selectedBookingDate={date}
                                                selectedSlot={selectedSlot}
                                            />
                                        </div>
                                    )}

                                    <div>
                                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                            Mobile number
                                        </label>
                                        <div className="relative mt-2">
                                            <Phone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                            <Input
                                                type="tel"
                                                value={mobile}
                                                onChange={(e) => setMobile(e.target.value)}
                                                placeholder="01XXXXXXXXX"
                                                className="pl-9 surface-input"
                                            />
                                        </div>
                                    </div>

                                    <Button
                                        variant="hero"
                                        size="lg"
                                        className="w-full"
                                        disabled={
                                            !selectedSlot || !mobile.trim() || booking || authLoading
                                        }
                                        onClick={handleBook}
                                    >
                                        {booking
                                            ? "Processing..."
                                            : selectedSlot
                                                ? `Book — ৳ ${Number(selectedSlotPrice).toLocaleString()}`
                                                : "Select a slot"}
                                    </Button>

                                    {!session && !authLoading && (
                                        <p className="text-center text-xs text-muted-foreground">
                                            You&apos;ll be asked to sign in before confirming.
                                        </p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </main>
    );
}
