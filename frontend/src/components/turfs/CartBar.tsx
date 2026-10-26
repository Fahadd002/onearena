"use client";

import { ArrowRight, ShoppingBag } from "lucide-react";

interface Props {
  count: number;
  onCheckout?: () => void;
}

export function CartBar({ count, onCheckout }: Props) {
  if (!count) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-foreground/95 p-2 pl-3 backdrop-blur-xl">
        <div className="flex items-center gap-2.5">
          <div className="relative flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <ShoppingBag className="size-4" />
            <span className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full border-2 border-foreground bg-primary text-[10px] font-black text-primary-foreground">
              {count}
            </span>
          </div>
          <div className="leading-tight">
            <p className="text-xs font-bold text-background">
              {count === 1 ? "1 slot" : `${count} slots`} selected
            </p>
            <p className="text-[10px] text-background/60">Tap to review & checkout</p>
          </div>
        </div>

        <button
          onClick={onCheckout}
          className="group flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-extrabold text-primary-foreground transition hover:brightness-110"
        >
          <span>Checkout</span>
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
}
