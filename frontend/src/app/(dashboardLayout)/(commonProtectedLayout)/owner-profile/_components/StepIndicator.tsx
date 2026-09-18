"use client";

import type { ComponentType } from "react";
import { CheckCircle, User, FileText, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const profileCompleted = status === "PENDING" || status === "SUBMITTED" || status === "APPROVED" || status === "REJECTED";
  const documentsSubmitted = status === "SUBMITTED" || status === "APPROVED";

  const steps: StepDefinition[] = [
    {
      id: "profile",
      label: "Profile",
      icon: User,
      completed: profileCompleted,
      locked: false,
      href: "/owner-profile/profile",
    },
    {
      id: "documents",
      label: "Documents",
      icon: FileText,
      completed: documentsSubmitted,
      locked: !profileCompleted,
      href: "/owner-profile/documents",
    },
    {
      id: "subscription",
      label: "Plan",
      icon: Zap,
      completed: isApproved,
      locked: false,
      href: "/owner-profile/subscription",
    },
  ];

  return (
    <ol className="flex items-center justify-center space-x-1 md:space-x-2" aria-label="Progress steps">
      {steps.map((step, index) => {
        const Icon = step.icon;
        const isActive = step.id === currentStep;
        const isCompleted = step.completed;
        const isLocked = step.locked;
        const isLast = index === steps.length - 1;

        return (
          <li key={step.id} className="flex items-center">
            {isLocked ? (
              <div
                className="flex items-center justify-center w-9 h-9 rounded-full bg-muted text-muted-foreground cursor-not-allowed"
                aria-current="step"
              >
                <Icon className="h-4 w-4" />
              </div>
            ) : (
              <Button
                variant={
                  isActive
                    ? "default"
                    : isCompleted
                      ? "outline"
                      : "ghost"
                }
                size="icon"
                className={`h-9 w-9 rounded-full ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : isCompleted
                      ? "border-green-500 text-green-600"
                      : ""
                }`}
                onClick={() => router.push(step.href)}
                aria-current={isActive ? "step" : undefined}
              >
                {isCompleted && !isActive ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </Button>
            )}

            <span
              className={`ml-1.5 text-sm font-medium ${
                isActive
                  ? "text-primary"
                  : isCompleted
                    ? "text-green-600"
                    : isLocked
                      ? "text-muted-foreground"
                      : "text-muted-foreground"
              } whitespace-nowrap`}
            >
              {step.label}
            </span>

            {!isLast && (
              <div
                className={`hidden md:block w-8 h-0.5 bg-muted ${
                  isCompleted ? "bg-green-500" : ""
                }`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}