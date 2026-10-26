"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Clock3,
  ChevronDown,
  Download,
  Eye,
  FileText,
  Image,
  Mail,
  MapPin,
  Phone,
  User,
  XCircle,
  Building2,
  Briefcase,
  CreditCard,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { httpClient } from "@/lib/axios/httpClient";
import { API_BASE_URL } from "@/lib/api/config";
import { ApiResponse } from "@/types/api.type";
import { updateOwnerApplicationStatus } from "../_action";
import { getFileUrl } from "@/lib/utils";
import { toast } from "sonner";

type Decision = "approve" | "pending" | "reject";

const decisionToStatus: Record<Decision, string> = {
  approve: "APPROVED",
  pending: "PENDING",
  reject: "REJECTED",
};

type OwnerApplicationDetail = {
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
    id: string;
    name: string;
    email: string;
    image: string | null;
    role?: string;
  };
};

type DocumentField =
  | "businessLogo"
  | "nidImage"
  | "tradeLicenseDocument"
  | "etinDocument"
  | "binDocument";

interface DocumentFieldConfig {
  key: DocumentField;
  label: string;
  icon: React.ElementType;
  mandatory: boolean;
}

// Documents grouped by mandatory/optional
const MANDATORY_DOCUMENT_FIELDS: DocumentFieldConfig[] = [
  { key: "businessLogo", label: "Business Logo", icon: Image, mandatory: true },
  { key: "nidImage", label: "National ID", icon: FileText, mandatory: true },
  {
    key: "tradeLicenseDocument",
    label: "Trade License",
    icon: FileText,
    mandatory: true,
  },
];

const OPTIONAL_DOCUMENT_FIELDS: DocumentFieldConfig[] = [
  {
    key: "etinDocument",
    label: "ETIN Document",
    icon: FileText,
    mandatory: false,
  },
  {
    key: "binDocument",
    label: "BIN Document",
    icon: FileText,
    mandatory: false,
  },
];

const statusBadge: Record<
  OwnerApplicationDetail["verificationStatus"],
  React.ReactElement
> = {
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
  APPROVED: <Badge className="bg-green-600">Approved</Badge>,
  REJECTED: <Badge variant="destructive">Rejected</Badge>,
};

function isImageUrl(url: string | null | undefined) {
  if (!url) return false;
  return /\.(jpe?g|png|webp|gif)(\?.*)?$/i.test(url);
}

function isPdfUrl(url: string | null | undefined) {
  if (!url) return false;
  return /\.pdf(\?.*)?$/i.test(url);
}

function getFileName(url: string) {
  const lastSegment = url.split("?")[0].split("#")[0].split("/").pop();
  return lastSegment ? decodeURIComponent(lastSegment) : "document";
}

