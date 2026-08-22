import { createFileRoute } from "@tanstack/react-router";

import { Faq } from "@/components/landing/faq";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { OwnerCta } from "@/components/landing/owner-cta";
import { Testimonials } from "@/components/landing/testimonials";
import { TurfShowcase } from "@/components/landing/turf-showcase";
import { WhyChooseUs } from "@/components/landing/why-choose-us";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

const title = "OneArena — Book Football & Cricket Turfs in Bangladesh";
const description =
  "Search verified football and cricket turfs near you, see live slot availability and confirm your booking with a small advance payment in Taka.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <Hero />
        <TurfShowcase />
        <HowItWorks />
        <WhyChooseUs />
        <Testimonials />
        <OwnerCta />
        <Faq />
      </main>
      <SiteFooter />
    </div>
  );
}
