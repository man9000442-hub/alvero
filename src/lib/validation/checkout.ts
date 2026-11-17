import { z } from "zod";
import { isValidEgyptPhone } from "./egypt-phone";

export const checkoutSchema = z.object({
  idempotencyKey: z.string().min(8).max(128),
  customerName: z.string().trim().min(2, "validation.minLength").max(120),
  customerPhone: z
    .string()
    .trim()
    .refine(isValidEgyptPhone, "validation.invalidEgyptPhone"),
  secondaryPhone: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine(
      (val) => !val || isValidEgyptPhone(val),
      "validation.invalidEgyptPhone",
    ),
  customerEmail: z
    .string()
    .trim()
    .email("validation.invalidEmail")
    .optional()
    .or(z.literal("")),
  governorateId: z.string().uuid("validation.required"),
  deliveryAreaId: z.string().uuid().optional().nullable().or(z.literal("")),
  city: z.string().trim().min(2, "validation.required").max(100),
  district: z.string().trim().min(2, "validation.required").max(100),
  fullAddress: z.string().trim().min(5, "validation.minLength").max(300),
  buildingNumber: z.string().trim().min(1, "validation.required").max(40),
  floor: z.string().trim().max(30).optional().or(z.literal("")),
  apartmentNumber: z.string().trim().max(30).optional().or(z.literal("")),
  deliveryNotes: z.string().trim().max(400).optional().or(z.literal("")),
  discountCode: z.string().trim().max(50).optional().or(z.literal("")),
  locale: z.enum(["en", "ar"]).default("en"),
  items: z
    .array(
      z.object({
        variantId: z.string().uuid(),
        quantity: z.number().int().min(1).max(50),
      }),
    )
    .min(1, "checkout.emptyCartError"),
});

export type CheckoutPayload = z.infer<typeof checkoutSchema>;

export const trackOrderSchema = z.object({
  orderNumber: z.string().trim().min(4).max(40),
  phone: z.string().trim().refine(isValidEgyptPhone, "validation.invalidEgyptPhone"),
});
