export type Locale = "en" | "ar";

export type AdminRole = "OWNER" | "ADMIN" | "ORDER_MANAGER" | "PRODUCT_MANAGER";

export type AdminPermission =
  | "*"
  | "dashboard:read"
  | "products:read"
  | "products:write"
  | "categories:read"
  | "categories:write"
  | "orders:read"
  | "orders:write"
  | "customers:read"
  | "customers:write"
  | "discounts:read"
  | "discounts:write"
  | "shipping:read"
  | "shipping:write"
  | "inventory:read"
  | "inventory:write"
  | "content:read"
  | "content:write"
  | "settings:read"
  | "settings:write";

export type ProductStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

export type OrderStatus =
  | "NEW"
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "SHIPPED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED"
  | "RETURNED";

export type DiscountType = "PERCENTAGE" | "FIXED_AMOUNT";
export type DiscountScope = "STORE_WIDE" | "PRODUCTS" | "CATEGORIES";
export type InventoryMovementType =
  | "ORDER_DEDUCTION"
  | "ORDER_RESTORATION"
  | "MANUAL_ADJUSTMENT"
  | "RESTOCK"
  | "INITIAL"
  | "RETURN";

export interface AdminProfile {
  id: string;
  email: string;
  full_name: string;
  role: AdminRole;
  is_active: boolean;
  preferred_locale: Locale;
  last_login_at: string | null;
  created_at: string;
}

export interface Category {
  id: string;
  parent_id: string | null;
  slug: string;
  name_en: string;
  name_ar: string;
  description_en: string;
  description_ar: string;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  is_featured: boolean;
  seo_title_en: string | null;
  seo_title_ar: string | null;
  seo_description_en: string | null;
  seo_description_ar: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  alt_en: string | null;
  alt_ar: string | null;
  sort_order: number;
  is_primary: boolean;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  size: string;
  color_name_en: string;
  color_name_ar: string;
  color_hex: string;
  sku: string;
  stock_quantity: number;
  price_override: number | null;
  is_available: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Product {
  id: string;
  category_id: string | null;
  slug: string;
  sku: string;
  brand: string;
  name_en: string;
  name_ar: string;
  description_en: string;
  description_ar: string;
  details_en: string;
  details_ar: string;
  regular_price: number;
  sale_price: number | null;
  main_image_url: string | null;
  hover_image_url: string | null;
  status: ProductStatus;
  is_featured: boolean;
  is_new_arrival: boolean;
  is_best_seller: boolean;
  sales_count: number;
  popularity_score: number;
  low_stock_threshold: number;
  seo_title_en: string | null;
  seo_title_ar: string | null;
  seo_description_en: string | null;
  seo_description_ar: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  category?: Category | null;
  images?: ProductImage[];
  variants?: ProductVariant[];
  cost_price?: number | null;
}

export interface Governorate {
  id: string;
  code: string;
  name_en: string;
  name_ar: string;
  shipping_fee: number;
  free_shipping_threshold: number | null;
  estimated_days_min: number;
  estimated_days_max: number;
  is_active: boolean;
  sort_order: number;
}

export interface DeliveryArea {
  id: string;
  governorate_id: string;
  name_en: string;
  name_ar: string;
  shipping_fee_override: number | null;
  estimated_days_min: number | null;
  estimated_days_max: number | null;
  is_active: boolean;
}

export interface ShippingRule {
  id: number;
  name_en: string;
  name_ar: string;
  default_shipping_fee: number;
  free_shipping_threshold: number | null;
  is_free_shipping_enabled: boolean;
}

export interface Discount {
  id: string;
  code: string | null;
  is_automatic: boolean;
  name_en: string;
  name_ar: string;
  description_en: string;
  description_ar: string;
  discount_type: DiscountType;
  discount_value: number;
  scope: DiscountScope;
  min_order_amount: number;
  max_discount_amount: number | null;
  starts_at: string | null;
  expires_at: string | null;
  usage_limit: number | null;
  per_customer_limit: number | null;
  usage_count: number;
  is_active: boolean;
  created_at: string;
  product_ids?: string[];
  category_ids?: string[];
}

export interface Customer {
  id: string;
  full_name: string;
  phone: string;
  secondary_phone: string | null;
  email: string | null;
  default_governorate_id: string | null;
  default_city: string | null;
  default_district: string | null;
  default_address: string | null;
  total_orders: number;
  delivered_orders: number;
  cancelled_orders: number;
  total_delivered_spent: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  variant_id: string | null;
  product_name_en: string;
  product_name_ar: string;
  product_slug: string;
  sku: string;
  size: string;
  color_name_en: string;
  color_name_ar: string;
  color_hex: string;
  image_url: string | null;
  unit_price: number;
  original_unit_price: number;
  quantity: number;
  line_total: number;
}

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  from_status: OrderStatus | null;
  to_status: OrderStatus;
  note: string;
  changed_by: string | null;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  tracking_token: string;
  idempotency_key: string;
  customer_id: string | null;
  customer_name: string;
  customer_phone: string;
  secondary_phone: string | null;
  customer_email: string | null;
  governorate_id: string | null;
  governorate_name_en: string;
  governorate_name_ar: string;
  delivery_area_id: string | null;
  city: string;
  district: string;
  full_address: string;
  building_number: string;
  apartment_number: string | null;
  floor: string | null;
  delivery_notes: string | null;
  payment_method: "COD";
  currency: string;
  subtotal: number;
  discount_id: string | null;
  discount_code: string | null;
  discount_amount: number;
  shipping_fee: number;
  total_amount: number;
  status: OrderStatus;
  stock_deducted: boolean;
  internal_notes: string;
  locale: Locale;
  confirmed_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
  history?: OrderStatusHistory[];
}

