// profile/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Save,
  User,
  Building2,
  Briefcase,
  Phone,
  MapPin,
  CreditCard,
  FileText,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ApiResponse } from "@/types/api.type";
import { useAuth } from "@/lib/auth";
import { getOwnerProfile, updateOwnerProfile } from "../_action";
import {
  OwnerProfile,
  ProfileFormData,
  MANDATORY_PROFILE_FIELDS,
} from "../_types";
import OwnerProfileHeader from "../_components/OwnerProfileHeader";
import { validateBangladeshiMobile, validateEmail } from "@/lib/validators";
import { toast } from "sonner";

const validateContactNumber = validateBangladeshiMobile;

const initialForm: ProfileFormData = {
  companyName: "",
  bussinessEmail: "",
  contactNumber: "",
  address: "",
  nidNumber: "",
  tradeLicenseNumber: "",
  etin: "",
  bin: "",
};

export default function ProfileStepPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { session } = useAuth();
  const userEmail = session?.user?.email ?? "";
  const [form, setForm] = useState<ProfileFormData>(() => ({ ...initialForm, bussinessEmail: userEmail }));
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const { data: profileData, isLoading } = useQuery({
    queryKey: ["owner-profile"],
    queryFn: async () => {
      const res = await getOwnerProfile();
      if (!res.success) throw new Error(res.message);
      return (res as ApiResponse<OwnerProfile>).data ?? null;
    },
    staleTime: 30000,
  });

  useEffect(() => {
    if (profileData) {
      setForm({
        companyName: profileData.companyName || "",
        bussinessEmail: profileData.bussinessEmail || userEmail || "",
        contactNumber: profileData.contactNumber || "",
        address: profileData.address || "",
        nidNumber: profileData.nidNumber || "",
        tradeLicenseNumber: profileData.tradeLicenseNumber || "",
        etin: profileData.etin || "",
        bin: profileData.bin || "",
      });
    }
  }, [profileData, userEmail]);

  const setField = useCallback(
    (key: keyof ProfileFormData, value: string) => {
      setForm((f) => ({ ...f, [key]: value }));
      const validator =
        key === "contactNumber"
          ? validateContactNumber
          : key === "bussinessEmail"
            ? validateEmail
            : null;
      setErrors((e) => ({ ...e, [key]: validator ? validator(value) : null }));
    },
    [],
  );

  const updateMutation = useMutation({
    mutationFn: async () => {
      const contactErr = validateContactNumber(form.contactNumber);
      const emailErr = validateEmail(form.bussinessEmail);
      const validationError = contactErr || emailErr;
      if (validationError) throw new Error(validationError);
      const res = await updateOwnerProfile({
        companyName: form.companyName || undefined,
        bussinessEmail: form.bussinessEmail || undefined,
        contactNumber: form.contactNumber || undefined,
        address: form.address || undefined,
        nidNumber: form.nidNumber || undefined,
        tradeLicenseNumber: form.tradeLicenseNumber || undefined,
        etin: form.etin || undefined,
        bin: form.bin || undefined,
      });
      if (!res.success) throw new Error(res.message);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner-profile"] });
      toast.success(
        "Profile saved successfully. Please upload required documents.",
      );
      router.push("/owner-profile/documents");
    },
    onError: (err: Error) =>
      toast.error(err.message || "Failed to save profile"),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] dark:bg-slate-950 pb-16 font-sans">
        <div className="container mx-auto max-w-7xl px-4 pt-6 pb-8 lg:px-8 space-y-6">
          <Skeleton className="h-10 w-full max-w-xs rounded-xl" />
          <Skeleton className="h-4 w-64 rounded" />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const profile = profileData;
  const status = profile?.verificationStatus;
  const isApproved = status === "APPROVED";

  // Count only mandatory fields for progress
  const completedMandatoryFields = MANDATORY_PROFILE_FIELDS.filter(
    (field) => !!form[field],
  ).length;
  const totalMandatory = MANDATORY_PROFILE_FIELDS.length;

  const isExistingProfile = !!profileData;
  const buttonLabel = isExistingProfile ? "Update Profile" : "Save Profile";

  return (
    <div className="min-h-screen bg-[#f5f5f5] dark:bg-slate-950 pb-16 font-sans antialiased">
      <OwnerProfileHeader profile={profileData} currentStep="profile" />

      <div className="container mx-auto max-w-7xl px-4 pt-6 pb-8 lg:px-8">
        <div className="w-full">
          <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            {/* Header with Progress */}
            <CardHeader className="border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 sm:p-6">
              <div className="min-w-0">
                <CardTitle className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <User className="h-5 w-5 text-purple-600 dark:text-purple-400 shrink-0" />
                  Profile Information
                </CardTitle>
                <CardDescription className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
                  Manage your business details and identification records.
                </CardDescription>
              </div>

              <div className="flex flex-col items-stretch md:items-end w-full md:w-auto md:min-w-[220px]">
                <div className="flex items-center justify-between md:justify-end gap-2">
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Mandatory Fields
                  </p>
                  <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                    {completedMandatoryFields}/{totalMandatory}
                  </span>
                </div>
                <div className="mt-1.5 w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
                  <div
                    className="h-full bg-purple-600 rounded-full transition-all duration-300"
                    style={{
                      width: `${(completedMandatoryFields / totalMandatory) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 p-6 sm:p-8">
              {/* ===== MANDATORY FIELDS ===== */}
              <div>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                      <Building2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      Company Name <span className="text-destructive">*</span>
                    </label>
                    <Input
                      value={form.companyName}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, companyName: e.target.value }))
                      }
                      placeholder="Your company name"
                      className="h-10"
                      disabled={isApproved}
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                      <Briefcase className="h-4 w-4 text-red-600 dark:text-red-400" />
                      Business Email <span className="text-destructive">*</span>
                    </label>
                    <Input
                      type="email"
                      value={form.bussinessEmail}
                      onChange={(e) => setField("bussinessEmail", e.target.value)}
                      placeholder="business@example.com"
                      className="h-10"
                      disabled={isApproved}
                      required
                    />
                    {errors.bussinessEmail && (
                      <p className="mt-1 text-xs text-destructive">
                        {errors.bussinessEmail}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                      <Phone className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      Contact Number <span className="text-destructive">*</span>
                    </label>
                    <Input
                      value={form.contactNumber}
                      onChange={(e) => setField("contactNumber", e.target.value)}
                      placeholder="01XXXXXXXXX"
                      className="h-10"
                      disabled={isApproved}
                      required
                    />
                    {errors.contactNumber && (
                      <p className="mt-1 text-xs text-destructive">
                        {errors.contactNumber}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                      <MapPin className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      Business Address <span className="text-destructive">*</span>
                    </label>
                    <Input
                      value={form.address}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, address: e.target.value }))
                      }
                      placeholder="Full business address"
                      className="h-10"
                      disabled={isApproved}
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                      <CreditCard className="h-4 w-4 text-red-600 dark:text-red-400" />
                      NID Number <span className="text-destructive">*</span>
                    </label>
                    <Input
                      value={form.nidNumber}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, nidNumber: e.target.value }))
                      }
                      placeholder="National ID number"
                      className="h-10"
                      disabled={isApproved}
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                      <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
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
                      disabled={isApproved}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* ===== OPTIONAL FIELDS ===== */}
              <div className="pt-2">
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                      <FileText className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                      ETIN
                    </label>
                    <Input
                      value={form.etin}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, etin: e.target.value }))
                      }
                      placeholder="ETIN"
                      className="h-10"
                      disabled={isApproved}
                    />
                  </div>

                  <div>
                    <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                      <FileText className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                      BIN
                    </label>
                    <Input
                      value={form.bin}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, bin: e.target.value }))
                      }
                      placeholder="BIN"
                      className="h-10"
                      disabled={isApproved}
                    />
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="pt-4 flex justify-end">
                {isApproved ? (
                  <Button
                    disabled
                    size="sm"
                    variant="outline"
                    className="px-4 py-2 border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed opacity-80"
                  >
                     <Lock className="mr-2 h-4 w-4 text-slate-400" />
                    Locked (Approved)
                  </Button>
                ) : (
                  <Button
                    onClick={() => updateMutation.mutate()}
                    disabled={
                      updateMutation.isPending ||
                      completedMandatoryFields < totalMandatory
                    }
                    size="sm"
                    className="px-5 py-2 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-sm"
                  >
                    {updateMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    {buttonLabel}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}