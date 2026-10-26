import { ymd } from "@/lib/slotsUtils";

export interface PendingSlot {
  id: string;
  startMinute: number;
  endMinute: number;
  price: number;
  turfId: string;
  turfName: string;
  /** "YYYY-MM-DD" the slot belongs to. */
  date: string;
}

interface PendingCart {
  slots: PendingSlot[];
  /** Date the page should reopen on. */
  date: string;
  /** Whether the checkout drawer was open when the user left. */
  checkout: boolean;
}

/* Session-scoped, not persisted: the cart only has to survive the trip through
   /login. `sessionStorage` is per-tab and is dropped when the tab closes, so a
   stale selection can never come back days later. */
const STORAGE_KEY = "onearena:pending-cart";

/** Never read on the server — the value only exists in the browser. */
const store = () => (typeof window === "undefined" ? null : window.sessionStorage);

export const readPendingCart = (): PendingCart | null => {
  try {
    const raw = store()?.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as PendingCart;
    if (!Array.isArray(parsed?.slots) || parsed.slots.length === 0) return null;

    /* Slots for a day that has passed are no longer bookable. */
    const today = ymd(new Date());
    const slots = parsed.slots.filter((s) => s?.id && s.date >= today);
    if (slots.length === 0) return null;

    return { slots, date: parsed.date || today, checkout: !!parsed.checkout };
  } catch {
    return null;
  }
};

/** Keeps the selection in sync with state; an empty cart clears the entry. */
export const savePendingCart = (slots: PendingSlot[], date: string, checkout: boolean) => {
  try {
    const storage = store();
    if (!storage) return;
    if (slots.length === 0) {
      storage.removeItem(STORAGE_KEY);
      return;
    }
    storage.setItem(STORAGE_KEY, JSON.stringify({ slots, date, checkout }));
  } catch {
    /* Private mode / quota errors must never break booking. */
  }
};

export const clearPendingCart = () => {
  try {
    store()?.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
};
