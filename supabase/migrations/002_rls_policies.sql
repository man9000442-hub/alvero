-- ALVERO E-Commerce Platform
-- Migration 002: Strict Row Level Security (RLS) Policies

-- ==========================================
-- HELPER FUNCTIONS FOR ADMIN RBAC
-- ==========================================
create or replace function public.get_admin_role()
returns admin_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid()
    and is_active = true
  limit 1;
$$;

create or replace function public.is_active_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and is_active = true
  );
$$;

create or replace function public.has_admin_permission(required_permission text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    join public.admin_permissions ap on ap.role = p.role
    where p.id = auth.uid()
      and p.is_active = true
      and (ap.permission = '*' or ap.permission = required_permission)
  );
$$;

-- ==========================================
-- ENABLE RLS ON ALL TABLES
-- ==========================================
alter table public.admin_roles enable row level security;
alter table public.admin_permissions enable row level security;
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_private_metrics enable row level security;
alter table public.product_images enable row level security;
alter table public.product_sizes enable row level security;
alter table public.product_colors enable row level security;
alter table public.product_variants enable row level security;
alter table public.governorates enable row level security;
alter table public.delivery_areas enable row level security;
alter table public.shipping_rules enable row level security;
alter table public.customers enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.discounts enable row level security;
alter table public.discount_products enable row level security;
alter table public.discount_categories enable row level security;
alter table public.discount_usages enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.audit_logs enable row level security;
alter table public.rate_limits enable row level security;
alter table public.website_settings enable row level security;
alter table public.homepage_banners enable row level security;
alter table public.homepage_sections enable row level security;
alter table public.content_pages enable row level security;
alter table public.newsletter_subscribers enable row level security;

-- ==========================================
-- ADMIN ROLES, PERMISSIONS & PROFILES
-- ==========================================
create policy "Admins can read roles"
  on public.admin_roles for select
  using (public.is_active_admin());

create policy "Admins can read permissions"
  on public.admin_permissions for select
  using (public.is_active_admin());

create policy "Admins can read own profile or owner reads all"
  on public.profiles for select
  using (id = auth.uid() or public.get_admin_role() = 'OWNER');

create policy "Owner manages profiles"
  on public.profiles for all
  using (public.get_admin_role() = 'OWNER')
  with check (public.get_admin_role() = 'OWNER');

create policy "Admins can update own preferred_locale"
  on public.profiles for update
  using (id = auth.uid() and public.is_active_admin())
  with check (id = auth.uid() and public.is_active_admin());

-- ==========================================
-- CATALOG: CATEGORIES, PRODUCTS, VARIANTS
-- ==========================================
create policy "Public reads active categories"
  on public.categories for select
  using (is_active = true and deleted_at is null);

create policy "Product/Admin reads all categories"
  on public.categories for select
  using (public.has_admin_permission('categories:read'));

create policy "Product/Admin manages categories"
  on public.categories for all
  using (public.has_admin_permission('categories:write'))
  with check (public.has_admin_permission('categories:write'));

create policy "Public reads active products"
  on public.products for select
  using (status = 'ACTIVE' and deleted_at is null);

create policy "Admins with products:read read all products"
  on public.products for select
  using (public.has_admin_permission('products:read'));

create policy "Admins with products:write manage products"
  on public.products for all
  using (public.has_admin_permission('products:write'))
  with check (public.has_admin_permission('products:write'));

create policy "Only product admins read/write private cost metrics"
  on public.product_private_metrics for all
  using (public.has_admin_permission('products:read') or public.has_admin_permission('products:write'))
  with check (public.has_admin_permission('products:write'));

create policy "Public reads images of active products"
  on public.product_images for select
  using (
    exists (
      select 1 from public.products p
      where p.id = product_id and p.status = 'ACTIVE' and p.deleted_at is null
    )
    or public.has_admin_permission('products:read')
  );

create policy "Admins manage product images"
  on public.product_images for all
  using (public.has_admin_permission('products:write'))
  with check (public.has_admin_permission('products:write'));

create policy "Public reads sizes"
  on public.product_sizes for select
  using (true);

create policy "Admins manage sizes"
  on public.product_sizes for all
  using (public.has_admin_permission('products:write'))
  with check (public.has_admin_permission('products:write'));

create policy "Public reads colors"
  on public.product_colors for select
  using (true);

create policy "Admins manage colors"
  on public.product_colors for all
  using (public.has_admin_permission('products:write'))
  with check (public.has_admin_permission('products:write'));

create policy "Public reads variants of active products"
  on public.product_variants for select
  using (
    exists (
      select 1 from public.products p
      where p.id = product_id and p.status = 'ACTIVE' and p.deleted_at is null
    )
    or public.has_admin_permission('products:read')
    or public.has_admin_permission('inventory:read')
  );

create policy "Admins manage variants"
  on public.product_variants for all
  using (public.has_admin_permission('products:write') or public.has_admin_permission('inventory:write'))
  with check (public.has_admin_permission('products:write') or public.has_admin_permission('inventory:write'));

