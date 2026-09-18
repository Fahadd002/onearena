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

export default function OwnerProfileHeader({ profile, currentStep }: OwnerProfileHeaderProps) {
  const router = useRouter();
  const status = profile?.verificationStatus ?? "PENDING";

  return (
    <div className="sticky top-0 z-10 border-b border-border/70 bg-background/90 backdrop-blur-md">
      <div className="container mx-auto max-w-6xl px-4 py-4 lg:px-8">
        <div className="grid grid-cols-3 gap-4 items-center">
          {/* Left: User Info */}
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight truncate">
              {profile?.user?.name || "Owner"}
            </h1>
          </div>

          {/* Center: Step Indicator */}
          <div className="justify-self-center">
            <StepIndicator currentStep={currentStep || "profile"} profile={profile} />
          </div>

          {/* Right: Status + Home */}
          <div className="flex items-center justify-end gap-3">
            {statusBadge[status]}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/")}
              className="flex items-center gap-2 h-9"
            >
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Home</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}