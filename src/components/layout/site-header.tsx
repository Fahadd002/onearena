"use client";

import Link from "next/link";
import { Menu, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const navItems = [
  { label: "Find turfs", to: "/" },
  { label: "How it works", to: "/" },
  { label: "For owners", to: "/" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-lg bg-gradient-to-br from-primary to-primary-glow text-primary-foreground">
            <ShieldCheck className="size-5" />
          </span>
          <span className="font-display text-2xl tracking-wide">OneArena</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.to}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Button variant="ghost" size="sm">
            Sign in
          </Button>
          <Button variant="hero" size="sm">
            Book a turf
          </Button>
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="glass" size="icon" aria-label="Open menu">
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 border-border bg-surface">
            <div className="mt-10 flex flex-col gap-5">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.to}
                  onClick={() => setOpen(false)}
                  className="text-lg text-foreground"
                >
                  {item.label}
                </Link>
              ))}
              <Button variant="hero" size="lg">
                Book a turf
              </Button>
              <Button variant="outline" size="lg">
                Sign in
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
