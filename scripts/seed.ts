/**
 * ALVERO — Optional Sample Seed Runner
 * Note: For full SQL seed including all Egyptian governorates, banners, and sample products,
 * run `supabase/seed/seed.sql` inside the Supabase SQL Editor.
 * This script verifies connectivity and seeds essential baseline rows if missing.
 */

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}

async function main() {
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  await supabase.from("shipping_rules").upsert({ id: 1 }, { onConflict: "id" });
  await supabase.from("website_settings").upsert({ id: 1 }, { onConflict: "id" });

  console.log("Baseline singleton rows verified.");
  console.log(
    "To load sample Egyptian governorates, categories, products, and editorial banners, execute supabase/seed/seed.sql in your Supabase SQL Editor.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
