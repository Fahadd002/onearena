"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Lock, Mail, ShieldCheck, UserRound } from "lucide-react";
import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { registerAction } from "@/app/(authRouteGroup)/signup/_action";
import { API_BASE_URL, API_ENDPOINTS } from "@/lib/api/config";
import { formatFieldErrors } from "@/lib/form-errors";
import { registerBaseSchema, IRegisterPayload } from "@/zod/auth.validation";

type Role = "owner" | "user";

const roleContent: Record<
  Role,
  {
    badge: string;
    headline: string;
    subheading: string;
    bullets: string[];
    cardTitle: string;
    cardSubtitle: string;
  }
> = {
  user: {
    badge: "Join OneArena",
    headline: "Start booking the best turf in your city.",
    subheading:
      "Create your account and unlock faster bookings, trusted venues, and match-ready scheduling.",
    bullets: [
      "Book premium football and cricket turfs in minutes",
      "Get access to verified venue ratings and pricing",
      "Manage upcoming matches from one secure profile",
    ],
    cardTitle: "Create account",
    cardSubtitle: "Sign up and start booking your turf in minutes.",
  },
  owner: {
    badge: "List your turf",
    headline: "Turn your turf into a full-time business.",
    subheading:
      "Join as an owner to publish your venues, manage pricing, and receive bookings from players across the city.",
    bullets: [
      "Publish unlimited turfs and control live availability",
      "Set custom slot pricing, peak hours, and off-day rules",
      "Track bookings, earnings, and reviews from one dashboard",
    ],
    cardTitle: "Create owner account",
    cardSubtitle: "Sign up and start listing your turfs in minutes.",
  },
};

