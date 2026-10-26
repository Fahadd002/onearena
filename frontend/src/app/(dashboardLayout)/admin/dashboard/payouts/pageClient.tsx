"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { httpClient } from "@/lib/axios/httpClient";
import { API_ENDPOINTS } from "@/lib/api/config";
import { toast } from "sonner";

type Payout = { id: string; amount: string | number; status: string; createdAt: string; owner?: { name: string; email: string } | null };

export default function AdminPayoutsPage() {
  const queryClient = useQueryClient();
  const { data: payouts = [], isLoading } = useQuery({
    queryKey: ["admin-payouts"],
    queryFn: async () => (await httpClient.get<Payout[]>(`${API_ENDPOINTS.marketplace.payouts}`)).data ?? [],
  });
  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => httpClient.patch(`${API_ENDPOINTS.marketplace.payouts}/${id}/status`, { status }),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["admin-payouts"] }); toast.success("Payout status updated"); },
    onError: () => toast.error("Could not update payout"),
  });

  return (
    <section className="dashboard-section">
      <p className="dashboard-meta">Owner area</p>
      <h1 className="dashboard-title">Payouts</h1>
      <p className="mt-3 text-muted-foreground">Track owner payouts and settlement status.</p>
      {isLoading ? <p className="dashboard-empty mt-8">Loading payouts...</p> : (
        <div className="mt-8 space-y-4">
          {payouts.map((payout) => (
            <Card key={payout.id} className="dashboard-panel">
              <CardHeader>
                <CardTitle>{payout.owner?.name || "Owner"}</CardTitle>
                <p className="text-sm text-muted-foreground">{payout.owner?.email} · {payout.status}</p>
              </CardHeader>
              <CardContent>
                <p className="font-medium">৳ {Number(payout.amount).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{new Date(payout.createdAt).toLocaleDateString()}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {payout.status === "PENDING" && <Button size="sm" onClick={() => updateStatus.mutate({ id: payout.id, status: "PROCESSING" })} disabled={updateStatus.isPending}>Start processing</Button>}
                  {payout.status === "PROCESSING" && <Button size="sm" onClick={() => updateStatus.mutate({ id: payout.id, status: "PAID" })} disabled={updateStatus.isPending}>Mark paid</Button>}
                </div>
              </CardContent>
            </Card>
          ))}
          {payouts.length === 0 && <p className="dashboard-empty">No payouts found.</p>}
        </div>
      )}
    </section>
  );
}
