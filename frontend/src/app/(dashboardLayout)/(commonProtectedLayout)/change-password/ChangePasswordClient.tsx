"use client";

import { FormEvent, useState } from "react";
import { changePassword } from "@/services/auth.services";

const ChangePassword = () => {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setError(null);
    const form = new FormData(event.currentTarget);
    const currentPassword = String(form.get("currentPassword") || "");
    const newPassword = String(form.get("newPassword") || "");
    const confirmPassword = String(form.get("confirmPassword") || "");

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setPending(true);
    const result = await changePassword(currentPassword, newPassword);
    setPending(false);
    if (!result.success) {
      setError(result.message || "Password change failed.");
      return;
    }
    event.currentTarget.reset();
    setMessage(result.message || "Password changed successfully.");
  };

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-10 sm:px-6">
      <div className="mb-8"><p className="text-sm font-medium uppercase tracking-[0.18em] text-primary">Security</p><h1 className="mt-2 font-display text-4xl text-foreground">Change password</h1></div>
      <form onSubmit={submit} className="grid gap-5 rounded-xl border border-border/70 bg-card/80 p-6 shadow-elevated">
        {[["currentPassword", "Current password"], ["newPassword", "New password"], ["confirmPassword", "Confirm new password"]].map(([name, label]) => (
          <label key={name} className="grid gap-2 text-sm font-medium text-foreground">
            {label}<input name={name} type="password" required minLength={6} className="h-11 rounded-md border border-input bg-background px-3 text-foreground outline-none focus:ring-2 focus:ring-primary" />
          </label>
        ))}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {message && <p className="text-sm text-primary">{message}</p>}
        <button type="submit" disabled={pending} className="h-11 rounded-md bg-primary px-4 font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60">{pending ? "Changing password..." : "Change password"}</button>
      </form>
    </main>
  );
}

export default ChangePassword
