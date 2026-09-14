import { cn } from "@/lib/utils";
import type { ComponentType } from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

interface KpiCardProps {
    icon: ComponentType<{ className?: string }>;
    label: string;
    value: React.ReactNode;
    trend?: string;
    trendDirection?: "up" | "down" | "neutral";
    loading?: boolean;
    className?: string;
}

export function KpiCard({
    icon: Icon,
    label,
    value,
    trend,
    trendDirection = "neutral",
    loading = false,
    className,
}: KpiCardProps) {
    return (
        <div
            className={cn(
                "surface-elevated flex flex-col rounded-xl border border-border p-5 transition-all duration-300 hover:border-primary/60",
                className
            )}
        >
            <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {label}
                </span>
            </div>
            <div className="mt-4">
                {loading ? (
                    <div className="h-8 w-2/3 animate-pulse rounded bg-muted"></div>
                ) : (
                    <p className="text-title-2xl font-semibold text-foreground">
                        {value}
                    </p>
                )}
                {trend && !loading && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        {trendDirection === "up" ? (
                            <ArrowUpRight className="h-3 w-3 text-success" />
                        ) : trendDirection === "down" ? (
                            <ArrowDownRight className="h-3 w-3 text-destructive" />
                        ) : null}
                        <span>{trend}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
