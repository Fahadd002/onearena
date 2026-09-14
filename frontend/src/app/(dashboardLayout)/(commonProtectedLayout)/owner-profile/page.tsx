"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle,
  Loader2,
  Home,
  Save,
  Upload,
  Phone,
  MapPin,
  User,
  CreditCard,
  Briefcase,
  FileText,
  Building2,
  Zap,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApiResponse } from "@/types/api.type";
import { API_BASE_URL } from "@/lib/api/config";
import { toast } from "sonner";
import { getOwnerProfile, updateOwnerProfile } from "./_action";
import {
  uploadDocumentsClient,
  activateFreeTrialClient,
  activateSubscriptionClient,
  getCurrentSubscriptionClient,
  getSubscriptionPlansClient,
  deleteDocumentClient,
} from "./_client-api";

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
  maxTurfs: number;
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

// Remove the hardcoded SUBSCRIPTION_PLANS

export default function OwnerProfilePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("profile");
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<
    "monthly" | "quarterly" | "halfYearly" | "yearly"
  >("monthly");

  const [form, setForm] = useState({
    companyName: "",
    bussinessEmail: "",
    contactNumber: "",
    address: "",
    nidNumber: "",
    businessRegistrationNumber: "",
    tradeLicenseNumber: "",
  });

  const [documents, setDocuments] = useState<Record<DocumentType, DocumentFile>>(
    {
      nidImageFront: {
        file: null,
        preview: null,
        uploaded: false,
        fileType: null,
      },
      nidImageBack: {
        file: null,
        preview: null,
        uploaded: false,
        fileType: null,
      },
      businessRegistrationDocument: {
        file: null,
        preview: null,
        uploaded: false,
        fileType: null,
      },
      tradeLicenseDocument: {
        file: null,
        preview: null,
        uploaded: false,
        fileType: null,
      },
      taxIdentificationDocument: {
        file: null,
        preview: null,
        uploaded: false,
        fileType: null,
      },
      businessLogo: {
        file: null,
        preview: null,
        uploaded: false,
        fileType: null,
      },
    }
  );

  const { data: profileData, isLoading } = useQuery({
    queryKey: ["owner-profile"],
    queryFn: async () => {
      const res = await getOwnerProfile();
      if (!res.success) throw new Error(res.message);
      return (res as ApiResponse<OwnerProfile>).data ?? null;
    },
    staleTime: 30000,
  });

  const { data: plansData, isLoading: plansLoading } = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: async () => {
      const res = await getSubscriptionPlansClient();
      if (!res.success) throw new Error(res.message);
      return (res as ApiResponse<SubscriptionPlan[]>).data ?? [];
    },
    staleTime: 60000,
  });

  const { data: subscriptionData } = useQuery({
    queryKey: ["owner-subscription"],
    queryFn: async () => {
      const res = await getCurrentSubscriptionClient();
      if (!res.success) throw new Error(res.message);
      return (res as ApiResponse<OwnerSubscription | null>).data ?? null;
    },
    enabled: !!profileData,
  });

  useEffect(() => {
    if (profileData) {
      setForm({
        companyName: profileData.companyName || "",
        bussinessEmail: profileData.bussinessEmail || "",
        contactNumber: profileData.contactNumber || "",
        address: profileData.address || "",
        nidNumber: profileData.nidNumber || "",
        businessRegistrationNumber:
          profileData.businessRegistrationNumber || "",
        tradeLicenseNumber: profileData.tradeLicenseNumber || "",
      });
      setDocuments((previous) => ({
        ...previous,
        nidImageFront: {
          ...previous.nidImageFront,
          preview: getFileUrl(profileData.nidImageFront),
          uploaded: !!profileData.nidImageFront,
          fileType: getFileType(profileData.nidImageFront),
        },
        nidImageBack: {
          ...previous.nidImageBack,
          preview: getFileUrl(profileData.nidImageBack),
          uploaded: !!profileData.nidImageBack,
          fileType: getFileType(profileData.nidImageBack),
        },
        businessRegistrationDocument: {
          ...previous.businessRegistrationDocument,
          preview: getFileUrl(profileData.businessRegistrationDocument),
          uploaded: !!profileData.businessRegistrationDocument,
          fileType: getFileType(profileData.businessRegistrationDocument),
        },
        tradeLicenseDocument: {
          ...previous.tradeLicenseDocument,
          preview: getFileUrl(profileData.tradeLicenseDocument),
          uploaded: !!profileData.tradeLicenseDocument,
          fileType: getFileType(profileData.tradeLicenseDocument),
        },
        taxIdentificationDocument: {
          ...previous.taxIdentificationDocument,
          preview: getFileUrl(profileData.taxIdentificationDocument),
          uploaded: !!profileData.taxIdentificationDocument,
          fileType: getFileType(profileData.taxIdentificationDocument),
        },
        businessLogo: {
          ...previous.businessLogo,
          preview: getFileUrl(profileData.businessLogo),
          uploaded: !!profileData.businessLogo,
          fileType: getFileType(profileData.businessLogo),
        },
      }));

      // Set tab based on status
      if (profileData.verificationStatus === "APPROVED") {
        setActiveTab("subscription");
      }
    }
  }, [profileData]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const res = await updateOwnerProfile({
        companyName: form.companyName || undefined,
        bussinessEmail: form.bussinessEmail || undefined,
        contactNumber: form.contactNumber || undefined,
        address: form.address || undefined,
        nidNumber: form.nidNumber || undefined,
        businessRegistrationNumber: form.businessRegistrationNumber || undefined,
        tradeLicenseNumber: form.tradeLicenseNumber || undefined,
      });
      if (!res.success) throw new Error(res.message);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner-profile"] });
      toast.success(
        "Profile saved successfully. Please upload required documents."
      );
      setActiveTab("documents");
    },
    onError: (err: Error) =>
      toast.error(err.message || "Failed to save profile"),
  });

  const uploadDocumentsMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();

      Object.entries(documents).forEach(([key, doc]) => {
        if (doc.file) {
          formData.append(key as DocumentType, doc.file);
        }
      });

      const res = await uploadDocumentsClient(formData);
      if (!res.success) throw new Error(res.message);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner-profile"] });
      toast.success("Documents uploaded successfully! Waiting for review...");
    },
    onError: (err: Error) =>
      toast.error(err.message || "Failed to upload documents"),
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: async (docType: DocumentType) => {
      const res = await deleteDocumentClient(docType);
      if (!res.success) throw new Error(res.message);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner-profile"] });
      toast.success("Document removed successfully");
    },
    onError: (err: Error) =>
      toast.error(err.message || "Failed to remove document"),
  });

  const handleRemoveDocument = (docType: DocumentType) => {
    if (documents[docType].uploaded) {
      // If already uploaded to backend, delete from backend
      deleteDocumentMutation.mutate(docType, {
        onSuccess: () => {
          setDocuments((prev) => ({
            ...prev,
            [docType]: {
              file: null,
              preview: null,
              uploaded: false,
              fileType: null,
            },
          }));
        },
      });
    } else {
      // If not uploaded yet, just clear local state
      setDocuments((prev) => ({
        ...prev,
        [docType]: {
          file: null,
          preview: null,
          uploaded: false,
          fileType: null,
        },
      }));
    }
  };

  const activateSubscriptionMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPlan) throw new Error("Please select a plan");
      if (selectedPlan === "FREE_TRIAL") {
        const res = await activateFreeTrialClient();
        if (!res.success) throw new Error(res.message);
        return res;
      }
      const billingPeriodMap = {
        monthly: "MONTHLY",
        quarterly: "QUARTERLY",
        halfYearly: "HALF_YEARLY",
        yearly: "YEARLY",
      } as const;
      const res = await activateSubscriptionClient(
        selectedPlan,
        billingPeriodMap[billingPeriod]
      );
      if (!res.success) throw new Error(res.message);
      return res;
    },
    onSuccess: () => {
      const planName = (plansData || []).find(
        (p) => p.id === selectedPlan
      )?.name;
      toast.success(
        selectedPlan === "FREE_TRIAL"
          ? "One-month free trial activated!"
          : `${planName} plan selected and subscription updated.`
      );
      queryClient.invalidateQueries({ queryKey: ["owner-profile"] });
      queryClient.invalidateQueries({ queryKey: ["owner-subscription"] });
    },
    onError: (err: Error) =>
      toast.error(err.message || "Failed to activate subscription"),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const profile = profileData;
  const status = profile?.verificationStatus;
  const isCreated = status === "CREATED";
  const isPending = status === "PENDING";
  const isSubmitted = status === "SUBMITTED";
  const isRejected = status === "REJECTED";
  const isApproved = status === "APPROVED";
  const reviewNote = profile?.rejectionReason;
  const completedProfileFields = [
    form.companyName,
    form.bussinessEmail,
    form.contactNumber,
    form.address,
    form.nidNumber,
    form.businessRegistrationNumber,
    form.tradeLicenseNumber,
  ].filter(Boolean).length;
  const selectedDocumentCount = Object.values(documents).filter(
    (document) => document.preview || document.uploaded
  ).length;

  const statusBadge = {
    CREATED: (
      <Badge variant="outline" className="border-slate-500 text-slate-600">
        Created
      </Badge>
    ),
    PENDING: (
      <Badge variant="outline" className="border-amber-500 text-amber-600">
        Pending
      </Badge>
    ),
    SUBMITTED: (
      <Badge variant="outline" className="border-blue-500 text-blue-600">
        Submitted
      </Badge>
    ),
    APPROVED: (
      <Badge variant="default" className="bg-green-600">
        Approved
      </Badge>
    ),
    REJECTED: <Badge variant="destructive">Rejected</Badge>,
  }[status || "PENDING"];

  const isReadOnly = isApproved;
  const isExistingProfile = !!profileData;
  const buttonLabel = isExistingProfile ? "Update Profile" : "Save Profile";

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 border-b border-border/70 bg-background/90 backdrop-blur-md">
        <div className="container mx-auto max-w-6xl px-4 py-4 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="mt-1 text-xl font-bold tracking-tight">
                {profile?.user?.name || "Owner"}
              </h1>
              <div>
                <p className="text-xs text-muted-foreground">
                  {profile?.user?.email}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {statusBadge}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/")}
                className="flex items-center gap-2"
              >
                <Home className="h-4 w-4" />
                <span className="hidden sm:inline">Home</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-4 py-8 lg:px-8 lg:py-10">
        {isSubmitted && (
          <Alert className="mb-6 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <AlertTitle className="font-semibold text-green-800 dark:text-green-200">
              Application Submitted
            </AlertTitle>
            <AlertDescription className="text-green-700 dark:text-green-300">
              Thank you for registration. System Administrator will review your
              application and contact you soon.
            </AlertDescription>
          </Alert>
        )}

        {isPending && (
          <Alert className="mb-6 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <AlertTitle className="font-semibold text-amber-800 dark:text-amber-200">
              Complete Your Profile
            </AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-300">
              {reviewNote ? (
                <>Reason: {reviewNote}. Please update and resubmit.</>
              ) : (
                "Complete all fields, upload documents, and submit for review."
              )}
            </AlertDescription>
          </Alert>
        )}

        {isRejected && reviewNote && (
          <Alert className="mb-6 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <AlertTitle className="text-red-800 dark:text-red-200">
              Application Rejected
            </AlertTitle>
            <AlertDescription className="text-red-700 dark:text-red-300">
              Reason: {reviewNote}. Please update and resubmit.
            </AlertDescription>
          </Alert>
        )}

        {isApproved && (
          <Alert className="mb-6 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <AlertTitle className="text-green-800 dark:text-green-200 font-semibold">
              Approved! 🎉
            </AlertTitle>
            <AlertDescription className="text-green-700 dark:text-green-300">
              Profile verified. Choose your subscription plan to start managing
              turfs.
            </AlertDescription>
          </Alert>
        )}

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid h-auto w-full grid-cols-3 rounded-xl bg-muted/70 p-1">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger
              value="documents"
              disabled={completedProfileFields < 7}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Documents</span>
            </TabsTrigger>
            <TabsTrigger value="subscription" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              <span className="hidden sm:inline">Plan</span>
            </TabsTrigger>
          </TabsList>

          {/* PROFILE TAB */}
          <TabsContent value="profile" className="space-y-6">
            <Card className="border-border/70 shadow-sm">
              <CardHeader className="border-b border-border/70 bg-muted/20 pb-5">
                <CardTitle className="text-xl">Profile Information</CardTitle>
                <CardDescription>
                  Update your business and personal details
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6 pt-6 sm:p-8">
                {/* Form Fields */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 flex items-center gap-2 text-sm font-medium">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      Company Name <span className="text-destructive">*</span>
                    </label>
                    <Input
                      value={form.companyName}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, companyName: e.target.value }))
                      }
                      placeholder="Your company name"
                      className="h-10"
                      disabled={isReadOnly}
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-2 flex items-center gap-2 text-sm font-medium">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      Business Email <span className="text-destructive">*</span>
                    </label>
                    <Input
                      type="email"
                      value={form.bussinessEmail}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          bussinessEmail: e.target.value,
                        }))
                      }
                      placeholder="business@example.com"
                      className="h-10"
                      disabled={isReadOnly}
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      Contact Number <span className="text-destructive">*</span>
                    </label>
                    <Input
                      value={form.contactNumber}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          contactNumber: e.target.value,
                        }))
                      }
                      placeholder="+880 1XXX-XXXXXX"
                      className="h-10"
                      disabled={isReadOnly}
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      Business Address <span className="text-destructive">*</span>
                    </label>
                    <Input
                      value={form.address}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, address: e.target.value }))
                      }
                      placeholder="Full business address"
                      className="h-10"
                      disabled={isReadOnly}
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      NID Number <span className="text-destructive">*</span>
                    </label>
                    <Input
                      value={form.nidNumber}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, nidNumber: e.target.value }))
                      }
                      placeholder="National ID number"
                      className="h-10"
                      disabled={isReadOnly}
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      Business Registration Number{" "}
                      <span className="text-destructive">*</span>
                    </label>
                    <Input
                      value={form.businessRegistrationNumber}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          businessRegistrationNumber: e.target.value,
                        }))
                      }
                      placeholder="BIN/Registration number"
                      className="h-10"
                      disabled={isReadOnly}
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      Trade License Number{" "}
                      <span className="text-destructive">*</span>
                    </label>
                    <Input
                      value={form.tradeLicenseNumber}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          tradeLicenseNumber: e.target.value,
                        }))
                      }
                      placeholder="Trade license number"
                      className="h-10"
                      disabled={isReadOnly}
                      required
                    />
                  </div>
                </div>

                {/* Save Button */}
                {!isApproved && (
                  <Button
                    onClick={() => updateMutation.mutate()}
                    disabled={updateMutation.isPending}
                    size="lg"
                    className="w-full text-base font-semibold"
                  >
                    {updateMutation.isPending ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-5 w-5" />
                    )}
                    {buttonLabel}
                  </Button>
                )}

                {isApproved && (
                  <div className="w-full p-4 text-center text-sm text-muted-foreground border rounded-lg bg-muted/30">
                    Profile is verified and locked.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* DOCUMENTS TAB */}
          <TabsContent value="documents" className="space-y-6">
            <Card className="border-border/70 shadow-sm">
              <CardHeader className="border-b border-border/70 bg-muted/20 pb-5">
                <CardTitle className="text-xl">Upload Documents</CardTitle>
                <CardDescription>
                  Upload required documents for verification. Accepted: PDF, JPG,
                  PNG
                </CardDescription>
              </CardHeader>

              <CardContent className="grid gap-4 pt-6 sm:grid-cols-2 sm:p-8">
                {/* NID Image Front */}
                <div className="border rounded-lg p-6 bg-muted/30 hover:bg-muted/50 transition">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-primary" />
                        National ID - Front
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Upload the front side of your NID
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {documents.nidImageFront.uploaded && (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      )}
                      {status !== "APPROVED" &&
                        documents.nidImageFront.preview &&
                        !documents.nidImageFront.uploaded && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-red-600 hover:text-red-700 h-8 w-8"
                            onClick={() => handleRemoveDocument("nidImageFront")}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                    </div>
                  </div>
                  {documents.nidImageFront.preview ? (
                    <div className="space-y-3">
                      <div className="relative inline-block">
                        {isPdfFile(documents.nidImageFront.fileType) ? (
                          <div className="h-56 w-full rounded-lg border border-border bg-background flex items-center justify-center p-4">
                            <FileText className="h-16 w-16 text-red-500" />
                            <span className="absolute bottom-4 text-sm text-muted-foreground">
                              PDF Document
                            </span>
                          </div>
                        ) : (
                          <img
                            src={documents.nidImageFront.preview}
                            alt="NID Front Preview"
                            className="h-56 w-full rounded-lg border border-border object-contain bg-background p-2"
                          />
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition">
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              setDocuments((prev) => ({
                                ...prev,
                                nidImageFront: {
                                  file,
                                  preview: ev.target?.result as string,
                                  uploaded: false,
                                  fileType: file.type,
                                },
                              }));
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="hidden"
                        id="nid-front-upload"
                      />
                      <label
                        htmlFor="nid-front-upload"
                        className="cursor-pointer block"
                      >
                        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm font-medium">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-xs text-muted-foreground">
                          PDF, JPG, PNG up to 10MB
                        </p>
                      </label>
                    </div>
                  )}
                </div>

                {/* NID Image Back */}
                <div className="border rounded-lg p-6 bg-muted/30 hover:bg-muted/50 transition">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-primary" />
                        National ID - Back
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Upload the back side of your NID
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {documents.nidImageBack.uploaded && (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      )}
                      {status !== "APPROVED" &&
                        documents.nidImageBack.preview &&
                        !documents.nidImageBack.uploaded && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-red-600 hover:text-red-700 h-8 w-8"
                            onClick={() => handleRemoveDocument("nidImageBack")}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                    </div>
                  </div>
                  {documents.nidImageBack.preview ? (
                    <div className="space-y-3">
                      <div className="relative inline-block">
                        {isPdfFile(documents.nidImageBack.fileType) ? (
                          <div className="h-56 w-full rounded-lg border border-border bg-background flex items-center justify-center p-4">
                            <FileText className="h-16 w-16 text-red-500" />
                            <span className="absolute bottom-4 text-sm text-muted-foreground">
                              PDF Document
                            </span>
                          </div>
                        ) : (
                          <img
                            src={documents.nidImageBack.preview}
                            alt="NID Back Preview"
                            className="h-56 w-full rounded-lg border border-border object-contain bg-background p-2"
                          />
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition">
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              setDocuments((prev) => ({
                                ...prev,
                                nidImageBack: {
                                  file,
                                  preview: ev.target?.result as string,
                                  uploaded: false,
                                  fileType: file.type,
                                },
                              }));
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="hidden"
                        id="nid-back-upload"
                      />
                      <label
                        htmlFor="nid-back-upload"
                        className="cursor-pointer block"
                      >
                        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm font-medium">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-xs text-muted-foreground">
                          PDF, JPG, PNG up to 10MB
                        </p>
                      </label>
                    </div>
                  )}
                </div>

                {/* Business Registration Document */}
                <div className="border rounded-lg p-6 bg-muted/30 hover:bg-muted/50 transition">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold flex items-center gap-2">
                        <Briefcase className="h-5 w-5 text-primary" />
                        Business Registration
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Upload your business registration certificate
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {documents.businessRegistrationDocument.uploaded && (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      )}
                      {status !== "APPROVED" &&
                        documents.businessRegistrationDocument.preview &&
                        !documents.businessRegistrationDocument.uploaded && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-red-600 hover:text-red-700 h-8 w-8"
                            onClick={() =>
                              handleRemoveDocument(
                                "businessRegistrationDocument"
                              )
                            }
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                    </div>
                  </div>
                  {documents.businessRegistrationDocument.preview ? (
                    <div className="space-y-3">
                      <div className="relative inline-block">
                        {isPdfFile(
                          documents.businessRegistrationDocument.fileType
                        ) ? (
                          <div className="h-56 w-full rounded-lg border border-border bg-background flex items-center justify-center p-4">
                            <FileText className="h-16 w-16 text-red-500" />
                            <span className="absolute bottom-4 text-sm text-muted-foreground">
                              PDF Document
                            </span>
                          </div>
                        ) : (
                          <img
                            src={documents.businessRegistrationDocument.preview}
                            alt="Business Registration Preview"
                            className="h-56 w-full rounded-lg border border-border object-contain bg-background p-2"
                          />
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition">
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              setDocuments((prev) => ({
                                ...prev,
                                businessRegistrationDocument: {
                                  file,
                                  preview: ev.target?.result as string,
                                  uploaded: false,
                                  fileType: file.type,
                                },
                              }));
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="hidden"
                        id="breg-upload"
                      />
                      <label
                        htmlFor="breg-upload"
                        className="cursor-pointer block"
                      >
                        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm font-medium">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-xs text-muted-foreground">
                          PDF, JPG, PNG up to 10MB
                        </p>
                      </label>
                    </div>
                  )}
                </div>

                {/* Trade License Document */}
                <div className="border rounded-lg p-6 bg-muted/30 hover:bg-muted/50 transition">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        Trade License
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Upload your trade license certificate
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {documents.tradeLicenseDocument.uploaded && (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      )}
                      {status !== "APPROVED" &&
                        documents.tradeLicenseDocument.preview &&
                        !documents.tradeLicenseDocument.uploaded && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-red-600 hover:text-red-700 h-8 w-8"
                            onClick={() =>
                              handleRemoveDocument("tradeLicenseDocument")
                            }
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                    </div>
                  </div>
                  {documents.tradeLicenseDocument.preview ? (
                    <div className="space-y-3">
                      <div className="relative inline-block">
                        {isPdfFile(documents.tradeLicenseDocument.fileType) ? (
                          <div className="h-56 w-full rounded-lg border border-border bg-background flex items-center justify-center p-4">
                            <FileText className="h-16 w-16 text-red-500" />
                            <span className="absolute bottom-4 text-sm text-muted-foreground">
                              PDF Document
                            </span>
                          </div>
                        ) : (
                          <img
                            src={documents.tradeLicenseDocument.preview}
                            alt="Trade License Preview"
                            className="h-56 w-full rounded-lg border border-border object-contain bg-background p-2"
                          />
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition">
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              setDocuments((prev) => ({
                                ...prev,
                                tradeLicenseDocument: {
                                  file,
                                  preview: ev.target?.result as string,
                                  uploaded: false,
                                  fileType: file.type,
                                },
                              }));
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="hidden"
                        id="tlic-upload"
                      />
                      <label
                        htmlFor="tlic-upload"
                        className="cursor-pointer block"
                      >
                        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm font-medium">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-xs text-muted-foreground">
                          PDF, JPG, PNG up to 10MB
                        </p>
                      </label>
                    </div>
                  )}
                </div>

                {/* Tax Identification Document */}
                <div className="border rounded-lg p-6 bg-muted/30 hover:bg-muted/50 transition">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        Tax Identification Document{" "}
                        <span className="text-destructive">*</span>
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Upload your tax ID or BIN certificate
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {documents.taxIdentificationDocument.uploaded && (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      )}
                      {status !== "APPROVED" &&
                        documents.taxIdentificationDocument.preview &&
                        !documents.taxIdentificationDocument.uploaded && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-red-600 hover:text-red-700 h-8 w-8"
                            onClick={() =>
                              handleRemoveDocument(
                                "taxIdentificationDocument"
                              )
                            }
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                    </div>
                  </div>
                  {documents.taxIdentificationDocument.preview ? (
                    <div className="space-y-3">
                      <div className="relative inline-block">
                        {isPdfFile(
                          documents.taxIdentificationDocument.fileType
                        ) ? (
                          <div className="h-56 w-full rounded-lg border border-border bg-background flex items-center justify-center p-4">
                            <FileText className="h-16 w-16 text-red-500" />
                            <span className="absolute bottom-4 text-sm text-muted-foreground">
                              PDF Document
                            </span>
                          </div>
                        ) : (
                          <img
                            src={
                              documents.taxIdentificationDocument.preview
                            }
                            alt="Tax ID Preview"
                            className="h-56 w-full rounded-lg border border-border object-contain bg-background p-2"
                          />
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition">
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              setDocuments((prev) => ({
                                ...prev,
                                taxIdentificationDocument: {
                                  file,
                                  preview: ev.target?.result as string,
                                  uploaded: false,
                                  fileType: file.type,
                                },
                              }));
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="hidden"
                        id="tax-id-upload"
                      />
                      <label
                        htmlFor="tax-id-upload"
                        className="cursor-pointer block"
                      >
                        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm font-medium">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-xs text-muted-foreground">
                          PDF, JPG, PNG up to 10MB
                        </p>
                      </label>
                    </div>
                  )}
                </div>

                {/* Business Logo */}
                <div className="border rounded-lg p-6 bg-muted/30 hover:bg-muted/50 transition">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold flex items-center gap-2">
                        <Briefcase className="h-5 w-5 text-primary" />
                        Business Logo{" "}
                        <span className="text-destructive">*</span>
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Upload your business logo
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {documents.businessLogo.uploaded && (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      )}
                      {status !== "APPROVED" &&
                        documents.businessLogo.preview &&
                        !documents.businessLogo.uploaded && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-red-600 hover:text-red-700 h-8 w-8"
                            onClick={() => handleRemoveDocument("businessLogo")}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                    </div>
                  </div>
                  {documents.businessLogo.preview ? (
                    <div className="space-y-3">
                      <div className="relative inline-block">
                        {isPdfFile(documents.businessLogo.fileType) ? (
                          <div className="h-56 w-full rounded-lg border border-border bg-background flex items-center justify-center p-4">
                            <FileText className="h-16 w-16 text-red-500" />
                            <span className="absolute bottom-4 text-sm text-muted-foreground">
                              PDF Document
                            </span>
                          </div>
                        ) : (
                          <img
                            src={documents.businessLogo.preview}
                            alt="Business Logo Preview"
                            className="h-56 w-full rounded-lg border border-border object-contain bg-background p-2"
                          />
                        )}
                      </div>
                      {!isApproved && !documents.businessLogo.uploaded && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() =>
                            setDocuments((prev) => ({
                              ...prev,
                              businessLogo: {
                                file: null,
                                preview: null,
                                uploaded: false,
                                fileType: null,
                              },
                            }))
                          }
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition">
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              setDocuments((prev) => ({
                                ...prev,
                                businessLogo: {
                                  file,
                                  preview: ev.target?.result as string,
                                  uploaded: false,
                                  fileType: file.type,
                                },
                              }));
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="hidden"
                        id="logo-upload"
                      />
                      <label
                        htmlFor="logo-upload"
                        className="cursor-pointer block"
                      >
                        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm font-medium">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-xs text-muted-foreground">
                          PDF, JPG, PNG up to 10MB
                        </p>
                      </label>
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <Button
                  size="lg"
                  className="w-full text-base font-semibold sm:col-span-2"
                  disabled={
                    isApproved ||
                    Object.values(documents).some(
                      (document) => !document.preview
                    ) ||
                    uploadDocumentsMutation.isPending
                  }
                  onClick={() => uploadDocumentsMutation.mutate()}
                >
                  {uploadDocumentsMutation.isPending ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-5 w-5" />
                  )}
                  {isApproved
                    ? "Documents Already Approved"
                    : "Submit Documents for Review"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SUBSCRIPTION TAB */}
          <TabsContent value="subscription" className="space-y-6">
            <div className="space-y-6">
              {isApproved && (
                <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  <AlertTitle className="text-amber-800 dark:text-amber-200">
                    Subscription changes are locked
                  </AlertTitle>
                  <AlertDescription className="text-amber-700 dark:text-amber-300">
                    Your approved subscription cannot be changed from this page.
                  </AlertDescription>
                </Alert>
              )}
              {subscriptionData && (
                <Alert className="border-primary/30 bg-primary/5">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <AlertTitle>
                    Current subscription: {subscriptionData.plan.name}
                  </AlertTitle>
                  <AlertDescription>
                    {subscriptionData.status} until{" "}
                    {new Date(subscriptionData.endDate).toLocaleDateString()}.
                  </AlertDescription>
                </Alert>
              )}

              {plansLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : !plansData || plansData.length === 0 ? (
                <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  <AlertTitle className="text-amber-800 dark:text-amber-200">
                    No Plans Available
                  </AlertTitle>
                  <AlertDescription className="text-amber-700 dark:text-amber-300">
                    Subscription plans are not set up yet. Please contact
                    support.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-8">
                  {/* Header */}
                  <div className="text-center space-y-2">
                    <h2 className="text-3xl font-bold">Choose Your Plan</h2>
                    <p className="text-muted-foreground">
                      Start with 1 month free trial. Cancel anytime.
                    </p>
                  </div>

                  {/* Billing Period Selector */}
                  <div className="flex justify-center gap-4">
                    <div className="inline-flex rounded-lg border border-border p-1 bg-muted">
                      {(
                        [
                          "monthly",
                          "quarterly",
                          "halfYearly",
                          "yearly",
                        ] as const
                      ).map((period) => (
                        <button
                          key={period}
                          onClick={() => setBillingPeriod(period)}
                          className={`px-4 py-2 rounded text-sm font-medium transition-all ${
                            billingPeriod === period
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {period === "monthly" && "Monthly"}
                          {period === "quarterly" && "Quarterly"}
                          {period === "halfYearly" && "Half-yearly"}
                          {period === "yearly" && "Yearly"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Premium Plans Grid */}
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
                    {/* Free Trial Card */}
                    <div
                      onClick={() => setSelectedPlan("FREE_TRIAL")}
                      className={`relative cursor-pointer transition-all group rounded-3xl rounded-tr-none rounded-br-none overflow-hidden bg-slate-50 dark:bg-slate-900 ${
                        selectedPlan === "FREE_TRIAL"
                          ? "ring-2 ring-pink-500 shadow-2xl"
                          : "shadow-lg hover:shadow-xl"
                      }`}
                    >
                      {/* Card Header */}
                      <div className="relative p-6 pb-8">
                        <div className="absolute -right-6 -top-6 w-24 h-24 bg-pink-100 dark:bg-pink-950 rounded-full opacity-20"></div>
                        <h3 className="text-2xl font-bold text-pink-600 dark:text-pink-400">
                          Free Trial
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          1 month, no credit card
                        </p>
                      </div>

                      {/* Price */}
                      <div className="relative px-6 py-2 bg-pink-600 text-white flex items-baseline justify-end mr-6">
                        <span className="text-4xl font-bold">৳0</span>
                        <div
                          className="absolute right-0 bottom-full w-6 h-6 bg-pink-600 clip-path"
                          style={{ clipPath: "polygon(0 0, 100% 0, 0 100%)" }}
                        ></div>
                      </div>

                      {/* Features */}
                      <div className="px-6 py-4 space-y-3 flex-1">
                        <div className="flex gap-3 items-start py-1">
                          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-500 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-foreground dark:text-gray-300">1 Turf</span>
                        </div>
                        <div className="flex gap-3 items-start py-1">
                          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-500 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-foreground dark:text-gray-300">30 days free access</span>
                        </div>
                        <div className="flex gap-3 items-start py-1">
                          <X className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-foreground dark:text-gray-300">Priority support</span>
                        </div>
                        <div className="flex gap-3 items-start py-1">
                          <X className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-foreground dark:text-gray-300">Analytics dashboard</span>
                        </div>
                        <div className="flex gap-3 items-start py-1">
                          <X className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-foreground dark:text-gray-300">Unlimited bookings</span>
                        </div>
                      </div>

                      {/* Button */}
                      <div className="px-6 pb-6 pt-2">
                        <button
                          className={`w-full py-3 px-6 rounded font-semibold transition-all transform active:scale-95 relative ${
                            selectedPlan === "FREE_TRIAL"
                              ? "bg-pink-600 text-white shadow-lg hover:shadow-xl"
                              : "bg-pink-600 text-white hover:bg-pink-700"
                          }`}
                        >
                          {selectedPlan === "FREE_TRIAL"
                            ? "✓ Selected"
                            : "Start Free Trial"}
                          <div
                            className="absolute left-0 -bottom-1.5 w-1.5 h-1.5 bg-pink-700 clip-path"
                            style={{
                              clipPath: "polygon(100% 0, 100% 100%, 0 100%)",
                            }}
                          ></div>
                        </button>
                      </div>
                    </div>

                    {/* Subscription Plans */}
                    {plansData
                      .filter((plan) => plan.name !== "Free Trial")
                      .map((plan, index) => {
                        const priceForPeriod = plan.prices.find((p) => {
                          const periodMap = {
                            monthly: "MONTHLY",
                            quarterly: "QUARTERLY",
                            halfYearly: "HALF_YEARLY",
                            yearly: "YEARLY",
                          } as const;
                          return p.period === periodMap[billingPeriod];
                        });
                        const price = priceForPeriod?.price ?? 0;

                        const accentColors = [
                          {
                            primary: "#1e40af",
                            secondary: "#3b82f6",
                            rgb: "rgb(30, 64, 175)",
                          }, // Blue
                          {
                            primary: "#7c2d12",
                            secondary: "#ea580c",
                            rgb: "rgb(124, 45, 12)",
                          }, // Orange
                        ];
                        const accent =
                          accentColors[index % accentColors.length];
                        const isSelected = selectedPlan === plan.id;

                        return (
                          <div
                            key={plan.id}
                            onClick={() => setSelectedPlan(plan.id)}
                            className={`relative cursor-pointer transition-all group rounded-3xl rounded-tr-none rounded-br-none overflow-hidden bg-slate-50 dark:bg-slate-900 ${
                              isSelected
                                ? `ring-2 shadow-2xl`
                                : "shadow-lg hover:shadow-xl"
                            }`}
                            style={
                              {
                                "--ring-color": accent.primary,
                              } as React.CSSProperties
                            }
                          >
                            {/* Card Header */}
                            <div className="relative p-6 pb-8">
                              <div
                                className="absolute -right-6 -top-6 w-24 h-24 opacity-10 rounded-full"
                                style={{ backgroundColor: accent.secondary }}
                              ></div>
                              <h3
                                className="text-2xl font-bold"
                                style={{ color: accent.primary }}
                              >
                                {plan.name}
                              </h3>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                Up to {plan.maxTurfs}{" "}
                                {plan.maxTurfs === 1 ? "Turf" : "Turfs"}
                              </p>
                            </div>

                            {/* Price */}
                            <div
                              className="relative px-6 py-2 text-white flex items-baseline justify-end mr-6"
                              style={{ backgroundColor: accent.primary }}
                            >
                              <span className="text-4xl font-bold">
                                ৳{price}
                              </span>
                              <div
                                className="absolute right-0 bottom-full w-6 h-6 clip-path"
                                style={{
                                  backgroundColor: accent.primary,
                                  clipPath:
                                    "polygon(0 0, 100% 0, 0 100%)",
                                }}
                              ></div>
                            </div>

                            {/* Features */}
                            <div className="px-6 py-4 space-y-3 flex-1">
                              <div className="flex gap-3 items-start py-1">
                                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-500 flex-shrink-0 mt-0.5" />
                                <span className="text-sm text-foreground dark:text-gray-300">
                                  All Free Trial features
                                </span>
                              </div>
                              <div className="flex gap-3 items-start py-1">
                                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-500 flex-shrink-0 mt-0.5" />
                                <span className="text-sm text-foreground dark:text-gray-300">
                                  {plan.maxTurfs} Turfs included
                                </span>
                              </div>
                              <div className="flex gap-3 items-start py-1">
                                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-500 flex-shrink-0 mt-0.5" />
                                <span className="text-sm text-foreground dark:text-gray-300">Priority support</span>
                              </div>
                              <div className="flex gap-3 items-start py-1">
                                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-500 flex-shrink-0 mt-0.5" />
                                <span className="text-sm text-foreground dark:text-gray-300">
                                  Analytics dashboard
                                </span>
                              </div>
                              <div className="flex gap-3 items-start py-1">
                                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-500 flex-shrink-0 mt-0.5" />
                                <span className="text-sm text-foreground dark:text-gray-300">
                                  Unlimited bookings
                                </span>
                              </div>
                            </div>

                            {/* Button */}
                            <div className="px-6 pb-6 pt-2">
                              <button
                                className={`w-full py-3 px-6 rounded font-semibold transition-all transform active:scale-95 relative text-white`}
                                style={{ backgroundColor: accent.primary }}
                                onMouseEnter={(e) => {
                                  (
                                    e.target as HTMLElement
                                  ).style.backgroundColor = accent.secondary;
                                }}
                                onMouseLeave={(e) => {
                                  (
                                    e.target as HTMLElement
                                  ).style.backgroundColor = accent.primary;
                                }}
                              >
                                {isSelected ? "✓ Selected" : "Select Plan"}
                                <div
                                  className="absolute left-0 -bottom-1.5 w-1.5 h-1.5 clip-path dark:opacity-80"
                                  style={{
                                    backgroundColor: accent.primary,
                                    clipPath:
                                      "polygon(100% 0, 100% 100%, 0 100%)",
                                  }}
                                ></div>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  {/* Action Button */}
                  <div className="space-y-4 pt-4">
                    <Button
                      size="lg"
                      className="w-full text-base font-semibold"
                      disabled={
                        isApproved ||
                        !selectedPlan ||
                        activateSubscriptionMutation.isPending
                      }
                      onClick={() => activateSubscriptionMutation.mutate()}
                    >
                      {activateSubscriptionMutation.isPending ? (
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      ) : (
                        <Zap className="mr-2 h-5 w-5" />
                      )}
                      {selectedPlan === "FREE_TRIAL"
                        ? "Activate free trial"
                        : "Activate selected plan"}
                    </Button>

                    <p className="text-center text-xs text-muted-foreground">
                      Trial begins immediately. Billing starts after 1 month. No
                      credit card required.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function getFileUrl(url: string | null | undefined) {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  const apiOrigin = API_BASE_URL.replace(/\/api\/v1\/?$/, "");
  return `${apiOrigin}${url.startsWith("/") ? url : `/${url}`}`;
}

function getFileType(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.toLowerCase().includes(".pdf")) return "application/pdf";
  if (url.toLowerCase().match(/\.(jpg|jpeg|png)$/)) return "image/jpeg";
  return null;
}

function isPdfFile(fileType: string | null): boolean {
  return fileType === "application/pdf";
}