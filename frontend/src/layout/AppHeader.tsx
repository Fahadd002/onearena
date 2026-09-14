"use client";
import { ThemeToggleButton } from "@/components/common/ThemeToggleButton";
import NotificationDropdown from "@/components/header/NotificationDropdown";
import { useSidebar } from "@/context/SidebarContext";
import { useSearch } from "@/context/SearchContext";
import { Trophy, LayoutDashboard, LogOut, Search } from "lucide-react";
import Link from "next/link";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { logout } from "@/services/auth.services";
import { getDefaultDashboardRoute, UserRole } from "@/lib/authUtils";
import { useAuth } from "@/lib/auth";

const AppHeader: React.FC = () => {
  const router = useRouter();
  const [isApplicationMenuOpen, setApplicationMenuOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar();
  const { query, setQuery, placeholder } = useSearch();
  const inputRef = useRef<HTMLInputElement>(null);
  const { session, loading } = useAuth();

  const handleToggle = () => {
    if (window.innerWidth >= 1024) {
      toggleSidebar();
    } else {
      toggleMobileSidebar();
    }
  };

  const toggleApplicationMenu = () => {
    setApplicationMenuOpen(!isApplicationMenuOpen);
  };

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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <header className="sticky top-3 z-40 mx-3 flex w-auto rounded-full sm:mx-6">
      <div
        className="flex grow flex-col items-center justify-between lg:flex-row lg:px-6"
        style={{
          backgroundColor: "color-mix(in oklab, var(--surface) 80%, transparent)",
        }}
      >
        <div className="flex w-full items-center justify-between gap-2 px-3 py-2 sm:gap-4 lg:justify-normal lg:px-0 lg:py-2">
          <button
            className="z-99999 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/40 text-slate-700 shadow-lg backdrop-blur-xl transition-all hover:bg-white/60 dark:border-white/10 dark:bg-slate-800/40 dark:text-slate-200 dark:hover:bg-slate-700/60 lg:h-11 lg:w-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={handleToggle}
            aria-label="Toggle Sidebar"
          >
            {isMobileOpen ? (
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
                width="16"
                height="12"
                viewBox="0 0 16 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M0.583252 1C0.583252 0.585788 0.919038 0.25 1.33325 0.25H14.6666C15.0808 0.25 15.4166 0.585786 15.4166 1C15.4166 1.41421 15.0808 1.75 14.6666 1.75L1.33325 1.75C0.919038 1.75 0.583252 1.41422 0.583252 1ZM0.583252 11C0.583252 10.5858 0.919038 10.25 1.33325 10.25L14.6666 10.25C15.0808 10.25 15.4166 10.5858 15.4166 11C15.4166 11.4142 15.0808 11.75 14.6666 11.75L1.33325 11.75C0.919038 11.75 0.583252 11.4142 0.583252 11ZM1.33325 5.25C0.919038 5.25 0.583252 5.58579 0.583252 6C0.583252 6.41421 0.919038 6.75 0.583252 6.75L7.99992 6.75C8.41413 6.75 8.74992 6.41421 8.74992 6C8.74992 5.58579 8.41413 6.75 7.99992 6.75L1.33325 6.75C0.919038 6.75 0.583252 6.41422 0.583252 6ZM1.33325 5.25C0.919038 5.25 0.583252 5.58579 0.583252 6C0.583252 6.41421 0.919038 6.75 0.583252 6.75L7.99992 6.75C8.41413 6.75 8.74992 6.41421 8.74992 6C8.74992 5.58579 8.41413 6.75 7.99992 6.75L1.33325 5.25Z"
                  fill="currentColor"
                />
              </svg>
            )}
          </button>

          <Link
            href="/"
            className="flex items-center gap-2 text-foreground lg:hidden"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-lg">
              <Trophy className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="font-display text-xl font-bold tracking-tight">
              One<span className="text-primary">Arena</span>
            </span>
          </Link>

          <button
            onClick={toggleApplicationMenu}
            className="z-99999 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/40 text-slate-700 shadow-lg backdrop-blur-xl transition-all hover:bg-white/60 dark:border-white/10 dark:bg-slate-800/40 dark:text-slate-200 dark:hover:bg-slate-700/60 lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
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
                d="M5.99902 10.4951C6.82745 10.4951 7.49902 11.1667 7.49902 11.9951V12.0051C7.49902 12.8335 6.82745 13.5051 5.99902 13.5051C5.1706 13.5051 4.49902 12.0051 4.49902 11.9951C4.49902 11.1667 5.1706 10.4951 5.99902 10.4951ZM17.999 10.4951C18.8275 10.4951 19.499 11.1667 19.499 11.9951V12.0051C19.499 12.8335 18.8275 13.5051 17.999 13.5051C17.1706 13.5051 16.499 12.0051 16.499 11.9951C16.499 11.1667 17.1706 10.4951 17.999 10.4951ZM13.499 11.9951C13.499 11.1667 12.8275 10.4951 11.999 10.4951C11.1706 10.4951 10.499 11.1667 10.499 11.9951V12.0051C10.499 12.8335 11.1706 13.5051 11.999 13.5051C12.8275 13.5051 13.499 12.0051 13.499 11.9951Z"
                fill="currentColor"
              />
            </svg>
          </button>

          <div className="hidden lg:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                ref={inputRef}
                type="text"
                placeholder={placeholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-10 w-[320px] rounded-full border border-white/20 bg-white/60 pl-9 pr-14 text-sm text-slate-700 placeholder:text-slate-400 shadow-lg backdrop-blur-xl transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-white/10 dark:bg-slate-800/60 dark:text-slate-200 dark:placeholder:text-slate-500 xl:w-[430px]"
              />
              <button className="absolute right-2 top-1/2 inline-flex -translate-y-1/2 items-center gap-0.5 rounded-lg border border-white/20 bg-white/60 px-[7px] py-[4.5px] text-xs -tracking-[0.2px] text-slate-500 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-700/60 dark:text-slate-400">
                <span>⌘</span>
                <span>K</span>
              </button>
            </div>
          </div>
        </div>
        <div
          className={`${
            isApplicationMenuOpen ? "flex" : "hidden"
          } w-full items-center justify-between gap-4 px-5 pb-4 lg:flex lg:justify-end lg:px-0 lg:pb-0`}
        >
          <div className="flex items-center gap-2 2xsm:gap-3">
            <ThemeToggleButton />
            <NotificationDropdown />
          </div>
          {/* <!-- User Area --> */}
          {!loading && session ? (
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
                  <span className="hidden sm:block text-sm font-medium">
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
          ) : null}
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
