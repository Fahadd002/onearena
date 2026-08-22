"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "How much do I pay when booking?",
    answer:
      "You pay an advance — 30% of the slot price by default — to confirm the booking. The remaining balance is paid at the venue. Both amounts are shown before checkout and stored with your booking.",
  },
  {
    question: "Can two teams book the same slot?",
    answer:
      "No. Slots are reserved inside a database transaction with a unique constraint per turf, date and start time, so only one booking can ever succeed for a given hour.",
  },
  {
    question: "What happens if I do not finish payment?",
    answer:
      "Your slot is held for 10 minutes while you pay. If checkout is abandoned, the reservation expires automatically and the slot returns to the calendar.",
  },
  {
    question: "How do cancellations and refunds work?",
    answer:
      "Cancel more than 24 hours before kick-off for a full advance refund, 12–24 hours before for 50%, and below 12 hours no refund applies. These tiers are configurable by the platform team.",
  },
  {
    question: "How do turf owners get paid?",
    answer:
      "Every booking stores its own financial snapshot: total, advance, commission rate, commission amount and your net earning. OneArena keeps a 10% commission and settles the rest to your payout account.",
  },
];

export function Faq() {
  return (
    <section className="py-20">
      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6">
        <p className="text-center text-xs uppercase tracking-[0.2em] text-primary">FAQ</p>
        <h2 className="mt-3 text-center text-4xl uppercase sm:text-5xl">Questions, answered</h2>

        <Accordion type="single" collapsible className="mt-10">
          {faqs.map((faq) => (
            <AccordionItem key={faq.question} value={faq.question} className="border-border">
              <AccordionTrigger className="text-left text-base">{faq.question}</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
