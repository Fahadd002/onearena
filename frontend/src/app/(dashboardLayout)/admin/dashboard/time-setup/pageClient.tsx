"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Clock3, Pencil, Plus, X, Flame, Layers } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { DataTable } from "@/components/premium/DataTable";

import { usePagination } from "@/hooks/usePagination";
import { useSort } from "@/hooks/useSort";
import { useSearch } from "@/context/SearchContext";

import {
  listSlotTimesAction,
  createSlotTimeAction,
  updateSlotTimeAction,
  type SlotTime as BaseSlotTime,
  type SlotTimePayload as BaseSlotTimePayload,
  type UpdateSlotTimePayload as BaseUpdateSlotTimePayload,
} from "./_actions";

import type { ApiResponse, paginationParams } from "@/types/api.type";

/* -------------------------------------------------------------------------- */
/* Extended Types                                                             */
/* -------------------------------------------------------------------------- */

export type SlotTime = BaseSlotTime & {
  slotMinutes?: number;
  slotCount?: number;
  isPeakTime?: boolean;
};

export type SlotTimePayload = BaseSlotTimePayload & {
  slotMinutes?: number;
  slotCount?: number;
  isPeakTime?: boolean;
};

export type UpdateSlotTimePayload = BaseUpdateSlotTimePayload & {
  slotMinutes?: number;
  slotCount?: number;
  isPeakTime?: boolean;
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function formatTime(totalMinutes: number): string {
  const norm = ((totalMinutes % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

function timeToMinutes(value: string): number {
  if (!value) return 0;
  const [h, m] = value.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function minutesToTime(minutes: number): string {
  const norm = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function formatDuration(start: number, end: number): string {
  const total = end - start;
  if (total <= 0) return "0m";
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function checkOverlap(
  startA: number,
  endA: number,
  startB: number,
  endB: number
): boolean {
  return Math.max(startA, startB) < Math.min(endA, endB);
}

/* -------------------------------------------------------------------------- */
/* Page Component                                                             */
/* -------------------------------------------------------------------------- */

export default function TimingPage() {
  const queryClient = useQueryClient();
  const pagination = usePagination(10);

  const { sortField, sortDirection, handleSort, getSortParams } = useSort(
    "startMinute",
    "asc"
  );

  const { registerHandler, unregisterHandler, setPlaceholder } = useSearch();

  const [search, setSearch] = useState("");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingSlotTime, setEditingSlotTime] = useState<SlotTime | null>(null);

  // Form State – empty by default for new creations
  const [timeName, setTimeName] = useState("");
  const [startTime, setStartTime] = useState("");
  const [slotMinutes, setSlotMinutes] = useState<number | "">(90);
  const [slotCount, setSlotCount] = useState<number | "">("");
  const [isPeakHour, setIsPeakHour] = useState(false);

  useEffect(() => {
    setPlaceholder("Search time windows...");
    const onSearch = (q: string) => {
      setSearch(q);
      pagination.resetPage();
    };
    registerHandler(onSearch);
    return () => unregisterHandler();
  }, [registerHandler, unregisterHandler, setPlaceholder, pagination]);

  /* ------------------------------------------------------------------------ */
  /* Query                                                                    */
  /* ------------------------------------------------------------------------ */

  const { data, isLoading } = useQuery({
    queryKey: [
      "slot-times",
      pagination.page,
      pagination.pageSize,
      sortField,
      sortDirection,
      search,
    ],
    queryFn: async () => {
      const { sortBy, sortOrder } = getSortParams();
      const result = await listSlotTimesAction({
        page: String(pagination.page),
        limit: String(pagination.pageSize),
        sortBy,
        sortOrder,
        search,
      });
      if (!result.success) throw new Error(result.message);
      return {
        data: (result as ApiResponse<SlotTime[]>).data,
        meta:
          (result as ApiResponse<SlotTime[]> & { meta?: paginationParams }).meta ?? {
            page: pagination.page,
            limit: pagination.pageSize,
            total: (result as ApiResponse<SlotTime[]>).data.length,
            totalPages: 1,
          },
      };
    },
  });

  useEffect(() => {
    if (data?.meta?.total !== undefined) pagination.setTotal(data.meta.total);
  }, [data?.meta?.total, pagination]);

  const slotTimes: SlotTime[] = data?.data ?? [];

  /* ------------------------------------------------------------------------ */
  /* Calculated Form Variables                                                */
  /* ------------------------------------------------------------------------ */

  const numMinutes = typeof slotMinutes === "number" ? slotMinutes : 0;
  const numCount = typeof slotCount === "number" ? slotCount : 0;

  const hasValidInputs = Boolean(startTime && numMinutes > 0 && numCount > 0);

  const startMinute = startTime ? timeToMinutes(startTime) : 0;
  const calculatedDuration = numMinutes * numCount;
  const endMinute = startMinute + calculatedDuration;
  const calculatedEndTime = minutesToTime(endMinute);

  const overlappingWindow =
    hasValidInputs
      ? slotTimes.find(
          (slot) =>
            slot.id !== editingSlotTime?.id &&
            checkOverlap(startMinute, endMinute, slot.startMinute, slot.endMinute)
        )
      : null;

  /* ------------------------------------------------------------------------ */
  /* Form Helpers                                                             */
  /* ------------------------------------------------------------------------ */

  const resetForm = () => {
    setTimeName("");
    setStartTime("");
    setSlotMinutes(90);
    setSlotCount("");
    setIsPeakHour(false);
    setEditingSlotTime(null);
  };

  const openCreateDrawer = () => {
    resetForm();
    setIsDrawerOpen(true);
  };

  const openEditDrawer = (slotTime: SlotTime) => {
    setEditingSlotTime(slotTime);
    setTimeName(slotTime.timeName);
    setStartTime(minutesToTime(slotTime.startMinute));

    const duration = slotTime.endMinute - slotTime.startMinute;
    const durPerSlot = slotTime.slotMinutes || 90;
    const count = slotTime.slotCount || Math.max(1, Math.round(duration / durPerSlot));

    setSlotMinutes(durPerSlot);
    setSlotCount(count);
    setIsPeakHour(!!slotTime.isPeakTime);
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    resetForm();
  };

  /* ------------------------------------------------------------------------ */
  /* Mutations                                                                */
  /* ------------------------------------------------------------------------ */

  const createMutation = useMutation({
    mutationFn: (payload: SlotTimePayload) => createSlotTimeAction(payload),
    onSuccess: (r) => {
      if (!r.success) return toast.error(r.message);
      toast.success("Time plan created");
      void queryClient.invalidateQueries({ queryKey: ["slot-times"] });
      closeDrawer();
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Failed to create"),
  });

  const updateMutation = useMutation({
    mutationFn: (v: { id: string; payload: UpdateSlotTimePayload }) =>
      updateSlotTimeAction(v.id, v.payload),
    onSuccess: (r) => {
      if (!r.success) return toast.error(r.message);
      toast.success("Time plan updated");
      void queryClient.invalidateQueries({ queryKey: ["slot-times"] });
      closeDrawer();
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Failed to update"),
  });

  /* ------------------------------------------------------------------------ */
  /* Submit                                                                   */
  /* ------------------------------------------------------------------------ */

  const handleSubmit = () => {
    if (!timeName.trim()) return toast.error("Name is required");
    if (!startTime) return toast.error("Start time is required");
    if (!numMinutes || numMinutes <= 0) return toast.error("Slot duration must be > 0");
    if (!numCount || numCount <= 0) return toast.error("Slot count must be > 0");

    const payload: SlotTimePayload = {
      timeName: timeName.trim(),
      startMinute,
      endMinute,
      slotMinutes: numMinutes,
      slotCount: numCount,
      isPeakTime: isPeakHour,
    };

    if (editingSlotTime) {
      updateMutation.mutate({ id: editingSlotTime.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  /* ------------------------------------------------------------------------ */
  /* Render                                                                   */
  /* ------------------------------------------------------------------------ */

  return (
    <section className="dashboard-section space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock3 className="size-4 text-primary" />
          <h1 className="text-base font-semibold">Time Slots & Peak Plans</h1>
          <Badge variant="secondary" className="text-[10px]">
            {pagination.total}
          </Badge>
        </div>
        <Button size="sm" onClick={openCreateDrawer} className="h-8 gap-1.5 text-xs">
          <Plus className="size-3.5" />
          Add Time Plan
        </Button>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : (
            <DataTable
              columns={[
                {
                  key: "timeName",
                  header: "Name",
                  sortable: true,
                  render: (row) => (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{row.timeName}</span>
                      {row.isPeakTime && (
                        <Badge variant="destructive" className="flex items-center gap-1 text-[10px] px-1.5 py-0">
                          <Flame className="size-3 fill-current" />
                          Peak
                        </Badge>
                      )}
                    </div>
                  ),
                },
                {
                  key: "startMinute",
                  header: "Range (Calculated)",
                  sortable: true,
                  render: (row) => (
                    <span className="text-sm text-muted-foreground font-mono">
                      {formatTime(row.startMinute)} – {formatTime(row.endMinute)}
                    </span>
                  ),
                },
                {
                  key: "slotDetails",
                  header: "Slots Breakdown",
                  render: (row) => {
                    const dur = row.slotMinutes || 90;
                    const count = row.slotCount || Math.round((row.endMinute - row.startMinute) / dur);
                    return (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {count} slots × {dur}m
                        </Badge>
                      </div>
                    );
                  },
                },
                {
                  key: "duration",
                  header: "Total Duration",
                  render: (row) => (
                    <Badge variant="secondary" className="text-[10px]">
                      {formatDuration(row.startMinute, row.endMinute)}
                    </Badge>
                  ),
                },
                {
                  key: "actions",
                  header: "",
                  render: (row) => (
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => openEditDrawer(row)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                    </div>
                  ),
                },
              ]}
              data={slotTimes}
              sortKey={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              pageSize={pagination.pageSize}
              totalItems={pagination.total}
              onPageChange={pagination.setPage}
              emptyTitle="No time slots created"
              emptyDescription={
                search ? "No matches." : "Create your first time slot schedule."
              }
            />
          )}
        </CardContent>
      </Card>

      {/* Drawer Form */}
      {isDrawerOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={closeDrawer}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l bg-card shadow-xl">
            <div className="flex items-center justify-between border-b p-3">
              <h2 className="text-sm font-semibold">
                {editingSlotTime ? "Edit" : "New"} Time Plan
              </h2>
              <Button variant="ghost" size="icon" onClick={closeDrawer} className="h-7 w-7">
                <X className="size-4" />
              </Button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              {/* Name */}
              <div className="space-y-1.5">
                <Label htmlFor="timeName" className="text-xs font-medium">
                  Plan / Window Name
                </Label>
                <Input
                  id="timeName"
                  value={timeName}
                  onChange={(e) => setTimeName(e.target.value)}
                  placeholder="e.g. Morning Matches"
                  className="h-8 text-sm"
                />
              </div>

              {/* Start Time */}
              <div className="space-y-1.5">
                <Label htmlFor="startTime" className="text-xs font-medium">
                  Start Time
                </Label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="h-8 text-sm font-mono"
                />
              </div>

              {/* Slot Minutes & Count */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="slotMinutes" className="text-xs font-medium">
                    Slot Time (Min)
                  </Label>
                  <Input
                    id="slotMinutes"
                    type="number"
                    min={1}
                    value={slotMinutes}
                    onChange={(e) =>
                      setSlotMinutes(e.target.value === "" ? "" : Number(e.target.value))
                    }
                    placeholder="90"
                    className="h-8 text-sm font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="slotCount" className="text-xs font-medium">
                    Number of Slots
                  </Label>
                  <Input
                    id="slotCount"
                    type="number"
                    min={1}
                    value={slotCount}
                    onChange={(e) =>
                      setSlotCount(e.target.value === "" ? "" : Number(e.target.value))
                    }
                    placeholder="e.g. 2"
                    className="h-8 text-sm font-mono"
                  />
                </div>
              </div>

              {/* Peak Hour Switch */}
              <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/20">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <Flame className="size-3.5 text-amber-500" />
                    <Label htmlFor="isPeak" className="text-xs font-medium cursor-pointer">
                      Peak Time / Hour
                    </Label>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Mark this duration as high demand/peak pricing.
                  </p>
                </div>
                <Switch
                  id="isPeak"
                  checked={isPeakHour}
                  onCheckedChange={setIsPeakHour}
                />
              </div>

              {/* Live End Time Preview (Only rendered when valid inputs are given) */}
              {hasValidInputs ? (
                <div className="space-y-2 rounded-lg border bg-muted/40 p-3 text-xs">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock3 className="size-3 text-primary" /> Calculated End Time:
                    </span>
                    <span className="font-semibold text-foreground font-mono">
                      {formatTime(endMinute)} ({calculatedEndTime})
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-muted-foreground pt-1 border-t border-border">
                    <span>Total Duration:</span>
                    <span className="font-medium text-foreground">
                      {formatDuration(startMinute, endMinute)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">
                  Enter Start Time, Slot Time, and Number of Slots to calculate End Time.
                </div>
              )}

              {/* Overlap Notice */}
              {overlappingWindow && (
                <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-400">
                  <Layers className="size-4 shrink-0 mt-0.5 text-amber-500" />
                  <div>
                    <span className="font-semibold">Overlaps existing plan:</span>
                    <p className="mt-0.5">
                      "{overlappingWindow.timeName}" ({formatTime(overlappingWindow.startMinute)} – {formatTime(overlappingWindow.endMinute)})
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="border-t p-3">
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 flex-1 text-xs"
                  onClick={closeDrawer}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="h-8 flex-1 text-xs"
                  disabled={isSaving || !timeName.trim() || !hasValidInputs}
                  onClick={handleSubmit}
                >
                  {isSaving ? "Saving..." : editingSlotTime ? "Update Plan" : "Create Plan"}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}