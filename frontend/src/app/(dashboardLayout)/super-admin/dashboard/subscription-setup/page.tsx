"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Plus, Trash2, ArrowUpDown, X, Tag, Edit, RotateCcw } from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
import {
  createSubscriptionPlanAction,
  updateSubscriptionPlanAction,
  deleteSubscriptionPlanAction,
} from "./_actions";
import { planSchema, SubscriptionPlanPayload, UpdatePlanPayload } from "./schema";

type BillingPeriod = "MONTHLY" | "QUARTERLY" | "HALF_YEARLY" | "YEARLY";

type SubscriptionPrice = {
  id?: string;
  period: BillingPeriod;
  price: number | string;
};

type SubscriptionPlan = {
  id: string;
  name: string;
  description?: string;
  tierLevel?: number;
  maxTurfs: number;
  active: boolean;
  features: string[];
  prices: SubscriptionPrice[];
};

export default function SubscriptionSetupPage() {
  const queryClient = useQueryClient();
  const { registerHandler, unregisterHandler, setPlaceholder } = useSearch();
  const { sortField, sortDirection, handleSort, getSortParams } = useSort("name", "asc");
  const pagination = usePagination(10);

  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<SubscriptionPlan | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [featureInput, setFeatureInput] = useState("");

  const defaultFormValues: SubscriptionPlanPayload = {
    name: "",
    tierLevel: 1,
    maxTurfs: 1,
    active: true,
    features: ["24/7 Support", "Analytics Dashboard"],
    prices: [
      { period: "MONTHLY", price: 0 },
      { period: "QUARTERLY", price: 0 },
      { period: "HALF_YEARLY", price: 0 },
      { period: "YEARLY", price: 0 },
    ],
  };

  const { register, handleSubmit, reset, control, formState: { errors }, watch } = useForm<SubscriptionPlanPayload>({
    resolver: zodResolver(planSchema),
    defaultValues: defaultFormValues,
  });

  const { fields: featureFields, append: appendFeature, remove: removeFeature } = useFieldArray({
    control,
    name: "features" as never,
  });

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
        search,
        sortBy,
        sortOrder,
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

  const resetFormState = () => {
    setEditingId(null);
    reset(defaultFormValues);
    setFeatureInput("");
  };

  const createMutation = useMutation({
    mutationFn: async (payload: SubscriptionPlanPayload) => {
      const res = await createSubscriptionPlanAction(payload);
      if (!res.success) throw new Error(res.message);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-plans-admin"] });
      resetFormState();
      toast.success("Subscription plan created successfully");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to create plan"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: UpdatePlanPayload }) => {
      const res = await updateSubscriptionPlanAction(id, values);
      if (!res.success) throw new Error(res.message);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-plans-admin"] });
      resetFormState();
      toast.success("Subscription plan updated successfully");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to update plan"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await deleteSubscriptionPlanAction(id);
      if (!res.success) throw new Error(res.message);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-plans-admin"] });
      setDeleteTarget(null);
      toast.success("Subscription plan deleted successfully");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to delete plan"),
  });

  const handleAddFeature = () => {
    if (featureInput.trim()) {
      appendFeature(featureInput.trim() as never);
      setFeatureInput("");
    }
  };

  const handleFormSubmit = (data: SubscriptionPlanPayload) => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, values: data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEditClick = (plan: SubscriptionPlan) => {
    setEditingId(plan.id);

    const periods: BillingPeriod[] = ["MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY"];
    const formattedPrices = periods.map((period) => {
      const existingPrice = plan.prices?.find((p) => p.period === period);
      return {
        period,
        price: existingPrice ? Number(existingPrice.price) : 0,
      };
    });

    reset({
      name: plan.name,
      tierLevel: plan.tierLevel ?? 1,
      maxTurfs: plan.maxTurfs,
      active: plan.active,
      features: plan.features || [],
      prices: formattedPrices,
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

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

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <section className="dashboard-section space-y-6">
      <div>
        <h1 className="dashboard-title text-2xl font-bold tracking-tight">Subscription Plan Management</h1>
        <p className="text-sm text-muted-foreground">Configure pricing tiers, turf limits, and feature allocations.</p>
      </div>

      <form
        onSubmit={handleSubmit(handleFormSubmit)}
        className="p-5 border rounded-xl bg-card shadow-sm space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" />
            {editingId ? "Edit Subscription Tier" : "Add New Subscription Tiers"}
          </h2>
          {editingId && (
            <Button type="button" variant="ghost" size="sm" onClick={resetFormState} className="text-xs gap-1">
              <RotateCcw className="h-3.5 w-3.5" /> Cancel Editing
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Plan Name</label>
            <Input {...register("name")} placeholder="e.g. Enterprise Tier" />
            {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Tier Level</label>
            <Input type="number" {...register("tierLevel")} placeholder="e.g. 1" min="0" />
            {errors.tierLevel && <p className="text-xs text-destructive mt-1">{errors.tierLevel.message}</p>}
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Max Turfs Allowed</label>
            <Input type="number" {...register("maxTurfs")} placeholder="e.g. 10" />
            {errors.maxTurfs && <p className="text-xs text-destructive mt-1">{errors.maxTurfs.message}</p>}
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
            <div className="flex items-center space-x-2 pt-2">
              <Switch
                checked={watch("active") ?? true}
                onCheckedChange={(val) => register("active").onChange({ target: { value: val } })}
              />
              <span className="text-xs font-medium">Active on Storefront</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          {(["MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY"] as const).map((period, index) => (
            <div key={period} className="p-2.5 border rounded-lg bg-background">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">{period.replace("_", " ")} (৳)</span>
              <input type="hidden" {...register(`prices.${index}.period`)} value={period} />
              <Input
                type="number"
                step="0.01"
                className="mt-1 h-8 text-sm"
                {...register(`prices.${index}.price`)}
                placeholder="0.00"
              />
              {errors.prices?.[index]?.price && (
                <p className="text-[10px] text-destructive mt-0.5">{errors.prices[index]?.price?.message}</p>
              )}
            </div>
          ))}
        </div>

        <div className="space-y-2 pt-2">
          <label className="text-xs font-medium text-muted-foreground block">Plan Features</label>
          <div className="flex gap-2">
            <Input
              value={featureInput}
              onChange={(e) => setFeatureInput(e.target.value)}
              placeholder="e.g. Custom Domain Support"
              className="max-w-md h-9 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddFeature();
                }
              }}
            />
            <Button type="button" variant="outline" size="sm" onClick={handleAddFeature}>
              Add Feature
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {featureFields.map((_field, index) => (
              <Badge key={index} variant="secondary" className="gap-1 text-xs py-1 px-2.5">
                <Tag className="h-3 w-3" />
                {watch(`features.${index}`) ?? ""}
                <button type="button" onClick={() => removeFeature(index)} className="hover:text-destructive ml-1">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          {errors.features && <p className="text-xs text-destructive">{errors.features.message}</p>}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          {editingId && (
            <Button type="button" variant="outline" onClick={resetFormState} disabled={isSubmitting}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? editingId ? "Updating..." : "Creating..."
              : editingId ? "Update Subscription Plan" : "Save Subscription Plan"}
          </Button>
        </div>
      </form>

      {isLoading ? (
        <TableLoadingState message="Loading subscription plans..." />
      ) : (
        <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <SortHeader field="name" label="Plan Tiers" />
                  <TableHead>Turf Limit</TableHead>
                  <TableHead>Monthly</TableHead>
                  <TableHead>Quarterly</TableHead>
                  <TableHead>Half-Yearly</TableHead>
                  <TableHead>Yearly</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => {
                  const pricesMap = {
                    MONTHLY: plan.prices?.find((p) => p.period === "MONTHLY")?.price,
                    QUARTERLY: plan.prices?.find((p) => p.period === "QUARTERLY")?.price,
                    HALF_YEARLY: plan.prices?.find((p) => p.period === "HALF_YEARLY")?.price,
                    YEARLY: plan.prices?.find((p) => p.period === "YEARLY")?.price,
                  };

                  return (
                    <TableRow key={plan.id} className={editingId === plan.id ? "bg-muted/30" : ""}>
                      <TableCell className="font-medium">{plan.name}</TableCell>
                      <TableCell>{`${plan.maxTurfs} Turfs`}</TableCell>
                      {(["MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY"] as const).map((period) => (
                        <TableCell key={period}>
                          <span className="text-xs font-mono">
                            {pricesMap[period] !== undefined ? `৳ ${pricesMap[period]}` : "--"}
                          </span>
                        </TableCell>
                      ))}

                      <TableCell>
                        <Switch
                          checked={plan.active}
                          onCheckedChange={(checked) => {
                            updateMutation.mutate({ id: plan.id, values: { active: checked } });
                          }}
                        />
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-2.5 text-xs gap-1"
                            onClick={() => handleEditClick(plan)}
                          >
                            <Edit className="h-3.5 w-3.5" /> Edit
                          </Button>

                          <DeleteConfirmDialog
                            open={deleteTarget?.id === plan.id}
                            onOpenChange={(open) => !open && setDeleteTarget(null)}
                            title="Delete Subscription Plan"
                            description={`Are you sure you want to permanently delete "${plan.name}"?`}
                            onConfirm={() => deleteMutation.mutate(plan.id)}
                            isPending={deleteMutation.isPending}
                            trigger={
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-8 w-8 p-0"
                                onClick={() => setDeleteTarget(plan)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            }
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {plans.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9}>
                      <TableEmptyState
                        message="No subscription plans found"
                        description={search ? "Try adjusting your search criteria." : "Add a plan using the form above."}
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