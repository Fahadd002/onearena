"use client";

import type { ComponentType } from "react";
import { CheckCircle, User, FileText, Zap, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { OwnerProfile } from "../_types";

type Step = "profile" | "documents" | "subscription";

interface StepIndicatorProps {
  currentStep: Step;
  profile: OwnerProfile | null | undefined;
}

interface StepDefinition {
  id: Step;
  label: string;
  shortLabel: string;
  icon: ComponentType<{ className?: string }>;
  completed: boolean;
  locked: boolean;
  href: string;
}

export default function StepIndicator({
  currentStep,
  profile,
}: StepIndicatorProps) {
  const router = useRouter();
  const status = profile?.verificationStatus;

  const isApproved = status === "APPROVED";
  const profileCompleted =
    status === "PENDING" ||
    status === "SUBMITTED" ||
    status === "APPROVED" ||
    status === "REJECTED";
  const documentsSubmitted = status === "SUBMITTED" || status === "APPROVED";

  const steps: StepDefinition[] = [
    {
      id: "profile",
      label: "Profile",
      shortLabel: "Profile",
      icon: User,
      completed: profileCompleted,
      locked: false,
      href: "/owner-profile/profile",
    },
    {
      id: "documents",
      label: "Documents",
      shortLabel: "Docs",
      icon: FileText,
      completed: documentsSubmitted,
      locked: !profileCompleted,
      href: "/owner-profile/documents",
    },
    {
      id: "subscription",
      label: "Subscription",
      shortLabel: "Plan",
      icon: Zap,
      completed: isApproved,
      locked: false,
      href: "/owner-profile/subscription",
    },
  ];

  const currentIndex = steps.findIndex((s) => s.id === currentStep);

  return (
    <nav
      aria-label="Onboarding progress"
      className="flex items-center justify-center"
    >
      <ol className="flex items-center">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = step.id === currentStep;
          const isCompleted = step.completed;
          const isLocked = step.locked;
          const isLast = index === steps.length - 1;
          const isPast = index < currentIndex;

          const nodeState = isLocked
            ? "locked"
            : isActive
              ? "active"
              : isCompleted
                ? "completed"
                : "upcoming";

          return (
            <li key={step.id} className="flex items-center">
              {/* Step node */}
              <button
                type="button"
                disabled={isLocked}
                onClick={() => !isLocked && router.push(step.href)}
                aria-current={isActive ? "step" : undefined}
                aria-disabled={isLocked}
                className={`group flex flex-col items-center gap-0.5 focus:outline-none ${
                  isLocked ? "cursor-not-allowed" : "cursor-pointer"
                }`}
              >
                <span
                  className={[
                    "relative flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full border-2 transition-all duration-300",
                    nodeState === "active"
                      ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/15 scale-105"
                      : nodeState === "completed"
                        ? "border-green-500 bg-green-500 text-white shadow-sm shadow-green-500/30"
                        : nodeState === "locked"
                          ? "border-muted bg-muted/30 text-muted-foreground/50"
                          : "border-border bg-background text-muted-foreground group-hover:border-primary/50 group-hover:text-primary",
                  ].join(" ")}
                >
                  {nodeState === "completed" ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : nodeState === "locked" ? (
                    <Lock className="h-3.5 w-3.5" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}

                  {/* Step number badge */}
                  <span
                    className={[
                      "absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold border-2 border-background",
                      nodeState === "active"
                        ? "bg-primary text-white"
                        : nodeState === "completed"
                          ? "bg-green-600 text-white"
                          : "bg-muted text-muted-foreground",
                    ].join(" ")}
                  >
                    {index + 1}
                  </span>
                </span>

                <span
                  className={[
                    "text-[9px] sm:text-[10px] font-semibold tracking-wide transition-colors leading-none",
                    nodeState === "active"
                      ? "text-primary"
                      : nodeState === "completed"
                        ? "text-green-600 dark:text-green-400"
                        : nodeState === "locked"
                          ? "text-muted-foreground/50"
                          : "text-muted-foreground group-hover:text-primary",
                  ].join(" ")}
                >
                  <span className="hidden sm:inline">{step.label}</span>
                  <span className="sm:hidden">{step.shortLabel}</span>
                </span>
              </button>

              {/* Connector line */}
              {!isLast && (
                <div className="mx-1 sm:mx-2 mt-0.5 h-0.5 w-5 sm:w-8 md:w-10 rounded-full bg-border overflow-hidden self-center">
                  <div
                    className={[
                      "h-full transition-all duration-500 rounded-full",
                      isCompleted || isPast
                        ? "w-full bg-green-500"
                        : isActive
                          ? "w-1/2 bg-primary"
                          : "w-0",
                    ].join(" ")}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}