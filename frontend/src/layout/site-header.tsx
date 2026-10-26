"use client";

import Link from "next/link";
import {
  LayoutDashboard,
  LogOut,
  Home,
  Mail,
  Menu,
  Trophy,
  User,
  UserPlus,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { logout } from "@/services/auth.services";
import { getDefaultDashboardRoute, UserRole } from "@/lib/authUtils";
import { useAuth } from "@/lib/auth";
import { getFileUrl } from "@/lib/utils";
import { ThemeToggleButton } from "@/components/common/ThemeToggleButton";
import NotificationDropdown from "@/components/header/NotificationDropdown";
import { NAVBAR_HEIGHT, TURF_SECTION_ID } from "@/lib/turfs";

const navItems = [
  { label: "Home", to: "/", icon: Home },
  { label: "Contact", to: "/contact", icon: Mail },
];

export function SiteHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { session, loading } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);

  /* The navbar takes its background past the offset, and slides away entirely
     while the turf section fills the screen — the section's own sticky search
     deck takes the top of the viewport in that moment. Scrolling back up into
     the banner, or past the last turf row, brings the navbar back. */
  useEffect(() => {
    let frame = 0;

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const y = window.scrollY;
        setScrolled(y > NAVBAR_HEIGHT);

        /* Same line the search deck pins on (see TurfList): the deck's natural
           top has to reach the viewport top before it can cover it, so the
           navbar must stay up until then — otherwise a strip of bare banner
           shows through above the parked deck. */
        const turf = document.getElementById(TURF_SECTION_ID);
        const rect = turf?.getBoundingClientRect();
        setHidden(
          y > NAVBAR_HEIGHT &&
            !!rect &&
            rect.top <= 0 &&
            rect.bottom > NAVBAR_HEIGHT,
        );
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    onScroll();

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

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

  const isActive = (path: string) => {
    if (path === "/") {
      return pathname === "/";
    }
    return pathname === path || pathname.startsWith(path + "/");
  };

  // Logged in -> profile photo, otherwise -> two-letter fallback.
  const avatarUrl = getFileUrl(session?.user.image);

  return (
    <header
      aria-hidden={hidden}
      inert={hidden}
      className={`fixed top-0 left-0 right-0 z-[60] will-change-transform transition-[translate,background-color,border-color] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
        hidden ? "-translate-y-full" : "translate-y-0"
      } ${
        scrolled
          ? "bg-background/95 backdrop-blur-xl border-b border-border"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 w-full max-w-screen-2xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-primary to-primary-glow text-primary-foreground">
            <Trophy className="size-4" />
          </span>
          <span className="font-display text-xl font-bold tracking-tight">
            One<span className="text-primary">Arena</span>
          </span>
        </Link>

        {/* Nav with pill background */}
        <nav className="hidden md:flex items-center gap-1 rounded-full border border-border/60 bg-background/80 backdrop-blur-xl">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.to);
            return (
              <Link
                key={item.label}
                href={item.to}
                className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  active
                    ? "bg-background text-primary"
                    : "text-foreground hover:bg-accent/10 hover:text-primary"
                }`}
              >
                <Icon
                  className={`size-3.5 transition-opacity ${
                    active ? "opacity-100" : "opacity-60"
                  }`}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Actions - desktop */}
        <div className="hidden md:flex items-center gap-2">
          <ThemeToggleButton className="rounded-full border border-border bg-background/80 text-foreground backdrop-blur-xl transition-all hover:bg-accent/10" />
          {!loading && !session ? (
            <>
              <Link href="/login">
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full border border-border bg-background/80 text-foreground backdrop-blur-xl transition-all hover:bg-accent/10"
                >
                  <User className="size-4" />
                  <span>Sign in</span>
                </Button>
              </Link>
              <Link href="/signup">
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full border border-border bg-background/80 text-foreground backdrop-blur-xl transition-all hover:bg-accent/10"
                >
                  <UserPlus className="size-4" />
                  <span>Sign Up</span>
                </Button>
              </Link>
            </>
          ) : session ? (
            <>
              <NotificationDropdown className="rounded-full border border-border bg-background/80 text-foreground backdrop-blur-xl transition-all hover:bg-accent/10" />
              <Popover open={userOpen} onOpenChange={setUserOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    className="gap-2 rounded-full border border-border bg-background/80 pl-0 pr-3 backdrop-blur-xl transition-all hover:bg-accent/10"
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
                {/* z-[70] keeps the card above the turf filter deck (z-[55]).
                    Mirrors the notification dropdown's surface. */}
                <PopoverContent
                  align="end"
                  sideOffset={12}
                  className="z-[70] w-[17rem] rounded-2xl border border-border bg-popover p-3"
                >
                  <div className="flex items-center gap-2 border-b border-border pb-3">
                    <Avatar className="size-8 w-8">
                      {avatarUrl && <AvatarImage src={avatarUrl} alt={session.user.name} />}
                      <AvatarFallback
                        delayMs={avatarUrl ? 300 : 0}
                        className="bg-gradient-to-br from-primary to-primary-glow text-primary-foreground text-[10px] font-bold"
                      >
                        {getInitials(session.user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {session.user.name}
                      </p>
                    </div>
                  </div>
                  <div className="mt-1.5 flex flex-col">
                    <Link
                      href={getDefaultDashboardRoute(session.user.role as UserRole)}
                      onClick={() => setUserOpen(false)}
                      className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-foreground transition-colors hover:bg-primary/10"
                    >
                      <LayoutDashboard className="size-4 opacity-70" />
                      Dashboard
                    </Link>
                    <button
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
                    >
                      <LogOut className="size-4 opacity-70" />
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
          <ThemeToggleButton className="rounded-full border border-border bg-background/80 text-foreground backdrop-blur-xl transition-all hover:bg-accent/10" />
          <button
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background/80 text-foreground backdrop-blur-xl transition-all hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute inset-x-0 top-full px-4 pt-2 md:hidden"
          >
            <div className="ml-auto w-full max-w-[16.5rem] max-h-[calc(100vh-5rem)] overflow-y-auto rounded-2xl border border-border bg-popover/95 p-2 backdrop-blur-xl">
              <nav className="flex flex-col">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.to);
                  return (
                    <Link
                      key={item.label}
                      href={item.to}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        active
                          ? "bg-primary/10 text-primary"
                          : "text-foreground hover:bg-accent/10"
                      }`}
                    >
                      <Icon className="size-4 shrink-0 opacity-70" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              <div className="mt-2 flex flex-col border-t border-border pt-2">
                {!loading && !session ? (
                  <>
                    <Link
                      href="/login"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent/10"
                    >
                      <User className="size-4 shrink-0 opacity-70" />
                      Sign in
                    </Link>
                    <Link
                      href="/signup"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent/10"
                    >
                      <UserPlus className="size-4 shrink-0 opacity-70" />
                      Sign Up
                    </Link>
                  </>
                ) : session ? (
                  <>
                    <div className="mb-1 flex items-center gap-2.5 rounded-lg bg-muted/40 px-3 py-2">
                      <Avatar className="h-6 w-6">
                        {avatarUrl && (
                          <AvatarImage
                            src={avatarUrl}
                            alt={session.user.name}
                          />
                        )}
                        <AvatarFallback
                          delayMs={avatarUrl ? 300 : 0}
                          className="bg-gradient-to-br from-primary to-primary-glow text-primary-foreground text-[9px] font-bold"
                        >
                          {getInitials(session.user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <p className="truncate text-sm font-semibold text-foreground">
                        {session.user.name}
                      </p>
                    </div>
                    <Link
                      href={getDefaultDashboardRoute(session.user.role as UserRole)}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-primary/10"
                    >
                      <LayoutDashboard className="size-4 shrink-0 opacity-70" />
                      Dashboard
                    </Link>
                    <button
                      onClick={() => {
                        handleLogout();
                        setMobileOpen(false);
                      }}
                      disabled={isLoggingOut}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
                    >
                      <LogOut className="size-4 shrink-0" />
                      {isLoggingOut ? "Logging out..." : "Logout"}
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
