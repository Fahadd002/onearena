"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { httpClient } from "@/lib/axios/httpClient";
import { API_ENDPOINTS } from "@/lib/api/config";

type ManagerOverview = { assignedTurfs: Array<{ id: string; name: string; address?: string; category?: { name: string }; permissions: Array<{ permission: string }> }>; activeBookings: number };
type Turf = { id: string; name: string; address: string; category: { name: string }; permissions: Array<{ permission: string }> };

export default function ManagerTurfsPage() {
  const { data: overview, isLoading } = useQuery({
    queryKey: ["manager-overview"],
    queryFn: async () => (await httpClient.get<ManagerOverview>(`${API_ENDPOINTS.marketplace.managerDashboard}`)).data,
  });
  const turfs: Turf[] = overview?.assignedTurfs?.map((t) => ({ id: t.id, name: t.name, address: t.address || '', category: { name: t.category?.name || '' }, permissions: t.permissions })) ?? [];

  return (
    <section className="dashboard-section">
      <p className="dashboard-meta">Manager area</p>
      <h1 className="dashboard-title">Assigned turfs</h1>
      <p className="mt-3 text-muted-foreground">Turfs you have been granted access to manage.</p>
      {isLoading ? <p className="dashboard-empty mt-8">Loading turfs...</p> : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {turfs.map((turf) => (
            <Card key={turf.id} className="dashboard-panel">
              <CardHeader>
                <CardTitle>{turf.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{turf.category.name} · {turf.address}</p>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {turf.permissions.map((p) => <span key={p.permission} className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">{p.permission}</span>)}
                </div>
              </CardContent>
            </Card>
          ))}
          {turfs.length === 0 && <p className="dashboard-empty">No turfs assigned yet.</p>}
        </div>
      )}
    </section>
  );
}
