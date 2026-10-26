export type BookingSlotLike = {
  id: string;
  slotDate: string;
  startMinute: number;
  endMinute: number;
  price?: string | number;
  isPeakTime?: boolean;
  slotStatus?: string;
  turf?: { id: string; name: string } | null;
};

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Formats a booking/slot date. `slotDate` is a date-only column, so it is
 * parsed as UTC midnight and rendered in UTC to avoid shifting a day in
 * timezones behind UTC.
 */
export function formatBookingDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  const isDateOnly = DATE_ONLY.test(dateStr);
  const d = new Date(isDateOnly ? `${dateStr}T00:00:00.000Z` : dateStr);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(isDateOnly ? { timeZone: "UTC" as const } : {}),
  });
}

export function bookingSlots<T extends BookingSlotLike>(
  booking: { slots?: T[] | null; slot?: T | null }
): T[] {
  if (booking.slots?.length) return booking.slots;
  return booking.slot ? [booking.slot] : [];
}

/** Group slots by their playing date so multi-day bookings stay readable. */
export function groupSlotsByDate<T extends BookingSlotLike>(slots: T[]): [string, T[]][] {
  const map = new Map<string, T[]>();
  for (const slot of slots) {
    const key = String(slot.slotDate ?? "").slice(0, 10);
    const list = map.get(key);
    if (list) list.push(slot);
    else map.set(key, [slot]);
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

/** Distinct turf names covered by a booking. */
export function bookingTurfNames<T extends BookingSlotLike>(slots: T[]): string[] {
  return [...new Set(slots.map((s) => s.turf?.name).filter((n): n is string => Boolean(n)))];
}

/** Compact date summary: single day, a range across days, or nothing. */
export function formatBookingDateRange<T extends BookingSlotLike>(slots: T[]): string {
  const dates = [...new Set(slots.map((s) => String(s.slotDate ?? "").slice(0, 10)))].filter(
    Boolean
  );
  if (!dates.length) return "—";
  if (dates.length === 1) return formatBookingDate(dates[0]);
  return `${formatBookingDate(dates[0])} – ${formatBookingDate(dates[dates.length - 1])}`;
}

export const SLOT_STATUS_STYLES: Record<string, string> = {
  AVAILABLE: "bg-success/15 text-success",
  WAITLIST: "bg-warning/15 text-warning",
  BOOKED: "bg-primary/15 text-primary",
};

export const SLOT_STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "Available",
  WAITLIST: "Waitlist",
  BOOKED: "Booked",
};

export function slotStatusStyle(status?: string): string {
  return SLOT_STATUS_STYLES[String(status ?? "AVAILABLE")] ?? SLOT_STATUS_STYLES.AVAILABLE;
}

export function slotStatusLabel(status?: string): string {
  const key = String(status ?? "AVAILABLE");
  return SLOT_STATUS_LABELS[key] ?? key;
}
