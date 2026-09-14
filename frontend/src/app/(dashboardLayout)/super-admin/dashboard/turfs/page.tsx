"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpDown, Check, Eye, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableEmptyState, TableLoadingState } from "@/components/common/TableStates";
import { TablePagination } from "@/components/common/TablePagination";
import { usePagination } from "@/hooks/usePagination";
import { useSearch } from "@/context/SearchContext";
import { useSort } from "@/hooks/useSort";
import { useCategoryOptions } from "@/hooks/useCategoryOptions";
import { httpClient } from "@/lib/axios/httpClient";
import { API_ENDPOINTS } from "@/lib/api/config";
import { toast } from "sonner";

type Status = "DRAFT" | "PENDING_APPROVAL" | "ACTIVE" | "INACTIVE" | "REJECTED";
type Turf = {
  id: string;
  name: string;
  address: string;
  status: Status;
  basePrice: string | number;
  category: { name: string };
  owner: { name: string; email: string };
  images: Array<{ url: string }>;
};
type TurfPage = {
  data: Turf[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};
const labels: Record<Status, string> = {
  DRAFT: "Draft",
  PENDING_APPROVAL: "Awaiting review",
  ACTIVE: "Approved",
  INACTIVE: "Unapproved",
  REJECTED: "Rejected",
};
const colors: Record<Status, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  PENDING_APPROVAL: "bg-amber-500/10 text-amber-700",
  ACTIVE: "bg-primary/10 text-primary",
  INACTIVE: "bg-secondary text-muted-foreground",
  REJECTED: "bg-destructive/10 text-destructive",
};

export default function TurfApprovalsPage() {
  const queryClient = useQueryClient();
  const { registerHandler, unregisterHandler, setPlaceholder } = useSearch();
  const { options: categories } = useCategoryOptions();
  const { sortField, sortDirection, handleSort, getSortParams } = useSort("updatedAt", "desc");
  const pagination = usePagination(10);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    setPlaceholder("Search turfs, owners, or addresses...");
    const handler = (value: string) => {
      setSearch(value);
      pagination.resetPage();
    };
    registerHandler(handler);
    return () => unregisterHandler();
  }, [registerHandler, unregisterHandler, setPlaceholder, pagination]);
  const query = useQuery({
    queryKey: [
      "super-admin-turfs",
      search,
      categoryId,
      status,
      sortField,
      sortDirection,
      pagination.page,
      pagination.pageSize,
    ],
    queryFn: async () => {
      const { sortBy, sortOrder } = getSortParams();
      const result = await httpClient.get<TurfPage>(API_ENDPOINTS.marketplace.superAdminTurfs, {
        params: {
          search,
          categoryId,
          status,
          sortBy,
          sortOrder,
          page: String(pagination.page),
          limit: String(pagination.pageSize),
        },
      });
      return result.data;
    },
  });
  const pageData = query.data;
  const turfs = pageData?.data ?? [];
  const meta = pageData?.meta;
  useEffect(() => {
    if (meta?.total !== undefined) pagination.setTotal(meta.total);
  }, [meta?.total, pagination]);
  const update = useMutation({
    mutationFn: ({
      id,
      nextStatus,
    }: {
      id: string;
      nextStatus: "ACTIVE" | "REJECTED" | "INACTIVE";
    }) =>
      httpClient.patch(`${API_ENDPOINTS.marketplace.superAdminTurfs}/${id}/status`, {
        status: nextStatus,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["super-admin-turfs"] });
      toast.success("Turf status updated");
    },
    onError: () => toast.error("Could not update turf status"),
  });
  const SortHeader = ({ field, label }: { field: string; label: string }) => (
    <TableHead>
      <button
        className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
        onClick={() => handleSort(field)}
      >
        {label}
        {sortField === field && <ArrowUpDown className="size-3" />}
      </button>
    </TableHead>
  );

  return (
    <section className="dashboard-section space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="dashboard-meta">Platform review</p>
          <h1 className="dashboard-title mt-1">Turf approvals</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review venue details before publishing them to customers.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="size-4" />
          {meta?.total ?? 0} venues
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={categoryId || "all"}
          onValueChange={(value) => {
            setCategoryId(value === "all" ? "" : value);
            pagination.resetPage();
          }}
        >
          <SelectTrigger className="w-52">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.value} value={category.value}>
                {category.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={status || "all"}
          onValueChange={(value) => {
            setStatus(value === "all" ? "" : value);
            pagination.resetPage();
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.entries(labels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {query.isLoading ? (
        <TableLoadingState message="Loading turf submissions..." />
      ) : query.isError ? (
        <p className="text-destructive" role="alert">
          Turfs could not be loaded.
        </p>
      ) : (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/30 hover:bg-secondary/30">
                    <SortHeader field="name" label="Turf" />
                    <TableHead>Owner</TableHead>
                    <TableHead>Category</TableHead>
                    <SortHeader field="basePrice" label="Price" />
                    <SortHeader field="status" label="Status" />
                    <TableHead className="text-right">Review</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {turfs.map((turf) => (
                    <TableRow key={turf.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="size-12 overflow-hidden rounded-lg bg-muted">
                            {turf.images[0]?.url && (
                              <img
                                src={turf.images[0].url}
                                alt=""
                                className="size-full object-cover"
                              />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold">{turf.name}</p>
                            <p className="max-w-52 truncate text-xs text-muted-foreground">
                              {turf.address}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{turf.owner.name}</p>
                        <p className="text-xs text-muted-foreground">{turf.owner.email}</p>
                      </TableCell>
                      <TableCell>{turf.category.name}</TableCell>
                      <TableCell>৳ {Number(turf.basePrice).toLocaleString()}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${colors[turf.status]}`}
                        >
                          {labels[turf.status]}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="glass" asChild>
                            <Link href={`/super-admin/dashboard/turfs/${turf.id}`}>
                              <Eye className="size-4" />
                              Review
                            </Link>
                          </Button>
                          {turf.status !== "ACTIVE" && (
                            <Button
                              size="sm"
                              variant="hero"
                              onClick={() => update.mutate({ id: turf.id, nextStatus: "ACTIVE" })}
                              disabled={update.isPending}
                            >
                              <Check className="size-4" />
                              {turf.status === "PENDING_APPROVAL" ? "Approve" : "Set active"}
                            </Button>
                          )}
                          {(turf.status === "DRAFT" || turf.status === "PENDING_APPROVAL") && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => update.mutate({ id: turf.id, nextStatus: "REJECTED" })}
                              disabled={update.isPending}
                            >
                              Reject
                            </Button>
                          )}
                          {turf.status === "ACTIVE" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => update.mutate({ id: turf.id, nextStatus: "INACTIVE" })}
                              disabled={update.isPending}
                            >
                              <X className="size-4" />
                              Unapprove
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!turfs.length && (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <TableEmptyState
                          message="No turf submissions found"
                          description="Try adjusting the search or filters."
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
          </CardContent>
        </Card>
      )}
    </section>
  );
}
