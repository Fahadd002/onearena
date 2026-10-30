"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, MapPin, Plus} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTable } from "@/components/premium/DataTable";
import { usePagination } from "@/hooks/usePagination";
import { useSearch } from "@/context/SearchContext";
import { useSort } from "@/hooks/useSort";
import { useCategoryOptions } from "@/hooks/useCategoryOptions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { httpClient } from "@/lib/axios/httpClient";
import { API_ENDPOINTS } from "@/lib/api/config";


type Turf = {
  id: string;
  name: string;
  address: string;
  area?: string | null;
  status: "ACTIVE" | "REJECTED" | "INACTIVE";
  defaultSlotPrice: string | number;
  category: { name: string };
};
type TurfPage = {
  data: Turf[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};
const labels: Record<Turf["status"], string> = {
  ACTIVE: "Live",
  REJECTED: "Changes needed",
  INACTIVE: "Paused",
};
const colors: Record<Turf["status"], string> = {
  ACTIVE: "text-primary bg-primary/10",
  REJECTED: "text-destructive bg-destructive/10",
  INACTIVE: "text-muted-foreground bg-muted",
};

export default function AdminTurfsPage() {
  const queryClient = useQueryClient();
  const { registerHandler, unregisterHandler, setPlaceholder } = useSearch();
  const { sortField, sortDirection, handleSort, getSortParams } = useSort("createdAt", "desc");
  const { options: categories } = useCategoryOptions();
  const pagination = usePagination(10);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");

  useEffect(() => {
    setPlaceholder("Search your turfs...");
    const handler = (value: string) => {
      setSearch(value);
      pagination.resetPage();
    };
    registerHandler(handler);
    return () => unregisterHandler();
  }, [registerHandler, unregisterHandler, setPlaceholder, pagination]);

  const query = useQuery({
    queryKey: [
      "owner-turfs",
      search,
      categoryId,
      sortField,
      sortDirection,
      pagination.page,
      pagination.pageSize,
    ],
    queryFn: async () => {
      const { sortBy, sortOrder } = getSortParams();
      const result = await httpClient.get<TurfPage>(API_ENDPOINTS.marketplace.ownerTurfs, {
        params: {
          search,
          categoryId,
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
  
  return (
    <section className="dashboard-section">
      <Card className="surface-elevated">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>All Turfs</CardTitle>
            <div className="flex flex-wrap items-center gap-3">
              {query.isLoading ? (
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-44 rounded-lg bg-muted" />
                  <Skeleton className="h-8 w-24 rounded-lg bg-muted" />
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
                    <SelectTrigger className="h-8 w-44 text-sm">
                      <SelectValue placeholder="Filter by category" />
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
              <Button asChild size="sm" variant="hero" className="h-8 shadow-md shadow-primary/20 transition-transform hover:-translate-y-0.5">
                <Link href="/admin/dashboard/turfs/new">
                  <Plus className="mr-1.5 size-3.5" />
                  Add a turf
                </Link>
              </Button>
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
                      <Skeleton className="h-3 w-16 rounded" />
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                      <Skeleton className="h-3 w-10 rounded" />
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                      <Skeleton className="h-3 w-12 rounded" />
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border text-right">
                      <Skeleton className="h-3 w-14 rounded ml-auto" />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...Array(5)].map((_, i) => (
                    <TableRow key={i} className="border-b border-border">
                      <TableCell className="py-3.5">
                        <Skeleton className="h-4 w-32 rounded" />
                        <Skeleton className="h-3 w-20 rounded mt-1" />
                      </TableCell>
                      <TableCell className="py-3.5">
                        <Skeleton className="h-4 w-40 rounded" />
                      </TableCell>
                      <TableCell className="py-3.5">
                        <Skeleton className="h-4 w-16 rounded" />
                      </TableCell>
                      <TableCell className="py-3.5">
                        <Skeleton className="h-6 w-16 rounded-full" />
                      </TableCell>
                      <TableCell className="py-3.5">
                        <div className="flex justify-end gap-1.5">
                          <Skeleton className="h-7 w-16 rounded-md" />
                          <Skeleton className="h-7 w-7 rounded-md" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : query.isError ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              Your turfs could not be loaded. Refresh and try again.
            </div>
          ) : (
            <DataTable
              columns={[
                {
                  key: "name",
                  header: "Turf",
                  sortable: true,
                  render: (row: Turf) => (
                    <div>
                      <div className="text-sm font-semibold leading-tight">{row.name}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {row.category.name}
                      </div>
                    </div>
                  ),
                },
                {
                  key: "address",
                  header: "Location",
                  render: (row: Turf) => (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="size-3.5 shrink-0 text-primary" />
                      <span className="block max-w-[180px] truncate" title={row.address}>
                        {row.address}
                      </span>
                    </div>
                  ),
                },
                {
                  key: "defaultSlotPrice",
                  header: "Price",
                  sortable: true,
                  render: (row: Turf) => (
                    <span className="flex items-center gap-1 text-sm font-medium">
                      ৳ {Number(row.defaultSlotPrice).toLocaleString()}
                    </span>
                  ),
                },
                {
                  key: "status",
                  header: "Status",
                  sortable: true,
                  render: (row: Turf) => (
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${colors[row.status]}`}
                    >
                      {labels[row.status]}
                    </span>
                  ),
                },
                {
                  key: "actions",
                  header: "",
                  render: (row: Turf) => (
                    <div className="flex justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="glass"
                        className="h-7 px-2.5 text-xs shadow-sm transition-transform hover:-translate-y-0.5"
                        asChild
                      >
                        <Link href={`/admin/dashboard/turfs/${row.id}`}>
                          <Eye className="mr-1 size-3.5" />
                          View
                        </Link>
                      </Button>
                    </div>
                  ),
                },
              ]}
              data={turfs}
              minWidth={900}
              sortKey={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
              currentPage={pagination.page}
              totalPages={meta?.totalPages ?? 0}
              pageSize={pagination.pageSize}
              totalItems={meta?.total ?? 0}
              onPageChange={pagination.setPage}
              onPageSizeChange={pagination.setPageSize}
              emptyTitle="No turfs found"
              emptyDescription={
                search || categoryId
                  ? "Try adjusting your filters."
                  : "Add your first turf to get started."
              }
            />
          )}
        </CardContent>
      </Card>
    </section>
  );
}