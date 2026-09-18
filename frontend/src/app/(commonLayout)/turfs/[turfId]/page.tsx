"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Calendar,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  MapPin,
  MessageSquare,
  Phone,
  Star,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FacilityIcon } from "@/components/premium/facilityIcons";
import { API_BASE_URL, API_ENDPOINTS } from "@/lib/api/config";
import { useAuth } from "@/lib/auth";
import { httpClient } from "@/lib/axios/httpClient";
import type { Turf, TurfFacility, TurfSlot } from "@/types/turf.type";

const resolveImageUrl = (url: string) =>
  url && !url.startsWith("http")
    ? `${API_BASE_URL.replace(/\/api\/v1$/, "")}${url}`
    : url;

const formatTime = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  return `${hours % 12 || 12}:${(minutes % 60).toString().padStart(2, "0")} ${
    hours >= 12 ? "PM" : "AM"
  }`;
};

const formatDate = (date: string) => {
  const value = new Date(`${date}T00:00:00.000Z`);
  return {
    weekday: value
      .toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" })
      .toUpperCase(),
    day: value.toLocaleDateString("en-US", { day: "2-digit", timeZone: "UTC" }),
    month: value
      .toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })
      .toUpperCase(),
    year: value.getUTCFullYear(),
  };
};

const getSlotStatus = (slot: TurfSlot) => {
  const backendSlot = slot as TurfSlot & { slotStatus?: string };
  const value = String(
    backendSlot.status ?? backendSlot.slotStatus ?? ""
  ).toUpperCase();
  return value === "BOOKED"
    ? "BOOKED"
    : value === "RESERVED"
    ? "RESERVED"
    : "AVAILABLE";
};

