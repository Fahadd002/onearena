"use client";

import { useQuery } from "@tanstack/react-query";
import { getOwnerProfile } from "./_action";
import { ApiResponse } from "@/types/api.type";
import { OwnerProfile } from "./_types";
import { StatusTicker } from "./_components/StatusTicker";
import { Skeleton } from "@/components/ui/skeleton";

export default function OwnerProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoading } = useQuery({
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
      <div className="min-h-screen bg-background">
        <div className="container mx-auto max-w-7xl px-4 pt-6 pb-8 lg:px-8 space-y-6">
          <Skeleton className="h-10 w-full max-w-xs rounded-xl" />
          <Skeleton className="h-4 w-64 rounded" />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-[26rem] w-full rounded-2xl" />
            ))}
          </div>
        </div>
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