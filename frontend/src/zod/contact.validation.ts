import { z } from "zod";

export const contactTopicSchema = z.enum([
  "BOOKING",
  "REFUND",
  "OWNER_REGISTRATION",
  "PARTNERSHIP",
  "FEEDBACK",
  "OTHER",
]);

export const contactZodSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().email("Invalid email address"),
  topic: contactTopicSchema,
  message: z
    .string()
    .trim()
    .min(20, "Message must be at least 20 characters")
    .max(1000, "Message must be at most 1000 characters"),
});

export type IContactPayload = z.infer<typeof contactZodSchema>;