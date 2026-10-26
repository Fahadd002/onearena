"use client";

import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { OwnerProfile } from "../_types";
import StepIndicator from "./StepIndicator";

const statusBadge = {
  CREATED: (
    <Badge variant="outline" className="border-slate-500 text-slate-600">
      Created
    </Badge>
  ),
  PENDING: (
    <Badge variant="outline" className="border-amber-500 text-amber-600">
      Pending
    </Badge>
  ),
  SUBMITTED: (
    <Badge variant="outline" className="border-blue-500 text-blue-600">
      Submitted
    </Badge>
  ),
  APPROVED: (
    <Badge variant="default" className="bg-green-600">
      Approved
    </Badge>
  ),
  REJECTED: <Badge variant="destructive">Rejected</Badge>,
};

interface OwnerProfileHeaderProps {
  profile: OwnerProfile | null | undefined;
  currentStep?: "profile" | "documents" | "subscription";
}

export default function OwnerProfileHeader({
  profile,
  currentStep,
}: OwnerProfileHeaderProps) {
  const router = useRouter();
  const status = profile?.verificationStatus ?? "PENDING";

  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/90 backdrop-blur-md">
      <div className="container mx-auto max-w-6xl px-3 sm:px-4 lg:px-8">
        <div className="flex items-center justify-between gap-2 sm:gap-4 py-3">
          {/* Left: Owner Name */}
          <div className="min-w-0 shrink-0 max-w-[120px] sm:max-w-[180px] lg:max-w-none lg:flex-1">
            <h1 className="text-sm sm:text-base lg:text-lg font-bold tracking-tight truncate">
              {profile?.user?.name || "Owner"}
            </h1>
          </div>

          {/* Center: Step Indicator */}
          <div className="flex-1 flex justify-center min-w-0">
            <StepIndicator
              currentStep={currentStep || "profile"}
              profile={profile}
            />
          </div>

          {/* Right: Status Badge + Home */}
          <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3 shrink-0">
            <span className="hidden sm:inline-flex">{statusBadge[status]}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/")}
              className="flex items-center gap-1.5 h-8 px-2 sm:px-3 text-foreground"
              aria-label="Go to home"
            >
              <Home className="h-4 w-4" />
              <span className="hidden md:inline">Home</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}