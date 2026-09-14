"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { httpClient } from "@/lib/axios/httpClient";
import { API_ENDPOINTS } from "@/lib/api/config";
import { toast } from "sonner";

type Refund = { id: string; amount: string | number; status: string; createdAt: string; booking: { bookingNumber: string; turf: { name: string; ownerId: string } } };

export default function AdminRefundsPage() {
  const queryClient = useQueryClient();
  const { data: refunds = [], isLoading } = useQuery({
    queryKey: ["admin-refunds"],
    queryFn: async () => (await httpClient.get<Refund[]>(`${API_ENDPOINTS.marketplace.refunds}`)).data ?? [],
  });
  const approve = useMutation({
    mutationFn: (id: string) => httpClient.post(`${API_ENDPOINTS.marketplace.refunds}/${id}/approve`, {}),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["admin-refunds"] }); toast.success("Refund approved"); },
    onError: () => toast.error("Could not approve refund"),
  });
  const reject = useMutation({
    mutationFn: (id: string) => httpClient.post(`${API_ENDPOINTS.marketplace.refunds}/${id}/reject`, {}),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["admin-refunds"] }); toast.success("Refund rejected"); },
    onError: () => toast.error("Could not reject refund"),
  });
  const process = useMutation({
    mutationFn: (id: string) => httpClient.post(`${API_ENDPOINTS.marketplace.refunds}/${id}/process`, {}),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["admin-refunds"] }); toast.success("Refund processed"); },
    onError: () => toast.error("Could not process refund"),
  });

  return (
    <section className="dashboard-section">
      <p className="dashboard-meta">Owner area</p>
      <h1 className="dashboard-title">Refunds</h1>
      <p className="mt-3 text-muted-foreground">Review and process refund requests for your turfs.</p>
      {isLoading ? <p className="dashboard-empty mt-8">Loading refunds...</p> : (
        <div className="mt-8 space-y-4">
          {refunds.map((refund) => (
            <Card key={refund.id} className="dashboard-panel">
              <CardHeader>
                <CardTitle>{refund.booking.turf.name}</CardTitle>
                 <p className="text-sm text-muted-foreground">{refund.booking.bookingNumber} · {refund.status}</p>
              </CardHeader>
              <CardContent>
                <p className="font-medium">৳ {Number(refund.amount).toLocaleString()}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {refund.status === "REQUESTED" && <Button size="sm" onClick={() => approve.mutate(refund.id)} disabled={approve.isPending}>Approve</Button>}
                  {refund.status === "REQUESTED" && <Button size="sm" variant="outline" onClick={() => reject.mutate(refund.id)} disabled={reject.isPending}>Reject</Button>}
                  {refund.status === "APPROVED" && <Button size="sm" onClick={() => process.mutate(refund.id)} disabled={process.isPending}>Mark processed</Button>}
                </div>
              </CardContent>
            </Card>
          ))}
          {refunds.length === 0 && <p className="dashboard-empty">No refunds found.</p>}
        </div>
      )}
    </section>
  );
}
