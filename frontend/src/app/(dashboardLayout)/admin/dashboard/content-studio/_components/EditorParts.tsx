"use client";

import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

export function FormField({
  label,
  htmlFor,
  hint,
  error,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={htmlFor} className="text-xs font-medium text-foreground">
          {label}
        </label>
        {hint && <span className="text-2xs text-muted-foreground">{hint}</span>}
      </div>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function RowActions({
  onEdit,
  onDelete,
  deleteLabel,
  isPending,
}: {
  onEdit: () => void;
  onDelete: () => void;
  deleteLabel: string;
  isPending?: boolean;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        onClick={onEdit}
        className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
      >
        Edit
      </button>
      <button
        type="button"
        onClick={onDelete}
        disabled={isPending}
        aria-label={deleteLabel}
        className="rounded-md px-2 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
      >
        Delete
      </button>
    </div>
  );
}

export function StatusPill({
  active,
  activeLabel = "Active",
  inactiveLabel = "Hidden",
}: {
  active: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-2xs font-semibold uppercase tracking-wide",
        active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
      )}
    >
      {active ? activeLabel : inactiveLabel}
    </span>
  );
}

/** Accordion card — one section, expandable, with status indicator. */
export function SectionCard({
  icon: Icon,
  title,
  description,
  isOpen,
  onToggle,
  isConfigured,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  isOpen: boolean;
  onToggle: () => void;
  isConfigured: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border bg-card transition-all",
        isOpen ? "border-primary/40 shadow-sm" : "border-border",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-muted/30"
      >
        <div
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-lg transition-colors",
            isConfigured
              ? "bg-primary/15 text-primary"
              : "bg-muted text-muted-foreground",
          )}
        >
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">{title}</p>
            {isConfigured ? (
              <span className="size-1.5 rounded-full bg-primary" aria-hidden />
            ) : (
              <span className="text-2xs text-muted-foreground">Not set</span>
            )}
          </div>
          {description && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {isOpen && (
        <div className="space-y-4 border-t border-border p-4">{children}</div>
      )}
    </div>
  );
}