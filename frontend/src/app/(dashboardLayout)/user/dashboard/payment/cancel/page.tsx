"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { API_BASE_URL, API_ENDPOINTS } from "@/lib/api/config";

export default function PaymentCancelPage() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("bookingId");

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Card>
        <CardHeader>
          <CardTitle>Payment Cancelled</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">Your payment was cancelled. The booking will expire if not completed within the time limit.</p>
          {bookingId && <p className="text-sm text-muted-foreground">Booking ID: {bookingId}</p>}
          <Button onClick={() => window.location.assign("/user/dashboard/bookings")}>View Bookings</Button>
        </CardContent>
      </Card>
    </main>
  );
}
