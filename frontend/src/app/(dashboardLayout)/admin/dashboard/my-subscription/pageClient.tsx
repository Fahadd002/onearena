"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Loader2,
  X,
  Check,
  ArrowRight,
  BarChart3,
  UserPlus,
  Sparkles,
  Copy,
  Phone,
  Hash,
  Clock3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/premium/Badge";
import { DataTable } from "@/components/premium/DataTable";
import { ApiResponse } from "@/types/api.type";
import { toast } from "sonner";
import { formatDate as formatDisplayDate } from "@/lib/time-utils";
import { validateBangladeshiMobile } from "@/lib/validators";
import {
  getCurrentSubscriptionClient,
  getSubscriptionPlansClient,
} from "../../../(commonProtectedLayout)/owner-profile/_client-api";
import { getSubscriptionHistoryClient, updateSubscriptionClient } from "./_client-api";
import {
  SubscriptionPlan,
  OwnerSubscription,
} from "../../../(commonProtectedLayout)/owner-profile/_types";

type PaymentMethod = "BKASH" | "NAGAD" | "ROKET" | "CASH";
type BillingPeriod = "MONTHLY" | "QUARTERLY" | "HALF_YEARLY" | "YEARLY";

const PAYMENT_NUMBERS: Record<Exclude<PaymentMethod, "CASH">, string> = {
  BKASH: "01700000000",
  NAGAD: "01700000000",
  ROKET: "01700000000",
};

interface SubscriptionLog {
  id: string;
  action: string;
  status: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  invoice?: {
    id: string;
    invoiceNumber: string;
    totalAmount: number;
    paidAmount: number;
    status: string;
  } | null;
}

const paymentOptions = [
  { id: "BKASH", name: "bKash", icon: "/marchent-icon/bKash.svg" },
  { id: "NAGAD", name: "Nagad", icon: "/marchent-icon/nagad.svg" },
  { id: "ROKET", name: "Rocket", icon: "/marchent-icon/rocket.svg" },
  { id: "CASH", name: "Pay Later", icon: "/marchent-icon/pay-later.svg" },
] as const;

const planThemes = [
  {
    textClass: "text-[#6824d6]",
    gradientClass: "from-violet-50 via-white to-purple-50",
    borderClass: "border-[#6824d6]",
    badgeBg: "bg-[#6824d6]/10 text-[#6824d6]",
    icon: BarChart3,
  },
  {
    textClass: "text-[#fe3258]",
    gradientClass: "from-rose-50 via-white to-pink-50",
    borderClass: "border-[#fe3258]",
    badgeBg: "bg-[#fe3258]/10 text-[#fe3258]",
    icon: UserPlus,
  },
  {
    textClass: "text-[#4ccda7]",
    gradientClass: "from-emerald-50 via-white to-teal-50",
    borderClass: "border-[#4ccda7]",
    badgeBg: "bg-[#4ccda7]/10 text-[#0d8261]",
    icon: Sparkles,
  },
];

function formatDate(dateString: string) {
  return formatDisplayDate(dateString, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateShort(value?: string | null) {
  const formattedDate = formatDisplayDate(value, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return formattedDate === "—" ? "-" : formattedDate;
}

function formatAmount(value?: number | null) {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
  }).format(value ?? 0);
}

function daysRemaining(endDate?: string | null) {
  if (!endDate) return 0;
  return Math.max(
    0,
    Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000)
  );
}

const statusVariant: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  ACTIVE: "default",
  EXPIRING: "outline",
  EXPIRED: "destructive",
  CANCELLED: "destructive",
  FREE_TRIAL: "secondary",
};

const periodLabels = {
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  HALF_YEARLY: "Half-Yearly",
  YEARLY: "Yearly",
};

