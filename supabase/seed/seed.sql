-- ALVERO E-Commerce Platform
-- Optional Sample Seed Data (Egyptian Governorates, Sizes, Colors, Categories, Products, Banners, Content Pages)
-- Note: Editorial photography URLs can be replaced via Admin Dashboard -> Media Upload (Supabase Storage).

-- 1. Sizes & Colors Catalog
insert into public.product_sizes (code, label_en, label_ar, sort_order) values
  ('XS', 'XS', 'XS', 1),
  ('S', 'S', 'S', 2),
  ('M', 'M', 'M', 3),
  ('L', 'L', 'L', 4),
  ('XL', 'XL', 'XL', 5),
  ('XXL', 'XXL', 'XXL', 6),
  ('ONE_SIZE', 'One Size', 'مقاس واحد', 7)
on conflict (code) do nothing;

insert into public.product_colors (code, name_en, name_ar, hex_code, sort_order) values
  ('black', 'Obsidian Black', 'أسود أوبسيديان', '#000000', 1),
  ('white', 'Pure White', 'أبيض نقي', '#FFFFFF', 2),
  ('off-white', 'Chalk', 'أبيض طباشيري', '#F4F4F0', 3),
  ('charcoal', 'Charcoal', 'فحمي', '#2B2B2B', 4),
  ('stone', 'Slate Grey', 'رمادي حجري', '#8C8C88', 5)
on conflict (code) do nothing;

-- 2. Egyptian Governorates & Sample Delivery Areas
insert into public.governorates (code, name_en, name_ar, shipping_fee, free_shipping_threshold, estimated_days_min, estimated_days_max, sort_order) values
  ('CAI', 'Cairo', 'القاهرة', 60, 2500, 1, 2, 1),
  ('GIZ', 'Giza', 'الجيزة', 60, 2500, 1, 2, 2),
  ('ALX', 'Alexandria', 'الإسكندرية', 75, 2500, 2, 3, 3),
  ('QAL', 'Qalyubia', 'القليوبية', 70, 2500, 2, 3, 4),
  ('DKH', 'Dakahlia', 'الدقهلية', 85, 3000, 2, 4, 5),
  ('SHR', 'Sharqia', 'الشرقية', 85, 3000, 2, 4, 6),
  ('GHR', 'Gharbia', 'الغربية', 85, 3000, 2, 4, 7),
  ('MNF', 'Monufia', 'المنوفية', 85, 3000, 2, 4, 8),
  ('BHR', 'Beheira', 'البحيرة', 85, 3000, 2, 4, 9),
  ('ISM', 'Ismailia', 'الإسماعيلية', 85, 3000, 2, 4, 10),
  ('PTS', 'Port Said', 'بورسعيد', 85, 3000, 2, 4, 11),
  ('SUZ', 'Suez', 'السويس', 85, 3000, 2, 4, 12),
  ('FYM', 'Fayoum', 'الفيوم', 90, 3000, 3, 4, 13),
  ('BNS', 'Beni Suef', 'بني سويف', 95, 3000, 3, 5, 14),
  ('MNY', 'Minya', 'المنيا', 100, 3500, 3, 5, 15),
  ('AST', 'Asyut', 'أسيوط', 105, 3500, 3, 5, 16),
  ('SHG', 'Sohag', 'سوهاج', 110, 3500, 4, 6, 17),
  ('QNA', 'Qena', 'قنا', 115, 3500, 4, 6, 18),
  ('LXR', 'Luxor', 'الأقصر', 120, 3500, 4, 6, 19),
  ('ASN', 'Aswan', 'أسوان', 125, 3500, 4, 7, 20),
  ('RSE', 'Red Sea', 'البحر الأحمر', 125, 3500, 4, 6, 21),
  ('MTR', 'Matrouh', 'مطروح', 120, 3500, 4, 6, 22),
  ('SSI', 'South Sinai', 'جنوب سيناء', 130, 4000, 4, 7, 23)
on conflict (code) do nothing;

insert into public.delivery_areas (governorate_id, name_en, name_ar, shipping_fee_override)
select g.id, a.name_en, a.name_ar, a.fee
from public.governorates g
join (values
  ('CAI', 'Zamalek', 'الزمالك', 55),
  ('CAI', 'Maadi', 'المعادي', 60),
  ('CAI', 'New Cairo — Fifth Settlement', 'القاهرة الجديدة — التجمع الخامس', 65),
  ('CAI', 'Nasr City', 'مدينة نصر', 60),
  ('CAI', 'Heliopolis', 'مصر الجديدة', 60),
  ('GIZ', 'Sheikh Zayed', 'الشيخ زايد', 65),
  ('GIZ', '6th of October', 'السادس من أكتوبر', 70),
  ('GIZ', 'Mohandessin', 'المهندسين', 60),
  ('ALX', 'Smouha', 'سموحة', 75),
  ('ALX', 'Gleem', 'جليم', 75)
) as a(gov_code, name_en, name_ar, fee) on g.code = a.gov_code
on conflict (governorate_id, name_en) do nothing;

