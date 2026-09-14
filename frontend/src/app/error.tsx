"use client";

import { useEffect } from "react";
import StatusPage from "@/components/common/StatusPage";

export default function GlobalError({ error, reset }: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return <StatusPage type="error" onRetry={reset} />;
}