export default function OwnerApplicationDetailPage() {
  const router = useRouter();
  const params = useParams<{ profileId: string }>();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [reason, setReason] = useState("");

  const { data, isLoading } = useQuery<ApiResponse<OwnerApplicationDetail>>({
    queryKey: ["owner-application", params.profileId],
    enabled: !!params.profileId,
    queryFn: async () => {
      const res = await httpClient.get<OwnerApplicationDetail>(
        `/owner-applications/${params.profileId}`,
      );
      return res;
    },
  });

  const updateStatus = useMutation({
    mutationFn: ({
      profileId,
      selectedDecision,
      note,
    }: {
      profileId: string;
      selectedDecision: Decision;
      note?: string;
    }) =>
      updateOwnerApplicationStatus(profileId, {
        status: decisionToStatus[selectedDecision],
        reason: selectedDecision === "approve" ? undefined : note?.trim(),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["owner-application", params.profileId],
      });
      setDecision(null);
      setReason("");
    },
  });

  useEffect(() => {
    if (data && !data.success) setError(data.message);
    if (!data && error) setError(error);
  }, [data, error]);

  if (isLoading) {
    return (
      <section className="dashboard-section">
        <p className="dashboard-empty">Loading owner application...</p>
      </section>
    );
  }

  if (!data?.success || !data.data) {
    return (
      <section className="dashboard-section space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            router.push("/super-admin/dashboard/owner-applications")
          }
        >
          <ArrowLeft className="h-3 w-3" /> Back
        </Button>
        <Alert variant="destructive">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle>Owner application not found</AlertTitle>
          <AlertDescription>
            {data?.message || "The requested owner application does not exist."}
          </AlertDescription>
        </Alert>
      </section>
    );
  }

  const owner = data.data;

  const openDecision = (nextDecision: Decision) => {
    setDecision(nextDecision);
    setReason(owner.rejectionReason ?? "");
  };

  const confirmDecision = () => {
    if (!decision) return;
    if (decision !== "approve" && !reason.trim()) return;
    updateStatus.mutate({
      profileId: owner.id,
      selectedDecision: decision,
      note: reason,
    });
  };

  return (
    <section className="dashboard-section space-y-4">
      {/* Header / Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          variant="glass"
          size="sm"
          onClick={() =>
            router.push("/super-admin/dashboard/owner-applications")
          }
        >
          <ArrowLeft className="h-3 w-3" /> Back
        </Button>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {statusBadge[owner.verificationStatus]}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                disabled={updateStatus.isPending}
              >
                Update status <ChevronDown className="ml-1.5 size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {owner.verificationStatus !== "APPROVED" && (
                <DropdownMenuItem onClick={() => openDecision("approve")}>
                  <CheckCircle2 className="mr-2 size-4 text-primary" /> Approve
                </DropdownMenuItem>
              )}
              {owner.verificationStatus !== "PENDING" && (
                <DropdownMenuItem onClick={() => openDecision("pending")}>
                  <Clock3 className="mr-2 size-4 text-amber-500" /> Mark as Pending
                </DropdownMenuItem>
              )}
              {owner.verificationStatus !== "REJECTED" && (
                <DropdownMenuItem
                  onClick={() => openDecision("reject")}
                  className="text-destructive"
                >
                  <XCircle className="mr-2 size-4" /> Reject
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ===== 1. OWNER PROFILE (first) ===== */}
      <Card className="border-border/70 shadow-sm">
        <CardHeader className="px-4 py-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-primary" />
            Owner Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 px-4 pb-4 pt-0">
          {/* Mandatory fields */}
          <div>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Required Information
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <FieldValue
                icon={Building2}
                label="Company Name"
                value={owner.companyName ?? "N/A"}
              />
              <FieldValue
                icon={Mail}
                label="Business Email"
                value={owner.bussinessEmail ?? "N/A"}
              />
              <FieldValue
                icon={Phone}
                label="Contact Number"
                value={owner.contactNumber ?? "N/A"}
              />
              <FieldValue
                icon={MapPin}
                label="Business Address"
                value={owner.address ? (owner.address.length > 50 ? owner.address.slice(0, 50) + "…" : owner.address) : "N/A"}
                className="sm:col-span-2 lg:col-span-1"
              />
              <FieldValue
                icon={CreditCard}
                label="NID Number"
                value={owner.nidNumber ?? "N/A"}
              />
              <FieldValue
                icon={FileText}
                label="Trade License Number"
                value={owner.tradeLicenseNumber ?? "N/A"}
              />
            </div>
          </div>

          {/* Optional fields */}
          <div>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Optional Information
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <FieldValue
                icon={FileText}
                label="ETIN"
                value={owner.etin ?? "N/A"}
              />
              <FieldValue
                icon={FileText}
                label="BIN"
                value={owner.bin ?? "N/A"}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ===== 2. USER INFORMATION (second) ===== */}
      <Card className="border-border/70 shadow-sm">
        <CardHeader className="px-4 py-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            User Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 px-4 pb-4 pt-0 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center gap-2">
            <Avatar className="size-9">
              <AvatarImage
                src={owner.user.image || undefined}
                alt={owner.user.name}
              />
              <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                {owner.user.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{owner.user.name}</p>
              <p className="text-xs text-muted-foreground">
                {owner.user.email}
              </p>
            </div>
          </div>
          <FieldValue icon={Mail} label="Email" value={owner.user.email} />
          <FieldValue
            icon={User}
            label="Role"
            value={owner.user.role ?? "N/A"}
          />
       
        </CardContent>
      </Card>

      {/* ===== 3. DOCUMENTS ===== */}
      <Card className="border-border/70 shadow-sm">
        <CardHeader className="px-4 py-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Documents
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 px-4 pb-4 pt-0">
          {/* Mandatory documents */}
          <div>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Required Documents
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {MANDATORY_DOCUMENT_FIELDS.map((field) => (
                <DocumentCard
                  key={field.key}
                  field={field}
                  url={owner[field.key]}
                />
              ))}
            </div>
          </div>

          {/* Optional documents */}
          <div>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Optional Documents
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {OPTIONAL_DOCUMENT_FIELDS.map((field) => (
                <DocumentCard
                  key={field.key}
                  field={field}
                  url={owner[field.key]}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rejection reason — show if rejected */}
      {owner.rejectionReason && (
        <Alert variant="destructive">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle>Rejection Reason</AlertTitle>
          <AlertDescription>{owner.rejectionReason}</AlertDescription>
        </Alert>
      )}

      <p className="text-xs text-muted-foreground">
        Created at: {new Date(owner.createdAt).toLocaleString()} · Updated at:{" "}
        {new Date(owner.updatedAt).toLocaleString()}
      </p>

      {/* Decision Dialog */}
      <AlertDialog
        open={Boolean(decision)}
        onOpenChange={(open) => !open && setDecision(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {decision === "approve"
                ? "Approve owner application"
                : decision === "reject"
                ? "Reject owner application"
                : "Return application to pending"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {decision === "approve"
                ? `${owner.user.name} will be promoted to ADMIN and can manage turfs immediately.`
                : "Add a reason so the owner knows what action is needed next."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {decision !== "approve" && (
            <Input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={
                decision === "reject"
                  ? "Explain why the application was rejected"
                  : "Describe what information is still needed"
              }
            />
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDecision}
              disabled={
                updateStatus.isPending ||
                (decision !== "approve" && !reason.trim())
              }
              className={
                decision === "reject"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : undefined
              }
            >
              {updateStatus.isPending
                ? "Saving..."
                : decision === "approve"
                ? "Approve owner"
                : decision === "reject"
                ? "Reject application"
                : "Save pending reason"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

/* ===== Helper Components ===== */

function DocumentCard({
  field,
  url,
}: {
  field: DocumentFieldConfig;
  url: string | null;
}) {
  const Icon = field.icon;
  const fullUrl = getFileUrl(url);
  const imagePreview = fullUrl && isImageUrl(fullUrl);
  const pdfPreview = fullUrl && isPdfUrl(fullUrl);
  const [isDownloading, setIsDownloading] = useState(false);
  const fileName = fullUrl ? getFileName(fullUrl) : "";

  const handleDownload = async () => {
    if (!fullUrl) return;
    setIsDownloading(true);
    try {
      const response = await fetch(fullUrl);
      if (!response.ok) throw new Error("Download request failed");
      const objectUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(objectUrl);
    } catch {
      toast.error("Could not download the file. Opening it instead.");
      window.open(fullUrl, "_blank", "noopener,noreferrer");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-muted/10 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="truncate">{field.label}</span>
          {field.mandatory && (
            <span className="text-destructive text-xs">*</span>
          )}
        </div>
        {fullUrl && (
          <div className="flex shrink-0 items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              asChild
              className="size-7 text-primary hover:bg-primary/10 hover:text-primary"
              title={`View ${field.label}`}
              aria-label={`View ${field.label}`}
            >
              <a href={fullUrl} target="_blank" rel="noreferrer">
                <Eye className="size-3.5" />
              </a>
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleDownload}
              disabled={isDownloading}
              className="size-7 text-primary hover:bg-primary/10 hover:text-primary"
              title={`Download ${fileName}`}
              aria-label={`Download ${fileName}`}
            >
              <Download className="size-3.5" />
            </Button>
          </div>
        )}
      </div>
      {fullUrl ? (
        imagePreview ? (
          <img
            src={fullUrl}
            alt={field.label}
            className="aspect-video w-full rounded border border-border object-contain bg-muted/30"
          />
        ) : pdfPreview ? (
          <div className="space-y-2">
            <iframe
              src={fullUrl}
              title={`${field.label} preview`}
              className="h-44 w-full rounded border border-border bg-white"
            />
            <a
              href={fullUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary underline"
            >
              <FileText className="h-4 w-4" /> Open preview
            </a>
          </div>
        ) : (
          <a
            href={fullUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-sm text-primary underline"
          >
            <FileText className="h-4 w-4" /> View document
          </a>
        )
      ) : (
        <p className="text-sm text-muted-foreground">Not uploaded</p>
      )}
    </div>
  );
}

function FieldValue({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon?: React.ElementType;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="mb-1 flex items-center gap-2 text-xs font-medium text-muted-foreground">
        {Icon && <Icon className="h-4 w-4" />} {label}
      </div>
      <p className="text-sm font-medium break-words">{value}</p>
    </div>
  );
}