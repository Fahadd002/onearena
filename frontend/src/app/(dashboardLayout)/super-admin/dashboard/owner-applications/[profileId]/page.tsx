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
  FileText,
  Image,
  Mail,
  MapPin,
  Phone,
  User,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { httpClient } from "@/lib/axios/httpClient";
import { API_BASE_URL } from "@/lib/api/config";
import { ApiResponse } from "@/types/api.type";
import { updateOwnerApplicationStatus } from "../_action";

type Decision = "approve" | "pending" | "reject";

const decisionToStatus: Record<Decision, string> = {
  approve: "APPROVED",
  pending: "PENDING",
  reject: "REJECTED",
};

type OwnerApplicationDetail = {
  id: string;
  userId: string;
  companyName: string | null;
  bussinessEmail: string | null;
  contactNumber: string | null;
  address: string | null;
  nidNumber: string | null;
  businessRegistrationNumber: string | null;
  tradeLicenseNumber: string | null;
  businessLogo: string | null;
  nidImageFront: string | null;
  nidImageBack: string | null;
  businessRegistrationDocument: string | null;
  tradeLicenseDocument: string | null;
  taxIdentificationDocument: string | null;
  verificationStatus: "CREATED" | "PENDING" | "SUBMITTED" | "APPROVED" | "REJECTED";
  verifiedById: string | null;
  verifiedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  user: { id: string; name: string; email: string; image: string | null; role?: string };
};

type DocumentField =
  | "businessLogo"
  | "nidImageFront"
  | "nidImageBack"
  | "businessRegistrationDocument"
  | "tradeLicenseDocument"
  | "taxIdentificationDocument";

const DOCUMENT_FIELDS: { key: DocumentField; label: string; icon: React.ElementType }[] = [
  { key: "businessLogo", label: "Business logo", icon: Image },
  { key: "nidImageFront", label: "NID front", icon: FileText },
  { key: "nidImageBack", label: "NID back", icon: FileText },
  { key: "businessRegistrationDocument", label: "Business registration", icon: FileText },
  { key: "tradeLicenseDocument", label: "Trade license", icon: FileText },
  { key: "taxIdentificationDocument", label: "Tax identification", icon: FileText },
];

