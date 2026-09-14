"use client";
import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  CalendarCheck,
  ChevronDown,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  LayoutDashboard,
  Package,
  Settings,
  Trophy,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { useSidebar } from "../context/SidebarContext";
import { useAuth } from "@/lib/auth";

type NavItem = {
  name: string;
  icon: LucideIcon;
  path?: string;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
  roles?: string[];
};

const navItems: NavItem[] = [
  {
    icon: LayoutDashboard,
    name: "Dashboard",
    path: "/user/dashboard",
    roles: ["USER"],
  },
  {
    icon: LayoutDashboard,
    name: "Dashboard",
    path: "/admin/dashboard",
    roles: ["ADMIN"],
  },
  {
    icon: LayoutDashboard,
    name: "Dashboard",
    path: "/super-admin/dashboard",
    roles: ["SUPER_ADMIN"],
  },
  {
    icon: LayoutDashboard,
    name: "Dashboard",
    path: "/manager/dashboard",
    roles: ["MANAGER"],
  },
  {
    icon: UserRound,
    name: "My Profile",
    path: "/my-profile",
  },
  {
    name: "Bookings",
    icon: CalendarCheck,
    path: "/user/dashboard/bookings",
    roles: ["USER"],
  },
  {
    name: "My Turfs",
    icon: Building2,
    path: "/admin/dashboard/turfs",
    roles: ["ADMIN"],
  },
  {
    name: "Pricing & Slots",
    icon: Clock3,
    path: "/admin/dashboard/pricing-and-slots-setup",
    roles: ["ADMIN"],
  },
  {
    name: "Bookings",
    icon: ClipboardList,
    path: "/admin/dashboard/bookings",
    roles: ["ADMIN", "SUPER_ADMIN"],
  },
  {
    name: "Packages",
    icon: Package,
    path: "/admin/dashboard/packages",
    roles: ["ADMIN"],
  },
  {
    name: "Content Studio",
    icon: Settings,
    path: "/admin/dashboard/content-studio",
    roles: ["ADMIN"],
  },
  {
    name: "Management",
    icon: ClipboardCheck,
    subItems: [
      { name: "Owner Applications", path: "/super-admin/dashboard/owner-applications" },
      { name: "Owner Subscriptions", path: "/super-admin/dashboard/owner-subscriptions" },
      { name: "Users", path: "/super-admin/dashboard/users" },
      { name: "Turf Approvals", path: "/super-admin/dashboard/turfs" },
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

const filterByRole = (items: NavItem[], role?: string) => {
  if (!role) return items;
  return items.filter((item) => !item.roles || item.roles.includes(role));
};

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();
  const { session } = useAuth();
  const role = session?.user?.role;

  const mainNavItems = useMemo(() => filterByRole(navItems, role), [role]);
  const otherNavItems = useMemo(() => filterByRole(othersItems, role), [role]);

  const renderMenuItems = (
    navItems: NavItem[],
    menuType: "main" | "others"
  ) => (
    <ul className="flex flex-col gap-4">
      {navItems.map((nav, index) => (
        <li key={`${menuType}-${nav.name}-${index}`} className="menu-list-item">
          {nav.subItems ? (
            <button
              onClick={() => handleSubmenuToggle(index, menuType)}
              className={`menu-item group cursor-pointer ${
                openSubmenu?.type === menuType && openSubmenu?.index === index
                  ? "menu-item-active"
                  : "menu-item-inactive"
              } ${
                !isExpanded && !isHovered
                  ? "lg:justify-center"
                  : "lg:justify-start"
              }`}
            >
              <span
                className={`menu-item-icon ${
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? "menu-item-icon-active"
                    : "menu-item-icon-inactive"
                }`}
              >
                <nav.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className={`menu-item-text`}>{nav.name}</span>
              )}
              {(isExpanded || isHovered || isMobileOpen) && (
                <ChevronDown
                  className={`ml-auto w-5 h-5 transition-transform duration-200  ${
                    openSubmenu?.type === menuType &&
                    openSubmenu?.index === index
                      ? "rotate-180 text-brand-500"
                      : ""
                  }`}
                />
              )}
            </button>
          ) : (
            nav.path && (
              <Link
                href={nav.path}
                className={`menu-item group ${
                  isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                }`}
              >
                <span
                  className={`menu-item-icon ${
                    isActive(nav.path)
                      ? "menu-item-icon-active"
                      : "menu-item-icon-inactive"
                  }`}
                >
                  <nav.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className={`menu-item-text`}>{nav.name}</span>
                )}
              </Link>
            )
          )}
          {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
            <div
              ref={(el) => {
                subMenuRefs.current[`${menuType}-${index}`] = el;
              }}
              className="overflow-hidden transition-all duration-300"
              style={{
                height:
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? `${subMenuHeight[`${menuType}-${index}`]}px`
                    : "0px",
              }}
            >
              <ul className="menu-submenu ml-6 mt-2 space-y-1 border-l border-border pl-3">
                {nav.subItems.map((subItem) => (
                  <li key={subItem.path}>
                    <Link
                      href={subItem.path}
                      className={`menu-dropdown-item ${
                        isActive(subItem.path)
                          ? "menu-dropdown-item-active"
                          : "menu-dropdown-item-inactive"
                      }`}
                    >
                      {subItem.name}
                      <span className="flex items-center gap-1 ml-auto">
                        {subItem.new && (
                          <span
                            className={`ml-auto ${
                              isActive(subItem.path)
                                ? "menu-dropdown-badge-active"
                                : "menu-dropdown-badge-inactive"
                            } menu-dropdown-badge `}
                          >
                            new
                          </span>
                        )}
                        {subItem.pro && (
                          <span
                            className={`ml-auto ${
                              isActive(subItem.path)
                                ? "menu-dropdown-badge-active"
                                : "menu-dropdown-badge-inactive"
                            } menu-dropdown-badge `}
                          >
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
      ))}
    </ul>
  );

  const [openSubmenu, setOpenSubmenu] = useState<{
    type: "main" | "others";
    index: number;
  } | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>(
    {}
  );
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const isActive = useCallback((path: string) => pathname === path || pathname.startsWith(path + "/"), [pathname]);

  useEffect(() => {
    let submenuMatched = false;
    ["main", "others"].forEach((menuType) => {
      const items = menuType === "main" ? mainNavItems : otherNavItems;
      items.forEach((nav, index) => {
        if (nav.subItems) {
          nav.subItems.forEach((subItem) => {
            if (isActive(subItem.path)) {
              setOpenSubmenu({
                type: menuType as "main" | "others",
                index,
              });
              submenuMatched = true;
            }
          });
        }
      });
    });

    if (!submenuMatched) {
      setOpenSubmenu(null);
    }
  }, [pathname, isActive, mainNavItems, otherNavItems]);

  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  const handleSubmenuToggle = (index: number, menuType: "main" | "others") => {
    setOpenSubmenu((prevOpenSubmenu) => {
      if (
        prevOpenSubmenu &&
        prevOpenSubmenu.type === menuType &&
        prevOpenSubmenu.index === index
      ) {
        return null;
      }
      return { type: menuType, index };
    });
  };

  return (
    <aside
      className={`fixed left-0 top-0 z-50 mt-16 flex h-screen flex-col border-r border-sidebar-border bg-sidebar px-5 text-sidebar-foreground transition-all duration-300 ease-in-out lg:mt-0
        ${
          isExpanded || isMobileOpen
            ? "w-[290px]"
            : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`py-8 flex  ${
          !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
        }`}
      >
        <Link
          href="/"
          aria-label="OneArena home"
          className="flex items-center gap-3 text-foreground"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Trophy className="h-5 w-5" aria-hidden="true" />
          </span>
          {(isExpanded || isHovered || isMobileOpen) && (
            <span className="font-display text-xl font-bold tracking-tight">
              One<span className="text-primary">Arena</span>
            </span>
          )}
        </Link>
      </div>
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${
                  !isExpanded && !isHovered
                    ? "lg:justify-center"
                    : "justify-start"
                }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  "Menu"
                ) : "..."}
              </h2>
              {renderMenuItems(mainNavItems, "main")}
            </div>

            <div className="">
              <h2
                className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${
                  !isExpanded && !isHovered
                    ? "lg:justify-center"
                    : "justify-start"
                }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  "Others"
                ) : "..."}
              </h2>
              {renderMenuItems(otherNavItems, "others")}
            </div>
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;
