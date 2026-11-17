-- ALVERO E-Commerce Platform
-- Migration 001: Core Normalized PostgreSQL Schema

create extension if not exists "pgcrypto";

-- ==========================================
-- ENUMS
-- ==========================================
do $$ begin
  create type admin_role as enum ('OWNER', 'ADMIN', 'ORDER_MANAGER', 'PRODUCT_MANAGER');
exception when duplicate_object then null; end $$;

do $$ begin
  create type product_status as enum ('DRAFT', 'ACTIVE', 'ARCHIVED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type order_status as enum (
    'NEW',
    'PENDING',
    'CONFIRMED',
    'PREPARING',
    'SHIPPED',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'CANCELLED',
    'RETURNED'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type discount_type as enum ('PERCENTAGE', 'FIXED_AMOUNT');
exception when duplicate_object then null; end $$;

do $$ begin
  create type discount_scope as enum ('STORE_WIDE', 'PRODUCTS', 'CATEGORIES');
exception when duplicate_object then null; end $$;

do $$ begin
  create type inventory_movement_type as enum (
    'ORDER_DEDUCTION',
    'ORDER_RESTORATION',
    'MANUAL_ADJUSTMENT',
    'RESTOCK',
    'INITIAL',
    'RETURN'
  );
exception when duplicate_object then null; end $$;

-- ==========================================
-- HELPER TRIGGER FOR updated_at
-- ==========================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ==========================================
-- ADMIN ROLES, PERMISSIONS & PROFILES
-- ==========================================
create table if not exists public.admin_roles (
  role admin_role primary key,
  label_en text not null,
  label_ar text not null,
  description_en text not null
);

create table if not exists public.admin_permissions (
  role admin_role not null references public.admin_roles(role) on delete cascade,
  permission text not null,
  primary key (role, permission)
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text not null default '',
  role admin_role not null,
  is_active boolean not null default true,
  preferred_locale text not null default 'en' check (preferred_locale in ('en', 'ar')),
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ==========================================
-- CATEGORIES
-- ==========================================
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories(id) on delete set null,
  slug text unique not null,
  name_en text not null,
  name_ar text not null,
  description_en text not null default '',
  description_ar text not null default '',
  image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  seo_title_en text,
  seo_title_ar text,
  seo_description_en text,
  seo_description_ar text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_categories_active_sort on public.categories (is_active, sort_order) where deleted_at is null;
create index if not exists idx_categories_parent on public.categories (parent_id);

create trigger trg_categories_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- ==========================================
-- PRODUCTS, IMAGES, SIZES, COLORS & VARIANTS
-- ==========================================
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  slug text unique not null,
  sku text unique not null,
  brand text not null default 'ALVERO',
  name_en text not null,
  name_ar text not null,
  description_en text not null default '',
  description_ar text not null default '',
  details_en text not null default '',
  details_ar text not null default '',
  regular_price numeric(10,2) not null check (regular_price >= 0),
  sale_price numeric(10,2) check (sale_price is null or sale_price >= 0),
  main_image_url text,
  hover_image_url text,
  status product_status not null default 'DRAFT',
  is_featured boolean not null default false,
  is_new_arrival boolean not null default false,
  is_best_seller boolean not null default false,
  sales_count integer not null default 0,
  popularity_score integer not null default 0,
  low_stock_threshold integer not null default 5,
  seo_title_en text,
  seo_title_ar text,
  seo_description_en text,
  seo_description_ar text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_products_status_created on public.products (status, created_at desc) where deleted_at is null;
create index if not exists idx_products_category on public.products (category_id) where deleted_at is null;
create index if not exists idx_products_featured on public.products (is_featured, is_new_arrival, is_best_seller) where deleted_at is null;

create trigger trg_products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- Admin-only cost price table so anon/public queries can never select cost_price
create table if not exists public.product_private_metrics (
  product_id uuid primary key references public.products(id) on delete cascade,
  cost_price numeric(10,2) check (cost_price is null or cost_price >= 0),
  updated_at timestamptz not null default now()
);

create trigger trg_product_private_metrics_updated_at
  before update on public.product_private_metrics
  for each row execute function public.set_updated_at();

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  url text not null,
  alt_en text default '',
  alt_ar text default '',
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_product_images_product on public.product_images (product_id, sort_order);

create table if not exists public.product_sizes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  label_en text not null,
  label_ar text not null,
  sort_order integer not null default 0
);

create table if not exists public.product_colors (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name_en text not null,
  name_ar text not null,
  hex_code text not null,
  sort_order integer not null default 0
);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  size text not null default '',
  color_name_en text not null default '',
  color_name_ar text not null default '',
  color_hex text not null default '#000000',
  sku text unique not null,
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  price_override numeric(10,2) check (price_override is null or price_override >= 0),
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, size, color_name_en)
);

