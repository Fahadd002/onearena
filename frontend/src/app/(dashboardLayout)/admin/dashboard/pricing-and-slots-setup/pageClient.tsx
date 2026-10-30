"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Clock3,
  Loader2,
  Trash2,
  Power,
  PowerOff,
  Calendar,
  Save,
  Filter,
  X,
  Building2,
  Sparkles,
  AlertCircle,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TableLoadingState } from "@/components/common/TableStates";
import { DeleteConfirmDialog } from "@/components/common/DeleteConfirmDialog";
import { httpClient } from "@/lib/axios/httpClient";
import { API_ENDPOINTS } from "@/lib/api/config";
import { ApiResponse } from "@/types/api.type";
import {
  DAY_NAMES,
  formatTimeWithPeriod,
  timeToMinutes,
} from "@/lib/time-utils";
import { validatePrice, sanitizePrice } from "@/lib/validations";
import {
  createPriceRuleAction,
  createPriceRuleBulkAction,
  deletePriceRuleAction,
  updatePriceRuleAction,
  generateSlotsAction,
  listTurfSlotsAction,
  listSlotTimeSetupsAction,
  updateSlotAction,
  type PriceRulePayload,
  type PriceRuleBulkPayload,
  type StoredSlot,
  type StoredSlotTimeSetup,
  type StoredPriceRule,
} from "./_actions";
import { Skeleton } from "@/components/ui/skeleton";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type Turf = { id: string; name: string };
type PriceRule = StoredPriceRule;
type Tab = "pricing-rules" | "slots";