-- ==========================================
-- SHIPPING
-- ==========================================
create policy "Public reads active governorates"
  on public.governorates for select
  using (is_active = true or public.has_admin_permission('shipping:read'));

create policy "Admins manage governorates"
  on public.governorates for all
  using (public.has_admin_permission('shipping:write'))
  with check (public.has_admin_permission('shipping:write'));

create policy "Public reads active delivery areas"
  on public.delivery_areas for select
  using (is_active = true or public.has_admin_permission('shipping:read'));

create policy "Admins manage delivery areas"
  on public.delivery_areas for all
  using (public.has_admin_permission('shipping:write'))
  with check (public.has_admin_permission('shipping:write'));

create policy "Public reads shipping rules"
  on public.shipping_rules for select
  using (true);

create policy "Admins manage shipping rules"
  on public.shipping_rules for all
  using (public.has_admin_permission('shipping:write'))
  with check (public.has_admin_permission('shipping:write'));

-- ==========================================
-- DISCOUNTS
-- ==========================================
create policy "Public reads active automatic or current discounts safely"
  on public.discounts for select
  using (
    (is_active = true and (starts_at is null or starts_at <= now()) and (expires_at is null or expires_at > now()))
    or public.has_admin_permission('discounts:read')
  );

create policy "Admins manage discounts"
  on public.discounts for all
  using (public.has_admin_permission('discounts:write'))
  with check (public.has_admin_permission('discounts:write'));

create policy "Public reads discount products"
  on public.discount_products for select
  using (true);

create policy "Admins manage discount products"
  on public.discount_products for all
  using (public.has_admin_permission('discounts:write'))
  with check (public.has_admin_permission('discounts:write'));

create policy "Public reads discount categories"
  on public.discount_categories for select
  using (true);

create policy "Admins manage discount categories"
  on public.discount_categories for all
  using (public.has_admin_permission('discounts:write'))
  with check (public.has_admin_permission('discounts:write'));

create policy "Only admins read discount usages"
  on public.discount_usages for select
  using (public.has_admin_permission('discounts:read') or public.has_admin_permission('orders:read'));

-- ==========================================
-- CUSTOMERS, ORDERS, INVENTORY, AUDIT (ZERO PUBLIC ACCESS)
-- ==========================================
create policy "Admins read customers"
  on public.customers for select
  using (public.has_admin_permission('customers:read'));

create policy "Admins update customers"
  on public.customers for update
  using (public.has_admin_permission('customers:write'))
  with check (public.has_admin_permission('customers:write'));

create policy "Admins read orders"
  on public.orders for select
  using (public.has_admin_permission('orders:read'));

create policy "Admins update orders"
  on public.orders for update
  using (public.has_admin_permission('orders:write'))
  with check (public.has_admin_permission('orders:write'));

create policy "Admins read order items"
  on public.order_items for select
  using (public.has_admin_permission('orders:read'));

create policy "Admins read order history"
  on public.order_status_history for select
  using (public.has_admin_permission('orders:read'));

create policy "Admins read inventory movements"
  on public.inventory_movements for select
  using (public.has_admin_permission('inventory:read') or public.has_admin_permission('products:read'));

create policy "Only owner reads audit logs"
  on public.audit_logs for select
  using (public.get_admin_role() = 'OWNER' or public.has_admin_permission('settings:read'));

-- Carts & Rate Limits are accessed exclusively via server-side Service Role or Security Definer RPCs
-- No direct anon SELECT/INSERT/UPDATE/DELETE policies on carts, cart_items, rate_limits, orders, customers.

-- ==========================================
-- WEBSITE CONTENT & SETTINGS
-- ==========================================
create policy "Public reads website settings"
  on public.website_settings for select
  using (true);

create policy "Admins manage website settings"
  on public.website_settings for all
  using (public.has_admin_permission('settings:write') or public.has_admin_permission('content:write'))
  with check (public.has_admin_permission('settings:write') or public.has_admin_permission('content:write'));

create policy "Public reads active banners"
  on public.homepage_banners for select
  using (is_active = true or public.has_admin_permission('content:read'));

create policy "Admins manage banners"
  on public.homepage_banners for all
  using (public.has_admin_permission('content:write'))
  with check (public.has_admin_permission('content:write'));

create policy "Public reads enabled sections"
  on public.homepage_sections for select
  using (is_enabled = true or public.has_admin_permission('content:read'));

create policy "Admins manage sections"
  on public.homepage_sections for all
  using (public.has_admin_permission('content:write'))
  with check (public.has_admin_permission('content:write'));

create policy "Public reads content pages"
  on public.content_pages for select
  using (true);

create policy "Admins manage content pages"
  on public.content_pages for all
  using (public.has_admin_permission('content:write'))
  with check (public.has_admin_permission('content:write'));

create policy "Public can subscribe to newsletter when enabled"
  on public.newsletter_subscribers for insert
  with check (
    exists (
      select 1 from public.website_settings ws
      where ws.id = 1 and ws.newsletter_enabled = true
    )
  );

create policy "Admins read newsletter subscribers"
  on public.newsletter_subscribers for select
  using (public.has_admin_permission('content:read') or public.has_admin_permission('customers:read'));