create index if not exists idx_product_variants_product on public.product_variants (product_id);
create index if not exists idx_product_variants_stock on public.product_variants (stock_quantity) where is_available = true;

create trigger trg_product_variants_updated_at
  before update on public.product_variants
  for each row execute function public.set_updated_at();

-- ==========================================
-- SHIPPING (GOVERNORATES, AREAS, RULES)
-- ==========================================
create table if not exists public.governorates (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name_en text not null,
  name_ar text not null,
  shipping_fee numeric(10,2) not null default 70 check (shipping_fee >= 0),
  free_shipping_threshold numeric(10,2) check (free_shipping_threshold is null or free_shipping_threshold >= 0),
  estimated_days_min integer not null default 2,
  estimated_days_max integer not null default 4,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_governorates_updated_at
  before update on public.governorates
  for each row execute function public.set_updated_at();

create table if not exists public.delivery_areas (
  id uuid primary key default gen_random_uuid(),
  governorate_id uuid not null references public.governorates(id) on delete cascade,
  name_en text not null,
  name_ar text not null,
  shipping_fee_override numeric(10,2) check (shipping_fee_override is null or shipping_fee_override >= 0),
  estimated_days_min integer,
  estimated_days_max integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (governorate_id, name_en)
);

create index if not exists idx_delivery_areas_gov on public.delivery_areas (governorate_id, is_active);

create trigger trg_delivery_areas_updated_at
  before update on public.delivery_areas
  for each row execute function public.set_updated_at();

create table if not exists public.shipping_rules (
  id integer primary key default 1 check (id = 1),
  name_en text not null default 'Standard Egypt COD Shipping',
  name_ar text not null default 'الشحن القياسي داخل مصر - الدفع عند الاستلام',
  default_shipping_fee numeric(10,2) not null default 75,
  free_shipping_threshold numeric(10,2) default 2500,
  is_free_shipping_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create trigger trg_shipping_rules_updated_at
  before update on public.shipping_rules
  for each row execute function public.set_updated_at();

-- ==========================================
-- CUSTOMERS & CARTS
-- ==========================================
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text unique not null,
  secondary_phone text,
  email text,
  default_governorate_id uuid references public.governorates(id) on delete set null,
  default_city text,
  default_district text,
  default_address text,
  total_orders integer not null default 0,
  delivered_orders integer not null default 0,
  cancelled_orders integer not null default 0,
  total_delivered_spent numeric(12,2) not null default 0,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_customers_phone on public.customers (phone);
create index if not exists idx_customers_name on public.customers (full_name);

create trigger trg_customers_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(),
  session_token text unique not null,
  locale text not null default 'en' check (locale in ('en', 'ar')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_carts_updated_at
  before update on public.carts
  for each row execute function public.set_updated_at();

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  quantity integer not null check (quantity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cart_id, variant_id)
);

create trigger trg_cart_items_updated_at
  before update on public.cart_items
  for each row execute function public.set_updated_at();

-- ==========================================
-- DISCOUNTS & PROMOTIONS
-- ==========================================
create table if not exists public.discounts (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  is_automatic boolean not null default false,
  name_en text not null,
  name_ar text not null,
  description_en text not null default '',
  description_ar text not null default '',
  discount_type discount_type not null,
  discount_value numeric(10,2) not null check (discount_value > 0),
  scope discount_scope not null default 'STORE_WIDE',
  min_order_amount numeric(10,2) not null default 0 check (min_order_amount >= 0),
  max_discount_amount numeric(10,2) check (max_discount_amount is null or max_discount_amount >= 0),
  starts_at timestamptz,
  expires_at timestamptz,
  usage_limit integer check (usage_limit is null or usage_limit > 0),
  per_customer_limit integer check (per_customer_limit is null or per_customer_limit > 0),
  usage_count integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_discounts_active_code on public.discounts (code) where is_active = true;
create index if not exists idx_discounts_auto on public.discounts (is_automatic, is_active);

create trigger trg_discounts_updated_at
  before update on public.discounts
  for each row execute function public.set_updated_at();

create table if not exists public.discount_products (
  discount_id uuid not null references public.discounts(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  primary key (discount_id, product_id)
);

create table if not exists public.discount_categories (
  discount_id uuid not null references public.discounts(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  primary key (discount_id, category_id)
);

-- ==========================================
-- ORDERS, ORDER ITEMS & HISTORY
-- ==========================================
create sequence if not exists public.order_number_seq start 1001;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null,
  tracking_token text unique not null default encode(gen_random_bytes(16), 'hex'),
  idempotency_key text unique not null,
  customer_id uuid references public.customers(id) on delete set null,
  customer_name text not null,
  customer_phone text not null,
  secondary_phone text,
  customer_email text,
  governorate_id uuid references public.governorates(id) on delete set null,
  governorate_name_en text not null,
  governorate_name_ar text not null,
  delivery_area_id uuid references public.delivery_areas(id) on delete set null,
  city text not null,
  district text not null,
  full_address text not null,
  building_number text not null,
  apartment_number text,
  floor text,
  delivery_notes text,
  payment_method text not null default 'COD' check (payment_method = 'COD'),
  currency text not null default 'EGP',
  subtotal numeric(10,2) not null check (subtotal >= 0),
  discount_id uuid references public.discounts(id) on delete set null,
  discount_code text,
  discount_amount numeric(10,2) not null default 0 check (discount_amount >= 0),
  shipping_fee numeric(10,2) not null default 0 check (shipping_fee >= 0),
  total_amount numeric(10,2) not null check (total_amount >= 0),
  status order_status not null default 'NEW',
  stock_deducted boolean not null default true,
  internal_notes text not null default '',
  locale text not null default 'en' check (locale in ('en', 'ar')),
  confirmed_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_orders_created_at on public.orders (created_at desc);
create index if not exists idx_orders_status on public.orders (status, created_at desc);
create index if not exists idx_orders_phone on public.orders (customer_phone);
create index if not exists idx_orders_customer on public.orders (customer_id);

create trigger trg_orders_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  product_name_en text not null,
  product_name_ar text not null,
  product_slug text not null,
  sku text not null,
  size text not null,
  color_name_en text not null,
  color_name_ar text not null,
  color_hex text not null default '#000000',
  image_url text,
  unit_price numeric(10,2) not null check (unit_price >= 0),
  original_unit_price numeric(10,2) not null check (original_unit_price >= 0),
  quantity integer not null check (quantity > 0),
  line_total numeric(10,2) not null check (line_total >= 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_order_items_order on public.order_items (order_id);
create index if not exists idx_order_items_product on public.order_items (product_id);

create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  from_status order_status,
  to_status order_status not null,
  note text not null default '',
  changed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_order_status_history_order on public.order_status_history (order_id, created_at asc);

create table if not exists public.discount_usages (
  id uuid primary key default gen_random_uuid(),
  discount_id uuid not null references public.discounts(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  customer_phone text not null,
  discount_amount numeric(10,2) not null,
  created_at timestamptz not null default now(),
  unique (discount_id, order_id)
);

create index if not exists idx_discount_usages_customer on public.discount_usages (discount_id, customer_phone);

-- ==========================================
-- INVENTORY MOVEMENTS & AUDIT LOGS
-- ==========================================
create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  sku text not null,
  movement_type inventory_movement_type not null,
  quantity_delta integer not null,
  previous_quantity integer not null,
  new_quantity integer not null,
  reason text not null default '',
  order_id uuid references public.orders(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_inventory_movements_variant on public.inventory_movements (variant_id, created_at desc);
create index if not exists idx_inventory_movements_created on public.inventory_movements (created_at desc);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  actor_email text,
  actor_role text,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_created on public.audit_logs (created_at desc);
create index if not exists idx_audit_logs_entity on public.audit_logs (entity_type, entity_id);

-- ==========================================
-- RATE LIMITS (LOGIN & ORDER PROTECTION)
-- ==========================================
create table if not exists public.rate_limits (
  key text primary key,
  attempts integer not null default 1,
  window_start timestamptz not null default now(),
  blocked_until timestamptz
);

-- ==========================================
-- WEBSITE SETTINGS, CONTENT & BANNERS
-- ==========================================
create table if not exists public.website_settings (
  id integer primary key default 1 check (id = 1),
  brand_name text not null default 'ALVERO',
  logo_url text,
  favicon_url text,
  contact_phone text not null default '+20 100 000 0000',
  whatsapp_number text not null default '201000000000',
  support_email text not null default 'care@alvero.eg',
  instagram_url text not null default '',
  facebook_url text not null default '',
  tiktok_url text not null default '',
  default_language text not null default 'en' check (default_language in ('en', 'ar')),
  currency text not null default 'EGP',
  store_status text not null default 'OPEN' check (store_status in ('OPEN', 'PAUSED')),
  maintenance_mode boolean not null default false,
  maintenance_message_en text not null default 'We are curating our next seasonal edit. Please check back shortly.',
  maintenance_message_ar text not null default 'نعمل حالياً على تجهيز مجموعتنا الموسمية الجديدة. يرجى العودة قريباً.',
  announcement_enabled boolean not null default true,
  announcement_text_en text not null default 'COMPLIMENTARY DELIVERY OVER 2,500 EGP — CASH ON DELIVERY ACROSS EGYPT',
  announcement_text_ar text not null default 'شحن مجاني للطلبات فوق 2,500 ج.م — الدفع عند الاستلام في جميع محافظات مصر',
  newsletter_enabled boolean not null default false,
  order_notification_whatsapp_enabled boolean not null default true,
  order_notification_email text not null default '',
  footer_links jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create trigger trg_website_settings_updated_at
  before update on public.website_settings
  for each row execute function public.set_updated_at();

create table if not exists public.homepage_banners (
  id uuid primary key default gen_random_uuid(),
  placement text not null check (placement in ('HERO', 'CAMPAIGN')),
  title_en text not null,
  title_ar text not null,
  subtitle_en text not null default '',
  subtitle_ar text not null default '',
  cta_label_en text not null default 'Explore Collection',
  cta_label_ar text not null default 'تصفح المجموعة',
  cta_url text not null default '/shop',
  desktop_image_url text not null,
  mobile_image_url text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

create trigger trg_homepage_banners_updated_at
  before update on public.homepage_banners
  for each row execute function public.set_updated_at();

create table if not exists public.homepage_sections (
  id uuid primary key default gen_random_uuid(),
  section_key text unique not null,
  title_en text not null,
  title_ar text not null,
  subtitle_en text not null default '',
  subtitle_ar text not null default '',
  body_en text not null default '',
  body_ar text not null default '',
  image_url text,
  is_enabled boolean not null default true,
  sort_order integer not null default 0,
  config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create trigger trg_homepage_sections_updated_at
  before update on public.homepage_sections
  for each row execute function public.set_updated_at();

create table if not exists public.content_pages (
  slug text primary key,
  title_en text not null,
  title_ar text not null,
  body_en text not null,
  body_ar text not null,
  seo_title_en text,
  seo_title_ar text,
  seo_description_en text,
  seo_description_ar text,
  updated_at timestamptz not null default now()
);

create trigger trg_content_pages_updated_at
  before update on public.content_pages
  for each row execute function public.set_updated_at();

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  locale text not null default 'en' check (locale in ('en', 'ar')),
  created_at timestamptz not null default now()
);

-- ==========================================
-- DEFAULT ROLE & PERMISSION SEED
-- ==========================================
insert into public.admin_roles (role, label_en, label_ar, description_en) values
  ('OWNER', 'Owner', 'المالك', 'Full unrestricted access to all store modules, staff roles, settings, and logs'),
  ('ADMIN', 'Administrator', 'مدير عام', 'Manage products, orders, customers, discounts, shipping, and website content'),
  ('ORDER_MANAGER', 'Order Manager', 'مدير الطلبات', 'Manage orders, order statuses, invoices, and customer records'),
  ('PRODUCT_MANAGER', 'Product Manager', 'مدير المنتجات', 'Manage products, variants, categories, and inventory levels')
on conflict (role) do nothing;

insert into public.admin_permissions (role, permission) values
  ('OWNER', '*'),
  ('ADMIN', 'dashboard:read'),
  ('ADMIN', 'products:read'), ('ADMIN', 'products:write'),
  ('ADMIN', 'categories:read'), ('ADMIN', 'categories:write'),
  ('ADMIN', 'orders:read'), ('ADMIN', 'orders:write'),
  ('ADMIN', 'customers:read'), ('ADMIN', 'customers:write'),
  ('ADMIN', 'discounts:read'), ('ADMIN', 'discounts:write'),
  ('ADMIN', 'shipping:read'), ('ADMIN', 'shipping:write'),
  ('ADMIN', 'inventory:read'), ('ADMIN', 'inventory:write'),
  ('ADMIN', 'content:read'), ('ADMIN', 'content:write'),
  ('ADMIN', 'settings:read'), ('ADMIN', 'settings:write'),
  ('ORDER_MANAGER', 'dashboard:read'),
  ('ORDER_MANAGER', 'orders:read'), ('ORDER_MANAGER', 'orders:write'),
  ('ORDER_MANAGER', 'customers:read'), ('ORDER_MANAGER', 'customers:write'),
  ('PRODUCT_MANAGER', 'dashboard:read'),
  ('PRODUCT_MANAGER', 'products:read'), ('PRODUCT_MANAGER', 'products:write'),
  ('PRODUCT_MANAGER', 'categories:read'), ('PRODUCT_MANAGER', 'categories:write'),
  ('PRODUCT_MANAGER', 'inventory:read'), ('PRODUCT_MANAGER', 'inventory:write')
on conflict do nothing;

insert into public.shipping_rules (id) values (1) on conflict (id) do nothing;
insert into public.website_settings (id) values (1) on conflict (id) do nothing;
