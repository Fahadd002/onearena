"use client";

import { motion } from "motion/react";

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
      "You pay the platform-configured advance to confirm the booking. The remaining balance is paid at the venue. Both amounts are calculated by the platform and stored with your booking.",
  },
  {
    question: "Can two teams book the same slot?",
    answer:
      "No. Overlapping slots are checked inside a PostgreSQL transaction with a turf-and-date lock, so concurrent requests cannot claim the same playing time.",
  },
  {
    question: "What happens if I do not finish payment?",
    answer:
      "Your slot is held for the configured payment window while you pay. If checkout is abandoned, the reservation expires automatically and the slot returns to the calendar.",
  },
  {
    question: "How do cancellations and refunds work?",
    answer:
      "Cancel more than 24 hours before kick-off for a full advance refund, 12–24 hours before for 50%, and below 12 hours no refund applies. These tiers are configurable by the platform team.",
  },
  {
    question: "How do turf owners get paid?",
    answer:
      "Every booking stores its own financial snapshot: total, advance, commission rate, commission amount and your net earning. The active platform rule determines the commission for new bookings.",
  },
  {
    question: "Is my personal data secure?",
    answer:
      "Yes. We use industry-standard encryption, secure httpOnly cookies for authentication, and never share personal data with third parties without consent. All payments are processed through certified payment gateways.",
  },
];

export function Faq() {
  return (
    <section className="relative py-16 sm:py-24 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/3 to-transparent" />
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto w-full max-w-4xl px-4 sm:px-6 relative z-10"
      >
        <div className="max-w-3xl mx-auto text-center mb-16">
          <p className="text-xs uppercase tracking-[0.2em] text-primary mb-2">Frequently asked questions</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
            Questions, <span className="text-gradient-pitch">answered</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Everything you need to know about booking, payments and more
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="relative"
        >
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <motion.div
                key={faq.question}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.4, delay: 0.3 + index * 0.08, ease: [0.22, 1, 0.36, 1] }}
              >
                <AccordionItem value={faq.question} className="border-border bg-card/80 backdrop-blur-sm rounded-xl overflow-hidden transition-all duration-500 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10">
                  <AccordionTrigger className="px-6 py-5 text-left text-base font-medium transition-colors hover:bg-primary/5 focus:bg-primary/5 data-[state=open]:bg-primary/5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <span>{faq.question}</span>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-6 text-sm text-muted-foreground leading-relaxed">
                    <p className="animate-in fade-in slide-in-from-top-2 duration-300">{faq.answer}</p>
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: 0.3 + faqs.length * 0.08 }}
            className="mt-12 text-center"
          >
            <p className="text-muted-foreground mb-4">Still have questions?</p>
            <a href="/contact" className="inline-flex items-center gap-2 text-primary font-semibold hover:underline transition-colors">
              Contact our support team
              <motion.span
                whileHover={{ x: 4, transition: { duration: 0.2 } }}
              >
                →
              </motion.span>
            </a>
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
}