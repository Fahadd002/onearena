"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchTurfById } from "./api";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  CalendarDays,
  Check,
  Phone,
  ChevronLeft,
  ChevronRight,
  Calendar,
  MapPin,
  Star,
  MessageSquare,
  Trash2,
  CreditCard,
  Clock,
  Shield,
  Smartphone,
  Hash,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth";
import { useRouter, usePathname } from "next/navigation";
import { httpClient } from "@/lib/axios/httpClient";
import { API_ENDPOINTS } from "@/lib/api/config";
import { randomId } from "@/lib/compat";
import type { CartSlot } from "./types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  cart: CartSlot[];
  date: string;
  onCartChange?: (cart: CartSlot[]) => void;
}

const paymentOptions = [
  { id: "BKASH", name: "bKash", icon: "/marchent-icon/bKash.svg" },
  { id: "NAGAD", name: "Nagad", icon: "/marchent-icon/nagad.svg" },
  { id: "ROKET", name: "Rocket", icon: "/marchent-icon/rocket.svg" },
] as const;

const formatTime = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  return `${hours % 12 || 12}:${(minutes % 60).toString().padStart(2, "0")} ${hours >= 12 ? "PM" : "AM"
    }`;
};

const formatDate = (date: string) => {
  const value = new Date(`${date}T00:00:00.000Z`);
  return {
    weekday: value.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }).toUpperCase(),
    day: value.toLocaleDateString("en-US", { day: "2-digit", timeZone: "UTC" }),
    month: value.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }).toUpperCase(),
    year: value.getUTCFullYear(),
  };
};

const ADVANCE_PER_SLOT = 500;

