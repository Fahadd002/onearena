"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { httpClient } from "@/lib/axios/httpClient";
import { API_ENDPOINTS } from "@/lib/api/config";

type Invoice = { id: string; invoiceNumber: string; subtotal: string | number; totalAmount: string | number; paidAmount: string | number; remainingAmount?: string | number; status: string; issuedAt: string; booking: { bookingNumber: string; turf: { name: string } } };

export default function AdminInvoicesPage() {
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["admin-invoices"],
    queryFn: async () => {
      const result = await httpClient.get<Invoice[]>(API_ENDPOINTS.marketplace.invoices);
      return result.data ?? [];
    },
  });

  return (
    <section className="dashboard-section">
      <div>
        <p className="dashboard-meta">Management</p>
        <h1 className="dashboard-title">Invoices</h1>
        <p className="mt-3 text-muted-foreground">Invoice history for your turfs.</p>
      </div>
      {isLoading ? <p className="dashboard-empty mt-8">Loading invoices...</p> : (
        <div className="mt-8 space-y-4">
          {invoices.map((invoice) => (
            <Card key={invoice.id} className="dashboard-panel">
              <CardHeader>
                <CardTitle>{invoice.invoiceNumber}</CardTitle>
                <p className="text-sm text-muted-foreground">{invoice.booking.turf.name} · {invoice.booking.bookingNumber}</p>
              </CardHeader>
               <CardContent>
                 <div className="dashboard-grid">
                   <div><p className="text-xs text-muted-foreground">Subtotal</p><p className="font-medium">৳ {Number(invoice.subtotal).toLocaleString()}</p></div>
                   <div><p className="text-xs text-muted-foreground">Total</p><p className="font-medium">৳ {Number(invoice.totalAmount).toLocaleString()}</p></div>
                   <div><p className="text-xs text-muted-foreground">Paid</p><p className="font-medium">৳ {Number(invoice.paidAmount).toLocaleString()}</p></div>
                   <div><p className="text-xs text-muted-foreground">Remaining</p><p className="font-medium">৳ {Number(invoice.remainingAmount ?? 0).toLocaleString()}</p></div>
                 </div>
                 <p className="mt-3 text-xs text-muted-foreground">Status: {invoice.status} · Issued: {new Date(invoice.issuedAt).toLocaleDateString()}</p>
               </CardContent>
            </Card>
          ))}
          {invoices.length === 0 && <p className="dashboard-empty">No invoices found.</p>}
        </div>
      )}
    </section>
  );
}
