"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "motion/react";
import {
  BadgeCheck,
  Check,
  Clock,
  Copy,
  CreditCard,
  LifeBuoy,
  Mail,
  MapPin,
  Send,
  Trophy,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { contactZodSchema, type IContactPayload } from "@/zod/contact.validation";
import { ContactSkeleton } from "./_components/ContactSkeleton";

const CONTACT_EMAIL = "info.onersys@gmail.com";

const topics = [
  { value: "BOOKING", label: "Booking or slot issue" },
  { value: "REFUND", label: "Refund or payment" },
  { value: "OWNER_REGISTRATION", label: "List my turf" },
  { value: "FEEDBACK", label: "Feedback" },
  { value: "OTHER", label: "Something else" },
];

const topicLabel = (value: IContactPayload["topic"]) =>
  topics.find((topic) => topic.value === value)?.label ?? "General enquiry";

const channels = [
  {
    icon: Mail,
    title: "Email us",
    body: "The fastest way to reach the OneArena team. We reply to every message.",
    action: CONTACT_EMAIL,
    href: `mailto:${CONTACT_EMAIL}`,
  },
  {
    icon: Clock,
    title: "Support hours",
    body: "Saturday to Thursday, 10:00 – 20:00 (GMT+6). Friday by appointment.",
    action: "Sun–Thu, 10am – 8pm",
    href: null,
  },
  {
    icon: MapPin,
    title: "Where we operate",
    body: "OneArena is live across Dhaka and expanding to Chattogram and Sylhet.",
    action: "Dhaka, Bangladesh",
    href: null,
  },
];

const reasons = [
  { icon: Trophy, text: "Availability, pricing or a slot that will not load" },
  { icon: CreditCard, text: "Advance payments, refunds and cancellation tiers" },
  { icon: UserPlus, text: "Owner registration, verification and payouts" },
  { icon: BadgeCheck, text: "Verified turf listing and review moderation" },
];

export default function ContactPageClient() {
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<IContactPayload>({
    resolver: zodResolver(contactZodSchema),
    defaultValues: { name: "", email: "", topic: "BOOKING", message: "" },
    mode: "onBlur",
  });

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy the address");
    }
  };

  /* There is no contact endpoint on the API, so the form hands the composed
     message to the visitor's mail client instead of posting anywhere. */
  const onSubmit = (values: IContactPayload) => {
    const subject = `[OneArena] ${topicLabel(values.topic)}`;
    const body = `Name: ${values.name}\nEmail: ${values.email}\nTopic: ${topicLabel(values.topic)}\n\n${values.message}`;

    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;

    toast.success("Opening your email app…");
  };

  if (loading) return <ContactSkeleton />;

  const fromLeft = {
    initial: { opacity: 0, x: -48 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  };

  const fromRight = {
    initial: { opacity: 0, x: 48 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  };

  return (
    <main className="pb-20 pt-24">
      <header className="relative overflow-hidden border-b border-border bg-surface/40">
        <div className="absolute inset-0 bg-flood" aria-hidden="true" />
        <motion.div
          {...fromLeft}
          className="relative mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Contact</p>
          <h1 className="mt-3 text-3xl uppercase sm:text-4xl lg:text-5xl text-foreground">
            We&apos;re here to <span className="text-gradient-pitch">help you play</span>
          </h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Booking trouble, a refund query, or you want to list your venue? Send us a note and the
            team will get back to you — usually within one working day.
          </p>

          <div className="mt-8 inline-flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
            <Mail className="size-5 shrink-0 text-primary" />
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="font-mono text-sm font-semibold text-foreground transition-colors hover:text-primary sm:text-base"
            >
              {CONTACT_EMAIL}
            </a>
            <Button
              type="button"
              variant="glass"
              size="sm"
              onClick={copyEmail}
              className="rounded-full"
              aria-label="Copy email address"
            >
              {copied ? <Check /> : <Copy />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </motion.div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <section className="mt-10 grid gap-4 sm:grid-cols-3">
          {channels.map((channel, index) => (
            <motion.div
              key={channel.title}
              initial={{ opacity: 0, x: index % 2 === 0 ? -40 : 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
              className="surface-card rounded-2xl p-5"
            >
              <channel.icon className="size-5 text-primary" />
              <h2 className="mt-4 font-display text-lg tracking-wide">{channel.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{channel.body}</p>
              {channel.href ? (
                <a
                  href={channel.href}
                  className="mt-3 inline-block break-all text-sm font-semibold text-primary hover:underline"
                >
                  {channel.action}
                </a>
              ) : (
                <p className="mt-3 text-sm font-semibold text-foreground">{channel.action}</p>
              )}
            </motion.div>
          ))}
        </section>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          {/* ── Message form ── */}
          <motion.section {...fromLeft} className="surface-card rounded-2xl p-6">
            <div className="flex items-center gap-2">
              <LifeBuoy className="size-5 text-primary" />
              <h2 className="font-display text-xl tracking-wide">Send us a message</h2>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Fill this in and your default email app opens with everything pre-filled — send it and
              we&apos;ll take it from there.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="contact-name">Your name</Label>
                  <Input
                    id="contact-name"
                    placeholder="e.g. Arif Hossain"
                    aria-invalid={Boolean(errors.name)}
                    {...register("name")}
                  />
                  {errors.name && (
                    <p className="text-xs text-destructive">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="contact-email">Email address</Label>
                  <Input
                    id="contact-email"
                    type="email"
                    placeholder="you@example.com"
                    aria-invalid={Boolean(errors.email)}
                    {...register("email")}
                  />
                  {errors.email && (
                    <p className="text-xs text-destructive">{errors.email.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="contact-topic">What is this about?</Label>
                <Controller
                  control={control}
                  name="topic"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="contact-topic" className="h-10 w-full">
                        <SelectValue placeholder="Choose a topic" />
                      </SelectTrigger>
                      <SelectContent>
                        {topics.map((topic) => (
                          <SelectItem key={topic.value} value={topic.value}>
                            {topic.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="contact-message">Message</Label>
                <Textarea
                  id="contact-message"
                  rows={6}
                  placeholder="Tell us what happened, including the booking number if you have one."
                  aria-invalid={Boolean(errors.message)}
                  {...register("message")}
                />
                {errors.message && (
                  <p className="text-xs text-destructive">{errors.message.message}</p>
                )}
              </div>

              <Button type="submit" size="lg" disabled={isSubmitting} className="w-full sm:w-auto">
                <Send />
                Send message
              </Button>

              <p className="text-xs text-muted-foreground">
                Prefer to write directly?{" "}
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="font-medium text-primary hover:underline"
                >
                  {CONTACT_EMAIL}
                </a>
              </p>
            </form>
          </motion.section>

          {/* ── What to expect ── */}
          <motion.section {...fromRight} transition={{ ...fromRight.transition, delay: 0.12 }} className="flex flex-col gap-4">
            <div className="surface-card rounded-2xl p-6">
              <h2 className="font-display text-xl tracking-wide">What to expect</h2>
              <ul className="mt-4 space-y-3">
                {reasons.map((reason) => (
                  <li key={reason.text} className="flex items-start gap-2.5 text-sm">
                    <reason.icon className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span className="text-muted-foreground">{reason.text}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="surface-card rounded-2xl p-6">
              <h2 className="font-display text-xl tracking-wide">Faster routes</h2>
              <div className="mt-4 flex flex-col gap-2.5 text-sm">
                <p className="text-muted-foreground">
                  Already booked? Check the status and cancel or request a refund from your own
                  dashboard — no email needed.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/user/dashboard/bookings"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    <Trophy className="size-3.5" />
                    My bookings
                  </Link>
                  <Link
                    href="/signup"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-primary/60 hover:text-primary"
                  >
                    <UserPlus className="size-3.5" />
                    Create an account
                  </Link>
                </div>
              </div>
            </div>
          </motion.section>
        </div>
      </div>
    </main>
  );
}