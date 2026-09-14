"use client";

import Link from "next/link";
import { LayoutDashboard, LogOut, Trophy, User, UserPlus } from "lucide-react";
import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { logout } from "@/services/auth.services";
import { getDefaultDashboardRoute, UserRole } from "@/lib/authUtils";
import { useAuth } from "@/lib/auth";
import { ThemeToggleButton } from "@/components/common/ThemeToggleButton";
import NotificationDropdown from "@/components/header/NotificationDropdown";

const navItems = [
  { label: "Home", to: "/" },
  { label: "Turfs", to: "/turfs" },
  { label: "Pricing", to: "/pricing" },
  { label: "Contact", to: "/contact" },
];

export function SiteHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { session, loading } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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
      setUserOpen(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const isActive = (path: string) => {
    if (path === "/") {
      return pathname === "/";
    }
    return pathname === path || pathname.startsWith(path + "/");
  };

  return (
    <header className="fixed top-4 left-4 right-4 z-50 sm:left-6 sm:right-6">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-lg">
            <Trophy className="size-4" />
          </span>
          <span className="font-display text-xl font-bold tracking-tight">
            One<span className="text-primary">Arena</span>
          </span>
        </Link>

        {/* Nav with pill background */}
        <nav className="hidden md:flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-2 py-1 shadow-lg backdrop-blur-xl">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.to}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all dark:text-slate-200 ${
                isActive(item.to)
                  ? "bg-white/60 text-primary dark:bg-slate-700/60"
                  : "text-slate-700 hover:bg-white/60 hover:text-primary dark:hover:bg-slate-700/60"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Actions - desktop */}
        <div className="hidden md:flex items-center gap-2">
          <ThemeToggleButton className="rounded-full border border-white/20 bg-white/40 text-slate-700 shadow-lg backdrop-blur-xl transition-all hover:bg-white/60 dark:border-white/10 dark:bg-slate-800/40 dark:text-slate-200 dark:hover:bg-slate-700/60" />
          {!loading && !session ? (
            <>
              <Link href="/login">
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full border border-white/20 bg-white/40 text-slate-700 shadow-lg backdrop-blur-xl transition-all hover:bg-white/60 dark:border-white/10 dark:bg-slate-800/40 dark:text-slate-200 dark:hover:bg-slate-700/60"
                >
                  <User className="size-4" />
                  <span>Sign in</span>
                </Button>
              </Link>
              <Link href="/signup">
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full border border-white/20 bg-white/40 text-slate-700 shadow-lg backdrop-blur-xl transition-all hover:bg-white/60 dark:border-white/10 dark:bg-slate-800/40 dark:text-slate-200 dark:hover:bg-slate-700/60"
                >
                  <UserPlus className="size-4" />
                  <span>Sign Up</span>
                </Button>
              </Link>
            </>
          ) : session ? (
            <>
              <NotificationDropdown />
              <Popover open={userOpen} onOpenChange={setUserOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    className="gap-2 rounded-full border border-white/20 bg-white/40 pl-1 pr-3 shadow-lg backdrop-blur-xl transition-all hover:bg-white/60 dark:border-white/10 dark:bg-slate-800/40 dark:hover:bg-slate-700/60"
                  >
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="bg-gradient-to-br from-primary to-primary-glow text-primary-foreground text-[10px] font-bold">
                        {getInitials(session.user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">
                      {session.user.name}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-72 rounded-2xl border border-white/20 p-0 shadow-2xl backdrop-blur-xl" style={{ backgroundColor: "color-mix(in oklab, var(--surface) 80%, transparent)" }}>
                  <div className="p-4 border-b border-white/10">
                    <p className="text-sm font-semibold text-slate-100">
                      {session.user.name}
                    </p>
                    <p className="text-xs text-slate-300">
                      {session.user.email}
                    </p>
                    <p className="text-xs text-slate-400 capitalize mt-1">
                      {session.user.role.replace(/_/g, " ")}
                    </p>
                  </div>
                  <div className="p-2">
                    <Link
                      href={getDefaultDashboardRoute(session.user.role as UserRole)}
                      onClick={() => setUserOpen(false)}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-200 transition-colors hover:bg-white/10"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      Dashboard
                    </Link>
                    <button
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
                    >
                      <LogOut className="w-4 h-4" />
                      {isLoggingOut ? "Logging out..." : "Logout"}
                    </button>
                  </div>
                </PopoverContent>
              </Popover>
            </>
          ) : null}
        </div>

        {/* Mobile actions - only visible on mobile */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggleButton className="rounded-full border border-white/20 bg-white/40 text-slate-700 shadow-lg backdrop-blur-xl transition-all hover:bg-white/60 dark:border-white/10 dark:bg-slate-800/40 dark:text-slate-200 dark:hover:bg-slate-700/60" />
          <button
            onClick={() => setMobileOpen((prev) => !prev)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/40 text-slate-700 shadow-lg backdrop-blur-xl transition-all hover:bg-white/60 dark:border-white/10 dark:bg-slate-800/40 dark:text-slate-200 dark:hover:bg-slate-700/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {mobileOpen ? (
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M6.21967 7.28131C5.92678 6.98841 5.92678 6.51354 6.21967 6.22065C6.51256 5.92775 6.98744 5.92775 7.28033 6.22065L11.999 10.9393L16.7176 6.22078C17.0105 5.92789 17.4854 5.92788 17.7782 6.22078C18.0711 6.51367 18.0711 6.98855 17.7782 7.28144L13.0597 12L17.7782 16.7186C18.0711 17.0115 18.0711 17.4863 17.7782 17.7792C17.4854 18.0721 17.4854 18.0721 16.7176 17.7792L11.999 13.0607L7.28033 17.7794C6.98744 18.0722 6.98744 18.0722 6.21967 17.7794C5.92678 17.4865 5.92678 17.0116 6.21967 16.7187L10.9384 12L6.21967 7.28131Z"
                  fill="currentColor"
                />
              </svg>
            ) : (
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M3.99902 6.99951C3.99902 6.44711 4.44661 5.99951 4.99902 5.99951H19.999C20.5514 5.99951 20.999 6.44711 20.999 6.99951C20.999 7.55192 20.5514 7.99951 19.999 7.99951H4.99902C4.44661 7.99951 3.99902 7.55192 3.99902 6.99951ZM3.99902 11.9995C3.99902 11.4471 4.44661 10.9995 4.99902 10.9995H19.999C20.5514 10.9995 20.999 11.4471 20.999 11.9995C20.999 12.5519 20.5514 12.9995 19.999 12.9995H4.99902C4.44661 12.9995 3.99902 12.5519 3.99902 11.9995ZM4.99902 15.9995C4.44661 15.9995 3.99902 16.4471 3.99902 16.9995C3.99902 17.5519 4.44661 17.9995 4.99902 17.9995H19.999C20.5514 17.9995 20.999 17.5519 20.999 16.9995C20.999 16.4471 20.5514 15.9995 19.999 15.9995H4.99902Z"
                  fill="currentColor"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={`${
          mobileOpen ? "flex" : "hidden"
        } absolute top-full left-0 right-0 mt-2 rounded-2xl border border-white/20 p-4 shadow-2xl backdrop-blur-xl md:hidden`}
        style={{ backgroundColor: "color-mix(in oklab, var(--surface) 80%, transparent)" }}
      >
        <nav className="flex flex-col gap-2">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.to}
              onClick={() => setMobileOpen(false)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors dark:text-slate-200 ${
                isActive(item.to)
                  ? "bg-white/60 text-primary dark:bg-slate-700/60"
                  : "text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-4 flex flex-col gap-2 border-t border-slate-200/60 pt-4 dark:border-slate-700/60">
          {!loading && !session ? (
            <>
              <Link href="/login" onClick={() => setMobileOpen(false)}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full rounded-full border border-white/20 bg-white/40 text-slate-700 shadow-lg backdrop-blur-xl transition-all hover:bg-white/60 dark:border-white/10 dark:bg-slate-800/40 dark:text-slate-200 dark:hover:bg-slate-700/60"
                >
                  <User className="size-4" />
                  Sign in
                </Button>
              </Link>
              <Link href="/signup" onClick={() => setMobileOpen(false)}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full rounded-full border border-white/20 bg-white/40 text-slate-700 shadow-lg backdrop-blur-xl transition-all hover:bg-white/60 dark:border-white/10 dark:bg-slate-800/40 dark:text-slate-200 dark:hover:bg-slate-700/60"
                >
                  <UserPlus className="size-4" />
                  Sign Up
                </Button>
              </Link>
            </>
          ) : session ? (
            <div className="flex flex-col gap-2">
              <div className="rounded-xl border border-white/20 p-3 shadow-lg backdrop-blur-xl" style={{ backgroundColor: "color-mix(in oklab, var(--surface) 80%, transparent)" }}>
                <p className="text-sm font-semibold text-slate-100">
                  {session.user.name}
                </p>
                <p className="text-xs text-slate-300">
                  {session.user.email}
                </p>
                <p className="text-xs text-slate-400 capitalize mt-1">
                  {session.user.role.replace(/_/g, " ")}
                </p>
              </div>
              <Link
                href={getDefaultDashboardRoute(session.user.role as UserRole)}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-white/10"
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Link>
              <button
                onClick={() => {
                  handleLogout();
                  setMobileOpen(false);
                }}
                disabled={isLoggingOut}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
              >
                <LogOut className="w-4 h-4" />
                {isLoggingOut ? "Logging out..." : "Logout"}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
