// documents/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Upload, FileText, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiResponse } from "@/types/api.type";
import { toast } from "sonner";
import { getOwnerProfile } from "../_action";
import { uploadDocumentsClient, deleteDocumentClient } from "../_client-api";
import {
  OwnerProfile,
  DocumentFile,
  DocumentType,
  MANDATORY_PROFILE_FIELDS,
  MANDATORY_DOCUMENT_FIELDS,
} from "../_types";
import OwnerProfileHeader from "../_components/OwnerProfileHeader";
import DocumentUploadField from "../_components/DocumentUploadField";
import { getFileType, getFileUrl } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface DocumentConfig {
  key: DocumentType;
  label: string;
  description: string;
  icon: "nid" | "license" | "tax" | "logo" | "default";
  mandatory: boolean;
}

const MANDATORY_DOCUMENT_CONFIGS: DocumentConfig[] = [
  {
    key: "nidImage",
    label: "National ID",
    description: "Upload your National ID",
    icon: "nid",
    mandatory: true,
  },
  {
    key: "tradeLicenseDocument",
    label: "Trade License",
    description: "Upload your trade license certificate",
    icon: "license",
    mandatory: true,
  },
  {
    key: "businessLogo",
    label: "Business Logo",
    description: "Upload your business logo",
    icon: "logo",
    mandatory: true,
  },
];

const OPTIONAL_DOCUMENT_CONFIGS: DocumentConfig[] = [
  {
    key: "etinDocument",
    label: "ETIN Document",
    description: "Upload your ETIN certificate (optional)",
    icon: "tax",
    mandatory: false,
  },
  {
    key: "binDocument",
    label: "BIN Document",
    description: "Upload your BIN certificate (optional)",
    icon: "tax",
    mandatory: false,
  },
];

const initialDocumentState: Record<DocumentType, DocumentFile> = {
  nidImage: { file: null, preview: null, uploaded: false, fileType: null },
  tradeLicenseDocument: {
    file: null,
    preview: null,
    uploaded: false,
    fileType: null,
  },
  businessLogo: { file: null, preview: null, uploaded: false, fileType: null },
  etinDocument: { file: null, preview: null, uploaded: false, fileType: null },
  binDocument: { file: null, preview: null, uploaded: false, fileType: null },
};

