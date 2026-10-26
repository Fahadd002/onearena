"use client";

import { motion } from "motion/react";
import { CheckCircle, User, FileText, Zap, Clock, AlertCircle, Lock, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { OwnerProfile } from "../_types";
import { MANDATORY_PROFILE_FIELDS, MANDATORY_DOCUMENT_FIELDS } from "../_types";

interface OwnerOnboardingStepsProps {
  profile: OwnerProfile | null | undefined;
}

export default function OwnerOnboardingSteps({ profile }: OwnerOnboardingStepsProps) {
  const status = (profile?.verificationStatus ?? "CREATED") as "CREATED" | "PENDING" | "SUBMITTED" | "APPROVED" | "REJECTED";
  const isApproved = status === "APPROVED";

  // Calculate completion for each step
  const profileCompleted = profile
    ? MANDATORY_PROFILE_FIELDS.filter((field) => !!profile[field]).length
    : 0;
  const profileTotal = MANDATORY_PROFILE_FIELDS.length;

  const documentsUploaded = profile
    ? MANDATORY_DOCUMENT_FIELDS.filter(
      (key) => profile[key as keyof OwnerProfile]
    ).length
    : 0;
  const documentsTotal = MANDATORY_DOCUMENT_FIELDS.length;

  const profileDone = profileCompleted === profileTotal;
  const documentsDone = documentsUploaded === documentsTotal;
  const subscriptionDone = isApproved;

  const inProgress: "profile" | "documents" | "subscription" | null =
    status === "PENDING" || status === "CREATED" ? "profile" :
      status === "SUBMITTED" ? "documents" :
        status === "APPROVED" && documentsDone && !subscriptionDone ? "subscription" : null;

  const steps = [
    {
      id: "profile",
      number: 1,
      title: "Profile Information",
      description: "Fill in your company details, contact info, and business identifiers",
      icon: User,
      completed: profileDone,
      inProgress: inProgress === "profile",
      href: "/owner-profile/profile",
      count: `${profileCompleted}/${profileTotal}`,
      locked: false,
    },
    {
      id: "documents",
      number: 2,
      title: "Upload Documents",
      description: "Upload NID, Trade License, and Business Logo for verification",
      icon: FileText,
      completed: documentsDone,
      inProgress: inProgress === "documents",
      href: "/owner-profile/documents",
      count: `${documentsUploaded}/${documentsTotal}`,
      locked: !profileDone,
    },
    {
      id: "subscription",
      number: 3,
      title: "Choose Subscription",
      description: "Select a plan and activate your owner dashboard access",
      icon: Zap,
      completed: subscriptionDone,
      inProgress: inProgress === "subscription",
      href: "/owner-profile/subscription",
      count: subscriptionDone ? "Active" : "Select Plan",
      locked: !documentsDone,
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-12">
      <div className="container mx-auto max-w-4xl px-4 py-10 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
            <span className="relative flex h-2 w-2 rounded-full bg-primary animate-pulse" />
            Owner Onboarding
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Complete your <span className="text-gradient-pitch">owner setup</span>
          </h1>
          <p className="mt-3 text-lg text-muted-foreground max-w-2xl mx-auto">
            Three steps to unlock your venue management dashboard. Your progress is saved automatically.
          </p>
        </div>

        {/* Progress Timeline */}
        <div className="relative mb-12 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
          <div className="hidden md:block">
            <div className="relative flex items-start justify-between gap-2">
              <div className="absolute left-[52px] right-[52px] top-10 h-1 -translate-y-1/2">
                <div className="relative h-full w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="absolute left-0 top-0 h-full bg-gradient-to-r from-green-500 via-primary to-primary transition-all duration-700"
                    style={{
                      width: profileDone
                        ? "100%"
                        : documentsDone
                          ? "66%"
                          : profileCompleted > 0
                            ? `${(profileCompleted / profileTotal) * 50}%`
                            : "0%",
                    }}
                  />
                </div>
              </div>

              {steps.map((step, index) => (
                <div key={step.id} className="relative flex flex-col items-center z-10 flex-1 max-w-[200px]">
                  <div
                    className={`relative flex size-[52px] items-center justify-center rounded-full border-2 transition-all duration-300 ${step.completed
                        ? "bg-green-500 border-green-500 text-white shadow-lg shadow-green-500/30"
                        : step.inProgress
                          ? "bg-primary border-primary text-white ring-4 ring-primary/20 shadow-lg shadow-primary/30"
                          : step.locked
                            ? "bg-muted/40 border-muted text-muted-foreground/50"
                            : "bg-background border-border text-muted-foreground"
                      }`}
                  >
                    {step.completed ? (
                      <CheckCircle className="size-7" />
                    ) : step.locked ? (
                      <Lock className="size-7" />
                    ) : (
                      <span className="font-extrabold text-xl">{step.number}</span>
                    )}
                  </div>

                  <div className="mt-3 text-center">
                    <p className={`text-sm font-bold leading-tight ${step.completed || step.inProgress ? "text-foreground" : "text-muted-foreground"
                      }`}>
                      Step {step.number}: {step.title}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground leading-snug line-clamp-2">
                      {step.description}
                    </p>
                    <p className="mt-1.5 text-[11px] font-semibold text-primary">
                      {step.count}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile: Vertical Stepper */}
          <div className="md:hidden space-y-4">
            {steps.map((step, index) => (
              <div key={step.id} className="relative flex items-start gap-3">
                {index < steps.length - 1 && (
                  <div className="absolute left-5 top-14 bottom-[-18px] w-0.5 bg-muted">
                    <div
                      className={`w-full transition-all duration-500 ${step.completed ? "bg-green-500" : step.inProgress ? "bg-primary" : "bg-muted"
                        }`}
                      style={{
                        height: step.completed || step.inProgress ? "50%" : "0%",
                      }}
                    />
                  </div>
                )}
                <div
                  className={`relative flex size-10 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300 ${step.completed
                      ? "bg-green-500 border-green-500 text-white"
                      : step.inProgress
                        ? "bg-primary border-primary text-white ring-4 ring-primary/20"
                        : step.locked
                          ? "bg-muted/40 border-muted text-muted-foreground/50"
                          : "bg-background border-border text-muted-foreground"
                    }`}
                >
                  {step.completed ? (
                    <CheckCircle className="size-5" />
                  ) : step.locked ? (
                    <Lock className="size-5" />
                  ) : (
                    <span className="font-extrabold text-sm">{step.number}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <p className={`text-sm font-bold leading-tight ${step.completed || step.inProgress ? "text-foreground" : "text-muted-foreground"
                    }`}>
                    Step {step.number}: {step.title}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground leading-snug line-clamp-2">
                    {step.description}
                  </p>
                  <p className="mt-1 text-[11px] font-semibold text-primary">{step.count}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Step Cards */}
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
          {steps.map((step, index) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 + index * 0.1 }}
              className={`relative group overflow-hidden rounded-2xl border p-6 transition-all duration-300 ${step.completed
                  ? "bg-green-50/50 border-green-500/20 dark:bg-green-950/20"
                  : step.inProgress
                    ? "bg-primary/5 border-primary/30 ring-2 ring-primary/20"
                    : step.locked
                      ? "bg-muted/30 border-muted"
                      : "bg-card border-border hover:border-primary/30 hover:shadow-lg"
                }`}
            >
              {/* Step number badge */}
              <div className="absolute right-6 top-6">
                <span className={`inline-flex items-center justify-center size-8 rounded-full text-xs font-bold ${step.completed
                    ? "bg-green-500 text-white"
                    : step.inProgress
                      ? "bg-primary text-white"
                      : step.locked
                        ? "bg-muted text-muted-foreground"
                        : "bg-background border border-border text-muted-foreground"
                  }`}>
                  {step.completed ? <CheckCircle className="size-4" /> : step.number}
                </span>
              </div>

              {/* Content */}
              <div className="flex items-start gap-4 pr-16">
                <div
                  className={`flex-shrink-0 flex size-12 items-center justify-center rounded-xl ${step.completed
                      ? "bg-green-500/10 text-green-500"
                      : step.inProgress
                        ? "bg-primary/10 text-primary"
                        : step.locked
                          ? "bg-muted text-muted-foreground"
                          : "bg-muted/50 text-muted-foreground"
                    }`}
                >
                  <step.icon className="size-6" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-display text-lg font-semibold text-foreground">{step.title}</h3>
                    {step.inProgress && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider animate-pulse">
                        <span className="relative flex h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                        In Progress
                      </span>
                    )}
                    {step.locked && !step.completed && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
                        <Lock className="size-3" />
                        Locked
                      </span>
                    )}
                    {step.completed && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 text-[10px] font-bold uppercase tracking-wider">
                        <CheckCircle className="size-3" />
                        Completed
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">{step.description}</p>

                  <div className="flex items-center gap-3">
                    <Button
                      variant={step.completed || step.inProgress ? "outline" : step.locked ? "outline" : "default"}
                      size="sm"
                      asChild
                      disabled={step.locked}
                      className={`w-full sm:w-auto gap-2 transition-all ${step.inProgress ? "bg-primary/5 text-primary border-primary hover:bg-primary/10" : ""
                        }`}
                    >
                      <Link href={step.href}>
                        {step.completed ? (
                          <>Review <ChevronRight className="size-4" /></>
                        ) : step.inProgress ? (
                          <>Continue <ChevronRight className="size-4" /></>
                        ) : step.locked ? (
                          <>Locked <Lock className="size-4" /></>
                        ) : (
                          <>Get Started <ChevronRight className="size-4" /></>
                        )}
                      </Link>
                    </Button>
                    {!step.completed && !step.locked && step.inProgress && (
                      <Button variant="ghost" size="sm" className="w-full sm:w-auto">
                        <AlertCircle className="mr-2 size-4" />
                        Needs Attention
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Completion indicator */}
              {step.completed && (
                <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 via-transparent to-green-500/5 pointer-events-none" />
              )}
            </motion.div>
          ))}
        </div>

        {/* Status Summary */}
        <div className="mt-10 rounded-2xl border border-border bg-card/50 p-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
          <h3 className="font-display text-lg font-semibold text-center mb-6">Current Status</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-xl bg-muted/50">
              <p className="text-3xl font-bold text-primary">{profileCompleted}/{profileTotal}</p>
              <p className="text-xs text-muted-foreground mt-1">Profile Fields</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-muted/50">
              <p className="text-3xl font-bold text-emerald-600">{documentsUploaded}/{documentsTotal}</p>
              <p className="text-xs text-muted-foreground mt-1">Documents</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-muted/50">
              <p className="text-3xl font-bold text-purple-600">{isApproved ? "Active" : "Pending"}</p>
              <p className="text-xs text-muted-foreground mt-1">Subscription</p>
            </div>
          </div>
        </div>

        {/* Next Action */}
        <div className="mt-8 text-center animate-in fade-in duration-500 delay-400">
          {status === "CREATED" || status === "PENDING" ? (
            <Button size="lg" asChild className="w-full sm:w-auto px-8">
              <Link href="/owner-profile/profile">
                <User className="mr-2 size-5" />
                Complete Your Profile
              </Link>
            </Button>
          ) : profileDone && !documentsDone ? (
            <Button size="lg" asChild className="w-full sm:w-auto px-8">
              <Link href="/owner-profile/documents">
                <FileText className="mr-2 size-5" />
                Upload Documents
              </Link>
            </Button>
          ) : documentsDone && !isApproved ? (
            <div className="space-y-3">
              <p className="text-muted-foreground">
                Documents submitted. Waiting for admin review.
              </p>
              <Button variant="outline" size="lg" asChild className="w-full sm:w-auto px-8">
                <Link href="/owner-profile/subscription">
                  <Zap className="mr-2 size-5" />
                  View Subscription Plans
                </Link>
              </Button>
            </div>
          ) : isApproved ? (
            <Button size="lg" asChild className="w-full sm:w-auto px-8" variant="secondary">
              <Link href="/owner-profile/subscription">
                <Zap className="mr-2 size-5" />
                Manage Subscription
              </Link>
            </Button>
          ) : (
            <Button size="lg" asChild className="w-full sm:w-auto px-8">
              <Link href="/owner-profile/profile">
                <User className="mr-2 size-5" />
                Start Setup
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}