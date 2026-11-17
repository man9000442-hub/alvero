# ALVERO — Luxury Monochrome Fashion E-Commerce Platform

ALVERO is a production-ready bilingual (**English LTR / Arabic RTL**) fashion e-commerce platform and custom administration system built with **Next.js (App Router)**, **TypeScript (strict mode)**, **Tailwind CSS**, **next-intl**, and **Supabase (PostgreSQL, Auth, Storage)**, optimized for **Vercel Free (Hobby)** and **Supabase Free** plans.

---

## Core Architecture

- **Storefront (`/en`, `/ar`)**:
  - Editorial homepage with CMS-managed desktop/mobile hero banners, announcement bar, curated collections, new arrivals, best sellers, campaign banner, brand identity section, and optional newsletter.
  - Shop catalog with search, category, price, size, color, and stock filters, sorting, and pagination.
  - SEO-friendly Product Details Pages (`/products/[slug]`) with gallery zoom, color/size variant matrix, real-time stock validation, JSON-LD `Product` schema, Open Graph, and recently viewed items.
  - Persistent Shopping Bag drawer & full `/cart` page with variant swapping and DB synchronization (`/api/cart/sync`).
  - **Cash on Delivery (COD) Only Checkout** (`/checkout`): Egyptian mobile number validation (`010`, `011`, `012`, `015`), cascading governorate & delivery area shipping calculation, server-side promo code evaluation, idempotency protection, and atomic PostgreSQL stock deduction (`create_cod_order`).
  - Order Confirmation (`/order-confirmation/[orderNumber]`) with token verification and WhatsApp confirmation link.
  - Order Tracking (`/track-order`) requiring matching order number + Egyptian phone number via `track_customer_order` RPC.
- **Independent Admin Dashboard (`/admin`)**:
  - Completely separated from storefront layout, supporting live **EN (LTR) / AR (RTL)** switching.
  - Role-Based Access Control (`OWNER`, `ADMIN`, `ORDER_MANAGER`, `PRODUCT_MANAGER`) enforced server-side and in PostgreSQL RLS.
  - Executive Overview separating **Delivered Revenue**, **Confirmed Pipeline**, and **Pending Order Value** with date filters and charts.
  - Full Product & Variant Matrix Management with client-side WebP compression before Supabase Storage upload, plus private admin-only `cost_price`.
  - Atomic Order Management (`NEW` -> `PENDING` -> `CONFIRMED` -> `PREPARING` -> `SHIPPED` -> `OUT_FOR_DELIVERY` -> `DELIVERED` / `CANCELLED` / `RETURNED`) with automatic stock restoration guards, CSV export, and printable Invoices & Packing Slips.
  - Categories, Discounts & Automatic Promotions, Egyptian Governorates & Areas Shipping Rules, Customers CRM, Inventory Ledger, Website Content CMS, and Store Settings + Audit Logs.

---

## Environment Variables

Copy `.env.example` to `.env.local`:

```env
NEXT_PUBLIC_SITE_URL=https://your-domain.com
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

> **Security:** Never expose `SUPABASE_SERVICE_ROLE_KEY` in client components or `NEXT_PUBLIC_*` variables.

---

## Database & Storage Setup (Supabase Free Plan)

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run the migrations in exact order:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_rls_policies.sql`
   - `supabase/migrations/003_functions_and_transactions.sql`
   - `supabase/migrations/004_storage_buckets.sql`
3. *(Optional)* Run `supabase/seed/seed.sql` in the SQL Editor to load Egyptian governorates, sample categories, products, variants, `ALVERO20` promo code, and editorial content pages.
4. In **Authentication -> Providers**, ensure **Email** provider is enabled and **Disable public signups** (recommended, since admin users are provisioned only by the bootstrap script or OWNER).

---

## Creating the First `OWNER` Account

There is intentionally **no public admin registration page**.

1. Add temporary credentials to `.env.local`:
   ```env
   BOOTSTRAP_OWNER_EMAIL=owner@alvero.eg
   BOOTSTRAP_OWNER_PASSWORD=StrongPasswordHere123!
   BOOTSTRAP_OWNER_NAME=ALVERO Founder
   ```
2. Run:
   ```bash
   npm run bootstrap-owner
   ```
3. Remove `BOOTSTRAP_OWNER_*` from `.env.local`.
4. Sign in at `/admin/login`. Once signed in as `OWNER`, you can create additional `ADMIN`, `ORDER_MANAGER`, and `PRODUCT_MANAGER` accounts inside `/admin/settings`.

---

## Vercel Deployment (Free Hobby Plan)

1. Push this repository to GitHub (`.env.local` is gitignored).
2. Import the repository in [vercel.com](https://vercel.com).
3. Add the environment variables from `.env.example` in **Project Settings -> Environment Variables** (`NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
4. Deploy.
5. **Custom Domain**: Go to **Project Settings -> Domains**, add `alvero.eg` (or your domain), configure the suggested `A` / `CNAME` DNS records at your registrar, and update `NEXT_PUBLIC_SITE_URL` to match `https://your-domain.com`.

---

## Free-Tier Quotas & Documented Limitations

| Service | Free Plan Limit | How ALVERO Designs Around It |
| --- | --- | --- |
| **Supabase Database** | 500 MB storage, paused after 7 days of zero activity | Normalized schema, soft deletes, paginated queries, indexed filters |
| **Supabase Storage** | 1 GB storage, 5 GB cached egress/month; Image Transformations require Pro | Client-side Canvas WebP compression (max 1800px) before upload; 5 MB upload limit |
| **Vercel Hobby** | Serverless function execution limits, 10s default timeout, 1,000 source images / 5,000 image transformations/month | Atomic single-call PostgreSQL RPCs for checkout/status, paginated endpoints, responsive `sizes` on `next/image` |
| **Notifications** | No paid SMS/Email/WhatsApp Business API | Generates verified `wa.me` click-to-chat order confirmation links without paid APIs |
| **Rate Limiting** | No paid Redis (Upstash) required | PostgreSQL-backed `rate_limits` table with graceful in-memory fallback |

---

## Verification & Testing

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```
