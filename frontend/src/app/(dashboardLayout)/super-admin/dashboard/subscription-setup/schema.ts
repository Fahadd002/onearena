import { z } from "zod";

export const billingPeriodEnum = z.enum(["MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY"]);

export const planSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  tierLevel: z.coerce.number().min(0, "Tier level must be at least 0"),
  maxTurfs: z.coerce.number().min(1, "Max turfs must be at least 1"),
  active: z.boolean().optional(),
  features: z.array(z.string().min(1, "Feature cannot be empty")).min(1, "At least one feature is required"),
  prices: z.array(
    z.object({
      period: billingPeriodEnum,
      price: z.coerce.number().min(0, "Price must be non-negative"),
    })
  ).min(1, "At least one price tier is required"),
});

export const updatePlanSchema = planSchema.partial();

export type SubscriptionPlanPayload = z.infer<typeof planSchema>;
export type UpdatePlanPayload = z.infer<typeof updatePlanSchema>;