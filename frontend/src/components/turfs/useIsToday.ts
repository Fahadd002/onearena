"use client";

import { useEffect, useState } from "react";

import { ymd } from "@/lib/slotsUtils";

/**
 * `true` only after the component has mounted on the client.
 *
 * Use this to gate anything derived from the current date/time that is rendered
 * during SSR: the server and the browser can be in different timezones or on
 * different days, and a mismatch there is a hydration error.
 */
export function useIsMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

/**
 * Whether the given local date is "today" in the browser's timezone.
 * Returns `false` during SSR and the first client render so the markup matches.
 */
export function useIsToday(date: Date) {
  const mounted = useIsMounted();
  return mounted && ymd(date) === ymd(new Date());
}
