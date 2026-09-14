"use client";

import { Loader2 } from "lucide-react";

type LoadingStateProps = {
  message?: string;
};

export function TableLoadingState({ message = "Loading..." }: LoadingStateProps) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span className="text-sm">{message}</span>
    </div>
  );
}

export function TableEmptyState({ message = "No results found", description }: { message?: string; description?: string }) {
  return (
    <div className="py-12 text-center">
      <p className="text-title-md font-semibold">{message}</p>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}
