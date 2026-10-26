"use client";

import { SidebarProvider, useSidebar } from "@/context/SidebarContext";
import { SearchProvider } from "@/context/SearchContext";
import AppHeader from "@/layout/AppHeader";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";
import React from "react";

function ManagerDashboardContent({ children }: { children: React.ReactNode }) {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();

  const mainContentMargin = isMobileOpen
    ? "ml-0"
    : isExpanded || isHovered
    ? "lg:ml-[240px]"
    : "lg:ml-[90px]";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppSidebar />
      <Backdrop />
      <div className={`flex-1 transition-all duration-300 ease-in-out ${mainContentMargin}`}>
        <AppHeader />
        <div className="mx-auto max-w-(--breakpoint-2xl) px-2">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <SearchProvider>
        <ManagerDashboardContent>{children}</ManagerDashboardContent>
      </SearchProvider>
    </SidebarProvider>
  );
}
