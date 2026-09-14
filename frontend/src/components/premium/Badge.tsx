import { cn } from "@/lib/utils";

export type BadgeVariant = "default" | "primary" | "secondary" | "success" | "warning" | "destructive" | "outline" | "peak";
export type BadgeSize = "sm" | "md" | "lg";

const badgeBase = "inline-flex items-center justify-center font-medium transition-colors";
const badgeVariants: Record<BadgeVariant, string> = {
    default: "bg-secondary text-secondary-foreground",
    primary: "bg-primary text-primary-foreground",
    secondary: "bg-secondary text-secondary-foreground",
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning",
    destructive: "bg-destructive/15 text-destructive",
    outline: "border border-border text-muted-foreground",
    peak: "border border-accent text-accent",
};
const badgeSizes: Record<BadgeSize, string> = {
    sm: "px-1.5 py-0.5 text-xs rounded-md",
    md: "px-2.5 py-1 text-xs rounded-lg",
    lg: "px-3 py-1.5 text-sm rounded-lg",
};

export function Badge({ variant = "default", size = "md", className, children }: { variant?: BadgeVariant; size?: BadgeSize; className?: string; children: React.ReactNode }) {
    return (
        <span
            className={cn(badgeBase, badgeVariants[variant], badgeSizes[size], className)}
        >
            {children}
        </span>
    );
}
