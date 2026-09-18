"use client";

import { useQuery } from "@tanstack/react-query";
import { getOwnerProfile } from "../_action";
import { ApiResponse } from "@/types/api.type";
import { OwnerProfile } from "../_types";
import { AlertCircle, CheckCircle, XCircle, Loader2, FileText } from "lucide-react";

interface TickerMessage {
  type: "pending" | "rejected" | "approved" | "update_required" | "created" | "submitted";
  text: string;
  icon: React.ReactNode;
  className: string;
}

export function StatusTicker() {
  const { data: profileData, isLoading } = useQuery({
    queryKey: ["owner-profile-ticker"],
    queryFn: async () => {
      const res = await getOwnerProfile();
      if (!res.success) throw new Error(res.message);
      return (res as ApiResponse<OwnerProfile>).data ?? null;
    },
    staleTime: 30000,
    refetchInterval: 60000,
  });

  if (isLoading || !profileData) return null;

  const status = profileData.verificationStatus;
  const reviewNote = profileData.rejectionReason;

  const messages: TickerMessage[] = [];

  switch (status) {
    case "CREATED":
      messages.push({
        type: "created",
        text: "Welcome — Complete your profile to get started. Fill all fields and continue.",
        icon: <FileText className="h-4 w-4" />,
        className: "text-blue-600 dark:text-blue-400",
      });
      break;

    case "PENDING":
      if (reviewNote) {
        messages.push({
          type: "update_required",
          text: `Update Required — Reason: ${reviewNote}. Please update and resubmit.`,
          icon: <AlertCircle className="h-4 w-4" />,
          className: "text-amber-600 dark:text-amber-400",
        });
      } else {
        messages.push({
          type: "pending",
          text: "Complete Your Profile — Fill all fields, upload documents, and submit for review.",
          icon: <AlertCircle className="h-4 w-4" />,
          className: "text-amber-600 dark:text-amber-400",
        });
      }
      break;

    case "SUBMITTED":
      messages.push({
        type: "submitted",
        text: "Application Submitted — Thank you for registration. System Administrator will review your application and contact you soon.",
        icon: <FileText className="h-4 w-4" />,
        className: "text-blue-600 dark:text-blue-400",
      });
      break;

    case "REJECTED":
      if (reviewNote) {
        messages.push({
          type: "rejected",
          text: `Application Rejected — Reason: ${reviewNote}. Please update and resubmit.`,
          icon: <XCircle className="h-4 w-4" />,
          className: "text-red-600 dark:text-red-400",
        });
      } else {
        messages.push({
          type: "rejected",
          text: "Application Rejected — Please update and resubmit.",
          icon: <XCircle className="h-4 w-4" />,
          className: "text-red-600 dark:text-red-400",
        });
      }
      break;

    case "APPROVED":
      messages.push({
        type: "approved",
        text: "Approved! — Profile verified. Manage your subscription plan.",
        icon: <CheckCircle className="h-4 w-4" />,
        className: "text-green-600 dark:text-green-400",
      });
      break;
  }

  if (messages.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-4 px-4 py-2 min-w-max animate-ticker">
        {messages.map((msg, idx) => (
          <span key={idx} className={`flex items-center gap-2 ${msg.className} whitespace-nowrap`}>
            {msg.icon}
            <span>{msg.text}</span>
          </span>
        ))}
      </div>
      <style>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-ticker {
          animation: ticker 30s linear infinite;
        }
      `}</style>
    </div>
  );
}