-- 3. Website Settings & Content Pages
update public.website_settings set
  footer_links = '[
    {"group": "client_care", "label_en": "Track Order", "label_ar": "تتبع الطلب", "href": "/track-order"},
    {"group": "client_care", "label_en": "Shipping Policy", "label_ar": "سياسة الشحن", "href": "/policies/shipping"},
    {"group": "client_care", "label_en": "Returns & Exchanges", "label_ar": "الاسترجاع والاستبدال", "href": "/policies/returns"},
    {"group": "house", "label_en": "About ALVERO", "label_ar": "عن ألفيرو", "href": "/about"},
    {"group": "house", "label_en": "Contact Atelier", "label_ar": "تواصل معنا", "href": "/contact"},
    {"group": "legal", "label_en": "Privacy Policy", "label_ar": "سياسة الخصوصية", "href": "/policies/privacy"},
    {"group": "legal", "label_en": "Terms & Conditions", "label_ar": "الشروط والأحكام", "href": "/policies/terms"}
  ]'::jsonb
where id = 1;

insert into public.homepage_sections (section_key, title_en, title_ar, subtitle_en, subtitle_ar, body_en, body_ar, image_url, sort_order) values
  ('hero', 'SILHOUETTE IN MONOCHROME', 'خطوط في أحادية اللون', 'Autumn / Winter Edit', 'إصدار الخريف والشتاء', '', '', '/images/editorial-hero.svg', 1),
  ('featured_collections', 'CURATED COLLECTIONS', 'المجموعات المختارة', 'Architectural tailoring and everyday essentials.', 'تفصيل معماري وأساسيات يومية فاخرة.', '', '', null, 2),
  ('new_arrivals', 'NEW ARRIVALS', 'وصل حديثاً', 'Latest garments from the studio.', 'أحدث القطع من الأتيليه.', '', '', null, 3),
  ('best_sellers', 'SIGNATURE PIECES', 'الأكثر مبيعاً', 'Defined by cut, weight, and restraint.', 'مصممة بدقة القصّة وثقل الخامة.', '', '', null, 4),
  ('campaign', 'THE ATELIER UNIFORM', 'الزي المعماري', 'Heavyweight Egyptian cotton & structured wool.', 'قطن مصري ثقيل وصوف مصمم بعناية.', '', '', '/images/editorial-campaign.svg', 5),
  ('featured_products', 'EDITOR''S SELECTION', 'اختيارات المحرر', 'Timeless silhouettes engineered for longevity.', 'تصاميم خالدة مصممة لتدوم.', '', '', null, 6),
  ('brand_identity', 'FORM WITHOUT EXCESS', 'الشكل دون إفراط', 'ALVERO HOUSE PHILOSOPHY', 'فلسفة دار ألفيرو', 'Founded on strict monochrome discipline, ALVERO crafts architectural garments in small batches using heavyweight combed Egyptian cotton and tailored suiting textiles. Every seam, drape, and proportion is stripped of ornament to leave pure silhouette.', 'تأسست ألفيرو على الانضباط اللوني الأحادي الصارم، لتصنع قطعاً معمارية بكميات محدودة من القطن المصري الثقيل وأقمشة التفصيل الراقية. كل تفصيلة وقصّة تجردت من الزخرفة لتبقى الصورة النقية.', '/images/editorial-brand.svg', 7),
  ('newsletter', 'PRIVATE ARCHIVE ACCESS', 'دخول الأرشيف الخاص', 'Receive early previews of seasonal drops.', 'احصل على معاينات مبكرة للإصدارات الموسمية.', '', '', null, 8)
on conflict (section_key) do nothing;

