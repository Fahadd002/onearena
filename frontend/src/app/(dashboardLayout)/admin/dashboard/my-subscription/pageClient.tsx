"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock3, CreditCard, Loader2, Receipt, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ApiResponse } from "@/types/api.type";
import {
  getCurrentSubscriptionClient,
  initiateSubscriptionPaymentClient
} from "../../../(commonProtectedLayout)/owner-profile/_client-api";
import { getSubscriptionHistoryClient } from "./_client-api";

type BillingPeriod = "MONTHLY" | "QUARTERLY" | "HALF_YEARLY" | "YEARLY";
type PaymentMethod = "BKASH" | "ROKET" | "NAGAD" | "CASH" | "OTHERS";
type SubscriptionStatus = "TRIAL" | "ACTIVE" | "EXPIRED" | "EXPIRING" | "CANCELLED";
type SubscriptionAction =
  "TRIAL_STARTED" | "SUBSCRIBED" | "UPGRADED" | "RENEWED" | "CANCELLED" | "EXPIRED";

interface Price {
  billingPeriod?: BillingPeriod;
  amount?: number;
  price?: number;
}
interface Plan {
  id: string;
  name: string;
  tierLevel: number;
  maxTurfs: number;
  features: string[];
  prices: Price[];
}
interface Payment {
  id: string;
  amount?: number;
  status?: string;
  paymentMethod?: PaymentMethod;
  providerTransactionId?: string | null;
}
interface SubscriptionInvoice {
  id: string;
  invoiceNumber: string;
  totalAmount: number;
  paidAmount: number;
  status: "UNPAID" | "PAID" | "PARTIALLY_PAID";
  payments?: Payment[];
}
interface SubscriptionLog {
  id: string;
  action: SubscriptionAction;
  status: SubscriptionStatus;
  startDate: string;
  endDate: string;
  createdAt: string;
  invoice?: SubscriptionInvoice | null;
}
interface CurrentSubscription {
  id: string;
  plan: Plan;
  status: SubscriptionStatus;
  startDate: string;
  endDate: string;
  trialStart: string;
  trialEnd: string;
  isTrialUsed: boolean;
}

const paymentMethods: { value: PaymentMethod; label: string }[] = [
  { value: "BKASH", label: "bKash" },
  { value: "NAGAD", label: "Nagad" },
  { value: "ROKET", label: "Rocket" },
  { value: "CASH", label: "Cash" },
  { value: "OTHERS", label: "Others" },
];
const statusVariant: Record<
  SubscriptionStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  TRIAL: "secondary",
  ACTIVE: "default",
  EXPIRING: "outline",
  EXPIRED: "destructive",
  CANCELLED: "destructive",
};
const actionLabel: Record<SubscriptionAction, string> = {
  TRIAL_STARTED: "Trial started",
  SUBSCRIBED: "Subscribed",
  UPGRADED: "Plan upgraded",
  RENEWED: "Subscription renewed",
  CANCELLED: "Subscription cancelled",
  EXPIRED: "Subscription expired",
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
function formatAmount(value?: number | null) {
  return new Intl.NumberFormat("en-BD", { style: "currency", currency: "BDT" }).format(value ?? 0);
}
function daysRemaining(endDate?: string | null) {
  if (!endDate) return 0;
  return Math.max(0, Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000));
}
function unwrapData<T>(
  response: ApiResponse<unknown> | { success: boolean; message: string },
): T | null {
  if (!response.success) throw new Error(response.message);
  return (response as ApiResponse<unknown>).data as T | null;
}