export default function TurfDetailsPage() {
  const { turfId } = useParams<{ turfId: string }>();
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();

  const [turf, setTurf] = useState<Turf | null>(null);
  const [today, setToday] = useState("");
  const [windowStart, setWindowStart] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [slotsByDate, setSlotsByDate] = useState<Record<string, TurfSlot[]>>({});
  const [selectedSlot, setSelectedSlot] = useState<TurfSlot | null>(null);
  const [turfLoading, setTurfLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [turfError, setTurfError] = useState<string | null>(null);
  const [slotError, setSlotError] = useState<string | null>(null);
  const [mobile, setMobile] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    const date = new Date().toISOString().slice(0, 10);
    setToday(date);
    setWindowStart(date);
    setSelectedDate(date);
  }, []);

  useEffect(() => {
    if (!turfId) return;
    setTurfLoading(true);
    httpClient
      .get<Turf>(`${API_ENDPOINTS.marketplace.turfs}/${turfId}`)
      .then((result) => {
        const data = result.data ?? null;
        if (data?.images) {
          data.images = data.images.map((image) => ({
            ...image,
            url: resolveImageUrl(image.url),
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

  const tenDays = useMemo(
    () =>
      Array.from({ length: windowStart ? 10 : 0 }, (_, index) => {
        const value = new Date(`${windowStart}T00:00:00.000Z`);
        value.setUTCDate(value.getUTCDate() + index);
        return value.toISOString().slice(0, 10);
      }),
    [windowStart]
  );

  useEffect(() => {
    if (!turfId || !tenDays.length) return;
    let cancelled = false;
    setSlotsLoading(true);
    setSlotError(null);
    Promise.all(
      tenDays.map(async (date) => ({
        date,
        slots:
          (
            await httpClient.get<TurfSlot[]>(
              `${API_ENDPOINTS.marketplace.turfs}/${turfId}/slots?date=${date}`
            )
          ).data ?? [],
      }))
    )
      .then((days) => {
        if (!cancelled)
          setSlotsByDate(
            Object.fromEntries(days.map(({ date, slots }) => [date, slots]))
          );
      })
      .catch(() => {
        if (!cancelled) {
          setSlotsByDate({});
          setSlotError("Availability is temporarily unavailable.");
        }
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tenDays, turfId]);

  const averageRating = useMemo(
    () =>
      !turf?.reviews?.length
        ? 0
        : turf.reviews.reduce((sum, review) => sum + review.rating, 0) /
          turf.reviews.length,
    [turf?.reviews]
  );

  const selectedPrice = Number(selectedSlot?.price ?? turf?.basePrice ?? 0);

  const changeWindow = (direction: -1 | 1) => {
    if (!windowStart || (direction === -1 && windowStart <= today)) return;
    const next = new Date(`${windowStart}T00:00:00.000Z`);
    next.setUTCDate(next.getUTCDate() + direction * 10);
    const nextValue = next.toISOString().slice(0, 10);
    const value = direction === -1 && nextValue < today ? today : nextValue;
    setWindowStart(value);
    setSelectedDate(value);
    setSelectedSlot(null);
  };

  const selectSlot = (slot: TurfSlot, date: string) => {
    if (getSlotStatus(slot) === "AVAILABLE") {
      setSelectedSlot(slot);
      setSelectedDate(date);
      setPhoneError(null);
    }
  };

  const book = async () => {
    if (!session && !authLoading) {
      router.push(
        `/login?redirect=${encodeURIComponent(
          `/turfs/${turfId}?date=${selectedDate}`
        )}`
      );
      return;
    }
    if (!session || !turf || !selectedSlot?.id) return;
    const normalizedMobile = mobile.replace(/[\s-]/g, "");
    if (!/^(?:\+8801|01)\d{9}$/.test(normalizedMobile)) {
      setPhoneError("Enter a valid Bangladesh mobile number");
      return;
    }
    setBooking(true);
    try {
      await httpClient.post<{ id: string }>(API_ENDPOINTS.marketplace.bookings, {
        turfId,
        bookingDate: selectedDate,
        startMinute: selectedSlot.startMinute,
        endMinute: selectedSlot.endMinute,
        slotId: selectedSlot.id,
        mobile: normalizedMobile,
        idempotencyKey: crypto.randomUUID(),
      });
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

  if (turfLoading) return <PageSkeleton />;
  if (!turf)
    return (
      <main className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-8 text-center">
          <p className="text-destructive">{turfError ?? "Turf not found."}</p>
          <Link href="/turfs" className="mt-4 inline-block font-medium text-primary hover:underline">
            Back to turfs
          </Link>
        </div>
      </main>
    );

  const images = turf.images?.length
    ? turf.images
    : [{ url: "/placeholder.svg", id: "placeholder" }];

  return (
    <main className="min-h-screen bg-background text-foreground  transition-colors duration-300 mt-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        
        {/* Time Slot Picker Section */}
        <section className="mb-10">
          <div className="mb-4 flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="outline"
              disabled={!windowStart || windowStart <= today}
              onClick={() => changeWindow(-1)}
              className="flex items-center gap-1.5 text-xs font-semibold"
            >
              <ChevronLeft className="size-4" /> Previous 10 Days
            </Button>

            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-sm font-bold text-foreground">
                <Calendar className="size-4 text-primary" />
                {tenDays.length
                  ? `${formatDate(tenDays[0]).day} ${formatDate(tenDays[0]).month} ${formatDate(tenDays[0]).year} – ${formatDate(tenDays[9]).day} ${formatDate(tenDays[9]).month} ${formatDate(tenDays[9]).year}`
                  : ""}
              </div>
              <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">
                Today → Next 9 Days
              </p>
            </div>

            <Button
              type="button"
              onClick={() => changeWindow(1)}
              className="flex items-center gap-1.5 bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary-hover"
            >
              Next 10 Days <ChevronRight className="size-4" />
            </Button>
          </div>

          {/* Legend */}
          <div className="mb-4 flex items-center justify-center gap-6 text-xs font-semibold text-muted-foreground">
            <span className="flex items-center gap-2">
              <i className="size-2.5 rounded-full bg-primary" /> Available
            </span>
            <span className="flex items-center gap-2">
              <i className="size-2.5 rounded-full bg-amber-500" /> Reserved
            </span>
            <span className="flex items-center gap-2">
              <i className="size-2.5 rounded-full bg-muted-foreground/40" /> Booked
            </span>
          </div>

          {/* Slot Grid */}
          <Card className="overflow-hidden border-border bg-card shadow-xs">
            <CardContent className="p-3 sm:p-5">
              {slotError ? (
                <p className="rounded-xl bg-muted p-6 text-center text-sm text-muted-foreground">
                  {slotError}
                </p>
              ) : slotsLoading ? (
                <SlotSkeleton />
              ) : (
                <motion.div
                  initial="hidden"
                  animate="show"
                  variants={{
                    hidden: { opacity: 0 },
                    show: {
                      opacity: 1,
                      transition: { staggerChildren: 0.05 },
                    },
                  }}
                  className="space-y-3"
                >
                  {tenDays.map((date) => (
                    <DaySlotsRow
                      key={date}
                      date={date}
                      today={today}
                      slots={slotsByDate[date] ?? []}
                      selectedDate={selectedDate}
                      selectedSlot={selectedSlot}
                      onSelect={selectSlot}
                    />
                  ))}
                </motion.div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Turf Details Layout */}
        <div className="space-y-6">
          <Card className="overflow-hidden border-border bg-card p-4 shadow-xs">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
              {/* Main Animated Active Preview */}
              <div className="relative aspect-[3/2] overflow-hidden rounded-xl bg-muted md:col-span-8">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={activeImageIndex}
                    src={images[activeImageIndex]?.url}
                    alt={`${turf.name} preview ${activeImageIndex + 1}`}
                    initial={{ opacity: 0, scale: 1.03 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    className="absolute inset-0 size-full object-cover"
                  />
                </AnimatePresence>
                <div className="absolute bottom-3 left-3 z-20 rounded-md bg-background/80 px-2 py-1 text-[11px] font-semibold text-foreground backdrop-blur-md">
                  {activeImageIndex + 1} / {images.length}
                </div>
              </div>

              {/* Thumbnail Previews */}
              <div className="grid max-h-[400px] grid-cols-4 gap-2 overflow-y-auto pr-1 md:col-span-4 md:grid-cols-1">
                {images.map((img, idx) => (
                  <motion.button
                    key={img.id || idx}
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative aspect-[4/3] overflow-hidden rounded-lg border-2 transition-all duration-200 ${
                      activeImageIndex === idx
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={img.url}
                      alt={`Thumbnail ${idx + 1}`}
                      className="size-full object-cover"
                    />
                  </motion.button>
                ))}
              </div>

              {/* Rating & Review Section directly under Gallery */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-secondary/40 p-4 md:col-span-12">
                <div className="flex items-center gap-3">
                  <div className="flex size-12 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-lg font-extrabold text-amber-500 shadow-xs">
                    {averageRating ? averageRating.toFixed(1) : "0.0"}
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`size-4 ${
                            i < Math.round(averageRating)
                              ? "fill-amber-400 text-amber-400"
                              : "text-muted-foreground/30"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="mt-1 text-xs font-semibold text-foreground">
                      {turf.reviews?.length
                        ? `${turf.reviews.length} Verified Customer Reviews`
                        : "No reviews yet for this venue"}
                    </p>
                  </div>
                </div>

                {turf.reviews?.length ? (
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <MessageSquare className="size-4 text-primary" />
                    <span>Highest rated for turf quality and field lighting</span>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Info Summary */}
            <div className="mt-5 border-t border-border pt-4">
              <h1 className="text-2xl font-bold text-foreground">{turf.name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-xs font-semibold text-muted-foreground">
                <span className="capitalize">{turf.category?.name || "Football"}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="size-3.5 text-muted-foreground/70" />
                  {turf.address}{turf.area ? `, ${turf.area}` : ""}
                </span>
              </div>
              {turf.description && (
                <p className="mt-3 text-xs leading-relaxed text-foreground/80">
                  {turf.description}
                </p>
              )}

              {/* Clean Facility Icons without circle wrapper */}
              {turf.facilities?.length ? (
                <div className="mt-4 flex flex-wrap gap-5 border-t border-border pt-3">
                  {turf.facilities.map((item: TurfFacility) => (
                    <div key={item.facility.id} className="flex items-center gap-1.5">
                      <FacilityIcon name={item.facility.name} className="size-4 text-primary" />
                      <span className="text-xs font-semibold text-foreground">
                        {item.facility.name}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </Card>
        </div>

        {/* Slide-over Right Checkout Drawer */}
        <AnimatePresence>
          {selectedSlot && (
            <>
              {/* Backdrop Overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedSlot(null)}
                className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs"
              />

              {/* Slide-In Side Card */}
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-border bg-card shadow-2xl"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border bg-secondary/30 p-4">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="size-4 text-primary" />
                    <h3 className="text-sm font-bold text-foreground">Quick Checkout</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedSlot(null)}
                    className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                {/* Body */}
                <div className="flex-1 space-y-5 overflow-y-auto p-5">
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
                          Selected Slot
                        </p>
                        <p className="text-xs font-bold text-foreground">
                          {formatTime(selectedSlot.startMinute)} – {formatTime(selectedSlot.endMinute)}
                        </p>
                      </div>
                    </div>
                    <span className="text-base font-extrabold text-primary">
                      ৳ {selectedPrice.toLocaleString()}
                    </span>
                  </div>

                  <div className="space-y-2.5 border-y border-border py-4 text-xs">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Date</span>
                      <span className="font-semibold text-foreground">
                        {formatDate(selectedDate).weekday}, {formatDate(selectedDate).day} {formatDate(selectedDate).month} {formatDate(selectedDate).year}
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Duration</span>
                      <span className="font-semibold text-foreground">
                        {Math.round((selectedSlot.endMinute - selectedSlot.startMinute))} Minutes
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal</span>
                      <span className="font-semibold text-foreground">
                        ৳ {selectedPrice.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold text-muted-foreground">
                      Mobile Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="tel"
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value)}
                        placeholder="01770618575"
                        className="border-border pl-8 text-xs focus:border-primary focus:ring-primary/20"
                      />
                    </div>
                    {phoneError && (
                      <p className="mt-1 text-[11px] text-destructive">{phoneError}</p>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="space-y-2 border-t border-border bg-card p-4">
                  <Button
                    className="w-full bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary-hover py-3 rounded-lg shadow-xs"
                    disabled={!mobile.trim() || booking || authLoading}
                    onClick={book}
                  >
                    {booking ? "Processing..." : `Confirm • ৳ ${selectedPrice.toLocaleString()}`}
                  </Button>

                  {!session && !authLoading && (
                    <p className="text-center text-[10px] text-muted-foreground">
                      You'll be asked to sign in before confirming.
                    </p>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}

/* Row-style Day Slots Component */
function DaySlotsRow({
  date,
  today,
  slots,
  selectedDate,
  selectedSlot,
  onSelect,
}: {
  date: string;
  today: string;
  slots: TurfSlot[];
  selectedDate: string;
  selectedSlot: TurfSlot | null;
  onSelect: (slot: TurfSlot, date: string) => void;
}) {
  const info = formatDate(date);

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 8 },
        show: { opacity: 1, y: 0 },
      }}
      className="flex flex-col items-stretch overflow-hidden rounded-lg border border-border bg-secondary/30 md:flex-row"
    >
      <div className="relative flex shrink-0 items-center justify-between border-b border-border bg-card p-3 md:w-36 md:flex-col md:items-start md:border-b-0 md:border-r">
        <div className="absolute bottom-0 left-0 top-0 w-1 bg-primary" />
        <div>
          <h4 className="text-sm font-extrabold uppercase tracking-wide text-foreground">
            {info.weekday}
          </h4>
          <p className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
            <Calendar className="size-3" />
            {info.day} {info.month} {info.year}
          </p>
        </div>
        {date === today && (
          <span className="mt-1 inline-block rounded bg-primary px-2 py-0.5 text-[10px] font-bold uppercase text-primary-foreground">
            Today
          </span>
        )}
      </div>

      <div className="flex-1 bg-card p-3">
        {slots.length ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {slots.map((slot) => {
              const status = getSlotStatus(slot);
              const available = status === "AVAILABLE";
              const reserved = status === "RESERVED";
              const selected = selectedDate === date && selectedSlot?.id === slot.id;

              return (
                <motion.button
                  key={slot.id ?? `${slot.startMinute}-${slot.endMinute}`}
                  type="button"
                  disabled={!available}
                  onClick={() => onSelect(slot, date)}
                  whileHover={available ? { scale: 1.02 } : undefined}
                  whileTap={available ? { scale: 0.97 } : undefined}
                  className={`relative flex flex-col items-center justify-center gap-0.5 rounded-lg border px-2 py-2 text-center transition-all duration-150 ${
                    selected
                      ? "border-primary bg-primary text-primary-foreground shadow-xs ring-2 ring-primary/20"
                      : available
                      ? "border-primary/30 bg-primary/5 text-foreground hover:bg-primary/10"
                      : reserved
                      ? "cursor-not-allowed border-amber-500/30 bg-amber-500/10 text-muted-foreground"
                      : "cursor-not-allowed border-border bg-muted/60 text-muted-foreground/60"
                  }`}
                >
                  {selected && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 25 }}
                      className="absolute left-1.5 top-1.5 grid size-3.5 place-items-center rounded-full bg-primary-foreground text-primary"
                    >
                      <Check className="size-2.5 stroke-[3]" />
                    </motion.span>
                  )}

                  <span className="whitespace-nowrap text-[10px] font-semibold tracking-tight sm:text-[11px]">
                    {formatTime(slot.startMinute)} – {formatTime(slot.endMinute)}
                  </span>

                  <span
                    className={`text-[11px] font-bold sm:text-xs ${
                      selected
                        ? "text-primary-foreground"
                        : available
                        ? "text-primary"
                        : "text-muted-foreground"
                    }`}
                  >
                    ৳ {Number(slot.price ?? 0).toLocaleString()}
                  </span>
                </motion.button>
              );
            })}
          </div>
        ) : (
          <div className="py-2 text-center text-xs font-medium text-muted-foreground">
            No slots available for this day.
          </div>
        )}
      </div>
    </motion.div>
  );
}

function SlotSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="h-16 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  );
}

function PageSkeleton() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="animate-pulse space-y-6">
        <div className="h-12 w-full rounded-xl bg-muted" />
        <div className="h-64 w-full rounded-xl bg-muted" />
        <div className="h-80 rounded-xl bg-muted" />
      </div>
    </main>
  );
}