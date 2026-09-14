"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpDown, CircleDollarSign, Eye, MapPin, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TablePagination } from "@/components/common/TablePagination";
import { TableEmptyState, TableLoadingState } from "@/components/common/TableStates";
import { DeleteConfirmDialog } from "@/components/common/DeleteConfirmDialog";
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
import { toast } from "sonner";
import { deleteTurfAction } from "./_actions";

type Turf = {
  id: string;
  name: string;
  address: string;
  area?: string | null;
  status: "PENDING_APPROVAL" | "ACTIVE" | "REJECTED" | "INACTIVE";
  basePrice: string | number;
  category: { name: string };
};
type TurfPage = {
  data: Turf[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};
const labels: Record<Turf["status"], string> = {
  ACTIVE: "Live",
  PENDING_APPROVAL: "In review",
  REJECTED: "Changes needed",
  INACTIVE: "Paused",
};
const colors: Record<Turf["status"], string> = {
  ACTIVE: "text-primary bg-primary/10",
  PENDING_APPROVAL: "text-amber-700 bg-amber-500/10",
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
  const [deleteTarget, setDeleteTarget] = useState<Turf | null>(null);
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
  const remove = useMutation({
    mutationFn: (id: string) => deleteTurfAction(id),
    onSuccess: (result) => {
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      void queryClient.invalidateQueries({ queryKey: ["owner-turfs"] });
      setDeleteTarget(null);
      toast.success("Turf removed");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not remove this turf"),
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="dashboard-meta">Venue management</p>
          <h1 className="dashboard-title mt-1">Your turfs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {meta?.total ?? 0} venues in your account
          </p>
        </div>
        <Button asChild size="lg" variant="hero" className="rounded-xl shadow-lg shadow-primary/20 hover:-translate-y-0.5 hover:shadow-xl">
          <Link href="/admin/dashboard/turfs/new">
            <Plus className="size-4" />
            Add a turf
          </Link>
        </Button>
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
      </div>
      {query.isLoading ? (
        <TableLoadingState message="Loading turfs..." />
      ) : query.isError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-destructive">
          Your turfs could not be loaded. Refresh and try again.
        </div>
      ) : (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/30 hover:bg-secondary/30">
                    <SortHeader field="name" label="Turf" />
                    <TableHead>Location</TableHead>
                    <SortHeader field="basePrice" label="Starting price" />
                    <SortHeader field="status" label="Status" />
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {turfs.map((turf) => (
                    <TableRow key={turf.id}>
                      <TableCell>
                        <div className="font-semibold">{turf.name}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {turf.category.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm">
                          <MapPin className="size-3.5 text-primary" />
                          {turf.area || turf.address}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1 text-sm font-medium">
                          <CircleDollarSign className="size-3.5 text-primary" />
                          ৳ {Number(turf.basePrice).toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${colors[turf.status]}`}
                        >
                          {labels[turf.status]}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="glass" className="shadow-sm hover:-translate-y-0.5 hover:shadow-md" asChild>
                            <Link href={`/admin/dashboard/turfs/${turf.id}`}>
                              <Eye className="mr-1.5 size-4" />
                              View
                            </Link>
                          </Button>
                          <DeleteConfirmDialog
                            open={deleteTarget?.id === turf.id}
                            onOpenChange={(open) => !open && setDeleteTarget(null)}
                            title="Delete Turf"
                            description={`Are you sure you want to delete "${turf.name}"? This action cannot be undone.`}
                            onConfirm={() => remove.mutate(turf.id)}
                            isPending={remove.isPending}
                            trigger={
                              <Button
                                size="sm"
                                variant="destructive"
                                className="shadow-sm shadow-destructive/15 hover:-translate-y-0.5 hover:shadow-md"
                                onClick={() => setDeleteTarget(turf)}
                                aria-label={`Remove ${turf.name}`}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            }
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {turfs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <TableEmptyState
                          message="No turfs found"
                          description={
                            search || categoryId
                              ? "Try adjusting your filters."
                              : "Add your first turf to get started."
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
          </CardContent>
        </Card>
      )}
    </section>
  );
}
