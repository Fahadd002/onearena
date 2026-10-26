"use client";

import {
  Building2,
  HelpCircle,
  Image,
  Info,
  Newspaper,
  Phone,
  Share2,
  Star,
} from "lucide-react";

import { cn } from "@/lib/utils";

export type LandingTab = "about" | "venues" | "reviews" | "gallery" | "stories" | "faq" | "social" | "contact";

const TAB_META: Record<LandingTab, { label: string; icon: typeof Info }> = {
  about: { label: "About", icon: Info },
  venues: { label: "Venues", icon: Building2 },
  reviews: { label: "Reviews", icon: Star },
  gallery: { label: "Gallery", icon: Image },
  stories: { label: "Stories", icon: Newspaper },
  faq: { label: "FAQ", icon: HelpCircle },
  social: { label: "Social", icon: Share2 },
  contact: { label: "Contact", icon: Phone },
};

export default function TabNav({
  tabs,
  active,
  onChange,
}: {
  tabs: LandingTab[];
  active: LandingTab;
  onChange: (tab: LandingTab) => void;
}) {
  return (
    <nav className="sticky top-16 z-40 -mx-4 mt-6 border-b border-border bg-card/95 backdrop-blur sm:-mx-6">
      <div className="flex gap-1 overflow-x-auto px-4 py-2 [scrollbar-width:none] sm:px-6 [&::-webkit-scrollbar]:hidden">
        {tabs.map((key) => {
          const { label, icon: Icon } = TAB_META[key];
          const isActive = key === active;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}