export default function AdminMySubscriptionPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [drawerPlan, setDrawerPlan] = useState<SubscriptionPlan | null>(null);
  const [selectedPeriod, setSelectedPeriod] =
    useState<BillingPeriod>("MONTHLY");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("BKASH");
  const [providerTransactionId, setProviderTransactionId] = useState("");
  const [payerMobileNumber, setPayerMobileNumber] = useState("");
  const [showPaymentStep, setShowPaymentStep] = useState(false);
  const [mobileError, setMobileError] = useState<string | null>(null);

  const handlePayerMobileChange = (value: string) => {
    setPayerMobileNumber(value);
    const isMobileNumberRequired = paymentMethod !== "CASH";
    if (isMobileNumberRequired) {
      setMobileError(validateBangladeshiMobile(value));
    } else {
      setMobileError(null);
    }
  };

  const { data: subscriptionData, isLoading: subscriptionLoading } = useQuery({
    queryKey: ["admin-current-subscription"],
    queryFn: async () => {
      const res = await getCurrentSubscriptionClient();
      if (!res.success) throw new Error(res.message);
      return (res as ApiResponse<OwnerSubscription | null>).data ?? null;
    },
  });

  const { data: plansData, isLoading: plansLoading } = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: async () => {
      const res = await getSubscriptionPlansClient();
      if (!res.success) throw new Error(res.message);
      return (res as ApiResponse<SubscriptionPlan[]>).data ?? [];
    },
    staleTime: 60000,
  });

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ["admin-subscription-history"],
    queryFn: async () => {
      const res = await getSubscriptionHistoryClient();
      if (!res.success) throw new Error(res.message);
      return (res as ApiResponse<SubscriptionLog[]>).data ?? [];
    },
  });

  useEffect(() => {
    if (!subscriptionLoading && !subscriptionData) {
      router.push("/admin/dashboard");
    }
  }, [subscriptionData, subscriptionLoading, router]);

  const isLoading = subscriptionLoading || plansLoading || historyLoading;

  const currentTier = subscriptionData?.plan?.tierLevel ?? 0;
  const currentEndTime = subscriptionData?.endDate
    ? new Date(subscriptionData.endDate).getTime()
    : 0;

  // Only one advance subscription allowed: a queued plan starting after current end
  const hasAdvanceSubscription = useMemo(() => {
    if (!subscriptionData || !historyData) return false;
    return historyData.some(
      (log) => new Date(log.startDate).getTime() > currentEndTime
    );
  }, [subscriptionData, historyData, currentEndTime]);

  // Upgrade only: higher tier than current
  const upgradePlans = useMemo(
    () =>
      (plansData || [])
        .filter((plan) => plan.active && plan.tierLevel > currentTier)
        .sort((a, b) => a.tierLevel - b.tierLevel),
    [plansData, currentTier]
  );

  const isCashPayment = paymentMethod === "CASH";
  const isTransactionIdRequired = !isCashPayment;
  const isMobileNumberRequired = paymentMethod !== "CASH";

  const getWalletName = (method: PaymentMethod) => {
    switch (method) {
      case "BKASH":
        return "bKash";
      case "NAGAD":
        return "Nagad";
      case "ROKET":
        return "Rocket";
      default:
        return "Pay Later";
    }
  };

  const handleCopyPaymentNumber = async (method: Exclude<PaymentMethod, "CASH">) => {
    try {
      await navigator.clipboard.writeText(PAYMENT_NUMBERS[method]);
      toast.success(`${getWalletName(method)} number copied to clipboard.`);
    } catch {
      toast.error("Could not copy the payment number. Please copy it manually.");
    }
  };

  const paymentMutation = useMutation({
    mutationFn: async (billingPeriod: BillingPeriod) => {
      if (!drawerPlan) throw new Error("Please select a plan");
      if (!subscriptionData) throw new Error("No subscription found");
      if (isTransactionIdRequired && !providerTransactionId.trim()) {
        throw new Error("Provider transaction ID is required");
      }
      if (isMobileNumberRequired && !payerMobileNumber.trim()) {
        throw new Error("Your payment mobile number is required");
      }
      const mobileErr = isMobileNumberRequired   ? validateBangladeshiMobile(payerMobileNumber) : null;
      if (mobileErr) {
        setMobileError(mobileErr);
        throw new Error(mobileErr);
      }

      const updated = await updateSubscriptionClient(subscriptionData.id, {
        period: billingPeriod,
        planId: drawerPlan.id,
        paymentMethod,
        ...(!isCashPayment &&
          providerTransactionId.trim() && {
          providerTransactionId: providerTransactionId.trim(),
        }),
        ...(isMobileNumberRequired &&
          payerMobileNumber.trim() && {
          payerMobileNumber: payerMobileNumber.trim(),
        }),
      });

      return updated;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["admin-current-subscription"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["admin-subscription-history"],
      });
      toast.success("Subscription updated successfully.");
      setProviderTransactionId("");
      setPayerMobileNumber("");
      setMobileError(null);
      setDrawerPlan(null);
    },
    onError: (error: Error) => toast.error(error.message || "Payment failed"),
  });

  const history = useMemo(() => {
    const dateKey = (d: string) => {
      const date = new Date(d);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(date.getDate()).padStart(2, "0")}`;
    };
    const seen = new Map<string, SubscriptionLog>();
    for (const log of historyData ?? []) {
      const key = `${dateKey(log.startDate)}|${dateKey(log.endDate)}`;
      const existing = seen.get(key);
      if (!existing || (log.invoice && !existing.invoice)) {
        seen.set(key, log);
      }
    }
    return Array.from(seen.values()).sort(
      (left, right) =>
        new Date(right.createdAt).getTime() -
        new Date(left.createdAt).getTime()
    );
  }, [historyData]);

  const disabled = hasAdvanceSubscription;

  const openDrawer = (plan: SubscriptionPlan) => {
    if (disabled) return;
    setDrawerPlan(plan);
    setSelectedPeriod(plan.prices[0]?.period || "MONTHLY");
    setShowPaymentStep(false);
    setProviderTransactionId("");
    setPayerMobileNumber("");
    setPaymentMethod("BKASH");
  };

  const closeDrawer = () => {
    setDrawerPlan(null);
    setProviderTransactionId("");
    setPayerMobileNumber("");
    setMobileError(null);
    setShowPaymentStep(false);
  };

  if (isLoading) {
    return (
      <section className="dashboard-section flex min-h-[420px] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </section>
    );
  }

  if (!subscriptionData) {
    return (
      <section className="dashboard-section flex min-h-[420px] items-center justify-center">
        <p className="text-muted-foreground">No subscription found.</p>
      </section>
    );
  }

  return (
    <section className="dashboard-section space-y-2 sm:space-y-3">
      <div className="flex items-center gap-1.5 sm:gap-2 justify-between">
        <div>
          <h1 className="text-base font-semibold">My Subscription</h1>
        </div>
      </div>

      {/* Advance subscription lock */}
      {disabled && (
        <Alert className="border-amber-500/30 bg-amber-500/10 rounded-xl border">
          <AlertCircle className="h-5 w-5 text-amber-600" />
          <AlertTitle className="text-amber-900 dark:text-amber-200 font-bold text-sm">
            Advance Subscription Scheduled
          </AlertTitle>
          <AlertDescription className="text-amber-800 dark:text-amber-300 text-xs mt-0.5">
            You already have an advance subscription queued after your current
            plan. No further changes can be made until it activates.
          </AlertDescription>
        </Alert>
      )}

      {/* Current Plan Card */}
      <Card className="surface-card overflow-hidden">
        <CardContent className="p-0">
          <div className="flex items-center justify-between min-w-max gap-6 sm:gap-8 p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <p className="font-bold text-slate-900 dark:text-white text-sm sm:text-base truncate">
                {subscriptionData.plan.name}
              </p>
              <span className="text-[10px] text-slate-600 dark:text-slate-400 ml-1">
                • {subscriptionData.plan.maxTurfs} Turf(s)
              </span>
            </div>
            <div className="flex items-center gap-6 sm:gap-8 shrink-0 whitespace-nowrap">
              <div className="text-center sm:text-left">
                <Badge
                  variant="secondary"
                  className="h-8 text-[10px] uppercase tracking-wider font-bold bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 border border-violet-200 dark:border-violet-800"
                >
                  {subscriptionData.status}
                </Badge>
              </div>
              <div className="text-center sm:text-left">
                <p className="text-slate-900 dark:text-slate-100 font-semibold text-xs sm:text-sm">
                  End date - {formatDate(subscriptionData.endDate)}
                </p>
              </div>
              <div className="text-center sm:text-left">
                <p className="text-violet-600 dark:text-violet-400 font-semibold text-xs sm:text-sm">
                  {daysRemaining(subscriptionData.endDate)} days remaining
                </p>
              </div>
              <Button
                onClick={() => openDrawer(subscriptionData.plan)}
                disabled={
                  disabled || subscriptionData.status === "EXPIRED"
                }
                variant="hero"
                size="sm"
                className="h-8 text-xs shadow-md shadow-primary/20 transition-transform hover:-translate-y-0.5 whitespace-nowrap"
              >
                {disabled
                  ? "Locked"
                  : subscriptionData.status === "EXPIRED"
                    ? "Renew"
                    : "Extend"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upgrade Plans */}
      <Card className="surface-card overflow-hidden">
        <CardContent className="p-0">
          <div className="space-y-3 sm:space-y-4 p-3 sm:p-4">
            <CardTitle className="flex items-center gap-2 text-sm mb-3 sm:mb-4">
              <ArrowRight className="size-4 text-primary" />
              Upgrade Plan
            </CardTitle>
            {plansLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-[20rem] w-full rounded-2xl" />
                ))}
              </div>
            ) : upgradePlans.length === 0 ? (
              <p className="text-center text-[11px] text-muted-foreground py-6">
                No upgrade plans available. You are on the highest tier.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {upgradePlans.map((plan, index) => {
                  const theme = planThemes[index % planThemes.length];
                  const IconComponent = theme.icon;
                  const monthlyPrice =
                    plan.prices.find((p) => p.period === "MONTHLY")?.price ?? 0;

                  return (
                    <Card
                      key={plan.id}
                      className={`cursor-pointer h-full border border-border/60 bg-background/50 rounded-xl p-3 sm:p-4 transition-all hover:border-primary/50 hover:bg-primary/5 hover:-translate-y-0.5 hover:shadow-md ${disabled
                        ? "opacity-60 cursor-not-allowed filter grayscale-[20%] hover:border-none hover:bg-transparent hover:shadow-none"
                        : ""
                        }`}
                      onClick={() => openDrawer(plan)}
                    >
                      <div className="mb-3 sm:mb-4 flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className={`p-2 sm:p-2.5 rounded-lg ${theme.badgeBg}`}
                          >
                            <IconComponent className="w-5 h-5 sm:w-6 sm:h-6" />
                          </div>
                          <span
                            className={`font-bold text-base sm:text-lg ${theme.textClass}`}
                          >
                            {plan.name}
                          </span>
                        </div>
                      </div>
                      <p className="text-[10px] text-muted-foreground mb-3 sm:mb-4">
                        Up to {plan.maxTurfs}{" "}
                        {plan.maxTurfs === 1 ? "Turf" : "Turfs"} &middot;{" "}
                        {plan.features.length} features
                      </p>
                      <div
                        className={`mb-3 sm:mb-4 inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg border border-current/10 ${theme.badgeBg}`}
                      >
                        <span className="text-[9px] sm:text-[10px] font-medium opacity-80">
                          From
                        </span>
                        <span className="text-lg sm:text-xl font-extrabold text-foreground">
                          ৳{monthlyPrice.toLocaleString()}
                        </span>
                        <span className="text-[9px] sm:text-[10px] font-semibold opacity-75">
                          /mo
                        </span>
                      </div>
                      <ul className="mb-4 max-h-[140px] overflow-y-auto pr-1 space-y-1">
                        {plan.features.map((f, i) => (
                          <li
                            key={i}
                            className="flex items-center gap-1.5 truncate"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-border shrink-0" />
                            <span className="text-[10px] truncate">
                              {f.name}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          openDrawer(plan);
                        }}
                        disabled={disabled}
                        variant="hero"
                        size="sm"
                        className="w-full h-8 text-xs shadow-md shadow-primary/20 transition-transform hover:-translate-y-0.5"
                      >
                        {disabled ? "Locked" : "Upgrade"}
                      </Button>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Subscription History */}
      <Card className="surface-card overflow-hidden">
        <CardContent className="p-0">
          <div className="space-y-3 sm:space-y-4 p-3 sm:p-4">
            <CardTitle className="flex items-center gap-2 text-sm mb-3 sm:mb-4">
              <Clock3 className="size-4 text-primary" />
              Subscription History
            </CardTitle>
            {history.length === 0 ? (
              <p className="py-6 text-center text-[11px] text-muted-foreground">
                No activity yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/70">
                      <th className="px-1 py-1 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Action
                      </th>
                      <th className="px-1 py-1 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Period
                      </th>
                      <th className="px-1 py-1 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Amount
                      </th>
                      <th className="px-1 py-1 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Date
                      </th>
                      <th className="px-1 py-1 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((log, i) => (
                      <tr
                        key={log.id}
                        className="border-b border-border/40 last:border-0 transition-colors hover:bg-secondary/20"
                      >
                        <td className="px-1 py-1 text-sm text-foreground">
                          <p className="font-medium">{log.action}</p>
                        </td>
                        <td className="px-1 py-1 text-sm text-foreground">
                          <p className="text-muted-foreground">
                            {formatDateShort(log.startDate)} to{" "}
                            {formatDateShort(log.endDate)}
                          </p>
                        </td>
                        <td className="px-1 py-1 text-sm text-foreground">
                          {log.invoice ? (
                            <p className="font-medium">
                              ৳ {formatAmount(log.invoice.totalAmount)}
                            </p>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-1 py-1 text-sm text-foreground">
                          <p className="text-muted-foreground">
                            {formatDateShort(log.createdAt)}
                          </p>
                        </td>
                        <td className="px-1 py-1 text-sm text-right">
                          <Badge
                            variant={
                              statusVariant[log.status] ?? "secondary"
                            }
                          >
                            {log.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payment Side Drawer */}
      {drawerPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in">
          <div className="fixed inset-0" onClick={closeDrawer} />

          <div className="relative w-full max-w-lg h-full overflow-hidden border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl z-10 flex flex-col animate-in slide-in-from-right duration-400 ease-out">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4 bg-slate-50/90 dark:bg-slate-800/90 backdrop-blur-xs shrink-0">
              <div className="flex items-center gap-2">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                    {drawerPlan.name}
                  </h3>
                </div>
              </div>
              <button
                onClick={closeDrawer}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors active:scale-90"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-5">
              {showPaymentStep && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/40 space-y-4">
                  <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-2 dark:border-slate-800">
                    <div>
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Amount
                      </span>
                      <p className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 mt-0.5">
                        {periodLabels[selectedPeriod]} — ৳
                        {drawerPlan.prices
                          .find((p) => p.period === selectedPeriod)
                          ?.price.toLocaleString() ?? "0"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPaymentStep(false)}
                      className="text-xs font-bold text-purple-600 hover:text-purple-700 dark:text-purple-400 hover:underline transition-colors"
                    >
                      Change cycle
                    </button>
                  </div>

                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Payment Gateway
                  </p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {paymentOptions.map((opt) => {
                      const isSelected = paymentMethod === opt.id;
                      return (
                        <label
                          key={opt.id}
                          className="flex cursor-pointer items-center justify-center group"
                        >
                          <input
                            type="radio"
                            name="payment-method"
                            value={opt.id}
                            checked={isSelected}
                            onChange={() => {
                              setPaymentMethod(opt.id);
                              if (opt.id === "CASH") {
                                setProviderTransactionId("");
                                setPayerMobileNumber("");
                                setMobileError(null);
                              }
                            }}
                            className="sr-only"
                          />
                          <img
                            src={opt.icon}
                            alt={opt.name}
                            className={`h-10 w-20 shrink-0 rounded-md group-hover:scale-105 ${isSelected
                              ? "drop-shadow-[0_0_6px_rgba(128,0,255,0.6)]"
                              : ""
                              }`}
                          />
                        </label>
                      );
                    })}
                  </div>

                  {!isCashPayment && (
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-purple-200 bg-purple-50/60 p-3.5 dark:border-purple-900/60 dark:bg-purple-950/30">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-purple-900 dark:text-purple-300">
                          Send payment to ({getWalletName(paymentMethod)})
                        </p>
                        <p className="mt-1 font-mono text-sm font-black tracking-widest text-slate-900 dark:text-white">
                          {PAYMENT_NUMBERS[paymentMethod]}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCopyPaymentNumber(paymentMethod)}
                        className="h-8 shrink-0 px-2.5 text-xs font-bold text-purple-600 hover:bg-purple-100 dark:text-purple-400"
                      >
                        <Copy className="mr-1 h-3.5 w-3.5" />
                        Copy
                      </Button>
                    </div>
                  )}

                  {!isCashPayment && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Mobile Number
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <input
                            value={payerMobileNumber}
                            onChange={(e) =>
                              handlePayerMobileChange(e.target.value)
                            }
                            placeholder="01XXXXXXXXX"
                            inputMode="tel"
                            className="h-10 w-full rounded-xl border border-slate-300 pl-9 pr-3 text-xs outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                          />
                        </div>
                        {mobileError && (
                          <p className="mt-1 text-xs text-destructive">
                            {mobileError}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Transaction ID
                        </label>
                        <div className="relative">
                          <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <input
                            value={providerTransactionId}
                            onChange={(e) =>
                              setProviderTransactionId(e.target.value)
                            }
                            placeholder="e.g. TRX109283"
                            className="h-10 w-full rounded-xl border border-slate-300 pl-9 pr-3 text-xs outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <Button
                    className="w-full bg-purple-600 text-xs font-bold text-white hover:bg-purple-700 h-10 rounded-xl active:scale-98 mt-2 shadow-md shadow-purple-600/20"
                    disabled={  paymentMutation.isPending ||  (isTransactionIdRequired &&  !providerTransactionId.trim()) || (isMobileNumberRequired && !payerMobileNumber.trim()) ||  !!mobileError   }
                    onClick={() => paymentMutation.mutate(selectedPeriod)}
                  >
                    {paymentMutation.isPending ? (
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      `Confirm ${getWalletName(paymentMethod)} Payment`
                    )}
                  </Button>
                </div>
              )}

              {!showPaymentStep && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Billing Cycle
                    </p>
                    <span className="text-[11px] text-purple-600 font-semibold dark:text-purple-400">
                      Select a period
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {drawerPlan.prices.map((priceData) => {
                      const isSelected = selectedPeriod === priceData.period;
                      return (
                        <div
                          key={priceData.period}
                          onClick={() => {
                            setSelectedPeriod(priceData.period);
                            setShowPaymentStep(true);
                          }}
                          className={`group relative flex flex-col justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${isSelected
                            ? "border-purple-600 bg-purple-50/50 dark:bg-purple-950/30 ring-2 ring-purple-600/20"
                            : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                            }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <div
                                className={`flex h-4 w-4 items-center justify-center rounded-full border transition-all ${isSelected
                                  ? "border-purple-600 bg-purple-600 text-white"
                                  : "border-slate-300 dark:border-slate-600"
                                  }`}
                              >
                                {isSelected && (
                                  <Check className="h-2.5 w-2.5 stroke-[3]" />
                                )}
                              </div>
                              <div>
                                <h4 className="text-sm font-black text-slate-900 dark:text-white">
                                  {periodLabels[priceData.period]}
                                </h4>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                  {priceData.period === "MONTHLY" &&
                                    "Monthly plan"}
                                  {priceData.period === "QUARTERLY" &&
                                    "3 months"}
                                  {priceData.period === "HALF_YEARLY" &&
                                    "6 months"}
                                  {priceData.period === "YEARLY" &&
                                    "Annual plan"}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between pt-1 border-t">
                            <span className="text-lg font-black text-slate-900 dark:text-white">
                              ৳{priceData.price.toLocaleString()}
                            </span>
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPeriod(priceData.period);
                                setShowPaymentStep(true);
                              }}
                              className={`h-7 text-xs font-bold px-2.5 rounded ${isSelected
                                ? "bg-purple-600 text-white"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                                }`}
                            >
                              Select
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}