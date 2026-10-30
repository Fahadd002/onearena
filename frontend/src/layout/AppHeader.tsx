"use client";
import { ThemeToggleButton } from "@/components/common/ThemeToggleButton";
import NotificationDropdown from "@/components/header/NotificationDropdown";
import { useSidebar } from "@/context/SidebarContext";
import { useSearch } from "@/context/SearchContext";
import {
  Trophy,
  LayoutDashboard,
  LogOut,
  Search,
  X,
} from "lucide-react";
import Link from "next/link";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { logout } from "@/services/auth.services";
import { getDefaultDashboardRoute, UserRole } from "@/lib/authUtils";
import { useAuth } from "@/lib/auth";
import { getFileUrl } from "@/lib/utils";

const AppHeader: React.FC = () => {
  const router = useRouter();
  const [userOpen, setUserOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const { isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar();
  const { query, setQuery, placeholder } = useSearch();
  const inputRef = useRef<HTMLInputElement>(null);
  const mobileSearchRef = useRef<HTMLInputElement>(null);
  const { session, loading } = useAuth();

  const handleToggle = () => {
    if (window.innerWidth >= 1024) {
      toggleSidebar();
    } else {
      toggleMobileSidebar();
    }
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
    const initials = name
      .trim()
      .split(/\s+/)
      .map((word) => word[0] ?? "")
      .join("")
      .toUpperCase()
      .slice(0, 2);

    return initials || "?";
  };

  // Logged in -> profile photo, otherwise -> two-letter fallback.
  const avatarUrl = getFileUrl(session?.user.image);

  // Open mobile search & focus input
  const openMobileSearch = () => {
    setIsMobileSearchOpen(true);
    // focus after render
    setTimeout(() => mobileSearchRef.current?.focus(), 50);
  };

  // Close mobile search & clear query
  const closeMobileSearch = () => {
    setIsMobileSearchOpen(false);
    setQuery("");
  };

  // Global Ctrl/Cmd + K shortcut
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        if (window.innerWidth >= 1024) {
          inputRef.current?.focus();
        } else {
          openMobileSearch();
        }
      }
      // ESC to close mobile search
      if (event.key === "Escape" && isMobileSearchOpen) {
        closeMobileSearch();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobileSearchOpen]);

  // Give the sticky header a background once the page is scrolled
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 w-auto transition-colors duration-300 sm:mx-0 md:2 lg:block ${
        isScrolled
          ? "border-b border-border bg-background/95 shadow-theme-md backdrop-blur-md"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="flex grow flex-col items-center justify-between lg:flex-row lg:px-6">
        {/* ───────────────────────────── MOBILE ROW (visible < lg) ───────────────────────────── */}
        <div className="flex w-full items-center justify-between gap-2 px-3 sm:gap-4 lg:hidden h-16">
          {!isMobileSearchOpen ? (
            <>
              {/* Left: menu toggle + brand */}
              <div className="flex items-center gap-2">
                <button
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-theme-md transition-all hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={handleToggle}
                  aria-label="Toggle Sidebar"
                >
                  {isMobileOpen ? (
                    <X className="h-5 w-5" />
                  ) : (
                    <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M0.583252 1C0.583252 0.585788 0.919038 0.25 1.33325 0.25H14.6666C15.0808 0.25 15.4166 0.585786 15.4166 1C15.4166 1.41421 15.0808 1.75 14.6666 1.75L1.33325 1.75C0.919038 1.75 0.583252 1.41422 0.583252 1ZM0.583252 11C0.583252 10.5858 0.919038 10.25 1.33325 10.25L14.6666 10.25C15.0808 10.25 15.4166 10.5858 15.4166 11C15.4166 11.4142 15.0808 11.75 14.6666 11.75L1.33325 11.75C0.919038 11.75 0.583252 11.4142 0.583252 11ZM1.33325 5.25C0.919038 5.25 0.583252 5.58579 0.583252 6C0.583252 6.41421 0.919038 6.75 0.583252 6.75L7.99992 6.75C8.41413 6.75 8.74992 6.41421 8.74992 6C8.74992 5.58579 8.41413 6.75 7.99992 6.75L1.33325 6.75C0.919038 6.75 0.583252 6.41422 0.583252 6ZM1.33325 5.25C0.919038 5.25 0.583252 5.58579 0.583252 6C0.583252 6.41421 0.919038 6.75 0.583252 6.75L7.99992 6.75C8.41413 6.75 8.74992 6.41421 8.74992 6C8.74992 5.58579 8.41413 6.75 7.99992 6.75L1.33325 5.25Z"
                        fill="currentColor"
                      />
                    </svg>
                  )}
                </button>

                <Link href="/" className="flex items-center gap-2 text-foreground">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-lg">
                    <Trophy className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="hidden font-display text-lg font-bold tracking-tight 2xsm:inline">
                    One<span className="text-primary">Arena</span>
                  </span>
                </Link>
              </div>

              {/* Right: Search, Theme toggle, Notification */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={openMobileSearch}
                  aria-label="Open search"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-theme-md transition-all hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Search className="h-4 w-4" />
                </button>

                <ThemeToggleButton className="border-border bg-card text-foreground shadow-theme-md backdrop-blur-none hover:bg-primary/10" />

                {/* <NotificationDropdown className="border-border bg-card text-foreground shadow-theme-md backdrop-blur-none hover:bg-primary/10" /> */}
              </div>
            </>
          ) : (
            /* ───────────── Mobile Search Input (clean, full width) ───────────── */
            <div className="flex w-full items-center gap-2">
              <button
                type="button"
                onClick={closeMobileSearch}
                aria-label="Close search"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-theme-md transition-all hover:bg-primary/10"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={mobileSearchRef}
                  type="text"
                  placeholder={placeholder}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="h-10 w-full rounded-full border border-border bg-card pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground shadow-theme-md transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          )}
        </div>

        {/* ───────────────────────────── DESKTOP ROW (visible ≥ lg) ───────────────────────────── */}
        <div className="hidden lg:flex w-full items-center justify-between gap-2 px-0 h-16">
          <div className="flex items-center gap-4">
            <button
              className="z-99999 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-theme-md transition-all hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={handleToggle}
              aria-label="Toggle Sidebar"
            >
              {isMobileOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M0.583252 1C0.583252 0.585788 0.919038 0.25 1.33325 0.25H14.6666C15.0808 0.25 15.4166 0.585786 15.4166 1C15.4166 1.41421 15.0808 1.75 14.6666 1.75L1.33325 1.75C0.919038 1.75 0.583252 1.41422 0.583252 1ZM0.583252 11C0.583252 10.5858 0.919038 10.25 1.33325 10.25L14.6666 10.25C15.0808 10.25 15.4166 10.5858 15.4166 11C15.4166 11.4142 15.0808 11.75 14.6666 11.75L1.33325 11.75C0.919038 11.75 0.583252 11.4142 0.583252 11ZM1.33325 5.25C0.919038 5.25 0.583252 5.58579 0.583252 6C0.583252 6.41421 0.919038 6.75 0.583252 6.75L7.99992 6.75C8.41413 6.75 8.74992 6.41421 8.74992 6C8.74992 5.58579 8.41413 6.75 7.99992 6.75L1.33325 6.75C0.919038 6.75 0.583252 6.41422 0.583252 6ZM1.33325 5.25C0.919038 5.25 0.583252 5.58579 0.583252 6C0.583252 6.41421 0.919038 6.75 0.583252 6.75L7.99992 6.75C8.41413 6.75 8.74992 6.41421 8.74992 6C8.74992 5.58579 8.41413 6.75 7.99992 6.75L1.33325 5.25Z"
                    fill="currentColor"
                  />
                </svg>
              )}
            </button>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={inputRef}
                type="text"
                placeholder={placeholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-10 w-[320px] rounded-full border border-border bg-card pl-9 pr-14 text-sm text-foreground placeholder:text-muted-foreground shadow-theme-md transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 xl:w-[430px]"
              />
              <button className="absolute right-2 top-1/2 inline-flex -translate-y-1/2 items-center gap-0.5 rounded-lg border border-border bg-secondary px-[7px] py-[4.5px] text-xs -tracking-[0.2px] text-muted-foreground shadow-xs">
                <span>⌘</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggleButton className="border-border bg-card text-foreground shadow-theme-md backdrop-blur-none hover:bg-primary/10" />
            {/* <NotificationDropdown className="border-border bg-card text-foreground shadow-theme-md backdrop-blur-none hover:bg-primary/10" /> */}

            {!loading && session ? (
              <Popover open={userOpen} onOpenChange={setUserOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    className="gap-2 rounded-full border border-border bg-card pl-0 pr-3 shadow-theme-md transition-all hover:bg-primary/10"
                  >
                    <Avatar className="h-9.5 w-9.5">
                      {avatarUrl && (
                        <AvatarImage
                          src={avatarUrl}
                          alt={session.user.name}
                        />
                      )}
                      <AvatarFallback
                        delayMs={avatarUrl ? 300 : 0}
                        className="bg-gradient-to-br from-primary to-primary-glow text-primary-foreground text-[10px] font-bold"
                      >
                        {getInitials(session.user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:block text-sm font-medium">
                      {session.user.name}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  className="w-72 rounded-2xl border border-border bg-popover p-0 shadow-2xl"
                >
                  <div className="p-2">
                    <Link
                      href={getDefaultDashboardRoute(
                        session.user.role as UserRole
                      )}
                      onClick={() => setUserOpen(false)}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-foreground transition-colors hover:bg-primary/10"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      Dashboard
                    </Link>
                    <button
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
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
      </div>
    </header>
  );
};

export default AppHeader;