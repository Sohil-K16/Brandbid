import { z } from "zod";

export const CATEGORIES = [
  "AI",
  "SaaS",
  "Developer Tools",
  "Fintech",
  "E-commerce",
  "Consumer",
  "Agency",
  "Education",
  "Other",
] as const;

export type CategoryType = typeof CATEGORIES[number];

export const TEMPLATES = ["typography", "logo_dominant", "editorial", "minimal"] as const;
export type TemplateType = typeof TEMPLATES[number];

export const claimSubmissionSchema = z.object({
  websiteUrl: z.string().min(3, "Website URL is required"),
  name: z.string().min(1, "Brand name is required").max(60, "Brand name is too long"),
  category: z.enum(CATEGORIES, {
    errorMap: () => ({ message: "Please select a valid category" }),
  }),
  bidAmount: z
    .number({ invalid_type_error: "Bid must be a valid number" })
    .min(10, "Minimum bid is $10")
    .max(100000000, "Maximum bid exceeded"),
  description: z.string().max(300).optional().default(""),
  tagline: z.string().max(100).optional().default(""),
  logoUrl: z.string().url().optional().nullable(),
  template: z.enum(TEMPLATES).optional().default("typography"),
});

export const verifyPaymentSchema = z.object({
  brandId: z.string().min(1, "Brand ID is required"),
  razorpayOrderId: z.string().min(1, "Order ID is required"),
  razorpayPaymentId: z.string().min(1, "Payment ID is required"),
  razorpaySignature: z.string().min(1, "Signature is required"),
  amount: z.number().min(10),
  managementToken: z.string().optional(), // Provided when increasing bid
});

export const increaseBidSchema = z.object({
  brandId: z.string().min(1, "Brand ID is required"),
  additionalBid: z
    .number({ invalid_type_error: "Additional bid must be a number" })
    .min(10, "Minimum bid increase is $10"),
  managementToken: z.string().optional(),
});

export const updateBrandSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  category: z.enum(CATEGORIES).optional(),
  description: z.string().max(300).optional(),
  tagline: z.string().max(100).optional(),
  logoUrl: z.string().url().optional().nullable(),
  template: z.enum(TEMPLATES).optional(),
});

export const metadataRequestSchema = z.object({
  url: z.string().min(3, "URL is required"),
});
