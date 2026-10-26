"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Badge } from "@/components/premium/Badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
} from "@/components/ui/table";
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
import { useSearch } from "@/context/SearchContext";
import { toast } from "sonner";
import { Search, X, CreditCard, ArrowLeft, Eye, DollarSign, RotateCcw, AlertTriangle } from "lucide-react";
import { httpClient } from "@/lib/axios/httpClient";
import { API_ENDPOINTS } from "@/lib/api/config";
import { ApiResponse } from "@/types/api.type";

const ALL = "ALL";

const INVOICE_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "UNPAID", label: "Unpaid" },
  { value: "PARTIALLY_PAID", label: "Partially Paid" },
  { value: "PAID", label: "Paid" },
  { value: "DRAFT", label: "Draft" },
];

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
  remainingAmount: number;
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
    } | null;
    slots: {
      id: string;
      slotDate: string;
      startMinute: number;
      endMinute: number;
      turf: { id: string; name: string };
    }[];
    user: { id: string; name: string; email: string; phoneNumber: string | null } | null;
  } | null;
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
  const { registerHandler, unregisterHandler, setPlaceholder } = useSearch();

  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>(ALL);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>(ALL);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [selectedInvoice, setSelectedInvoice] = useState<StoredInvoice | null>(null);
  const [payments, setPayments] = useState<StoredPayment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);

  useEffect(() => {
    setPlaceholder("Search invoices...");
    const onSearch = (query: string) => {
      setSearch(query);
      pagination.resetPage();
    };
    registerHandler(onSearch);
    return () => unregisterHandler();
  }, [registerHandler, unregisterHandler, setPlaceholder, pagination]);

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
      invoiceStatusFilter,
      paymentStatusFilter,
      startDate,
      endDate,
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
      if (invoiceStatusFilter !== ALL) params.status = invoiceStatusFilter;
      if (paymentStatusFilter !== ALL) params.paymentStatus = paymentStatusFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
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
      <Card className="surface-elevated mt-6">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>All Invoices</CardTitle>
            <div className="flex flex-wrap items-center gap-3">
              {isLoading ? (
                <div className="flex gap-2 flex-wrap">
                  <Skeleton className="h-8 w-44 rounded-lg bg-muted" />
                  <Skeleton className="h-8 w-44 rounded-lg bg-muted" />
                  <Skeleton className="h-8 w-40 rounded-lg bg-muted" />
                  <Skeleton className="h-8 w-40 rounded-lg bg-muted" />
                </div>
              ) : (
                <>
                  <Select value={invoiceStatusFilter} onValueChange={setInvoiceStatusFilter}>
                    <SelectTrigger className="w-44 text-sm h-8">
                      <SelectValue placeholder="Invoice status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>All invoice status</SelectItem>
                      {INVOICE_STATUS_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                    <SelectTrigger className="w-44 text-sm h-8">
                      <SelectValue placeholder="Payment status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>All payment status</SelectItem>
                      {PAYMENT_STATUS_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <DatePicker
                    value={startDate}
                    onChange={setStartDate}
                    placeholder="Start date"
                    className="w-40 text-sm h-8"
                  />

                  <DatePicker
                    value={endDate}
                    onChange={setEndDate}
                    placeholder="End date"
                    className="w-40 text-sm h-8"
                  />
                </>
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
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                      <Skeleton className="h-3 w-12 rounded" />
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                      <Skeleton className="h-3 w-8 rounded" />
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                      <Skeleton className="h-3 w-10 rounded" />
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                      <Skeleton className="h-3 w-14 rounded" />
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                      <Skeleton className="h-3 w-10 rounded" />
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                      <Skeleton className="h-3 w-6 rounded" />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...Array(5)].map((_, i) => (
                    <TableRow key={i} className="border-b border-border">
                      <TableCell className="py-3.5">
                        <Skeleton className="h-8 w-8 rounded-full" />
                      </TableCell>
                      <TableCell className="py-3.5">
                        <Skeleton className="h-4 w-40 rounded" />
                      </TableCell>
                      <TableCell className="py-3.5">
                        <Skeleton className="h-4 w-24 rounded" />
                      </TableCell>
                      <TableCell className="py-3.5">
                        <Skeleton className="h-4 w-20 rounded" />
                      </TableCell>
                      <TableCell className="py-3.5">
                        <Skeleton className="h-4 w-20 rounded" />
                      </TableCell>
                      <TableCell className="py-3.5">
                        <Skeleton className="h-4 w-20 rounded" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
                   header: "Reference",
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
                    key: "customerName",
                    header: "Customer Name",
                    render: (row) => {
                      const name = row.booking?.user?.name?.trim();
                      return name ? (
                        <p className="truncate font-medium" title={name}>
                          {name}
                        </p>
                      ) : (
                        <span className="text-muted-foreground">Guest</span>
                      );
                    },
                  },
                  {
                    key: "customerPhone",
                    header: "Mobile",
                    render: (row) => {
                      const phone = row.booking?.user?.phoneNumber?.trim();
                      return phone ? (
                        <p className="truncate text-muted-foreground" title={phone}>
                          {phone}
                        </p>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      );
                    },
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
                   key: "remaining",
                   header: "Remaining",
                   sortable: true,
                   render: (row) => {
                     const remaining = Number(row.totalAmount) - Number(row.paidAmount);
                     return (
                       <p className={`font-medium ${remaining > 0 ? "text-destructive" : "text-success"}`}>
                         ৳ {remaining.toLocaleString()}
                       </p>
                     );
                   },
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
                       className="whitespace-nowrap border-primary/40 text-primary hover:border-primary hover:bg-primary/10"
                       title="View details"
                     >
                       <Eye className="mr-1.5 size-3.5" />
                       View Details
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
              onPageSizeChange={pagination.setPageSize}
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
                <div className="overflow-hidden rounded-xl border border-border">
                  <div className="flex items-center gap-2 border-b border-border bg-primary/5 px-3 py-2">
                    <CreditCard className="size-3.5 text-primary" />
                    <span className="text-xs font-bold text-foreground">Invoice Summary</span>
                  </div>
                  <div className="divide-y divide-border">
                    <div className="flex items-center justify-between px-3 py-2 text-xs">
                      <span className="text-muted-foreground">Invoice</span>
                      <span className="font-semibold text-foreground">{selectedInvoice.invoiceNumber}</span>
                    </div>
                    <div className="flex items-center justify-between px-3 py-2 text-xs">
                      <span className="text-muted-foreground">Booking Reference</span>
                      <span className="font-semibold text-foreground">#{selectedInvoice.booking?.bookingNumber}</span>
                    </div>
                    <div className="flex items-center justify-between px-3 py-2 text-xs">
                      <span className="text-muted-foreground">Turf</span>
                      <span className="truncate pr-2 font-semibold text-foreground">
                        {selectedInvoice.booking?.slot?.turf?.name ?? "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-3 py-2 text-xs">
                      <span className="text-muted-foreground">Customer Name</span>
                      <span className="truncate pr-2 font-semibold text-foreground">
                        {selectedInvoice.booking?.user?.name ?? "Guest"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-3 py-2 text-xs">
                      <span className="text-muted-foreground">Mobile</span>
                      <span className="truncate pr-2 font-semibold text-foreground">
                        {selectedInvoice.booking?.user?.phoneNumber ?? "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-3 py-2 text-xs">
                      <span className="text-muted-foreground">Date</span>
                      <span className="font-semibold text-foreground">
                        {formatDate(selectedInvoice.booking?.slot?.slotDate ?? "")}
                      </span>
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
                        <Skeleton key={i} className="h-16 mx-auto" />
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