export const DAY   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
export const MONTH = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
export const DAY_FULL   = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
export const MONTH_FULL = ["January","February","March","April","May","June","July","August","September","October","November","December"];

/* Fixed locale + Latin digits on purpose: `toLocaleString()` with no locale
   formats numbers differently depending on where the code runs (Node vs the
   browser), which breaks hydration on server-rendered prices. */
const PRICE_FORMAT = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/** Amount → "1,500" (locale-independent, safe for SSR). */
export const formatPrice = (amount: unknown) => PRICE_FORMAT.format(Number(amount) || 0);

/** Local Date → "YYYY-MM-DD" */
export const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * Does a UTC slotDate fall on the same calendar day as the given local Date?
 * Compares the date portion in YYYY-MM-DD format (local timezone for both).
 */
export const isSameDay = (slotDateIso: string, d: Date) => {
  const slotDate = new Date(slotDateIso);
  // Convert slot UTC date to local date string for comparison
  const slotYmd = ymd(slotDate);
  const localYmd = ymd(d);
  return slotYmd === localYmd;
};

/** Current local minute-of-day (0–1439). */
export const currentMinuteOfDay = (now: Date = new Date()) =>
  now.getHours() * 60 + now.getMinutes();

/**
 * Has this slot already started on `date`?
 * Only today can have past slots — any other day returns false.
 * Used to hide slots the current time has already passed.
 */
export const isPastSlot = (
  date: Date,
  startMinute: number,
  now: Date = new Date()
) => ymd(date) === ymd(now) && startMinute < currentMinuteOfDay(now);

/** minutes → "7:30 AM" */
export const timeLabel = (min: number) => {
  const t = ((min % 1440) + 1440) % 1440;
  const h = Math.floor(t / 60);
  const m = t % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};

/** N consecutive days starting today */
export const dateStrip = (n = 60) => {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(t);
    d.setDate(t.getDate() + i);
    return d;
  });
};

export type Bucket = "all" | "morning" | "noon" | "afternoon" | "evening" | "night";

/**
 * `to` may exceed 1440 for a bucket that wraps past midnight — Night runs
 * 10:00 PM → 6:00 AM, i.e. `to: 1800` (30:00).
 */
export const BUCKETS: { key: Bucket; label: string; from: number; to: number }[] = [
  { key: "all",       label: "All day",   from: 0,    to: 1440 },
  { key: "morning",   label: "Morning",   from: 300,  to: 660  },
  { key: "noon",      label: "Noon",      from: 660,  to: 840  },
  { key: "afternoon", label: "Afternoon", from: 840,  to: 1020 },
  { key: "evening",   label: "Evening",   from: 1020, to: 1320 },
  { key: "night",     label: "Night",     from: 1320, to: 1800 },
];

export const inBucket = (min: number, b: Bucket) => {
  if (b === "all") return true;
  const x = BUCKETS.find((v) => v.key === b)!;
  /* Night wraps: 1320–1440 and 0–360. */
  if (x.to > 1440) return min >= x.from || min < x.to - 1440;
  return min >= x.from && min < x.to;
};

/** minutes → "6 AM" (no minutes, for the bucket chips) */
const hourLabel = (min: number) => {
  const t = ((min % 1440) + 1440) % 1440;
  const h = Math.floor(t / 60);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12} ${h >= 12 ? "PM" : "AM"}`;
};

/** Short range text shown under each bucket label, e.g. Night → "10 PM – 6 AM". */
export const bucketRangeLabel = (b: Bucket) => {
  if (b === "all") return "24 hours";
  const x = BUCKETS.find((v) => v.key === b)!;
  return `${hourLabel(x.from)} – ${hourLabel(x.to)}`;
};

export const slotRange = (startMin: number, endMin: number) =>
  `${timeLabel(startMin)} – ${timeLabel(endMin)}`;

/* ═══════════ Slot status contract ═══════════
   Mirrors the backend `SlotSatus` enum. The turf list payload sends
   `slotStatus`; `GET /turfs/:turfId/slots` aliases it as `status`. Neither
   payload is guaranteed to send `available`, so the status string decides. */

type SlotStatusLike = {
  available?: boolean | null;
  slotStatus?: string | null;
  status?: string | null;
};

/** Normalised status key, or "" when the payload carries none. */
export const slotStatusKey = (s: SlotStatusLike): string =>
  String(s.slotStatus ?? s.status ?? "").toUpperCase();

/** Is this slot bookable? Only AVAILABLE is. */
export const isSlotBookable = (s: SlotStatusLike): boolean =>
  slotStatusKey(s) === "AVAILABLE";

/**
 * Time-of-day resolver — icon + label + semantic tone.
 * Boundaries match your BUCKETS:
 *   morning:   300–660   (5:00 AM – 11:00 AM)
 *   noon:      660–840   (11:00 AM – 2:00 PM)
 *   afternoon: 840–1020  (2:00 PM – 5:00 PM)
 *   evening:   1020–1320 (5:00 PM – 10:00 PM)
 *   night:     1320–1440 + 0–360 (10:00 PM – 6:00 AM)
 */
export type TimeTone = "morning" | "noon" | "afternoon" | "evening" | "night";

export const timeOfDay = (
  min: number
): { icon: string; label: string; tone: TimeTone } => {
  const m = ((min % 1440) + 1440) % 1440;
  if (m >= 300 && m < 660)  return { icon: "☀️", label: "Morning",   tone: "morning" };
  if (m >= 660 && m < 840)  return { icon: "🌤",  label: "Noon",      tone: "noon" };
  if (m >= 840 && m < 1020) return { icon: "⛅",  label: "Afternoon", tone: "afternoon" };
  if (m >= 1020 && m < 1320) return { icon: "🌆", label: "Evening",   tone: "evening" };
  return { icon: "🌙", label: "Night", tone: "night" };
};

/**
 * Weekend detection. Only Friday is the weekend here.
 */
export const isFriday = (d: Date) => d.getDay() === 5;
export const isWeekend = (d: Date) => isFriday(d);