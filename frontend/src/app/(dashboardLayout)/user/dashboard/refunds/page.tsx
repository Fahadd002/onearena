"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { httpClient } from "@/lib/axios/httpClient";
import { API_ENDPOINTS } from "@/lib/api/config";
import { toast } from "sonner";
import { useState } from "react";

type Refund = { id: string; amount: string | number; reason?: string | null; status: string; createdAt: string; booking: { bookingNumber: string; turf: { name: string } } };

export default function UserRefundsPage() {
  const queryClient = useQueryClient();
  const { data: refunds = [], isLoading } = useQuery({
    queryKey: ["user-refunds"],
    queryFn: async () => (await httpClient.get<Refund[]>(`${API_ENDPOINTS.marketplace.refunds}`)).data ?? [],
  });
  const [bookingId, setBookingId] = useState("");
  const [paymentId, setPaymentId] = useState("");
  const [reason, setReason] = useState("");
  const requestRefund = useMutation({
    mutationFn: () => httpClient.post(`${API_ENDPOINTS.marketplace.bookings}/${bookingId}/refunds`, { paymentId, reason }),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["user-refunds"] }); setBookingId(""); setPaymentId(""); setReason(""); toast.success("Refund requested"); },
    onError: () => toast.error("Could not request refund"),
  });

  return (
    <section className="dashboard-section">
      <p className="dashboard-meta">Your activity</p>
      <h1 className="dashboard-title">Refunds</h1>
      <p className="mt-3 text-muted-foreground">Request and track refunds for your bookings.</p>
      <Card className="dashboard-panel mt-6">
        <CardHeader><CardTitle>Request refund</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
          <input className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" placeholder="Booking ID" value={bookingId} onChange={(e) => setBookingId(e.target.value)} />
          <input className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" placeholder="Payment ID" value={paymentId} onChange={(e) => setPaymentId(e.target.value)} />
          <Textarea placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
          <Button onClick={() => requestRefund.mutate()} disabled={!bookingId.trim() || !paymentId.trim() || requestRefund.isPending}>Request</Button>
        </CardContent>
      </Card>
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
                <p className="text-xs text-muted-foreground">{refund.reason || "No reason provided"} · {new Date(refund.createdAt).toLocaleDateString()}</p>
              </CardContent>
            </Card>
          ))}
          {refunds.length === 0 && <p className="dashboard-empty">No refunds found.</p>}
        </div>
      )}
    </section>
  );
}
