"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Loader2,
  Zap,
  X,
  Check,
  ArrowRight,
  BarChart3,
  UserPlus,
  Sparkles,
  CheckCircle2,
  Copy,
  Lock,
  Crown,
  Star,
  Phone,
  Hash,
  CreditCard,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiResponse } from "@/types/api.type";
import { toast } from "sonner";
import { validateBangladeshiMobile } from "@/lib/validators";
import { getOwnerProfile } from "../_action";
import {
  getCurrentSubscriptionClient,
  getSubscriptionPlansClient,
  initiateSubscriptionPaymentClient,
  activateFreeTrialClient,
} from "../_client-api";
import { OwnerProfile, SubscriptionPlan, OwnerSubscription } from "../_types";
import OwnerProfileHeader from "../_components/OwnerProfileHeader";

type PaymentMethod = "BKASH" | "NAGAD" | "ROKET" | "CASH";

const PAYMENT_NUMBERS: Record<Exclude<PaymentMethod, "CASH">, string> = {
  BKASH: "01700000000",
  NAGAD: "01700000000",
  ROKET: "01700000000",
};

export default function SubscriptionStepPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [hoveredCardIndex, setHoveredCardIndex] = useState<number | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<
    "MONTHLY" | "QUARTERLY" | "HALF_YEARLY" | "YEARLY"
  >("MONTHLY");
  const [drawerPlan, setDrawerPlan] = useState<SubscriptionPlan | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("BKASH");
  const [providerTransactionId, setProviderTransactionId] = useState("");
  const [payerMobileNumber, setPayerMobileNumber] = useState("");
  const [showPaymentStep, setShowPaymentStep] = useState(false);
  const [mobileError, setMobileError] = useState<string | null>(null);

  const handlePayerMobileChange = (value: string) => {
    setPayerMobileNumber(value);
    if (isMobileNumberRequired) {
      setMobileError(validateBangladeshiMobile(value));
    } else {
      setMobileError(null);
    }
  };

  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ["owner-profile"],
    queryFn: async () => {
      const res = await getOwnerProfile();
      if (!res.success) throw new Error(res.message);
      return (res as ApiResponse<OwnerProfile>).data ?? null;
    },
    staleTime: 30000,
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

  const { data: subscriptionData } = useQuery({
    queryKey: ["owner-subscription"],
    queryFn: async () => {
      const res = await getCurrentSubscriptionClient();
      if (!res.success) throw new Error(res.message);
      return (res as ApiResponse<OwnerSubscription | null>).data ?? null;
    },
    enabled: !!profileData,
  });

  useEffect(() => {
    if (!profileLoading && !profileData) {
      router.push("/owner-profile/profile");
    }
  }, [profileData, profileLoading, router]);

  const activePlanId = subscriptionData?.plan?.id ?? null;

  const hasActivePaidSubscription =
    Boolean(subscriptionData) &&
    (subscriptionData?.status === "ACTIVE" ||
      subscriptionData?.status === "EXPIRING" ||
      subscriptionData?.status === "EXPIRED");

  // Disable cards if user has an active paid subscription (not free trial)
  const hasPaidPlanSubscription = hasActivePaidSubscription;

  const isCashPayment = paymentMethod === "CASH";
  const isTransactionIdRequired = !isCashPayment;
  const isMobileNumberRequired = ["BKASH", "NAGAD", "ROKET"].includes(paymentMethod);

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

  const activateFreeTrialMutation = useMutation({
    mutationFn: async () => {
      const res = await activateFreeTrialClient();
      if (!res.success) throw new Error(res.message);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner-profile"] });
      queryClient.invalidateQueries({ queryKey: ["owner-subscription"] });
      toast.success("Free trial activated successfully!");
      setDrawerPlan(null);
    },
    onError: (err: Error) =>
      toast.error(err.message || "Failed to activate free trial"),
  });

  const paymentMutation = useMutation({
    mutationFn: async (billingPeriod: typeof selectedPeriod) => {
      if (!drawerPlan) throw new Error("Please select a plan");
      if (isTransactionIdRequired && !providerTransactionId.trim()) {
        throw new Error("Provider transaction ID is required");
      }
      if (isMobileNumberRequired && !payerMobileNumber.trim()) {
        throw new Error("Your payment mobile number is required");
      }
      const mobileErr = isMobileNumberRequired
        ? validateBangladeshiMobile(payerMobileNumber)
        : null;
      if (mobileErr) {
        setMobileError(mobileErr);
        throw new Error(mobileErr);
      }

      const initiated = await initiateSubscriptionPaymentClient({
        planId: drawerPlan.id,
        billingPeriod,
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

      return initiated;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["owner-profile"] });
      void queryClient.invalidateQueries({ queryKey: ["owner-subscription"] });
      toast.success("Subscription payment initiated.");
      setProviderTransactionId("");
      setPayerMobileNumber("");
      setMobileError(null);
      setDrawerPlan(null);
    },
    onError: (error: Error) => toast.error(error.message || "Payment failed"),
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = date.toLocaleString("en-US", { month: "short" });
    const year = date.getFullYear();
    return `${day} ${month}, ${year}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "text-emerald-600 dark:text-emerald-400";
      case "FREE_TRIAL":
        return "text-purple-600 dark:text-purple-400";
      case "EXPIRING":
        return "text-amber-600 dark:text-amber-400";
      case "EXPIRED":
        return "text-red-600 dark:text-red-400";
      case "CANCELLED":
        return "text-slate-600 dark:text-slate-400";
      default:
        return "text-slate-500 dark:text-slate-500";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "FREE_TRIAL":
        return "Free Trial";
      default:
        return status;
    }
  };

  const handleCopyNumber = (num: string) => {
    navigator.clipboard.writeText(num);
    toast.success("Number copied to clipboard!");
  };

  const periodLabels = {
    MONTHLY: "Monthly",
    QUARTERLY: "Quarterly",
    HALF_YEARLY: "Half-Yearly",
    YEARLY: "Yearly",
  };

  const paymentOptions = [
    {
      id: "BKASH",
      name: "bKash",
      icon: "/marchent-icon/bKash.svg",
    },
    {
      id: "NAGAD",
      name: "Nagad",
      icon: "/marchent-icon/nagad.svg",
    },
    {
      id: "ROKET",
      name: "Rocket",
      icon: "/marchent-icon/rocket.svg",
    },
    {
      id: "CASH",
      name: "Pay Later",
      icon: "/marchent-icon/pay-later.svg",
    },
  ] as const;

  const planThemes = [
    {
      textClass: "text-[#6824d6]",
      gradientClass: "from-violet-50 via-white to-purple-50",
      borderClass: "border-[#6824d6]",
      shadowClass: "shadow-[0_20px_35px_rgba(104,36,214,0.25)] hover:shadow-[0_25px_45px_rgba(104,36,214,0.35)]",
      badgeBg: "bg-[#6824d6]/10 text-[#6824d6]",
      activeGlow: "shadow-[0_0_25px_rgba(104,36,214,0.45)]",
      icon: BarChart3,
    },
    {
      textClass: "text-[#fe3258]",
      gradientClass: "from-rose-50 via-white to-pink-50",
      borderClass: "border-[#fe3258]",
      shadowClass: "shadow-[0_20px_35px_rgba(254,50,88,0.25)] hover:shadow-[0_25px_45px_rgba(254,50,88,0.35)]",
      badgeBg: "bg-[#fe3258]/10 text-[#fe3258]",
      activeGlow: "shadow-[0_0_25px_rgba(254,50,88,0.45)]",
      icon: UserPlus,
    },
    {
      textClass: "text-[#4ccda7]",
      gradientClass: "from-emerald-50 via-white to-teal-50",
      borderClass: "border-[#4ccda7]",
      shadowClass: "shadow-[0_20px_35px_rgba(76,205,167,0.25)] hover:shadow-[0_25px_45px_rgba(76,205,167,0.35)]",
      badgeBg: "bg-[#4ccda7]/10 text-[#0d8261]",
      activeGlow: "shadow-[0_0_25px_rgba(76,205,167,0.45)]",
      icon: Sparkles,
    },
  ];

  const sortedPlans = useMemo(
    () =>
      (plansData || [])
        .filter((plan) => plan.active)
        .sort((a, b) => a.tierLevel - b.tierLevel),
    [plansData]
  );

  const isFreeTrial = (plan: SubscriptionPlan) => plan.isFreeTrialAllowed;

  const openDrawer = (plan: SubscriptionPlan) => {
    if (hasPaidPlanSubscription) return;

    setDrawerPlan(plan);
    setSelectedPlanId(plan.id);
    setShowPaymentStep(false);
    setProviderTransactionId("");
    setPayerMobileNumber("");
    setPaymentMethod("BKASH");
    const firstPrice = plan.prices[0]?.period || "MONTHLY";
    setSelectedPeriod(firstPrice);
  };

  const closeDrawer = () => {
    setDrawerPlan(null);
    setProviderTransactionId("");
    setPayerMobileNumber("");
    setMobileError(null);
    setShowPaymentStep(false);
  };

  if (profileLoading || !profileData) {
    return (
      <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 pb-16 font-sans">
        <div className="container mx-auto max-w-6xl px-4 pt-4 pb-8 lg:px-8 space-y-6">
          <div className="flex justify-end">
            <Skeleton className="h-6 w-48 rounded-xl" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-[26rem] w-full rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 pb-16 font-sans antialiased selection:bg-purple-500 selection:text-white">
      <OwnerProfileHeader profile={profileData} />

      <div className="container mx-auto max-w-6xl px-4 pt-4 pb-8 lg:px-8">
        {/* Active Status Header */}
        {subscriptionData && (
          <div className="flex justify-end mb-6 text-xs sm:text-sm text-right leading-relaxed font-sans">
            <p className="text-slate-800 dark:text-slate-200 flex items-center justify-end gap-1.5 flex-wrap">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="hidden sm:inline">Plan:</span>{" "}
              {subscriptionData.plan.name}
              <span className="hidden sm:inline mx-1.5">·</span>
              <span
                className={`uppercase font-black tracking-wide ${getStatusColor(
                  subscriptionData.status
                )}`}
              >
                {getStatusLabel(subscriptionData.status)}
              </span>
              <span className="hidden sm:inline"> · </span>
              <span className="hidden sm:inline">{formatDate(subscriptionData.endDate)}</span>
            </p>
            {subscriptionData.isFreeActive && (
              <p className="text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-0">
                Trial ends: {formatDate(subscriptionData.freeEnd!)}
              </p>
            )}
          </div>
        )}

        {/* Dynamic Plan Grid */}
        {plansLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-stretch items-stretch max-w-6xl mx-auto">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-[26rem] w-full rounded-2xl" />
            ))}
          </div>
        ) : sortedPlans.length === 0 ? (
          <Alert className="border-amber-500/30 bg-amber-500/10 max-w-xl mx-auto rounded-2xl animate-in fade-in zoom-in-95 duration-300">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <AlertTitle className="text-amber-900 dark:text-amber-200 font-bold">
              No Plans Available
            </AlertTitle>
            <AlertDescription className="text-amber-800 dark:text-amber-300 text-xs">
              Subscription plans are not set up yet. Please contact system
              support.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-stretch items-stretch max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            {sortedPlans.map((plan, index) => {
              const theme = planThemes[index % planThemes.length];
              const IconComponent = theme.icon;
              const isHovered = hoveredCardIndex === index;
              const isCurrentActive = activePlanId === plan.id;
              const isUserSelected = selectedPlanId === plan.id;
              const isHighlighted = isCurrentActive || isUserSelected;
              const isFree = isFreeTrial(plan);
              const isCardDisabled = hasPaidPlanSubscription;

              const monthlyPrice =
                plan.prices.find((p) => p.period === "MONTHLY")?.price ?? 0;

              const sortedFeatures = [...plan.features].sort((a, b) => {
                const aPremium = a.type === "PREMIUM" ? 0 : 1;
                const bPremium = b.type === "PREMIUM" ? 0 : 1;
                return aPremium - bPremium;
              });

              return (
                <div
                  key={plan.id}
                  onMouseEnter={() =>
                    !isCardDisabled && setHoveredCardIndex(index)
                  }
                  onMouseLeave={() =>
                    !isCardDisabled && setHoveredCardIndex(null)
                  }
                  onClick={() => openDrawer(plan)}
                  className={`w-full h-full min-h-[26rem] transition-all duration-300 ease-out relative flex ${isCardDisabled
                    ? "opacity-65 cursor-not-allowed filter grayscale-[20%]"
                    : "cursor-pointer active:scale-98"
                    } ${!isCardDisabled && (isHovered || isHighlighted)
                      ? "-translate-y-2.5"
                      : "translate-y-0"
                    }`}
                >
                  <div
                    className={`relative w-full h-full rounded-2xl p-4 flex flex-col transition-all duration-300 border-2 ${isHighlighted
                      ? `${theme.borderClass} ${theme.activeGlow}`
                      : `border-transparent shadow-[0_8px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)]`
                      } bg-gradient-to-br ${theme.gradientClass} dark:from-slate-900 dark:via-slate-950 dark:to-slate-900`}
                  >
                    {isHighlighted && (
                      <div className="absolute -top-3.5 left-0 right-0 mx-auto w-max z-20 animate-in zoom-in duration-200">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-white text-slate-900 shadow-lg border border-slate-200">
                          <CheckCircle2
                            className={`w-3.5 h-3.5 ${theme.textClass}`}
                          />
                          {isCurrentActive ? "Active" : "Selected"}
                        </span>
                      </div>
                    )}

                    <div className="relative flex-1 bg-white/90 dark:bg-slate-900/90 rounded-xl p-4 flex flex-col transition-colors duration-300 shadow-xs overflow-hidden">
                      <div className="flex items-center justify-between gap-3">
                        <div
                          className={`p-2.5 rounded-xl ${theme.badgeBg} transition-transform duration-300 hover:scale-105 shrink-0`}
                        >
                          <IconComponent className="w-6 h-6" />
                        </div>
                        <p
                          className={`font-black text-lg sm:text-xl capitalize tracking-tight text-right ${theme.textClass}`}
                        >
                          {plan.name}
                        </p>
                      </div>

                       <div className="my-2.5">
                          <div
                            className={`inline-flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-xl border border-current/10 ${theme.badgeBg} dark:bg-slate-800/80`}
                          >
                            <span className="text-[10px] sm:text-xs font-medium opacity-80">
                              From
                            </span>
                            <span className="text-xl sm:text-2xl font-extrabold tracking-tight">
                              ৳
                            </span>
                            <span className="text-base sm:text-lg font-extrabold tracking-tight">
                              {monthlyPrice.toLocaleString()}
                            </span>
                            <span className="text-[10px] sm:text-xs font-semibold opacity-75">
                              /mo
                            </span>
                          </div>
                        </div>

                      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                        <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300 p-0 m-0 list-none">
                           <li className="flex items-center gap-2 min-w-0">
                             <span
                               className={`w-1.5 h-1.5 rounded-full bg-gradient-to-br ${theme.gradientClass} border border-slate-200/60 dark:border-slate-700 shrink-0`}
                             />
                             <span className="font-bold text-slate-800 dark:text-slate-200 text-[11px] sm:text-xs">
                               Up to {plan.maxTurfs}{" "}
                               {plan.maxTurfs === 1 ? "Turf" : "Turfs"}
                             </span>
                           </li>

                          {sortedFeatures.map((feat, i) => (
                            <li
                              key={i}
                              className="flex items-center gap-2 min-w-0"
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full bg-gradient-to-br ${theme.gradientClass} border border-slate-200/60 dark:border-slate-700 shrink-0`}
                              />
                              <span className="truncate text-[10px] sm:text-xs">
                                {feat.name}
                              </span>
                              {feat.type === "PREMIUM" && (
                                <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="flex items-center justify-between font-bold text-xs capitalize z-10 px-1 pt-3 pb-0.5">
                      <span className="text-slate-700 dark:text-slate-200 text-xs font-bold tracking-wide">
                        {isCardDisabled
                          ? "Unavailable"
                          : isFree
                            ? (plan.freeTrialDuration ?? 0) > 0
                              ? `Try ${plan.freeTrialDuration} ${plan.freeTrialDuration === 1 ? "day" : "days"} Free`
                               : "Start Free"
                            : isHighlighted
                              ? "Manage Plan"
                              : "Get Started"}
                      </span>
                      {isCardDisabled ? (
                        <Lock className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ArrowRight
                          className={`w-4 h-4 transition-transform duration-300 ${theme.textClass} ${isHovered || isHighlighted
                            ? "translate-x-1.5"
                            : "translate-x-0"
                            }`}
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Animated Modal Drawer */}
      {drawerPlan && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in">
          <div className="fixed inset-0" onClick={closeDrawer} />

          <div className="relative w-full max-w-xl overflow-hidden rounded-t-3xl border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl z-10 max-h-[88vh] flex flex-col animate-in slide-in-from-bottom duration-300 ease-out">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4 bg-slate-50/90 dark:bg-slate-800/90 backdrop-blur-xs">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                    {drawerPlan.name}
                  </h3>
                   <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {showPaymentStep
                      ? "Payment Details"
                      : "Billing Cycle"}
                  </p>
                </div>
              </div>
              <button
                onClick={closeDrawer}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-all active:scale-90"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              {showPaymentStep && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 dark:border-slate-800 dark:bg-slate-800/40 space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-700/60 pb-3">
                    <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Summary
                    </h4>
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

                  {/* Payment Options Grid */}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                      Payment Gateway
                    </p>
                    <div className="grid grid-cols-4 gap-1.5">
                      {paymentOptions.map((opt) => {
                        const isSelected = paymentMethod === opt.id;
                        return (
                          <label
                            key={opt.id}
                            className="flex cursor-pointer items-center justify-center transition-all duration-200 group"
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
                              className={`h-12 w-24 shrink-0 rounded-md transition-transform duration-200 group-hover:scale-110 dark:bg-white ${isSelected ? "drop-shadow-[0_0_6px_rgba(128,0,255,0.6)]" : ""}`}
                            />
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Account Copy Widget */}
                  {!isCashPayment && (
                    <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-3.5 dark:border-purple-900/60 dark:bg-purple-950/30 transition-all">
                      <div className="flex items-center justify-between">
                     <span className="text-xs font-bold text-purple-900 dark:text-purple-300 uppercase tracking-wider">
                          Pay ({getWalletName(paymentMethod)}):
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-slate-900 dark:text-white tracking-widest font-mono">
                            {
                              PAYMENT_NUMBERS[
                              paymentMethod as keyof typeof PAYMENT_NUMBERS
                              ]
                            }
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              handleCopyNumber(
                                PAYMENT_NUMBERS[
                                paymentMethod as keyof typeof PAYMENT_NUMBERS
                                ]
                              )
                            }
                            className="h-7 px-2.5 text-xs font-bold text-purple-600 hover:bg-purple-100 dark:text-purple-400 active:scale-95 transition-transform"
                          >
                            <Copy className="h-3.5 w-3.5 mr-1" />
                            Copy
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Input Fields */}
                  {!isCashPayment && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 animate-in fade-in duration-300">
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
                            className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-xs font-medium outline-none transition-all focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
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
                            className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-xs font-medium outline-none transition-all focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <Button
                    className="w-full bg-purple-600 text-xs font-bold text-white hover:bg-purple-700 h-11 rounded-xl shadow-md active:scale-98 transition-all mt-2"
                    disabled={
                      paymentMutation.isPending ||
                      (isTransactionIdRequired &&
                        !providerTransactionId.trim()) ||
                      (isMobileNumberRequired && !payerMobileNumber.trim()) ||
                      !!mobileError
                    }
                    onClick={() => paymentMutation.mutate(selectedPeriod)}
                  >
                    {paymentMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : isCashPayment ? (
                        "Confirm Payment"
                      ) : (
                        `Confirm ${getWalletName(paymentMethod)} Payment`
                      )}
                  </Button>
                </div>
              )}

              {/* 2 - 2 - 1 CARD LAYOUT FOR BILLING CYCLES */}
              {!showPaymentStep && (
                <div className="space-y-3 animate-in fade-in slide-in-from-left-4 duration-300">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Billing Cycle
                    </p>
                     <span className="text-[11px] text-purple-600 font-semibold dark:text-purple-400">
                      Select a period
                    </span>
                  </div>

                  {/* Structured 2 - 2 - 1 Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {drawerPlan.prices.map((priceData, idx) => {
                      const periodLabel = periodLabels[priceData.period];
                      const isSelected = selectedPeriod === priceData.period;
                      const monthlyRate =
                        drawerPlan.prices.find(
                          (p) => p.period === "MONTHLY"
                        )?.price || 0;

                      const multiplier =
                        priceData.period === "QUARTERLY"
                          ? 3
                          : priceData.period === "HALF_YEARLY"
                            ? 6
                            : priceData.period === "YEARLY"
                              ? 12
                              : 1;

                      const savings =
                        priceData.period !== "MONTHLY" && monthlyRate > 0
                          ? Math.round(
                            ((monthlyRate * multiplier - priceData.price) /
                              (monthlyRate * multiplier)) *
                            100
                          )
                          : 0;

                      const isLastSingle =
                        drawerPlan.prices.length % 2 !== 0 &&
                        idx === drawerPlan.prices.length - 1;

                      return (
                        <div
                          key={priceData.period}
                          onClick={() => {
                            setSelectedPeriod(priceData.period);
                            setShowPaymentStep(true);
                          }}
                          className={`group relative flex flex-col justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${isLastSingle ? "sm:col-span-2" : ""
                            } ${isSelected
                              ? "border-purple-600 bg-purple-50/50 dark:bg-purple-950/30 ring-4 ring-purple-600/15 scale-101 shadow-md"
                              : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/60 dark:hover:bg-slate-800/50"
                            }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`flex h-5 w-5 items-center justify-center rounded-full border transition-all ${isSelected
                                  ? "border-purple-600 bg-purple-600 text-white scale-110"
                                  : "border-slate-300 dark:border-slate-600 group-hover:border-slate-400"
                                  }`}
                              >
                                {isSelected && (
                                  <Check className="h-3 w-3 stroke-[3]" />
                                )}
                              </div>
                              <div>
                                <h4 className="text-sm font-black text-slate-900 dark:text-white leading-none">
                                  {periodLabel}
                                </h4>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
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

                            {savings > 0 && (
                              <span className="px-2 py-0.5 text-[10px] font-black text-emerald-700 bg-emerald-100 dark:bg-emerald-950/80 dark:text-emerald-300 rounded-full shrink-0 animate-pulse">
                                Save {savings}%
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                            <div>
                              <span className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                                ৳{priceData.price.toLocaleString()}
                              </span>
                            </div>
                            <Button
                              size="sm"
                              className={`h-8 text-xs font-bold px-3 rounded-lg transition-all active:scale-95 ${isSelected
                                ? "bg-purple-600 text-white shadow-xs"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 group-hover:bg-purple-600 group-hover:text-white"
                                }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPeriod(priceData.period);
                                setShowPaymentStep(true);
                              }}
                            >
                              Select{" "}
                              <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* FREE TRIAL OPTION */}
              {!showPaymentStep && isFreeTrial(drawerPlan) && (
                <div className="rounded-2xl border border-emerald-500/40 bg-emerald-50/50 p-4 dark:bg-emerald-950/20 flex items-center justify-between gap-3 animate-in fade-in duration-300">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                        Try Free Trial
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {(drawerPlan.freeTrialDuration ?? 0) > 0
                        ? `${drawerPlan.freeTrialDuration} days risk-free trial.`
                        : "Instant free trial access"}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="h-8 text-xs font-bold px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 active:scale-95 transition-all shadow-xs"
                    disabled={activateFreeTrialMutation.isPending}
                    onClick={() => activateFreeTrialMutation.mutate()}
                  >
                    {activateFreeTrialMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        <Zap className="mr-1 h-3.5 w-3.5" />
                        Try Free
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* FEATURES SUMMARY */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">
                          Features
                        </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs max-h-48 overflow-y-auto pr-1">
                  <div className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-300">
                    <Check className="h-4 w-4 text-emerald-500 stroke-[3] shrink-0" />
                    <span>Up to {drawerPlan.maxTurfs} Turf(s)</span>
                  </div>
                  {drawerPlan.features.map((feature, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-slate-600 dark:text-slate-400 min-w-0"
                    >
                      <Check className="h-4 w-4 text-emerald-500 stroke-[3] shrink-0" />
                      <span className="truncate">{feature.name}</span>
                      {feature.type === "PREMIUM" && (
                        <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}