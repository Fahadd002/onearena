"use client";

import { useQuery } from "@tanstack/react-query";
import { differenceInCalendarDays, parseISO } from "date-fns";
import Link from "next/link";
import { Clock3 } from "lucide-react";
import { formatDate } from "@/lib/time-utils";
import { API_ENDPOINTS } from "@/lib/api/config";
import { httpClient } from "@/lib/axios/httpClient";

interface CurrentSubscription {
  endDate: string;
}

function getDaysRemaining(endDateValue: string): number | null {
  const endDate = parseISO(endDateValue.slice(0, 10));
  if (Number.isNaN(endDate.getTime())) return null;
  return differenceInCalendarDays(endDate, new Date());
}

export function AdminSubscriptionTicker() {
  const { data: subscription } = useQuery({
    queryKey: ["admin-current-subscription"],
    queryFn: async () => {
      const response = await httpClient.get<CurrentSubscription | null>(
        API_ENDPOINTS.subscription.mySubscription,
      );
      if (!response.success) {
        throw new Error(response.message || "Failed to fetch current subscription");
      }
      return response.data;
    },
    staleTime: 30000,
    refetchInterval: 60000,
  });

  if (!subscription) return null;

  const daysRemaining = getDaysRemaining(subscription.endDate);
  if (daysRemaining === null || daysRemaining > 7) return null;

  const endDate = formatDate(subscription.endDate, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const message =
    daysRemaining < 0
      ? `Your subscription expired on ${endDate}. Renew your subscription.`
      : daysRemaining === 0
        ? `Your subscription expires today (${endDate}). Renew now.`
        : `Your subscription expires in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"} (${endDate}). Renew now.`;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-amber-500/30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="overflow-hidden px-4 py-2">
        <div className="flex w-max animate-admin-subscription-ticker items-center gap-8">
          {[0, 1].map((copy) => (
            <Link
              key={copy}
              href="/admin/dashboard/my-subscription"
              aria-hidden={copy === 1}
              tabIndex={copy === 1 ? -1 : undefined}
              className="flex items-center gap-2 whitespace-nowrap text-xs font-semibold text-amber-600 hover:underline dark:text-amber-400 sm:text-sm"
            >
              <Clock3 className="h-4 w-4" />
              {message}
            </Link>
          ))}
        </div>
      </div>
      <style>{`
        @keyframes admin-subscription-ticker {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .animate-admin-subscription-ticker {
          animation: admin-subscription-ticker 30s linear infinite;
        }
      `}</style>
    </div>
  );
}
