"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
    CalendarDays,
    Users,
    Shield,
    Briefcase,
    FileText,
    MessageSquare,
} from "lucide-react";
import { httpClient } from "@/lib/axios/httpClient";
import { API_ENDPOINTS } from "@/lib/api/config";
import { KpiCard } from "@/components/premium/KpiCard";
import { Badge } from "@/components/premium/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ManagerOverview = {
    assignedTurfs: Array<{
        id: string;
        name: string;
        permissions: string[];
    }>;
    activeBookings: number;
};

export default function ManagerDashboardPage() {
    const { data, isLoading, isError } = useQuery({
        queryKey: ["manager-overview"],
        queryFn: async () =>
            (await httpClient.get<ManagerOverview>(
                API_ENDPOINTS.marketplace.managerDashboard
            )).data,
    });

    const kpiMetrics = data
        ? [
              {
                  label: "Assigned turfs",
                  value: data.assignedTurfs?.length ?? 0,
                  icon: MapPinnedIcon,
              },
              {
                  label: "Active bookings",
                  value: data.activeBookings ?? 0,
                  icon: CalendarDays,
              },
              {
                  label: "Permissions",
                  value:
                      data.assignedTurfs?.flatMap((t) => t.permissions).length ??
                      0,
                  icon: Shield,
              },
          ]
        : [];

    const quickLinks = [
        { label: "My turfs", value: "View venues", icon: MapPinnedIcon, href: "/manager/dashboard/turfs" },
        { label: "Bookings", value: "Manage reservations", icon: CalendarDays, href: "/manager/dashboard/bookings" },
        { label: "Reviews", value: "Customer feedback", icon: MessageSquare, href: "/manager/dashboard/reviews" },
        { label: "Invitations", value: "Team access", icon: Briefcase, href: "/manager/dashboard/invitations" },
    ];

    return (
        <div className="space-y-8">
            <div>
                <p className="dashboard-meta">Manager area</p>
                <h1 className="dashboard-title">Your dashboard</h1>
                <p className="mt-3 text-muted-foreground">
                    Assigned turfs, active bookings, and operational overview.
                </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
                {kpiMetrics.map((metric) => (
                    <KpiCard
                        key={metric.label}
                        icon={metric.icon}
                        label={metric.label}
                        value={metric.value}
                        loading={isLoading}
                    />
                ))}
            </div>

            <Card className="surface-elevated">
                <CardHeader>
                    <CardTitle>Assigned turfs</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-3">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div
                                    key={i}
                                    className="h-14 animate-pulse rounded-lg bg-muted"
                                />
                            ))}
                        </div>
                    ) : isError ? (
                        <p className="text-destructive">
                            Could not load your assigned turfs.
                        </p>
                    ) : data?.assignedTurfs?.length ? (
                        <div className="space-y-3">
                            {data.assignedTurfs.map((turf) => (
                                <div
                                    key={turf.id}
                                    className="flex items-center justify-between rounded-xl border border-border bg-secondary/20 px-4 py-3"
                                >
                                    <div>
                                        <p className="font-medium">{turf.name}</p>
                                        <div className="mt-1 flex flex-wrap gap-1.5">
                                            {turf.permissions.map((perm) => (
                                                <Badge key={perm} variant="outline" size="sm">
                                                    {perm.replace(/_/g, " ")}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                    <Link
                                        href={`/manager/dashboard/turfs/${turf.id}`}
                                        className="text-sm font-medium text-primary"
                                    >
                                        Open →
                                    </Link>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            You have no turfs assigned yet.
                        </p>
                    )}
                </CardContent>
            </Card>

            <div>
                <h2 className="text-title-2xl font-semibold mb-4">Quick actions</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {quickLinks.map((link) => (
                        <Link key={link.href} href={link.href} className="block">
                            <Card className="surface-elevated h-full transition-all duration-300 hover:border-primary/60 hover:shadow-elevated">
                                <CardContent className="pt-5">
                                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                        <link.icon className="h-5 w-5" />
                                    </div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        {link.label}
                                    </p>
                                    <p className="mt-1 text-lg font-semibold text-primary">
                                        {link.value}
                                    </p>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}

function MapPinnedIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
        >
            <path d="M21 10c0 6-9 13-9 13s-9-7-9-13a9 9 0 0118 0z" />
            <circle cx="12" cy="7" r="3" />
        </svg>
    );
}
