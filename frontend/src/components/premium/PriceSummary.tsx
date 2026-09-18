import { CalendarDays, CreditCard, ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Turf, TurfSlot } from "@/types/turf.type";

interface PriceSummaryProps {
  turf: Turf;
  selectedSlotPrice?: number;
  selectedBookingDate?: string;
  selectedSlot?: TurfSlot | null;
  className?: string;
}

export function PriceSummary({ turf, selectedSlotPrice = 0, selectedBookingDate, selectedSlot, className }: PriceSummaryProps) {
  const slotPrice = selectedSlotPrice || Number(turf.basePrice);
  const advancePercentage = 20;
  const advanceAmount = Math.round((slotPrice * advancePercentage) / 100);
  const balance = slotPrice - advanceAmount;

  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  };

  return (
    <div className={cn("space-y-4 text-sm", className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Booking summary</p>
          {selectedBookingDate && (
            <p className="mt-1 inline-flex items-center gap-1.5 font-semibold">
              <CalendarDays className="size-3.5 text-primary" />
              {new Date(`${selectedBookingDate}T00:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            </p>
          )}
          {selectedSlot && (
            <p className="mt-1 text-xs text-muted-foreground">
              {formatTime(selectedSlot.startMinute)} – {formatTime(selectedSlot.endMinute)}
            </p>
          )}
        </div>
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">Secure checkout</span>
      </div>

      <div className="space-y-2.5 border-y border-border py-3.5">
        <div className="flex items-center justify-between text-muted-foreground">
          <span>Slot price</span>
          <span className="font-medium text-foreground">৳ {slotPrice.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between text-muted-foreground">
          <span>Booking fee</span>
          <span className="font-medium text-foreground">৳ 0</span>
        </div>
        <div className="flex items-center justify-between pt-1 font-semibold">
          <span>Total</span>
          <span>৳ {slotPrice.toLocaleString()}</span>
        </div>
      </div>

      {/* <div className="rounded-xl bg-primary/10 p-3.5">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-foreground">Pay now</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{advancePercentage}% advance to reserve</p>
          </div>
          <p className="text-lg font-bold text-primary">৳ {advanceAmount.toLocaleString()}</p>
        </div>
        <p className="mt-2 border-t border-primary/15 pt-2 text-xs text-muted-foreground">
          ৳ {balance.toLocaleString()} remaining at venue
        </p>
      </div> */}
    </div>
  );
}