const statusBadge: Record<OwnerApplicationDetail["verificationStatus"], React.ReactElement> = {
  CREATED: <Badge variant="outline" className="border-slate-500 text-slate-600">Created</Badge>,
  PENDING: <Badge variant="outline" className="border-amber-500 text-amber-600">Pending</Badge>,
  SUBMITTED: <Badge variant="outline" className="border-blue-500 text-blue-600">Submitted</Badge>,
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
      const res = await httpClient.get<OwnerApplicationDetail>(`/owner-applications/${params.profileId}`);
      return res;
    },
  });

  const updateStatus = useMutation({
    mutationFn: ({ profileId, selectedDecision, note }: { profileId: string; selectedDecision: Decision; note?: string }) =>
      updateOwnerApplicationStatus(profileId, {
        status: decisionToStatus[selectedDecision],
        reason: selectedDecision === "approve" ? undefined : note?.trim(),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["owner-application", params.profileId] });
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
        <Button variant="ghost" size="sm" onClick={() => router.push("/super-admin/dashboard/owner-applications")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to applications
        </Button>
        <Alert variant="destructive">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle>Owner application not found</AlertTitle>
          <AlertDescription>{data?.message || "The requested owner application does not exist."}</AlertDescription>
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
    updateStatus.mutate({ profileId: owner.id, selectedDecision: decision, note: reason });
  };

  return (
    <section className="dashboard-section max-w-5xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="glass" size="sm" onClick={() => router.push("/super-admin/dashboard/owner-applications")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to applications
        </Button>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {statusBadge[owner.verificationStatus]}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" disabled={updateStatus.isPending}>
                Update status <ChevronDown className="ml-1.5 size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openDecision("approve")}>
                <CheckCircle2 className="mr-2 size-4 text-primary" /> Approve
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openDecision("pending")}>
                <Clock3 className="mr-2 size-4 text-amber-500" /> Mark as Pending
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openDecision("reject")} className="text-destructive">
                <XCircle className="mr-2 size-4" /> Reject
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardHeader className="px-4 py-3">
          <CardTitle className="text-base">Applicant information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 px-4 pb-4 pt-0 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center gap-2">
            <Avatar className="size-9">
              <AvatarImage src={owner.user.image || undefined} alt={owner.user.name} />
              <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                {owner.user.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{owner.user.name}</p>
              <p className="text-xs text-muted-foreground">{owner.user.email}</p>
            </div>
          </div>
          <FieldValue icon={Phone} label="Contact" value={owner.contactNumber ?? "N/A"} />
          <FieldValue icon={Mail} label="Email" value={owner.user.email} />
          <FieldValue icon={User} label="Role" value={owner.user.role ?? "N/A"} />
          <FieldValue icon={MapPin} label="Address" value={owner.address ?? "N/A"} className="sm:col-span-2 lg:col-span-2" />
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-sm">
        <CardHeader className="px-4 py-3">
          <CardTitle className="text-base">Owner profile</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 px-4 pb-4 pt-0 sm:grid-cols-2 lg:grid-cols-3">
          <FieldValue label="Company name" value={owner.companyName ?? "N/A"} />
          <FieldValue label="Business email" value={owner.bussinessEmail ?? "N/A"} />
          <FieldValue label="NID number" value={owner.nidNumber ?? "N/A"} />
          <FieldValue label="Business registration number" value={owner.businessRegistrationNumber ?? "N/A"} />
          <FieldValue label="Trade license number" value={owner.tradeLicenseNumber ?? "N/A"} />
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-sm">
        <CardHeader className="px-4 py-3">
          <CardTitle className="text-base">Documents</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 px-4 pb-4 pt-0 sm:grid-cols-2 lg:grid-cols-3">
          {DOCUMENT_FIELDS.map((field) => {
            const url = owner[field.key];
            const Icon = field.icon;
            const fullUrl = getFileUrl(url);
            const imagePreview = fullUrl && isImageUrl(fullUrl);
            const pdfPreview = fullUrl && isPdfUrl(fullUrl);
            return (
              <div key={field.key} className="rounded-lg border border-border bg-muted/10 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
                    <Icon className="h-4 w-4 text-muted-foreground" /> {field.label}
                  </div>
                  {fullUrl && (
                    <a
                      href={fullUrl}
                      download={fullUrl}
                      className="inline-flex shrink-0 items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/20"
                    >
                      <Download className="h-3 w-3" /> Download
                    </a>
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
          })}
        </CardContent>
      </Card>

      {(owner.rejectionReason || owner.verifiedAt) && (
        <Card>
          <CardHeader className="px-4 py-3">
            <CardTitle className="text-base">Verification history</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 px-4 pb-4 pt-0 text-sm">
            <p><span className="text-muted-foreground">Verified by:</span> {owner.verifiedById ?? "N/A"}</p>
            <p><span className="text-muted-foreground">Verified at:</span> {owner.verifiedAt ? new Date(owner.verifiedAt).toLocaleString() : "N/A"}</p>
            {owner.rejectionReason && (
              <Alert variant="destructive" className="mt-2">
                <AlertTitle>Rejection reason</AlertTitle>
                <AlertDescription>{owner.rejectionReason}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        Created at: {new Date(owner.createdAt).toLocaleString()} · Updated at: {new Date(owner.updatedAt).toLocaleString()}
      </p>

      <AlertDialog open={Boolean(decision)} onOpenChange={(open) => !open && setDecision(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {decision === "approve" ? "Approve owner application" : decision === "reject" ? "Reject owner application" : "Return application to pending"}
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
              placeholder={decision === "reject" ? "Explain why the application was rejected" : "Describe what information is still needed"}
            />
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDecision}
              disabled={updateStatus.isPending || (decision !== "approve" && !reason.trim())}
              className={decision === "reject" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : undefined}
            >
              {updateStatus.isPending ? "Saving..." : decision === "approve" ? "Approve owner" : decision === "reject" ? "Reject application" : "Save pending reason"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function getFileUrl(url: string | null | undefined) {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  const apiOrigin = API_BASE_URL.replace(/\/api\/v1\/?$/, "");
  return `${apiOrigin}${url.startsWith("/") ? url : `/${url}`}`;
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
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
