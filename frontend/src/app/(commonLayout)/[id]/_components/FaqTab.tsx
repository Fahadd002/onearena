"use client";

import { ChevronDown, HelpCircle } from "lucide-react";

import type { OwnerLandingPage } from "@/types/owner-landing.type";

export default function FaqTab({ data }: { data: OwnerLandingPage }) {
  if (!data.faqs.length) {
    return (
      <div className="rounded-xl border border-border/60 bg-card p-8 text-center shadow-sm sm:p-10">
        <p className="text-sm text-muted-foreground">
          No FAQs have been added yet.
        </p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/60 bg-card p-5 shadow-sm sm:p-7">
      <div className="flex flex-col items-center text-center">
        <div className="flex items-center gap-2">
          <HelpCircle className="size-4 text-primary" />
          <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="mt-6 flex w-full flex-col items-center gap-3">
          {data.faqs.map((faq) => (
            <details
              key={faq.id}
              className="group w-full max-w-3xl overflow-hidden rounded-xl border-l-4 border-l-border/60 border-y border-border/60 bg-background/60 transition-all duration-300 hover:border-l-primary/70 hover:border-border open:border-l-primary open:border-primary/25 open:bg-muted/20"
            >
              <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 text-sm font-semibold text-foreground sm:px-5">
                <span className="flex-1 text-left">{faq.question}</span>
                <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <p className="border-t border-border/50 px-4 py-3.5 text-sm leading-relaxed text-muted-foreground sm:px-5">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}