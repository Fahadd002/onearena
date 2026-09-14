"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
    MapPinned,
    CalendarDays,
    CircleDollarSign,
    Percent,
    ArrowUpRight,
    BarChart3,
} from "lucide-react";
import { httpClient } from "@/lib/axios/httpClient";
import { API_ENDPOINTS } from "@/lib/api/config";
import { KpiCard } from "@/components/premium/KpiCard";
import { Card, CardContent } from "@/components/ui/card";

type OwnerOverview = {
    turfs: number;
    bookings: number;
    grossRevenue: string | number;
    commission: string | number;
    netRevenue: string | number;
};

export default function OwnerDashboardPage() {
    const { data, isLoading, isError } = useQuery({
        queryKey: ["owner-overview"],
        queryFn: async () =>
            (await httpClient.get<OwnerOverview>(
                API_ENDPOINTS.marketplace.ownerDashboard
            )).data,
    });

    const kpiMetrics = data
        ? [
              { label: "Managed turfs", value: data.turfs, icon: MapPinned },
              { label: "Total bookings", value: data.bookings, icon: CalendarDays },
              {
                  label: "Gross revenue",
                  value: `৳ ${Number(data.grossRevenue).toLocaleString()}`,
                  icon: CircleDollarSign,
              },
              {
                  label: "Net revenue",
                  value: `৳ ${Number(data.netRevenue).toLocaleString()}`,
                  icon: CircleDollarSign,
              },
          ]
        : [];

    const quickLinks = [
        {
            label: "Venue operations",
            value: "Manage turfs",
            icon: MapPinned,
            href: "/admin/dashboard/turfs",
            color: "text-primary",
        },
        {
            label: "Bookings",
            value: "Review reservations",
            icon: CalendarDays,
            href: "/admin/dashboard/bookings",
            color: "text-accent",
        },
        {
            label: "Earnings",
            value: "View settlement",
            icon: CircleDollarSign,
            href: "/admin/dashboard/commissions",
            color: "text-success",
        },
        {
            label: "Analytics",
            value: "Performance reports",
            icon: BarChart3,
            href: "/admin/dashboard",
            color: "text-warning",
        },
    ];

    return (
        <div className="space-y-8">
            <div>
                <p className="dashboard-meta">Owner area</p>
                <h1 className="dashboard-title">Your dashboard</h1>
                <p className="mt-3 text-muted-foreground">
                    Manage your turfs, bookings, and earnings.
                </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
                                    <p className={`mt-1 text-lg font-semibold ${link.color}`}>
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