export default function AdminMySubscriptionPage() {
  const queryClient = useQueryClient();
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("BKASH");
  const [providerTransactionId, setProviderTransactionId] = useState("");
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("MONTHLY");
  const subscriptionQuery = useQuery({
    queryKey: ["admin-current-subscription"],
    queryFn: async () => unwrapData<CurrentSubscription>(await getCurrentSubscriptionClient()),
  });
  const historyQuery = useQuery({
    queryKey: ["admin-subscription-history"],
    queryFn: async () => unwrapData<SubscriptionLog[]>(await getSubscriptionHistoryClient()) ?? [],
  });
  const subscription = subscriptionQuery.data;
  const history = (() => {
    const dateKey = (d: string) => {
      const date = new Date(d);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };
    const seen = new Map<string, SubscriptionLog>();
    for (const log of historyQuery.data ?? []) {
      const key = `${dateKey(log.startDate)}|${dateKey(log.endDate)}`;
      const existing = seen.get(key);
      if (!existing || (log.invoice && !existing.invoice)) {
        seen.set(key, log);
      }
    }
    return Array.from(seen.values()).sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    );
  })();
  const latestLog = history[0];
  const unpaidInvoice = latestLog?.invoice?.status !== "PAID" ? latestLog?.invoice : null;
  const hasAnyInvoice = history.some((log) => log.invoice);
  const isExpired = subscription?.status === "EXPIRED";
  const isFreeTrial = subscription?.plan?.tierLevel === 0;
  const needsPayment =
    subscription && !isFreeTrial && (unpaidInvoice || !hasAnyInvoice || isExpired);

  const paymentMutation = useMutation({
    mutationFn: async () => {
      if (!subscription) throw new Error("No active subscription found");
      if (paymentMethod !== "CASH" && !providerTransactionId.trim())
        throw new Error("Provider transaction ID is required");
      let invoiceId = unpaidInvoice?.id;
      if (!invoiceId) {
        const initiated = unwrapData<{ invoice: { id: string } }>(
          await initiateSubscriptionPaymentClient({
            planId: subscription.plan.id,
            billingPeriod,
            paymentMethod,
            ...(providerTransactionId.trim() && {
              providerTransactionId: providerTransactionId.trim(),
            }),
          }),
        );
        invoiceId = initiated?.invoice.id;
      }
      if (!invoiceId) throw new Error("Could not create or find an invoice");
     
    },
    onSuccess: async (response) => {
      // if (!response.success) throw new Error(response.message);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-current-subscription"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-subscription-history"] }),
      ]);
      setPaymentOpen(false);
      setProviderTransactionId("");
      toast.success("Payment verified and subscription updated");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Payment could not be completed"),
  });
  const isLoading = subscriptionQuery.isLoading || historyQuery.isLoading;
  const error = subscriptionQuery.error ?? historyQuery.error;

  if (isLoading)
    return (
      <section className="dashboard-section flex min-h-[420px] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </section>
    );
  if (error)
    return (
      <section className="dashboard-section">
        <Card className="dashboard-panel">
          <CardContent className="py-12 text-center text-destructive">{error.message}</CardContent>
        </Card>
      </section>
    );

  return (
    <section className="dashboard-section space-y-6">
      <div>
        <p className="dashboard-meta">Account billing</p>
        <h1 className="dashboard-title">My subscription</h1>
        <p className="mt-3 text-muted-foreground">
          Review your plan, billing history, and outstanding payments.
        </p>
      </div>
      <Card className="dashboard-panel overflow-hidden">
        <CardHeader className="flex flex-col gap-4 border-b sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-5 text-primary" />
              Current subscription
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Your active turf capacity and subscription dates.
            </p>
          </div>
          {subscription && (
            <Badge variant={statusVariant[subscription.status]}>{subscription.status}</Badge>
          )}
        </CardHeader>
        <CardContent className="grid gap-6 pt-6 sm:grid-cols-2 lg:grid-cols-4">
          {subscription ? (
            <>
              <div>
                <p className="text-sm text-muted-foreground">Plan</p>
                <p className="mt-1 text-xl font-semibold">{subscription.plan.name}</p>
                <p className="text-sm text-muted-foreground">Tier {subscription.plan.tierLevel}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Turf limit</p>
                <p className="mt-1 text-xl font-semibold">{subscription.plan.maxTurfs}</p>
                <p className="text-sm text-muted-foreground">maximum turfs</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ends</p>
                <p className="mt-1 text-xl font-semibold">{formatDate(subscription.endDate)}</p>
                <p className="text-sm text-muted-foreground">
                  {daysRemaining(subscription.endDate)} days remaining
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Trial period</p>
                <p className="mt-1 text-xl font-semibold">{isFreeTrial ? "Free trial" : "-"}</p>
                <p className="text-sm text-muted-foreground">
                  {subscription.trialEnd
                    ? `Ends ${formatDate(subscription.trialEnd)}`
                    : "No trial dates"}
                </p>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground">No subscription found.</p>
          )}
        </CardContent>
        {subscription && subscription.plan.features && subscription.plan.features.length > 0 && (
          <div className="border-t px-6 py-4">
            <p className="text-sm font-medium text-muted-foreground mb-2">Plan features</p>
            <div className="flex flex-wrap gap-2">
              {subscription.plan.features.map((feature) => (
                <span
                  key={feature}
                  className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                >
                  {feature}
                </span>
              ))}
            </div>
          </div>
        )}
      </Card>
      {needsPayment && (
        <Card
          className={
            isExpired
              ? "border-green-300 bg-green-50/60 dark:bg-green-950/20"
              : "border-amber-300 bg-amber-50/60 dark:bg-amber-950/20"
          }
        >
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              {isExpired ? (
                <RefreshCw className="mt-0.5 size-5 text-green-700" />
              ) : (
                <CreditCard className="mt-0.5 size-5 text-amber-700" />
              )}
              <div>
                <p className="font-semibold">
                  {isExpired
                    ? "Subscription expired"
                    : unpaidInvoice
                      ? "Payment required"
                      : "Complete your subscription"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isExpired
                    ? "Your subscription has expired. Renew to continue."
                    : unpaidInvoice
                      ? `Invoice ${unpaidInvoice.invoiceNumber} has an outstanding balance of ${formatAmount(unpaidInvoice.totalAmount - unpaidInvoice.paidAmount)}.`
                      : "You haven't completed your subscription yet. Pay to activate."}
                </p>
              </div>
            </div>
            <Button onClick={() => setPaymentOpen(true)}>
              {isExpired ? (
                <>
                  <RefreshCw className="mr-2 size-4" />
                  Renew now
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 size-4" />
                  {unpaidInvoice ? "Pay now" : "Subscribe"}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
      <Card className="dashboard-panel">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock3 className="size-5 text-primary" />
            Subscription history
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No subscription activity yet.</p>
          ) : (
            <div className="space-y-0">
              {history.map((log, index) => (
                <div className="relative flex gap-4 pb-7 last:pb-0" key={log.id}>
                  {index < history.length - 1 && (
                    <div className="absolute left-[9px] top-6 h-full w-px bg-border" />
                  )}
                  <div className="relative mt-1 flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-background">
                    <span className="size-2 rounded-full bg-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold">{actionLabel[log.action]}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(log.createdAt)} · {formatDate(log.startDate)} to{" "}
                          {formatDate(log.endDate)}
                        </p>
                      </div>
                      <Badge variant={statusVariant[log.status]}>{log.status}</Badge>
                    </div>
                    {log.invoice && (
                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
                        <Receipt className="size-4 text-muted-foreground" />
                        <a
                          className="font-medium text-primary hover:underline"
                          href={`/admin/dashboard/invoices?invoiceId=${log.invoice.id}`}
                        >
                          {log.invoice.invoiceNumber}
                        </a>
                        <span>{formatAmount(log.invoice.totalAmount)}</span>
                        <span className="text-muted-foreground">
                          {log.invoice.status.replace("_", " ")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isExpired
                ? "Renew subscription"
                : unpaidInvoice
                  ? "Complete payment"
                  : "Subscribe now"}
            </DialogTitle>
            <DialogDescription>
              {isExpired
                ? "Renew your subscription to continue using the platform."
                : unpaidInvoice
                  ? "Submit your payment details to settle the outstanding invoice."
                  : "Choose a billing period and payment method to activate your subscription."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div className="rounded-md bg-muted/40 p-4">
              <p className="text-sm text-muted-foreground">Amount due</p>
              <p className="mt-1 text-2xl font-semibold">
                {formatAmount(
                  unpaidInvoice?.totalAmount
                    ? unpaidInvoice.totalAmount - unpaidInvoice.paidAmount
                    : subscription?.plan?.prices?.[0]?.price ??
                      subscription?.plan?.prices?.[0]?.amount ?? 0,
                )}
              </p>
            </div>
            {!unpaidInvoice && (
              <label className="grid gap-2 text-sm font-medium">
                Billing period
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 font-normal"
                  value={billingPeriod}
                  onChange={(event) =>
                    setBillingPeriod(event.target.value as BillingPeriod)
                  }
                >
                  <option value="MONTHLY">Monthly</option>
                  <option value="QUARTERLY">Quarterly</option>
                  <option value="HALF_YEARLY">Half yearly</option>
                  <option value="YEARLY">Yearly</option>
                </select>
              </label>
            )}
            <fieldset className="grid gap-3">
              <legend className="text-sm font-medium">Payment method</legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {paymentMethods.map((method) => (
                  <label
                    className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                    key={method.value}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method.value}
                      checked={paymentMethod === method.value}
                      onChange={() => setPaymentMethod(method.value)}
                    />
                    {method.label}
                  </label>
                ))}
              </div>
            </fieldset>
            {paymentMethod !== "CASH" && (
              <label className="grid gap-2 text-sm font-medium">
                Provider transaction ID
                <Input
                  value={providerTransactionId}
                  onChange={(event) => setProviderTransactionId(event.target.value)}
                  placeholder="Enter the transaction reference"
                />
              </label>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => paymentMutation.mutate()}
              disabled={
                paymentMutation.isPending ||
                (paymentMethod !== "CASH" && !providerTransactionId.trim())
              }
            >
              {paymentMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              <CheckCircle2 className="mr-2 size-4" />
              {isExpired ? "Renew" : unpaidInvoice ? "Submit payment" : "Subscribe"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
