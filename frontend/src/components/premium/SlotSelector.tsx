import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "./Badge";
import type { TurfSlot, TurfPriceRule } from "@/types/turf.type";

function formatTime(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const period = h >= 12 ? "PM" : "AM";
    const displayH = h % 12 || 12;
    return `${displayH}:${m.toString().padStart(2, "0")} ${period}`;
}

function getTimeOfDayLabel(minute: number): string {
    if (minute < 12 * 60) return "Morning";
    if (minute < 17 * 60) return "Afternoon";
    if (minute < 20 * 60) return "Evening";
    return "Night";
}

function getSlotPrice(
    slot: TurfSlot,
    priceRules: TurfPriceRule[] = [],
    dayOfWeek: number,
    basePrice: number
): number {
    if (typeof slot.price === "number") return slot.price;
    const rule = priceRules.find(
        (r) =>
            r.active &&
            r.dayOfWeek === dayOfWeek &&
            r.startMinute <= slot.startMinute &&
            r.endMinute >= slot.endMinute
    );
    return Number(rule?.price ?? basePrice);
}

interface SlotSelectorProps {
    slots: TurfSlot[];
    priceRules?: TurfPriceRule[];
    basePrice: number;
    date: string;
    slotMinutes?: number;
    selectedSlot: TurfSlot | null;
    onSelect: (slot: TurfSlot) => void;
    disabled?: boolean;
    dayOfWeek?: number;
    className?: string;
}

const TIME_SLOTS = {
    Morning: { label: "Morning", start: 0, end: 12 * 60 },
    Afternoon: { label: "Afternoon", start: 12 * 60, end: 17 * 60 },
    Evening: { label: "Evening", start: 17 * 60, end: 20 * 60 },
    Night: { label: "Night", start: 20 * 60, end: 24 * 60 },
} as const;

export function SlotSelector({
    slots,
    priceRules = [],
    basePrice,
    date,
    slotMinutes = 60,
    selectedSlot,
    onSelect,
    disabled = false,
    dayOfWeek = 0,
    className,
}: SlotSelectorProps) {
    const grouped = useMemo(() => {
        const groups: Record<string, TurfSlot[]> = {};
        for (const slot of slots) {
            const label = getTimeOfDayLabel(slot.startMinute);
            if (!groups[label]) groups[label] = [];
            groups[label].push(slot);
        }
        return groups;
    }, [slots]);

    const handleSelect = (slot: TurfSlot) => {
        if (disabled || !slot.available) return;
        onSelect(slot);
    };

    const isSelected = (slot: TurfSlot) =>
        selectedSlot?.startMinute === slot.startMinute &&
        selectedSlot?.endMinute === slot.endMinute;

    const isPeak = (slot: TurfSlot) => {
        const price = getSlotPrice(slot, priceRules, dayOfWeek, basePrice);
        return price > Number(basePrice);
    };

    const renderSlot = (slot: TurfSlot) => {
        const selected = isSelected(slot);
        const peak = isPeak(slot);
        const price = getSlotPrice(slot, priceRules, dayOfWeek, basePrice);
        const isAvailable = slot.status === "AVAILABLE";
        const isBooked = slot.status === "BOOKED";
        const isPrebooked = slot.status === "PREBOOKED" || slot.status === "RESERVED";

        let stateClass = "";
        let borderColor = "border-border";
        let hoverClass = "";

        if ((isAvailable || isPrebooked) && selected) {
            stateClass = "slot-selected text-slot-selected-foreground";
            borderColor = "border-primary";
        } else if (isAvailable && !selected) {
            stateClass = "slot-available text-foreground";
            hoverClass = "hover:slot-available-hover hover:border-primary/60";
            if (peak) {
                stateClass = "slot-available bg-violet-500/10 text-foreground";
                borderColor = "border-violet-500/70";
            }
        } else if (isPrebooked) {
            stateClass = "slot-prebooked text-slot-prebooked-foreground";
            borderColor = "border-border";
        } else if (isBooked) {
            stateClass = "slot-booked text-slot-booked-foreground";
            borderColor = "border-border";
        } else {
            stateClass = "slot-disabled";
            borderColor = "border-border";
        }

        return (
            <button
                key={`${slot.startMinute}-${slot.endMinute}`}
                type="button"
                onClick={() => handleSelect(slot)}
                disabled={disabled || !isAvailable}
                className={cn(
                    "flex flex-col items-center justify-center gap-1 rounded-lg border px-3 py-2.5 text-center transition-all duration-200",
                    (isBooked || isPrebooked) && "cursor-not-allowed opacity-70",
                    !(isAvailable || isPrebooked) && !selected && "cursor-not-allowed opacity-50",
                    stateClass,
                    borderColor,
                    hoverClass,
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:ring-primary",
                    disabled && "cursor-wait opacity-60"
                )}
                title={isBooked ? "Already booked" : isPrebooked ? "Pre-booked" : ""}
            >
                <span className="text-xs font-semibold">
                    {formatTime(slot.startMinute)} – {formatTime(slot.endMinute)}
                </span>
                <span className="text-sm font-medium">
                    ৳ {Number(price).toLocaleString()}
                </span>
                {isBooked && (
                    <Badge variant="secondary" size="sm">Booked</Badge>
                )}
                {isPrebooked && (
                    <Badge variant="secondary" size="sm">Held</Badge>
                )}
                {peak && isAvailable && !selected && (
                    <Badge variant="secondary" size="sm">Peak</Badge>
                )}
                {selected && (
                    <svg
                        className="h-4 w-4 text-slot-selected-foreground"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                    >
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                )}
            </button>
        );
    };

    return (
        <div className="space-y-5">
            {Object.entries(grouped).map(([timeOfDay, daySlots]) => (
                <div key={timeOfDay} className="space-y-2.5">
                    <div className="sticky top-0 z-10 -mx-2 mb-2 bg-background/80 px-2 py-1.5 backdrop-blur-sm">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            {TIME_SLOTS[timeOfDay as keyof typeof TIME_SLOTS]?.label ?? timeOfDay}
                        </h4>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {daySlots.map(renderSlot)}
                    </div>
                </div>
            ))}
            {slots.filter((s) => s.available).length === 0 && (
                <div className="py-8 text-center">
                    <CalendarIcon className="mx-auto h-10 w-10 text-muted-foreground/50" />
                    <p className="mt-3 text-sm text-muted-foreground">No slots available for this date.</p>
                    <p className="text-xs text-muted-foreground/70">Try another date or contact the turf manager.</p>
                </div>
            )}
        </div>
    );
}

function CalendarIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
        >
            <rect x="3" y="7" width="18" height="14" rx="2" />
            <path d="M7 3h1a1 1 0 011 1v1h4V4a1 1 0 112 0v1h1a1 1 0 011 1v1H5V5a1 1 0 011-1z" />
        </svg>
    );
}
