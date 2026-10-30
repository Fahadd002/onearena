"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Save,
  User,
  Mail,
  Eye,
  EyeOff,
  Camera,
  ShieldCheck,
  Send,
  Phone,
  CheckCircle2,
  Sparkles,
  KeyRound,
  Clock,
  Key,
  Edit3,
  XCircle,
  Lock,
  ArrowLeft,
  Home,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { httpClient } from "@/lib/axios/httpClient";
import { API_ENDPOINTS } from "@/lib/api/config";
import { getFileUrl } from "@/lib/utils"; // Import your helper
import { validateBangladeshiMobile } from "@/lib/validators";

export interface IAuthUserMe {
  id: string;
  name: string;
  email: string;
  image: string | null;
  phoneNumber: string | null;
  role: string;
  status: string;
  emailVerified: boolean;
  profileVerified: boolean;
  createdAt: string;
}

export default function MyProfileClient({ initialUser: user }: { initialUser: IAuthUserMe }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [redirectTo, setRedirectTo] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get("redirect");
    if (redirect) setRedirectTo(redirect);
  }, []);

  const [profileForm, setProfileForm] = useState({
    name: user?.name || "",
    phoneNumber: user?.phoneNumber || "",
  });
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const [passwordForm, setPasswordForm] = useState({
    otp: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Process initial profile image with getFileUrl
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    user?.image ? getFileUrl(user.image) : null
  );
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [codeSent, setCodeSent] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || "",
        phoneNumber: user.phoneNumber || "",
      });
      setAvatarPreview((current) =>
        current ?? (user.image ? getFileUrl(user.image) : null)
      );
    }
  }, [user]);

  // Mutations
  const sendCodeMutation = useMutation({
    mutationFn: async () => {
      if (!user.email) throw new Error("Email not available");
      const res = await httpClient.post(API_ENDPOINTS.auth.forgotPassword, {
        email: user.email,
      });
      return res.data;
    },
    onSuccess: () => {
      setCodeSent(true);
      toast.success(`Verification code sent to ${user.email}`);
    },
    onError: (err: Error) =>
      toast.error(err.message || "Failed to send verification code"),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async () => {
      const res = await httpClient.post(API_ENDPOINTS.auth.resetPassword, {
        email: user?.email,
        otp: passwordForm.otp,
        newPassword: passwordForm.newPassword,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Password updated successfully!");
      setPasswordForm({ otp: "", newPassword: "", confirmPassword: "" });
      setCodeSent(false);
    },
    onError: (err: Error) =>
      toast.error(err.message || "Failed to reset password"),
  });

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      const res = await httpClient.put<{ data: { name: string; phoneNumber: string | null } }>(
        API_ENDPOINTS.auth.userProfile,
        {
          name: profileForm.name,
          phoneNumber: profileForm.phoneNumber,
        }
      );
      return res.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["user-info"] });
      toast.success("Profile updated successfully");
      if (data?.name) {
        setProfileForm((f) => ({ ...f, name: data.name }));
      }
      if (data?.phoneNumber !== undefined) {
        setProfileForm((f) => ({ ...f, phoneNumber: data.phoneNumber || "" }));
      }
      if (redirectTo) {
        router.push(redirectTo);
      }
    },
    onError: (err: Error) =>
      toast.error(err.message || "Failed to update profile"),
  });

  const uploadAvatarMutation = useMutation({
    mutationFn: async () => {
      if (!avatarFile) return;
      const formData = new FormData();
      formData.append("image", avatarFile);
      const res = await httpClient.post<{ data: { image: string } }>(
        API_ENDPOINTS.auth.userProfileImage,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      return res.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["user-info"] });
      toast.success("Profile photo updated");
      if (data?.image) {
        setAvatarPreview(getFileUrl(data.image));
      }
      setAvatarFile(null);
    },
    onError: (err: Error) =>
      toast.error(err.message || "Failed to upload photo"),
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!["image/jpeg", "image/png", "image/jpg", "image/webp"].includes(file.type)) {
        toast.error("Only JPEG, PNG, or WebP images allowed");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size must be less than 5MB");
        return;
      }
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const formatJoinedDateTime = (dateString?: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);

    const formattedDate = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    const formattedTime = date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    return `${formattedDate} at ${formattedTime}`;
  };

  const passwordsMatch =
    Boolean(passwordForm.newPassword) &&
    Boolean(passwordForm.confirmPassword) &&
    passwordForm.newPassword === passwordForm.confirmPassword;

  return (
    <main className="min-h-screen bg-background/50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        
        {/* Profile Card Header */}
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-b from-card via-card to-card/80 p-6 sm:p-8 shadow-sm">
          
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/5 blur-3xl" />
          <div className="pointer-events-none absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-primary/5 blur-3xl" />

          {/* Navigation Action Buttons */}
          <div className="absolute top-5 right-5 sm:top-6 sm:right-6 flex items-center gap-2 z-10">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.back()}
              className="h-8 gap-1.5 text-xs bg-background/80 hover:bg-background backdrop-blur-sm border-border/80 shadow-2xs transition-all"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back</span>
            </Button>

            <Button
              variant="hero"
              size="sm"
              asChild
              className="h-8 gap-1.5 text-xs shadow-md shadow-primary/20 transition-transform hover:-translate-y-0.5"
            >
              <Link href="/">
                <Home className="h-3.5 w-3.5" />
                <span>Home</span>
              </Link>
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-0">
            
            {/* Avatar Upload */}
            <div className="relative group shrink-0">
              <div className="h-28 w-28 sm:h-32 sm:w-32 overflow-hidden rounded-full border-4 border-background shadow-lg bg-muted flex items-center justify-center relative ring-2 ring-border/50">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt={user?.name || "User Avatar"}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={() =>
                      setAvatarPreview(
                        user?.image ? getFileUrl(user.image) : null
                      )
                    }
                  />
                ) : (
                  <User className="h-12 w-12 text-muted-foreground" />
                )}
              </div>

              <label className="absolute bottom-1 right-1 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-lg transition-transform hover:scale-110 ring-2 ring-background">
                <Camera className="h-4 w-4" />
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/jpg,image/webp"
                  onChange={handleAvatarChange}
                  className="sr-only"
                  disabled={uploadAvatarMutation.isPending}
                />
              </label>
            </div>

            {/* User Meta Information */}
            <div className="flex-1 text-center sm:text-left space-y-3 pt-1">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                    {user?.name || "N/A"}
                  </h2>
                  <Badge variant="outline" className="gap-1.5 border-primary/20 bg-primary/10 py-1 text-xs font-semibold capitalize">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    {user?.role?.replace(/_/g, " ").toLowerCase() || "User"}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 text-xs text-muted-foreground pt-0.5">
                  <p className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-primary/70" />
                    {user?.email}
                  </p>
                  {user?.phoneNumber && (
                    <p className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-primary/70" />
                      {user?.phoneNumber}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-muted/60 text-muted-foreground px-3 py-1 rounded-full border border-border/60">
                  <Clock className="h-3.5 w-3.5 text-primary/80" />
                  Joined {formatJoinedDateTime(user?.createdAt)}
                </span>
                {user?.profileVerified && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/20">
                    <Shield className="h-3.5 w-3.5" />
                    Verified Profile
                  </span>
                )}
              </div>

              {avatarFile && (
                <div className="pt-2">
                  <Button
                    size="sm"
                    onClick={() => uploadAvatarMutation.mutate()}
                    disabled={uploadAvatarMutation.isPending}
                    className="gap-2 shadow-sm"
                  >
                    {uploadAvatarMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    Confirm New Photo
                  </Button>
                </div>
              )}
            </div>

          </div>
        </div>

        {/*  Update User Profile & Security Sections */}
        <div className="grid gap-8 lg:grid-cols-2">
          
          {/*  Update User Profile */}
          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm space-y-6 flex flex-col justify-between">
            <div className="space-y-6">
              <div className="border-b border-border/40 pb-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Edit3 className="h-5 w-5 text-primary" /> Update User Profile
                </h3>
                <p className="text-xs text-muted-foreground">
                  Update your display details below.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Full Name <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="name"
                      value={profileForm.name}
                      onChange={(e) =>
                        setProfileForm((f) => ({ ...f, name: e.target.value }))
                      }
                      className="pl-9 h-11"
                      placeholder="Enter your name"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phoneNumber" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Phone Number
                  </Label>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="phoneNumber"
                      value={profileForm.phoneNumber}
                      onChange={(e) => {
                        setProfileForm((f) => ({ ...f, phoneNumber: e.target.value }));
                        setPhoneError(validateBangladeshiMobile(e.target.value));
                      }}
                      className="pl-9 h-11"
                      placeholder="Enter phone number"
                    />
                  </div>
                  {phoneError && <p className="mt-1 text-xs text-destructive">{phoneError}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Email Address (Read-only)
                  </Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={user?.email || ""}
                      disabled
                      className="pl-9 h-11 bg-muted/40 cursor-not-allowed opacity-80"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-border/40">
              <Button
                onClick={() => updateProfileMutation.mutate()}
                disabled={updateProfileMutation.isPending || !profileForm.name.trim() || !!phoneError}
                variant="hero"
                className="gap-2 px-6 w-full sm:w-auto shadow-md shadow-primary/20 transition-transform hover:-translate-y-0.5"
              >
                {updateProfileMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Changes
              </Button>
            </div>
          </div>

          {/* Reset Password */}
          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm space-y-6 flex flex-col justify-between">
            <div className="space-y-6">
              <div className="border-b border-border/40 pb-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Lock className="h-5 w-5 text-primary" /> Reset Password
                </h3>
                <p className="text-xs text-muted-foreground">
                  Securely reset your password in two steps.
                </p>
              </div>

              {/* Step Indicator */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold border-2 ${
                    !codeSent ? "border-primary bg-primary/10 text-primary" : "border-emerald-500 bg-emerald-500 text-white"
                  }`}>
                    1
                  </div>
                  <span className={`text-sm font-medium ${!codeSent ? "text-foreground" : "text-emerald-500"}`}>Request OTP</span>
                </div>
                <div className="hidden sm:block flex-1 h-px bg-border/50 mx-4" />
                <div className="flex items-center gap-2">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold border-2 ${
                    codeSent ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                  }`}>
                    2
                  </div>
                  <span className={`text-sm font-medium ${codeSent ? "text-foreground" : "text-muted-foreground"}`}>Set New Password</span>
                </div>
              </div>

              {!codeSent ? (
                /* Step 1: Request OTP */
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary">Step 1: Request OTP</p>
                    <p className="text-xs font-medium text-foreground">
                      We'll send a 6-digit code to <span className="font-semibold">{user?.email}</span>
                    </p>
                  </div>
                </div>
              ) : (
                /* Step 2: Enter OTP & New Password */
                <div className="space-y-4">
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                    <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5" /> OTP sent successfully
                    </p>
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label htmlFor="otp" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      OTP Code <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Key className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="otp"
                        value={passwordForm.otp}
                        onChange={(e) =>
                          setPasswordForm((f) => ({ ...f, otp: e.target.value }))
                        }
                        placeholder="Enter 6-digit OTP"
                        className="pl-9 h-11 font-mono tracking-widest text-center"
                        maxLength={6}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="newPassword" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        New Password <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="newPassword"
                          type={showNewPassword ? "text" : "password"}
                          value={passwordForm.newPassword}
                          onChange={(e) =>
                            setPasswordForm((f) => ({
                              ...f,
                              newPassword: e.target.value,
                            }))
                          }
                          placeholder="Min 6 characters"
                          className="pl-9 pr-10 h-11"
                          minLength={6}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <p className="text-[10px] text-muted-foreground">Minimum 6 characters</p>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="confirmPassword" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Confirm Password <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          value={passwordForm.confirmPassword}
                          onChange={(e) =>
                            setPasswordForm((f) => ({
                              ...f,
                              confirmPassword: e.target.value,
                            }))
                          }
                          placeholder="Re-enter password"
                          className="pl-9 pr-10 h-11"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border/40">
              <div className="text-xs text-muted-foreground">
                {passwordsMatch ? (
                  <span className="text-emerald-500 flex items-center gap-1 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Passwords match
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <XCircle className="h-3.5 w-3.5 text-muted-foreground" /> Passwords must match
                  </span>
                )}
              </div>

              {codeSent && (
                <Button
                  onClick={() => setCodeSent(false)}
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back
                </Button>
              )}

              <Button
                onClick={() => codeSent ? resetPasswordMutation.mutate() : sendCodeMutation.mutate()}
                disabled={
                  !codeSent
                    ? sendCodeMutation.isPending
                    : resetPasswordMutation.isPending ||
                      !passwordForm.otp ||
                      !passwordForm.newPassword ||
                      !passwordsMatch ||
                      passwordForm.newPassword.length < 6
                }
                className="gap-2 px-6"
                variant="hero"
              >
                {codeSent ? (
                  resetPasswordMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="h-4 w-4" />
                  )
                ) : (
                  sendCodeMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 text-black" />
                  )
                )}
                {codeSent ? "Update Password" : "Send OTP"}
              </Button>
            </div>
          </div>

        </div>

      </div>
    </main>
  );
}