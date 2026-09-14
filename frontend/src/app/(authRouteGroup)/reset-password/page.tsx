"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react";
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

import { resetPassword } from "@/services/auth.services";
import { resetPasswordZodSchema, IResetPasswordPayload } from "@/zod/auth.validation";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailFromUrl = decodeURIComponent(searchParams.get("email") || "");

  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Mutation
  const { mutateAsync, isPending } = useMutation({
    mutationFn: (payload: IResetPasswordPayload) =>
      resetPassword(payload.email, payload.otp, payload.newPassword),
  });

  // TanStack Form
  const form = useForm({
    defaultValues: {
      email: emailFromUrl,
      otp: "",
      newPassword: "",
      confirmPassword: "",
    },
    onSubmit: async ({ value }) => {
      setServerError(null);
      setSuccessMessage(null);
      try {
        const result = (await mutateAsync(value)) as any;

        if (!result?.success) {
          const msg = result?.message || "Password reset failed";
          setServerError(msg);
          toast.error(msg);
          return;
        }

        const msg = result?.message || "Password has been reset successfully!";
        setSuccessMessage(msg);
        toast.success(msg);
      } catch (error: any) {
        console.error("Password reset failed:", error);
        const msg = error?.response?.data?.message || error?.message || "Password reset failed";
        setServerError(msg);
        toast.error(msg);
      }
    },
  });

  // Sync email field with URL param
  const prevEmailRef = useRef(emailFromUrl);
  useEffect(() => {
    if (prevEmailRef.current !== emailFromUrl && emailFromUrl) {
      form.setFieldValue("email", emailFromUrl);
      prevEmailRef.current = emailFromUrl;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailFromUrl]);

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

      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid w-full items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Left decorative column */}
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
                Reset your password
              </span>
              <h1 className="mt-5 font-display text-4xl text-foreground sm:text-5xl">
                Create a new password
              </h1>
              <p className="mt-5 text-lg text-muted-foreground">
                Enter the OTP sent to your email and set a strong new password to secure your account.
              </p>

              <div className="mt-5 space-y-4">
                {[
                  "Secure OTP verification",
                  "Strong password requirements",
                  "Instant access after reset",
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

          {/* Right column – Reset Password Card */}
          <div className="animate-fade-up mx-auto w-full max-w-md" style={{ animationDelay: "200ms" }}>
            <Card className="border-border/70 bg-card/80 shadow-elevated backdrop-blur-xl">
              <CardHeader className="space-y-2 pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-3xl font-bold text-foreground">Reset Password</CardTitle>
                  <Link href="/login" className="text-sm font-medium text-primary hover:text-primary/80">
                    Back to Login
                  </Link>
                </div>
                <CardDescription className="text-base text-muted-foreground">
                  Enter the OTP and set a new password.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-5">
                {successMessage ? (
                  // Success state
                  <>
                    <Alert className="bg-green-500/10 border-green-500/50 text-green-200">
                      <AlertDescription>{successMessage}</AlertDescription>
                    </Alert>
                    <div className="text-center">
                      <Link href="/login" className="text-primary font-medium hover:underline">
                        Back to Login
                      </Link>
                    </div>
                  </>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      form.handleSubmit();
                    }}
                    className="space-y-5"
                  >
                    {/* Email Field */}
                    <form.Field
                      name="email"
                      validators={{ onChange: resetPasswordZodSchema.shape.email }}
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
                              disabled={!!emailFromUrl}
                              aria-invalid={!!field.state.meta.errors.length}
                            />
                          </div>
                          {field.state.meta.errors.length > 0 && (
                            <p className="text-sm text-destructive">
                              {field.state.meta.errors.join(", ")}
                            </p>
                          )}
                        </div>
                      )}
                    </form.Field>

                    {/* OTP Field */}
                    <form.Field
                      name="otp"
                      validators={{ onChange: resetPasswordZodSchema.shape.otp }}
                    >
                      {(field) => (
                        <div className="space-y-2">
                          <Label htmlFor={field.name}>OTP</Label>
                          <div className="relative">
                            <ShieldCheck className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              id={field.name}
                              type="text"
                              placeholder="Enter 6-digit OTP"
                              className="h-11 pl-10"
                              value={field.state.value}
                              onChange={(e) => field.handleChange(e.target.value)}
                              onBlur={field.handleBlur}
                              aria-invalid={!!field.state.meta.errors.length}
                            />
                          </div>
                          {field.state.meta.errors.length > 0 && (
                            <p className="text-sm text-destructive">
                              {field.state.meta.errors.join(", ")}
                            </p>
                          )}
                        </div>
                      )}
                    </form.Field>

                    {/* New Password Field */}
                    <form.Field
                      name="newPassword"
                      validators={{ onChange: resetPasswordZodSchema.shape.newPassword }}
                    >
                      {(field) => (
                        <div className="space-y-2">
                          <Label htmlFor={field.name}>New Password</Label>
                          <div className="relative">
                            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              id={field.name}
                              type={showPassword ? "text" : "password"}
                              placeholder="Enter new password"
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
                              {field.state.meta.errors.join(", ")}
                            </p>
                          )}
                        </div>
                      )}
                    </form.Field>

                    {/* Confirm Password Field */}
                    <form.Field
                      name="confirmPassword"
                      validators={{ onChange: resetPasswordZodSchema.shape.confirmPassword }}
                    >
                      {(field) => (
                        <div className="space-y-2">
                          <Label htmlFor={field.name}>Confirm Password</Label>
                          <div className="relative">
                            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              id={field.name}
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="Confirm new password"
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
                              {field.state.meta.errors.join(", ")}
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
                          {isSubmitting || isPending ? "Resetting Password..." : "Reset Password"}
                        </Button>
                      )}
                    </form.Subscribe>
                  </form>
                )}
              </CardContent>

              {/* Footer (only if not success) */}
              {!successMessage && (
                <div className="px-6 pb-6 text-center">
                  <Link href="/login" className="text-sm font-medium text-primary hover:text-primary/80">
                    Back to Login
                  </Link>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}