import { Metadata } from "next";
import TurfDetailsPageClient from "@/components/turfs/TurfDetailsPageClient";
import { getTurfById } from "@/services/turfs.services";
import { ymd } from "@/lib/slotsUtils";
import { startOfToday } from "@/components/turfs/dateRanges";
import type { Turf } from "@/types/turf.type";

export const metadata: Metadata = {
  title: "Book Slot",
  description: "View turf details, check availability, and book your slot",
};

/* Availability is date-dependent, so this must render per request — a
   build-time prerender would bake in today's slots and never refresh them. */
export const dynamic = "force-dynamic";

/** Server-renders the turf; the client still fetches slots per date. */
export default async function TurfDetailsPage({ params }: { params: Promise<{ turfId: string }> }) {
  const { turfId } = await params;
  const res = await getTurfById(turfId);
  const initialTurf: Turf | null = res.success && "data" in res ? (res.data as Turf) : null;

  /* Sent as a string so the client builds the same local date the server used
     (the server runs in UTC, the browser in its own timezone). */
  const todayISO = ymd(startOfToday());

  return <TurfDetailsPageClient initialTurf={initialTurf} todayISO={todayISO} />;
}
