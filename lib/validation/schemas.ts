import { z } from "zod";
import { validateUrlSecurity } from "@/lib/security/url-validation";

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

export const claimSubmissionSchema = z
  .object({
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
  })
  .refine(
    (data) => {
      const check = validateUrlSecurity(data.websiteUrl);
      return check.valid;
    },
    (data) => {
      const check = validateUrlSecurity(data.websiteUrl);
      return {
        message: check.error || "Invalid or prohibited website URL",
        path: ["websiteUrl"],
      };
    }
  )
  .refine(
    (data) => {
      if (!data.logoUrl) return true;
      const check = validateUrlSecurity(data.logoUrl);
      return check.valid;
    },
    (data) => {
      const check = validateUrlSecurity(data.logoUrl || "");
      return {
        message: check.error || "Invalid or prohibited logo URL",
        path: ["logoUrl"],
      };
    }
  );

export const increaseBidSchema = z.object({
  brandId: z.string().min(1, "Brand ID is required"),
  additionalBid: z
    .number({ invalid_type_error: "Additional bid must be a number" })
    .min(10, "Minimum bid increase is $10"),
  managementToken: z.string().optional(),
});

export const updateBrandSchema = z
  .object({
    name: z.string().min(1).max(60).optional(),
    category: z.enum(CATEGORIES).optional(),
    description: z.string().max(300).optional(),
    tagline: z.string().max(100).optional(),
    logoUrl: z.string().url().optional().nullable(),
    template: z.enum(TEMPLATES).optional(),
  })
  .refine(
    (data) => {
      if (!data.logoUrl) return true;
      const check = validateUrlSecurity(data.logoUrl);
      return check.valid;
    },
    (data) => {
      const check = validateUrlSecurity(data.logoUrl || "");
      return {
        message: check.error || "Invalid or prohibited logo URL",
        path: ["logoUrl"],
      };
    }
  );

export const metadataRequestSchema = z
  .object({
    url: z.string().min(3, "URL is required"),
  })
  .refine(
    (data) => {
      const check = validateUrlSecurity(data.url);
      return check.valid;
    },
    (data) => {
      const check = validateUrlSecurity(data.url);
      return {
        message: check.error || "Invalid or prohibited URL",
        path: ["url"],
      };
    }
  );
