import "server-only";
import { createSupabaseAdminClient, isAdminSupabaseConfigured } from "@/lib/supabase/admin";
import type {
  AdminProfile,
  Category,
  ContentPage,
  Customer,
  DeliveryArea,
  Discount,
  Governorate,
  HomepageBanner,
  HomepageSection,
  Order,
  OrderStatus,
  Product,
  ShippingRule,
  WebsiteSettings,
} from "@/types/database";
import { DEFAULT_STOREFRONT_COPY, DEFAULT_WEBSITE_SETTINGS } from "./storefront";

export type DatePreset = "today" | "7d" | "30d" | "month" | "custom";

export function resolveDateRange(
  preset: DatePreset,
  fromParam?: string,
  toParam?: string,
): { from: Date; to: Date } {
  const now = new Date();
  const to = toParam ? new Date(`${toParam}T23:59:59.999Z`) : now;

  if (preset === "custom" && fromParam) {
    return { from: new Date(`${fromParam}T00:00:00.000Z`), to };
  }

  const from = new Date(now);
  if (preset === "today") {
    from.setHours(0, 0, 0, 0);
  } else if (preset === "7d") {
    from.setDate(from.getDate() - 6);
    from.setHours(0, 0, 0, 0);
  } else if (preset === "month") {
    from.setDate(1);
    from.setHours(0, 0, 0, 0);
  } else {
    from.setDate(from.getDate() - 29);
    from.setHours(0, 0, 0, 0);
  }
  return { from, to };
}

export interface DashboardMetrics {
  totalOrders: number;
  newOrders: number;
  pendingOrders: number;
  confirmedOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  totalSalesGross: number;
  deliveredRevenue: number;
  confirmedRevenue: number;
  pendingOrderValue: number;
  totalActiveProducts: number;
  lowStockVariants: number;
  outOfStockVariants: number;
  ordersOverTime: { date: string; orders: number; revenue: number }[];
  ordersByStatus: { status: OrderStatus; count: number }[];
  bestSellingProducts: {
    id: string;
    name_en: string;
    name_ar: string;
    sku: string;
    sales_count: number;
    regular_price: number;
  }[];
  recentOrders: Order[];
}