export interface FooterLinkItem {
  group: "client_care" | "house" | "legal";
  label_en: string;
  label_ar: string;
  href: string;
}

export interface StorefrontCopy {
  hero_eyebrow_en: string;
  hero_eyebrow_ar: string;
  pillars_enabled: boolean;
  pillar_1_title_en: string;
  pillar_1_title_ar: string;
  pillar_1_desc_en: string;
  pillar_1_desc_ar: string;
  pillar_2_title_en: string;
  pillar_2_title_ar: string;
  pillar_2_desc_en: string;
  pillar_2_desc_ar: string;
  pillar_3_title_en: string;
  pillar_3_title_ar: string;
  pillar_3_desc_en: string;
  pillar_3_desc_ar: string;
  product_shipping_title_en: string;
  product_shipping_title_ar: string;
  product_shipping_desc_en: string;
  product_shipping_desc_ar: string;
  cart_cod_notice_en: string;
  cart_cod_notice_ar: string;
  checkout_subtitle_en: string;
  checkout_subtitle_ar: string;
  checkout_cod_title_en: string;
  checkout_cod_title_ar: string;
  checkout_cod_desc_en: string;
  checkout_cod_desc_ar: string;
  footer_cod_badge_en: string;
  footer_cod_badge_ar: string;
  footer_bottom_note_en: string;
  footer_bottom_note_ar: string;
  footer_copyright_en: string;
  footer_copyright_ar: string;
}

export interface WebsiteSettings {
  id: number;
  brand_name: string;
  logo_url: string | null;
  favicon_url: string | null;
  contact_phone: string;
  whatsapp_number: string;
  support_email: string;
  instagram_url: string;
  facebook_url: string;
  tiktok_url: string;
  default_language: Locale;
  currency: string;
  store_status: "OPEN" | "PAUSED";
  maintenance_mode: boolean;
  maintenance_message_en: string;
  maintenance_message_ar: string;
  announcement_enabled: boolean;
  announcement_text_en: string;
  announcement_text_ar: string;
  newsletter_enabled: boolean;
  order_notification_whatsapp_enabled: boolean;
  order_notification_email: string;
  footer_links: FooterLinkItem[];
  storefront_copy: StorefrontCopy;
}

export interface HomepageBanner {
  id: string;
  placement: "HERO" | "CAMPAIGN";
  title_en: string;
  title_ar: string;
  subtitle_en: string;
  subtitle_ar: string;
  cta_label_en: string;
  cta_label_ar: string;
  cta_url: string;
  desktop_image_url: string;
  mobile_image_url: string;
  is_active: boolean;
  sort_order: number;
}

export interface HomepageSection {
  id: string;
  section_key: string;
  title_en: string;
  title_ar: string;
  subtitle_en: string;
  subtitle_ar: string;
  body_en: string;
  body_ar: string;
  image_url: string | null;
  is_enabled: boolean;
  sort_order: number;
  config: Record<string, unknown>;
}

export interface ContentPage {
  slug: string;
  title_en: string;
  title_ar: string;
  body_en: string;
  body_ar: string;
  seo_title_en: string | null;
  seo_title_ar: string | null;
  seo_description_en: string | null;
  seo_description_ar: string | null;
  updated_at: string;
}

export interface CartClientItem {
  variantId: string;
  productId: string;
  slug: string;
  sku: string;
  name_en: string;
  name_ar: string;
  size: string;
  color_name_en: string;
  color_name_ar: string;
  color_hex: string;
  image_url: string | null;
  unit_price: number;
  regular_price: number;
  quantity: number;
  stock_quantity: number;
}
