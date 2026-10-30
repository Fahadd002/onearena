"use client";

import { Calendar, Info } from "lucide-react";
import { motion } from "framer-motion";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/premium/Badge";
import { formatTimeWithPeriod } from "@/lib/time-utils";
import { cn } from "@/lib/utils";
import {
  formatBookingDate,
  groupSlotsByDate,
  slotStatusLabel,
  slotStatusStyle,
  type BookingSlotLike,
} from "@/lib/booking-utils";

function IconRipple() {
  return (
    <motion.span
      className="absolute inset-0 block rounded-full bg-amber-400 pointer-events-none"
      initial={{ scale: 1, opacity: 0.45 }}
      animate={{ scale: 2, opacity: 0 }}
      transition={{
        duration: 1.6,
        repeat: Infinity,
        repeatDelay: 0.4,
        ease: "easeOut",
      }}
    />
  );
}

/**
 * Compact slot-count chip with an info icon that reveals the full per-slot
 * breakdown (playing date, time, turf, price, status) on hover or click.
 */
export function SlotCountCell<T extends BookingSlotLike>({ slots }: { slots: T[] }) {
  const byDate = groupSlotsByDate(slots);
  const total = slots.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="group inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-muted/40 px-2 py-0.5 transition-all hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="text-xs font-medium text-foreground">
            {total} {total === 1 ? "Slot" : "Slots"}
          </span>
          <span className="relative flex size-4 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 transition-all group-hover:bg-amber-500 group-hover:text-white overflow-hidden">
            <IconRipple />
            <Info className="relative size-2.5" />
          </span>
        </button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-72 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <p className="text-sm font-semibold text-foreground">Booking Slot Details</p>
          <Badge variant="outline" size="sm">
            {total} {total === 1 ? "slot" : "slots"}
          </Badge>
        </div>

        <div className="max-h-80 space-y-2 overflow-y-auto p-2.5">
          {byDate.map(([date, group]) => (
            <div key={date} className="overflow-hidden rounded-lg border border-border">
              <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-2.5 py-1">
                <Calendar className="size-3.5 shrink-0 text-amber-500" />
                <span className="text-xs font-medium text-foreground">{formatBookingDate(date)}</span>
                <span className="ml-auto text-[10px] text-muted-foreground">
                  {group.length} {group.length === 1 ? "slot" : "slots"}
                </span>
              </div>

              <div className="divide-y divide-border">
                {group.map((slot) => (
                  <div key={slot.id} className="flex items-center justify-between px-2.5 py-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-foreground">
                        {formatTimeWithPeriod(slot.startMinute)} –{" "}
                        {formatTimeWithPeriod(slot.endMinute)}
                      </span>
                      {slot.isPeakTime && (
                        <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-medium uppercase text-amber-600">Peak</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs tabular-nums">
                        ৳{Number(slot.price ?? 0).toLocaleString()}
                      </span>
                      <Badge
                        variant={slot.slotStatus === "BOOKED" ? "success" : slot.slotStatus === "HOLD" ? "warning" : slot.slotStatus === "CANCELLED" ? "destructive" : "outline"}
                        size="sm"
                      >
                        {slotStatusLabel(slot.slotStatus)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
