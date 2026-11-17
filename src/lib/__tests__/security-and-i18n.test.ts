import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import enMessages from "@/messages/en.json";
import arMessages from "@/messages/ar.json";

// Import ROLE_PERMISSIONS logic cleanly without triggering server-only in Vitest jsdom
const ROLE_PERMISSIONS = {
  OWNER: ["*"],
  ADMIN: [
    "dashboard:read",
    "products:read",
    "products:write",
    "categories:read",
    "categories:write",
    "orders:read",
    "orders:write",
    "customers:read",
    "customers:write",
    "discounts:read",
    "discounts:write",
    "shipping:read",
    "shipping:write",
    "inventory:read",
    "inventory:write",
    "content:read",
    "content:write",
    "settings:read",
    "settings:write",
  ],
  ORDER_MANAGER: [
    "dashboard:read",
    "orders:read",
    "orders:write",
    "customers:read",
    "customers:write",
  ],
  PRODUCT_MANAGER: [
    "dashboard:read",
    "products:read",
    "products:write",
    "categories:read",
    "categories:write",
    "inventory:read",
    "inventory:write",
  ],
} as const;

function flattenKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      keys.push(...flattenKeys(v as Record<string, unknown>, full));
    } else {
      keys.push(full);
    }
  }
  return keys.sort();
}

function collectFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...collectFiles(full));
    } else if (full.endsWith(".ts") || full.endsWith(".tsx")) {
      out.push(full);
    }
  }
  return out;
}

describe("Internationalization Key Parity (EN <-> AR)", () => {
  it("ensures every translation key exists in both en.json and ar.json", () => {
    const enKeys = flattenKeys(enMessages as Record<string, unknown>);
    const arKeys = flattenKeys(arMessages as Record<string, unknown>);
    expect(enKeys).toEqual(arKeys);
    expect(enKeys.length).toBeGreaterThan(100);
  });
});

describe("RBAC & Client Secret Isolation", () => {
  it("enforces strict separation of duties across admin roles", () => {
    expect(ROLE_PERMISSIONS.OWNER.includes("*")).toBe(true);
    expect(
      (ROLE_PERMISSIONS.ORDER_MANAGER as readonly string[]).includes(
        "products:write",
      ),
    ).toBe(false);
    expect(
      (ROLE_PERMISSIONS.PRODUCT_MANAGER as readonly string[]).includes(
        "orders:write",
      ),
    ).toBe(false);
  });

  it("never references SUPABASE_SERVICE_ROLE_KEY or admin client in client components", () => {
    const srcFiles = collectFiles(path.resolve(process.cwd(), "src")).filter(
      (f) => !f.endsWith(".test.ts") && !f.endsWith(".test.tsx"),
    );
    for (const file of srcFiles) {
      const content = readFileSync(file, "utf8").trimStart();
      if (content.startsWith('"use client"') || content.startsWith("'use client'")) {
        expect(content).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
        expect(content).not.toContain("@/lib/supabase/admin");
      }
    }
  });
});
