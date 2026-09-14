"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Clock3, Loader2, Plus, Trash2, Power, PowerOff, Calendar, Save, Filter, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { TableLoadingState } from "@/components/common/TableStates";
import { DeleteConfirmDialog } from "@/components/common/DeleteConfirmDialog";
import { httpClient } from "@/lib/axios/httpClient";
import { API_ENDPOINTS } from "@/lib/api/config";
import { ApiResponse } from "@/types/api.type";
import { DAY_NAMES, formatTimeWithPeriod, minutesToTime, timeToMinutes } from "@/lib/time-utils";
import { validatePrice, sanitizePrice } from "@/lib/validations";
import {
  createPriceRuleAction,
  createPriceRuleBulkAction,
  deletePriceRuleAction,
  updatePriceRuleAction,
  generateSlotsAction,
  listTurfSlotsAction,
  updateSlotAction,
  type PriceRulePayload,
  type PriceRuleBulkPayload,
  type StoredSlot,
} from "./_actions";

type Turf = { id: string; name: string };
type PriceRule = {
  id: string;
  turfId: string;
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
  price: string | number;
  active: boolean;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
};

type Tab = "pricing-rules" | "slots";

const presets = [
  { label: "Night", startTime: "00:00", endTime: "06:00" },
  { label: "Early morning", startTime: "06:00", endTime: "12:00" },
  { label: "Noon", startTime: "12:00", endTime: "18:00" },
  { label: "Evening", startTime: "18:00", endTime: "22:00" },
  { label: "Late night", startTime: "22:00", endTime: "24:00" },
];

const presetTabs = [{ label: "All" }, ...presets];

function formatDateRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  return `${startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${endDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}

const today = new Date();
const todayISO = today.toISOString().split("T")[0];
const defaultStartDate = todayISO;
const defaultEndDate = new Date(today.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

function isRuleActiveNow(rule: PriceRule): boolean {
  if (!rule.active) return false;
  const now = new Date();
  const start = new Date(rule.startDate);
  const end = new Date(rule.endDate);
  end.setHours(23, 59, 59, 999);
  return start <= now && end >= now;
}

function matchesPreset(rule: PriceRule, preset: { startTime: string; endTime: string } | null): boolean {
  if (!preset) return true;
  const ruleStart = minutesToTime(rule.startMinute);
  const ruleEnd = minutesToTime(rule.endMinute);
  return ruleStart === preset.startTime && ruleEnd === preset.endTime;
}

export default function AdminPricingAndSlotsPage() {
  const queryClient = useQueryClient();
  const [selectedTurfId, setSelectedTurfId] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("pricing-rules");

  const [dayOfWeek, setDayOfWeek] = useState(0);
  const [startTime, setStartTime] = useState("06:00");
  const [endTime, setEndTime] = useState("12:00");
  const [price, setPrice] = useState("");
  const [active, setActive] = useState(true);
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [applyToAll, setApplyToAll] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PriceRule | null>(null);
  const [activePresetIndex, setActivePresetIndex] = useState<number | null>(null);

   const [slotDate, setSlotDate] = useState(todayISO);
  const [generatingSlots, setGeneratingSlots] = useState(false);
  const [draftPrices, setDraftPrices] = useState<Record<string, string>>({});
  const [timeFilter, setTimeFilter] = useState<{ start: string; end: string } | null>(null);
  const [filterStartTime, setFilterStartTime] = useState("");
  const [filterEndTime, setFilterEndTime] = useState("");

  const { data: turfsData, isLoading: turfsLoading } = useQuery({
    queryKey: ["owner-turfs-dropdown"],
    queryFn: async () => (await httpClient.get<Turf[]>(API_ENDPOINTS.marketplace.ownerTurfs)).data,
  });
  const turfs = turfsData ?? [];

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
  const rules = rulesData ?? [];

  const { data: slotsData, isLoading: slotsLoading, refetch: refetchSlots } = useQuery({
    queryKey: ["turf-slots", selectedTurfId, slotDate],
    enabled: !!selectedTurfId,
    queryFn: async () => {
       const result = await listTurfSlotsAction(selectedTurfId, { date: slotDate });
       if (!result.success) throw new Error(result.message);
       return (result as ApiResponse<StoredSlot[]>).data;
    },
  });
  const slots: StoredSlot[] = slotsData ?? [];

  const createRule = useMutation({
    mutationFn: (payload: PriceRulePayload) => createPriceRuleAction(selectedTurfId, payload),
    onSuccess: (result: { success: boolean; message?: string }) => {
      if (!result.success) {
        toast.error(result.message || "Could not create pricing rule");
        return;
      }
      toast.success("Pricing rule created");
      void queryClient.invalidateQueries({ queryKey: ["price-rules", selectedTurfId] });
      resetForm();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not create pricing rule"),
  });

  const createBulk = useMutation({
    mutationFn: (payload: PriceRuleBulkPayload) => createPriceRuleBulkAction(selectedTurfId, payload),
    onSuccess: (result: { success: boolean; message?: string }) => {
      if (!result.success) {
        toast.error(result.message || "Could not apply pricing rules");
        return;
      }
      toast.success("Pricing rules applied to all 7 days");
      void queryClient.invalidateQueries({ queryKey: ["price-rules", selectedTurfId] });
      resetForm();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not apply pricing rules"),
  });

  const updateRule = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<PriceRulePayload> }) => updatePriceRuleAction(id, payload),
    onSuccess: (result: { success: boolean; message?: string }) => {
      if (!result.success) {
        toast.error(result.message || "Could not update pricing rule");
        return;
      }
      toast.success("Pricing rule updated");
      void queryClient.invalidateQueries({ queryKey: ["price-rules", selectedTurfId] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not update pricing rule"),
  });

  const removeRule = useMutation({
    mutationFn: (id: string) => deletePriceRuleAction(id),
    onSuccess: (result: { success: boolean; message?: string }) => {
      if (!result.success) {
        toast.error(result.message || "Could not delete pricing rule");
        return;
      }
      toast.success("Pricing rule deleted");
      void queryClient.invalidateQueries({ queryKey: ["price-rules", selectedTurfId] });
      setDeleteTarget(null);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not delete pricing rule"),
  });

  const generateSlots = useMutation({
    mutationFn: () => generateSlotsAction(selectedTurfId, { days: 30 }),
    onSuccess: (result: { success: boolean; message?: string }) => {
      if (!result.success) {
        toast.error(result.message || "Could not generate slots");
        return;
      }
      toast.success("Slots generated for next 30 days");
      void refetchSlots();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not generate slots"),
    onSettled: () => setGeneratingSlots(false),
  });

  const updateSlot = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { active?: boolean; price?: number } }) => updateSlotAction(id, payload),
    onSuccess: (result: { success: boolean; message?: string }) => {
      if (!result.success) {
        toast.error(result.message || "Could not update slot");
        return;
      }
      toast.success("Slot updated");
      void queryClient.invalidateQueries({ queryKey: ["turf-slots", selectedTurfId, slotDate] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not update slot"),
  });

  const isMutating = createRule.isPending || createBulk.isPending || updateRule.isPending;

  const filteredSlots = timeFilter
    ? slots.filter((slot) => {
        const filterStart = timeToMinutes(timeFilter.start);
        const filterEnd = timeToMinutes(timeFilter.end);
        return slot.startMinute >= filterStart && slot.endMinute <= filterEnd;
      })
    : slots;

  function resetForm() {
    setDayOfWeek(0);
    setStartTime("06:00");
    setEndTime("12:00");
    setPrice("");
    setActive(true);
    setStartDate(defaultStartDate);
    setEndDate(defaultEndDate);
    setApplyToAll(false);
    setEditingRuleId(null);
    setActivePresetIndex(null);
  }

  function startEdit(rule: PriceRule) {
    setEditingRuleId(rule.id);
    setDayOfWeek(rule.dayOfWeek);
    setStartTime(minutesToTime(rule.startMinute));
    setEndTime(minutesToTime(rule.endMinute));
    setPrice(String(rule.price));
    setActive(rule.active);
    setStartDate(rule.startDate.split("T")[0]);
    setEndDate(rule.endDate.split("T")[0]);
    setApplyToAll(false);
    const presetIndex = presets.findIndex((p) => p.startTime === minutesToTime(rule.startMinute) && p.endTime === minutesToTime(rule.endMinute));
    setActivePresetIndex(presetIndex >= 0 ? presetIndex : null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTurfId) return;

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
      startMinute: timeToMinutes(startTime),
      endMinute: timeToMinutes(endTime),
      price: Number(price),
      active,
      startDate,
      endDate,
    };

    if (applyToAll) {
      createBulk.mutate(commonPayload);
    } else if (editingRuleId) {
      updateRule.mutate({ id: editingRuleId, payload: { dayOfWeek, ...commonPayload } });
    } else {
      createRule.mutate({ dayOfWeek, ...commonPayload });
    }
  };

  const applyPreset = (preset: { label: string; startTime: string; endTime: string }) => {
    setStartTime(preset.startTime);
    setEndTime(preset.endTime);
    const index = presets.findIndex((p) => p.label === preset.label);
    if (index >= 0) {
      setActivePresetIndex(index);
    }
  };

  const toggleActive = (rule: PriceRule) => {
    updateRule.mutate({
      id: rule.id,
      payload: { active: !rule.active },
    });
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

  const handleSlotPriceKeyDown = (slot: StoredSlot, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSlotPriceSave(slot);
    }
  };

  const handleClearTimeFilter = () => {
    setTimeFilter(null);
  };

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

  if (!selectedTurfId) {
    return (
      <section className="dashboard-section max-w-7xl space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild className="-ml-3 h-8 w-8">
              <Link href="/admin/dashboard/turfs" aria-label="Back">
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
            <div>
              <p className="dashboard-meta text-xs">Pricing &amp; slots management</p>
              <h1 className="dashboard-title text-lg">Pricing &amp; Slots Setup</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Turf:</span>
            <Select value={selectedTurfId} onValueChange={handleTurfChange}>
              <SelectTrigger className="h-8 w-48 text-sm">
                <SelectValue placeholder={turfsLoading ? "Loading..." : "Choose a turf"} />
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
      </section>
    );
  }

  return (
    <section className="dashboard-section max-w-7xl space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="-ml-3 h-8 w-8">
            <Link href="/admin/dashboard/turfs" aria-label="Back">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <p className="dashboard-meta text-xs">Pricing &amp; slots management</p>
            <h1 className="dashboard-title text-lg">Pricing &amp; Slots Setup</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Turf:</span>
          <Select value={selectedTurfId} onValueChange={handleTurfChange}>
            <SelectTrigger className="h-8 w-48 text-sm">
              <SelectValue placeholder={turfsLoading ? "Loading..." : "Choose a turf"} />
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

      <div className="border-b border-border">
        <nav className="-mb-px flex gap-6">
          <button
            type="button"
            onClick={() => setActiveTab("pricing-rules")}
            className={`border-b-2 px-1 py-3 text-sm font-medium transition-colors ${activeTab === "pricing-rules" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            Pricing Rules
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("slots")}
            className={`border-b-2 px-1 py-3 text-sm font-medium transition-colors ${activeTab === "slots" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            Slots
          </button>
        </nav>
      </div>

      {activeTab === "pricing-rules" && (
        <>
          {rulesLoading && <TableLoadingState message="Loading pricing rules..." />}

          {!rulesLoading && (
            <>
              <Card className="surface-card">
                <CardContent className="space-y-4 p-4 sm:p-5">
                  <form onSubmit={handleSubmit} className="space-y-4 border-t pt-4">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Day</Label>
                        <Select
                          value={String(dayOfWeek)}
                          onValueChange={(v) => setDayOfWeek(Number(v))}
                          disabled={applyToAll}
                        >
                          <SelectTrigger className="h-8 text-sm">
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

                      <div className="space-y-1.5">
                        <Label htmlFor="startTime" className="text-xs font-medium">Start time</Label>
                        <Input id="startTime" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="h-8 text-sm" />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="endTime" className="text-xs font-medium">End time</Label>
                        <Input id="endTime" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="h-8 text-sm" />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="price" className="text-xs font-medium">Price (৳)</Label>
                        <Input id="price" type="number" min={0} value={price} onChange={(e) => setPrice(sanitizePrice(e.target.value))} className="h-8 text-sm" />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="startDate" className="text-xs font-medium">Start date</Label>
                        <DatePicker
                          id="startDate"
                          value={startDate}
                          onChange={setStartDate}
                          showIcon={false}
                          className="h-8 text-sm"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="endDate" className="text-xs font-medium">End date</Label>
                        <DatePicker
                          id="endDate"
                          value={endDate}
                          onChange={setEndDate}
                          showIcon={false}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
                      <div className="flex items-center gap-2 space-y-0">
                        <Checkbox
                          id="applyToAll"
                          checked={applyToAll}
                          onCheckedChange={(checked) => setApplyToAll(checked === true)}
                        />
                        <Label htmlFor="applyToAll" className="text-xs font-medium cursor-pointer">
                          Apply to all 7 days
                        </Label>
                      </div>

                      <div className="flex items-center justify-between rounded-lg border p-2.5 h-8">
                        <Label htmlFor="active" className="text-xs font-medium">Active</Label>
                        <Switch id="active" checked={active} onCheckedChange={setActive} />
                      </div>
                    </div>

                    <div className="flex items-center gap-1 border-b">
                      {presetTabs.map((tab, index) => {
                        const preset = presets[index - 1];
                        const isActive = activePresetIndex === (index === 0 ? null : index - 1);
                        return (
                          <button
                            key={tab.label}
                            type="button"
                            onClick={() => {
                              if (index === 0) {
                                setActivePresetIndex(null);
                              } else {
                                setActivePresetIndex(index - 1);
                                if (preset) {
                                  applyPreset(preset);
                                }
                              }
                            }}
                            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                              isActive
                                ? "border-b-2 border-primary text-primary"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {tab.label}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex justify-end gap-3">
                      {editingRuleId && (
                        <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={resetForm}>
                          Cancel edit
                        </Button>
                      )}
                      <Button type="submit" size="sm" disabled={isMutating || !price || new Date(startDate) >= new Date(endDate)} className="h-8 text-xs">
                        {isMutating && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
                        {applyToAll ? "Apply to all days" : editingRuleId ? "Update rule" : "Add rule"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              <Card className="overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">
                    {turfs.find((t) => t.id === selectedTurfId)?.name || "Selected turf"} — Daily pricing
                    {activePresetIndex !== null && (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        ({presets[activePresetIndex].label})
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-secondary/30 hover:bg-secondary/30">
                        <TableHead>Day</TableHead>
                        <TableHead>Time range</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Date range</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {DAY_NAMES.map((dayName, dayIndex) => {
                        const activePreset = activePresetIndex !== null ? presets[activePresetIndex] : null;
                        const dayRules = rules
                          .filter((r) => r.dayOfWeek === dayIndex)
                          .filter((r) => matchesPreset(r, activePreset))
                          .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
                        const rule = dayRules[0];
                        const isActiveNow = rule ? isRuleActiveNow(rule) : false;
                        const otherRules = rule ? rules.filter((r) => r.dayOfWeek === dayIndex && r.id !== rule.id) : [];

                        return (
                          <TableRow key={dayIndex} className={isActiveNow ? "bg-primary/5" : ""}>
                            <TableCell>
                              <span className="text-sm font-medium">{dayName}</span>
                              {dayIndex === today.getDay() && (
                                <span className="ml-1.5 inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                                  Today
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              {rule ? (
                                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <Clock3 className="size-3.5 text-primary" />
                                  {formatTimeWithPeriod(rule.startMinute)} – {formatTimeWithPeriod(rule.endMinute)}
                                </span>
                              ) : (
                                <span className="text-sm text-muted-foreground/50">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {rule ? (
                                <span className="text-sm font-medium">৳ {Number(rule.price).toLocaleString()}</span>
                              ) : (
                                <span className="text-sm text-muted-foreground/50">Not set</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {rule ? (
                                <span className="text-xs text-muted-foreground">{formatDateRange(rule.startDate, rule.endDate)}</span>
                              ) : (
                                <span className="text-xs text-muted-foreground/50">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {rule ? (
                                <div className="flex items-center gap-3">
                                  <Switch
                                    checked={rule.active}
                                    onCheckedChange={() => toggleActive(rule)}
                                    disabled={updateRule.isPending}
                                    aria-label={`${rule.active ? "Deactivate" : "Activate"} ${dayName} rule`}
                                  />
                                  <span className={`text-xs font-medium ${rule.active ? "text-emerald-700" : "text-muted-foreground"}`}>
                                    {rule.active ? "Active" : "Inactive"}
                                  </span>
                                  {isRuleActiveNow(rule) && otherRules.length === 0 && (
                                    <span className="text-[10px] font-semibold text-primary">Now</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs font-medium text-muted-foreground">Not set</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex justify-end gap-2">
                                {rule && (
                                  <Button size="sm" variant="outline" onClick={() => startEdit(rule)} className="h-7 text-xs">
                                    Edit
                                  </Button>
                                )}
                                {rule && (
                                  <DeleteConfirmDialog
                                    open={deleteTarget?.id === rule.id}
                                    onOpenChange={(open) => !open && setDeleteTarget(null)}
                                    title="Delete pricing rule"
                                    description="Are you sure you want to delete this pricing rule? This action cannot be undone."
                                    onConfirm={() => removeRule.mutate(rule.id)}
                                    isPending={removeRule.isPending}
                                    trigger={
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => setDeleteTarget(rule)}
                                        aria-label="Remove pricing rule"
                                        className="h-7 text-xs"
                                      >
                                        <Trash2 className="size-3.5" />
                                      </Button>
                                    }
                                  />
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}

      {activeTab === "slots" && (
        <Card className="surface-card">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <CardTitle className="text-sm font-medium">
                {turfs.find((t) => t.id === selectedTurfId)?.name || "Selected turf"} — Generated slots
              </CardTitle>
              <div className="flex items-center gap-3">
                <DatePicker
                  value={slotDate}
                  onChange={setSlotDate}
                  min={todayISO}
                  placeholder="Pick a date"
                  className="h-9 text-sm"
                />
                {timeFilter ? (
                  <div className="flex items-center gap-2 rounded-lg border px-2 py-1.5 text-xs">
                    <span className="text-muted-foreground">
                      {formatTimeWithPeriod(timeToMinutes(timeFilter.start))} – {formatTimeWithPeriod(timeToMinutes(timeFilter.end))}
                    </span>
                    <button type="button" onClick={handleClearTimeFilter} aria-label="Clear time filter">
                      <X className="size-3.5 text-muted-foreground hover:text-foreground" />
                    </button>
                  </div>
                ) : (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button size="sm" variant="outline" className="h-9 text-xs">
                        <Filter className="mr-1.5 size-3.5" />
                        Filter by time
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-64 p-4">
                      <div className="space-y-3">
                        <h4 className="text-xs font-medium">Filter slots by time range</h4>
                     <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Start time</Label>
                          <Input
                            type="time"
                            value={filterStartTime}
                            onChange={(e) => setFilterStartTime(e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">End time</Label>
                          <Input
                            type="time"
                            value={filterEndTime}
                            onChange={(e) => setFilterEndTime(e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                <Button size="sm" variant="hero" className="w-full text-xs" onClick={handleApplyTimeFilter}>
                          Apply
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
                <Button
                  size="sm"
                  variant="hero"
                  className="h-9 text-xs"
                  disabled={generatingSlots}
                  onClick={handleGenerateSlots}
                >
                  {generatingSlots ? (
                    <>
                      <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-1.5 size-3.5" />
                      Generate slots (30 days)
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {slotsLoading ? (
              <TableLoadingState message="Loading slots..." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/30 hover:bg-secondary/30">
                    <TableHead>Date</TableHead>
                    <TableHead>Time range</TableHead>
                    <TableHead className="w-36">Price (BDT)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSlots.map((slot) => {
                    const dateObj = new Date(slot.slotDate);
                    const dateStr = dateObj.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
                    return (
                      <TableRow key={slot.id}>
                        <TableCell>
                          <span className="text-sm font-medium">{dateStr}</span>
                          {dateObj.toDateString() === today.toDateString() && (
                            <span className="ml-1.5 inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                              Today
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock3 className="size-3.5 text-primary" />
                            {formatTimeWithPeriod(slot.startMinute)} – {formatTimeWithPeriod(slot.endMinute)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              min={0}
                              value={draftPrices[slot.id] !== undefined ? draftPrices[slot.id] : slot.price}
                              onChange={(e) => handleSlotPriceChange(slot, e.target.value)}
                              onKeyDown={(e) => handleSlotPriceKeyDown(slot, e)}
                              className="h-8 w-20 text-sm"
                            />
                            {draftPrices[slot.id] !== undefined && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 w-16 text-xs"
                                onClick={() => handleSlotPriceSave(slot)}
                                disabled={updateSlot.isPending}
                              >
                                <Save className="size-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Switch
                              checked={slot.active}
                              onCheckedChange={() => handleSlotToggle(slot)}
                              disabled={updateSlot.isPending}
                              aria-label={`${slot.active ? "Deactivate" : "Activate"} slot`}
                            />
                            <span className={`text-xs font-medium ${slot.active ? "text-emerald-700" : "text-muted-foreground"}`}>
                              {slot.active ? "Active" : "Inactive"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => {
                                const newActive = !slot.active;
                                updateSlot.mutate({ id: slot.id, payload: { active: newActive } });
                              }}
                            >
                              {slot.active ? (
                                <>
                                  <PowerOff className="mr-1 size-3" /> Deactivate
                                </>
                              ) : (
                                <>
                                  <Power className="mr-1 size-3" /> Activate
                                </>
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {(slots.length === 0 || filteredSlots.length === 0) && !slotsLoading && (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <div className="py-8 text-center">
                          <Calendar className="mx-auto h-10 w-10 text-muted-foreground/50" />
                          <p className="mt-3 text-sm text-muted-foreground">No slots found for this date.</p>
                          <p className="text-xs text-muted-foreground/70">Generate slots to populate the next 30 days.</p>
                          <Button size="sm" variant="outline" className="mt-3" onClick={handleGenerateSlots}>
                            <Plus className="mr-1.5 size-3.5" /> Generate slots
                          </Button>
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
    </section>
  );
}
