"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Mail, ShieldCheck } from "lucide-react";
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

import { verifyEmailAction } from "@/app/(authRouteGroup)/verify-email/_action";
import { IVerifyEmailPayload, verifyEmailZodSchema } from "@/zod/auth.validation";

interface VerifyEmailFormProps {
  email: string;
}

const VerifyEmailForm = ({ email }: VerifyEmailFormProps) => {
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Mutation
  const { mutateAsync, isPending } = useMutation({
    mutationFn: (payload: IVerifyEmailPayload) => verifyEmailAction(payload),
  });

  // TanStack Form
  const form = useForm({
    defaultValues: {
      email: email,
      otp: "",
    },
    onSubmit: async ({ value }) => {
      setServerError(null);
      setSuccessMessage(null);
      try {
        const result = (await mutateAsync(value)) as any;

        if (!result?.success) {
          const msg = result?.message || result?.data?.message || "Verification failed";
          setServerError(msg);
          toast.error(msg);
          return;
        }

        const msg = result.message || "Email verified successfully.";
        setSuccessMessage(msg);
        toast.success(msg);
      } catch (error: any) {
        console.error("Verification failed:", error);
        const msg = error?.response?.data?.message || error?.message || "Verification failed";
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

      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center px-4 py-6 sm:px-6 lg:px-8">
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
                Verify your account
              </span>
              <h1 className="mt-4 font-display text-3xl text-foreground sm:text-4xl">
                One step left to start playing.
              </h1>
              <p className="mt-4 text-base text-muted-foreground">
                Enter the OTP we sent to your email to verify your account. Check your{" "}
                <span className="font-semibold text-foreground">inbox</span> and{" "}
                <span className="font-semibold text-foreground">spam folder</span> — the email
                usually arrives within a minute.
              </p>

              <div className="mt-6 space-y-3">
                {[
                  "Secure OTP verification",
                  "Instant access to bookings",
                  "Manage your profile and matches",
                ].map((item) => (
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

          {/* Right column – Verify Email Card */}
          <div className="animate-fade-up mx-auto w-full max-w-md" style={{ animationDelay: "200ms" }}>
            <Card className="relative border-border/70 bg-card/80 shadow-elevated backdrop-blur-xl">
                <CardHeader className="space-y-1.5 pb-3 pt-6">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-2xl font-bold text-foreground">
                    {successMessage ? "Email Verified" : "Verify Email"}
                  </CardTitle>

                  <div className="flex items-center gap-3">
                    <Link
                      href="/"
                      className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground lg:hidden"
                    >
                      <ArrowLeft className="h-3 w-3" />
                      Home
                    </Link>
                  </div>
                </div>

                {!successMessage && (
                  <CardDescription className="text-sm text-muted-foreground">
                    We sent a 6-digit code to{" "}
                    {email ? (
                      <span className="font-semibold text-foreground">{email}</span>
                    ) : (
                      "your email"
                    )}
                    . Please check your{" "}
                    <span className="font-semibold text-foreground">inbox</span> and{" "}
                    <span className="font-semibold text-foreground">spam folder</span>.
                  </CardDescription>
                )}
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Persistent check-inbox / spam hint */}
                {!successMessage && (
                  <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
                    <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Didn&apos;t receive the email? Check your{" "}
                      <span className="font-semibold text-foreground">spam</span> or{" "}
                      <span className="font-semibold text-foreground">junk</span> folder. It may
                      take up to a minute to arrive.
                    </p>
                  </div>
                )}

                {successMessage ? (
                  // Success state
                  <div className="text-center py-4">
                    <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-green-100 text-green-600 mb-3">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <h3 className="font-semibold text-foreground">{successMessage}</h3>
                    <div className="mt-4">
                      <Link href="/login" className="font-medium text-primary hover:underline">
                        Proceed to Login
                      </Link>
                    </div>
                  </div>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      form.handleSubmit();
                    }}
                    className="space-y-4"
                  >
                    {/* Email Field */}
                    <form.Field
                      name="email"
                      validators={{ onChange: verifyEmailZodSchema.shape.email }}
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
                              disabled={!!email}
                              aria-invalid={!!field.state.meta.errors.length}
                            />
                          </div>
                          {field.state.meta.errors.length > 0 && (
                            <p className="text-xs text-destructive">
                              {field.state.meta.errors.join(", ")}
                            </p>
                          )}
                        </div>
                      )}
                    </form.Field>

                    {/* OTP Field */}
                    <form.Field
                      name="otp"
                      validators={{ onChange: verifyEmailZodSchema.shape.otp }}
                    >
                      {(field) => (
                        <div className="space-y-1.5">
                          <Label htmlFor={field.name} className="text-sm">OTP</Label>
                          <div className="relative">
                            <ShieldCheck className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              id={field.name}
                              type="text"
                              placeholder="Enter 6-digit OTP"
                              className="h-10 pl-10"
                              value={field.state.value}
                              onChange={(e) => field.handleChange(e.target.value)}
                              onBlur={field.handleBlur}
                              aria-invalid={!!field.state.meta.errors.length}
                            />
                          </div>
                          {field.state.meta.errors.length > 0 && (
                            <p className="text-xs text-destructive">
                              {field.state.meta.errors.join(", ")}
                            </p>
                          )}
                        </div>
                      )}
                    </form.Field>

                    {/* Server error */}
                    {serverError && (
                      <Alert variant="destructive">
                        <AlertDescription className="text-sm">{serverError}</AlertDescription>
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
                          {isSubmitting || isPending ? "Verifying..." : "Verify Email"}
                        </Button>
                      )}
                    </form.Subscribe>
                  </form>
                )}
              </CardContent>

              {/* Footer (only if not success) */}
              {!successMessage && (
                <div className="px-6 pb-6 text-center">
                  <Link
                    href="/login"
                    className="text-sm font-medium text-primary hover:text-primary/80"
                  >
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
};

export default VerifyEmailForm;