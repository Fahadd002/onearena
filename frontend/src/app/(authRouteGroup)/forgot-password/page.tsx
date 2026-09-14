"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Mail, Lock } from "lucide-react";
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

import { forgotPassword } from "@/services/auth.services";
import { forgotPasswordZodSchema } from "@/zod/auth.validation";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  // Mutation
  const { mutateAsync, isPending } = useMutation({
    mutationFn: (email: string) => forgotPassword(email),
  });

  // TanStack Form
  const form = useForm({
    defaultValues: {
      email: "",
    },
    onSubmit: async ({ value }) => {
      setServerError(null);

      // Validate email
      const validation = forgotPasswordZodSchema.safeParse({ email: value.email });
      if (!validation.success) {
        setServerError(validation.error.issues[0].message);
        return;
      }

      try {
        const result = (await mutateAsync(value.email)) as any;

        if (!result?.success) {
          const errorMsg = result?.message || "Failed to send OTP";
          setServerError(errorMsg);
          toast.error(errorMsg);
          return;
        }

        toast.success(result?.message || "Password reset OTP has been sent to your email.");
        router.push(`/reset-password?email=${encodeURIComponent(value.email)}`);
      } catch (error: any) {
        console.error("Forgot password failed:", error);
        const msg = error?.response?.data?.message || error?.message || "Failed to send OTP";
        setServerError(msg);
        toast.error(msg);
      }
    },
  });

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
                Don&apos;t worry, we&apos;ve got you covered.
              </h1>
              <p className="mt-5 text-lg text-muted-foreground">
                Enter your email address and we&apos;ll send you an OTP to reset your password securely.
              </p>

              <div className="mt-5 space-y-4">
                {[
                  "Secure OTP sent to your registered email",
                  "Reset your password in a few clicks",
                  "Get back to managing your bookings quickly",
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

          {/* Right column – Forgot Password Card */}
          <div className="animate-fade-up mx-auto w-full max-w-md" style={{ animationDelay: "200ms" }}>
            <Card className="border-border/70 bg-card/80 shadow-elevated backdrop-blur-xl">
              <CardHeader className="space-y-2 pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-3xl font-bold text-foreground">Forgot Password</CardTitle>
                  <Link href="/login" className="text-sm font-medium text-primary hover:text-primary/80">
                    Back to Login
                  </Link>
                </div>
                <CardDescription className="text-base text-muted-foreground">
                  Enter your email and we&apos;ll send you an OTP to reset your password.
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
                  {/* Email Field */}
                  <form.Field name="email">
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
                            disabled={isPending}
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
                        {isSubmitting || isPending ? "Sending OTP..." : "Send OTP"}
                      </Button>
                    )}
                  </form.Subscribe>
                </form>

                {/* Divider with optional extra actions (or just spacing) */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    <span className="bg-card px-2">Remember your password?</span>
                  </div>
                </div>

                <div className="text-center">
                  <Link href="/login" className="text-sm font-medium text-primary hover:text-primary/80">
                    Back to Login
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}