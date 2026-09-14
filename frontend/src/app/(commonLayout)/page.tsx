import { Faq } from "@/components/landing/faq";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { OwnerCta } from "@/components/landing/owner-cta";
import { Testimonials } from "@/components/landing/testimonials";
import { TurfShowcase } from "@/components/landing/turf-showcase";
import { WhyChooseUs } from "@/components/landing/why-choose-us";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="flex flex-col">
        <Hero />
        <TurfShowcase />
        <HowItWorks />
        <WhyChooseUs />
        <Testimonials />
        <OwnerCta />
        <Faq />
      </main>
    </div>
  );
}
