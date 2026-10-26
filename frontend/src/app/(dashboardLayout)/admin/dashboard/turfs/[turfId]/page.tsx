"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronRight,
  Clock3,
  Edit3,
  Images,
  MapPin,
  ShieldCheck,
  Sparkles,
  Phone,
  Clock,
  Check,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { httpClient } from "@/lib/axios/httpClient";
import { API_ENDPOINTS } from "@/lib/api/config";
import { getFileUrl } from "@/lib/utils";

type Turf = {
  id: string;
  name: string;
  address: string;
  description?: string | null;
  defaultSlotPrice: string | number;
  defaultSlotDuration: number;
  latitude: string | number;
  longitude: string | number;
  status: "ACTIVE" | "REJECTED" | "INACTIVE";
  allowAdvancePayment: boolean;
  advancePaymentAmount?: string | number;
  paymentPhoneNumbers: Array<{ id: string; number: string; method: string }>;
  category: { name: string };
  facilities: Array<{ facility: { id: string; name: string } }>;
  images: Array<{ id: string; url: string; altText?: string | null }>;
  priceRules: Array<{ dayOfWeek: number; startMinute: number; endMinute: number; price: string | number; active: boolean }>;
};

const statusLabel: Record<Turf["status"], string> = { ACTIVE: "Live", REJECTED: "Changes needed", INACTIVE: "Paused" };
const statusColor: Record<Turf["status"], string> = {
  ACTIVE: "bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/30",
  REJECTED: "bg-error-500/10 text-error-600 border-error-200 dark:bg-error-900/20 dark:text-error-400 dark:border-error-800/30",
  INACTIVE: "bg-muted text-muted-foreground border-border/50 dark:bg-muted/30 dark:text-muted-foreground dark:border-muted",
};

