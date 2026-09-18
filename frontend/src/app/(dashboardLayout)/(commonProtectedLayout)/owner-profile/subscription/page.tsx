"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Loader2,
  Zap,
  X,
  Check,
  ShieldCheck,
  ArrowRight,
  BarChart3,
  UserPlus,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ApiResponse } from "@/types/api.type";
import { toast } from "sonner";
import { getOwnerProfile } from "../_action";
import {
  activateSubscriptionClient,
  getCurrentSubscriptionClient,
  getSubscriptionPlansClient,
} from "../_client-api";
import { OwnerProfile, SubscriptionPlan, OwnerSubscription } from "../_types";
import OwnerProfileHeader from "../_components/OwnerProfileHeader";

export default function SubscriptionStepPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [hoveredCardIndex, setHoveredCardIndex] = useState<number | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<
    "MONTHLY" | "QUARTERLY" | "HALF_YEARLY" | "YEARLY"
  >("MONTHLY");
  const [drawerPlan, setDrawerPlan] = useState<SubscriptionPlan | null>(null);

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

  const activePlanId = subscriptionData?.plan?.id ?? null;

  const activateSubscriptionMutation = useMutation({
    mutationFn: async ({
      planId,
      period,
    }: {
      planId: string;
      period: "MONTHLY" | "QUARTERLY" | "HALF_YEARLY" | "YEARLY";
    }) => {
      const res = await activateSubscriptionClient(planId, period);
      if (!res.success) throw new Error(res.message);
      return res;
    },
    onSuccess: () => {
      const planName = (plansData || []).find((p) => p.id === selectedPlanId)?.name;
      queryClient.invalidateQueries({ queryKey: ["owner-profile"] });
      queryClient.invalidateQueries({ queryKey: ["owner-subscription"] });
      toast.success(
        (plansData || []).find((p) => p.id === selectedPlanId)?.tierLevel === 0
          ? "One-month free trial activated!"
          : `${planName} plan selected and subscription updated.`
      );
      setDrawerPlan(null);
    },
    onError: (err: Error) =>
      toast.error(err.message || "Failed to activate subscription"),
  });

  const handleSubscribe = (
    planId: string,
    period: "MONTHLY" | "QUARTERLY" | "HALF_YEARLY" | "YEARLY"
  ) => {
    activateSubscriptionMutation.mutate({ planId, period });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = date.toLocaleString("en-US", { month: "short" });
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-10 w-10 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!profileData) {
    router.push("/owner-profile/profile");
    return null;
  }

  const planThemes = [
    {
      textClass: "text-[#6824d6]",
      bgClass: "bg-[#6824d6]",
      borderClass: "border-[#6824d6]",
      shadowClass: "shadow-[0_20px_35px_rgba(104,36,214,0.35)]",
      badgeBg: "bg-[#6824d6]/10 text-[#6824d6]",
      activeGlow: "shadow-[0_0_25px_rgba(104,36,214,0.45)]",
      icon: BarChart3,
    },
    {
      textClass: "text-[#fe3258]",
      bgClass: "bg-[#fe3258]",
      borderClass: "border-[#fe3258]",
      shadowClass: "shadow-[0_20px_35px_rgba(254,50,88,0.35)]",
      badgeBg: "bg-[#fe3258]/10 text-[#fe3258]",
      activeGlow: "shadow-[0_0_25px_rgba(254,50,88,0.45)]",
      icon: UserPlus,
    },
    {
      textClass: "text-[#4ccda7]",
      bgClass: "bg-[#4ccda7]",
      borderClass: "border-[#4ccda7]",
      shadowClass: "shadow-[0_20px_35px_rgba(76,205,167,0.35)]",
      badgeBg: "bg-[#4ccda7]/10 text-[#0d8261]",
      activeGlow: "shadow-[0_0_25px_rgba(76,205,167,0.45)]",
      icon: Sparkles,
    },
  ];

  const periodLabels = {
    MONTHLY: "Monthly",
    QUARTERLY: "Quarterly",
    HALF_YEARLY: "Half-yearly",
    YEARLY: "Yearly",
  };

  const sortedPlans = (plansData || [])
    .filter((plan) => plan.active)
    .sort((a, b) => a.tierLevel - b.tierLevel);

  const isFreeTrial = (plan: SubscriptionPlan) => plan.tierLevel === 0;

  const openDrawer = (plan: SubscriptionPlan) => {
    setDrawerPlan(plan);
    setSelectedPlanId(plan.id);
    const firstPrice = plan.prices[0]?.period || "MONTHLY";
    setSelectedPeriod(firstPrice);
  };

  const closeDrawer = () => {
    setDrawerPlan(null);
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] dark:bg-slate-950 pb-16 font-sans antialiased">
      <OwnerProfileHeader profile={profileData} />

      <div className="container mx-auto max-w-6xl px-4 pt-4 pb-8 lg:px-8">
        {/* Minimal Plain Text Active Status at Top Right */}
        {subscriptionData && (
          <div className="flex justify-end mb-6 text-xs sm:text-sm text-right leading-relaxed font-sans">
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                Current Active Plan: {subscriptionData.plan.name}
              </p>
              <p className="text-slate-500 dark:text-slate-400">
                Status:{" "}
                <span className="uppercase font-bold text-emerald-600 dark:text-emerald-400">
                  {subscriptionData.status}
                </span>{" "}
                until {formatDate(subscriptionData.endDate)}
              </p>
            </div>
          </div>
        )}

        {/* Cards Grid */}
        {plansLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-purple-600" />
          </div>
        ) : !plansData || plansData.length === 0 ? (
          <Alert className="border-amber-500/30 bg-amber-500/10 max-w-xl mx-auto">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <AlertTitle className="text-amber-900 dark:text-amber-200">
              No Plans Available
            </AlertTitle>
            <AlertDescription className="text-amber-800 dark:text-amber-300">
              Subscription plans are not set up yet. Please contact support.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="flex flex-wrap justify-center items-center gap-8">
            {sortedPlans.map((plan, index) => {
              const theme = planThemes[index % planThemes.length];
              const IconComponent = theme.icon;
              const isHovered = hoveredCardIndex === index;
              const isFree = isFreeTrial(plan);
              
              // Highlight logic: either active subscription or selected plan
              const isCurrentActive = activePlanId === plan.id;
              const isUserSelected = selectedPlanId === plan.id;
              const isHighlighted = isCurrentActive || isUserSelected;

              const monthlyPrice =
                plan.prices.find((p) => p.period === "MONTHLY")?.price ?? 0;

              return (
                <div
                  key={plan.id}
                  onMouseEnter={() => setHoveredCardIndex(index)}
                  onMouseLeave={() => setHoveredCardIndex(null)}
                  onClick={() => openDrawer(plan)}
                  className={`w-[18.5rem] h-[25.5rem] cursor-pointer transition-all duration-300 ease-out transform relative ${
                    isHovered || isHighlighted ? "-translate-y-2" : "translate-y-0"
                  } ${isHighlighted ? "scale-[1.02]" : ""}`}
                >
                  <div
                    className={`relative w-full h-full rounded-2xl p-5 flex flex-col justify-end transition-all duration-300 border-2 ${
                      isHighlighted
                        ? `${theme.bgClass} ${theme.borderClass} ${theme.activeGlow} text-white`
                        : isHovered
                        ? `${theme.bgClass} border-transparent ${theme.shadowClass} text-white`
                        : "bg-[#ebecee] dark:bg-slate-900 border-transparent text-slate-800 dark:text-slate-200"
                    }`}
                  >
                    {/* Top Floating Badge for Selected/Active Package */}
                    {isHighlighted && (
                      <div className="absolute -top-3.5 left-0 right-0 mx-auto w-max z-20">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-white text-slate-900 shadow-md border border-slate-200">
                          <CheckCircle2 className={`w-3.5 h-3.5 ${theme.textClass}`} />
                          {isCurrentActive ? "Active Plan" : "Selected"}
                        </span>
                      </div>
                    )}

                    <div className="absolute top-4 left-0 right-0 mx-auto w-[90%] h-[76%] bg-white dark:bg-slate-800 rounded-xl p-5 flex flex-col transition-colors duration-300 shadow-xs">
                      <div className="flex items-center justify-between">
                        <IconComponent className={`w-8 h-8 ${theme.textClass}`} />
                        {isFree && (
                          <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2.5 py-0.5 rounded-full">
                            Trial
                          </span>
                        )}
                      </div>

                      <p className={`font-black text-lg capitalize mt-2 ${theme.textClass}`}>
                        {plan.name}
                      </p>

                      {/* Redesigned "Starts from ৳..." Price Banner */}
                      <div className="my-2.5">
                        <div
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-current/10 ${theme.badgeBg} dark:bg-slate-700/50`}
                        >
                          <span className="text-xs font-medium opacity-80">Starts from</span>
                          <span className="text-base font-extrabold tracking-tight">
                            ৳{isFree ? "0" : monthlyPrice.toLocaleString()}
                          </span>
                          <span className="text-[11px] font-semibold opacity-75">
                            {isFree ? "/30 days" : "/mo"}
                          </span>
                        </div>
                      </div>

                      <ul className="mt-2 space-y-2 text-xs text-slate-600 dark:text-slate-300 p-0 m-0 list-none">
                        <li className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${theme.bgClass}`} />
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            Up to {plan.maxTurfs} {plan.maxTurfs === 1 ? "Turf" : "Turfs"}
                          </span>
                        </li>
                        {isFree ? (
                          <li className="flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${theme.bgClass}`} />
                            <span>30 days full access free</span>
                          </li>
                        ) : (
                          <li className="flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${theme.bgClass}`} />
                            <span>Flexible billing cycles</span>
                          </li>
                        )}
                        {plan.features.slice(0, 2).map((feat, i) => (
                          <li key={i} className="flex items-center gap-2 truncate">
                            <span className={`w-1.5 h-1.5 rounded-full ${theme.bgClass}`} />
                            <span className="truncate">{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex items-center justify-between font-bold text-sm capitalize z-10 px-1 pb-1">
                      <span className={isHovered || isHighlighted ? "text-white" : theme.textClass}>
                        {isFree ? "View Free Details" : isHighlighted ? "Manage Plan" : "Get Started Now"}
                      </span>
                      <ArrowRight
                        className={`w-5 h-5 transition-transform duration-200 ${
                          isHovered || isHighlighted
                            ? "translate-x-1 text-white"
                            : theme.textClass
                        }`}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Slide-Up Drawer */}
      {drawerPlan && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
          <div className="fixed inset-0" onClick={closeDrawer} />

          <div className="relative w-full max-w-3xl overflow-hidden rounded-t-3xl border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl z-10 max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 p-6 bg-slate-50/50 dark:bg-slate-800/50">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                  {isFreeTrial(drawerPlan) ? "Free Plan Activation" : "Select Billing Cycle"}
                </span>
                <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                  {drawerPlan.name}
                </h3>
              </div>
              <button
                onClick={closeDrawer}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {isFreeTrial(drawerPlan) ? (
                <div className="space-y-6">
                  <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center">
                    <span className="inline-block p-3 bg-purple-600 text-white rounded-full mb-3 shadow-md">
                      <Zap className="h-6 w-6" />
                    </span>
                    <h4 className="text-xl font-bold text-slate-900 dark:text-white">
                      30 Days Free Trial
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto mt-1">
                      Enjoy full access to manage your turf with zero commitments. No credit card required to start.
                    </p>

                    <Button
                      size="lg"
                      className="mt-6 w-full max-w-md text-sm font-bold bg-purple-600 hover:bg-purple-700 text-white py-6 rounded-xl shadow-lg"
                      disabled={activateSubscriptionMutation.isPending}
                      onClick={() =>
                        activateSubscriptionMutation.mutate({
                          planId: drawerPlan.id,
                          period: "MONTHLY",
                        })
                      }
                    >
                      {activateSubscriptionMutation.isPending ? (
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      ) : (
                        <Zap className="mr-2 h-5 w-5" />
                      )}
                      Activate Free Plan Now
                    </Button>

                    <p className="text-[11px] text-slate-500 mt-3 flex items-center justify-center gap-1">
                      <ShieldCheck className="h-4 w-4 text-emerald-500" />
                      Instant activation. Upgrade anytime later.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {drawerPlan.prices.map((priceData) => {
                    const periodLabel = periodLabels[priceData.period];
                    const isSelected = selectedPeriod === priceData.period;
                    const monthlyRate =
                      drawerPlan.prices.find((p) => p.period === "MONTHLY")?.price || 0;

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
                            ((monthlyRate * multiplier - priceData.price) / (monthlyRate * multiplier)) * 100)
                        : 0;

                    return (
                      <div
                        key={priceData.period}
                        onClick={() => setSelectedPeriod(priceData.period)}
                        className={`relative p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                          isSelected
                            ? "border-purple-600 bg-purple-50/50 dark:bg-purple-950/30 shadow-md ring-2 ring-purple-600/20"
                            : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                        }`}
                      >
                        {isSelected && (
                          <span className="absolute top-4 right-4 text-purple-600 dark:text-purple-400">
                            <CheckCircle2 className="h-5 w-5 fill-purple-600 text-white dark:fill-purple-400 dark:text-slate-900" />
                          </span>
                        )}

                        {savings > 0 && !isSelected && (
                          <span className="absolute top-4 right-4 px-2.5 py-1 text-[10px] font-extrabold text-emerald-700 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 rounded-full">
                            Save {savings}%
                          </span>
                        )}

                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          {periodLabel}
                        </p>
                        <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
                          ৳{priceData.price.toLocaleString()}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {priceData.period === "MONTHLY" && "Billed monthly"}
                          {priceData.period === "QUARTERLY" && "Billed every 3 months"}
                          {priceData.period === "HALF_YEARLY" && "Billed every 6 months"}
                          {priceData.period === "YEARLY" && "Billed annually"}
                        </p>

                        <Button
                          className={`w-full mt-5 text-xs font-bold py-5 rounded-xl transition-all ${
                            isSelected
                              ? "bg-purple-600 hover:bg-purple-700 text-white shadow-md"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200"
                          }`}
                          disabled={activateSubscriptionMutation.isPending}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSubscribe(drawerPlan.id, priceData.period);
                          }}
                        >
                          {activateSubscriptionMutation.isPending &&
                          selectedPeriod === priceData.period ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            "Choose Plan & Pay"
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Included with {drawerPlan.name}
                </h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                    <Check className="h-4 w-4 text-emerald-500 stroke-[3]" />
                    <span>Up to {drawerPlan.maxTurfs} Turf(s)</span>
                  </div>
                  {drawerPlan.features.map((feature, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400"
                    >
                      <Check className="h-4 w-4 text-emerald-500 stroke-[3]" />
                      <span>{feature}</span>
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