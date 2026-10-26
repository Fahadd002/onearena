import { MONTH } from "@/lib/slotsUtils";

export type DateRange = { start: Date; end: Date };

export type DateOption = {
  key: string;
  label: string;
  start: Date;
  end: Date;
  /** Inclusive number of days the option covers. */
  count: number;
  /** Day to select when the tab is picked. Defaults to `start`. */
  focus?: Date;
};

/** How far the "All" tab reaches from today. */
export const ALL_DAYS = 90;

/** Only Friday counts as the weekend here. */
export const WEEKEND_DAY = 5;

export const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Parses a "YYYY-MM-DD" string into a local-midnight Date.
 *
 * The server runs in UTC and the browser in its own timezone, so calling
 * `new Date(iso)` would land on a different day and break hydration. The server
 * component sends today's date as a plain string and both sides build the same
 * local date from it.
 */
export const startOfISODate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

export const addDays = (d: Date, n: number) => {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
};

const midnight = (d: Date) => {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

/** Inclusive day count between two local dates. */
export const dayCount = (start: Date, end: Date) =>
  Math.round((midnight(end).getTime() - midnight(start).getTime()) / 86400000) + 1;

/**
 * Every day of the range, inclusive.
 * Steps by calendar day rather than by milliseconds so a DST shift can neither
 * drop nor repeat a date.
 */
export const daysInRange = ({ start, end }: DateRange) => {
  const days: Date[] = [];
  const last = midnight(end).getTime();
  let cursor = midnight(start);

  while (cursor.getTime() <= last) {
    days.push(new Date(cursor));
    cursor = addDays(cursor, 1);
  }

  return days;
};

/** The Friday on or after `today`. */
export const nextFriday = (today: Date) => addDays(today, (WEEKEND_DAY - today.getDay() + 7) % 7);

/** Today plus the next 89 days. */
export const allOption = (today: Date): DateOption => ({
  key: "all",
  label: "All",
  start: today,
  end: addDays(today, ALL_DAYS - 1),
  count: ALL_DAYS,
});

export const todayOption = (today: Date): DateOption => ({
  key: "today",
  label: "Today",
  start: today,
  end: today,
  count: 1,
});

export const tomorrowOption = (today: Date): DateOption => {
  const tomorrow = addDays(today, 1);
  return { key: "tomorrow", label: "Tomorrow", start: tomorrow, end: tomorrow, count: 1 };
};

/**
 * Friday only. The span runs from today to the next Friday so the days leading
 * up to it stay selectable, and picking the tab lands on that Friday.
 */
export const weekendOption = (today: Date): DateOption => {
  const friday = nextFriday(today);
  return {
    key: "weekend",
    label: "Weekend",
    start: today,
    end: friday,
    count: dayCount(today, friday),
    focus: friday,
  };
};

/**
 * The months the 90-day window is cut by, clipped to the days that fall inside
 * that window. On 4 Oct the window is Oct 28 + Nov 30 + Dec 31 + Jan 1 = 90; on
 * 5 Oct it is Oct 27 + Nov 30 + Dec 31 + Jan 2 = 90.
 *
 * A segment never runs past the real end of its month, so the leftover days
 * spill into the next segment instead of inflating a short month. That is why
 * four segments are allowed: the 90-day window can reach into a fourth month.
 */
export const monthSegments = (today: Date, limit = 4): DateOption[] => {
  const windowEnd = addDays(today, ALL_DAYS - 1);
  const segments: DateOption[] = [];
  let cursor = today;

  while (cursor.getTime() <= windowEnd.getTime() && segments.length < limit) {
    const lastDayOfMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const end = lastDayOfMonth.getTime() > windowEnd.getTime() ? windowEnd : lastDayOfMonth;

    segments.push({
      key: `m-${cursor.getFullYear()}-${cursor.getMonth()}`,
      label: MONTH[cursor.getMonth()],
      start: new Date(cursor),
      end: new Date(end),
      count: dayCount(cursor, end),
    });

    cursor = addDays(end, 1);
  }

  return segments;
};

/** Quick chips first, then the All tab and the month segments. */
export const quickOptions = (today: Date): DateOption[] => [
  todayOption(today),
  tomorrowOption(today),
  weekendOption(today),
];

export const monthTabs = (today: Date): DateOption[] => [allOption(today), ...monthSegments(today)];

export const dateOptions = (today: Date): DateOption[] => [
  ...quickOptions(today),
  ...monthTabs(today),
];

export const resolveDateOption = (key: string, today: Date): DateOption =>
  dateOptions(today).find((option) => option.key === key) ?? allOption(today);

/** The day a tab should select when it is picked. */
export const focusOf = (option: DateOption) => option.focus ?? option.start;

/** The range a tab covers, as a plain range for the date strip. */
export const rangeOf = (option: DateOption): DateRange => ({
  start: option.start,
  end: option.end,
});
