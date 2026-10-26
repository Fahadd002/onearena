"use client";

import { Calendar, Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatTimeWithPeriod } from "@/lib/time-utils";
import { cn } from "@/lib/utils";
import {
  formatBookingDate,
  groupSlotsByDate,
  slotStatusLabel,
  slotStatusStyle,
  type BookingSlotLike,
} from "@/lib/booking-utils";

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
          className="group inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-border bg-muted/40  pl-2.5 pr-1.5 transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="text-xs font-semibold text-foreground">
            {total} {total === 1 ? "Slot" : "Slots"}
          </span>
          <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
            <Info className="size-3" />
          </span>
        </button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
          <p className="text-sm font-semibold text-foreground">Booking Slot Details</p>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
            {total} {total === 1 ? "slot" : "slots"}
          </span>
        </div>

        <div className="max-h-80 space-y-3 overflow-y-auto p-3">
          {byDate.map(([date, group]) => (
            <div key={date} className="overflow-hidden rounded-lg border border-border">
              <div className="flex items-center gap-2 border-b border-border bg-primary/5 px-2.5 py-1.5">
                <Calendar className="size-3.5 shrink-0 text-primary" />
                <span className="text-xs font-bold text-foreground">{formatBookingDate(date)}</span>
                <span className="ml-auto text-[11px] font-medium text-muted-foreground">
                  {group.length} {group.length === 1 ? "slot" : "slots"}
                </span>
              </div>

              <div className="divide-y divide-border">
                {group.map((slot) => (
                  <div key={slot.id} className="flex items-center gap-3 px-2.5 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-foreground">
                        {formatTimeWithPeriod(slot.startMinute)} –{" "}
                        {formatTimeWithPeriod(slot.endMinute)}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {slot.turf?.name ?? "—"}
                        {slot.isPeakTime && (
                          <span className="ml-1.5 font-bold uppercase text-warning">Peak</span>
                        )}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-bold text-foreground">
                      ৳{Number(slot.price ?? 0).toLocaleString()}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                        slotStatusStyle(slot.slotStatus)
                      )}
                    >
                      {slotStatusLabel(slot.slotStatus)}
                    </span>
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