export async function getAdminOverviewMetrics(
  preset: DatePreset = "30d",
  fromParam?: string,
  toParam?: string,
): Promise<DashboardMetrics> {
  const empty: DashboardMetrics = {
    totalOrders: 0,
    newOrders: 0,
    pendingOrders: 0,
    confirmedOrders: 0,
    shippedOrders: 0,
    deliveredOrders: 0,
    cancelledOrders: 0,
    totalSalesGross: 0,
    deliveredRevenue: 0,
    confirmedRevenue: 0,
    pendingOrderValue: 0,
    totalActiveProducts: 0,
    lowStockVariants: 0,
    outOfStockVariants: 0,
    ordersOverTime: [],
    ordersByStatus: [],
    bestSellingProducts: [],
    recentOrders: [],
  };

  if (!isAdminSupabaseConfigured()) return empty;

  const { from, to } = resolveDateRange(preset, fromParam, toParam);
  const supabase = createSupabaseAdminClient();

  const [ordersRes, productsRes, variantsRes] = await Promise.all([
    supabase
      .from("orders")
      .select("*")
      .gte("created_at", from.toISOString())
      .lte("created_at", to.toISOString())
      .order("created_at", { ascending: false })
      .limit(2000),
    supabase
      .from("products")
      .select("id, name_en, name_ar, sku, sales_count, regular_price, status, low_stock_threshold")
      .is("deleted_at", null),
    supabase
      .from("product_variants")
      .select("id, product_id, stock_quantity, is_available"),
  ]);

  const orders = (ordersRes.data ?? []) as Order[];
  const products = (productsRes.data ?? []) as Array<{
    id: string;
    name_en: string;
    name_ar: string;
    sku: string;
    sales_count: number;
    regular_price: number;
    status: string;
    low_stock_threshold: number;
  }>;
  const variants = (variantsRes.data ?? []) as Array<{
    id: string;
    product_id: string;
    stock_quantity: number;
    is_available: boolean;
  }>;

  const thresholdMap = new Map<string, number>();
  for (const p of products) {
    thresholdMap.set(p.id, p.low_stock_threshold ?? 5);
  }

  let lowStockVariants = 0;
  let outOfStockVariants = 0;
  for (const v of variants) {
    const threshold = thresholdMap.get(v.product_id) ?? 5;
    if (v.stock_quantity === 0 || !v.is_available) {
      outOfStockVariants += 1;
    } else if (v.stock_quantity <= threshold) {
      lowStockVariants += 1;
    }
  }

  const statusCounts: Record<OrderStatus, number> = {
    NEW: 0,
    PENDING: 0,
    CONFIRMED: 0,
    PREPARING: 0,
    SHIPPED: 0,
    OUT_FOR_DELIVERY: 0,
    DELIVERED: 0,
    CANCELLED: 0,
    RETURNED: 0,
  };

  let totalSalesGross = 0;
  let deliveredRevenue = 0;
  let confirmedRevenue = 0;
  let pendingOrderValue = 0;

  const dailyMap = new Map<string, { orders: number; revenue: number }>();

  for (const o of orders) {
    statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1;
    const total = Number(o.total_amount || 0);

    if (o.status !== "CANCELLED" && o.status !== "RETURNED") {
      totalSalesGross += total;
    }
    if (o.status === "DELIVERED") {
      deliveredRevenue += total;
    } else if (
      o.status === "CONFIRMED" ||
      o.status === "PREPARING" ||
      o.status === "SHIPPED" ||
      o.status === "OUT_FOR_DELIVERY"
    ) {
      confirmedRevenue += total;
    } else if (o.status === "NEW" || o.status === "PENDING") {
      pendingOrderValue += total;
    }

    const dayKey = o.created_at.slice(0, 10);
    const prev = dailyMap.get(dayKey) ?? { orders: 0, revenue: 0 };
    dailyMap.set(dayKey, {
      orders: prev.orders + 1,
      revenue: prev.revenue + (o.status === "DELIVERED" ? total : 0),
    });
  }

  const ordersOverTime = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, val]) => ({ date, ...val }));

  const ordersByStatus = (Object.keys(statusCounts) as OrderStatus[]).map(
    (status) => ({
      status,
      count: statusCounts[status],
    }),
  );

  const bestSellingProducts = [...products]
    .sort((a, b) => b.sales_count - a.sales_count)
    .slice(0, 5)
    .map((p) => ({
      id: p.id,
      name_en: p.name_en,
      name_ar: p.name_ar,
      sku: p.sku,
      sales_count: p.sales_count,
      regular_price: Number(p.regular_price),
    }));

  return {
    totalOrders: orders.length,
    newOrders: statusCounts.NEW,
    pendingOrders: statusCounts.PENDING,
    confirmedOrders: statusCounts.CONFIRMED + statusCounts.PREPARING,
    shippedOrders: statusCounts.SHIPPED + statusCounts.OUT_FOR_DELIVERY,
    deliveredOrders: statusCounts.DELIVERED,
    cancelledOrders: statusCounts.CANCELLED + statusCounts.RETURNED,
    totalSalesGross,
    deliveredRevenue,
    confirmedRevenue,
    pendingOrderValue,
    totalActiveProducts: products.filter((p) => p.status === "ACTIVE").length,
    lowStockVariants,
    outOfStockVariants,
    ordersOverTime,
    ordersByStatus,
    bestSellingProducts,
    recentOrders: orders.slice(0, 8),
  };
}

export async function getAdminProducts(params: {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ products: Product[]; totalCount: number }> {
  if (!isAdminSupabaseConfigured()) return { products: [], totalCount: 0 };
  const supabase = createSupabaseAdminClient();
  const page = Math.max(1, params.page ?? 1);
  const pageSize = params.pageSize ?? 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("products")
    .select(
      "*, category:categories(*), variants:product_variants(*), product_private_metrics(cost_price)",
      { count: "exact" },
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (params.status && params.status !== "ALL") {
    query = query.eq("status", params.status);
  }
  if (params.search?.trim()) {
    const s = params.search.trim().replace(/[%_,]/g, "");
    query = query.or(
      `name_en.ilike.%${s}%,name_ar.ilike.%${s}%,sku.ilike.%${s}%`,
    );
  }

  const { data, count } = await query;
  const products = (data ?? []).map((row) => {
    const privateMetrics = (row as { product_private_metrics?: { cost_price: number | null } | null }).product_private_metrics;
    return {
      ...row,
      cost_price: privateMetrics?.cost_price ?? null,
    } as Product;
  });

  return { products, totalCount: count ?? 0 };
}

export async function getAdminProductById(id: string): Promise<Product | null> {
  if (!isAdminSupabaseConfigured()) return null;
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("products")
    .select(
      "*, category:categories(*), images:product_images(*), variants:product_variants(*), product_private_metrics(cost_price)",
    )
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!data) return null;
  const privateMetrics = (data as { product_private_metrics?: { cost_price: number | null } | null }).product_private_metrics;
  const product = { ...data, cost_price: privateMetrics?.cost_price ?? null } as Product;
  if (product.images) {
    product.images.sort((a, b) => a.sort_order - b.sort_order);
  }
  return product;
}

export async function getAdminCategories(): Promise<Category[]> {
  if (!isAdminSupabaseConfigured()) return [];
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("categories")
    .select("*")
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });
  return (data ?? []) as Category[];
}