export default function RegisterForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [selectedRole, setSelectedRole] = useState<Role>("user");

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (payload: IRegisterPayload) => registerAction(payload),
  });

  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "user" as Role,
    },
    onSubmit: async ({ value }) => {
      setServerError(null);
      try {
        const result = await mutateAsync(value);

        if (!result.success) {
          const msg = result.message || "Registration failed";
          setServerError(msg);
          toast.error(msg);
          return;
        }

        toast.success(result.message || "Registration successful. Verify your email.");
        router.push(`/verify-email?email=${encodeURIComponent(value.email)}`);
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Registration failed";
        console.error(`Registration failed: ${msg}`);
        setServerError(msg);
        toast.error(msg);
      }
    },
  });

  const togglePasswordVisibility = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setShowPassword((prev) => !prev);
  };

  const toggleConfirmPasswordVisibility = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setShowConfirmPassword((prev) => !prev);
  };

  const content = roleContent[selectedRole];

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0 bg-flood opacity-70" />
      <div className="auth-glow animate-float-slow absolute left-[-8%] top-[-5%] h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
      <div className="auth-glow animate-float-slow absolute bottom-[-10%] right-[-5%] h-80 w-80 rounded-full bg-accent/15 blur-3xl [animation-delay:1800ms]" />

      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center px-2 py-6 sm:px-4 lg:px-6">
        <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Left decorative column — role aware */}
          <div className="animate-fade-up hidden lg:block" style={{ animationDelay: "100ms" }}>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Link>

            <div className="mt-8 max-w-md">
              <span className="inline-flex rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                {content.badge}
              </span>
              <h1 className="mt-4 font-display text-3xl text-foreground sm:text-4xl">
                {content.headline}
              </h1>
              <p className="mt-4 text-base text-muted-foreground">
                {content.subheading}
              </p>

              <div className="mt-6 space-y-3">
                {content.bullets.map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-xl border border-border/70 bg-card/60 p-3"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary">
                      <CheckCircle2 className="h-4 w-4" />
                    </span>
                    <span className="text-sm text-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Signup Card */}
          <div className="animate-fade-up mx-auto w-full max-w-md" style={{ animationDelay: "200ms" }}>
            <Card className="relative border-border/70 bg-card/80 shadow-elevated backdrop-blur-xl">
              <CardHeader className="space-y-1.5 pb-3 pt-6">
                {/* Title on the left; Log in | Home on the right (mobile) */}
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-2xl font-bold text-foreground">
                    {content.cardTitle}
                  </CardTitle>

                  <div className="flex items-center gap-3">
                    <Link
                      href="/login"
                      className="text-sm font-medium text-primary hover:text-primary/80"
                    >
                      Log in
                    </Link>
                    <span className="text-muted-foreground/40 lg:hidden" aria-hidden="true">
                      |
                    </span>
                    <Link
                      href="/"
                      className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground lg:hidden"
                    >
                      <ArrowLeft className="h-3 w-3" />
                      Home
                    </Link>
                  </div>
                </div>

                <CardDescription className="text-sm text-muted-foreground">
                  {content.cardSubtitle}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    form.handleSubmit();
                  }}
                  className="space-y-4"
                >
                  {/* Role Selection — compact */}
                  <form.Field name="role">
                    {(field) => (
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          {
                            value: "owner" as Role,
                            label: "Owner",
                            icon: ShieldCheck,
                          },
                          {
                            value: "user" as Role,
                            label: "User",
                            icon: UserRound,
                          },
                        ].map(({ value, label, icon: Icon }) => {
                          const isSelected = selectedRole === value;
                          return (
                            <button
                              key={value}
                              type="button"
                              onClick={() => {
                                setSelectedRole(value);
                                field.handleChange(value);
                              }}
                              className={[
                                "flex items-center gap-2 rounded-lg border p-2 text-left transition-all",
                                isSelected
                                  ? "border-primary bg-primary/10 shadow-glow"
                                  : "border-border bg-background/40 hover:border-primary/60 hover:bg-primary/5",
                              ].join(" ")}
                            >
                              <div
                                className={[
                                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                                  isSelected
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-primary/10 text-primary",
                                ].join(" ")}
                              >
                                <Icon className="h-3.5 w-3.5" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-semibold text-foreground">
                                  Sign up as {label}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </form.Field>

                  {/* Name Field */}
                  <form.Field
                    name="name"
                    validators={{ onChange: registerBaseSchema.shape.name }}
                  >
                    {(field) => (
                      <div className="space-y-1.5">
                        <Label htmlFor={field.name} className="text-sm">Full name</Label>
                        <Input
                          id={field.name}
                          type="text"
                          placeholder="Enter your full name"
                          className="h-10"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                          aria-invalid={!!field.state.meta.errors.length}
                        />
                        {field.state.meta.errors.length > 0 && (
                          <p className="text-xs text-destructive">
                            {formatFieldErrors(field.state.meta.errors)}
                          </p>
                        )}
                      </div>
                    )}
                  </form.Field>

                  {/* Email Field */}
                  <form.Field
                    name="email"
                    validators={{ onChange: registerBaseSchema.shape.email }}
                  >
                    {(field) => (
                      <div className="space-y-1.5">
                        <Label htmlFor={field.name} className="text-sm">Email address</Label>
                        <div className="relative">
                          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id={field.name}
                            type="email"
                            placeholder="you@example.com"
                            className="h-10 pl-10"
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                            aria-invalid={!!field.state.meta.errors.length}
                          />
                        </div>
                        {field.state.meta.errors.length > 0 && (
                          <p className="text-xs text-destructive">
                            {formatFieldErrors(field.state.meta.errors)}
                          </p>
                        )}
                      </div>
                    )}
                  </form.Field>

                  {/* Password Field */}
                  <form.Field
                    name="password"
                    validators={{ onChange: registerBaseSchema.shape.password }}
                  >
                    {(field) => (
                      <div className="space-y-1.5">
                        <Label htmlFor={field.name} className="text-sm">Password</Label>
                        <div className="relative">
                          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id={field.name}
                            type={showPassword ? "text" : "password"}
                            placeholder="Create a password"
                            className="h-10 pl-10 pr-12"
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                            aria-invalid={!!field.state.meta.errors.length}
                          />
                          <button
                            type="button"
                            onClick={togglePasswordVisibility}
                            className="absolute right-1 top-1/2 z-10 flex size-8 -translate-y-1/2 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        {field.state.meta.errors.length > 0 && (
                          <p className="text-xs text-destructive">
                            {formatFieldErrors(field.state.meta.errors)}
                          </p>
                        )}
                      </div>
                    )}
                  </form.Field>

                  {/* Confirm Password Field */}
                  <form.Field
                    name="confirmPassword"
                    validators={{ onChange: registerBaseSchema.shape.confirmPassword }}
                  >
                    {(field) => (
                      <div className="space-y-1.5">
                        <Label htmlFor={field.name} className="text-sm">Confirm password</Label>
                        <div className="relative">
                          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id={field.name}
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Repeat your password"
                            className="h-10 pl-10 pr-12"
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                            aria-invalid={!!field.state.meta.errors.length}
                          />
                          <button
                            type="button"
                            onClick={toggleConfirmPasswordVisibility}
                            className="absolute right-1 top-1/2 z-10 flex size-8 -translate-y-1/2 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                            aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        {field.state.meta.errors.length > 0 && (
                          <p className="text-xs text-destructive">
                            {formatFieldErrors(field.state.meta.errors)}
                          </p>
                        )}
                      </div>
                    )}
                  </form.Field>

                  {serverError && (
                    <Alert variant="destructive">
                      <AlertDescription className="text-sm">{serverError}</AlertDescription>
                    </Alert>
                  )}

                  <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting] as const}>
                    {([canSubmit, isSubmitting]) => (
                      <Button
                        type="submit"
                        variant="hero"
                        size="lg"
                        className="w-full"
                        disabled={!canSubmit || isSubmitting || isPending}
                      >
                        {isSubmitting || isPending ? "Creating account..." : "Create account"}
                      </Button>
                    )}
                  </form.Subscribe>
                </form>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    <span className="bg-card px-2">Or sign up with</span>
                  </div>
                </div>

                {/* Google Sign-Up */}
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="w-full"
                  onClick={() => {
                    window.location.href = `${API_BASE_URL}${API_ENDPOINTS.auth.googleLogin}`;
                  }}
                >
                  <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link href="/login" className="font-medium text-primary hover:text-primary/80">
                    Log in
                  </Link>
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}