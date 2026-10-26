export function getMinuteOfDayInTimezone(date: Date, timeZone?: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timeZone || 'UTC',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const hours = Number(parts.find((p) => p.type === 'hour')!.value);
  const minutes = Number(parts.find((p) => p.type === 'minute')!.value);
  return hours * 60 + minutes;
}

export function isDateToday(dateStr: string, date: Date, timeZone?: string): boolean {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timeZone || 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const year = parts.find((p) => p.type === 'year')!.value;
  const month = parts.find((p) => p.type === 'month')!.value;
  const day = parts.find((p) => p.type === 'day')!.value;
  return `${year}-${month}-${day}` === dateStr;
}

/**
 * Returns a Date set to 00:00:00 of the calendar day `date` is considered to be
 * in when viewed through `timeZone`. The returned Date is expressed in UTC
 * (i.e. its UTC fields match that midnight in the target timezone), so it lines
 * up with Prisma's `@db.Date` columns regardless of the server's local TZ.
 */
export function startOfDayInTimezone(date: Date, timeZone: string): Date {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const year = Number(parts.find((p) => p.type === 'year')!.value);
  const month = Number(parts.find((p) => p.type === 'month')!.value);
  const day = Number(parts.find((p) => p.type === 'day')!.value);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}
