export type { OwnerProfile, DocumentType, DocumentFile, SubscriptionPlan, OwnerSubscription };

type OwnerProfile = {
  id: string;
  userId: string;
  companyName: string | null;
  bussinessEmail: string | null;
  contactNumber: string | null;
  address: string | null;
  gender: "MALE" | "FEMALE" | null;
  nidNumber: string | null;
  businessRegistrationNumber: string | null;
  tradeLicenseNumber: string | null;
  nidImageFront: string | null;
  nidImageBack: string | null;
  businessRegistrationDocument: string | null;
  tradeLicenseDocument: string | null;
  taxIdentificationDocument: string | null;
  businessLogo: string | null;
  verificationStatus:
    | "CREATED"
    | "PENDING"
    | "SUBMITTED"
    | "APPROVED"
    | "REJECTED";
  rejectionReason: string | null;
  user: {
    id?: string;
    name: string;
    email: string;
    image: string | null;
    role?: "ADMIN" | "MANAGER" | "USER" | "SUPER_ADMIN";
  };
};

type DocumentType =
  | "nidImageFront"
  | "nidImageBack"
  | "businessRegistrationDocument"
  | "tradeLicenseDocument"
  | "taxIdentificationDocument"
  | "businessLogo";

interface DocumentFile {
  file: File | null;
  preview: string | null;
  uploaded: boolean;
  fileType: string | null;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  tierLevel: number;
  maxTurfs: number;
  features: string[];
  prices: Array<{
    period: "MONTHLY" | "QUARTERLY" | "HALF_YEARLY" | "YEARLY";
    price: number;
  }>;
  active: boolean;
}

interface OwnerSubscription {
  id: string;
  planId: string;
  status: "TRIAL" | "ACTIVE" | "EXPIRED" | "CANCELLED" | "EXPIRING";
  billingCycle: "MONTHLY" | "QUARTERLY" | "HALF_YEARLY" | "YEARLY";
  endDate: string;
  trialEnd: string | null;
  plan: SubscriptionPlan;
}
