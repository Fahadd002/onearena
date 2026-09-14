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
    basePrice: number | string;
    slotMinutes: number;
    timezone?: string;
    status: string;
    latitude?: string;
    longitude?: string;
    category: { id: string; name: string };
    facilities?: TurfFacility[];
    images?: TurfImage[];
    priceRules?: TurfPriceRule[];
    packages?: TurfPackage[];
    reviews?: TurfReview[];
    _count?: { reviews: number };
}

export interface TurfSlot {
    id?: string;
    startMinute: number;
    endMinute: number;
    available: boolean;
    status?: "AVAILABLE" | "PREBOOKED" | "BOOKED";
    price?: number;
}

export interface StoredTurfSlot {
    id: string;
    turfId: string;
    slotDate: string;
    startMinute: number;
    endMinute: number;
    price: number;
    active: boolean;
    bookingStatus: "AVAILABLE" | "PREBOOKED" | "BOOKED";
    createdAt: string;
    updatedAt: string;
}
