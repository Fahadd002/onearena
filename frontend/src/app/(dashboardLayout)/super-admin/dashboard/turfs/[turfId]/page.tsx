"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Clock3, Eye, MapPin, ShieldCheck, X } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Badge } from "@/components/premium/Badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { httpClient } from "@/lib/axios/httpClient";
import { API_ENDPOINTS } from "@/lib/api/config";
import { getFileUrl } from "@/lib/utils";
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
  defaultSlotPrice: string | number;
  defaultSlotDuration: number;
  latitude: string | number;
  longitude: string | number;
  status: "ACTIVE" | "INACTIVE" | "REJECTED";
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
const labels: Record<string, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  REJECTED: "Rejected",
};
const statusColors: Record<string, string> = {
  ACTIVE: "bg-primary/10 text-primary border-primary/20",
  INACTIVE: "bg-secondary text-muted-foreground border-secondary/20",
  REJECTED: "bg-destructive/10 text-destructive border-destructive/20",
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
      <section className="dashboard-section space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="glass" className="gap-2 h-8">
            <Skeleton className="size-4" />
            <Skeleton className="h-4 w-20 rounded-md" />
          </Button>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-24 rounded-md bg-primary/10" />
            <Skeleton className="h-8 w-24 rounded-md" />
          </div>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32 rounded-lg bg-muted" />
            <Skeleton className="h-5 w-48 rounded-lg bg-muted" />
            <Skeleton className="h-4 w-64 rounded-lg bg-muted" />
          </div>
          <div className="space-y-4 text-right">
            <Skeleton className="h-8 w-20 rounded-md" />
            <Skeleton className="h-4 w-24 rounded-lg bg-muted" />
            <Skeleton className="h-4 w-40 rounded-lg bg-muted" />
          </div>
        </div>

        <Card className="overflow-hidden">
          <div className="relative grid grid-cols-2 gap-2 p-2 sm:grid-cols-4 lg:grid-cols-5 h-[300px]">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="relative overflow-hidden rounded-lg bg-muted aspect-[4/3]"
              >
                <Skeleton className="size-full rounded-lg" />
              </div>
            ))}
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            <Card className="overflow-hidden">
              <CardHeader className="p-0">
                <div className="flex items-center gap-2 px-4 py-3">
                  <Skeleton className="size-4 rounded-md bg-primary/10" />
                  <Skeleton className="h-4 w-24 rounded-lg bg-muted" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-sm p-4">
                <Skeleton className="h-4 w-full rounded-lg bg-muted" />
                <div className="grid gap-4 border-t pt-4 sm:grid-cols-3">
                  <div>
                    <Skeleton className="h-3 w-24 rounded-md bg-muted" />
                    <Skeleton className="h-5 w-24 rounded-md bg-muted" />
                  </div>
                  <div>
                    <Skeleton className="h-3 w-24 rounded-md bg-muted" />
                    <Skeleton className="h-5 w-16 rounded-md bg-muted" />
                  </div>
                  <div>
                    <Skeleton className="h-3 w-24 rounded-md bg-muted" />
                    <Skeleton className="h-4 w-48 rounded-md bg-muted" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader className="p-0">
                <div className="flex items-center gap-2 px-4 py-3">
                  <Skeleton className="size-4 rounded-md bg-primary/10" />
                  <Skeleton className="h-4 w-20 rounded-lg bg-muted" />
                </div>
              </CardHeader>
              <CardContent className="divide-y p-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 py-3 text-sm hover:bg-muted/30 rounded-lg transition-colors cursor-pointer">
                    <span>
                      <Skeleton className="h-4 w-32 rounded-lg bg-muted" />
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">
                        <Skeleton className="h-4 w-16 rounded-md bg-muted" />
                      </span>
                      <Skeleton className="h-8 size-8 rounded-md bg-primary/10" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <aside className="space-y-6">
            <Card className="overflow-hidden">
              <CardHeader className="p-0">
                <div className="flex items-center gap-2 px-4 py-3">
                  <Skeleton className="size-4 rounded-md bg-primary/10" />
                  <Skeleton className="h-4 w-20 rounded-lg bg-muted" />
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2 p-4">
                {[...Array(3)].map((_, i) => (
                  <span
                    key={i}
                    className="rounded-md border bg-muted/40 px-3 h-8 text-sm font-medium flex items-center justify-center"
                  >
                    <Skeleton className="h-4 w-24 rounded-md bg-muted" />
                  </span>
                ))}
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader className="p-0">
                <div className="flex items-center gap-2 px-4 py-3">
                  <Skeleton className="h-4 w-12 rounded-md bg-muted" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3 p-4">
                {[...Array(2)].map((_, i) => (
                  <div
                    key={i}
                    className="rounded-lg border p-3 cursor-pointer hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">
                        <Skeleton className="h-4 w-32 rounded-md bg-muted" />
                      </span>
                      <Skeleton className="h-8 size-8 rounded-md bg-primary/10" />
                    </div>
                    <span className="mt-1 text-xs text-muted-foreground">
                      <Skeleton className="h-4 w-24 rounded-md bg-muted" />
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </aside>
        </div>
      </section>
    );
  if (!turf)
    return (
      <section className="dashboard-section">
        <p className="dashboard-empty">Turf not found.</p>
      </section>
    );
  return (
    <section className="dashboard-section space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="glass"
          className="gap-2 h-8"
          onClick={() => router.push("/super-admin/dashboard/turfs")}
        >
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <div className="flex gap-2">
          {turf.status !== "ACTIVE" && (
            <Button
              variant="hero"
              size="sm"
              className="h-8"
              onClick={() => update.mutate("ACTIVE")}
              disabled={update.isPending}
            >
              <Check className="size-4" />
              Make Active
            </Button>
          )}
          {turf.status === "ACTIVE" && (
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => update.mutate("INACTIVE")}
              disabled={update.isPending}
            >
              <X className="size-4" />
              Make Inactive
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
          <Badge variant="outline" size="sm" className={statusColors[turf.status]}>
            {labels[turf.status]}
          </Badge>
          <p className="font-semibold">{turf.owner.name}</p>
          <p className="text-sm text-muted-foreground">{turf.owner.email}</p>
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="p-0">
          <div className="relative grid grid-cols-2 gap-2 p-2 sm:grid-cols-4 lg:grid-cols-5 h-[300px]">
            {turf.images.length ? (
              turf.images.map((image) => (
                <div
                  key={image.id}
                  className="relative overflow-hidden rounded-lg bg-muted aspect-[4/3] group"
                >
                  <Image
                    src={getFileUrl(image.url) ?? ""}
                    alt={image.altText || turf.name}
                    fill
                    className="size-full object-cover group-hover:scale-105 transition-transform duration-200"
                    sizes="(max-width: 768px) 100vw, 20vw"
                  />
                </div>
              ))
            ) : (
              <div className="col-span-full flex min-h-[300px] items-center justify-center text-sm text-muted-foreground">
                No images submitted
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="size-4 text-primary" />
                Venue information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {turf.description ? (
                <p className="leading-7 text-muted-foreground">{turf.description}</p>
              ) : (
                <p className="leading-7 text-muted-foreground italic">No description provided.</p>
              )}
              <div className="grid gap-4 border-t pt-4 sm:grid-cols-3">
                <div>
                  <p className="text-muted-foreground text-xs">Starting price</p>
                  <p className="mt-1 text-lg font-semibold">
                    ৳ {Number(turf.defaultSlotPrice).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Slot duration</p>
                  <p className="mt-1 text-lg font-semibold">{turf.defaultSlotDuration} min</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Coordinates</p>
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
                      className="flex items-center justify-between gap-3 py-3 text-sm hover:bg-muted/30 rounded-lg transition-colors cursor-pointer"
                    >
                      <span>
                        {dayNames[rule.dayOfWeek]} ·{" "}
                        {formatRuleTime(rule.startMinute)}-{formatRuleTime(rule.endMinute)}
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
                <p className="text-sm text-muted-foreground italic">No pricing rules.</p>
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
                    className="rounded-md border bg-muted/40 px-3 h-8 text-sm font-medium flex items-center justify-center"
                  >
                    {facility.name}
                  </span>
                ))
              ) : (
                <p className="text-sm text-muted-foreground italic">No facilities.</p>
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
                    <div className="rounded-lg border p-3 cursor-pointer hover:bg-muted/30 transition-colors">
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
                                  className="rounded-md border bg-muted/40 px-3 h-8 text-xs font-medium flex items-center justify-center"
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
                <p className="text-sm text-muted-foreground italic">No packages.</p>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </section>
  );
}