insert into public.homepage_banners (placement, title_en, title_ar, subtitle_en, subtitle_ar, cta_label_en, cta_label_ar, cta_url, desktop_image_url, mobile_image_url, sort_order) values
  ('HERO', 'MONOCHROME ARCHITECTURE', 'العمارة الأحادية', 'Tailored essentials crafted in pure black and stark white.', 'أساسيات مفصّلة بدقة باللونين الأسود النقي والأبيض الصافي.', 'Explore Collection', 'استكشف المجموعة', '/shop', '/images/editorial-hero.svg', '/images/editorial-hero-mobile.svg', 1),
  ('CAMPAIGN', 'HEAVYWEIGHT JERSEY CAPSULE', 'كبسولة الجيرسيه الثقيل', '340 GSM combed cotton tees and structured outerwear.', 'تيشيرتات قطن مصري 340 جم ومعاطف بتفصيل حاد.', 'Shop the Capsule', 'تسوق الكبسولة', '/shop?sort=newest', '/images/editorial-campaign.svg', '/images/editorial-campaign.svg', 2)
on conflict do nothing;

insert into public.content_pages (slug, title_en, title_ar, body_en, body_ar) values
  ('about', 'About ALVERO', 'عن ألفيرو',
   'ALVERO is a contemporary luxury fashion house committed to strict monochrome minimalism. Every garment is designed with architectural precision, utilizing heavyweight Egyptian textiles and refined tailoring techniques.\n\nWe produce in deliberate quantities to uphold uncompromised stitch density, drape, and longevity.',
   'ألفيرو هي دار أزياء فاخرة معاصرة تلتزم بالبساطة الأحادية الصارمة. تُصمّم كل قطعة بدقة معمارية باستخدام أجود الأقمشة المصرية الثقيلة وتقنيات التفصيل الراقية.\n\nننتج بكميات مدروسة لضمان أعلى معايير الجودة والانسيابية والاستدامة.'),
  ('contact', 'Contact ALVERO', 'تواصل مع ألفيرو',
   'Our client concierge team is available Saturday through Thursday, 10:00 AM – 8:00 PM Cairo time.\n\nFor order inquiries, sizing consultations, or private appointments, reach us via WhatsApp or email.',
   'فريق خدمة العملاء متاح من السبت إلى الخميس، من 10 صباحاً حتى 8 مساءً بتوقيت القاهرة.\n\nللاستفسارات حول الطلبات أو المقاسات، تواصل معنا عبر واتساب أو البريد الإلكتروني.'),
  ('shipping', 'Shipping Policy', 'سياسة الشحن',
   'ALVERO delivers across all Egyptian governorates exclusively with Cash on Delivery (COD).\n\nCairo & Giza: 1–2 business days.\nAlexandria & Delta: 2–4 business days.\nUpper Egypt & Red Sea: 3–6 business days.\n\nComplimentary shipping applies automatically when your order meets the active free-shipping threshold.',
   'توصّل ألفيرو إلى جميع محافظات مصر مع الدفع عند الاستلام حصراً.\n\nالقاهرة والجيزة: 1-2 يوم عمل.\nالإسكندرية والدلتا: 2-4 أيام عمل.\nالصعيد والبحر الأحمر: 3-6 أيام عمل.\n\nيُطبق الشحن المجاني تلقائياً عند تجاوز الحد الأدنى للطلب.'),
  ('returns', 'Returns & Exchanges', 'سياسة الاسترجاع والاستبدال',
   'We offer a 14-day return and size-exchange window from the date of delivery.\n\nGarments must remain unworn, unwashed, with all original ALVERO tags and packaging intact.\n\nTo initiate a return or exchange, contact our client concierge with your order number and phone number.',
   'نقدم إمكانية الاسترجاع واستبدال المقاس خلال 14 يوماً من تاريخ الاستلام.\n\nيجب أن تكون القطع غير ملبوسة وغير مغسولة مع بقاء جميع البطاقات والتغليف الأصلي.\n\nلبدء طلب استرجاع، تواصل معنا برقم الطلب ورقم الهاتف.'),
  ('privacy', 'Privacy Policy', 'سياسة الخصوصية',
   'ALVERO respects your privacy. Customer phone numbers and delivery addresses are collected solely to fulfill Cash on Delivery shipments and verify order tracking requests.\n\nWe never sell or share customer data with third parties outside our authorized courier partners.',
   'تحترم ألفيرو خصوصيتك. تُجمع أرقام الهواتف وعناوين التوصيل حصرياً لتنفيذ طلبات الدفع عند الاستلام والتحقق من تتبع الطلبات.\n\nلا نشارك بيانات العملاء مع أي جهات خارجية باستثناء شركاء التوصيل المعتمدين.'),
  ('terms', 'Terms & Conditions', 'الشروط والأحكام',
   'All orders placed on ALVERO are fulfilled on a Cash on Delivery (COD) basis in Egyptian Pounds (EGP). Order prices are locked at checkout.\n\nALVERO reserves the right to cancel orders in the event of unverifiable contact details or stock discrepancies.',
   'تُنفذ جميع الطلبات على ألفيرو بنظام الدفع عند الاستلام بالجنيه المصري. يتم تثبيت الأسعار عند إتمام الطلب.\n\nتحتفظ ألفيرو بحق إلغاء الطلب في حال تعذر التحقق من بيانات الاتصال.')
