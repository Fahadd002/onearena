export interface TurfFacility {
    facility: { id: string; name: string };
}

export interface TurfImage {
    id: string;
    turfId: string;
    url: string;
    altText?: string | null;
    sortOrder: number;
}

export interface TurfPriceRule {
    id: string;
    dayOfWeek: number;
    startMinute: number;
    endMinute: number;
    price: number | string;
    active: boolean;
    startDate: string;
    endDate: string;
}

export interface TurfPackage {
    id: string;
    name: string;
    description?: string | null;
    price: number | string;
    active: boolean;
}

export interface TurfReviewReply {
    id: string;
    comment: string;
    createdAt: string;
    user: { id: string; name: string; image?: string | null };
}

export interface TurfReview {
    id: string;
    rating: number;
    comment: string;
    isHidden: boolean;
    createdAt: string;
    user: { id: string; name: string; image?: string | null };
    replies?: TurfReviewReply[];
}

export interface Turf {
    id: string;
    name: string;
    address: string;
    area?: string | null;
    description?: string | null;
    defaultSlotPrice: number | string;
    defaultSlotDuration: number;
    allowAdvancePayment?: boolean;
    advancePaymentAmount?: number;
    paymentPhoneNumbers?: { method: string; number: string }[];
    status: string;
    latitude?: string;
    longitude?: string;
    category: { id: string; name: string };
    owner: { id: string; name: string; image?: string | null };
    facilities?: TurfFacility[];
    images?: TurfImage[];
    priceRules?: TurfPriceRule[];
    slots?: TurfSlot[];
    packages?: TurfPackage[];
    reviews?: TurfReview[];
    _count?: { reviews: number };
    peakHourPrice?: number;
    weekendPrice?: number;
    distance?: number;
    bookedCount: number;
}

/**
 * Slot status contract — mirrors the backend `SlotSatus` enum
 * (`backend/prisma/schema/enums.prisma`).
 *   AVAILABLE — bookable
 *   WAITLIST  — held by an unfinished booking, still not confirmed
 *   BOOKED    — taken
 */
export type SlotStatus = "AVAILABLE" | "BOOKED" | "WAITLIST";

export interface TurfSlot {
  id: string;
  slotDate?: string;
  startMinute: number;
  endMinute: number;
  price: number;
  /**
   * The turf list payload returns `active`, `slotStatus` and `isPeakTime` but no
   * `available`; the public slots endpoint returns `available` plus a `status`
   * alias of `slotStatus`. Read them through `isSlotBookable()` in

   */
  active?: boolean;
  available?: boolean;
  slotStatus?: SlotStatus;
  status?: SlotStatus; // alias for backend compatibility
  isPeakTime?: boolean;
}

export interface StoredTurfSlot {
    id: string;
    turfId: string;
    slotDate: string;
    startMinute: number;
    endMinute: number;
    price: string;
    active: boolean;
    bookingStatus: SlotStatus;
    createdAt: string;
    updatedAt: string;
}

export interface TurfFacility {
    facility: { id: string; name: string };
}

export interface TurfImage {
    id: string;
    turfId: string;
    url: string;
    altText?: string | null;
    sortOrder: number;
}

