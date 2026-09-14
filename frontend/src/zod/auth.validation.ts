import { z } from "zod";

// --- Login ---
export const loginZodSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string()
    .min(6, "Password must be at least 6 characters long")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[@$!%*?&]/, "Password must contain at least one special character (@, $, !, %, *, ?, &)"),
});
export type ILoginPayload = z.infer<typeof loginZodSchema>;

export const registerBaseSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long"),
  email: z.string().email("Invalid email address"),
  password: z.string()
    .min(6, "Password must be at least 6 characters long")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[@$!%*?&]/, "Password must contain at least one special character (@, $, !, %, *, ?, &)"),
  confirmPassword: z.string(),
  role: z.enum(["owner", "user"]),
});

export const registerZodSchema = registerBaseSchema.refine(
  (data) => data.password === data.confirmPassword,
  { message: "Passwords don't match", path: ["confirmPassword"] }
);

export type IRegisterPayload = z.infer<typeof registerZodSchema>;

export const verifyEmailZodSchema = z.object({
  email: z.string().email("Invalid email address"),
  otp: z.string().min(6, "OTP must be 6 digits").max(6, "OTP must be 6 digits"),
});
export type IVerifyEmailPayload = z.infer<typeof verifyEmailZodSchema>;

export const forgotPasswordZodSchema = z.object({
  email: z.string().email("Invalid email address"),
});
export type IForgotPasswordPayload = z.infer<typeof forgotPasswordZodSchema>;


export const resetPasswordZodSchema = z.object({
   email: z.string().email("Invalid email address"),
  otp: z.string().min(6, "OTP must be 6 digits").max(6, "OTP must be 6 digits"),
  newPassword: z.string()
    .min(6, "Password must be at least 6 characters long")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[@$!%*?&]/, "Password must contain at least one special character (@, $, !, %, *, ?, &)"),
  confirmPassword: z.string(),
});

export type IResetPasswordPayload = z.infer<typeof resetPasswordZodSchema>;

export const turfZodSchema = z.object({
  name: z.string().trim().min(2, "Turf name must be at least 2 characters"),
  categoryId: z.string().min(1, "Please choose a sport"),
  description: z.string(),
  address: z.string().trim().min(5, "Address must be at least 5 characters"),
  basePrice: z.string().refine((value) => Number(value) > 0, "Starting price must be greater than 0"),
  slotMinutes: z.string().refine((value) => Number(value) >= 30, "Slot duration must be at least 30 minutes"),
  latitude: z.string().trim().min(1, "Latitude is required").refine((value) => Number.isFinite(Number(value)) && Number(value) >= -90 && Number(value) <= 90, "Enter a valid latitude"),
  longitude: z.string().trim().min(1, "Longitude is required").refine((value) => Number.isFinite(Number(value)) && Number(value) >= -180 && Number(value) <= 180, "Enter a valid longitude"),
});