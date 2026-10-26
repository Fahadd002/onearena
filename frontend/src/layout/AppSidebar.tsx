"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarCheck,
  ChevronDown,
  ClipboardCheck,
  LayoutDashboard,
  LogOut,
  Settings,
  Trophy,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { useSidebar } from "../context/SidebarContext";
import { useAuth } from "@/lib/auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { logout } from "@/services/auth.services";
import { getDefaultDashboardRoute, UserRole } from "@/lib/authUtils";

type NavItem = {
  name: string;
  icon: LucideIcon;
  path?: string;
  paths?: Partial<Record<UserRole, string>>;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
  roles?: UserRole[];
};

const navItems: NavItem[] = [
  {
    icon: LayoutDashboard,
    name: "Dashboard",
    paths: {
      USER: "/user/dashboard",
      ADMIN: "/admin/dashboard",
      SUPER_ADMIN: "/super-admin/dashboard",
      MANAGER: "/manager/dashboard",
    },
    roles: ["USER", "ADMIN", "SUPER_ADMIN", "MANAGER"],
  },
  { icon: UserRound, name: "My Profile", path: "/my-profile" },

  { name: "Bookings", icon: CalendarCheck, path: "/user/dashboard/bookings", roles: ["USER"] },
  { name: "Reviews", icon: ClipboardCheck, path: "/user/dashboard/reviews", roles: ["USER"] },

  {
    name: "Management",
    icon: ClipboardCheck,
    subItems: [
      { name: "My Turfs", path: "/admin/dashboard/turfs" },
      { name: "Bookings", path: "/admin/dashboard/bookings" },
      { name: "Reviews", path: "/admin/dashboard/reviews" },
      // { name: "Packages", path: "/admin/dashboard/packages" },
      { name: "Invoices", path: "/admin/dashboard/invoices" },
    ],
    roles: ["ADMIN"],
  },
  {
    name: "Configuration",
    icon: Settings,
    subItems: [
      { name: "Time Setup", path: "/admin/dashboard/time-setup" },
      { name: "Pricing & Slots", path: "/admin/dashboard/pricing-and-slots-setup" },
      { name: "Content Studio", path: "/admin/dashboard/content-studio" },
      { name: "My Subscription", path: "/admin/dashboard/my-subscription" },
    ],
    roles: ["ADMIN"],
  },

  {
    name: "Management",
    icon: ClipboardCheck,
    subItems: [
      { name: "Subscriptions", path: "/super-admin/dashboard/subscriptions-management" },
      { name: "Applications", path: "/super-admin/dashboard/owner-applications" },
      { name: "Turf Approvals", path: "/super-admin/dashboard/turfs" },
      { name: "Users", path: "/super-admin/dashboard/users" },
    ],
    roles: ["SUPER_ADMIN"],
  },
  {
    name: "Configuration",
    icon: Settings,
    subItems: [
      { name: "Subscription Plans", path: "/super-admin/dashboard/subscription-setup" },
      { name: "Categories", path: "/super-admin/dashboard/categories" },
      { name: "Facilities", path: "/super-admin/dashboard/facilities" },
    ],
    roles: ["SUPER_ADMIN"],
  },
];

const othersItems: NavItem[] = [];