const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function AdminTurfDetailPage() {
  const params = useParams<{ turfId: string }>();
  const router = useRouter();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const { data: turf, isLoading } = useQuery({
    queryKey: ["turf", params.turfId],
    queryFn: async () => (await httpClient.get<Turf>(`${API_ENDPOINTS.marketplace.ownerTurfs}/${params.turfId}`)).data,
    enabled: !!params.turfId,
  });

  if (!params.turfId) return null;
  if (isLoading) return <section className="dashboard-section"><p className="dashboard-empty">Loading venue profile...</p></section>;
  if (!turf) return <section className="dashboard-section"><p className="dashboard-empty">Turf not found.</p></section>;

  const cover = turf.images[0]?.url ? getFileUrl(turf.images[0].url) : null;
  const galleryImages = turf.images.slice(1);
  const activePriceRules = turf.priceRules.filter((rule) => rule.active);
  const allImages: string[] = [];
  if (cover) allImages.push(cover);
  galleryImages.forEach((img) => {
    const url = getFileUrl(img.url) ?? img.url;
    if (url) allImages.push(url);
  });

  return <section className="dashboard-section space-y-3">
    {/* Header Actions */}
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-1.5">
        <Button variant="glass" size="sm" className="-ml-1 h-8 gap-1.5 px-2.5 text-xs border-transparent shadow-sm hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md" onClick={() => router.push("/admin/dashboard/turfs")}>
          <ArrowLeft className="size-3" /> All turfs
        </Button>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-lg px-2.5 text-xs shadow-sm hover:-translate-y-0.5 hover:shadow-md" onClick={() => router.push(`/admin/dashboard/pricing-and-slots-setup`)}>
          <Clock3 className="size-3" /> Pricing & Slots
        </Button>
      </div>
      <Button variant="accent" size="sm" className="h-8 gap-1.5 rounded-lg px-3 text-xs shadow-lg shadow-accent/20 hover:-translate-y-0.5 hover:shadow-xl" onClick={() => router.push(`/admin/dashboard/turfs/${params.turfId}/edit`)}>
        <Edit3 className="size-3" /> Edit venue
      </Button>
    </div>

    {/* Main Image + Thumbnails */}
    <div className="relative min-h-[300px] max-h-[400px] lg:flex lg:gap-4 items-stretch">
      {/* Main Image - left, reduced size */}
      <div className="relative overflow-hidden rounded-xl border bg-card shadow-sm aspect-[4/3] min-w-0 w-full">
        {allImages.length > 0 ? (
          <img
            src={allImages[activeImageIndex]}
            alt={turf.images[activeImageIndex]?.altText || turf.name}
            className="size-full object-cover transition-opacity duration-300"
          />
        ) : (
          <div className="size-full flex items-center justify-center bg-muted text-muted-foreground">
            <Images className="mr-1.5 size-6" /> No venue images
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-4 pb-10">
          <div className="flex items-center gap-1.5 mb-2">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[9px] font-bold border ${statusColor[turf.status]}`}>
              {statusLabel[turf.status]}
            </span>
          </div>
          <h1 className="mt-0.5 text-xl font-bold tracking-tight text-white">{turf.name}</h1>
          <p className="text-xs text-white/90 flex items-center gap-1 mt-1">
            <MapPin className="size-3 shrink-0" /> {turf.address}
          </p>
        </div>
      </div>

      {/* Thumbnails list on right */}
      {galleryImages.length > 0 && (
        <div className="flex flex-col gap-2 h-full shrink-0 lg:w-48">
          {galleryImages.map((image, index) => (
            <img
              key={image.id}
              src={getFileUrl(image.url) ?? image.url}
              alt={image.altText || turf.name}
              onClick={() => setActiveImageIndex(index + 1)}
              className={`flex-1 w-full rounded-lg object-cover border-2 cursor-pointer transition-all ${
                activeImageIndex === index + 1
                  ? "border-primary shadow-[0_0_0_3px_rgba(70,95,255,0.2)] scale-105"
                  : "border-transparent opacity-80 hover:opacity-100 hover:border-primary/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>

    {/* Content Grid */}
    <div className="grid gap-3 lg:grid-cols-[1fr_280px]">
      <div className="space-y-3">
        {/* Overview */}
        <Card className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <Sparkles className="size-4" />
              </div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Venue overview</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 border-y border-border/50 py-3">
              <div>
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Starting price</p>
                <p className="mt-0.5 text-lg font-bold text-foreground">৳ {Number(turf.defaultSlotPrice).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Slot length</p>
                <p className="mt-0.5 text-lg font-bold text-foreground">{turf.defaultSlotDuration}<span className="ml-0.5 text-xs font-normal text-muted-foreground"> min</span></p>
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Status</p>
                <span className={`mt-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold border ${statusColor[turf.status]}`}>
                  {statusLabel[turf.status]}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* About */}
        {turf.description && (
          <Card className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
                  <ShieldCheck className="size-4" />
                </div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">About this venue</p>
              </div>
              <p className="text-xs leading-6 text-foreground/90">{turf.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Price Rules */}
        {activePriceRules.length > 0 && (
          <Card className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600">
                  <Clock className="size-4" />
                </div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Custom pricing</p>
              </div>
              <div className="divide-y divide-border/50">
                {activePriceRules.map((rule) => (
                  <div key={`${rule.dayOfWeek}-${rule.startMinute}`} className="flex items-center justify-between px-2 py-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-medium text-foreground">{dayLabels[rule.dayOfWeek]}</span>
                      <span className="text-[9px] text-muted-foreground">
                        {Math.floor(rule.startMinute / 60).toString().padStart(2, "0")}:{`${rule.startMinute % 60}`.padStart(2, "0")} –{" "}
                        {Math.floor(rule.endMinute / 60).toString().padStart(2, "0")}:{`${rule.endMinute % 60}`.padStart(2, "0")}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-foreground">৳ {Number(rule.price).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Facilities */}
        {turf.facilities.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="size-3.5 text-emerald-600 shrink-0" />
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Facilities</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {turf.facilities.map(({ facility }) => (
                <span key={facility.id} className="px-3 py-1.5 rounded-lg border border-border/50 text-xs font-medium text-foreground transition-all hover:border-primary/50">
                  {facility.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sidebar */}
      <aside className="space-y-3">
        {/* Payment method */}
        {turf.allowAdvancePayment && turf.paymentPhoneNumbers.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <Phone className="size-3.5 text-primary shrink-0" />
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Payment method</p>
            </div>
            <div className="space-y-1.5">
              {turf.paymentPhoneNumbers.map((row) => {
                const iconPath = row.method === "BKASH" ? "/marchent-icon/bKash.svg" : row.method === "NAGAD" ? "/marchent-icon/nagad.svg" : "/marchent-icon/rocket.svg";
                return (
                  <div key={row.id} className="flex items-center justify-between py-1.5 px-3 rounded-lg border border-border/50">
                    <div className="flex items-center gap-2.5">
                      <img src={iconPath} alt={row.method} className="h-6 w-14 shrink-0 rounded-sm bg-white" />
                      <div className="flex flex-col leading-tight">
                        <span className="text-[10px] font-medium text-foreground">{row.method.toLowerCase()}</span>
                        <span className="text-[9px] text-muted-foreground">
                          ৳ {Number(turf.advancePaymentAmount ?? 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs font-bold text-foreground">{row.number}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Settings */}
        <Card className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <Edit3 className="size-4" />
              </div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Settings</p>
            </div>
            <Button variant="outline" size="sm" className="w-full h-9 gap-2 text-xs" onClick={() => router.push(`/admin/dashboard/turfs/${params.turfId}/edit`)}>
              Edit turf details
              <ChevronRight className="size-3.5" />
            </Button>
          </CardContent>
        </Card>
      </aside>
    </div>
  </section>;
}
