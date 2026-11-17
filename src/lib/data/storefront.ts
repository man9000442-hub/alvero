import "server-only";
import { createSupabaseServerClient, isServerSupabaseConfigured } from "@/lib/supabase/server";
import type {
  Category,
  ContentPage,
  DeliveryArea,
  Governorate,
  HomepageBanner,
  HomepageSection,
  Product,
  ShippingRule,
  StorefrontCopy,
  WebsiteSettings,
} from "@/types/database";

export const DEFAULT_STOREFRONT_COPY: StorefrontCopy = {
  hero_eyebrow_en: "ALVERO · EGYPT",
  hero_eyebrow_ar: "ألفيرو · مصر",
  pillars_enabled: true,
  pillar_1_title_en: "Cash on Delivery Across Egypt",
  pillar_1_title_ar: "الدفع عند الاستلام في جميع المحافظات",
  pillar_1_desc_en:
    "Pay in cash upon inspection at your doorstep across all governorates.",
  pillar_1_desc_ar: "ادفع نقداً عند استلام طلبك ومعاينته أمام باب منزلك.",
  pillar_2_title_en: "340 GSM Combed Cotton",
  pillar_2_title_ar: "قطن مصري ممشط 340 جم",
  pillar_2_desc_en:
    "Architectural cuts crafted in limited runs with dense heavyweight textiles.",
  pillar_2_desc_ar:
    "قصّات معمارية بكميات محدودة من أثقل وأجود الخامات القطنية.",
  pillar_3_title_en: "14-Day Size Exchange",
  pillar_3_title_ar: "استبدال المقاس خلال 14 يوماً",
  pillar_3_desc_en:
    "Effortless exchanges on unworn garments with original tags intact.",
  pillar_3_desc_ar: "تبديل واسترجاع مرن للقطع غير الملبوسة ببطاقاتها الأصلية.",
  product_shipping_title_en: "Delivery & Cash on Delivery",
  product_shipping_title_ar: "التوصيل والدفع عند الاستلام",
  product_shipping_desc_en:
    "Delivered across Egypt in 1–5 business days. Pay in cash upon delivery. 14-day return & exchange policy.",
  product_shipping_desc_ar:
    "التوصيل لجميع محافظات مصر خلال 1-5 أيام عمل. الدفع نقداً عند الاستلام مع إمكانية الاستبدال خلال 14 يوماً.",
  cart_cod_notice_en: "Cash on Delivery (COD) only — no card required.",
  cart_cod_notice_ar: "الدفع عند الاستلام فقط — لا يتطلب بطاقة بنكية.",
  checkout_subtitle_en:
    "Complete your order. Payment is collected in cash upon delivery.",
  checkout_subtitle_ar:
    "أكمل بيانات التوصيل. يتم سداد قيمة الطلب نقداً عند الاستلام.",
  checkout_cod_title_en: "Cash on Delivery (COD)",
  checkout_cod_title_ar: "الدفع عند الاستلام (COD)",
  checkout_cod_desc_en:
    "You will pay the total amount in Egyptian Pounds (EGP) directly to the courier upon delivery. No online card payment is required.",
  checkout_cod_desc_ar:
    "ستقوم بدفع المبلغ الإجمالي بالجنيه المصري نقداً لمندوب الشحن عند استلام طلبك. لا توجد مدفوعات إلكترونية.",
  footer_cod_badge_en: "Cash on Delivery Across All Egypt",
  footer_cod_badge_ar: "الدفع عند الاستلام في جميع محافظات مصر",
  footer_bottom_note_en: "EGP · CASH ON DELIVERY",
  footer_bottom_note_ar: "ج.م · الدفع عند الاستلام",
  footer_copyright_en: "© {year} ALVERO. All rights reserved.",
  footer_copyright_ar: "© {year} ألفيرو ALVERO. جميع الحقوق محفوظة.",
};