export default function DocumentsStepPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [documents, setDocuments] =
    useState<Record<DocumentType, DocumentFile>>(initialDocumentState);

  const { data: profileData, isLoading } = useQuery({
    queryKey: ["owner-profile"],
    queryFn: async () => {
      const res = await getOwnerProfile();
      if (!res.success) throw new Error(res.message);
      return (res as ApiResponse<OwnerProfile>).data ?? null;
    },
    staleTime: 30000,
  });

  const profile = profileData;
  const status = profile?.verificationStatus;

  // Sync uploaded documents from profile
  useEffect(() => {
    if (profileData) {
      setDocuments((prev) => ({
        ...prev,
        nidImage: {
          ...prev.nidImage,
          preview: getFileUrl(profileData.nidImage),
          uploaded: !!profileData.nidImage,
          fileType: getFileType(profileData.nidImage),
        },
        tradeLicenseDocument: {
          ...prev.tradeLicenseDocument,
          preview: getFileUrl(profileData.tradeLicenseDocument),
          uploaded: !!profileData.tradeLicenseDocument,
          fileType: getFileType(profileData.tradeLicenseDocument),
        },
        businessLogo: {
          ...prev.businessLogo,
          preview: getFileUrl(profileData.businessLogo),
          uploaded: !!profileData.businessLogo,
          fileType: getFileType(profileData.businessLogo),
        },
        etinDocument: {
          ...prev.etinDocument,
          preview: getFileUrl(profileData.etinDocument),
          uploaded: !!profileData.etinDocument,
          fileType: getFileType(profileData.etinDocument),
        },
        binDocument: {
          ...prev.binDocument,
          preview: getFileUrl(profileData.binDocument),
          uploaded: !!profileData.binDocument,
          fileType: getFileType(profileData.binDocument),
        },
      }));
    }
  }, [profileData]);

  // Redirect to profile if mandatory profile fields are incomplete
  useEffect(() => {
    if (profileData) {
      const completedCount = MANDATORY_PROFILE_FIELDS.filter(
        (field) => !!profileData[field as keyof OwnerProfile],
      ).length;
      if (completedCount < MANDATORY_PROFILE_FIELDS.length) {
        router.push("/owner-profile/profile");
      }
    }
  }, [profileData, router]);

  const uploadDocumentsMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      (Object.keys(documents) as DocumentType[]).forEach((key) => {
        const doc = documents[key];
        if (doc.file) {
          formData.append(key, doc.file);
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

  const handleFileSelect = (
    docType: DocumentType,
    file: File,
    preview: string,
  ) => {
    setDocuments((prev) => ({
      ...prev,
      [docType]: {
        file,
        preview,
        uploaded: false,
        fileType: file.type,
      },
    }));
  };

  const handleRemoveDocument = (docType: DocumentType) => {
    if (documents[docType].uploaded) {
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] dark:bg-slate-950 pb-16 font-sans">
        <div className="container mx-auto max-w-7xl px-4 pt-6 pb-8 lg:px-8 space-y-6">
          <Skeleton className="h-10 w-full max-w-xs rounded-xl" />
          <Skeleton className="h-4 w-64 rounded" />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-40 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const isApproved = status === "APPROVED";

  // Count only mandatory documents for progress
  const uploadedMandatoryCount = MANDATORY_DOCUMENT_FIELDS.filter(
    (key) => documents[key].preview || documents[key].uploaded,
  ).length;
  const totalMandatoryDocs = MANDATORY_DOCUMENT_FIELDS.length;

  // All mandatory documents must be present to submit
  const allMandatoryUploaded =
    uploadedMandatoryCount === totalMandatoryDocs;

  return (
    <div className="min-h-screen bg-[#f5f5f5] dark:bg-slate-950 pb-16 font-sans antialiased">
      <OwnerProfileHeader profile={profileData} currentStep="documents" />

      <div className="container mx-auto max-w-7xl px-4 pt-6 pb-8 lg:px-8">
        <div className="w-full">
          <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            {/* Header with Progress */}
            <CardHeader className="border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 sm:p-6">
              <div className="min-w-0">
                <CardTitle className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  Upload Documents
                </CardTitle>
                <CardDescription className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
                  Upload required documents for verification.
                </CardDescription>
              </div>

              <div className="flex flex-col items-stretch md:items-end w-full md:w-auto md:min-w-[220px]">
                <div className="flex items-center justify-between md:justify-end gap-2">
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Mandatory Documents
                  </p>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {uploadedMandatoryCount}/{totalMandatoryDocs}
                  </span>
                </div>
                <div className="mt-1.5 w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
                  <div
                    className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                    style={{
                      width: `${(uploadedMandatoryCount / totalMandatoryDocs) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-8 p-6 sm:p-8">
              {/* ===== MANDATORY DOCUMENTS ===== */}
              <div>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {MANDATORY_DOCUMENT_CONFIGS.map((config) => (
                    <DocumentUploadField
                      key={config.key}
                      docType={config.key}
                      document={documents[config.key]}
                      label={config.label}
                      description={config.description}
                      icon={config.icon}
                      status={status}
                      onFileSelect={handleFileSelect}
                      onRemove={handleRemoveDocument}
                    />
                  ))}
                </div>
              </div>

              {/* ===== OPTIONAL DOCUMENTS ===== */}
              <div>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {OPTIONAL_DOCUMENT_CONFIGS.map((config) => (
                    <DocumentUploadField
                      key={config.key}
                      docType={config.key}
                      document={documents[config.key]}
                      label={config.label}
                      description={config.description}
                      icon={config.icon}
                      status={status}
                      onFileSelect={handleFileSelect}
                      onRemove={handleRemoveDocument}
                    />
                  ))}
                </div>
              </div>

              {/* Action Bar */}
              <div className="pt-4 flex justify-end border-t border-slate-100 dark:border-slate-800">
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
                    size="sm"
                    className="px-5 py-2 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-sm"
                    disabled={
                      !allMandatoryUploaded || uploadDocumentsMutation.isPending
                    }
                    onClick={() => uploadDocumentsMutation.mutate()}
                  >
                    {uploadDocumentsMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                     Submit for Review
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