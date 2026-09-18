"use client";

import { useQuery } from "@tanstack/react-query";
import { getOwnerProfile } from "./_action";
import { ApiResponse } from "@/types/api.type";
import { OwnerProfile } from "./_types";
import { StatusTicker } from "./_components/StatusTicker";

export default function OwnerProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: profileData, isLoading } = useQuery({
    queryKey: ["owner-profile-layout"],
    queryFn: async () => {
      const res = await getOwnerProfile();
      if (!res.success) throw new Error(res.message);
      return (res as ApiResponse<OwnerProfile>).data ?? null;
    },
    staleTime: 30000,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Profile not found. Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {children}
      <StatusTicker />
    </div>
  );
}