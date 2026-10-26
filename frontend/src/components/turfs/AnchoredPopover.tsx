"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Every open panel registers here. Popovers can nest (the category list lives
 * inside the filters panel), and nested popovers are separate portal nodes, so a
 * click in one is not a DOM descendant of the other. Checking this set keeps an
 * outer popover from closing when an inner one is clicked.
 */
const openPanels = new Set<HTMLElement>();

interface Props {
  open: boolean;
  onClose: () => void;
  /** The trigger this popover anchors to. */
  anchorRef: React.RefObject<HTMLElement | null>;
  children: ReactNode;
  /** Preferred width in px. */
  width?: number;
  /** Max height in px (the list scrolls beyond this). */
  maxHeight?: number;
  className?: string;
  align?: "left" | "right";
}

/**
 * Popover rendered in a portal on `document.body`.
 *
 * The filter deck is `sticky` with `backdrop-blur`, which creates a stacking
 * context — a dropdown rendered inside it can never paint above sibling page
 * content. Portalling to the body escapes that context entirely.
 */
export function AnchoredPopover({
  open,
  onClose,
  anchorRef,
  children,
  width = 290,
  maxHeight,
  className = "",
  align = "right",
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<{ top: number; left: number } | null>(null);

  // Position before paint so the panel never flashes at the wrong spot.
  useLayoutEffect(() => {
    if (!open) {
      setStyle(null);
      return;
    }
    const place = () => {
      const el = anchorRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const w = Math.min(width, window.innerWidth - 16);
      const left =
        align === "right"
          ? Math.max(8, Math.min(r.right - w, window.innerWidth - w - 8))
          : Math.max(8, Math.min(r.left, window.innerWidth - w - 8));
      // Below the trigger, clamped to the viewport.
      const top = Math.min(r.bottom + 8, Math.max(8, window.innerHeight - (maxHeight ?? 320) - 8));
      setStyle({ top, left });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, anchorRef, width, maxHeight, align]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (anchorRef.current?.contains(t)) return;
      // Check this panel directly (the ref is only set after it is portaled).
      if (panelRef.current?.contains(t)) return;
      // Then any other open panel, so nested popovers do not close this one.
      for (const el of openPanels) {
        if (el.contains(t)) return;
      }
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, anchorRef]);

  // Register/unregister this panel so outer popovers can detect nested clicks.
  // Depends on `style` too: the panel is only mounted after it is positioned.
  useEffect(() => {
    const el = panelRef.current;
    if (!open || !el) return;
    openPanels.add(el);
    return () => {
      openPanels.delete(el);
    };
  }, [open, style]);

  if (!open || !style || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={panelRef}
      data-popover-panel
      style={{ top: style.top, left: style.left, width, maxHeight }}
      className={`fixed z-[100] overflow-hidden rounded-2xl border border-border bg-card text-foreground animate-in fade-in slide-in-from-top-1 ${className}`}
    >
      {children}
    </div>,
    document.body,
  );
}
