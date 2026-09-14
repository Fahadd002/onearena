"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { httpClient } from "@/lib/axios/httpClient";
import { API_ENDPOINTS } from "@/lib/api/config";
import { createPackageAction, type PackagePayload } from "../_actions";

type Facility = { id: string; name: string };

export default function AdminNewPackagePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedTurfId = searchParams.get("turfId") || "";
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const { data: turfsData, isLoading: turfsLoading } = useQuery({
    queryKey: ["owner-turfs-dropdown"],
    queryFn: async () =>
      (await httpClient.get<{ id: string; name: string }[]>(API_ENDPOINTS.marketplace.ownerTurfs)).data,
  });

  const turfs = turfsData ?? [];

  const { data: facilitiesResult, isLoading: facilitiesLoading } = useQuery({
    queryKey: ["admin-facilities"],
    queryFn: async () =>
      (await httpClient.get<{ data: Facility[] }>(API_ENDPOINTS.marketplace.facilities, {
        params: { page: "1", limit: "100", sortBy: "name", sortOrder: "asc" },
      })).data,
  });

  const facilities = facilitiesResult?.data ?? [];

  const form = useForm({
    defaultValues: {
      turfId: preselectedTurfId,
      name: "",
      description: "",
      price: "",
      active: true,
      facilityIds: [] as string[],
    },
    onSubmit: async ({ value }) => {
      setSaving(true);
      try {
        const payload: PackagePayload = {
          name: value.name.trim(),
          description: value.description?.trim() || undefined,
          price: Number(value.price),
          active: value.active ?? true,
          facilityIds: selectedFacilities,
        };

        const result = await createPackageAction(value.turfId, payload);
        if (!result.success) {
          toast.error(result.message);
          return;
        }

        toast.success("Package created successfully");
        router.push("/admin/dashboard/packages");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not create package");
      } finally {
        setSaving(false);
      }
    },
  });

  useEffect(() => {
    if (preselectedTurfId) {
      form.setFieldValue("turfId", preselectedTurfId);
    }
  }, [preselectedTurfId, form]);

  const field = (name: keyof typeof form.state.values, label: string, type = "text") => (
    <form.Field name={name}>
      {(control) => (
        <div className="space-y-1.5">
          <Label htmlFor={String(control.name)} className="text-xs font-medium">{label}</Label>
          <Input
            id={String(control.name)}
            type={type}
            value={control.state.value as string}
            onChange={(event) => control.handleChange(event.target.value)}
            aria-invalid={!!control.state.meta.errors.length}
            className="h-8 text-sm"
          />
          {control.state.meta.errors.length > 0 && (
            <p className="text-[11px] text-destructive">{control.state.meta.errors.join(", ")}</p>
          )}
        </div>
      )}
    </form.Field>
  );

  return (
    <section className="dashboard-section max-w-3xl space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="-ml-3 h-8 w-8">
          <Link href="/admin/dashboard/packages" aria-label="Back">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <p className="dashboard-meta text-xs">Package management</p>
          <h1 className="dashboard-title text-lg">Create package</h1>
        </div>
      </div>

      <form onSubmit={(event) => { event.preventDefault(); event.stopPropagation(); void form.handleSubmit(); }}>
        <Card className="surface-card">
          <CardHeader className="px-3 py-2.5 sm:px-4">
            <CardTitle className="text-sm font-semibold">Package details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-3 pb-3 sm:px-4 sm:pb-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <form.Field name="turfId">
                {(control) => (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Turf</Label>
                    <Select
                      value={control.state.value as string}
                      onValueChange={control.handleChange}
                      disabled={turfsLoading || !!preselectedTurfId}
                    >
                      <SelectTrigger aria-invalid={!!control.state.meta.errors.length} className="h-8 text-sm">
                        <SelectValue placeholder="Choose a turf" />
                      </SelectTrigger>
                      <SelectContent>
                        {turfs.map((turf) => (
                          <SelectItem key={turf.id} value={turf.id}>
                            {turf.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {control.state.meta.errors.length > 0 && (
                      <p className="text-[11px] text-destructive">{control.state.meta.errors.join(", ")}</p>
                    )}
                  </div>
                )}
              </form.Field>

              {field("name", "Package name")}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {field("price", "Price (৳)", "number")}
              <form.Field name="active">
                {(control) => (
                  <div className="flex items-center justify-between rounded-lg border p-2.5 h-8">
                    <Label htmlFor={String(control.name)} className="cursor-pointer text-xs font-medium">Active</Label>
                    <Switch
                      id={String(control.name)}
                      checked={control.state.value}
                      onCheckedChange={control.handleChange}
                    />
                  </div>
                )}
              </form.Field>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs font-medium">Description <span className="font-normal text-muted-foreground">(optional)</span></Label>
              <textarea
                id="description"
                value={form.state.values.description}
                onChange={(event) => form.setFieldValue("description", event.target.value)}
                className="min-h-[60px] w-full rounded-md border border-input bg-background/60 px-2.5 py-1.5 text-sm"
              />
            </div>

            <div className="space-y-2 border-t pt-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-medium">Facilities</Label>
                  <p className="text-[11px] text-muted-foreground">Select the facilities included in this package.</p>
                </div>
                <span className="text-[11px] text-muted-foreground">{selectedFacilities.length} selected</span>
              </div>
              {facilitiesLoading ? (
                <p className="text-xs text-muted-foreground">Loading facilities...</p>
              ) : (
                <div className="max-h-[240px] overflow-y-auto rounded-lg border">
                  <div className="grid grid-cols-2 sm:grid-cols-3">
                    {facilities.map((facility) => {
                      const checked = selectedFacilities.includes(facility.id);
                      return (
                        <label
                          key={facility.id}
                          className={`flex cursor-pointer items-center gap-2 border-b border-r px-2.5 py-2 last:border-b-0 hover:bg-secondary/40 ${checked ? "bg-primary/5" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setSelectedFacilities((current) =>
                                current.includes(facility.id)
                                  ? current.filter((id) => id !== facility.id)
                                  : [...current, facility.id]
                              )
                            }
                            className="size-3.5 accent-primary"
                          />
                          <span className="truncate text-xs font-medium">{facility.name}</span>
                        </label>
                      );
                    })}
                  </div>
                  {!facilitiesLoading && !facilities.length && (
                    <p className="px-3 py-3 text-xs text-muted-foreground">No facilities have been created yet.</p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="mt-4 flex justify-between gap-3">
          <Button type="button" variant="outline" asChild className="h-8 text-xs">
            <Link href="/admin/dashboard/packages">Cancel</Link>
          </Button>
          <Button type="submit" disabled={saving || !form.state.values.turfId || selectedFacilities.length === 0} className="h-8 text-xs">
            {saving && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
            {saving ? "Creating..." : "Create package"}
          </Button>
        </div>
      </form>
    </section>
  );
}
