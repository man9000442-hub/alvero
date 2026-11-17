"use client";

import React, { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import type { Locale } from "@/types/database";

export function NewsletterBlock({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  const t = useTranslations("home");
  const locale = useLocale() as Locale;
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, locale }),
      });
      if (res.ok) {
        setEmail("");
        showToast(t("newsletterSuccess"), "success");
      } else {
        showToast("Please enter a valid email address", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-16">
      <div className="border border-[#E5E5E5] bg-white px-6 py-14 text-center max-w-3xl mx-auto">
        <h2 className="font-serif text-2xl sm:text-3xl uppercase tracking-[0.14em] text-black">
          {title}
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-[#777777]">{subtitle}</p>
        <form
          onSubmit={handleSubmit}
          className="mt-8 flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
        >
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("newsletterPlaceholder")}
            className="flex-1 h-11 px-4 border border-[#E5E5E5] focus:border-black focus:outline-none text-xs bg-white"
          />
          <Button type="submit" loading={loading} size="md">
            {t("newsletterSubmit")}
          </Button>
        </form>
      </div>
    </section>
  );
}
