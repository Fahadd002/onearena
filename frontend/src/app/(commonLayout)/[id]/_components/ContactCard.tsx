"use client";

import { Mail, MapPin, Phone, Send } from "lucide-react";

import type { OwnerLandingPage } from "@/types/owner-landing.type";

export default function ContactCard({
 
  contact,
}: {
  companyName: string;
  contact: OwnerLandingPage["contact"];
}) {
  if (!contact) return null;



  const hasAny =
    contact.phone || contact.email || contact.address ;
  if (!hasAny) return null;

  return (
    <div className="absolute right-4 -top-24 z-20 hidden w-72 rounded-2xl border-l-4 border-l-primary border-y border-border/60 bg-card p-5 shadow-xl lg:right-6 lg:block lg:w-80">
      <h3 className="mb-3 text-base font-extrabold text-foreground">
        {contact.heading || "Contact & Inquiry"}
      </h3>

      <div className="space-y-3 text-sm">
        {contact.phone && (
          <div className="flex items-center gap-2.5">
            <Phone className="size-4 shrink-0 text-primary" />
            <span className="font-semibold text-foreground/80">
              {contact.phone}
            </span>
          </div>
        )}

        {contact.email && (
          <div className="flex items-center gap-2.5">
            <Mail className="size-4 shrink-0 text-primary" />
            <span className="truncate font-semibold text-foreground/80">
              {contact.email}
            </span>
          </div>
        )}


        {contact.address && (
          <div className="flex items-start gap-2.5">
            <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
            <span className="font-semibold text-foreground/80">
              {contact.address}
            </span>
          </div>
        )}
      </div>

      {contact.email && (
        <a
          href={`mailto:${contact.email}`}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:opacity-90"
        >
          <Send className="size-4" />
          Send Inquiry
        </a>
      )}
    </div>
  );
}