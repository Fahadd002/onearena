"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpDown, CircleDollarSign, Eye, Plus, Trash2 } from "lucide-react";
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
import { useSort } from "@/hooks/useSort";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { httpClient } from "@/lib/axios/httpClient";
import { API_ENDPOINTS } from "@/lib/api/config";
import { toast } from "sonner";
import { deletePackageAction } from "./_actions";
import { useSearch } from "@/context/SearchContext";

type Turf = { id: string; name: string };
type Package = {
  id: string;
  name: string;
  description?: string | null;
  price: string | number;
  active: boolean;
  turf: { name: string };
  facilities: Array<{ facility: { id: string; name: string } }>;
};

type PackagePage = {
  data: Package[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

export default function AdminPackagesPage() {
  const queryClient = useQueryClient();
  const pagination = usePagination(10);
  const { sortField, sortDirection, handleSort, getSortParams } = useSort("createdAt", "desc");
  const [selectedTurfId, setSelectedTurfId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Package | null>(null);
  const { registerHandler, unregisterHandler, setPlaceholder } = useSearch();

  const { data: turfsData, isLoading: turfsLoading } = useQuery({
    queryKey: ["owner-turfs-dropdown"],
    queryFn: async () => (await httpClient.get<Turf[]>(API_ENDPOINTS.marketplace.ownerTurfs)).data,
  });

  const turfs = turfsData ?? [];

  const packagesQuery = useQuery({
    queryKey: ["owner-packages", selectedTurfId, search, sortField, sortDirection, pagination.page, pagination.pageSize],
    queryFn: async () => {
      const { sortBy, sortOrder } = getSortParams();
      const result = await httpClient.get<PackagePage>(API_ENDPOINTS.marketplace.ownerPackages, {
        params: {
          ...(selectedTurfId ? { turfId: selectedTurfId } : {}),
          ...(search ? { search } : {}),
          sortBy,
          sortOrder,
          page: String(pagination.page),
          limit: String(pagination.pageSize),
        },
      });
      return result.data;
    },
  });

  const packages = packagesQuery.data?.data ?? [];
  const meta = packagesQuery.data?.meta;

  useEffect(() => {
    if (meta?.total !== undefined) pagination.setTotal(meta.total);
  }, [meta?.total, pagination]);

  useEffect(() => {
    setPlaceholder("Search packages...");
    const handler = (value: string) => {
      setSearch(value);
      pagination.resetPage();
    };
    registerHandler(handler);
    return () => unregisterHandler();
  }, [registerHandler, unregisterHandler, setPlaceholder, pagination]);

  const remove = useMutation({
    mutationFn: (id: string) => deletePackageAction(id),
    onSuccess: (result) => {
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      void queryClient.invalidateQueries({ queryKey: ["owner-packages"] });
      setDeleteTarget(null);
      toast.success("Package removed");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not remove this package"),
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
          <p className="dashboard-meta">Package management</p>
          <h1 className="dashboard-title mt-1">Packages</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {meta?.total !== undefined ? `${meta.total} package${meta.total !== 1 ? "s" : ""}` : "All packages"}
          </p>
        </div>
        <Button asChild size="lg">
          <Link href={`/admin/dashboard/packages/new?turfId=${selectedTurfId}`}>
            <Plus className="size-4" />
            Add package
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={selectedTurfId}
          onValueChange={(value) => {
            setSelectedTurfId(value);
            pagination.resetPage();
          }}
        >
          <SelectTrigger className="w-72">
            <SelectValue placeholder={turfsLoading ? "Loading turfs..." : "Filter by turf"} />
          </SelectTrigger>
          <SelectContent>
            {turfs.map((turf) => (
              <SelectItem key={turf.id} value={turf.id}>
                {turf.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {packagesQuery.isLoading ? (
        <TableLoadingState message="Loading packages..." />
      ) : packagesQuery.isError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-destructive">
          Packages could not be loaded. Refresh and try again.
        </div>
      ) : (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/30 hover:bg-secondary/30">
                    <SortHeader field="name" label="Package" />
                    <TableHead>Turf</TableHead>
                    <SortHeader field="price" label="Price" />
                    <SortHeader field="active" label="Status" />
                    <TableHead>Facilities</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {packages.map((pkg) => (
                    <TableRow key={pkg.id}>
                      <TableCell>
                        <div className="font-semibold">{pkg.name}</div>
                        {pkg.description && (
                          <div className="mt-1 text-xs text-muted-foreground line-clamp-1">
                            {pkg.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">{pkg.turf?.name}</span>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1 text-sm font-medium">
                          <CircleDollarSign className="size-3.5 text-primary" />
                          ৳ {Number(pkg.price).toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                            pkg.active
                              ? "text-emerald-700 bg-emerald-500/10"
                              : "text-muted-foreground bg-muted"
                          }`}
                        >
                          {pkg.active ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {pkg.facilities?.length ?? 0} facilities
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/admin/dashboard/packages/${pkg.id}/edit?turfId=${selectedTurfId}`}>
                              <Eye className="mr-1.5 size-4" />
                              Edit
                            </Link>
                          </Button>
                          <DeleteConfirmDialog
                            open={deleteTarget?.id === pkg.id}
                            onOpenChange={(open) => !open && setDeleteTarget(null)}
                            title="Delete Package"
                            description={`Are you sure you want to delete "${pkg.name}"? This action cannot be undone.`}
                            onConfirm={() => remove.mutate(pkg.id)}
                            isPending={remove.isPending}
                            trigger={
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setDeleteTarget(pkg)}
                                aria-label={`Remove ${pkg.name}`}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            }
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {packages.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <TableEmptyState
                          message="No packages found"
                          description={
                            search
                              ? "Try adjusting your search or filter."
                              : "Create your first package to get started."
                          }
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {meta && (
              <TablePagination
                page={pagination.page}
                totalPages={meta.totalPages}
                total={meta.total}
                pageSize={pagination.pageSize}
                onPageChange={pagination.setPage}
                onPageSizeChange={pagination.setPageSize}
              />
            )}
          </CardContent>
        </Card>
      )}
    </section>
  );
}
