import { z } from "zod";

export const billingPeriodEnum = z.enum(["MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY"]);

export const featureTypeEnum = z.enum(["GENERAL", "PREMIUM"]);

export const featureSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Feature name cannot be empty"),
  description: z.string().optional(),
  type: featureTypeEnum,
  key: z.string().optional(),
}).refine(
  (data) => data.type !== "PREMIUM" || (data.key && data.key.trim() !== ""),
  {
    message: "Key is required for premium features",
    path: ["key"],
  }
);

const basePlanSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  tierLevel: z.coerce.number().min(0, "Tier level must be at least 0"),
  maxTurfs: z.coerce.number().min(1, "Max turfs must be at least 1"),
  isFreeTrialAllowed: z.boolean().optional(),
  freeTrialDuration: z.coerce.number().min(0, "Free trial duration must be non-negative").optional(),
  active: z.boolean().optional(),
  features: z.array(featureSchema).min(1, "At least one feature is required"),
  prices: z.array(
    z.object({
      period: billingPeriodEnum,
      price: z.coerce.number().min(0, "Price must be non-negative"),
    })
  ).min(1, "At least one price tier is required"),
});

export const planSchema = basePlanSchema;

export const updatePlanSchema = basePlanSchema.partial();

export type SubscriptionPlanPayload = z.infer<typeof planSchema>;
export type UpdatePlanPayload = z.infer<typeof updatePlanSchema>;
export type FeaturePayload = z.infer<typeof featureSchema>;