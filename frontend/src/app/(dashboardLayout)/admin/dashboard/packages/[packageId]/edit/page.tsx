"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { httpClient } from "@/lib/axios/httpClient";
import { API_ENDPOINTS } from "@/lib/api/config";
import { updatePackageAction } from "../../_actions";

type Facility = { id: string; name: string };
type Package = {
  id: string;
  turfId: string;
  turf: { name: string };
  name: string;
  description?: string | null;
  price: string | number;
  active: boolean;
  facilities: Array<{ facility: { id: string; name: string } }>;
};

export default function AdminEditPackagePage() {
  const router = useRouter();
  const params = useParams<{ packageId: string }>();
  const packageId = params.packageId;
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [active, setActive] = useState(true);
  const [selectedTurfId, setSelectedTurfId] = useState("");

  const { data: pkg, isLoading: pkgLoading } = useQuery({
    queryKey: ["package-edit", packageId],
    enabled: !!packageId,
    queryFn: async () => {
      const result = await httpClient.get<Package>(`${API_ENDPOINTS.marketplace.ownerPackages}/${packageId}`);
      return result.data;
    },
  });

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

  useEffect(() => {
    if (!pkg) return;
    console.log('Hydrating package form with pkg:', pkg);
    setSelectedTurfId(pkg.turfId);
    setName(pkg.name);
    setDescription(pkg.description || "");
    setPrice(String(pkg.price));
    setActive(pkg.active);
    setSelectedFacilities(pkg.facilities.map((f) => f.facility.id));
  }, [pkg]);

  const currentTurfName = pkg?.turf?.name || "";
  const selectedTurfName = turfs.find((t) => t.id === selectedTurfId)?.name || currentTurfName;

  const turfOptions = useMemo(() => {
    const currentTurf = pkg?.turfId ? { id: pkg.turfId, name: pkg?.turf?.name || currentTurfName } : null;
    const exists = turfs.some((t) => t.id === pkg?.turfId);
    if (currentTurf && !exists) {
      return [currentTurf, ...turfs];
    }
    return turfs;
  }, [pkg?.turfId, pkg?.turf?.name, currentTurfName, turfs]);

  console.log('Render state:', { selectedTurfId, currentTurfName, selectedTurfName, turfOptions: turfOptions.map(t => ({ id: t.id, name: t.name })) });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        price: Number(price),
        active,
        turfId: selectedTurfId,
        facilityIds: selectedFacilities,
      };

      const result = await updatePackageAction(packageId, payload);
      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success("Package updated successfully");
      router.push("/admin/dashboard/packages");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update package");
    } finally {
      setSaving(false);
    }
  };

  if (packageId && pkgLoading) return <section className="dashboard-section"><p className="dashboard-empty">Loading package editor...</p></section>;
  if (packageId && !pkg) return <section className="dashboard-section"><p className="dashboard-empty">Package not found.</p></section>;

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
          <h1 className="dashboard-title text-lg">Edit package</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="surface-card">
          <CardHeader className="px-3 py-2.5 sm:px-4">
            <CardTitle className="text-sm font-semibold">Package details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-3 pb-3 sm:px-4 sm:pb-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Turf</Label>
                <select
                  key={selectedTurfId}
                  value={selectedTurfId}
                  onChange={(e) => setSelectedTurfId(e.target.value)}
                  className="h-8 w-full rounded-md border border-input bg-background px-2.5 text-sm"
                >
                  {turfOptions.map((turf) => (
                    <option key={turf.id} value={turf.id}>
                      {turf.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-medium">Package name</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="price" className="text-xs font-medium">Price (৳)</Label>
                <Input
                  id="price"
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-2.5 h-8">
                <Label htmlFor="active" className="cursor-pointer text-xs font-medium">Active</Label>
                <Switch
                  id="active"
                  checked={active}
                  onCheckedChange={setActive}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs font-medium">Description <span className="font-normal text-muted-foreground">(optional)</span></Label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
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
          <Button type="submit" disabled={saving || selectedFacilities.length === 0} className="h-8 text-xs">
            {saving && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </form>
    </section>
  );
}