"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Clock3, Eye, MapPin, ShieldCheck, X } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { httpClient } from "@/lib/axios/httpClient";
import { API_ENDPOINTS } from "@/lib/api/config";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Turf = {
  id: string;
  name: string;
  address: string;
  description?: string | null;
  basePrice: string | number;
  slotMinutes: number;
  latitude: string | number;
  longitude: string | number;
  status: "DRAFT" | "PENDING_APPROVAL" | "ACTIVE" | "INACTIVE" | "REJECTED";
  category: { id: string; name: string };
  owner: { id: string; name: string; email: string };
  facilities: Array<{ facility: { id: string; name: string } }>;
  images: Array<{ id: string; url: string; altText?: string | null }>;
  priceRules: Array<{
    dayOfWeek: number;
    startMinute: number;
    endMinute: number;
    price: string | number;
    active: boolean;
  }>;
  packages: Array<{
    id: string;
    name: string;
    description?: string | null;
    price: string | number;
    active: boolean;
    facilities: Array<{ facility: { name: string } }>;
  }>;
};
const labels = {
  DRAFT: "Draft",
  PENDING_APPROVAL: "Awaiting review",
  ACTIVE: "Approved",
  INACTIVE: "Unapproved",
  REJECTED: "Rejected",
};
const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const formatRuleTime = (minutes: number) => {
  const normalizedMinutes = ((minutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalizedMinutes / 60);
  const minutePart = String(normalizedMinutes % 60).padStart(2, "0");
  const period = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${minutePart} ${period}`;
};

export default function SuperAdminTurfReviewPage() {
  const params = useParams<{ turfId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: turf, isLoading } = useQuery({
    queryKey: ["super-admin-turf", params.turfId],
    enabled: !!params.turfId,
    queryFn: async () =>
      (await httpClient.get<Turf>(`${API_ENDPOINTS.marketplace.superAdminTurfs}/${params.turfId}`))
        .data,
  });
  const update = useMutation({
    mutationFn: (status: "ACTIVE" | "REJECTED" | "INACTIVE") =>
      httpClient.patch(`${API_ENDPOINTS.marketplace.superAdminTurfs}/${params.turfId}/status`, {
        status,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["super-admin-turf", params.turfId] });
      void queryClient.invalidateQueries({ queryKey: ["super-admin-turfs"] });
      toast.success("Turf status updated");
    },
    onError: () => toast.error("Could not update turf status"),
  });
  if (isLoading)
    return (
      <section className="dashboard-section">
        <p className="dashboard-empty">Loading review...</p>
      </section>
    );
  if (!turf)
    return (
      <section className="dashboard-section">
        <p className="dashboard-empty">Turf not found.</p>
      </section>
    );
  return (
    <section className="dashboard-section max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="glass"
          className="gap-2"
          onClick={() => router.push("/super-admin/dashboard/turfs")}
        >
          <ArrowLeft className="size-4" />
          Back to approvals
        </Button>
        <div className="flex gap-2">
          {turf.status !== "ACTIVE" && (
            <Button
              variant="hero"
              onClick={() => update.mutate("ACTIVE")}
              disabled={update.isPending}
            >
              <Check className="size-4" />
              {turf.status === "PENDING_APPROVAL" ? "Approve turf" : "Set active"}
            </Button>
          )}
          {turf.status === "ACTIVE" && (
            <Button
              variant="outline"
              onClick={() => update.mutate("INACTIVE")}
              disabled={update.isPending}
            >
              <X className="size-4" />
              Unapprove
            </Button>
          )}
          {turf.status === "PENDING_APPROVAL" && (
            <Button
              variant="destructive"
              onClick={() => update.mutate("REJECTED")}
              disabled={update.isPending}
            >
              Reject
            </Button>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="dashboard-meta">
            {turf.category.name} · {labels[turf.status]}
          </p>
          <h1 className="dashboard-title mt-1">{turf.name}</h1>
          <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="size-4 text-primary" />
            {turf.address}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Owner</p>
          <p className="font-semibold">{turf.owner.name}</p>
          <p className="text-sm text-muted-foreground">{turf.owner.email}</p>
        </div>
      </div>
      <Card className="overflow-hidden">
        <div className="grid grid-cols-2 gap-2 p-2 sm:grid-cols-4">
          {turf.images.length ? (
            turf.images.map((image) => (
              <img
                key={image.id}
                src={image.url}
                alt={image.altText || turf.name}
                className="aspect-[4/3] w-full rounded-lg object-cover"
              />
            ))
          ) : (
            <div className="col-span-full flex min-h-40 items-center justify-center text-sm text-muted-foreground">
              No images submitted
            </div>
          )}
        </div>
      </Card>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Venue information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p className="leading-7 text-muted-foreground">
                {turf.description || "No description provided."}
              </p>
              <div className="grid gap-4 border-t pt-4 sm:grid-cols-3">
                <div>
                  <p className="text-muted-foreground">Starting price</p>
                  <p className="mt-1 text-lg font-semibold">
                    ৳ {Number(turf.basePrice).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Slot duration</p>
                  <p className="mt-1 text-lg font-semibold">{turf.slotMinutes} min</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Coordinates</p>
                  <p className="mt-1 font-mono text-xs">
                    {Number(turf.latitude).toFixed(7)}, {Number(turf.longitude).toFixed(7)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock3 className="size-4 text-primary" />
                Pricing rules
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              {turf.priceRules.length ? (
                turf.priceRules.map((rule) => (
                  <Dialog key={`${rule.dayOfWeek}-${rule.startMinute}`}>
                    <div
                      key={`${rule.dayOfWeek}-${rule.startMinute}`}
                      className="flex items-center justify-between gap-3 py-3 text-sm"
                    >
                      <span>
                        {dayNames[rule.dayOfWeek]} · {formatRuleTime(rule.startMinute)}-{formatRuleTime(rule.endMinute)}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">
                          ৳ {Number(rule.price).toLocaleString()}
                        </span>
                        <DialogTrigger asChild>
                          <Button
                            size="icon"
                            variant="glass"
                            className="size-8"
                            aria-label="View pricing rule details"
                          >
                            <Eye className="size-4" />
                          </Button>
                        </DialogTrigger>
                      </div>
                    </div>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Pricing rule details</DialogTitle>
                        <DialogDescription>
                          Review the schedule and price configured for this turf.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 rounded-lg border bg-muted/30 p-4 text-sm sm:grid-cols-2">
                        <div>
                          <p className="text-muted-foreground">Day</p>
                          <p className="mt-1 font-semibold">{dayNames[rule.dayOfWeek]}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Status</p>
                          <p className="mt-1 font-semibold">
                            {rule.active ? "Active" : "Inactive"}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Start time</p>
                          <p className="mt-1 font-semibold">{formatRuleTime(rule.startMinute)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">End time</p>
                          <p className="mt-1 font-semibold">{formatRuleTime(rule.endMinute)}</p>
                        </div>
                        <div className="sm:col-span-2">
                          <p className="text-muted-foreground">Price</p>
                          <p className="mt-1 text-xl font-semibold">
                            ৳ {Number(rule.price).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No pricing rules.</p>
              )}
            </CardContent>
          </Card>
        </div>
        <aside className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" />
                Facilities
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {turf.facilities.length ? (
                turf.facilities.map(({ facility }) => (
                  <span
                    key={facility.id}
                    className="rounded-md border bg-muted/40 px-3 py-2 text-sm"
                  >
                    {facility.name}
                  </span>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No facilities.</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Packages</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {turf.packages.length ? (
                turf.packages.map((pkg) => (
                  <Dialog key={pkg.id}>
                    <div className="rounded-lg border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium">{pkg.name}</p>
                        <DialogTrigger asChild>
                          <Button
                            size="icon"
                            variant="glass"
                            className="size-8"
                            aria-label={`View ${pkg.name} details`}
                          >
                            <Eye className="size-4" />
                          </Button>
                        </DialogTrigger>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        ৳ {Number(pkg.price).toLocaleString()} ·{" "}
                        {pkg.active ? "Active" : "Inactive"}
                      </p>
                    </div>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>{pkg.name}</DialogTitle>
                        <DialogDescription>
                          Full package configuration for this turf.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 text-sm">
                        <div className="grid grid-cols-2 gap-4 rounded-lg border bg-muted/30 p-4">
                          <div>
                            <p className="text-muted-foreground">Price</p>
                            <p className="mt-1 text-xl font-semibold">
                              ৳ {Number(pkg.price).toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Status</p>
                            <p className="mt-1 font-semibold">
                              {pkg.active ? "Active" : "Inactive"}
                            </p>
                          </div>
                        </div>
                        <div>
                          <p className="font-medium">Description</p>
                          <p className="mt-1 leading-6 text-muted-foreground">
                            {pkg.description || "No description provided."}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium">Included facilities</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {pkg.facilities.length ? (
                              pkg.facilities.map(({ facility }) => (
                                <span
                                  key={facility.name}
                                  className="rounded-md border bg-muted/40 px-3 py-2 text-xs"
                                >
                                  {facility.name}
                                </span>
                              ))
                            ) : (
                              <span className="text-muted-foreground">No facilities included.</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No packages.</p>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </section>
  );
}
