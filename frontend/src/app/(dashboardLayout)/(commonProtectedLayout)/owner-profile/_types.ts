// _types.ts
export type {
  OwnerProfile,
  DocumentType,
  DocumentFile,
  SubscriptionPlan,
  OwnerSubscription,
  Feature,
  ProfileFormData,
};

type OwnerProfile = {
  id: string;
  userId: string;
  // Mandatory profile fields
  companyName: string | null;
  bussinessEmail: string | null;
  contactNumber: string | null;
  address: string | null;
  nidNumber: string | null;
  tradeLicenseNumber: string | null;
  // Optional profile fields
  etin: string | null;
  bin: string | null;
  // Documents (mandatory)
  businessLogo: string | null;
  nidImage: string | null;
  tradeLicenseDocument: string | null;
  // Documents (optional)
  etinDocument: string | null;
  binDocument: string | null;
  // Verification
  verificationStatus:
    | "CREATED"
    | "PENDING"
    | "SUBMITTED"
    | "APPROVED"
    | "REJECTED";
  verifiedById: string | null;
  verifiedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id?: string;
    name: string;
    email: string;
    image: string | null;
    role?: "ADMIN" | "MANAGER" | "USER" | "SUPER_ADMIN";
  };
};

// Document field names — matches Prisma schema
type DocumentType =
  | "nidImage"
  | "tradeLicenseDocument"
  | "businessLogo"
  | "etinDocument"
  | "binDocument";

interface DocumentFile {
  file: File | null;
  preview: string | null;
  uploaded: boolean;
  fileType: string | null;
}

// Profile form data — matches Prisma schema fields
interface ProfileFormData {
  // Mandatory
  companyName: string;
  bussinessEmail: string;
  contactNumber: string;
  address: string;
  nidNumber: string;
  tradeLicenseNumber: string;
  // Optional
  etin: string;
  bin: string;
}

// Mandatory profile fields (for progress calculation)
export const MANDATORY_PROFILE_FIELDS: Array<keyof ProfileFormData> = [
  "companyName",
  "bussinessEmail",
  "contactNumber",
  "address",
  "nidNumber",
  "tradeLicenseNumber",
];

// Mandatory document fields
export const MANDATORY_DOCUMENT_FIELDS: DocumentType[] = [
  "nidImage",
  "tradeLicenseDocument",
  "businessLogo",
];

// Optional document fields
export const OPTIONAL_DOCUMENT_FIELDS: DocumentType[] = [
  "etinDocument",
  "binDocument",
];

interface Feature {
  id: string;
  name: string;
  description?: string;
  type: "GENERAL" | "PREMIUM";
  key?: string;
  planId?: string;
  createdAt: string;
  updatedAt?: string;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  tierLevel: number;
  maxTurfs: number;
  isFreeTrialAllowed?: boolean;
  freeTrialDuration?: number;
  features: Feature[];
  prices: Array<{
    period: "MONTHLY" | "QUARTERLY" | "HALF_YEARLY" | "YEARLY";
    price: number;
  }>;
  active: boolean;
}

interface OwnerSubscription {
  id: string;
  planId: string;
  status: "FREE_TRIAL" | "ACTIVE" | "EXPIRING" | "EXPIRED" | "CANCELLED" | "INACTIVE";
  billingCycle: "MONTHLY" | "QUARTERLY" | "HALF_YEARLY" | "YEARLY";
  endDate: string;
  startDate: string;
  freeStart: string | null;
  freeEnd: string | null;
  isFreeUsed: boolean;
  isFreeActive: boolean;
  plan: SubscriptionPlan;
}