on conflict (slug) do nothing;

-- 4. Sample Categories
insert into public.categories (slug, name_en, name_ar, description_en, description_ar, image_url, sort_order, is_active, is_featured) values
  ('outerwear', 'Outerwear', 'المعاطف والجاكيتات', 'Structured coats, blazers, and technical jackets.', 'معاطف وبليزرات مصممة بقصات معمارية.', '/images/cat-outerwear.svg', 1, true, true),
  ('tops-tees', 'Tops & Tees', 'التيشيرتات والقمصان', '340 GSM heavyweight jersey and poplin shirts.', 'تيشيرتات قطن ثقيل وقمصان بوبلين.', '/images/cat-tops.svg', 2, true, true),
  ('trousers', 'Trousers', 'البناطيل', 'Tailored wide-leg and pleated wool trousers.', 'بناطيل واسعة ومفصّلة بدقة.', '/images/cat-trousers.svg', 3, true, true),
  ('knitwear', 'Knitwear', 'التريكو', 'Fine gauge merino and cotton knit layers.', 'قطع تريكو ناعمة من القطن والصوف.', '/images/cat-knitwear.svg', 4, true, true)
on conflict (slug) do nothing;

-- 5. Sample Products & Variants (for optional demo / QA verification)
with cat_tops as (select id from public.categories where slug = 'tops-tees' limit 1),
     cat_outer as (select id from public.categories where slug = 'outerwear' limit 1),
     cat_trousers as (select id from public.categories where slug = 'trousers' limit 1),
     cat_knit as (select id from public.categories where slug = 'knitwear' limit 1)
insert into public.products (
  category_id, slug, sku, brand, name_en, name_ar, description_en, description_ar, details_en, details_ar,
  regular_price, sale_price, main_image_url, hover_image_url, status, is_featured, is_new_arrival, is_best_seller, sales_count, popularity_score
) values
  ((select id from cat_tops), 'alvero-oversized-heavyweight-tee', 'ALV-TEE-001', 'ALVERO',
   'ALVERO Oversized Heavyweight Tee', 'تيشيرت ألفيرو أوفرسايز ثقيل',
   'Architectural boxy silhouette cut from 340 GSM combed Egyptian cotton. Features a dense ribbed collar and dropped shoulder seam.',
   'قصّة واسعة معمارية من القطن المصري الممشط بوزن 340 جم للمتر المربع، مع ياقة مضلعة متينة وأكتاف منسدلة.',
   '100% Egyptian Cotton (340 GSM) • Relaxed Boxy Fit • Machine wash cold inside out',
   '100% قطن مصري (340 جم) • قصّة واسعة مريحة • غسيل بارد مقلوب',
   1450, 1190, '/images/prod-tee-black.svg', '/images/prod-tee-white.svg', 'ACTIVE', true, true, true, 128, 340),

  ((select id from cat_outer), 'alvero-monolith-wool-blazer', 'ALV-BLZ-002', 'ALVERO',
   'Monolith Double-Breasted Blazer', 'بليزر مونوليث مزدوج الصدر',
   'Sharp tailored blazer featuring structured shoulders, concealed horn buttons, and full monochrome satin lining.',
   'بليزر مفصّل بدقة مع أكتاف محددة وأزرار مخفية وبطانة ساتان أحادية اللون.',
   '78% Virgin Wool, 22% Viscose • Structured Fit • Dry clean only',
   '78% صوف بكر، 22% فيسكوز • قصّة محددة • تنظيف جاف فقط',
   5800, null, '/images/prod-blazer-black.svg', '/images/prod-blazer-alt.svg', 'ACTIVE', true, true, false, 42, 210),

  ((select id from cat_trousers), 'alvero-pleated-wide-trouser', 'ALV-TRS-003', 'ALVERO',
   'Pleated Architectural Wide Trouser', 'بنطال واسع بكسرات معمارية',
   'High-waisted double-pleated trouser engineered for fluid drape and clean vertical break.',
   'بنطال بخصر عالٍ وكسرات مزدوجة يمنح انسيابية أنيقة وخطاً عمودياً صافياً.',
   '65% Cotton Twill, 35% Technical Poly • Wide Leg • Concealed hook closure',
   '65% قطن تويل، 35% ألياف تقنية • أرجل واسعة • إغلاق مخفي',
   2950, 2490, '/images/prod-trouser-black.svg', '/images/prod-trouser-alt.svg', 'ACTIVE', true, false, true, 95, 290),

  ((select id from cat_knit), 'alvero-ribbed-mock-neck-knit', 'ALV-KNT-004', 'ALVERO',
   'Ribbed Mock-Neck Fine Knit', 'بلوفر برقبة عالية مضلعة',
   'Fine-gauge monochrome knitwear offering crisp structure without bulk. Designed to layer cleanly under tailoring.',
   'تريكو دقيق الحياكة يمنح مظهراً حاداً وخفيفاً، مصمم للارتداء تحت البليزر والمعاطف.',
   '100% Mercerized Cotton • Tailored Fit • Lay flat to dry',
   '100% قطن مرسيري • قصّة مضبوطة • تجفيف مسطح',
   2400, null, '/images/prod-knit-white.svg', '/images/prod-knit-black.svg', 'ACTIVE', false, true, true, 67, 195)
