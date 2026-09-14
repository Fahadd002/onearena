"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
    Users,
    UserCheck,
    Briefcase,
    LayoutGrid,
    CalendarDays,
    CircleDollarSign,
    Percent,
    Clock,
    UserPlus,
    Shield,
} from "lucide-react";
import { httpClient } from "@/lib/axios/httpClient";
import { API_ENDPOINTS } from "@/lib/api/config";
import { KpiCard } from "@/components/premium/KpiCard";
import { Card, CardContent } from "@/components/ui/card";

type PlatformOverview = {
    users: number;
    owners: number;
    managers: number;
    turfs: number;
    bookings: number;
    pendingOwners: number;
    totalRevenue: string | number;
    platformCommission: string | number;
    pendingPayments: number;
};

export default function SuperAdminDashboardPage() {
    const { data, isLoading, isError } = useQuery({
        queryKey: ["platform-overview"],
        queryFn: async () =>
            (await httpClient.get<PlatformOverview>(
                API_ENDPOINTS.marketplace.adminDashboard
            )).data,
    });

    const kpiMetrics = data
        ? [
              { label: "Users", value: data.users, icon: Users },
              { label: "Owners", value: data.owners, icon: UserCheck },
              { label: "Managers", value: data.managers, icon: Briefcase },
              { label: "Live venues", value: data.turfs, icon: LayoutGrid },
              { label: "Bookings", value: data.bookings, icon: CalendarDays },
              {
                  label: "Total revenue",
                  value: `৳ ${Number(data.totalRevenue).toLocaleString()}`,
                  icon: CircleDollarSign,
              },
              {
                  label: "Platform commission",
                  value: `৳ ${Number(data.platformCommission).toLocaleString()}`,
                  icon: Percent,
              },
              { label: "Pending payments", value: data.pendingPayments, icon: Clock },
          ]
        : [];

    const quickLinks = [
        {
            label: "Verification queue",
            value: `${data?.pendingOwners ?? 0} applications`,
            icon: UserPlus,
            href: "/super-admin/dashboard/owner-applications",
            color: "text-primary",
        },
        {
            label: "Venue approvals",
            value: "Review turfs",
            icon: Shield,
            href: "/super-admin/dashboard/turfs",
            color: "text-accent",
        },
        {
            label: "User management",
            value: "Manage accounts",
            icon: Users,
            href: "/super-admin/dashboard/users",
            color: "text-success",
        },
    ];

    return (
        <div className="space-y-8">
            <div>
                <h1 className="dashboard-title">Super Admin Dashboard</h1>
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