export async function getAdminOrders(params: {
  status?: string;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ orders: (Order & { items_count: number })[]; totalCount: number }> {
  if (!isAdminSupabaseConfigured()) return { orders: [], totalCount: 0 };
  const supabase = createSupabaseAdminClient();
  const page = Math.max(1, params.page ?? 1);
  const pageSize = params.pageSize ?? 25;
  const fromIdx = (page - 1) * pageSize;
  const toIdx = fromIdx + pageSize - 1;

  let query = supabase
    .from("orders")
    .select("*, order_items(quantity)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(fromIdx, toIdx);

  if (params.status && params.status !== "ALL") {
    query = query.eq("status", params.status);
  }
  if (params.from) {
    query = query.gte("created_at", `${params.from}T00:00:00.000Z`);
  }
  if (params.to) {
    query = query.lte("created_at", `${params.to}T23:59:59.999Z`);
  }
  if (params.search?.trim()) {
    const s = params.search.trim().replace(/[%_,]/g, "");
    query = query.or(
      `order_number.ilike.%${s}%,customer_name.ilike.%${s}%,customer_phone.ilike.%${s}%`,
    );
  }

  const { data, count } = await query;
  const orders = (data ?? []).map((row) => {
    const itemsArr = (row as { order_items?: { quantity: number }[] }).order_items ?? [];
    const items_count = itemsArr.reduce((acc, i) => acc + (i.quantity || 0), 0);
    return { ...row, items_count } as Order & { items_count: number };
  });

  return { orders, totalCount: count ?? 0 };
}

export async function getAdminOrderById(id: string): Promise<Order | null> {
  if (!isAdminSupabaseConfigured()) return null;
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("orders")
    .select("*, items:order_items(*), history:order_status_history(*)")
    .eq("id", id)
    .maybeSingle();

  if (!data) return null;
  const order = data as Order;
  if (order.history) {
    order.history.sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
  }
  return order;
}

export async function getAdminDiscounts(): Promise<Discount[]> {
  if (!isAdminSupabaseConfigured()) return [];
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("discounts")
    .select("*, discount_products(product_id), discount_categories(category_id)")
    .order("created_at", { ascending: false });

  return (data ?? []).map((d) => ({
    ...d,
    product_ids:
      (d as { discount_products?: { product_id: string }[] }).discount_products?.map(
        (x) => x.product_id,
      ) ?? [],
    category_ids:
      (d as { discount_categories?: { category_id: string }[] }).discount_categories?.map(
        (x) => x.category_id,
      ) ?? [],
  })) as Discount[];
}

export async function getAdminShippingData(): Promise<{
  governorates: Governorate[];
  areas: DeliveryArea[];
  globalRule: ShippingRule;
}> {
  const defaultRule: ShippingRule = {
    id: 1,
    name_en: "Standard Egypt COD Shipping",
    name_ar: "الشحن القياسي داخل مصر - الدفع عند الاستلام",
    default_shipping_fee: 75,
    free_shipping_threshold: 2500,
    is_free_shipping_enabled: true,
  };
  if (!isAdminSupabaseConfigured()) {
    return { governorates: [], areas: [], globalRule: defaultRule };
  }
  const supabase = createSupabaseAdminClient();
  const [govRes, areasRes, ruleRes] = await Promise.all([
    supabase.from("governorates").select("*").order("sort_order", { ascending: true }),
    supabase.from("delivery_areas").select("*").order("name_en", { ascending: true }),
    supabase.from("shipping_rules").select("*").eq("id", 1).maybeSingle(),
  ]);
  return {
    governorates: (govRes.data ?? []) as Governorate[],
    areas: (areasRes.data ?? []) as DeliveryArea[],
    globalRule: (ruleRes.data as ShippingRule) ?? defaultRule,
  };
}

export async function getAdminCustomers(search?: string): Promise<Customer[]> {
  if (!isAdminSupabaseConfigured()) return [];
  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("customers")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(100);

  if (search?.trim()) {
    const s = search.trim().replace(/[%_,]/g, "");
    query = query.or(`full_name.ilike.%${s}%,phone.ilike.%${s}%`);
  }

  const { data } = await query;
  return (data ?? []) as Customer[];
}

export async function getAdminCustomerById(id: string): Promise<{
  customer: Customer | null;
  orders: Order[];
}> {
  if (!isAdminSupabaseConfigured()) return { customer: null, orders: [] };
  const supabase = createSupabaseAdminClient();
  const [custRes, ordersRes] = await Promise.all([
    supabase.from("customers").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("orders")
      .select("*")
      .eq("customer_id", id)
      .order("created_at", { ascending: false }),
  ]);

  return {
    customer: (custRes.data as Customer) ?? null,
    orders: (ordersRes.data ?? []) as Order[],
  };
}

export async function getAdminInventoryData() {
  if (!isAdminSupabaseConfigured()) {
    return { variants: [], movements: [] };
  }
  const supabase = createSupabaseAdminClient();
  const [variantsRes, movementsRes] = await Promise.all([
    supabase
      .from("product_variants")
      .select("*, product:products!inner(id, name_en, name_ar, slug, low_stock_threshold, deleted_at)")
      .is("product.deleted_at", null)
      .order("stock_quantity", { ascending: true })
      .limit(300),
    supabase
      .from("inventory_movements")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  return {
    variants: variantsRes.data ?? [],
    movements: movementsRes.data ?? [],
  };
}

export async function getAdminContentData(): Promise<{
  banners: HomepageBanner[];
  sections: HomepageSection[];
  pages: ContentPage[];
  settings: WebsiteSettings;
}> {
  if (!isAdminSupabaseConfigured()) {
    return {
      banners: [],
      sections: [],
      pages: [],
      settings: DEFAULT_WEBSITE_SETTINGS,
    };
  }
  const supabase = createSupabaseAdminClient();
  const [bannersRes, sectionsRes, pagesRes, settingsRes] = await Promise.all([
    supabase.from("homepage_banners").select("*").order("sort_order", { ascending: true }),
    supabase.from("homepage_sections").select("*").order("sort_order", { ascending: true }),
    supabase.from("content_pages").select("*").order("slug", { ascending: true }),
    supabase.from("website_settings").select("*").eq("id", 1).maybeSingle(),
  ]);

  const rawSettings = settingsRes.data as Partial<WebsiteSettings> | null;
  const mergedSettings: WebsiteSettings = {
    ...DEFAULT_WEBSITE_SETTINGS,
    ...(rawSettings ?? {}),
    footer_links:
      Array.isArray(rawSettings?.footer_links) && rawSettings.footer_links.length > 0
        ? rawSettings.footer_links
        : DEFAULT_WEBSITE_SETTINGS.footer_links,
    storefront_copy: {
      ...DEFAULT_STOREFRONT_COPY,
      ...(rawSettings?.storefront_copy ?? {}),
    },
  };

  return {
    banners: (bannersRes.data ?? []) as HomepageBanner[],
    sections: (sectionsRes.data ?? []) as HomepageSection[],
    pages: (pagesRes.data ?? []) as ContentPage[],
    settings: mergedSettings,
  };
}

export async function getAdminSettingsAndStaff(): Promise<{
  settings: WebsiteSettings;
  staff: AdminProfile[];
  auditLogs: Array<{
    id: string;
    actor_email: string | null;
    actor_role: string | null;
    action: string;
    entity_type: string;
    entity_id: string | null;
    metadata: Record<string, unknown>;
    created_at: string;
  }>;
}> {
  if (!isAdminSupabaseConfigured()) {
    return { settings: DEFAULT_WEBSITE_SETTINGS, staff: [], auditLogs: [] };
  }
  const supabase = createSupabaseAdminClient();
  const [settingsRes, staffRes, logsRes] = await Promise.all([
    supabase.from("website_settings").select("*").eq("id", 1).maybeSingle(),
    supabase.from("profiles").select("*").order("created_at", { ascending: true }),
    supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const rawSettings = settingsRes.data as Partial<WebsiteSettings> | null;
  const mergedSettings: WebsiteSettings = {
    ...DEFAULT_WEBSITE_SETTINGS,
    ...(rawSettings ?? {}),
    footer_links:
      Array.isArray(rawSettings?.footer_links) && rawSettings.footer_links.length > 0
        ? rawSettings.footer_links
        : DEFAULT_WEBSITE_SETTINGS.footer_links,
    storefront_copy: {
      ...DEFAULT_STOREFRONT_COPY,
      ...(rawSettings?.storefront_copy ?? {}),
    },
  };

  return {
    settings: mergedSettings,
    staff: (staffRes.data ?? []) as AdminProfile[],
    auditLogs: (logsRes.data ?? []) as Array<{
      id: string;
      actor_email: string | null;
      actor_role: string | null;
      action: string;
      entity_type: string;
      entity_id: string | null;
      metadata: Record<string, unknown>;
      created_at: string;
    }>,
  };
}
