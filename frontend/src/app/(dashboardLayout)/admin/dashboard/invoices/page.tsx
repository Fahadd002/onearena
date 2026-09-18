"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/premium/Badge";
import { DataTable } from "@/components/premium/DataTable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useSort } from "@/hooks/useSort";
import { usePagination } from "@/hooks/usePagination";
import { toast } from "sonner";
import { Search, X, CreditCard, ArrowLeft, Eye, DollarSign, RotateCcw, AlertTriangle } from "lucide-react";
import { httpClient } from "@/lib/axios/httpClient";
import { API_ENDPOINTS } from "@/lib/api/config";
import { ApiResponse } from "@/types/api.type";

const ALL = "ALL";

const PAYMENT_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "UNPAID", label: "Unpaid" },
  { value: "PENDING", label: "Pending" },
  { value: "PROCESSING", label: "Processing" },
  { value: "PARTIALLY_PAID", label: "Partially Paid" },
  { value: "PAID", label: "Paid" },
  { value: "SUCCEEDED", label: "Succeeded" },
  { value: "PARTIALLY_REFUNDED", label: "Partially Refunded" },
  { value: "FAILED", label: "Failed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "REFUNDED", label: "Refunded" },
];

const paymentStatusVariant: Record<
  string,
  "success" | "warning" | "destructive" | "outline"
