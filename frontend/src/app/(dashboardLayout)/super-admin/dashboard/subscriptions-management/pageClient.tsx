"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, Fragment } from "react";
import {
  Save,
  Pencil,
  ArrowUpDown,
  Layers,
  X,
  Check,
  Banknote,
  Info,
  FileText,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/premium/Badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { httpClient } from "@/lib/axios/httpClient";
import { API_ENDPOINTS } from "@/lib/api/config";
import { useSearch } from "@/context/SearchContext";
import { useSort } from "@/hooks/useSort";
import { usePagination } from "@/hooks/usePagination";
import { TablePagination } from "@/components/common/TablePagination";
import { TableEmptyState } from "@/components/common/TableStates";
import {
  AdminSubscription,
  SubscriptionStatus,
  updateSubscriptionAction,
  takeCashPaymentForSubscription,
  confirmOnlinePaymentForSubscription,
} from "./_actions";

const statuses: SubscriptionStatus[] = [
  "FREE_TRIAL",
  "ACTIVE",
  "EXPIRING",
  "EXPIRED",
  "CANCELLED",
  "INACTIVE",
];

/** Cycle Badge Styling */
function getCycleBadge(period?: string | null) {
  if (!period) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <Badge variant="outline" className="h-8 text-[10px] uppercase font-mono bg-background border-border flex items-center justify-center">
      {period}
    </Badge>
  );
}

/** Status Badge Styling */
function getStatusBadge(status: SubscriptionStatus) {
  switch (status) {
    case "ACTIVE":
      return (
        <Badge className="h-8 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 flex items-center justify-center">
          Active
        </Badge>
      );
    case "FREE_TRIAL":
      return (
        <Badge className="h-8 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 flex items-center justify-center">
          Free Trial
        </Badge>
      );
    case "INACTIVE":
      return (
        <Badge className="h-8 bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/20 flex items-center justify-center">
          Inactive
        </Badge>
      );
    case "EXPIRING":
      return (
        <Badge className="h-8 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 flex items-center justify-center">
          Expiring
        </Badge>
      );
    case "EXPIRED":
      return (
        <Badge className="h-8 bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 flex items-center justify-center">
          Expired
        </Badge>
      );
    case "CANCELLED":
      return (
        <Badge variant="outline" className="h-8 text-muted-foreground border-border flex items-center justify-center">
          Cancelled
        </Badge>
      );
    default:
      return <Badge variant="outline" className="h-8 flex items-center justify-center">{status}</Badge>;
  }
}

/** Format ISO dates to "dd-MMM-yyyy" */
function formatDateDisplay(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    const date =
      typeof dateStr === "string" ? parseISO(dateStr) : new Date(dateStr);
    return format(date, "dd-MMM-yyyy");
  } catch {
    return "—";
  }
}

/** Invoice Badge Styling */
function getInvoiceBadge(invoice: AdminSubscription["invoice"]) {
  if (!invoice) return <span className="text-[11px] text-muted-foreground">No invoice</span>;
  if (invoice.status === "PAID") {
    return (
      <Badge className="h-8 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[11px] font-semibold flex items-center justify-center">
        Paid
      </Badge>
    );
  }
  if (invoice.status === "PARTIALLY_PAID") {
    return (
      <Badge className="h-8 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[11px] font-semibold flex items-center justify-center">
        Partial
      </Badge>
    );
  }
  if (invoice.status === "DRAFT") {
    return (
      <Badge className="h-8 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-[11px] font-semibold flex items-center justify-center">
        Draft
      </Badge>
    );
  }
  return (
    <Badge className="h-8 bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 text-[11px] font-semibold flex items-center justify-center">
      Unpaid
    </Badge>
  );
}