const filterByRole = (items: NavItem[], role?: UserRole) => {
  if (!role) return items;
  return items.filter((item) => !item.roles || item.roles.includes(role));
};

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered, toggleMobileSidebar } = useSidebar();
  const pathname = usePathname();
  const router = useRouter();
  const { session } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const role = session?.user?.role as UserRole | undefined;

  const mainNavItems = useMemo(() => filterByRole(navItems, role), [role]);
  const otherNavItems = useMemo(() => filterByRole(othersItems, role), [role]);

  const [openSubmenu, setOpenSubmenu] = useState<{ type: "main" | "others"; index: number } | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>({});
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const getNavPath = useCallback(
    (nav: NavItem) => {
      if (nav.paths && role) return nav.paths[role];
      return nav.path;
    },
    [role]
  );

  const isActive = useCallback(
    (path: string) => pathname === path || pathname.startsWith(path + "/"),
    [pathname]
  );

  const handleSubmenuToggle = (index: number, menuType: "main" | "others") => {
    setOpenSubmenu((prev) =>
      prev && prev.type === menuType && prev.index === index ? null : { type: menuType, index }
    );
  };

  const renderMenuItems = (items: NavItem[], menuType: "main" | "others") => (
    <ul className="flex flex-col gap-4">
      {items.map((nav, index) => {
        const navPath = getNavPath(nav);
        const submenuKey = `${menuType}-${index}`;
        const submenuOpen = openSubmenu?.type === menuType && openSubmenu?.index === index;

        return (
          <li key={`${menuType}-${nav.name}-${index}`} className="menu-list-item">
            {nav.subItems ? (
              <button
                type="button"
                onClick={() => handleSubmenuToggle(index, menuType)}
                className={`menu-item group cursor-pointer ${submenuOpen ? "menu-item-active" : "menu-item-inactive"} ${!isExpanded && !isHovered ? "lg:justify-center" : "lg:justify-start"}`}
              >
                <span className={`menu-item-icon ${submenuOpen ? "menu-item-icon-active" : "menu-item-icon-inactive"}`}>
                  <nav.icon className="h-5 w-5" aria-hidden="true" />
                </span>

                {(isExpanded || isHovered || isMobileOpen) && <span className="menu-item-text">{nav.name}</span>}

                {(isExpanded || isHovered || isMobileOpen) && (
                  <ChevronDown className={`ml-auto h-5 w-5 transition-transform duration-200 ${submenuOpen ? "rotate-180 text-primary" : ""}`} />
                )}
              </button>
            ) : (
              navPath && (
                <Link
                  href={navPath}
                  onClick={() => isMobileOpen && toggleMobileSidebar()}
                  className={`menu-item group ${isActive(navPath) ? "menu-item-active" : "menu-item-inactive"}`}
                >
                  <span className={`menu-item-icon ${isActive(navPath) ? "menu-item-icon-active" : "menu-item-icon-inactive"}`}>
                    <nav.icon className="h-5 w-5" aria-hidden="true" />
                  </span>

                  {(isExpanded || isHovered || isMobileOpen) && <span className="menu-item-text">{nav.name}</span>}
                </Link>
              )
            )}

            {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
              <div
                ref={(el) => {
                  subMenuRefs.current[submenuKey] = el;
                }}
                className="overflow-hidden transition-all duration-300"
                style={{ height: submenuOpen ? `${subMenuHeight[submenuKey] || 0}px` : "0px" }}
              >
                <ul className="menu-submenu ml-6 mt-2 space-y-1 border-l border-sidebar-border pl-3">
                  {nav.subItems.map((subItem) => (
                    <li key={subItem.path}>
                      <Link
                        href={subItem.path}
                        onClick={() => isMobileOpen && toggleMobileSidebar()}
                        className={`menu-dropdown-item ${isActive(subItem.path) ? "menu-dropdown-item-active" : "menu-dropdown-item-inactive"}`}
                      >
                        {subItem.name}

                        <span className="ml-auto flex items-center gap-1">
                          {subItem.new && (
                            <span className={`${isActive(subItem.path) ? "menu-dropdown-badge-active" : "menu-dropdown-badge-inactive"} menu-dropdown-badge`}>
                              new
                            </span>
                          )}

                          {subItem.pro && (
                            <span className={`${isActive(subItem.path) ? "menu-dropdown-badge-active" : "menu-dropdown-badge-inactive"} menu-dropdown-badge`}>
                              pro
                            </span>
                          )}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );

  useEffect(() => {
    let submenuMatched = false;
    let matchedSubmenu: { type: "main" | "others"; index: number } | null = null;

    ["main", "others"].forEach((menuType) => {
      const items = menuType === "main" ? mainNavItems : otherNavItems;

      items.forEach((nav, index) => {
        if (nav.subItems) {
          nav.subItems.forEach((subItem) => {
            if (isActive(subItem.path)) {
              matchedSubmenu = { type: menuType as "main" | "others", index };
              submenuMatched = true;
            }
          });
        }
      });
    });

    setOpenSubmenu((current) => {
      if (!submenuMatched) return current === null ? current : null;
      if (
        matchedSubmenu &&
        current?.type === matchedSubmenu.type &&
        current.index === matchedSubmenu.index
      ) {
        return current;
      }
      return matchedSubmenu;
    });
  }, [pathname, isActive, mainNavItems, otherNavItems]);

  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      const element = subMenuRefs.current[key];

      if (element) {
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: element.scrollHeight,
        }));
      }
    }
  }, [openSubmenu]);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      const success = await logout();

      if (success) {
        router.push("/login");
        window.location.reload();
      }
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setIsLoggingOut(false);
      toggleMobileSidebar();
    }
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <>
      <aside
        className={`fixed left-0 top-0 z-[60] flex h-screen flex-col overflow-y-auto overflow-x-hidden border-r border-sidebar-border bg-sidebar px-5 text-sidebar-foreground transition-all duration-300 ease-in-out lg:mt-0 ${isExpanded || isMobileOpen ? "w-[240px]" : isHovered ? "w-[240px]" : "w-[240px] lg:w-[90px]"} ${isMobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
        onMouseEnter={() => !isExpanded && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className={`flex h-16 items-center justify-between gap-2 ${!isExpanded && !isHovered ? "lg:justify-center" : "lg:justify-start"}`}>
          <Link href="/" aria-label="OneArena home" className="flex items-center gap-3 text-sidebar-foreground">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Trophy className="h-5 w-5" aria-hidden="true" />
            </span>

            {(isExpanded || isHovered || isMobileOpen) && (
              <span className="font-display text-xl font-bold tracking-tight">
                One<span className="text-primary">Arena</span>
              </span>
            )}
          </Link>

          <button
            type="button"
            onClick={toggleMobileSidebar}
            aria-label="Close sidebar"
            className="grid size-9 shrink-0 place-items-center rounded-full border border-sidebar-border text-sidebar-foreground transition-colors hover:bg-primary/10 hover:text-primary lg:hidden"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="no-scrollbar flex flex-1 flex-col overflow-y-auto duration-300 ease-linear">
          <nav className="mb-6">
            <div className="flex flex-col gap-4">
              <div>
                <h2 className={`mb-4 flex text-xs uppercase leading-[20px] text-sidebar-foreground/70 ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"}`}>
                  {isExpanded || isHovered || isMobileOpen ? "Menu" : "..."}
                </h2>

                {renderMenuItems(mainNavItems, "main")}
              </div>

              <div>
                <h2 className={`mb-4 flex text-xs uppercase leading-[20px] text-sidebar-foreground/70 ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"}`}>
                  {isExpanded || isHovered || isMobileOpen ? "Others" : "..."}
                </h2>

                {renderMenuItems(otherNavItems, "others")}
              </div>
            </div>
          </nav>
        </div>

        {session && (
          <div className="mt-auto border-t border-sidebar-border pt-4 lg:hidden">
            <Link
              href={getDefaultDashboardRoute(session.user.role as UserRole)}
              onClick={toggleMobileSidebar}
              className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-primary/10"
            >
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary-glow text-[10px] font-bold text-primary-foreground">
                  {getInitials(session.user.name)}
                </AvatarFallback>
              </Avatar>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-sidebar-foreground">{session.user.name}</span>
                <span className="block truncate text-xs text-sidebar-foreground/70">{session.user.email}</span>
              </span>

              <LayoutDashboard className="h-4 w-4 shrink-0 text-sidebar-foreground/70" aria-hidden="true" />
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              {isLoggingOut ? "Logging out..." : "Logout"}
            </button>
          </div>
        )}
      </aside>
    </>
  );
};

export default AppSidebar;
