"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { httpClient } from "@/lib/axios/httpClient";
import { API_ENDPOINTS } from "@/lib/api/config";

type Manager = { id: string; manager: { id: string; name: string; email: string }; permissions: Array<{ permission: string }> };
type ManagerOption = { id: string; name: string; email: string };
type TurfOption = { id: string; name: string };

const ALL_PERMISSIONS = [
  "TURF_VIEW", "TURF_CREATE", "TURF_UPDATE", "TURF_DELETE",
  "SLOT_VIEW", "SLOT_MANAGE", "BOOKING_VIEW", "BOOKING_MANAGE",
  "FACILITY_VIEW", "FACILITY_MANAGE", "PACKAGE_VIEW", "PACKAGE_MANAGE",
  "REVIEW_VIEW", "REVIEW_MANAGE",
];

export default function Page() {
  const [managers, setManagers] = useState<Manager[]>([]);
  const [managerOptions, setManagerOptions] = useState<ManagerOption[]>([]);
  const [turfs, setTurfs] = useState<TurfOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [managerId, setManagerId] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [turfId, setTurfId] = useState("");

  useEffect(() => {
    let cancelled = false;
    const loadManagers = async () => {
      setLoading(true);
      try {
        const [turfResult, managerResult] = await Promise.all([
          httpClient.get<TurfOption[]>(API_ENDPOINTS.marketplace.ownerTurfs),
          httpClient.get<ManagerOption[]>(API_ENDPOINTS.marketplace.managers),
        ]);
        const ownerTurfs = turfResult.data ?? [];
        if (!cancelled) {
          setTurfs(ownerTurfs);
          setManagerOptions(managerResult.data ?? []);
          if (ownerTurfs.length > 0 && !turfId) setTurfId(ownerTurfs[0].id);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadManagers();
    return () => { cancelled = true; };
  }, [turfId]);

  useEffect(() => {
    if (!turfId) return;
    httpClient.get<Manager[]>(`/owner/turfs/${turfId}/managers`)
      .then((result) => setManagers(result.data ?? []))
      .catch(() => setManagers([]));
  }, [turfId]);

  const saveManager = async () => {
    if (!turfId || !managerId) return;
    setSaving(true);
    try {
      const result = await httpClient.post<Manager>(`/owner/turfs/${turfId}/managers`, { managerId, permissions: selectedPermissions });
      setManagers((prev) => {
        const existing = prev.findIndex((m) => m.manager.id === managerId);
        if (existing >= 0) {
          const next = [...prev];
          next[existing] = result.data;
          return next;
        }
        return [...prev, result.data];
      });
      setManagerId("");
      setSelectedPermissions([]);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="dashboard-section">
      <div>
        <p className="dashboard-meta">Management</p>
        <h1 className="dashboard-title">Managers</h1>
        <p className="mt-3 text-muted-foreground">Assign managers to your turfs and set permissions.</p>
      </div>
      <Card className="dashboard-panel mt-8">
        <CardHeader><CardTitle>Assign Manager</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><label className="text-sm text-muted-foreground">Manager</label><select className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={managerId} onChange={(e) => setManagerId(e.target.value)}><option value="">Select manager</option>{managerOptions.map((manager) => <option key={manager.id} value={manager.id}>{manager.name} · {manager.email}</option>)}</select></div>
            <div className="space-y-2"><label className="text-sm text-muted-foreground">Turf</label>
              <select className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={turfId} onChange={(e) => setTurfId(e.target.value)}>
                <option value="">Select turf</option>
                {turfs.map((turf) => <option key={turf.id} value={turf.id}>{turf.name}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium mb-2">Permissions</p>
            <div className="flex flex-wrap gap-2">
              {ALL_PERMISSIONS.map((perm) => (
                <label key={perm} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs">
                  <input type="checkbox" checked={selectedPermissions.includes(perm)} onChange={(e) => { setSelectedPermissions((prev) => e.target.checked ? [...prev, perm] : prev.filter((p) => p !== perm)); }} />
                  {perm}
                </label>
              ))}
            </div>
          </div>
          <div className="mt-4"><Button onClick={saveManager} disabled={saving}>{saving ? "Saving..." : "Assign Manager"}</Button></div>
        </CardContent>
      </Card>
      <div className="mt-8 space-y-4">
        {managers.map((manager) => (
          <Card key={`${manager.id}-${manager.manager.id}`} className="dashboard-panel">
            <CardHeader>
              <CardTitle>{manager.manager.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{manager.manager.email}</p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {manager.permissions.map(({ permission }) => (
                  <span key={permission} className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">{permission}</span>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
        {managers.length === 0 && <p className="dashboard-empty">No managers assigned yet.</p>}
      </div>
    </section>
  );
}
