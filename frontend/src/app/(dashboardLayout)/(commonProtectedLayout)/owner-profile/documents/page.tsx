"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Upload,
  FileText,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiResponse } from "@/types/api.type";
import { toast } from "sonner";
import { getOwnerProfile } from "../_action";
import {
  uploadDocumentsClient,
  deleteDocumentClient,
} from "../_client-api";
import { OwnerProfile, DocumentFile, DocumentType } from "../_types";

import OwnerProfileHeader from "../_components/OwnerProfileHeader";
import DocumentUploadField from "../_components/DocumentUploadField";
import { getFileType, getFileUrl } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const documentConfigs: Array<{
  key: DocumentType;
  label: string;
  description: string;
  icon: "nid" | "registration" | "license" | "tax" | "logo" | "default";
}> = [
  {
    key: "nidImageFront",
    label: "National ID - Front",
    description: "Upload the front side of your NID",
    icon: "nid",
  },
  {
    key: "nidImageBack",
    label: "National ID - Back",
    description: "Upload the back side of your NID",
    icon: "nid",
  },
  {
    key: "businessRegistrationDocument",
    label: "Business Registration",
    description: "Upload your business registration certificate",
    icon: "registration",
  },
  {
    key: "tradeLicenseDocument",
    label: "Trade License",
    description: "Upload your trade license certificate",
    icon: "license",
  },
  {
    key: "taxIdentificationDocument",
    label: "Tax Identification Document",
    description: "Upload your tax ID or BIN certificate",
    icon: "tax",
  },
  {
    key: "businessLogo",
    label: "Business Logo",
    description: "Upload your business logo",
    icon: "logo",
  },
];

const initialDocumentState: Record<DocumentType, DocumentFile> = {
  nidImageFront: { file: null, preview: null, uploaded: false, fileType: null },
  nidImageBack: { file: null, preview: null, uploaded: false, fileType: null },
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
  businessLogo: { file: null, preview: null, uploaded: false, fileType: null },
};

export default function DocumentsStepPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [documents, setDocuments] = useState<
    Record<DocumentType, DocumentFile>
  >(initialDocumentState);

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

  useEffect(() => {
    if (profileData) {
      setDocuments((prev) => ({
        ...prev,
        nidImageFront: {
          ...prev.nidImageFront,
          preview: getFileUrl(profileData.nidImageFront),
          uploaded: !!profileData.nidImageFront,
          fileType: getFileType(profileData.nidImageFront),
        },
        nidImageBack: {
          ...prev.nidImageBack,
          preview: getFileUrl(profileData.nidImageBack),
          uploaded: !!profileData.nidImageBack,
          fileType: getFileType(profileData.nidImageBack),
        },
        businessRegistrationDocument: {
          ...prev.businessRegistrationDocument,
          preview: getFileUrl(profileData.businessRegistrationDocument),
          uploaded: !!profileData.businessRegistrationDocument,
          fileType: getFileType(profileData.businessRegistrationDocument),
        },
        tradeLicenseDocument: {
          ...prev.tradeLicenseDocument,
          preview: getFileUrl(profileData.tradeLicenseDocument),
          uploaded: !!profileData.tradeLicenseDocument,
          fileType: getFileType(profileData.tradeLicenseDocument),
        },
        taxIdentificationDocument: {
          ...prev.taxIdentificationDocument,
          preview: getFileUrl(profileData.taxIdentificationDocument),
          uploaded: !!profileData.taxIdentificationDocument,
          fileType: getFileType(profileData.taxIdentificationDocument),
        },
        businessLogo: {
          ...prev.businessLogo,
          preview: getFileUrl(profileData.businessLogo),
          uploaded: !!profileData.businessLogo,
          fileType: getFileType(profileData.businessLogo),
        },
      }));
    }
  }, [profileData]);

  useEffect(() => {
    const hasProfile = profileData !== undefined && profileData !== null;
    if (hasProfile && profileData) {
      const requiredFields = [
        profileData.companyName,
        profileData.bussinessEmail,
        profileData.contactNumber,
        profileData.address,
        profileData.nidNumber,
        profileData.businessRegistrationNumber,
        profileData.tradeLicenseNumber,
      ];
      const completedCount = requiredFields.filter(Boolean).length;
      if (completedCount < 7) {
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
    preview: string
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
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-10 w-10 animate-spin text-purple-600" />
      </div>
    );
  }

  const isApproved = status === "APPROVED";
  const uploadedCount = Object.values(documents).filter(
    (document) => document.preview || document.uploaded
  ).length;

  const totalDocs = documentConfigs.length;

  return (
    <div className="min-h-screen bg-[#f5f5f5] dark:bg-slate-950 pb-16 font-sans antialiased">
      <OwnerProfileHeader profile={profileData} currentStep="documents" />

      <div className="container mx-auto max-w-7xl px-4 pt-6 pb-8 lg:px-8">
        <div className="w-full">
          <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            {/* Header with Side-by-Side Progress */}
            <CardHeader className="border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6">
              <div>
                <CardTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  Upload Documents
                </CardTitle>
                <CardDescription className="text-slate-500 dark:text-slate-400 mt-1">
                  Upload required documents for verification. Accepted: PDF, JPG, PNG
                </CardDescription>
              </div>

              <div className="flex flex-col items-start md:items-end min-w-[220px]">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Document Upload:{" "}
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {uploadedCount}/{totalDocs}
                  </span>{" "}
                  documents
                </p>
                <div className="mt-1.5 w-full max-w-xs h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
                  <div
                    className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                    style={{ width: `${(uploadedCount / totalDocs) * 100}%` }}
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 p-6 sm:p-8">
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {documentConfigs.map((config) => (
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
                    Documents Locked (Approved)
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="px-5 py-2 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-sm"
                    disabled={
                      Object.values(documents).some(
                        (document) => !document.preview
                      ) || uploadDocumentsMutation.isPending
                    }
                    onClick={() => uploadDocumentsMutation.mutate()}
                  >
                    {uploadDocumentsMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    Submit Documents for Review
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