const today = new Date();
const todayISO = today.toISOString().split("T")[0];

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function AdminPricingAndSlotsPage() {
  const queryClient = useQueryClient();
  const [selectedTurfId, setSelectedTurfId] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("pricing-rules");

  // ---------- Price rule form ----------
  const [dayOfWeek, setDayOfWeek] = useState(0);
  const [slotTimeSetupId, setSlotTimeSetupId] = useState("");
  const [price, setPrice] = useState("");
  const [active, setActive] = useState(true);
  const [applyToAll, setApplyToAll] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PriceRule | null>(null);

  // Selected slot time filter tab (id or null = All)
  const [activeSetupFilter, setActiveSetupFilter] = useState<string | null>(null);

  // ---------- Slots ----------
  const [slotDate, setSlotDate] = useState(todayISO);
  const [generatingSlots, setGeneratingSlots] = useState(false);
  const [draftPrices, setDraftPrices] = useState<Record<string, string>>({});
  const [timeFilter, setTimeFilter] = useState<{ start: string; end: string } | null>(
    null,
  );
  const [filterStartTime, setFilterStartTime] = useState("");
  const [filterEndTime, setFilterEndTime] = useState("");

  /* -------------------------------------------------------------------------- */
  /* Queries                                                                    */
  /* -------------------------------------------------------------------------- */

  const { data: turfsData, isLoading: turfsLoading } = useQuery({
    queryKey: ["owner-turfs-dropdown"],
    queryFn: async () =>
      (await httpClient.get<Turf[]>(API_ENDPOINTS.marketplace.ownerTurfs)).data,
  });
  const turfs = turfsData ?? [];

  const { data: setupsData, isLoading: setupsLoading } = useQuery({
    queryKey: ["slot-time-setups"],
    queryFn: async () => {
      const result = await listSlotTimeSetupsAction();
      if (!result.success) throw new Error(result.message);
      return (result as ApiResponse<StoredSlotTimeSetup[]>).data;
    },
  });
  const setups: StoredSlotTimeSetup[] = setupsData ?? [];

  const { data: rulesData, isLoading: rulesLoading } = useQuery({
    queryKey: ["price-rules", selectedTurfId],
    enabled: !!selectedTurfId,
    queryFn: async () => {
      const result = await httpClient.get<PriceRule[]>(
        `${API_ENDPOINTS.marketplace.ownerTurfs}/${selectedTurfId}/pricing`,
      );
      return result.data;
    },
  });
  const rules: PriceRule[] = rulesData ?? [];

  const {
    data: slotsData,
    isLoading: slotsLoading,
    refetch: refetchSlots,
  } = useQuery({
    queryKey: ["turf-slots", selectedTurfId, slotDate],
    enabled: !!selectedTurfId,
    queryFn: async () => {
      const result = await listTurfSlotsAction(selectedTurfId, { date: slotDate });
      if (!result.success) throw new Error(result.message);
      return (result as ApiResponse<StoredSlot[]>).data;
    },
  });
  const slots: StoredSlot[] = slotsData ?? [];

  /* -------------------------------------------------------------------------- */
  /* Mutations                                                                  */
  /* -------------------------------------------------------------------------- */

  const createRule = useMutation({
    mutationFn: (payload: PriceRulePayload) =>
      createPriceRuleAction(selectedTurfId, payload),
    onSuccess: (result: { success: boolean; message?: string }) => {
      if (!result.success) {
        toast.error(result.message || "Could not create pricing rule");
        return;
      }
      toast.success("Pricing rule created");
      void queryClient.invalidateQueries({
        queryKey: ["price-rules", selectedTurfId],
      });
      resetForm();
    },
    onError: (error) =>
      toast.error(
        error instanceof Error ? error.message : "Could not create pricing rule",
      ),
  });

  const createBulk = useMutation({
    mutationFn: (payload: PriceRuleBulkPayload) =>
      createPriceRuleBulkAction(selectedTurfId, payload),
    onSuccess: (result: { success: boolean; message?: string }) => {
      if (!result.success) {
        toast.error(result.message || "Could not apply pricing rules");
        return;
      }
      toast.success("Pricing rules applied to all 7 days");
      void queryClient.invalidateQueries({
        queryKey: ["price-rules", selectedTurfId],
      });
      resetForm();
    },
    onError: (error) =>
      toast.error(
        error instanceof Error ? error.message : "Could not apply pricing rules",
      ),
  });

  const updateRule = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Partial<PriceRulePayload>;
    }) => updatePriceRuleAction(id, payload),
    onSuccess: (result: { success: boolean; message?: string }) => {
      if (!result.success) {
        toast.error(result.message || "Could not update pricing rule");
        return;
      }
      toast.success("Pricing rule updated");
      void queryClient.invalidateQueries({
        queryKey: ["price-rules", selectedTurfId],
      });
    },
    onError: (error) =>
      toast.error(
        error instanceof Error ? error.message : "Could not update pricing rule",
      ),
  });

  const removeRule = useMutation({
    mutationFn: (id: string) => deletePriceRuleAction(id),
    onSuccess: (result: { success: boolean; message?: string }) => {
      if (!result.success) {
        toast.error(result.message || "Could not delete pricing rule");
        return;
      }
      toast.success("Pricing rule deleted");
      void queryClient.invalidateQueries({
        queryKey: ["price-rules", selectedTurfId],
      });
      setDeleteTarget(null);
    },
    onError: (error) =>
      toast.error(
        error instanceof Error ? error.message : "Could not delete pricing rule",
      ),
  });

  const generateSlots = useMutation({
    mutationFn: () => generateSlotsAction(selectedTurfId, { days: 90 }),
    onSuccess: (result: { success: boolean; message?: string }) => {
      if (!result.success) {
        toast.error(result.message || "Could not generate slots");
        return;
      }
      toast.success("Slots generated for next 90 days");
      void refetchSlots();
    },
    onError: (error) =>
      toast.error(
        error instanceof Error ? error.message : "Could not generate slots",
      ),
    onSettled: () => setGeneratingSlots(false),
  });

  const updateSlot = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: { active?: boolean; price?: number };
    }) => updateSlotAction(id, payload),
    onSuccess: (result: { success: boolean; message?: string }) => {
      if (!result.success) {
        toast.error(result.message || "Could not update slot");
        return;
      }
      toast.success("Slot updated");
      void queryClient.invalidateQueries({
        queryKey: ["turf-slots", selectedTurfId, slotDate],
      });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not update slot"),
  });

  /* -------------------------------------------------------------------------- */
  /* Derived                                                                    */
  /* -------------------------------------------------------------------------- */

  const isMutating =
    createRule.isPending || createBulk.isPending || updateRule.isPending;

  const filteredSlots = useMemo(() => {
    if (!timeFilter) return slots;
    const filterStart = timeToMinutes(timeFilter.start);
    const filterEnd = timeToMinutes(timeFilter.end);
    return slots.filter(
      (slot) => slot.startMinute >= filterStart && slot.endMinute <= filterEnd,
    );
  }, [slots, timeFilter]);

  const isLoading = rulesLoading || setupsLoading;
  const selectedTurfName = turfs.find((t) => t.id === selectedTurfId)?.name;

  /* -------------------------------------------------------------------------- */
  /* Helpers                                                                    */
  /* -------------------------------------------------------------------------- */

  function resetForm() {
    setDayOfWeek(0);
    setSlotTimeSetupId("");
    setPrice("");
    setActive(true);
    setApplyToAll(false);
    setEditingRuleId(null);
  }

  function startEdit(rule: PriceRule) {
    setEditingRuleId(rule.id);
    setDayOfWeek(rule.dayOfWeek);
    setPrice(String(rule.price));
    setActive(rule.active);
    setApplyToAll(false);
    setSlotTimeSetupId(rule.slotTimeSetupId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTurfId) return;

    const selectedSetup = setups.find((s) => s.id === slotTimeSetupId);
    if (!selectedSetup) {
      toast.error("Please choose a slot time window");
      return;
    }

    const validation = validatePrice(price);
    if (!validation.valid) {
      toast.error(validation.message || "Invalid price");
      return;
    }
    if (Number(price) <= 0) {
      toast.error("Price must be greater than 0");
      return;
    }

    const commonPayload = {
      slotTimeSetupId: selectedSetup.id,
      price: Number(price),
      active,
    };

    if (applyToAll) {
      createBulk.mutate(commonPayload);
    } else if (editingRuleId) {
      updateRule.mutate({
        id: editingRuleId,
        payload: { dayOfWeek, ...commonPayload },
      });
    } else {
      createRule.mutate({ dayOfWeek, ...commonPayload });
    }
  };

  const toggleActive = (rule: PriceRule) => {
    updateRule.mutate({ id: rule.id, payload: { active: !rule.active } });
  };

  const handleTurfChange = (turfId: string) => {
    setSelectedTurfId(turfId);
    resetForm();
    setSlotDate(todayISO);
  };

  const handleGenerateSlots = () => {
    setGeneratingSlots(true);
    generateSlots.mutate();
  };

  const handleSlotToggle = (slot: StoredSlot) => {
    updateSlot.mutate({ id: slot.id, payload: { active: !slot.active } });
  };

  const handleSlotPriceChange = (slot: StoredSlot, newPrice: string) => {
    setDraftPrices((prev) => ({ ...prev, [slot.id]: newPrice }));
  };

  const handleSlotPriceCancel = (slot: StoredSlot) => {
    setDraftPrices((prev) => {
      const next = { ...prev };
      delete next[slot.id];
      return next;
    });
  };

  const handleSlotPriceSave = (slot: StoredSlot) => {
    const draft = draftPrices[slot.id];
    if (draft === undefined) return;
    const validation = validatePrice(draft);
    if (!validation.valid) {
      toast.error(validation.message || "Invalid price");
      return;
    }
    const numPrice = Number(draft);
    if (numPrice <= 0) {
      toast.error("Price must be greater than 0");
      return;
    }
    updateSlot.mutate({ id: slot.id, payload: { price: numPrice } });
    setDraftPrices((prev) => {
      const next = { ...prev };
      delete next[slot.id];
      return next;
    });
  };

  const handleSlotPriceKeyDown = (
    slot: StoredSlot,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSlotPriceSave(slot);
    }
  };

  const handleClearTimeFilter = () => setTimeFilter(null);

  const handleApplyTimeFilter = () => {
    if (!filterStartTime || !filterEndTime) {
      toast.error("Please set both start and end time");
      return;
    }
    if (filterStartTime >= filterEndTime) {
      toast.error("Start time must be before end time");
      return;
    }
    setTimeFilter({ start: filterStartTime, end: filterEndTime });
  };

  /* -------------------------------------------------------------------------- */
  /* Render                                                                     */
  /* -------------------------------------------------------------------------- */

  return (
    <section className="dashboard-section">
      {/* Top Header & Turf Selection */}
      <Card className="surface-elevated mb-6">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" asChild className="h-8 w-8 shrink-0">
                <Link href="/admin/dashboard/turfs" aria-label="Back to turfs">
                  <ArrowLeft className="size-4" />
                </Link>
              </Button>
              <div>
                <CardTitle className="text-lg">Pricing &amp; Slots Setup</CardTitle>
                {selectedTurfName && (
                  <p className="text-sm text-muted-foreground mt-1">{selectedTurfName}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground whitespace-nowrap">
                Select Turf:
              </Label>
              <Select value={selectedTurfId} onValueChange={handleTurfChange}>
                <SelectTrigger className="h-8 min-w-[200px] text-sm">
                  <SelectValue
                    placeholder={turfsLoading ? "Loading turfs..." : "Choose a turf"}
                  />
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
          </div>
        </CardHeader>
      </Card>

      {!selectedTurfId ? (
        <Card className="border-dashed p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Building2 className="size-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-base font-semibold">No Turf Selected</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Please select a turf from the dropdown above to manage its pricing
            rules and slots.
          </p>
        </Card>
      ) : (
        <>
          {/* Main Navigation Tabs */}
          <div className="border-b border-border">
            <nav className="-mb-px flex gap-8">
              <button
                type="button"
                onClick={() => setActiveTab("pricing-rules")}
                className={`inline-flex items-center gap-2 border-b-2 pb-3 pt-1 text-sm font-semibold transition-colors ${
                  activeTab === "pricing-rules"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                }`}
              >
                Pricing Rules
                <Badge variant="secondary" className="px-1.5 py-0.2 text-[10px]">
                  {rules.length}
                </Badge>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("slots")}
                className={`inline-flex items-center gap-2 border-b-2 pb-3 pt-1 text-sm font-semibold transition-colors ${
                  activeTab === "slots"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                }`}
              >
                Slots Overview
                <Badge variant="secondary" className="px-1.5 py-0.2 text-[10px]">
                  {slots.length}
                </Badge>
              </button>
            </nav>
          </div>

          {activeTab === "pricing-rules" && (
            <div className="space-y-6">
              {/* Add / Edit Form Card */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold">
                        {editingRuleId ? "Edit Pricing Rule" : "Create Pricing Rule"}
                      </CardTitle>
                    </div>
                    {editingRuleId && (
                      <Badge
                        variant="outline"
                        className="text-xs text-amber-600 bg-amber-50"
                      >
                        Editing Mode
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {/* Day Picker */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Day of Week</Label>
                        <Select
                          value={String(dayOfWeek)}
                          onValueChange={(v) => setDayOfWeek(Number(v))}
                          disabled={applyToAll}
                        >
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="Choose day" />
                          </SelectTrigger>
                          <SelectContent>
                            {DAY_NAMES.map((name, index) => (
                              <SelectItem key={name} value={String(index)}>
                                {name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Time Setup Selector */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Time Window</Label>
                        <Select
                          value={slotTimeSetupId}
                          onValueChange={setSlotTimeSetupId}
                        >
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="Select time setup" />
                          </SelectTrigger>
                          <SelectContent>
                            {setups.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.timeName} (
                                {formatTimeWithPeriod(s.startMinute)} –{" "}
                                {formatTimeWithPeriod(s.endMinute)})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Price Input */}
                      <div className="space-y-1.5">
                        <Label htmlFor="price" className="text-xs font-semibold">
                          Price (৳ BDT)
                        </Label>
                        <Input
                          id="price"
                          type="number"
                          min={0}
                          placeholder="Give a price"
                          value={price}
                          onChange={(e) => setPrice(sanitizePrice(e.target.value))}
                          className="h-9 text-sm"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-muted/40 p-3">
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="applyToAll"
                            checked={applyToAll}
                            onCheckedChange={(checked) =>
                              setApplyToAll(checked === true)
                            }
                          />
                          <Label
                            htmlFor="applyToAll"
                            className="cursor-pointer text-xs font-medium"
                          >
                            Apply this rule to all 7 days
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            id="active"
                            checked={active}
                            onCheckedChange={setActive}
                          />
                          <Label
                            htmlFor="active"
                            className="cursor-pointer text-xs font-medium"
                          >
                            Active immediately
                          </Label>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {editingRuleId && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-8 text-xs"
                            onClick={resetForm}
                          >
                            Cancel
                          </Button>
                        )}
                        <Button
                          type="submit"
                          size="sm"
                          disabled={isMutating || !price || !slotTimeSetupId}
                          className="h-8 text-xs"
                          variant="hero"
                        >
                          {isMutating && (
                            <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                          )}
                          {applyToAll
                            ? "Apply to All Days"
                            : editingRuleId
                              ? "Update Rule"
                              : "Save Pricing Rule"}
                        </Button>
                      </div>
                    </div>

                    {setups.length === 0 && (
                      <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                        <AlertCircle className="size-4 shrink-0" />
                        <span>
                          No slot time setups found. Please create time setups
                          first before defining price rules.
                        </span>
                      </div>
                    )}
                  </form>
                </CardContent>
              </Card>

              {/* Existing Rules Table */}
              <Card className="overflow-hidden">
                <CardHeader className="border-b bg-muted/20 pb-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-base font-semibold">
                        Daily Pricing Rules
                      </CardTitle>
                    </div>

                    {/* Filter Tabs by Setup */}
                    {setups.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 rounded-lg border bg-background p-1">
                        <button
                          type="button"
                          onClick={() => setActiveSetupFilter(null)}
                          className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                            activeSetupFilter === null
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          All Windows
                        </button>
                        {setups.map((setup) => (
                          <button
                            key={setup.id}
                            type="button"
                            onClick={() => setActiveSetupFilter(setup.id)}
                            className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                              activeSetupFilter === setup.id
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {setup.timeName}
                          </button>
                        ))}
                      </div>
                    )}
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
                              <Skeleton className="h-3 w-20 rounded" />
                            </TableHead>
                            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                              <Skeleton className="h-3 w-12 rounded" />
                            </TableHead>
                            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                              <Skeleton className="h-3 w-12 rounded" />
                            </TableHead>
                            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border text-right">
                              <Skeleton className="h-3 w-16 rounded ml-auto" />
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {[...Array(7)].map((_, i) => (
                            <TableRow key={i} className="border-b border-border">
                              <TableCell className="py-3">
                                <Skeleton className="h-4 w-16 rounded" />
                              </TableCell>
                              <TableCell className="py-3">
                                <Skeleton className="h-4 w-40 rounded" />
                              </TableCell>
                              <TableCell className="py-3">
                                <Skeleton className="h-4 w-16 rounded" />
                              </TableCell>
                              <TableCell className="py-3">
                                <Skeleton className="h-6 w-16 rounded-full" />
                              </TableCell>
                              <TableCell className="py-3">
                                <Skeleton className="h-7 w-20 rounded ml-auto" />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="overflow-x-auto border rounded-xl bg-card">
                      <Table>
                        <TableHeader className="bg-muted/40 border-b border-border">
                          <TableRow className="hover:bg-transparent border-b border-border">
                            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border w-32">
                              Day
                            </TableHead>
                            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                              Time Window
                            </TableHead>
                            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                              Price
                            </TableHead>
                            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                              Status
                            </TableHead>
                            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border text-right">
                              Actions
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {DAY_NAMES.map((dayName, dayIndex) => {
                            const dayRules = rules
                              .filter((r) => r.dayOfWeek === dayIndex)
                              .filter((r) =>
                                activeSetupFilter
                                  ? r.slotTimeSetupId === activeSetupFilter
                                  : true,
                              )
                              .sort(
                                (a, b) =>
                                  a.slotTimeSetup.startMinute -
                                  b.slotTimeSetup.startMinute,
                              );

                            const rule = dayRules[0];

                            return (
                              <TableRow
                                key={dayIndex}
                                className={rule?.active ? "bg-primary/5" : undefined}
                              >
                                <TableCell className="font-medium">
                                  <div className="flex items-center gap-2">
                                    <span>{dayName}</span>
                                    {dayIndex === today.getDay() && (
                                      <Badge className="h-5 px-1.5 text-[10px] bg-primary/10 text-primary border-primary/20">
                                        Today
                                      </Badge>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {rule ? (
                                    <div className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                                      <Clock3 className="size-3.5 text-primary" />
                                      <span className="font-medium text-foreground">
                                        {rule.slotTimeSetup.timeName}
                                      </span>
                                      <span>
                                        ({formatTimeWithPeriod(
                                          rule.slotTimeSetup.startMinute,
                                        )}{" "}
                                        –{" "}
                                        {formatTimeWithPeriod(
                                          rule.slotTimeSetup.endMinute,
                                        )})
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-sm text-muted-foreground/40">
                                      —
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {rule ? (
                                    <span className="font-semibold text-foreground">
                                      ৳{Number(rule.price).toLocaleString()}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-muted-foreground/40">
                                      Not Configured
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {rule ? (
                                    <div className="flex items-center gap-2">
                                      <Switch
                                        checked={rule.active}
                                        onCheckedChange={() => toggleActive(rule)}
                                        disabled={updateRule.isPending}
                                      />
                                      <Badge
                                        className={`h-6 px-2 text-[10px] ${
                                          rule.active
                                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                            : "bg-muted text-muted-foreground"
                                        }`}
                                        variant="secondary"
                                      >
                                        {rule.active ? "Active" : "Disabled"}
                                      </Badge>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-muted-foreground/40">
                                      Inactive
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex justify-end gap-1.5">
                                    {rule && (
                                      <>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => startEdit(rule)}
                                          className="h-8 text-xs"
                                        >
                                          Edit
                                        </Button>
                                        <DeleteConfirmDialog
                                          open={deleteTarget?.id === rule.id}
                                          onOpenChange={(open) =>
                                            !open && setDeleteTarget(null)
                                          }
                                          title="Delete pricing rule"
                                          description="Are you sure you want to delete this rule? This will revert this time window to default pricing."
                                          onConfirm={() => removeRule.mutate(rule.id)}
                                          isPending={removeRule.isPending}
                                          trigger={
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              onClick={() => setDeleteTarget(rule)}
                                              className="h-8 text-xs text-destructive hover:bg-destructive/10"
                                            >
                                              <Trash2 className="size-3.5" />
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
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "slots" && (
            <Card className="overflow-hidden">
              <CardHeader className="border-b bg-muted/20 pb-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-base font-semibold">
                      Generated Slots Table
                    </CardTitle>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <DatePicker
                      value={slotDate}
                      onChange={setSlotDate}
                      min={todayISO}
                      placeholder="Select Date"
                      className="h-9 text-xs"
                    />

                    {timeFilter ? (
                      <div className="flex items-center gap-2 rounded-md border bg-background px-2.5 py-1 text-xs">
                        <Clock className="size-3 text-primary" />
                        <span>
                          {formatTimeWithPeriod(timeToMinutes(timeFilter.start))}{" "}
                          – {formatTimeWithPeriod(timeToMinutes(timeFilter.end))}
                        </span>
                        <button
                          type="button"
                          onClick={handleClearTimeFilter}
                          aria-label="Clear filter"
                          className="ml-1 rounded hover:bg-muted p-0.5"
                        >
                          <X className="size-3 text-muted-foreground" />
                        </button>
                      </div>
                    ) : (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-9 text-xs gap-1.5"
                          >
                            <Filter className="size-3.5" />
                            Filter Window
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-64 p-4">
                          <div className="space-y-3">
                            <h4 className="text-xs font-semibold">
                              Filter Slots by Time
                            </h4>
                            <div className="space-y-1">
                              <Label className="text-xs">Start Time</Label>
                              <Input
                                type="time"
                                value={filterStartTime}
                                onChange={(e) => setFilterStartTime(e.target.value)}
                                className="h-8 text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">End Time</Label>
                              <Input
                                type="time"
                                value={filterEndTime}
                                onChange={(e) => setFilterEndTime(e.target.value)}
                                className="h-8 text-xs"
                              />
                            </div>
                            <Button
                              size="sm"
                              className="w-full text-xs"
                              onClick={handleApplyTimeFilter}
                            >
                              Apply Filter
                            </Button>
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}

                    <Button
                      size="sm"
                      variant="hero"
                      className="h-8 text-xs"
                      disabled={generatingSlots}
                      onClick={handleGenerateSlots}
                    >
                      {generatingSlots ? (
                        <>
                          <Loader2 className="size-3.5 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="size-3.5" />
                          Generate 90-Day Slots
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {slotsLoading ? (
                  <TableLoadingState message="Loading slots data..." />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Date</TableHead>
                        <TableHead>Slot Time</TableHead>
                        <TableHead className="w-40">Price (BDT)</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSlots.map((slot) => {
                        const dateObj = new Date(slot.slotDate);
                        const dateStr = dateObj.toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        });
                        const isDraft = draftPrices[slot.id] !== undefined;

                        return (
                          <TableRow key={slot.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <span className="text-sm">{dateStr}</span>
                                {dateObj.toDateString() ===
                                  today.toDateString() && (
                                  <Badge className="h-5 px-1.5 text-[10px] bg-primary/10 text-primary border-primary/20">
                                    Today
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                <Clock3 className="size-3.5 text-primary" />
                                {formatTimeWithPeriod(slot.startMinute)} –{" "}
                                {formatTimeWithPeriod(slot.endMinute)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  min={0}
                                  value={isDraft ? draftPrices[slot.id] : slot.price}
                                  onChange={(e) =>
                                    handleSlotPriceChange(slot, e.target.value)
                                  }
                                  onKeyDown={(e) => handleSlotPriceKeyDown(slot, e)}
                                  className="h-8 w-24 text-xs font-semibold"
                                />
                                {isDraft && (
                                  <>
                                    <Button
                                      size="icon"
                                      variant="default"
                                      className="h-8 w-8 shrink-0"
                                      onClick={() => handleSlotPriceSave(slot)}
                                      disabled={updateSlot.isPending}
                                      title="Save price change"
                                    >
                                      <Save className="size-3.5" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="outline"
                                      className="h-8 w-8 shrink-0"
                                      onClick={() => handleSlotPriceCancel(slot)}
                                      disabled={updateSlot.isPending}
                                      title="Cancel price change"
                                    >
                                      <X className="size-3.5" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={slot.active}
                                  onCheckedChange={() => handleSlotToggle(slot)}
                                  disabled={updateSlot.isPending}
                                />
                                <Badge
                                  className={`h-6 px-2 text-[10px] ${
                                    slot.active
                                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                      : "bg-muted text-muted-foreground"
                                  }`}
                                  variant="secondary"
                                >
                                  {slot.active ? "Active" : "Disabled"}
                                </Badge>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}

                      {(slots.length === 0 || filteredSlots.length === 0) &&
                        !slotsLoading && (
                          <TableRow>
                            <TableCell colSpan={5}>
                              <div className="py-12 text-center">
                                <Calendar className="mx-auto h-10 w-10 text-muted-foreground/40" />
                                <h4 className="mt-3 text-sm font-semibold text-foreground">
                                  No Slots Found
                                </h4>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  There are no generated slots for {slotDate}.
                                </p>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </section>
  );
}