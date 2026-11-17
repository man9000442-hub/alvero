import { z } from "zod";

export const productVariantInputSchema = z.object({
  id: z.string().uuid().optional(),
  size: z.string().trim().max(40),
  color_name_en: z.string().trim().min(1).max(60),
  color_name_ar: z.string().trim().min(1).max(60),
  color_hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  sku: z.string().trim().min(2).max(80),
  stock_quantity: z.number().int().min(0),
  price_override: z.number().min(0).nullable().optional(),
  is_available: z.boolean().default(true),
});

export const productInputSchema = z.object({
  category_id: z.string().uuid().nullable().optional(),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(140)
    .regex(/^[a-z0-9-]+$/),
  sku: z.string().trim().min(2).max(80),
  brand: z.string().trim().min(1).max(80).default("ALVERO"),
  name_en: z.string().trim().min(2).max(160),
  name_ar: z.string().trim().min(2).max(160),
  description_en: z.string().trim().max(5000).default(""),
  description_ar: z.string().trim().max(5000).default(""),
  details_en: z.string().trim().max(2000).default(""),
  details_ar: z.string().trim().max(2000).default(""),
  regular_price: z.number().min(0),
  sale_price: z.number().min(0).nullable().optional(),
  cost_price: z.number().min(0).nullable().optional(),
  main_image_url: z.string().trim().nullable().optional(),
  hover_image_url: z.string().trim().nullable().optional(),
  gallery_urls: z.array(z.string().trim()).default([]),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).default("DRAFT"),
  is_featured: z.boolean().default(false),
  is_new_arrival: z.boolean().default(false),
  is_best_seller: z.boolean().default(false),
  low_stock_threshold: z.number().int().min(0).default(5),
  seo_title_en: z.string().trim().max(160).nullable().optional(),
  seo_title_ar: z.string().trim().max(160).nullable().optional(),
  seo_description_en: z.string().trim().max(320).nullable().optional(),
  seo_description_ar: z.string().trim().max(320).nullable().optional(),
  variants: z.array(productVariantInputSchema).min(1),
});

export const categoryInputSchema = z.object({
  parent_id: z.string().uuid().nullable().optional(),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9-]+$/),
  name_en: z.string().trim().min(2).max(120),
  name_ar: z.string().trim().min(2).max(120),
  description_en: z.string().trim().max(1000).default(""),
  description_ar: z.string().trim().max(1000).default(""),
  image_url: z.string().trim().nullable().optional(),
  sort_order: z.number().int().default(0),
  is_active: z.boolean().default(true),
  is_featured: z.boolean().default(false),
});

export const discountInputSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .max(40)
    .nullable()
    .optional(),
  is_automatic: z.boolean().default(false),
  name_en: z.string().trim().min(2).max(120),
  name_ar: z.string().trim().min(2).max(120),
  description_en: z.string().trim().max(500).default(""),
  description_ar: z.string().trim().max(500).default(""),
  discount_type: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]),
  discount_value: z.number().positive(),
  scope: z.enum(["STORE_WIDE", "PRODUCTS", "CATEGORIES"]).default("STORE_WIDE"),
  min_order_amount: z.number().min(0).default(0),
  max_discount_amount: z.number().min(0).nullable().optional(),
  starts_at: z.string().nullable().optional(),
  expires_at: z.string().nullable().optional(),
  usage_limit: z.number().int().positive().nullable().optional(),
  per_customer_limit: z.number().int().positive().nullable().optional(),
  is_active: z.boolean().default(true),
  product_ids: z.array(z.string().uuid()).default([]),
  category_ids: z.array(z.string().uuid()).default([]),
});

export const orderStatusUpdateSchema = z.object({
  status: z.enum([
    "NEW",
    "PENDING",
    "CONFIRMED",
    "PREPARING",
    "SHIPPED",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "CANCELLED",
    "RETURNED",
  ]),
  note: z.string().trim().max(500).default(""),
});

export const stockAdjustmentSchema = z.object({
  variantId: z.string().uuid(),
  newQuantity: z.number().int().min(0),
  movementType: z.enum(["MANUAL_ADJUSTMENT", "RESTOCK"]),
  reason: z.string().trim().min(2).max(300),
});
