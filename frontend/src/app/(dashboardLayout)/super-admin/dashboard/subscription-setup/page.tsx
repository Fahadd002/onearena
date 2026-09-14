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

type BillingPeriod = "MONTHLY" | "QUARTERLY" | "HALF_YEARLY" | "YEARLY";

type SubscriptionPrice = {
  id: string;
  period: BillingPeriod;
  price: string;
};

type SubscriptionPlan = {
  id: string;
  name: string;
  maxTurfs: number;
  active: boolean;
  prices: SubscriptionPrice[];
};

type PlanEdit = {
  name?: string;
  maxTurfs?: number;
  prices?: Partial<Record<BillingPeriod, number>>;
};

export default function SubscriptionSetupPage() {
  const queryClient = useQueryClient();
  const { registerHandler, unregisterHandler, setPlaceholder } = useSearch();
  const { sortField, sortDirection, handleSort, getSortParams } = useSort("name", "asc");
  const pagination = usePagination(10);

  const [name, setName] = useState("");
  const [maxTurfs, setMaxTurfs] = useState("");
  const [monthlyPrice, setMonthlyPrice] = useState("");
  const [quarterlyPrice, setQuarterlyPrice] = useState("");
  const [halfYearlyPrice, setHalfYearlyPrice] = useState("");
  const [yearlyPrice, setYearlyPrice] = useState("");
  const [editing, setEditing] = useState<Record<string, PlanEdit>>({});
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<SubscriptionPlan | null>(null);

  useEffect(() => {
    setPlaceholder("Search subscription plans...");
    const onSearch = (query: string) => {
      setSearch(query);
      pagination.resetPage();
    };
    registerHandler(onSearch);
    return () => unregisterHandler();
  }, [registerHandler, unregisterHandler, setPlaceholder, pagination]);

  const { data: pageData, isLoading } = useQuery({
    queryKey: ["subscription-plans-admin", search, sortField, sortDirection, pagination.page, pagination.pageSize],
    queryFn: async () => {
      const { sortBy, sortOrder } = getSortParams();
      const params: Record<string, unknown> = {
        search, sortBy, sortOrder,
        page: String(pagination.page),
        limit: String(pagination.pageSize),
      };
      const result = await httpClient.get<{
        data: SubscriptionPlan[];
        meta: { page: number; limit: number; total: number; totalPages: number };
      }>(`${API_ENDPOINTS.subscription.plans}/admin`, { params });
      return result.data ?? { data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } };
    },
  });

  const plans = pageData?.data ?? [];
  const meta = pageData?.meta;

  useEffect(() => {
    if (meta?.total !== undefined) {
      pagination.setTotal(meta.total);
    }
  }, [meta?.total, pagination]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await httpClient.post<SubscriptionPlan>(API_ENDPOINTS.subscription.plans, {
        name,
        maxTurfs: Number(maxTurfs),
        active: true,
        prices: [
          { period: "MONTHLY", price: Number(monthlyPrice) },
          { period: "QUARTERLY", price: Number(quarterlyPrice) },
          { period: "HALF_YEARLY", price: Number(halfYearlyPrice) },
          { period: "YEARLY", price: Number(yearlyPrice) },
        ],
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-plans-admin"] });
      setName("");
      setMaxTurfs("");
      setMonthlyPrice("");
      setQuarterlyPrice("");
      setHalfYearlyPrice("");
      setYearlyPrice("");
      toast.success("Subscription plan created successfully");
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to create plan");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: PlanEdit }) => {
      const payload = {
        ...values,
        prices: values.prices
          ? Object.entries(values.prices).map(([period, price]) => ({ period, price }))
          : undefined,
      };
      const res = await httpClient.patch<SubscriptionPlan>(`${API_ENDPOINTS.subscription.plans}/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-plans-admin"] });
      setEditing({});
      toast.success("Subscription plan updated successfully");
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to update plan");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await httpClient.delete(`${API_ENDPOINTS.subscription.plans}/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-plans-admin"] });
      setDeleteTarget(null);
      toast.success("Subscription plan deleted successfully");
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to delete plan");
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
        <h1 className="dashboard-title">Subscription Setup</h1>
      </div>

      {/* Create form */}
      <div className="mt-4 p-4 border rounded-xl bg-card">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[180px]">
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Plan Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Basic" />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Max Turfs</label>
            <Input type="number" value={maxTurfs} onChange={(e) => setMaxTurfs(e.target.value)} placeholder="e.g. 5" />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Monthly Price (৳)</label>
            <Input type="number" value={monthlyPrice} onChange={(e) => setMonthlyPrice(e.target.value)} placeholder="e.g. 499" />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Quarterly Price (৳)</label>
            <Input type="number" value={quarterlyPrice} onChange={(e) => setQuarterlyPrice(e.target.value)} placeholder="e.g. 1299" />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Half-yearly Price (৳)</label>
            <Input type="number" value={halfYearlyPrice} onChange={(e) => setHalfYearlyPrice(e.target.value)} placeholder="e.g. 2490" />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Yearly Price (৳)</label>
            <Input type="number" value={yearlyPrice} onChange={(e) => setYearlyPrice(e.target.value)} placeholder="e.g. 4990" />
          </div>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !name.trim() || !maxTurfs || !monthlyPrice || !quarterlyPrice || !halfYearlyPrice || !yearlyPrice}
          >
            <Plus className="mr-1.5 h-4 w-4" /> Add Plan
          </Button>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <TableLoadingState message="Loading subscription plans..." />
      ) : (
        <div className="mt-4 border rounded-xl overflow-hidden bg-card">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/30 hover:bg-secondary/30">
                  <SortHeader field="name" label="Name" />
                  <TableHead>Max Turfs</TableHead>
                  <TableHead>Monthly</TableHead>
                  <TableHead>Quarterly</TableHead>
                  <TableHead>Half-yearly</TableHead>
                  <TableHead>Yearly</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => {
                  const prices = {
                    MONTHLY: plan.prices?.find((p) => p.period === "MONTHLY")?.price,
                    QUARTERLY: plan.prices?.find((p) => p.period === "QUARTERLY")?.price,
                    HALF_YEARLY: plan.prices?.find((p) => p.period === "HALF_YEARLY")?.price,
                    YEARLY: plan.prices?.find((p) => p.period === "YEARLY")?.price,
                  } satisfies Record<BillingPeriod, string | undefined>;
                  const edit = editing[plan.id];
                  const priceInput = (period: BillingPeriod) => edit?.prices?.[period] ?? Number(prices[period] ?? 0);
                  const updatePrice = (period: BillingPeriod, value: string) => {
                    setEditing((prev) => ({
                      ...prev,
                      [plan.id]: {
                        ...prev[plan.id],
                        prices: { ...prev[plan.id]?.prices, [period]: Number(value) },
                      },
                    }));
                  };
                  return (
                    <TableRow key={plan.id}>
                      <TableCell>
                        {editing[plan.id]?.name !== undefined ? (
                          <Input
                            value={editing[plan.id]?.name ?? plan.name}
                            onChange={(e) => setEditing((prev) => ({ ...prev, [plan.id]: { ...prev[plan.id], name: e.target.value } }))}
                            autoFocus
                          />
                        ) : (
                          <span className="font-medium">{plan.name}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {editing[plan.id]?.maxTurfs !== undefined ? (
                          <Input type="number" value={editing[plan.id]?.maxTurfs ?? plan.maxTurfs} onChange={(e) => setEditing((prev) => ({ ...prev, [plan.id]: { ...prev[plan.id], maxTurfs: Number(e.target.value) } }))} />
                        ) : (
                          <span>{plan.maxTurfs}</span>
                        )}
                      </TableCell>
                      {(["MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY"] as const).map((period) => (
                        <TableCell key={period}>
                          {edit ? (
                            <Input
                              type="number"
                              min="0"
                              value={priceInput(period)}
                              onChange={(event) => updatePrice(period, event.target.value)}
                              className="min-w-24"
                            />
                          ) : (
                            <>৳ {prices[period] ?? "--"}</>
                          )}
                        </TableCell>
                      ))}
                      <TableCell>
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${plan.active ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                          {plan.active ? 'Active' : 'Inactive'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          {editing[plan.id] !== undefined ? (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => updateMutation.mutate({ id: plan.id, values: editing[plan.id] })}
                                disabled={updateMutation.isPending}
                              >
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditing((prev) => { const next = { ...prev }; delete next[plan.id]; return next; })}
                              >
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditing((prev) => ({
                                  ...prev,
                                  [plan.id]: {
                                    name: plan.name,
                                    maxTurfs: plan.maxTurfs,
                                    prices: Object.fromEntries(plan.prices.map((price) => [price.period, Number(price.price)])) as Partial<Record<BillingPeriod, number>>,
                                  },
                                }))}
                              >
                                Edit
                              </Button>
                              <DeleteConfirmDialog
                                open={deleteTarget?.id === plan.id}
                                onOpenChange={(open) => !open && setDeleteTarget(null)}
                                title="Delete Plan"
                                description={`Are you sure you want to delete "${plan.name}"? This action cannot be undone.`}
                                onConfirm={() => deleteMutation.mutate(plan.id)}
                                isPending={deleteMutation.isPending}
                                trigger={
                                  <Button size="sm" variant="destructive" onClick={() => setDeleteTarget(plan)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                }
                              />
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {plans.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <TableEmptyState
                        message="No subscription plans found"
                        description={search ? "Try adjusting your search." : "Add a plan above to get started."}
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