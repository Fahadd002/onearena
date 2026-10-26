"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Eye, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
} from "@/components/ui/table";
import { DataTable } from "@/components/premium/DataTable";
import { Skeleton } from "@/components/ui/skeleton";
import { usePagination } from "@/hooks/usePagination";
import { useSearch } from "@/context/SearchContext";
import { useSort } from "@/hooks/useSort";
import { useCategoryOptions } from "@/hooks/useCategoryOptions";
import { httpClient } from "@/lib/axios/httpClient";
import { API_ENDPOINTS } from "@/lib/api/config";
import { toast } from "sonner";
import { getFileUrl } from "@/lib/utils";

type Status = "ACTIVE" | "INACTIVE" | "REJECTED";
type Turf = {
  id: string;
  name: string;
  address: string;
  status: Status;
  defaultSlotPrice: string | number;
  category: { name: string };
  owner: { name: string; email: string };
  images: Array<{ url: string }>;
};
type TurfPage = {
  data: Turf[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};
const labels: Record<Status, string> = {
  ACTIVE: "Approved",
  INACTIVE: "Unapproved",
  REJECTED: "Rejected",
};
const colors: Record<Status, string> = {
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

  return (
    <section className="dashboard-section">
      <Card className="surface-elevated overflow-hidden">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
              <CardTitle>Turf approvals</CardTitle>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {query.isLoading ? (
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-44 rounded-lg bg-muted" />
                  <Skeleton className="h-8 w-44 rounded-lg bg-muted" />
                </div>
              ) : (
                <>
                  <Select
                    value={categoryId || "all"}
                    onValueChange={(value) => {
                      setCategoryId(value === "all" ? "" : value);
                      pagination.resetPage();
                    }}
                  >
                    <SelectTrigger className="w-44 text-sm h-8">
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
                    <SelectTrigger className="w-44 text-sm h-8">
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
                </>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {query.isLoading ? (
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
          ) : query.isError ? (
            <p className="text-destructive" role="alert">Turfs could not be loaded.</p>
          ) : turfs.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-title-md font-semibold">No turf submissions found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try adjusting the search or filters.
              </p>
            </div>
          ) : (
            <DataTable
              columns={[
                {
                  key: "turf",
                  header: "Turf",
                  sortable: true,
                  render: (row: Turf) => (
                    <div className="flex items-center gap-3">
                      <div className="relative size-10 overflow-hidden rounded-lg bg-muted">
                        {row.images[0]?.url && (
                          <Image
                            src={getFileUrl(row.images[0]?.url) ?? ""}
                            alt=""
                            fill
                            className="size-full object-cover"
                            sizes="(max-width: 768px) 100vw, 80px"
                          />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold">{row.name}</p>
                        <p className="max-w-52 truncate text-xs text-muted-foreground">
                          {row.address}
                        </p>
                      </div>
                    </div>
                  ),
                },
                {
                  key: "owner",
                  header: "Owner",
                  render: (row: Turf) => (
                    <div>
                      <p className="font-medium">{row.owner.name}</p>
                      <p className="text-xs text-muted-foreground">{row.owner.email}</p>
                    </div>
                  ),
                },
                {
                  key: "category",
                  header: "Category",
                  render: (row: Turf) => <p>{row.category.name}</p>,
                },
                {
                  key: "defaultSlotPrice",
                  header: "Price",
                  sortable: true,
                  render: (row: Turf) => (
                    <p className="font-medium">
                      ৳ {Number(row.defaultSlotPrice).toLocaleString()}
                    </p>
                  ),
                },
                {
                  key: "status",
                  header: "Status",
                  sortable: true,
                  render: (row: Turf) => (
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${colors[row.status]}`}
                    >
                      {labels[row.status]}
                    </span>
                  ),
                },
                {
                  key: "actions",
                  header: "Review",
                  render: (row: Turf) => (
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="glass" asChild>
                        <Link href={`/super-admin/dashboard/turfs/${row.id}`}>
                          <Eye className="size-4" />
                          Review
                        </Link>
                      </Button>
                      {row.status !== "ACTIVE" && (
                        <Button
                          size="sm"
                          variant="hero"
                          onClick={() => update.mutate({ id: row.id, nextStatus: "ACTIVE" })}
                          disabled={update.isPending}
                        />
                      )}
                      {row.status === "ACTIVE" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => update.mutate({ id: row.id, nextStatus: "INACTIVE" })}
                          disabled={update.isPending}
                        >
                          <X className="size-4" />
                          Unapprove
                        </Button>
                      )}
                    </div>
                  ),
                },
              ]}
              data={turfs}
              minWidth={1120}
              sortKey={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
              currentPage={pagination.page}
              totalPages={meta?.totalPages ?? 1}
              pageSize={pagination.pageSize}
              totalItems={meta?.total ?? 0}
              onPageChange={pagination.setPage}
              onPageSizeChange={pagination.setPageSize}
              emptyTitle="No turf submissions found"
              emptyDescription="Try adjusting the search or filters."
            />
          )}
        </CardContent>
      </Card>
    </section>
  );
}