on conflict (slug) do nothing;

-- Seed sample variants
with p1 as (select id from public.products where slug = 'alvero-oversized-heavyweight-tee' limit 1),
     p2 as (select id from public.products where slug = 'alvero-monolith-wool-blazer' limit 1),
     p3 as (select id from public.products where slug = 'alvero-pleated-wide-trouser' limit 1),
     p4 as (select id from public.products where slug = 'alvero-ribbed-mock-neck-knit' limit 1)
insert into public.product_variants (product_id, size, color_name_en, color_name_ar, color_hex, sku, stock_quantity, is_available)
select prod_id, sz, col_en, col_ar, hex, sku, qty, true from (
  select (select id from p1) as prod_id, 'S' as sz, 'Black' as col_en, 'أسود' as col_ar, '#000000' as hex, 'ALV-TEE-001-BLK-S' as sku, 18 as qty
  union all select (select id from p1), 'M', 'Black', 'أسود', '#000000', 'ALV-TEE-001-BLK-M', 24
  union all select (select id from p1), 'L', 'Black', 'أسود', '#000000', 'ALV-TEE-001-BLK-L', 15
  union all select (select id from p1), 'S', 'White', 'أبيض', '#FFFFFF', 'ALV-TEE-001-WHT-S', 12
  union all select (select id from p1), 'M', 'White', 'أبيض', '#FFFFFF', 'ALV-TEE-001-WHT-M', 20
  union all select (select id from p1), 'L', 'White', 'أبيض', '#FFFFFF', 'ALV-TEE-001-WHT-L', 4
  union all select (select id from p2), 'M', 'Black', 'أسود', '#000000', 'ALV-BLZ-002-BLK-M', 8
  union all select (select id from p2), 'L', 'Black', 'أسود', '#000000', 'ALV-BLZ-002-BLK-L', 6
  union all select (select id from p3), 'S', 'Black', 'أسود', '#000000', 'ALV-TRS-003-BLK-S', 10
  union all select (select id from p3), 'M', 'Black', 'أسود', '#000000', 'ALV-TRS-003-BLK-M', 14
  union all select (select id from p3), 'L', 'Charcoal', 'فحمي', '#2B2B2B', 'ALV-TRS-003-CHR-L', 9
  union all select (select id from p4), 'M', 'White', 'أبيض', '#FFFFFF', 'ALV-KNT-004-WHT-M', 11
  union all select (select id from p4), 'L', 'Black', 'أسود', '#000000', 'ALV-KNT-004-BLK-L', 7
) v
where prod_id is not null
on conflict (sku) do nothing;

-- Sample Discount
insert into public.discounts (
  code, is_automatic, name_en, name_ar, description_en, description_ar,
  discount_type, discount_value, scope, min_order_amount, starts_at, expires_at, usage_limit, per_customer_limit, is_active
) values (
  'ALVERO20', false, 'ALVERO 20% Seasonal Privilege', 'خصم ألفيرو 20% الموسمي',
  '20% off orders above 1,500 EGP', 'خصم 20% على الطلبات فوق 1,500 ج.م',
  'PERCENTAGE', 20, 'STORE_WIDE', 1500, now() - interval '1 day', now() + interval '180 days', 500, 2, true
) on conflict (code) do nothing;
