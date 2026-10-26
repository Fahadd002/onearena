/** One picked slot. Shared by TurfRow, CheckoutDrawer and the explorer state. */
export interface CartSlot {
  id: string;
  startMinute: number;
  endMinute: number;
  price: number;
  turfId: string;
  turfName: string;
  /** "YYYY-MM-DD" the slot belongs to. */
  date: string;
}