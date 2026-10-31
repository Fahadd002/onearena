// Represents the local calendar day as a UTC date for date-only database fields.
export function startOfDay(date: Date): Date {
  const normalized = new Date(date);
  return new Date(
    Date.UTC(normalized.getFullYear(), normalized.getMonth(), normalized.getDate())
  );
}

export function toDateOnly(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}
