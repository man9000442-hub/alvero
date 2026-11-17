/**
 * ALVERO — One-Time Initial OWNER Bootstrap Script
 *
 * Usage:
 *   1. Ensure .env.local has NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *      BOOTSTRAP_OWNER_EMAIL, BOOTSTRAP_OWNER_PASSWORD, and BOOTSTRAP_OWNER_NAME.
 *   2. Run: npm run bootstrap-owner
 *
 * Security: Never expose SUPABASE_SERVICE_ROLE_KEY or run this in the browser.
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
  const email = process.env.BOOTSTRAP_OWNER_EMAIL;
  const password = process.env.BOOTSTRAP_OWNER_PASSWORD;
  const fullName = process.env.BOOTSTRAP_OWNER_NAME || "ALVERO Owner";

  if (!url || !serviceKey || !email || !password) {
    console.error(
      "Missing required env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, BOOTSTRAP_OWNER_EMAIL, BOOTSTRAP_OWNER_PASSWORD",
    );
    process.exit(1);
  }

  if (password.length < 10) {
    console.error("BOOTSTRAP_OWNER_PASSWORD must be at least 10 characters.");
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Ensure no existing OWNER is accidentally overwritten without intent
  const { data: existingOwners } = await supabase
    .from("profiles")
    .select("id, email")
    .eq("role", "OWNER");

  if (existingOwners && existingOwners.length > 0) {
    console.log(
      `An OWNER account already exists (${existingOwners[0].email}). Aborting duplicate bootstrap.`,
    );
    process.exit(0);
  }

  const { data: authData, error: authErr } =
    await supabase.auth.admin.createUser({
      email: email.toLowerCase(),
      password,
      email_confirm: true,
    });

  if (authErr || !authData.user) {
    console.error("Failed to create auth user:", authErr?.message);
    process.exit(1);
  }

  const { error: profErr } = await supabase.from("profiles").insert({
    id: authData.user.id,
    email: email.toLowerCase(),
    full_name: fullName,
    role: "OWNER",
    is_active: true,
    preferred_locale: "en",
  });

  if (profErr) {
    await supabase.auth.admin.deleteUser(authData.user.id);
    console.error("Failed to insert OWNER profile:", profErr.message);
    process.exit(1);
  }

  await supabase.from("audit_logs").insert({
    actor_id: authData.user.id,
    actor_email: email.toLowerCase(),
    actor_role: "OWNER",
    action: "OWNER_BOOTSTRAPPED",
    entity_type: "profile",
    entity_id: authData.user.id,
  });

  console.log(`ALVERO OWNER account created successfully for ${email}.`);
  console.log("You may now sign in at /admin/login and remove BOOTSTRAP_OWNER_* from .env.local.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