export function CheckoutDrawer({ isOpen, onClose, cart, date, onCartChange }: Props) {
  const { session, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);
  const profilePhone = session?.user.phoneNumber ?? "";
  const missingPhone = !!session && !profilePhone;

  const turfId = cart[0]?.turfId;
  const { data: turf } = useQuery({
    queryKey: ["turf-payment-info", turfId],
    queryFn: () => fetchTurfById(turfId!),
    enabled: isOpen && !!turfId,
  });
  const paymentNumbers = turf?.allowAdvancePayment ? (turf.paymentPhoneNumbers ?? []) : [];
  const [paymentOption, setPaymentOption] = useState<"advance" | "later">("later");
  const [advanceMethod, setAdvanceMethod] = useState("");
  const [senderMobile, setSenderMobile] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [advanceError, setAdvanceError] = useState<string | null>(null);
  const selectedMethod = advanceMethod || paymentNumbers[0]?.method || "";
  const selectedPaymentNumber = paymentNumbers.find((p) => p.method === selectedMethod);
  const advanceTotal = Math.min(ADVANCE_PER_SLOT * cart.length, cart.reduce((sum, s) => sum + s.price, 0));

  useEffect(() => {
    if (isOpen) setPhoneError(null);
  }, [isOpen]);

  useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem("onearena:pending-sender-mobile");
      if (saved) setSenderMobile(saved);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      if (senderMobile) window.sessionStorage.setItem("onearena:pending-sender-mobile", senderMobile);
      else window.sessionStorage.removeItem("onearena:pending-sender-mobile");
    } catch {
      /* ignore */
    }
  }, [senderMobile]);

  const totalPrice = cart.reduce((sum, slot) => sum + slot.price, 0);

  const slotsByDate = cart.reduce(
    (acc, slot) => {
      const dateKey = slot.date;
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(slot);
      return acc;
    },
    {} as Record<string, CartSlot[]>,
  );

  const removeFromCart = (slotId: string) => {
    if (onCartChange) {
      onCartChange(cart.filter((s) => s.id !== slotId));
    }
  };

  const book = async () => {
    if (!session && !authLoading) {
      router.push(`/login?redirect=${encodeURIComponent(`${pathname}?date=${date}`)}`);
      return;
    }
    if (!session || cart.length === 0) return;

    if (!profilePhone) {
      toast.info("Update your profile with a phone number, then come back to confirm your booking.");
      router.push(`/my-profile?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    const normalizedMobile = profilePhone.replace(/[\s-]/g, "");
    if (!/^(?:\+8801|01)\d{9}$/.test(normalizedMobile)) {
      setPhoneError("Your profile phone isn't a valid Bangladesh mobile number. Please update it.");
      return;
    }

    const advanceSender = senderMobile.replace(/[\s-]/g, "");
    if (paymentOption === "advance" && paymentNumbers.length > 0) {
      if (!/^(?:\+8801|01)\d{9}$/.test(advanceSender)) {
        setAdvanceError("Enter the mobile number you sent the payment from.");
        return;
      }
      if (transactionId.trim().length < 4) {
        setAdvanceError("Enter the transaction number from your payment.");
        return;
      }
    }
    setAdvanceError(null);

    setBooking(true);
    try {
      await httpClient.post<{ id: string }>(API_ENDPOINTS.marketplace.bookings, {
        slots: cart.map((slot) => ({
          slotId: slot.id,
          turfId: slot.turfId,
          bookingDate: slot.date,
          startMinute: slot.startMinute,
          endMinute: slot.endMinute,
        })),
        mobile: normalizedMobile,
        ...(paymentOption === "advance" && paymentNumbers.length > 0
          ? {
            advancePayment: {
              method: selectedMethod,
              senderMobile: advanceSender,
              transactionId: transactionId.trim(),
              amount: advanceTotal,
            },
          }
          : {}),
        idempotencyKey: randomId(),
      });
      toast.success(
        cart.length === 1 ? "Booking request submitted." : `${cart.length} slots booked.`,
      );
      onClose();
      if (onCartChange) onCartChange([]);
      await queryClient.refetchQueries({ queryKey: ["turfs"], type: "active" });
      try { window.sessionStorage.removeItem("onearena:pending-sender-mobile"); } catch { /* ignore */ }
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

  if (!isOpen || cart.length === 0) return null;

  const canPayAdvance = paymentNumbers.length > 0 && turf?.allowAdvancePayment;

  return (
    <AnimatePresence>
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm"
        />

        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="fixed inset-y-0 right-0 z-[100] flex w-full max-w-lg flex-col border-l border-border bg-card shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border bg-gradient-to-r from-primary/5 to-primary/10 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <CalendarDays className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Checkout</h3>
                <p className="text-xs text-muted-foreground">
                  {cart.length} slot{cart.length > 1 ? "s" : ""} selected
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            {/* Slots List - Grouped by Date */}
            <div className="space-y-4 max-h-80 overflow-y-auto">
              {Object.entries(slotsByDate).map(([dateKey, slots], dateIndex) => (
                <motion.div
                  key={dateKey}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: dateIndex * 0.1 }}
                >
                  <div className="mb-2 flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-2">
                    <CalendarDays className="size-4 text-primary" />
                    <span className="text-sm font-semibold text-primary">
                      {formatDate(dateKey).weekday}, {formatDate(dateKey).day} {formatDate(dateKey).month} {formatDate(dateKey).year}
                    </span>
                    <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                      {slots.length} slot{slots.length > 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {slots.map((slot, slotIndex) => (
                      <motion.div
                        key={slot.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: slotIndex * 0.05 }}
                        className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 hover:border-primary/30 transition-colors"
                      >
                        <div className="flex-1 min-w-0 flex items-center gap-3">
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 400, damping: 20 }}
                            className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground flex-shrink-0"
                          >
                            <Check className="size-4 stroke-[3]" />
                          </motion.span>
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-primary truncate">
                              {slot.turfName}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Clock className="size-3 text-muted-foreground" />
                              <p className="text-sm font-semibold text-foreground">
                                {formatTime(slot.startMinute)} – {formatTime(slot.endMinute)}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-base font-bold text-foreground">
                            ৳ {slot.price.toLocaleString()}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeFromCart(slot.id)}
                            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
                            aria-label="Remove slot"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Summary */}
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <h4 className="mb-3 text-sm font-semibold text-foreground">Order Summary</h4>
              <div className="space-y-2">
                {Object.entries(slotsByDate).map(([dateKey, slots]) => (
                  <div key={dateKey} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {formatDate(dateKey).weekday}, {formatDate(dateKey).day} {formatDate(dateKey).month}
                      </span>
                      <span className="font-medium text-foreground">
                        {slots.length} slot{slots.length > 1 ? "s" : ""} • ৳{slots.reduce((sum, s) => sum + s.price, 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
                <Separator className="my-2" />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-semibold text-foreground">৳ {totalPrice.toLocaleString()}</span>
                </div>
                {canPayAdvance && paymentOption === "advance" && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Advance Payment (৳{ADVANCE_PER_SLOT}/slot)</span>
                    <span className="font-semibold">- ৳ {advanceTotal.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold text-foreground pt-2 border-t border-border">
                  <span>Total Due</span>
                  <span>
                    ৳ {paymentOption === "advance" ? (totalPrice - advanceTotal).toLocaleString() : totalPrice.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Contact Number */}
            <div>
              <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                Contact Number
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="tel"
                  value={profilePhone}
                  disabled
                  readOnly
                  placeholder="No phone number on your profile"
                  className="border-border bg-muted/40 pl-9 text-sm font-semibold shadow-none"
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {phoneError ?? "We'll use your profile phone number to contact you about this booking."}
              </p>
            </div>

            {/* Payment Options */}
            {canPayAdvance ? (
              <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-4">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <CreditCard className="size-4 text-primary" />
                  Payment Option
                </h4>
                <RadioGroup
                  value={paymentOption}
                  onValueChange={(value) => setPaymentOption(value as "advance" | "later")}
                  className="space-y-3"
                >
                  <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-3 transition-all hover:border-primary/30">
                    <RadioGroupItem value="advance" className="mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">Pay Advance Now</span>
                        <span className="text-sm font-bold text-primary">৳ {advanceTotal.toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Pay ৳{ADVANCE_PER_SLOT} per slot now via mobile banking. Remaining amount payable at venue.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-3 transition-all hover:border-primary/30">
                    <RadioGroupItem value="later" className="mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">Pay Later</span>
                        <span className="text-sm font-bold text-green-600">Full: ৳ {totalPrice.toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Pay the full amount when you arrive at the turf.
                      </p>
                    </div>
                  </div>
                </RadioGroup>

                {paymentOption === "advance" && (
                  <div className="space-y-3 pt-3 border-t border-border">
                    <div className="flex flex-wrap gap-2">
                      {paymentNumbers.map((p) => {
                        const isSelected = selectedMethod === p.method;
                        const opt = paymentOptions.find((o) => o.id === p.method);
                        if (!opt) return null;
                        return (
                          <button
                            type="button"
                            key={p.method}
                            onClick={() => setAdvanceMethod(p.method)}
                            className="flex cursor-pointer items-center transition-all duration-200"
                          >
                            <img
                              src={opt.icon}
                              alt={opt.name}
                              className={`h-9 w-20 shrink-0 rounded-md transition-all duration-200 bg-white ${isSelected
                                ? "drop-shadow-[0_0_8px_rgba(128,0,255,0.5)] scale-105"
                                : "hover:scale-105"
                                }`}
                            />
                          </button>
                        );
                      })}
                    </div>
                    {selectedPaymentNumber && (
                      <div className="rounded-lg bg-primary/5 p-3">
                        <p className="text-sm text-muted-foreground">
                          Send <span className="font-bold text-foreground">৳{advanceTotal.toLocaleString()}</span> to
                          <span className="font-bold text-primary ml-1">{selectedPaymentNumber.number}</span>{" "}
                          ({selectedPaymentNumber.method}), then enter the details below.
                        </p>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Input
                        type="tel"
                        value={senderMobile}
                        onChange={(event) => setSenderMobile(event.target.value)}
                        placeholder="Sender mobile number (e.g., 01XXXXXXXXX)"
                        className="border-border text-sm shadow-none"
                      />
                      <Input
                        value={transactionId}
                        onChange={(event) => setTransactionId(event.target.value)}
                        placeholder="Transaction ID"
                        className="border-border text-sm shadow-none"
                      />
                      <p className="text-xs text-muted-foreground">
                        {advanceError ?? "Admin will verify your payment and confirm the booking."}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-green-100 bg-green-50 p-4">
                <div className="flex items-center gap-2 text-sm text-green-700">
                  <Shield className="size-4" />
                  <span className="font-medium">Pay at Venue</span>
                </div>
                <p className="text-xs text-green-600 mt-1">
                  This turf doesn't accept advance payments. Pay the full amount of ৳{totalPrice.toLocaleString()} when you arrive.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="space-y-3 border-t border-border bg-card/50 px-5 py-4">
            <Button
              className="w-full bg-gradient-to-r from-primary to-primary-glow text-sm font-semibold text-primary-foreground hover:brightness-110 py-3.5 rounded-xl shadow-none"
              disabled={booking || authLoading}
              onClick={book}
            >
              {booking
                ? "Processing..."
                : `Confirm  Booking`}
            </Button>

            {missingPhone && (
              <p className="text-center text-xs text-muted-foreground">
                Add a phone number to your profile to confirm — we'll take you there.
              </p>
            )}

            {!session && !authLoading && (
              <p className="text-center text-xs text-muted-foreground">
                Sign in to confirm — your selected slots are saved.
              </p>
            )}
          </div>
        </motion.div>
      </>
    </AnimatePresence>
  );
}  