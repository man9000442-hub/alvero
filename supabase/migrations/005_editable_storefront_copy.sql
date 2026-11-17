-- ALVERO E-Commerce Platform
-- Migration 005: Fully Editable Storefront Copy (Footer, Delivery Pillars, COD Notices, Section Headings)

alter table public.website_settings
  add column if not exists storefront_copy jsonb not null default '{}'::jsonb;
