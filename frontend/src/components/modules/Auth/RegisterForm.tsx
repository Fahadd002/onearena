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
import { registerBaseSchema, registerZodSchema, IRegisterPayload } from "@/zod/auth.validation";

export default function RegisterForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Role selection state (for UI highlight)
  const [selectedRole, setSelectedRole] = useState<"owner" | "user">("user");

  // Mutation
  const { mutateAsync, isPending } = useMutation({
    mutationFn: (payload: IRegisterPayload) => registerAction(payload),
  });

  // TanStack Form
  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "user" as "owner" | "user",
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

  // Toggle handlers
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

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0 bg-flood opacity-70" />
      <div className="auth-glow animate-float-slow absolute left-[-8%] top-[-5%] h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
      <div className="auth-glow animate-float-slow absolute bottom-[-10%] right-[-5%] h-80 w-80 rounded-full bg-accent/15 blur-3xl [animation-delay:1800ms]" />

      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center px-2 py-8 sm:px-4 lg:px-6">
        <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Left decorative column – unchanged */}
          <div className="animate-fade-up hidden lg:block" style={{ animationDelay: "100ms" }}>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Link>

            <div className="mt-10 max-w-md">
              <span className="inline-flex rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                Join OneArena
              </span>
              <h1 className="mt-5 font-display text-4xl text-foreground sm:text-5xl">
                Start booking the best turf in your city.
              </h1>
              <p className="mt-5 text-lg text-muted-foreground">
                Create your account and unlock faster bookings, trusted venues, and match-ready scheduling.
              </p>

              <div className="mt-8 space-y-4">
                {[
                  "Book premium football and cricket turfs in minutes",
                  "Get access to verified venue ratings and pricing",
                  "Manage upcoming matches from one secure profile",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-xl border border-border/70 bg-card/60 p-3">
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
            <Card className="border-border/70 bg-card/80 shadow-elevated backdrop-blur-xl">
              <CardHeader className="space-y-2 pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-3xl font-bold text-foreground">Create account</CardTitle>
                  <Link href="/login" className="text-sm font-medium text-primary hover:text-primary/80">
                    Log in
                  </Link>
                </div>
                <CardDescription className="text-base text-muted-foreground">
                  Sign up and start booking your turf in minutes.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-5">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    form.handleSubmit();
                  }}
                  className="space-y-5"
                >
                  {/* Role Selection */}
                  <form.Field name="role">
                    {(field) => (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {[
                          {
                            value: "owner",
                            label: "Sign up as owner",
                            description: "List and manage your turfs",
                            icon: ShieldCheck,
                          },
                          {
                            value: "user",
                            label: "Sign up as user",
                            description: "Book venues and play matches",
                            icon: UserRound,
                          },
                        ].map(({ value, label, description, icon: Icon }) => {
                          const isSelected = selectedRole === value;
                          return (
                            <button
                              key={value}
                              type="button"
                              onClick={() => {
                                setSelectedRole(value as "owner" | "user");
                                field.handleChange(value as "owner" | "user");
                              }}
                              className={[
                                "rounded-xl border p-3 text-left transition-all",
                                isSelected
                                  ? "border-primary bg-primary/10 shadow-glow"
                                  : "border-border bg-background/40 hover:border-primary/60 hover:bg-primary/5",
                              ].join(" ")}
                            >
                              <div
                                className={[
                                  "mb-2 flex h-9 w-9 items-center justify-center rounded-lg",
                                  isSelected ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary",
                                ].join(" ")}
                              >
                                <Icon className="h-4 w-4" />
                              </div>
                              <div className="text-sm font-semibold text-foreground">{label}</div>
                              <div className="mt-1 text-xs text-muted-foreground">{description}</div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </form.Field>

                  {/* Name Field – now using registerBaseSchema.shape */}
                  <form.Field
                    name="name"
                    validators={{ onChange: registerBaseSchema.shape.name }}
                  >
                    {(field) => (
                      <div className="space-y-2">
                        <Label htmlFor={field.name}>Full name</Label>
                        <div className="relative">
                          <Input
                            id={field.name}
                            type="text"
                            placeholder="Enter your full name"
                            className="h-11"
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                            aria-invalid={!!field.state.meta.errors.length}
                          />
                        </div>
                        {field.state.meta.errors.length > 0 && (
                          <p className="text-sm text-destructive">
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
                      <div className="space-y-2">
                        <Label htmlFor={field.name}>Email address</Label>
                        <div className="relative">
                          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id={field.name}
                            type="email"
                            placeholder="you@example.com"
                            className="h-11 pl-10"
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                            aria-invalid={!!field.state.meta.errors.length}
                          />
                        </div>
                        {field.state.meta.errors.length > 0 && (
                          <p className="text-sm text-destructive">
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
                      <div className="space-y-2">
                        <Label htmlFor={field.name}>Password</Label>
                        <div className="relative">
                          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id={field.name}
                            type={showPassword ? "text" : "password"}
                            placeholder="Create a password"
                            className="h-11 pl-10 pr-10"
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                            aria-invalid={!!field.state.meta.errors.length}
                          />
                          <button
                            type="button"
                            onClick={togglePasswordVisibility}
                            className="absolute right-3 top-1/2 z-10 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        {field.state.meta.errors.length > 0 && (
                          <p className="text-sm text-destructive">
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
                      <div className="space-y-2">
                        <Label htmlFor={field.name}>Confirm password</Label>
                        <div className="relative">
                          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id={field.name}
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Repeat your password"
                            className="h-11 pl-10 pr-10"
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                            aria-invalid={!!field.state.meta.errors.length}
                          />
                          <button
                            type="button"
                            onClick={toggleConfirmPasswordVisibility}
                            className="absolute right-3 top-1/2 z-10 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
                            aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        {field.state.meta.errors.length > 0 && (
                          <p className="text-sm text-destructive">
                            {formatFieldErrors(field.state.meta.errors)}
                          </p>
                        )}
                      </div>
                    )}
                  </form.Field>

                  {/* Server error */}
                  {serverError && (
                    <Alert variant="destructive">
                      <AlertDescription>{serverError}</AlertDescription>
                    </Alert>
                  )}

                  {/* Submit Button */}
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
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
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
