"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle,
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
  ShieldCheck,
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
import { ApiResponse } from "@/types/api.type";
import { toast } from "sonner";
import { getOwnerProfile, updateOwnerProfile } from "../_action";
import { OwnerProfile } from "../_types";
import OwnerProfileHeader from "../_components/OwnerProfileHeader";

interface ProfileForm {
  companyName: string;
  bussinessEmail: string;
  contactNumber: string;
  address: string;
  nidNumber: string;
  businessRegistrationNumber: string;
  tradeLicenseNumber: string;
}

export default function ProfileStepPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<ProfileForm>({
    companyName: "",
    bussinessEmail: "",
    contactNumber: "",
    address: "",
    nidNumber: "",
    businessRegistrationNumber: "",
    tradeLicenseNumber: "",
  });

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
        bussinessEmail: profileData.bussinessEmail || "",
        contactNumber: profileData.contactNumber || "",
        address: profileData.address || "",
        nidNumber: profileData.nidNumber || "",
        businessRegistrationNumber:
          profileData.businessRegistrationNumber || "",
        tradeLicenseNumber: profileData.tradeLicenseNumber || "",
      });
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
      toast.success("Profile saved successfully. Please upload required documents.");
      router.push("/owner-profile/documents");
    },
    onError: (err: Error) =>
      toast.error(err.message || "Failed to save profile"),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-10 w-10 animate-spin text-purple-600" />
      </div>
    );
  }

  const profile = profileData;
  const status = profile?.verificationStatus;
  const isApproved = status === "APPROVED";

  const completedProfileFields = [
    form.companyName,
    form.bussinessEmail,
    form.contactNumber,
    form.address,
    form.nidNumber,
    form.businessRegistrationNumber,
    form.tradeLicenseNumber,
  ].filter(Boolean).length;

  const isExistingProfile = !!profileData;
  const buttonLabel = isExistingProfile ? "Update Profile" : "Save Profile";

  return (
    <div className="min-h-screen bg-[#f5f5f5] dark:bg-slate-950 pb-16 font-sans antialiased">
      <OwnerProfileHeader profile={profileData} currentStep="profile" />

      <div className="container mx-auto max-w-7xl px-4 pt-6 pb-8 lg:px-8">
        <div className="w-full">
          <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            {/* Header with Side-by-Side Progress */}
            <CardHeader className="border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6">
              <div>
                <CardTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <User className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  Profile Information
                </CardTitle>
                <CardDescription className="text-slate-500 dark:text-slate-400 mt-1">
                  Manage your official business details and identification records.
                </CardDescription>
              </div>

              <div className="flex flex-col items-start md:items-end min-w-[220px]">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Profile Completion:{" "}
                  <span className="font-bold text-purple-600 dark:text-purple-400">
                    {completedProfileFields}/7
                  </span>{" "}
                  fields
                </p>
                <div className="mt-1.5 w-full max-w-xs h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
                  <div
                    className="h-full bg-purple-600 rounded-full transition-all duration-300"
                    style={{ width: `${(completedProfileFields / 7) * 100}%` }}
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 p-6 sm:p-8">
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
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        bussinessEmail: e.target.value,
                      }))
                    }
                    placeholder="business@example.com"
                    className="h-10"
                    disabled={isApproved}
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                    <Phone className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
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
                    disabled={isApproved}
                    required
                  />
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
                    <Briefcase className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
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
                    disabled={isApproved}
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                    <FileText className="h-4 w-4 text-purple-600 dark:text-purple-400" />
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
                    Profile Locked (Approved)
                  </Button>
                ) : (
                  <Button
                    onClick={() => updateMutation.mutate()}
                    disabled={updateMutation.isPending || completedProfileFields < 7}
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