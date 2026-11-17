"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Lock } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function AdminLoginPage() {
  const t = useTranslations("admin.login");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 429) {
          setErrorMsg(t("rateLimited"));
        } else if (data.error === "ACCOUNT_INACTIVE") {
          setErrorMsg(t("inactiveAccount"));
        } else {
          setErrorMsg(t("invalidCredentials"));
        }
        return;
      }

      router.push("/admin");
      router.refresh();
    } catch {
      setErrorMsg(t("invalidCredentials"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] px-4">
      <div className="w-full max-w-md bg-white border border-black p-8 sm:p-10 space-y-8">
        <div className="text-center space-y-2 pb-6 border-b border-[#E5E5E5]">
          <p className="font-serif text-3xl tracking-[0.28em]">ALVERO</p>
          <h1 className="text-xs font-semibold uppercase tracking-[0.18em] text-black">
            {t("title")}
          </h1>
          <p className="text-xs text-[#777777]">{t("subtitle")}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label={t("email")}
            type="email"
            required
            dir="ltr"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label={t("password")}
            type="password"
            required
            dir="ltr"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {errorMsg && (
            <p className="text-xs font-medium text-black border-s-2 border-black ps-3 py-1">
              {errorMsg}
            </p>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
          >
            <Lock className="h-3.5 w-3.5" />
            {loading ? t("signingIn") : t("submit")}
          </Button>
        </form>
      </div>
    </div>
  );
}