export default function OwnerSubscriptionsPage() {
  const queryClient = useQueryClient();
  const { registerHandler, unregisterHandler, setPlaceholder } = useSearch();
  const { sortField, sortDirection, handleSort, getSortParams } = useSort(
    "updatedAt",
    "desc"
  );
  const pagination = usePagination(10);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<SubscriptionStatus | "">("");
  const [editing, setEditing] = useState<
    Record<string, { status: SubscriptionStatus; endDate: string }>
  >({});
  const [paying, setPaying] = useState<
    Record<
      string,
      {
        amount: string;
        reference: string;
        note: string;
      }
    >
  >({});
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  useEffect(() => {
    setPlaceholder("Search owner name or email...");
    const onSearch = (query: string) => {
      setSearch(query);
      pagination.resetPage();
    };
    registerHandler(onSearch);
    return () => unregisterHandler();
  }, [registerHandler, unregisterHandler, setPlaceholder, pagination]);

  const { data: pageData, isLoading } = useQuery({
    queryKey: [
      "admin-owner-subscriptions",
      search,
      status,
      sortField,
      sortDirection,
      pagination.page,
      pagination.pageSize,
    ],
    queryFn: async () => {
      const { sortBy, sortOrder } = getSortParams();
      const params: Record<string, unknown> = {
        search: search || undefined,
        status: status || undefined,
        sortBy,
        sortOrder,
        page: String(pagination.page),
        limit: String(pagination.pageSize),
      };
      const result = await httpClient.get<{
        data: AdminSubscription[];
        meta: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      }>(API_ENDPOINTS.subscription.allSubscription, { params });
      return (
        result.data ?? {
          data: [],
          meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
        }
      );
    },
  });

  const subscriptions = pageData?.data ?? [];
  const meta = pageData?.meta;

  useEffect(() => {
    if (meta?.total !== undefined) pagination.setTotal(meta.total);
  }, [meta?.total, pagination]);

  // ─────────────────────────────────────────────────────────────
  // MUTATIONS
  // ─────────────────────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: async (payload: {
      id: string;
      values: { status: SubscriptionStatus; endDate: string };
    }) => {
      const result = await updateSubscriptionAction(
        payload.id,
        payload.values
      );
      if (!result.success) throw new Error(result.message);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin-owner-subscriptions"],
      });
      setEditing({});
      toast.success("Subscription updated successfully");
    },
    onError: (err: unknown) =>
      toast.error(
        err instanceof Error ? err.message : "Failed to update subscription"
      ),
  });

  const cashMutation = useMutation({
    mutationFn: async (payload: {
      subscriptionId: string;
      amount?: number;
      reference?: string;
      note?: string;
    }) => {
      const result = await takeCashPaymentForSubscription(
        payload.subscriptionId,
        {
          amount: payload.amount,
          reference: payload.reference,
          note: payload.note,
        }
      );
      if (!result.success) throw new Error(result.message);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin-owner-subscriptions"],
      });
      setPaying({});
      toast.success("Cash payment recorded and subscription activated");
    },
    onError: (err: unknown) =>
      toast.error(
        err instanceof Error ? err.message : "Failed to record cash payment"
      ),
  });

  const onlinePaymentMutation = useMutation({
    mutationFn: async (subscriptionId: string) => {
      const result =
        await confirmOnlinePaymentForSubscription(subscriptionId);
      if (!result.success) throw new Error(result.message);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin-owner-subscriptions"],
      });
      toast.success("Online payment confirmed and subscription activated");
    },
    onError: (err: unknown) =>
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to confirm online payment"
      ),
  });

  // ─────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────
  const SortHeader = ({
    field,
    label,
  }: {
    field: string;
    label: string;
  }) => (
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

  const startEdit = (sub: AdminSubscription) =>
    setEditing((prev) => ({
      ...prev,
      [sub.id]: { status: sub.status, endDate: sub.endDate.slice(0, 10) },
    }));

  const startPay = (sub: AdminSubscription) => {
    const invoice = sub.invoice;

    setPaying((prev) => ({
      ...prev,
      [sub.id]: {
        amount:
          invoice && sub.outstanding > 0 ? String(sub.outstanding) : "",
        reference: "",
        note: invoice ? `Settle ${invoice.invoiceNumber}` : "",
      },
    }));
  };

  return (
    <section className="dashboard-section">
      <Card className="surface-elevated overflow-hidden">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
              <CardTitle>Subscription Management</CardTitle>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {isLoading ? (
                <Skeleton className="h-8 w-44 rounded-lg bg-muted" />
              ) : (
                <Select
                  value={status || ""}
                  onValueChange={(value) => {
                    setStatus(value as SubscriptionStatus | "");
                    pagination.resetPage();
                  }}
                >
                  <SelectTrigger className="w-44 text-sm h-8">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All statuses</SelectItem>
                    {statuses.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
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
                    <TableHead className="px-1 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                      <Skeleton className="h-3 w-12 rounded" />
                    </TableHead>
                    <TableHead className="px-1 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                      <Skeleton className="h-3 w-16 rounded" />
                    </TableHead>
                    <TableHead className="px-1 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                      <Skeleton className="h-3 w-10 rounded" />
                    </TableHead>
                    <TableHead className="px-1 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                      <Skeleton className="h-3 w-8 rounded" />
                    </TableHead>
                    <TableHead className="px-1 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                      <Skeleton className="h-3 w-10 rounded" />
                    </TableHead>
                    <TableHead className="px-1 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                      <Skeleton className="h-3 w-14 rounded" />
                    </TableHead>
                    <TableHead className="px-1 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                      <Skeleton className="h-3 w-10 rounded" />
                    </TableHead>
                    <TableHead className="px-1 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                      <Skeleton className="h-3 w-6 rounded" />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...Array(5)].map((_, i) => (
                    <TableRow key={i} className="border-b border-border">
                      <TableCell className="px-1 py-1">
                        <Skeleton className="h-8 w-8 rounded-full" />
                      </TableCell>
                      <TableCell className="px-1 py-1">
                        <Skeleton className="h-4 w-16 rounded" />
                      </TableCell>
                      <TableCell className="px-1 py-1">
                        <Skeleton className="h-4 w-40 rounded" />
                      </TableCell>
                      <TableCell className="px-1 py-1">
                        <Skeleton className="h-4 w-24 rounded" />
                      </TableCell>
                      <TableCell className="px-1 py-1">
                        <Skeleton className="h-4 w-28 rounded" />
                      </TableCell>
                      <TableCell className="px-1 py-1">
                        <Skeleton className="h-4 w-20 rounded" />
                      </TableCell>
                      <TableCell className="px-1 py-1">
                        <Skeleton className="h-4 w-20 rounded" />
                      </TableCell>
                      <TableCell className="px-1 py-1">
                        <Skeleton className="h-4 w-20 rounded" />
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
                      <SortHeader field="user.name" label="Owner" />

                      <TableHead className="px-1 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                        Plan
                      </TableHead>
                      <TableHead className="px-1 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                        Cycle
                      </TableHead>
                      <TableHead className="px-1 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                        Invoice
                      </TableHead>
                      <SortHeader field="status" label="Status" />
                      <SortHeader field="startDate" label="Start" />
                      <SortHeader field="endDate" label="End" />
                      <TableHead className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscriptions.map((sub) => {
                      const draft = editing[sub.id];
                      const pay = paying[sub.id];
                      const latestLog = sub.latestLog;
                      const invoice = sub.invoice;
                      const latestPayment = invoice?.payments?.[0];
                      const canConfirmOnlinePayment =
                        !!invoice &&
                        !!latestPayment &&
                        invoice.status === "DRAFT" &&
                        latestPayment.status === "PROCESSING" &&
                        latestPayment.method !== "CASH" &&
                        !!latestPayment.providerTransactionId &&
                        !!latestPayment.payerMobileNumber;

                      return (
                        <Fragment key={sub.id}>
                          <TableRow
                            className={`border-b border-border transition-colors hover:bg-muted/20 ${draft
                              ? "bg-primary/[0.04]"
                              : sub.canAcceptPayment || canConfirmOnlinePayment
                                ? "bg-rose-500/[0.02]"
                                : ""
                              }`}
                          >
                            {/* Company */}
                            <TableCell className="px-1 py-1">
                              <span className="text-sm text-foreground">
                                {sub.user.companyName || "—"}
                              </span>
                            </TableCell>
                            {/* Owner */}
                            <TableCell className="px-1 py-1">
                              <div className="font-semibold text-sm text-foreground leading-none">
                                {sub.user.name}
                              </div>
                              <div className="text-xs text-muted-foreground font-mono">
                                {sub.user.email}
                              </div>
                            </TableCell>

                            {/* Plan */}
                            <TableCell className="px-1 py-1">
                              <div className="inline-flex items-center gap-1.5 font-medium text-xs px-2.5 py-1 rounded-lg bg-secondary text-secondary-foreground">
                                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                {sub.plan.name}
                              </div>
                            </TableCell>

                            {/* Cycle */}
                            <TableCell className="px-1 py-1">
                              {getCycleBadge(latestLog?.period)}
                            </TableCell>

                            {/* Invoice Column */}
                            <TableCell className="px-1 py-1">
                              {invoice ? (
                                <div className="flex items-center gap-2">
                                  {getInvoiceBadge(invoice)}
                                  <span className="text-xs font-bold font-mono text-foreground">
                                    ৳{Number(invoice.totalAmount).toLocaleString()}
                                  </span>

                                  {/* Info Popover */}
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 rounded-full text-muted-foreground transition-colors"
                                      >
                                        <Info className="h-3.5 w-3.5" />
                                        <span className="sr-only">Invoice Details</span>
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-72 p-3.5 space-y-3 shadow-lg border border-border">
                                      <div className="flex items-center justify-between border-b border-border pb-2">
                                        <span className="text-xs font-mono font-semibold text-foreground flex items-center gap-1.5">
                                          <FileText className="w-3.5 h-3.5 text-primary" />
                                          {invoice.invoiceNumber}
                                        </span>
                                        {invoice.status === "PAID" ? (
                                          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                                            Paid
                                          </Badge>
                                        ) : invoice.status === "PARTIALLY_PAID" ? (
                                          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]">
                                            Partial
                                          </Badge>
                                        ) : invoice.status === "DRAFT" ? (
                                          <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[10px]">
                                            Draft
                                          </Badge>
                                        ) : (
                                          <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/20 text-[10px]">
                                            Unpaid
                                          </Badge>
                                        )}
                                      </div>

                                      <div className="space-y-1.5 text-xs">
                                        <div className="flex justify-between text-muted-foreground">
                                          <span>Total Amount:</span>
                                          <span className="font-semibold font-mono text-foreground">
                                            ৳{Number(invoice.totalAmount).toLocaleString()}
                                          </span>
                                        </div>
                                        <div className="flex justify-between text-muted-foreground">
                                          <span>Paid Amount:</span>
                                          <span className="font-semibold font-mono text-emerald-600">
                                            ৳{Number(invoice.paidAmount).toLocaleString()}
                                          </span>
                                        </div>
                                        {sub.outstanding > 0 && (
                                          <div className="flex justify-between text-muted-foreground">
                                            <span>Outstanding:</span>
                                            <span className="font-semibold font-mono text-rose-600">
                                              ৳{sub.outstanding.toLocaleString()}
                                            </span>
                                          </div>
                                        )}
                                      </div>

                                      {latestPayment && (
                                        <div className="pt-2 border-t border-border/60 space-y-1 text-[11px] text-muted-foreground">
                                          <div className="flex justify-between gap-2">
                                            <span className="font-medium text-foreground">
                                              Latest payment:
                                            </span>
                                            <span>
                                              {latestPayment.method} · {latestPayment.status}
                                            </span>
                                          </div>
                                          <div className="flex justify-between gap-2">
                                            <span>Payment amount:</span>
                                            <span className="font-mono">
                                              ৳{Number(latestPayment.amount).toLocaleString()}
                                            </span>
                                          </div>
                                          {latestPayment.providerTransactionId && (
                                            <div className="flex justify-between gap-2">
                                              <span>Transaction ID:</span>
                                              <span className="font-mono break-all text-right">
                                                {latestPayment.providerTransactionId}
                                              </span>
                                            </div>
                                          )}
                                          {latestPayment.payerMobileNumber && (
                                            <div className="flex justify-between gap-2">
                                              <span>Payer mobile:</span>
                                              <span className="font-mono">
                                                {latestPayment.payerMobileNumber}
                                              </span>
                                            </div>
                                          )}
                                          {latestPayment.reference && (
                                            <div>
                                              <span className="font-medium text-foreground">
                                                Ref:{" "}
                                              </span>
                                              <span className="font-mono">
                                                {latestPayment.reference}
                                              </span>
                                            </div>
                                          )}
                                          {latestPayment.note && (
                                            <div>
                                              <span className="font-medium text-foreground">
                                                Note:{" "}
                                              </span>
                                              <span>{latestPayment.note}</span>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </PopoverContent>
                                  </Popover>
                                </div>
                              ) : (
                                <span className="text-[11px] text-muted-foreground">
                                  No invoice
                                </span>
                              )}
                            </TableCell>

                            {/* Status */}
                            <TableCell className="px-1 py-1">
                              {draft ? (
                                <Select
                                  value={draft.status}
                                  onValueChange={(val) =>
                                    setEditing((prev) => ({
                                      ...prev,
                                      [sub.id]: {
                                        ...draft,
                                        status: val as SubscriptionStatus,
                                      },
                                    }))
                                  }
                                >
                                  <SelectTrigger className="h-8 w-28 text-xs rounded-lg">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {statuses.map((item) => (
                                      <SelectItem
                                        key={item}
                                        value={item}
                                        className="text-xs"
                                      >
                                        {item}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                getStatusBadge(sub.status)
                              )}
                            </TableCell>

                            {/* Start Date */}
                            <TableCell className="px-1 py-1 text-xs font-medium text-muted-foreground">
                              {formatDateDisplay(sub.startDate)}
                            </TableCell>

                            {/* End Date */}
                            <TableCell className="px-1 py-1">
                              {draft ? (
                                <Input
                                  className="h-8 w-36 text-xs rounded-lg"
                                  type="date"
                                  value={draft.endDate}
                                  onChange={(e) =>
                                    setEditing((prev) => ({
                                      ...prev,
                                      [sub.id]: {
                                        ...draft,
                                        endDate: e.target.value,
                                      },
                                    }))
                                  }
                                />
                              ) : (
                                <span className="text-xs font-medium text-foreground">
                                  {formatDateDisplay(sub.endDate)}
                                </span>
                              )}
                            </TableCell>

                            {/* Actions */}
                            <TableCell className="px-1 py-1 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {draft ? (
                                  <>
                                    <Button
                                      size="sm"
                                      className="h-8 text-xs rounded-lg bg-primary text-primary-foreground shadow-xs hover:bg-primary/90"
                                      onClick={() =>
                                        updateMutation.mutate({
                                          id: sub.id,
                                          values: draft,
                                        })
                                      }
                                      disabled={updateMutation.isPending}
                                    >
                                      <Save className="h-3.5 w-3.5 mr-1" />
                                      Update
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 text-xs rounded-lg border-border hover:bg-muted"
                                      onClick={() =>
                                        setEditing((prev) => {
                                          const next = { ...prev };
                                          delete next[sub.id];
                                          return next;
                                        })
                                      }
                                    >
                                      <X className="h-3.5 w-3.5 mr-1" />
                                      Cancel
                                    </Button>
                                  </>
                                ) : (
                                  !canConfirmOnlinePayment && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 text-xs font-medium border-border rounded-lg hover:bg-muted"
                                      onClick={() => startEdit(sub)}
                                    ><Pencil className="h-3.5 w-3.5 mr-1" />
                                      Edit
                                    </Button>
                                  )
                                )}

                                {canConfirmOnlinePayment && (
                                  <AlertDialog
                                    open={confirmingId === sub.id}
                                    onOpenChange={(open) =>
                                      setConfirmingId(open ? sub.id : null)
                                    }
                                  >
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        size="sm"
                                        className="h-8 text-xs rounded-lg bg-primary text-primary-foreground shadow-xs hover:bg-primary/90"
                                        disabled={onlinePaymentMutation.isPending}
                                      >
                                        <Check className="mr-1.5 h-3.5 w-3.5" />
                                        Confirm
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle className="flex items-center gap-2">
                                          <TriangleAlert className="h-5 w-5 text-amber-500" />
                                          Confirm Online Payment
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Confirm the online payment for{" "}
                                          <span className="font-semibold text-foreground">
                                            {sub.user.companyName}
                                          </span>
                                          ? The subscription will be activated with
                                          a start date of today and the invoice will be
                                          marked as paid.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel
                                          className="h-8 text-xs rounded-lg"
                                        >
                                          Cancel
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                          className="h-8 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
                                          onClick={() =>
                                            onlinePaymentMutation.mutate(sub.id)
                                          }
                                        >
                                          Confirm
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                )}

                                {!pay &&
                                  sub.canAcceptPayment &&
                                  !canConfirmOnlinePayment && (
                                    <Button
                                      size="sm"
                                      className="h-8 text-xs rounded-lg bg-primary text-primary-foreground shadow-xs hover:bg-primary/90"
                                      onClick={() => startPay(sub)}
                                    >
                                      <Banknote className="mr-1.5 h-3.5 w-3.5" />
                                      Take Cash Payment
                                    </Button>
                                  )}
                              </div>
                            </TableCell>
                          </TableRow>

                          {/* Cash Payment Drawer */}
                          {
                            pay && (
                              <TableRow className="bg-muted/30 border-b border-border">
                                <TableCell colSpan={9} className="p-4">
                                  <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-4">
                                    <div className="flex items-center justify-between border-b border-border pb-3">
                                      <div className="flex items-center gap-2">
                                        <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
                                          <Banknote className="h-4 w-4" />
                                        </div>
                                        <h4 className="text-xs font-bold uppercase tracking-wide text-foreground">
                                          Take Cash Payment from {sub.user.name}
                                        </h4>
                                      </div>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground rounded-lg"
                                        onClick={() =>
                                          setPaying((prev) => {
                                            const next = { ...prev };
                                            delete next[sub.id];
                                            return next;
                                          })
                                        }
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>

                                    {/* Invoice summary */}
                                    {invoice && (
                                      <div className="rounded-lg border border-border bg-muted/40 p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                                        <div>
                                          <span className="text-muted-foreground">
                                            Invoice Number:{" "}
                                          </span>
                                          <span className="font-mono font-semibold text-foreground">
                                            {invoice.invoiceNumber}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                          <div>
                                            <span className="text-muted-foreground">
                                              Total:{" "}
                                            </span>
                                            <span className="font-semibold text-foreground font-mono">
                                              ৳
                                              {Number(
                                                invoice.totalAmount
                                              ).toLocaleString()}
                                            </span>
                                          </div>
                                          <div>
                                            <span className="text-muted-foreground">
                                              Paid:{" "}
                                            </span>
                                            <span className="font-semibold text-emerald-600 font-mono">
                                              ৳ {Number(invoice.paidAmount).toLocaleString()}
                                            </span>
                                          </div>
                                          <div>
                                            <span className="text-muted-foreground">
                                              Outstanding:{" "}
                                            </span>
                                            <span className="font-semibold text-rose-600 dark:text-rose-400 font-mono">
                                              ৳ {sub.outstanding.toLocaleString()}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {/* Form grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                      {/* Amount */}
                                      <div>
                                        <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                                          Amount (৳)
                                        </label>
                                        <Input
                                          className="h-9 text-xs rounded-lg"
                                          type="number"
                                          placeholder="Auto (outstanding)"
                                          value={pay.amount}
                                          onChange={(e) =>
                                            setPaying((prev) => ({
                                              ...prev,
                                              [sub.id]: {
                                                ...pay,
                                                amount: e.target.value,
                                              },
                                            }))
                                          }
                                        />
                                      </div>

                                      {/* Reference */}
                                      <div>
                                        <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                                          Reference
                                        </label>
                                        <Input
                                          className="h-9 text-xs rounded-lg"
                                          placeholder="Cash Ref / Receipt #"
                                          value={pay.reference}
                                          onChange={(e) =>
                                            setPaying((prev) => ({
                                              ...prev,
                                              [sub.id]: {
                                                ...pay,
                                                reference: e.target.value,
                                              },
                                            }))
                                          }
                                        />
                                      </div>

                                      {/* Note */}
                                      <div>
                                        <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                                          Note
                                        </label>
                                        <Input
                                          className="h-9 text-xs rounded-lg"
                                          placeholder="Remarks..."
                                          value={pay.note}
                                          onChange={(e) =>
                                            setPaying((prev) => ({
                                              ...prev,
                                              [sub.id]: {
                                                ...pay,
                                                note: e.target.value,
                                              },
                                            }))
                                          }
                                        />
                                      </div>
                                    </div>

                                    {/* Footer */}
                                    <div className="flex justify-end gap-2 pt-2 border-t border-border">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 text-xs rounded-lg"
                                        onClick={() =>
                                          setPaying((prev) => {
                                            const next = { ...prev };
                                            delete next[sub.id];
                                            return next;
                                          })
                                        }
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        size="sm"
                                        className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg shadow-xs"
                                        disabled={cashMutation.isPending}
                                        onClick={() =>
                                          cashMutation.mutate({
                                            subscriptionId: sub.id,
                                            amount: pay.amount ? Number(pay.amount) : undefined,
                                            reference: pay.reference || undefined,
                                            note: pay.note || undefined,
                                          })
                                        }
                                      >
                                        <Check className="mr-1.5 h-3.5 w-3.5" />
                                        Record Cash Payment
                                      </Button>
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )
                          }
                        </Fragment>
                      );
                    })}

                    {subscriptions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9}>
                          <TableEmptyState
                            message="No subscriptions found"
                            description={
                              search
                                ? "Try adjusting your search query or filter."
                                : "No owner subscriptions present."
                            }
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
    </section>
  );
}
