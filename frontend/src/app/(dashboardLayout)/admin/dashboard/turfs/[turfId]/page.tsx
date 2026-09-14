"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Clock3, Edit3, Images, MapPin, ShieldCheck, Sparkles } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { httpClient } from "@/lib/axios/httpClient";
import { API_ENDPOINTS } from "@/lib/api/config";

type Turf = {
  name: string;
  address: string;
  description?: string | null;
  basePrice: string | number;
  slotMinutes: number;
  latitude: string | number;
  longitude: string | number;
  status: "ACTIVE" | "REJECTED" | "INACTIVE";
  category: { name: string };
  facilities: Array<{ facility: { id: string; name: string } }>;
  images: Array<{ id: string; url: string; altText?: string | null }>;
  priceRules: Array<{ dayOfWeek: number; startMinute: number; endMinute: number; price: string | number; active: boolean }>;
};

const statusLabel: Record<Turf["status"], string> = { ACTIVE: "Live", REJECTED: "Changes needed", INACTIVE: "Paused" };

export default function AdminTurfDetailPage() {
  const params = useParams<{ turfId: string }>();
  const router = useRouter();
  const { data: turf, isLoading } = useQuery({
    queryKey: ["turf", params.turfId],
    queryFn: async () => (await httpClient.get<Turf>(`${API_ENDPOINTS.marketplace.ownerTurfs}/${params.turfId}`)).data,
    enabled: !!params.turfId,
  });

  if (!params.turfId) return null;
  if (isLoading) return <section className="dashboard-section"><p className="dashboard-empty">Loading venue profile...</p></section>;
  if (!turf) return <section className="dashboard-section"><p className="dashboard-empty">Turf not found.</p></section>;

  const cover = turf.images[0]?.url;
  return <section className="dashboard-section max-w-6xl space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <Button variant="glass" className="-ml-3 gap-2 border-transparent shadow-sm hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md" onClick={() => router.push("/admin/dashboard/turfs")}><ArrowLeft className="size-4" />All turfs</Button>
      <div className="flex gap-2">
        <Button variant="outline" className="gap-2 rounded-xl px-4 shadow-sm hover:-translate-y-0.5 hover:shadow-md" onClick={() => router.push(`/admin/dashboard/pricing-and-slots-setup`)}><Clock3 className="size-4" />Pricing &amp; Slots</Button>
        <Button variant="accent" className="gap-2 rounded-xl px-5 shadow-lg shadow-accent/20 hover:-translate-y-0.5 hover:shadow-xl" onClick={() => router.push(`/admin/dashboard/turfs/${params.turfId}/edit`)}><Edit3 className="size-4" />Edit venue</Button>
      </div>
    </div>
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="grid min-h-[360px] lg:grid-cols-[1.35fr_0.65fr]">
        <div className="relative min-h-[280px] bg-muted">
          {cover ? <img src={cover} alt={turf.images[0]?.altText || turf.name} className="absolute inset-0 size-full object-cover" /> : <div className="flex size-full min-h-[280px] items-center justify-center bg-secondary text-muted-foreground"><Images className="mr-2 size-5" />No venue images yet</div>}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-6 pt-20 text-white"><p className="text-sm font-medium text-white/75">{turf.category.name}</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">{turf.name}</h1></div>
        </div>
        <div className="flex flex-col justify-between p-6 sm:p-8">
          <div><div className="flex items-center justify-between gap-3"><span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">{statusLabel[turf.status]}</span><span className="text-sm text-muted-foreground">Owner dashboard</span></div><div className="mt-8 flex items-start gap-3"><MapPin className="mt-0.5 size-5 shrink-0 text-primary" /><p className="text-sm leading-6 text-muted-foreground">{turf.address}</p></div></div>
          <div className="mt-8 grid grid-cols-2 gap-4 border-t pt-5"><div><p className="text-xs uppercase tracking-wider text-muted-foreground">Starting price</p><p className="mt-1 text-2xl font-semibold">৳ {Number(turf.basePrice).toLocaleString()}</p></div><div><p className="text-xs uppercase tracking-wider text-muted-foreground">Slot length</p><p className="mt-1 text-2xl font-semibold">{turf.slotMinutes}<span className="ml-1 text-sm font-normal text-muted-foreground">min</span></p></div></div>
        </div>
      </div>
    </div>
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <Card><CardContent className="p-6 sm:p-7"><div className="flex items-center gap-2"><Sparkles className="size-4 text-primary" /><h2 className="font-semibold">About this venue</h2></div><p className="mt-4 text-sm leading-7 text-muted-foreground">{turf.description || "A verified OneArena venue ready for your next match."}</p></CardContent></Card>
        {turf.images.length > 1 && <Card><CardContent className="p-6 sm:p-7"><div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">Venue gallery</h2><span className="text-xs text-muted-foreground">{turf.images.length} images</span></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{turf.images.map((image) => <img key={image.id} src={image.url} alt={image.altText || turf.name} className="aspect-[4/3] w-full rounded-lg object-cover" />)}</div></CardContent></Card>}

      </div>
      <aside className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" />
              <h2 className="font-semibold">Facilities</h2>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">{turf.facilities.length ? turf.facilities.map(({ facility }) => <span key={facility.id} className="rounded-md border bg-muted/40 px-3 py-2 text-sm">{facility.name}</span>) : <p className="text-sm text-muted-foreground">No facilities added.</p>}</div></CardContent></Card>
      </aside>
    </div>
  </section>;
}
