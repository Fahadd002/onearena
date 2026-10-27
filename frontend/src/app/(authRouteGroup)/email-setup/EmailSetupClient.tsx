"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { API_ENDPOINTS } from "@/lib/api/config";
import { httpClient } from "@/lib/axios/httpClient";
import { formatFieldErrors } from "@/lib/form-errors";
import { IEmailSetupPayload, emailSetupZodSchema } from "@/zod/auth.validation";

export default function EmailSetupClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get("phone") || "";
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState(false);

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (payload: IEmailSetupPayload) =>
      httpClient.post<null>(API_ENDPOINTS.auth.setupEmail, { ...payload, phone }),
  });

  const form = useForm({
    defaultValues: {
      email: "",
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
    onSubmit: async ({ value }) => {
      setServerError(null);
      if (!phone) {
        setServerError("We couldn't identify your phone account. Please return to login and try again.");
        return;
      }

      try {
        const parsedPayload = emailSetupZodSchema.safeParse(value);
        if (!parsedPayload.success) {
          setServerError(parsedPayload.error.issues[0]?.message || "Please check your account details");
          return;
        }

        await mutateAsync(parsedPayload.data);
        toast.success("Account details saved. Verify your email to continue.");
        router.push(`/verify-email?email=${encodeURIComponent(value.email.trim().toLowerCase())}`);
      } catch (error: unknown) {
        const apiError = error as {
          response?: { data?: { message?: string } };
          message?: string;
        };
        const message = apiError.response?.data?.message || apiError.message || "Account setup failed";
        setServerError(message);
        toast.error(message);
      }
    },
  });

  const passwordFields = [
    { name: "currentPassword" as const, label: "Temporary password", icon: ShieldCheck, placeholder: "Enter the password provided for your account" },
    { name: "newPassword" as const, label: "New password", icon: Lock, placeholder: "Create a secure password" },
    { name: "confirmPassword" as const, label: "Confirm new password", icon: Lock, placeholder: "Re-enter your new password" },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0 bg-flood opacity-70" />
      <div className="auth-glow animate-float-slow absolute left-[-8%] top-[-5%] h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
      <div className="auth-glow animate-float-slow absolute bottom-[-10%] right-[-5%] h-80 w-80 rounded-full bg-accent/15 blur-3xl [animation-delay:1800ms]" />

      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid w-full items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="animate-fade-up hidden lg:block" style={{ animationDelay: "100ms" }}>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to login
            </Link>

            <div className="mt-8 max-w-md">
              <span className="inline-flex rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                Secure your account
              </span>
              <h1 className="mt-4 font-display text-3xl text-foreground sm:text-4xl">
                Add an email and choose your password.
              </h1>
              <p className="mt-4 text-base text-muted-foreground">
                Use the temporary password provided for your account to confirm it&apos;s yours.
                We&apos;ll send a verification code to your new email before you can sign in.
              </p>

              <div className="mt-6 space-y-3">
                {[
                  "Your profile and bookings stay linked",
                  "Choose a password only you know",
                  "Verify your new email before logging in",
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

          <div className="animate-fade-up mx-auto w-full max-w-md" style={{ animationDelay: "200ms" }}>
            <Card className="relative border-border/70 bg-card/80 shadow-elevated backdrop-blur-xl">
              <CardHeader className="space-y-1.5 pb-3 pt-6">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-2xl font-bold text-foreground">Complete account setup</CardTitle>
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground lg:hidden"
                  >
                    <ArrowLeft className="h-3 w-3" />
                    Login
                  </Link>
                </div>
                <CardDescription className="text-sm text-muted-foreground">
                  Add your email and set a new password. We&apos;ll email you a code to verify the address.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    form.handleSubmit();
                  }}
                  className="space-y-4"
                >
                  <form.Field
                    name="email"
                    validators={{ onChange: emailSetupZodSchema.shape.email }}
                  >
                    {(field) => (
                      <div className="space-y-1.5">
                        <Label htmlFor={field.name} className="text-sm">Email address</Label>
                        <div className="relative">
                          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id={field.name}
                            type="email"
                            autoComplete="email"
                            placeholder="you@example.com"
                            className="h-10 pl-10"
                            value={field.state.value}
                            onChange={(event) => field.handleChange(event.target.value)}
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

                  {passwordFields.map(({ name, label, icon: Icon, placeholder }) => (
                    <form.Field
                      key={name}
                      name={name}
                      validators={{ onChange: emailSetupZodSchema.shape[name] }}
                    >
                      {(field) => (
                        <div className="space-y-1.5">
                          <Label htmlFor={field.name} className="text-sm">{label}</Label>
                          <div className="relative">
                            <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              id={field.name}
                              type={showPasswords ? "text" : "password"}
                              autoComplete={name === "currentPassword" ? "current-password" : "new-password"}
                              placeholder={placeholder}
                              className="h-10 pl-10 pr-12"
                              value={field.state.value}
                              onChange={(event) => field.handleChange(event.target.value)}
                              onBlur={field.handleBlur}
                              aria-invalid={!!field.state.meta.errors.length}
                            />
                            {name !== "currentPassword" && name === "newPassword" && (
                              <button
                                type="button"
                                onClick={() => setShowPasswords((visible) => !visible)}
                                className="absolute right-1 top-1/2 z-10 flex size-8 -translate-y-1/2 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                                aria-label={showPasswords ? "Hide passwords" : "Show passwords"}
                              >
                                {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            )}
                          </div>
                          {field.state.meta.errors.length > 0 && (
                            <p className="text-xs text-destructive">
                              {formatFieldErrors(field.state.meta.errors)}
                            </p>
                          )}
                        </div>
                      )}
                    </form.Field>
                  ))}

                  {serverError && (
                    <Alert variant="destructive">
                      <AlertDescription className="text-sm">{serverError}</AlertDescription>
                    </Alert>
                  )}

                  <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting] as const}>
                    {([canSubmit, isSubmitting]) => (
                      <Button
                        type="submit"
                        variant="hero"
                        size="lg"
                        className="w-full"
                        disabled={!canSubmit || isSubmitting || isPending}
                      >
                        {isSubmitting || isPending ? "Saving account…" : "Save and send verification code"}
                      </Button>
                    )}
                  </form.Subscribe>
                </form>

                <div className="pt-5 text-center">
                  <Link href="/login" className="text-sm font-medium text-primary hover:text-primary/80">
                    Back to login
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
