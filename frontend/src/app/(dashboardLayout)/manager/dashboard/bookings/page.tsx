"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { httpClient } from "@/lib/axios/httpClient";
import { API_ENDPOINTS } from "@/lib/api/config";

type Booking = { id: string; bookingNumber: string; bookingDate: string; startMinute: number; endMinute: number; totalAmount: string | number; status: string; paymentStatus: string; turf: { name: string } };

export default function ManagerBookingsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["manager-bookings"],
    queryFn: async () => (await httpClient.get<{ data: Booking[]; meta: { page: number; limit: number; total: number; totalPages: number } }>(API_ENDPOINTS.marketplace.bookings)).data,
  });
  const bookings = data?.data ?? [];

  return (
    <section className="dashboard-section">
      <div>
        <p className="dashboard-meta">Manager area</p>
        <h1 className="dashboard-title">Bookings</h1>
        <p className="mt-3 text-muted-foreground">Assigned turf bookings.</p>
      </div>
      {isLoading ? <p className="dashboard-empty mt-8">Loading bookings...</p> : (
        <div className="mt-8 space-y-4">
          {bookings.map((booking) => (
            <Card key={booking.id} className="dashboard-panel">
              <CardHeader>
                <CardTitle>{booking.turf.name}</CardTitle>
                 <p className="text-sm text-muted-foreground">{booking.bookingNumber} · {booking.status}</p>
              </CardHeader>
              <CardContent>
                <p>{new Date(booking.bookingDate).toLocaleDateString()} · {booking.startMinute} - {booking.endMinute}</p>
                <p className="mt-2 font-medium">৳ {Number(booking.totalAmount).toLocaleString()} · {booking.paymentStatus}</p>
              </CardContent>
            </Card>
          ))}
          {bookings.length === 0 && <p className="dashboard-empty">No bookings yet.</p>}
        </div>
      )}
    </section>
  );
}
