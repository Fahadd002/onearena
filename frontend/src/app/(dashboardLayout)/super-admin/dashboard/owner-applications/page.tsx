"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpDown,
  CheckCircle2,
  Clock3,
  Eye,
  FileText,
  MapPin,
  MoreVertical,
  Phone,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableEmptyState, TableLoadingState } from "@/components/common/TableStates";
import { TablePagination } from "@/components/common/TablePagination";
import { ApiResponse } from "@/types/api.type";
import { usePagination } from "@/hooks/usePagination";
import { useSearch } from "@/context/SearchContext";
import { listOwnerApplications, updateOwnerApplicationStatus } from "./_action";

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
  user: { id: string; name: string; email: string; image: string | null };
};
type PaginatedResponse = {
  data: OwnerApplication[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};
type Decision = "approve" | "pending" | "reject";

const decisionToStatus: Record<Decision, string> = {
  approve: "APPROVED",
  reject: "REJECTED",
  pending: "PENDING",
};

export default function SuperAdminOwnerApplicationsPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { registerHandler, unregisterHandler, setPlaceholder } = useSearch();
  const pagination = usePagination(10);
  const [search, setSearch] = useState("");
  const [sortAsc, setSortAsc] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
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
    queryKey: ["owner-applications", { search, sortAsc, statusFilter, page: pagination.page, pageSize: pagination.pageSize }],
    queryFn: async () => {
      const result = await listOwnerApplications({
        search,
        sortBy: "updatedAt",
        sortOrder: sortAsc ? "asc" : "desc",
        page: String(pagination.page),
        limit: String(pagination.pageSize),
        status: statusFilter,
      });
      if (!result.success) throw new Error(result.message);
      return (result as ApiResponse<PaginatedResponse>).data ?? { data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } };
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
    void queryClient.invalidateQueries({ queryKey: ["owner-applications"] });
  };
  const updateStatus = useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: Decision; note?: string }) =>
      updateOwnerApplicationStatus(id, { status: decisionToStatus[status], reason: note }),
    onSuccess: (_, input) => {
      reload();
      toast.success(
        input.status === "approve"
          ? "Owner approved and granted admin access"
          : input.status === "reject"
            ? "Application rejected"
            : "Application returned to pending",
      );
      setSelection(null);
      setReason("");
    },
    onError: () => toast.error("Could not update application"),
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
    <section className="dashboard-section space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="dashboard-meta">Verification queue</p>
          <h1 className="dashboard-title mt-2">Owner applications</h1>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm">
          <span className="font-bold text-primary">{meta?.total ?? 0}</span>
          <span className="ml-1 text-muted-foreground">awaiting review</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); pagination.resetPage(); }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="SUBMITTED">Submitted</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <TableLoadingState message="Loading owner applications..." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/30 hover:bg-secondary/30">
                  <TableHead>Applicant</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>
                    <button
                      onClick={() => setSortAsc((value) => !value)}
                      className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                    >
                      Status
                      <ArrowUpDown className="size-3" />
                    </button>
                  </TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((application) => (
                  <TableRow key={application.id}>
                    <TableCell>
                      <div className="flex min-w-48 items-center gap-3">
                        <Avatar
                          className={application.user.image ? "cursor-pointer" : ""}
                          onClick={() => { if (application.user.image) setPreviewImage(application.user.image); }}
                        >
                          <AvatarImage src={application.user.image || undefined} alt={application.user.name} />
                          <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                            {application.user.name
                              .split(" ")
                              .map((part) => part[0])
                              .join("")
                              .slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{application.user.name}</p>
                          <p className="text-xs text-muted-foreground">{application.user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium">{application.contactNumber}</p>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${application.verificationStatus === "APPROVED" ? "bg-green-500/15 text-green-700 dark:text-green-300" :
                            application.verificationStatus === "REJECTED" ? "bg-red-500/15 text-red-700 dark:text-red-300" :
                              application.verificationStatus === "PENDING" ? "bg-amber-500/15 text-amber-700 dark:text-amber-300" :
                                "bg-primary/15 text-primary"
                          }`}
                      >
                        {application.verificationStatus}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`View ${application.user.name}`}
                          onClick={() => router.push(`/super-admin/dashboard/owner-applications/${application.id}`)}
                        >
                          <Eye className="size-4" />
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost">
                              <MoreVertical className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openDecision(application, "approve")}>
                              <CheckCircle2 className="mr-2 size-4 text-primary" />
                              Approve
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openDecision(application, "pending")}>
                              <Clock3 className="mr-2 size-4 text-amber-500" />
                              Mark as Pending
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openDecision(application, "reject")}
                              className="text-destructive"
                            >
                              <XCircle className="mr-2 size-4" />
                              Reject
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {applications.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4}>
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
        </div>
      )}

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
            <AlertDialogTitle>
              {selection?.decision === "approve"
                ? "Approve owner application"
                : selection?.decision === "reject"
                  ? "Reject owner application"
                  : "Return application to pending"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selection?.decision === "approve"
                ? `${selection.application.user.name} will be promoted to ADMIN and can manage turfs immediately.`
                : "The owner will see this message at the top of their profile."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {selection?.decision !== "approve" && (
            <Input
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
            <div className="flex gap-3 rounded-xl bg-primary/10 p-3 text-sm text-foreground">
              <CheckCircle2 className="size-5 shrink-0 text-primary" />
              This action records you as the reviewer and grants the approved owner ADMIN access.
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirm}
              className={selection?.decision === "reject" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : undefined}
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

      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
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