export const DEFAULT_WEBSITE_SETTINGS: WebsiteSettings = {
  id: 1,
  brand_name: "ALVERO",
  logo_url: null,
  favicon_url: null,
  contact_phone: "+20 100 000 0000",
  whatsapp_number: "201000000000",
  support_email: "care@alvero.eg",
  instagram_url: "",
  facebook_url: "",
  tiktok_url: "",
  default_language: "en",
  currency: "EGP",
  store_status: "OPEN",
  maintenance_mode: false,
  maintenance_message_en:
    "We are curating our next seasonal edit. Please check back shortly.",
  maintenance_message_ar:
    "نعمل حالياً على تجهيز مجموعتنا الموسمية الجديدة. يرجى العودة قريباً.",
  announcement_enabled: true,
  announcement_text_en:
    "COMPLIMENTARY DELIVERY OVER 2,500 EGP — CASH ON DELIVERY ACROSS EGYPT",
  announcement_text_ar:
    "شحن مجاني للطلبات فوق 2,500 ج.م — الدفع عند الاستلام في جميع محافظات مصر",
  newsletter_enabled: false,
  order_notification_whatsapp_enabled: true,
  order_notification_email: "",
  footer_links: [
    { group: "client_care", label_en: "Track Order", label_ar: "تتبع الطلب", href: "/track-order" },
    { group: "client_care", label_en: "Shipping Policy", label_ar: "سياسة الشحن", href: "/policies/shipping" },
    { group: "client_care", label_en: "Returns & Exchanges", label_ar: "الاسترجاع والاستبدال", href: "/policies/returns" },
    { group: "house", label_en: "About ALVERO", label_ar: "عن ألفيرو", href: "/about" },
    { group: "house", label_en: "Contact Atelier", label_ar: "تواصل معنا", href: "/contact" },
    { group: "legal", label_en: "Privacy Policy", label_ar: "سياسة الخصوصية", href: "/policies/privacy" },
    { group: "legal", label_en: "Terms & Conditions", label_ar: "الشروط والأحكام", href: "/policies/terms" },
  ],
  storefront_copy: DEFAULT_STOREFRONT_COPY,
};

export async function getWebsiteSettings(): Promise<WebsiteSettings> {
  if (!isServerSupabaseConfigured()) {
    return DEFAULT_WEBSITE_SETTINGS;
  }
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("website_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (!data) return DEFAULT_WEBSITE_SETTINGS;
    return {
      ...DEFAULT_WEBSITE_SETTINGS,
      ...data,
      footer_links: Array.isArray(data.footer_links) && data.footer_links.length > 0
        ? data.footer_links
        : DEFAULT_WEBSITE_SETTINGS.footer_links,
      storefront_copy: {
        ...DEFAULT_STOREFRONT_COPY,
        ...(typeof data.storefront_copy === "object" && data.storefront_copy !== null
          ? data.storefront_copy
          : {}),
      },
    } as WebsiteSettings;
  } catch {
    return DEFAULT_WEBSITE_SETTINGS;
  }
}

export async function getActiveCategories(): Promise<Category[]> {
  if (!isServerSupabaseConfigured()) return [];
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("sort_order", { ascending: true });

    return (data ?? []) as Category[];
  } catch {
    return [];
  }
}

