"use client";

import Link from "next/link";
import { Home, RefreshCw, SearchX, TriangleAlert } from "lucide-react";

type StatusPageProps = { type: "error" | "not-found"; onRetry?: () => void };

const pageContent = {
  error: { Icon: TriangleAlert, title: "Something went wrong", description: "We couldn't load this page. Please try again." },
  "not-found": { Icon: SearchX, title: "Page not found", description: "The page you requested does not exist or may have moved." },
};

export default function StatusPage({ type, onRetry }: StatusPageProps) {
  const { Icon, title, description } = pageContent[type];

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <section className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-elevated">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <Icon className="h-7 w-7" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-2xl font-bold">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
        <div className="mt-7 flex justify-center gap-3">
          <Link href="/" className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted">
            <Home className="h-4 w-4" aria-hidden="true" /> Home
          </Link>
          {onRetry && (
            <button type="button" onClick={onRetry} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90">
              <RefreshCw className="h-4 w-4" aria-hidden="true" /> Try again
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
