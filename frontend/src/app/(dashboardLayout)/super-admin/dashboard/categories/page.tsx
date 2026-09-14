"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Plus, Save, Trash2, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
} from "@/components/ui/table";
import { toast } from "sonner";
import { httpClient } from "@/lib/axios/httpClient";
import { API_ENDPOINTS } from "@/lib/api/config";
import { useSearch } from "@/context/SearchContext";
import { useSort } from "@/hooks/useSort";
import { usePagination } from "@/hooks/usePagination";
import { TablePagination } from "@/components/common/TablePagination";
import { DeleteConfirmDialog } from "@/components/common/DeleteConfirmDialog";
import { TableLoadingState, TableEmptyState } from "@/components/common/TableStates";

type Category = { id: string; name: string };

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const { registerHandler, unregisterHandler, setPlaceholder } = useSearch();
  const { sortField, sortDirection, handleSort, getSortParams } = useSort("name", "asc");
  const pagination = usePagination(10);

  const [name, setName] = useState("");
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  useEffect(() => {
    setPlaceholder("Search categories...");
    const onSearch = (query: string) => {
      setSearch(query);
      pagination.resetPage();
    };
    registerHandler(onSearch);
    return () => unregisterHandler();
  }, [registerHandler, unregisterHandler, setPlaceholder, pagination]);

  const { data: pageData, isLoading } = useQuery({
    queryKey: ["categories-admin", search, sortField, sortDirection, pagination.page, pagination.pageSize],
    queryFn: async () => {
      const { sortBy, sortOrder } = getSortParams();
      const params: Record<string, unknown> = {
        search,
        sortBy,
        sortOrder,
        page: String(pagination.page),
        limit: String(pagination.pageSize),
      };
      const result = await httpClient.get<{
        data: Category[];
        meta: { page: number; limit: number; total: number; totalPages: number };
      }>(API_ENDPOINTS.marketplace.categories, { params });
      return result.data ?? { data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } };
    },
  });

  const categories = pageData?.data ?? [];
  const meta = pageData?.meta;

  useEffect(() => {
    if (meta?.total !== undefined) {
      pagination.setTotal(meta.total);
    }
  }, [meta?.total, pagination]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await httpClient.post<Category>(API_ENDPOINTS.marketplace.categories, { name });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories-admin"] });
      setName("");
      toast.success("Category created successfully");
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to create category");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: string }) => {
      const res = await httpClient.patch<Category>(`${API_ENDPOINTS.marketplace.categories}/${id}`, { name: value });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories-admin"] });
      setEditing({});
      toast.success("Category updated successfully");
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to update category");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await httpClient.delete(`${API_ENDPOINTS.marketplace.categories}/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories-admin"] });
      setDeleteTarget(null);
      toast.success("Category deleted successfully");
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to delete category");
    },
  });

  const SortHeader = ({ field, label }: { field: string; label: string }) => (
    <TableHead>
      <button
        className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
        onClick={() => handleSort(field)}
      >
        {label}
        {sortField === field && <ArrowUpDown className="h-3 w-3" />}
      </button>
    </TableHead>
  );

  return (
    <section className="dashboard-section">
      <div>
        <h1 className="dashboard-title">Sport Categories</h1>
      </div>

      {/* Create form */}
      <div className="mt-4 p-4 border rounded-xl bg-card">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Category Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Badminton"
            />
          </div>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !name.trim()}
          >
            <Plus className="mr-1.5 h-4 w-4" /> Add Category
          </Button>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <TableLoadingState message="Loading categories..." />
      ) : (
        <div className="mt-4 border rounded-xl overflow-hidden bg-card">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/30 hover:bg-secondary/30">
                  <SortHeader field="name" label="Name" />
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell>
                      {editing[category.id] !== undefined ? (
                        <Input
                          value={editing[category.id]}
                          onChange={(e) => setEditing((prev) => ({ ...prev, [category.id]: e.target.value }))}
                          autoFocus
                        />
                      ) : (
                        <span className="font-medium">{category.name}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        {editing[category.id] !== undefined ? (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => updateMutation.mutate({ id: category.id, value: editing[category.id] })}
                              disabled={updateMutation.isPending}
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditing((prev) => { const next = { ...prev }; delete next[category.id]; return next; })}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditing((prev) => ({ ...prev, [category.id]: category.name }))}
                            >
                              Edit
                            </Button>
                            <DeleteConfirmDialog
                              open={deleteTarget?.id === category.id}
                              onOpenChange={(open) => !open && setDeleteTarget(null)}
                              title="Delete Category"
                              description={`Are you sure you want to delete "${category.name}"? This action cannot be undone.`}
                              onConfirm={() => deleteMutation.mutate(category.id)}
                              isPending={deleteMutation.isPending}
                              trigger={
                                <Button size="sm" variant="destructive" onClick={() => setDeleteTarget(category)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              }
                            />
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {categories.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2}>
                      <TableEmptyState
                        message="No categories found"
                        description={search ? "Try adjusting your search." : "Add a category above to get started."}
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
    </section>
  );
}
