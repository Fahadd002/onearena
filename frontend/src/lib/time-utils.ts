export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

export function formatTime(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

export function formatTimeWithPeriod(minutes: number): string {
    const normalized = ((minutes % 1440) + 1440) % 1440;
    const h = Math.floor(normalized / 60);
    const m = normalized % 60;
    const period = h >= 12 ? "PM" : "AM";
    const displayH = h % 12 || 12;
    return `${displayH}:${m.toString().padStart(2, "0")} ${period}`;
}

export function minutesToTime(minutes: number): string {
    const normalized = ((minutes % 1440) + 1440) % 1440;
    const h = Math.floor(normalized / 60);
    const m = normalized % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

export function timeToMinutes(time: string): number {
    const [h, m] = time.split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}(?:T00:00:00(?:\.000)?Z)?$/;

export function formatDate(
    value: string | Date | null | undefined,
    options: Intl.DateTimeFormatOptions = {
        month: "short",
        day: "numeric",
        year: "numeric",
    },
    timeZone?: string,
    locale = "en-US",
): string {
    if (!value) return "—";

    const dateString = typeof value === "string" ? value : null;
    const isDateOnly = dateString !== null && DATE_ONLY.test(dateString);
    const date = new Date(
        isDateOnly ? `${dateString.slice(0, 10)}T00:00:00.000Z` : value,
    );

    if (Number.isNaN(date.getTime())) return "—";

    return new Intl.DateTimeFormat(locale, {
        ...options,
        ...((timeZone || isDateOnly) ? { timeZone: timeZone ?? "UTC" } : {}),
    }).format(date);
}

export function formatDateTimeInTimezone(
    value: string | Date,
    timeZone = "Asia/Dhaka",
    options: Intl.DateTimeFormatOptions = {
        dateStyle: "medium",
        timeStyle: "short",
    },
): string {
    return formatDate(value, options, timeZone);
}

export function formatTurfLocalDateTime(value: string | Date): string {
    return formatDate(value, {
        dateStyle: "medium",
        timeStyle: "short",
    }, "UTC");
}

export function getDayOfWeekIndex(dateStr: string, timezone?: string): number {
    const dateObj = new Date(`${dateStr}T12:00:00.000Z`);
    if (timezone) {
        const weekday = formatDate(dateObj, { weekday: "short" }, timezone);
        const idx = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekday);
        return idx >= 0 ? idx : 0;
    }
    return dateObj.getDay();
}
