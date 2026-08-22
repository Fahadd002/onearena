import { Faq } from "@/components/landing/faq";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { OwnerCta } from "@/components/landing/owner-cta";
import { Testimonials } from "@/components/landing/testimonials";
import { TurfShowcase } from "@/components/landing/turf-showcase";
import { WhyChooseUs } from "@/components/landing/why-choose-us";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export default function HomePage() {
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