> = {
  UNPAID: "warning",
  PENDING: "warning",
  PROCESSING: "warning",
  PARTIALLY_PAID: "warning",
  PARTIALLY_REFUNDED: "warning",
  PAID: "success",
  SUCCEEDED: "success",
  FAILED: "destructive",
  CANCELLED: "destructive",
  REFUNDED: "destructive",
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function paymentStatusLabel(status: string): string {
  return PAYMENT_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
}

export interface StoredPayment {
  id: string;
  paymentNumber: string;
  bookingId: string;
  amount: string;
  method: string;
  type: string;
  status: string;
  paidAt?: string | null;
  reference?: string | null;
  note?: string | null;
  receivedBy?: { id: string; name: string; email: string } | null;
  createdAt: string;
  [key: string]: unknown;
}

export interface StoredInvoice {
  id: string;
  invoiceNumber: string;
  bookingId: string;
  status: string;
  subtotal: string;
  discount: string;
  totalAmount: string;
  paidAmount: string;
  isFullPaid: boolean;
  invoiceDate: string;
  booking: {
    id: string;
    bookingNumber: string;
    status: string;
    slot: {
      id: string;
      slotDate: string;
      startMinute: number;
      endMinute: number;
      turf: { id: string; name: string };
    };
    user: { id: string; name: string; email: string; phone?: string | null } | null;
  };
  payments?: StoredPayment[];
  [key: string]: unknown;
}

export interface InvoicesListResponse {
  data: StoredInvoice[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export default function AdminInvoicesPage() {
  const queryClient = useQueryClient();
  const { sortField, sortDirection, handleSort, getSortParams } = useSort("invoiceDate", "desc");
  const pagination = usePagination(10);

  const [statusFilter, setStatusFilter] = useState<string>(ALL);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [selectedInvoice, setSelectedInvoice] = useState<StoredInvoice | null>(null);
  const [payments, setPayments] = useState<StoredPayment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      pagination.resetPage();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, pagination]);

  const { data, isLoading } = useQuery({
    queryKey: [
      "admin-invoices",
      pagination.page,
      pagination.pageSize,
      sortField,
      sortDirection,
      statusFilter,
      debouncedSearch,
    ],
    queryFn: async () => {
      const { sortBy, sortOrder } = getSortParams();
      const params: Record<string, string> = {
        page: String(pagination.page),
        limit: String(pagination.pageSize),
        sortBy,
        sortOrder,
      };
      if (statusFilter !== ALL) params.status = statusFilter;
      if (debouncedSearch) params.search = debouncedSearch;

      const result = await httpClient.get<InvoicesListResponse>(
        API_ENDPOINTS.marketplace.invoices,
        { params },
      );
      return result.data ?? { data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } };
    },
  });

  if (data?.meta?.total !== undefined && pagination.total !== data.meta.total) {
    pagination.setTotal(data.meta.total);
  }

  const fetchPayments = async (invoiceId: string) => {
    setPaymentsLoading(true);
    try {
      const result = await httpClient.get<StoredPayment[]>(
        `${API_ENDPOINTS.payments.invoicePayments.replace(':invoiceId', invoiceId)}`,
      );
      setPayments(result.data ?? []);
    } catch (error) {
      console.error("Failed to fetch payments:", error);
      setPayments([]);
    } finally {
      setPaymentsLoading(false);
    }
  };

  const openInvoice = async (invoice: StoredInvoice) => {
    setSelectedInvoice(invoice);
    await fetchPayments(invoice.id);
  };

  const closeDrawer = () => {
    setSelectedInvoice(null);
    setPayments([]);
  };

  const updateMutation = useMutation({
    mutationFn: (vars: { paymentId: string; payload: { status: string; note?: string } }) =>
      httpClient.patch<StoredPayment>(
        `${API_ENDPOINTS.payments.paymentStatus.replace(':paymentId', vars.paymentId)}`,
        vars.payload,
      ),
    onSuccess: () => {
      if (selectedInvoice) {
        fetchPayments(selectedInvoice.id);
      }
      void queryClient.invalidateQueries({ queryKey: ["admin-invoices"] });
      toast.success("Payment status updated");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const invoices: StoredInvoice[] = data?.data ?? [];

  const statusUpdateOptions = (currentStatus: string) => {
    if (currentStatus === "SUCCEEDED") {
      return ["REFUNDED", "FAILED", "CANCELLED"];
    }
    return [];
  };

  return (
    <section className="dashboard-section">
      <h1 className="dashboard-title">Invoice Management</h1>

      <Card className="surface-elevated mt-6">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>All Invoices</CardTitle>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search invoices..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 text-sm"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-44 text-sm">
                  <SelectValue placeholder="Payment status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All status</SelectItem>
                  {PAYMENT_STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : (
            <DataTable
              columns={[
                {
                  key: "invoiceNumber",
                  header: "Invoice",
                  sortable: true,
                  render: (row) => (
                    <div>
                      <p className="font-medium">{row.invoiceNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(row.invoiceDate)}
                      </p>
                    </div>
                  ),
                },
                {
                  key: "booking.bookingNumber",
                  header: "Booking",
                  sortable: true,
                  render: (row) => (
                    <div>
                      <p className="font-medium">#{row.booking?.bookingNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.booking?.slot?.turf?.name}
                      </p>
                    </div>
                  ),
                },
                {
                  key: "booking.user",
                  header: "Customer",
                  render: (row) => (
                    <div>
                      <p className="font-medium">{row.booking?.user?.name ?? "Guest"}</p>
                      <p className="text-xs text-muted-foreground">{row.booking?.user?.email}</p>
                    </div>
                  ),
                },
                {
                  key: "totalAmount",
                  header: "Total",
                  sortable: true,
                  render: (row) => (
                    <p className="font-medium">৳ {Number(row.totalAmount).toLocaleString()}</p>
                  ),
                },
                {
                  key: "paidAmount",
                  header: "Paid",
                  sortable: true,
                  render: (row) => (
                    <p className="font-medium text-primary">৳ {Number(row.paidAmount).toLocaleString()}</p>
                  ),
                },
                {
                  key: "status",
                  header: "Status",
                  sortable: true,
                  render: (row) => (
                    <Badge
                      variant={paymentStatusVariant[row.status] ?? "outline"}
                      size="sm"
                    >
                      {paymentStatusLabel(row.status)}
                    </Badge>
                  ),
                },
                {
                  key: "actions",
                  header: "Actions",
                  render: (row) => (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openInvoice(row)}
                    >
                      <Eye className="mr-1.5 size-3.5" />
                      View
                    </Button>
                  ),
                },
              ]}
              data={invoices}
              sortKey={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              pageSize={pagination.pageSize}
              totalItems={pagination.total}
              onPageChange={pagination.setPage}
              emptyTitle="No invoices found"
              emptyDescription={debouncedSearch ? "Try adjusting your search." : "Invoices will appear here when bookings are confirmed."}
            />
          )}
        </CardContent>
      </Card>

      {/* Right Side Drawer for Invoice Details */}
      <AnimatePresence>
        {selectedInvoice && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeDrawer}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs"
            />

            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col border-l border-border bg-card shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border bg-secondary/30 p-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={closeDrawer}
                    className="mr-2"
                  >
                    <ArrowLeft className="size-4" />
                  </Button>
                  <div className="flex items-center gap-2">
                    <CreditCard className="size-4 text-primary" />
                    <h3 className="text-sm font-bold text-foreground">
                      Invoice {selectedInvoice.invoiceNumber}
                    </h3>
                  </div>
                </div>
                <Badge
                  variant={paymentStatusVariant[selectedInvoice.status] ?? "outline"}
                  size="sm"
                >
                  {paymentStatusLabel(selectedInvoice.status)}
                </Badge>
              </div>

              {/* Body */}
              <div className="flex-1 space-y-5 overflow-y-auto p-5">
                {/* Invoice Summary */}
                <div className="rounded-xl border border-primary/20 bg-primary/10 p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-primary">
                        Booking
                      </p>
                      <p className="text-sm font-bold text-foreground">
                        #{selectedInvoice.booking?.bookingNumber}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-primary">
                        Turf
                      </p>
                      <p className="text-sm font-bold text-foreground truncate">
                        {selectedInvoice.booking?.slot?.turf?.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-primary">
                        Customer
                      </p>
                      <p className="text-sm font-bold text-foreground">
                        {selectedInvoice.booking?.user?.name ?? "Guest"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-primary">
                        Date
                      </p>
                      <p className="text-sm font-bold text-foreground">
                        {formatDate(selectedInvoice.booking?.slot?.slotDate ?? "")}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Amount Summary */}
                <div className="space-y-2.5 border-y border-border py-4 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span className="font-semibold text-foreground">
                      ৳ {Number(selectedInvoice.subtotal).toLocaleString()}
                    </span>
                  </div>
                  {Number(selectedInvoice.discount) > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Discount</span>
                      <span className="font-semibold text-green-600">
                        -৳ {Number(selectedInvoice.discount).toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-muted-foreground">
                    <span>Total Amount</span>
                    <span className="font-bold text-foreground text-lg">
                      ৳ {Number(selectedInvoice.totalAmount).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground border-t pt-2">
                    <span>Paid Amount</span>
                    <span className="font-bold text-primary text-lg">
                      ৳ {Number(selectedInvoice.paidAmount).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Remaining</span>
                    <span className="font-semibold text-destructive">
                      ৳ {Number(Number(selectedInvoice.totalAmount) - Number(selectedInvoice.paidAmount)).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Payments List */}
                <div>
                  <h4 className="text-sm font-semibold mb-3">Payment History</h4>
                  {paymentsLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
                      ))}
                    </div>
                  ) : payments.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border bg-muted/50 p-6 text-center text-sm text-muted-foreground">
                      No payments recorded yet
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {payments.map((payment) => (
                        <div
                          key={payment.id}
                          className="rounded-lg border border-border bg-card p-4"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{payment.paymentNumber}</p>
                                <Badge
                                  variant={paymentStatusVariant[payment.status] ?? "outline"}
                                  size="sm"
                                >
                                  {paymentStatusLabel(payment.status)}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  ({payment.type})
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {payment.method} • {formatDate(payment.createdAt)}
                                {payment.reference && ` • Ref: ${payment.reference}`}
                              </p>
                              {payment.note && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Note: {payment.note}
                                </p>
                              )}
                              {payment.receivedBy && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Received by: {payment.receivedBy.name}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-right">
                              <span className="font-bold text-foreground">
                                ৳ {Number(payment.amount).toLocaleString()}
                              </span>
                              {payment.status === "SUCCEEDED" && (
                                <Select
                                  value={payment.status}
                                  onValueChange={(value) => {
                                    if (value === payment.status) return;
                                    updateMutation.mutate({
                                      paymentId: payment.id,
                                      payload: { status: value },
                                    });
                                  }}
                                >
                                  <SelectTrigger className="h-7 w-[140px] text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {statusUpdateOptions(payment.status).map((s) => (
                                      <SelectItem key={s} value={s}>
                                        {paymentStatusLabel(s)}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            </div>
                          </div>
                          {payment.paidAt && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Paid at: {formatDate(payment.paidAt)}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </section>
  );
}