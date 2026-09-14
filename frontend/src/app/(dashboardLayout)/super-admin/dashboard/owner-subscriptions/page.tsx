"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { httpClient } from "@/lib/axios/httpClient";

type SubscriptionStatus = "TRIAL" | "ACTIVE" | "EXPIRING" | "EXPIRED" | "CANCELLED";
type Subscription = {
  id: string;
  status: SubscriptionStatus;
  endDate: string;
  autoRenew: boolean;
  billingCycle: string;
  user: { name: string; email: string };
  plan: { name: string; maxTurfs: number };
};

const statuses: SubscriptionStatus[] = ["TRIAL", "ACTIVE", "EXPIRING", "EXPIRED", "CANCELLED"];

export default function OwnerSubscriptionsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<SubscriptionStatus | "">("");
  const [drafts, setDrafts] = useState<Record<string, { endDate: string; autoRenew: boolean; status: SubscriptionStatus }>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["admin-owner-subscriptions", search, status],
    queryFn: async () => {
      const response = await httpClient.get<Subscription[]>("/subscriptions/admin", {
        params: { search: search || undefined, status: status || undefined },
      });
      return response.data ?? [];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: { id: string; values: Record<string, unknown> }) => {
      const response = await httpClient.patch<Subscription>(`/subscriptions/admin/${payload.id}`, payload.values);
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-owner-subscriptions"] });
      toast.success("Owner subscription updated");
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "Unable to update subscription"),
  });

  const getDraft = (subscription: Subscription) => drafts[subscription.id] ?? {
    endDate: subscription.endDate.slice(0, 10),
    autoRenew: subscription.autoRenew,
    status: subscription.status,
  };

  return (
    <section className="dashboard-section space-y-4">
      <div>
        <h1 className="dashboard-title">Owner Subscriptions</h1>
        <p className="text-sm text-muted-foreground">Review payment lifecycle state, entitlement dates, and renewal settings.</p>
      </div>

      <div className="flex flex-wrap gap-3 rounded-xl border bg-card p-4">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search owner name or email" />
        </div>
        <select className="h-10 rounded-md border bg-background px-3 text-sm" value={status} onChange={(event) => setStatus(event.target.value as SubscriptionStatus | "")}>
          <option value="">All statuses</option>
          {statuses.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Owner</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Cycle</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">End date</th>
              <th className="px-4 py-3">Auto-renew</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td className="px-4 py-8 text-center text-muted-foreground" colSpan={7}>Loading subscriptions...</td></tr>}
            {!isLoading && !data?.length && <tr><td className="px-4 py-8 text-center text-muted-foreground" colSpan={7}>No owner subscriptions found.</td></tr>}
            {data?.map((subscription) => {
              const draft = getDraft(subscription);
              return (
                <tr key={subscription.id} className="border-b last:border-0">
                  <td className="px-4 py-3"><div className="font-medium">{subscription.user.name}</div><div className="text-xs text-muted-foreground">{subscription.user.email}</div></td>
                  <td className="px-4 py-3">{subscription.plan.name}<div className="text-xs text-muted-foreground">{subscription.plan.maxTurfs} turf(s)</div></td>
                  <td className="px-4 py-3">{subscription.billingCycle}</td>
                  <td className="px-4 py-3"><select className="h-8 rounded border bg-background px-2 text-xs" value={draft.status} onChange={(event) => setDrafts((current) => ({ ...current, [subscription.id]: { ...draft, status: event.target.value as SubscriptionStatus } }))}>{statuses.map((item) => <option key={item} value={item}>{item}</option>)}</select></td>
                  <td className="px-4 py-3"><Input className="h-8 w-36 text-xs" type="date" value={draft.endDate} onChange={(event) => setDrafts((current) => ({ ...current, [subscription.id]: { ...draft, endDate: event.target.value } }))} /></td>
                  <td className="px-4 py-3"><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={draft.autoRenew} onChange={(event) => setDrafts((current) => ({ ...current, [subscription.id]: { ...draft, autoRenew: event.target.checked } }))} /> Enabled</label></td>
                  <td className="px-4 py-3 text-right"><Button size="sm" variant="outline" disabled={updateMutation.isPending} onClick={() => updateMutation.mutate({ id: subscription.id, values: draft })}><Save className="mr-1.5 size-4" /> Save</Button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
