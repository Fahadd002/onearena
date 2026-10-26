"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Plus, Trash2, ArrowUpDown, X, Tag, Edit, RotateCcw, Info } from "lucide-react";
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
import { planSchema, SubscriptionPlanPayload, UpdatePlanPayload, FeaturePayload, featureTypeEnum } from "./schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type BillingPeriod = "MONTHLY" | "QUARTERLY" | "HALF_YEARLY" | "YEARLY";

type Feature = {
  id?: string;
  name: string;
  description?: string;
  type: "GENERAL" | "PREMIUM";
  key?: string;
};

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
  isFreeTrialAllowed?: boolean;
  freeTrialDuration?: number;
  active: boolean;
  features: Feature[];
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
  const [featureDescription, setFeatureDescription] = useState("");
  const [featureType, setFeatureType] = useState<"GENERAL" | "PREMIUM">("GENERAL");
  const [featureKey, setFeatureKey] = useState("");
  const [featureDetailsPlan, setFeatureDetailsPlan] = useState<SubscriptionPlan | null>(null);

  const defaultFormValues: SubscriptionPlanPayload = {
    name: "",
    tierLevel: 1,
    maxTurfs: 1,
    isFreeTrialAllowed: false,
    freeTrialDuration: 0,
    active: true,
    features: [
      { name: "24/7 Support", type: "GENERAL" },
      { name: "Analytics Dashboard", type: "GENERAL" },
    ],
    prices: [
      { period: "MONTHLY", price: 0 },
      { period: "QUARTERLY", price: 0 },
      { period: "HALF_YEARLY", price: 0 },
      { period: "YEARLY", price: 0 },
    ],
  };

  const { register, handleSubmit, reset, control, setValue, formState: { errors }, watch } = useForm<SubscriptionPlanPayload>({
    resolver: zodResolver(planSchema) as any,
    defaultValues: defaultFormValues,
  });

  const { fields: featureFields, append: appendFeature, remove: removeFeature } = useFieldArray({
    control,
    name: "features",
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
      }>(`${API_ENDPOINTS.subscription.plansPricing}`, { params });
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
    setFeatureDescription("");
    setFeatureType("GENERAL");
    setFeatureKey("");
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
      const featureData: Feature = {
        name: featureInput.trim(),
        description: featureDescription.trim() || undefined,
        type: featureType,
      };
      if (featureType === "PREMIUM") {
        featureData.key = featureKey.trim();
      }
      appendFeature(featureData);
      setFeatureInput("");
      setFeatureDescription("");
      setFeatureType("GENERAL");
      setFeatureKey("");
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
      isFreeTrialAllowed: plan.isFreeTrialAllowed ?? false,
      freeTrialDuration: plan.freeTrialDuration ?? 0,
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
                onCheckedChange={(val) => setValue("active", val, { shouldValidate: true })}
              />
              <span className="text-xs font-medium">Active on Storefront</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Free Trial Allowed</label>
            <div className="flex items-center space-x-2 pt-2">
              <Switch
                checked={watch("isFreeTrialAllowed") ?? false}
                onCheckedChange={(val) => setValue("isFreeTrialAllowed", val, { shouldValidate: true })}
              />
              <span className="text-xs font-medium">Allow free trial for this plan</span>
            </div>
            {errors.isFreeTrialAllowed && (
              <p className="text-xs text-destructive mt-1">{errors.isFreeTrialAllowed.message}</p>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Free Trial Duration (Days)</label>
            <Input
              type="number"
              {...register("freeTrialDuration")}
              placeholder="0"
              min="0"
              className="h-9 text-sm"
            />
            {errors.freeTrialDuration && <p className="text-xs text-destructive mt-1">{errors.freeTrialDuration.message}</p>}
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

          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2 items-end">
            <Input
              value={featureInput}
              onChange={(e) => setFeatureInput(e.target.value)}
              placeholder="Feature name (e.g. Custom Domain Support)"
              className="h-9 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddFeature();
                }
              }}
            />
            <Input
              value={featureDescription}
              onChange={(e) => setFeatureDescription(e.target.value)}
              placeholder="Description (optional)"
              className="h-9 text-sm"
            />
            <Button type="button" variant="outline" size="sm" className="h-9" onClick={handleAddFeature}>
              Add Feature
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {featureFields.map((_field, index) => {
              const featureName = watch(`features.${index}.name`);
              const featureTypeVal = watch(`features.${index}.type`);
              const featureDesc = watch(`features.${index}.description`);
              const featureKeyVal = watch(`features.${index}.key`);
              return (
                <Badge key={index} variant={featureTypeVal === "PREMIUM" ? "default" : "secondary"} className="gap-1 text-xs py-1 px-2.5">
                  <Tag className="h-3 w-3" />
                  {featureName ?? ""}
                  {featureDesc && <span className="text-[10px] text-muted-foreground ml-1">({featureDesc})</span>}
                  {featureTypeVal === "PREMIUM" && (
                    <>
                      <span className="text-[10px] font-medium text-primary ml-1">★</span>
                      {featureKeyVal && <span className="text-[10px] text-muted-foreground ml-1">[{featureKeyVal}]</span>}
                    </>
                  )}
                  <button type="button" onClick={() => removeFeature(index)} className="hover:text-destructive ml-1">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              );
            })}
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
                  <TableHead>Free Trial</TableHead>
                  <TableHead>Features</TableHead>
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
                      <TableCell>{plan.maxTurfs} </TableCell>
                      {(["MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY"] as const).map((period) => (
                        <TableCell key={period}>
                          <span className="text-xs font-mono">
                            {pricesMap[period] !== undefined ? `৳ ${pricesMap[period]}` : "--"}
                          </span>
                        </TableCell>
                      ))}

                      <TableCell>
                        {plan.isFreeTrialAllowed ? (
                          <Badge variant="secondary" className="text-xs">
                            {(plan.freeTrialDuration ?? 0) > 0 ? `${plan.freeTrialDuration} days` : "Enabled"}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">Disabled</span>
                        )}
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1">
                          {plan.features && plan.features.length > 0 && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                              onClick={() => setFeatureDetailsPlan(plan)}
                              aria-label="View feature details"
                            >
                              <Info className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {(!plan.features || plan.features.length === 0) && (
                            <span className="text-[10px] text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>

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
      <Dialog open={!!featureDetailsPlan} onOpenChange={(open) => !open && setFeatureDetailsPlan(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Plan Features: {featureDetailsPlan?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 max-h-[70vh] overflow-y-auto pr-2">
            {featureDetailsPlan?.features?.map((feature: Feature, idx: number) => (
              <div key={idx} className="p-3 rounded-lg border bg-muted/30">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-foreground">{feature.name}</p>
                    {feature.description && (
                      <p className="text-sm text-muted-foreground mt-0.5">{feature.description}</p>
                    )}
                  </div>
                  <Badge variant={feature.type === "PREMIUM" ? "default" : "secondary"} className="text-xs">
                    {feature.type}
                  </Badge>
                </div>
                {feature.key && (
                  <p className="mt-2 text-xs font-mono text-muted-foreground bg-background/50 px-2 py-1 rounded">
                    Key: {feature.key}
                  </p>
                )}
              </div>
            ))}
            {(!featureDetailsPlan?.features || featureDetailsPlan.features.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">No features defined for this plan</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}