export async function getHomepageData(): Promise<{
  banners: HomepageBanner[];
  sections: HomepageSection[];
  featuredCategories: Category[];
  newArrivals: Product[];
  bestSellers: Product[];
  featuredProducts: Product[];
}> {
  if (!isServerSupabaseConfigured()) {
    return {
      banners: [],
      sections: [],
      featuredCategories: [],
      newArrivals: [],
      bestSellers: [],
      featuredProducts: [],
    };
  }

  try {
    const supabase = await createSupabaseServerClient();

    const [
      bannersRes,
      sectionsRes,
      categoriesRes,
      newArrivalsRes,
      bestSellersRes,
      featuredRes,
    ] = await Promise.all([
      supabase
        .from("homepage_banners")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("homepage_sections")
        .select("*")
        .order("sort_order", { ascending: true }),
      supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .eq("is_featured", true)
        .is("deleted_at", null)
        .order("sort_order", { ascending: true })
        .limit(6),
      supabase
        .from("products")
        .select("*, category:categories(*), variants:product_variants(*)")
        .eq("status", "ACTIVE")
        .eq("is_new_arrival", true)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("products")
        .select("*, category:categories(*), variants:product_variants(*)")
        .eq("status", "ACTIVE")
        .eq("is_best_seller", true)
        .is("deleted_at", null)
        .order("sales_count", { ascending: false })
        .limit(8),
      supabase
        .from("products")
        .select("*, category:categories(*), variants:product_variants(*)")
        .eq("status", "ACTIVE")
        .eq("is_featured", true)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

    return {
      banners: (bannersRes.data ?? []) as HomepageBanner[],
      sections: (sectionsRes.data ?? []) as HomepageSection[],
      featuredCategories: (categoriesRes.data ?? []) as Category[],
      newArrivals: (newArrivalsRes.data ?? []) as Product[],
      bestSellers: (bestSellersRes.data ?? []) as Product[],
      featuredProducts: (featuredRes.data ?? []) as Product[],
    };
  } catch {
    return {
      banners: [],
      sections: [],
      featuredCategories: [],
      newArrivals: [],
      bestSellers: [],
      featuredProducts: [],
    };
  }
}

export interface ShopFilterParams {
  search?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  size?: string;
  color?: string;
  inStock?: boolean;
  sort?: "newest" | "price_asc" | "price_desc" | "popularity" | "best_sellers";
  page?: number;
  pageSize?: number;
}

export async function getShopProducts(filters: ShopFilterParams): Promise<{
  products: Product[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  availableSizes: string[];
  availableColors: { name_en: string; name_ar: string; hex: string }[];
}> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(48, Math.max(1, filters.pageSize ?? 12));

  if (!isServerSupabaseConfigured()) {
    return {
      products: [],
      totalCount: 0,
      page,
      pageSize,
      totalPages: 0,
      availableSizes: [],
      availableColors: [],
    };
  }

  try {
    const supabase = await createSupabaseServerClient();

    let categoryId: string | null = null;
    if (filters.category) {
      const { data: cat } = await supabase
        .from("categories")
        .select("id")
        .eq("slug", filters.category)
        .is("deleted_at", null)
        .maybeSingle();
      categoryId = cat?.id ?? null;
      if (!categoryId) {
        return {
          products: [],
          totalCount: 0,
          page,
          pageSize,
          totalPages: 0,
          availableSizes: [],
          availableColors: [],
        };
      }
    }

    let query = supabase
      .from("products")
      .select("*, category:categories(*), variants:product_variants(*)")
      .eq("status", "ACTIVE")
      .is("deleted_at", null);

    if (categoryId) {
      query = query.eq("category_id", categoryId);
    }

    if (filters.search?.trim()) {
      const s = filters.search.trim().replace(/[%_,]/g, "");
      query = query.or(
        `name_en.ilike.%${s}%,name_ar.ilike.%${s}%,sku.ilike.%${s}%,description_en.ilike.%${s}%`,
      );
    }

    switch (filters.sort) {
      case "price_asc":
        query = query.order("regular_price", { ascending: true });
        break;
      case "price_desc":
        query = query.order("regular_price", { ascending: false });
        break;
      case "popularity":
        query = query.order("popularity_score", { ascending: false });
        break;
      case "best_sellers":
        query = query.order("sales_count", { ascending: false });
        break;
      case "newest":
      default:
        query = query.order("created_at", { ascending: false });
        break;
    }

    const { data: rawProducts } = await query.limit(200);
    const allActive = (rawProducts ?? []) as Product[];

    const sizeSet = new Set<string>();
    const colorMap = new Map<
      string,
      { name_en: string; name_ar: string; hex: string }
    >();

    for (const p of allActive) {
      for (const v of p.variants ?? []) {
        if (v.size) sizeSet.add(v.size);
        if (v.color_name_en) {
          colorMap.set(v.color_name_en.toLowerCase(), {
            name_en: v.color_name_en,
            name_ar: v.color_name_ar,
            hex: v.color_hex,
          });
        }
      }
    }

    const filtered = allActive.filter((p) => {
      const effectivePrice =
        p.sale_price !== null && p.sale_price < p.regular_price
          ? Number(p.sale_price)
          : Number(p.regular_price);

      if (filters.minPrice !== undefined && effectivePrice < filters.minPrice) {
        return false;
      }
      if (filters.maxPrice !== undefined && effectivePrice > filters.maxPrice) {
        return false;
      }

      const variants = p.variants ?? [];
      if (filters.inStock) {
        const hasStock = variants.some(
          (v) => v.is_available && v.stock_quantity > 0,
        );
        if (!hasStock) return false;
      }

      if (filters.size) {
        const hasSize = variants.some(
          (v) =>
            v.size.toLowerCase() === filters.size!.toLowerCase() &&
            (!filters.inStock || (v.is_available && v.stock_quantity > 0)),
        );
        if (!hasSize) return false;
      }

      if (filters.color) {
        const hasColor = variants.some(
          (v) =>
            v.color_name_en.toLowerCase() === filters.color!.toLowerCase() &&
            (!filters.inStock || (v.is_available && v.stock_quantity > 0)),
        );
        if (!hasColor) return false;
      }

      return true;
    });

    if (filters.sort === "price_asc") {
      filtered.sort(
        (a, b) =>
          (a.sale_price ?? a.regular_price) - (b.sale_price ?? b.regular_price),
      );
    } else if (filters.sort === "price_desc") {
      filtered.sort(
        (a, b) =>
          (b.sale_price ?? b.regular_price) - (a.sale_price ?? a.regular_price),
      );
    }

    const totalCount = filtered.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    const start = (page - 1) * pageSize;
    const paginated = filtered.slice(start, start + pageSize);

    return {
      products: paginated,
      totalCount,
      page,
      pageSize,
      totalPages,
      availableSizes: Array.from(sizeSet),
      availableColors: Array.from(colorMap.values()),
    };
  } catch {
    return {
      products: [],
      totalCount: 0,
      page,
      pageSize,
      totalPages: 0,
      availableSizes: [],
      availableColors: [],
    };
  }
}

export async function getProductBySlug(slug: string): Promise<{
  product: Product | null;
  relatedProducts: Product[];
}> {
  if (!isServerSupabaseConfigured()) {
    return { product: null, relatedProducts: [] };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data: product } = await supabase
      .from("products")
      .select(
        "*, category:categories(*), images:product_images(*), variants:product_variants(*)",
      )
      .eq("slug", slug)
      .eq("status", "ACTIVE")
      .is("deleted_at", null)
      .maybeSingle();

    if (!product) return { product: null, relatedProducts: [] };

    const typedProduct = product as Product;
    if (typedProduct.images) {
      typedProduct.images.sort((a, b) => a.sort_order - b.sort_order);
    }

    let relatedQuery = supabase
      .from("products")
      .select("*, category:categories(*), variants:product_variants(*)")
      .eq("status", "ACTIVE")
      .is("deleted_at", null)
      .neq("id", typedProduct.id)
      .limit(4);

    if (typedProduct.category_id) {
      relatedQuery = relatedQuery.eq("category_id", typedProduct.category_id);
    }

    const { data: related } = await relatedQuery;
    return {
      product: typedProduct,
      relatedProducts: (related ?? []) as Product[],
    };
  } catch {
    return { product: null, relatedProducts: [] };
  }
}

export async function getActiveShippingConfig(): Promise<{
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

  if (!isServerSupabaseConfigured()) {
    return { governorates: [], areas: [], globalRule: defaultRule };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const [govRes, areasRes, ruleRes] = await Promise.all([
      supabase
        .from("governorates")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("delivery_areas")
        .select("*")
        .eq("is_active", true)
        .order("name_en", { ascending: true }),
      supabase.from("shipping_rules").select("*").eq("id", 1).maybeSingle(),
    ]);

    return {
      governorates: (govRes.data ?? []) as Governorate[],
      areas: (areasRes.data ?? []) as DeliveryArea[],
      globalRule: (ruleRes.data as ShippingRule) ?? defaultRule,
    };
  } catch {
    return { governorates: [], areas: [], globalRule: defaultRule };
  }
}

export async function getContentPage(slug: string): Promise<ContentPage | null> {
  if (!isServerSupabaseConfigured()) return null;
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("content_pages")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    return (data as ContentPage) ?? null;
  } catch {
    return null;
  }
}
