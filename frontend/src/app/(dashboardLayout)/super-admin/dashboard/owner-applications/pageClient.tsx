"use client";

import { useEffect, useState, Fragment } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpDown,
  CheckCircle2,
  Clock3,
  Eye,
  MoreVertical,
  Phone,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/premium/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableEmptyState, TableLoadingState } from "@/components/common/TableStates";
import { TablePagination } from "@/components/common/TablePagination";
import { usePagination } from "@/hooks/usePagination";
import { useSearch } from "@/context/SearchContext";
import { useSort } from "@/hooks/useSort";
import { updateOwnerApplicationStatus } from "./_action";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { httpClient } from "@/lib/axios/httpClient";
import { API_ENDPOINTS } from "@/lib/api/config";

type OwnerApplication = {
  id: string;
  contactNumber: string;
  address: string;
  gender: "MALE" | "FEMALE" | null;
  nidNumber: string;
  businessRegistrationNumber: string;
  tradeLicenseNumber: string;
  verificationStatus: "PENDING" | "SUBMITTED" | "APPROVED" | "REJECTED";
  rejectionReason: string | null;
  updatedAt: string;
  companyName: string | null;
  user: { id: string; name: string; email: string; image: string | null };
};

type Decision = "approve" | "pending" | "reject";

const decisionToStatus: Record<Decision, string> = {
  approve: "APPROVED",
  reject: "REJECTED",
  pending: "PENDING",
};

/** Sort Header Component */
function SortHeader({
  field,
  label,
  sortField,
  handleSort,
}: {
  field: string;
  label: string;
  sortField: string;
  handleSort: (field: string) => void;
}) {
  return (
    <TableHead className="px-1 py-1 font-semibold border-b border-border">
      <button
        type="button"
        className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => handleSort(field)}
      >
        {label}
        {sortField === field && (
          <ArrowUpDown className="h-3 w-3 text-primary" />
        )}
      </button>
    </TableHead>
  );
}

/** Status Badge Helper */
function getStatusBadge(status: OwnerApplication["verificationStatus"]) {
  switch (status) {
    case "APPROVED":
      return (
        <Badge className="h-8 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 flex items-center justify-center">
          Approved
        </Badge>
      );
    case "REJECTED":
      return (
        <Badge className="h-8 bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 flex items-center justify-center">
          Rejected
        </Badge>
      );
    case "PENDING":
      return (
        <Badge className="h-8 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 flex items-center justify-center">
          Pending
        </Badge>
      );
    case "SUBMITTED":
      return (
        <Badge className="h-8 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 flex items-center justify-center">
          Submitted
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="h-8 flex items-center justify-center">
          {status}
        </Badge>
      );
  }
}

export default function SuperAdminOwnerApplicationsPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { registerHandler, unregisterHandler, setPlaceholder } = useSearch();
  const pagination = usePagination(10);
  const [search, setSearch] = useState("");
  const { sortField, sortDirection, handleSort, getSortParams } = useSort(
    "updatedAt",
    "desc"
  );
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selection, setSelection] = useState<{ application: OwnerApplication; decision: Decision } | null>(null);
  const [reason, setReason] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    setPlaceholder("Search owner, email, phone, or NID...");
    const handler = (query: string) => {
      setSearch(query);
      pagination.resetPage();
    };
    registerHandler(handler);
    return () => unregisterHandler();
  }, [registerHandler, unregisterHandler, setPlaceholder, pagination]);


  const { data: pageData, isLoading } = useQuery({
    queryKey: [
      "owner-applications",
      search,
      sortField,
      sortDirection,
      statusFilter,
      pagination.page,
      pagination.pageSize,
    ],
    queryFn: async () => {
      const { sortBy, sortOrder } = getSortParams();
      const params: Record<string, unknown> = {
        search: search || undefined,
        sortBy,
        sortOrder,
        page: String(pagination.page),
        limit: String(pagination.pageSize),
        status: statusFilter || undefined,
      };
      const result = await httpClient.get<{
        data: OwnerApplication[];
        meta: { page: number; limit: number; total: number; totalPages: number };
      }>(API_ENDPOINTS.auth.ownerApplications, { params });
      return (
        result.data ?? {
          data: [],
          meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
        }
      );
    },
  });


  const applications = pageData?.data ?? [];
  const meta = pageData?.meta;

  useEffect(() => {
    if (meta?.total !== undefined) {
      pagination.setTotal(meta.total);
    }
  }, [meta?.total, pagination]);

  const reload = () => {
    void queryClient.invalidateQueries({
      queryKey: ["owner-applications"],
    });
  };

  const updateStatus = useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: Decision; note?: string }) =>
      updateOwnerApplicationStatus(id, { status: decisionToStatus[status], reason: note }),
    onSuccess: (_, input) => {
      reload();
      toast.success(
        input.status === "approve" ? "Owner approved and granted admin access"
          : input.status === "reject" ? "Application rejected"
          : "Application returned to pending",
      );
      setSelection(null);
      setReason("");
    },
    onError: (err: Error) => toast.error(err.message || "Could not update application"),
  });

  const openDecision = (application: OwnerApplication, type: Decision) => {
    setSelection({ application, decision: type });
    setReason(application.rejectionReason || "");
  };

  const confirm = () => {
    if (!selection) return;
    if (selection.decision === "approve") {
      updateStatus.mutate({ id: selection.application.id, status: selection.decision });
      return;
    }
    if (!reason.trim()) {
      toast.error("A reason is required");
      return;
    }
    updateStatus.mutate({ id: selection.application.id, status: selection.decision, note: reason.trim() });
  };

  return (
    <section className="dashboard-section">
      <Card className="surface-elevated overflow-hidden">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
              <CardTitle>Owner Applications</CardTitle>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {isLoading ? (
                <Skeleton className="h-8 w-44 rounded-lg bg-muted" />
              ) : (
                <Select
                  value={statusFilter}
                  onValueChange={(value) => {
                    setStatusFilter(value);
                    pagination.resetPage();
                  }}
                >
                  <SelectTrigger className="w-44 text-sm h-8">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All statuses</SelectItem>
                    <SelectItem value="SUBMITTED">Submitted</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="overflow-x-auto border rounded-xl bg-card">
              <Table>
                <TableHeader className="bg-muted/40 border-b border-border">
                  <TableRow className="hover:bg-transparent border-b border-border">
                    <TableHead className="px-1 py-1 border-b border-border">
                      <Skeleton className="h-3 w-16 rounded" />
                    </TableHead>
                    <TableHead className="px-1 py-1 border-b border-border">
                      <Skeleton className="h-3 w-16 rounded" />
                    </TableHead>
                    <TableHead className="px-1 py-1 border-b border-border">
                      <Skeleton className="h-3 w-16 rounded" />
                    </TableHead>
                    <TableHead className="px-1 py-1 border-b border-border">
                      <Skeleton className="h-3 w-16 rounded" />
                    </TableHead>
                    <TableHead className="px-1 py-1 border-b border-border">
                      <Skeleton className="h-3 w-16 rounded" />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...Array(5)].map((_, i) => (
                    <TableRow key={i} className="border-b border-border">
                      <TableCell className="px-1 py-1">
                        <Skeleton className="h-4 w-full rounded" />
                      </TableCell>
                      <TableCell className="px-1 py-1">
                        <Skeleton className="h-4 w-full rounded" />
                      </TableCell>
                      <TableCell className="px-1 py-1">
                        <Skeleton className="h-4 w-full rounded" />
                      </TableCell>
                      <TableCell className="px-1 py-1">
                        <Skeleton className="h-4 w-full rounded" />
                      </TableCell>
                      <TableCell className="px-1 py-1">
                        <Skeleton className="h-4 w-full rounded" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/40 border-b border-border">
                    <TableRow className="hover:bg-transparent border-b border-border">
                      <TableHead className="px-1 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                        Company
                      </TableHead>
                      <TableHead className="px-1 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                        Applicant
                      </TableHead>
                      <TableHead className="px-1 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                        Contact
                      </TableHead>
                      <SortHeader
                        field="verificationStatus"
                        label="Status"
                        sortField={sortField}
                        handleSort={handleSort}
                      />
                      <TableHead className="px-1 py-1 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                        Action
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {applications.map((application) => (
                      <TableRow key={application.id} className="border-b border-border transition-colors hover:bg-muted/20">
                        <TableCell className="px-1 py-1">
                          {application.companyName ? (
                            <span className="text-xs font-medium text-foreground">{application.companyName}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>

                        <TableCell className="px-1 py-1">
                          <div className="font-semibold text-sm text-foreground leading-none">
                            {application.user.name}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {application.user.email}
                          </div>
                        </TableCell>

                        <TableCell className="px-1 py-1">
                          {application.contactNumber ? (
                            <a
                              href={`tel:${application.contactNumber}`}
                              className="inline-flex items-center gap-1.5 text-xs font-medium font-mono text-foreground hover:text-primary transition-colors"
                            >
                              <Phone className="w-3 h-3 text-muted-foreground" />
                              {application.contactNumber}
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>

                        <TableCell className="px-1 py-1">
                          {getStatusBadge(application.verificationStatus)}
                        </TableCell>

                        <TableCell className="px-1 py-1 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs font-medium border-border rounded-lg hover:bg-muted"
                              onClick={() => router.push(`/super-admin/dashboard/owner-applications/${application.id}`)}
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" />
                              View
                            </Button>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                  <MoreVertical className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                {application.verificationStatus !== "APPROVED" && (
                                  <DropdownMenuItem onClick={() => openDecision(application, "approve")} className="text-xs font-medium cursor-pointer">
                                    <CheckCircle2 className="mr-2 size-4 text-emerald-600" />
                                    Approve
                                  </DropdownMenuItem>
                                )}
                                {application.verificationStatus !== "PENDING" && (
                                  <DropdownMenuItem onClick={() => openDecision(application, "pending")} className="text-xs font-medium cursor-pointer">
                                    <Clock3 className="mr-2 size-4 text-amber-500" />
                                    Mark as Pending
                                  </DropdownMenuItem>
                                )}
                                {application.verificationStatus !== "REJECTED" && (
                                  <DropdownMenuItem
                                    onClick={() => openDecision(application, "reject")}
                                    className="text-xs font-medium text-rose-600 focus:text-rose-600 cursor-pointer"
                                  >
                                    <XCircle className="mr-2 size-4" />
                                    Reject
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {applications.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <TableEmptyState
                            message="No owner applications found"
                            description="New owner registrations will appear here for review."
                          />
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <TablePagination
                page={pagination.page}
                totalPages={meta?.totalPages ?? 1}
                total={meta?.total ?? 0}
                pageSize={pagination.pageSize}
                onPageChange={pagination.setPage}
                onPageSizeChange={pagination.setPageSize}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Decision Dialog */}
      <AlertDialog
        open={Boolean(selection)}
        onOpenChange={(open) => {
          if (!open) {
            setSelection(null);
            setReason("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-semibold">
              {selection?.decision === "approve"
                ? "Approve owner application"
                : selection?.decision === "reject"
                  ? "Reject owner application"
                  : "Return application to pending"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              {selection?.decision === "approve"
                ? `${selection.application.user.name} will be promoted to ADMIN and can manage turfs immediately.`
                : "The owner will see this message at the top of their profile."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {selection?.decision !== "approve" && (
            <Input
              className="text-xs"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={
                selection?.decision === "reject"
                  ? "Explain why the application was rejected"
                  : "Describe what information is still needed"
              }
            />
          )}
          {selection?.decision === "approve" && (
            <div className="flex gap-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
              <span>
                This action records you as the reviewer and grants the approved owner ADMIN access.
              </span>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel
              className="h-8 text-xs rounded-lg"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirm}
              className={`h-8 text-xs rounded-lg ${selection?.decision === "reject"
                ? "bg-rose-600 text-white hover:bg-rose-700"
                : selection?.decision === "approve"
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : ""
                }`}
              disabled={updateStatus.isPending}
            >
              {updateStatus.isPending
                ? "Saving..."
                : selection?.decision === "approve"
                  ? "Approve owner"
                  : selection?.decision === "reject"
                    ? "Reject application"
                    : "Save pending reason"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Image Preview */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreviewImage(null)}
        >
          <img
            src={previewImage}
            alt="Full profile"
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
          />
        </div>
      )}
    </section>
  );
}