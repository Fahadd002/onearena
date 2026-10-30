import { Metadata } from "next";
import { Suspense } from "react";
import { Faq } from "@/components/landing/faq";
import { Hero } from "@/components/landing/hero";
import { HomePageSkeleton } from "@/components/landing/HomePageSkeleton";
import { HowItWorks } from "@/components/landing/how-it-works";
import { OwnerCta } from "@/components/landing/owner-cta";
import { Testimonials } from "@/components/landing/testimonials";
import { WhyChooseUs } from "@/components/landing/why-choose-us";
import { TurfExplorerProvider } from "@/components/turfs/TurfExplorerProvider";
import { TurfList } from "@/components/turfs/TurfList";
import { getTurfs } from "@/services/turfs.services";
import type { TurfListPayload } from "@/components/turfs/api";
import { startOfToday } from "@/components/turfs/dateRanges";
import { ymd } from "@/lib/slotsUtils";

export const metadata: Metadata = {
  title: "OneArena - Turf Booking Platform",
  description: "Find, book and play at verified turfs across Bangladesh. Real-time availability, transparent pricing, instant confirmations.",
  openGraph: {
    title: "OneArena -Turf Booking Platform",
    description: "Find, book and play at verified turfs across Bangladesh.",
    type: "website",
  },
};

export const dynamic = "force-dynamic";

async function HomePageContent() {
  const todayISO = ymd(startOfToday());
  let response = await getTurfs({ date: todayISO, page: 1, limit: 10 });
  let initialData =
    response.success && "data" in response ? (response.data as TurfListPayload | undefined) : undefined;

  return (
    <TurfExplorerProvider initialData={initialData} todayISO={todayISO}>
      <main className="flex flex-col">
        <Hero />
        
        <div className="relative pb-12 pt-2">
          <TurfList />
        </div>

        <HowItWorks />
        <WhyChooseUs />
        <Testimonials />
        <OwnerCta />
        <Faq />
      </main>
    </TurfExplorerProvider>
  );
}

export default function HomePage() {
  return (
    <div className="bg-background min-h-screen overflow-x-clip">
      <Suspense fallback={<HomePageSkeleton />}>
        <HomePageContent />
      </Suspense>
    </div>
  );
}