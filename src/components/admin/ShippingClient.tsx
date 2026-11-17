"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { formatEGP } from "@/lib/pricing";
import type {
  DeliveryArea,
  Governorate,
  Locale,
  ShippingRule,
} from "@/types/database";

export function ShippingClient({
  governorates,
  areas,
  globalRule,
}: {
  governorates: Governorate[];
  areas: DeliveryArea[];
  globalRule: ShippingRule;
}) {
  const t = useTranslations("admin.nav");
  const tc = useTranslations("common");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const { showToast } = useToast();

  const [defaultFee, setDefaultFee] = useState(
    String(globalRule.default_shipping_fee),
  );
  const [freeThreshold, setFreeThreshold] = useState(
    globalRule.free_shipping_threshold !== null
      ? String(globalRule.free_shipping_threshold)
      : "",
  );
  const [freeEnabled, setFreeEnabled] = useState(
    globalRule.is_free_shipping_enabled,
  );
  const [savingRule, setSavingRule] = useState(false);

  const [govModal, setGovModal] = useState(false);
  const [govCode, setGovCode] = useState("");
  const [govNameEn, setGovNameEn] = useState("");
  const [govNameAr, setGovNameAr] = useState("");
  const [govFee, setGovFee] = useState("75");
  const [govDaysMin, setGovDaysMin] = useState("2");
  const [govDaysMax, setGovDaysMax] = useState("4");

  const [areaModal, setAreaModal] = useState(false);
  const [areaGovId, setAreaGovId] = useState(governorates[0]?.id ?? "");
  const [areaNameEn, setAreaNameEn] = useState("");
  const [areaNameAr, setAreaNameAr] = useState("");
  const [areaFee, setAreaFee] = useState("");

  const saveGlobalRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingRule(true);
    try {
      const res = await fetch("/api/admin/shipping", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "global_rule",
          default_shipping_fee: Number(defaultFee),
          free_shipping_threshold: freeThreshold
            ? Number(freeThreshold)
            : null,
          is_free_shipping_enabled: freeEnabled,
        }),
      });
      if (res.ok) {
        showToast("Shipping rules saved", "success");
        router.refresh();
      } else {
        showToast("Save failed", "error");
      }
    } finally {
      setSavingRule(false);
    }
  };

  const toggleGov = async (g: Governorate) => {
    await fetch("/api/admin/shipping", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "governorate",
        id: g.id,
        shipping_fee: g.shipping_fee,
        free_shipping_threshold: g.free_shipping_threshold,
        estimated_days_min: g.estimated_days_min,
        estimated_days_max: g.estimated_days_max,
        is_active: !g.is_active,
      }),
    });
    router.refresh();
  };

  const updateGovFee = async (g: Governorate, fee: number) => {
    await fetch("/api/admin/shipping", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "governorate",
        id: g.id,
        shipping_fee: fee,
        free_shipping_threshold: g.free_shipping_threshold,
        estimated_days_min: g.estimated_days_min,
        estimated_days_max: g.estimated_days_max,
        is_active: g.is_active,
      }),
    });
    showToast("Governorate updated", "success");
    router.refresh();
  };

  const createGov = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/shipping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "governorate",
        code: govCode,
        name_en: govNameEn,
        name_ar: govNameAr,
        shipping_fee: Number(govFee),
        estimated_days_min: Number(govDaysMin),
        estimated_days_max: Number(govDaysMax),
      }),
    });
    if (res.ok) {
      setGovModal(false);
      setGovCode("");
      setGovNameEn("");
      setGovNameAr("");
      showToast("Governorate added", "success");
      router.refresh();
    }
  };

  const createArea = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/shipping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "area",
        governorate_id: areaGovId,
        name_en: areaNameEn,
        name_ar: areaNameAr,
        shipping_fee_override: areaFee ? Number(areaFee) : null,
      }),
    });
    if (res.ok) {
      setAreaModal(false);
      setAreaNameEn("");
      setAreaNameAr("");
      setAreaFee("");
      showToast("Delivery area added", "success");
      router.refresh();
    }
  };

  const deleteArea = async (id: string) => {
    await fetch(`/api/admin/shipping?kind=area&id=${id}`, { method: "DELETE" });
    router.refresh();
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-[#E5E5E5]">
        <h1 className="font-serif text-3xl uppercase tracking-[0.12em]">
          {t("shipping")}
        </h1>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setGovModal(true)}
          >
            <Plus className="h-3.5 w-3.5" /> Add Governorate
          </Button>
          <Button variant="primary" size="sm" onClick={() => setAreaModal(true)}>
            <Plus className="h-3.5 w-3.5" /> Add City / Area
          </Button>
        </div>
      </div>

      {/* Global Shipping Rule */}
      <form
        onSubmit={saveGlobalRule}
        className="bg-white border border-[#E5E5E5] p-6 grid grid-cols-1 sm:grid-cols-4 gap-4 items-end"
      >
        <Input
          label="Default Fallback Fee (EGP)"
          type="number"
          min={0}
          value={defaultFee}
          onChange={(e) => setDefaultFee(e.target.value)}
        />
        <Input
          label="Global Free Shipping Threshold (EGP)"
          type="number"
          min={0}
          value={freeThreshold}
          onChange={(e) => setFreeThreshold(e.target.value)}
        />
        <label className="flex items-center gap-2 text-xs h-11 cursor-pointer">
          <input
            type="checkbox"
            checked={freeEnabled}
            onChange={(e) => setFreeEnabled(e.target.checked)}
            className="accent-black"
          />
          Enable Free Shipping Threshold
        </label>
        <Button type="submit" variant="primary" loading={savingRule}>
          {tc("save")}
        </Button>
      </form>

      {/* Governorates Table */}
      <div className="bg-white border border-[#E5E5E5] overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-[#FAFAFA] border-b border-[#E5E5E5] text-[10px] uppercase tracking-[0.14em] text-[#777777]">
            <tr>
              <th className="py-3 px-4 text-start">Governorate</th>
              <th className="py-3 px-4 text-start">Fee (EGP)</th>
              <th className="py-3 px-4 text-start">ETA (Days)</th>
              <th className="py-3 px-4 text-start">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0F0F0]">
            {governorates.map((g) => (
              <tr key={g.id}>
                <td className="py-3 px-4 font-medium">
                  {locale === "ar" ? g.name_ar : g.name_en} ({g.code})
                </td>
                <td className="py-3 px-4">
                  <input
                    type="number"
                    defaultValue={g.shipping_fee}
                    onBlur={(e) => {
                      const val = Number(e.target.value);
                      if (val !== g.shipping_fee) updateGovFee(g, val);
                    }}
                    className="w-24 h-8 px-2 border border-[#E5E5E5] bg-white tabular-nums"
                  />
                </td>
                <td className="py-3 px-4 tabular-nums">
                  {g.estimated_days_min}–{g.estimated_days_max}
                </td>
                <td className="py-3 px-4">
                  <button
                    type="button"
                    onClick={() => toggleGov(g)}
                    className="cursor-pointer"
                  >
                    <Badge variant={g.is_active ? "solid" : "subtle"}>
                      {g.is_active ? tc("active") : tc("inactive")}
                    </Badge>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Delivery Areas */}
      <div className="bg-white border border-[#E5E5E5] p-6 space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.16em]">
          Cities & Delivery Areas ({areas.length})
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          {areas.map((a) => {
            const gov = governorates.find((g) => g.id === a.governorate_id);
            return (
              <div
                key={a.id}
                className="border border-[#E5E5E5] p-3.5 flex items-center justify-between gap-2"
              >
                <div>
                  <p className="font-medium">
                    {locale === "ar" ? a.name_ar : a.name_en}
                  </p>
                  <p className="text-[11px] text-[#777777]">
                    {gov ? (locale === "ar" ? gov.name_ar : gov.name_en) : ""} ·{" "}
                    {a.shipping_fee_override !== null
                      ? formatEGP(a.shipping_fee_override, locale)
                      : "Gov default"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => deleteArea(a.id)}
                  className="p-1 text-[#777777] hover:text-black cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <Modal
        open={govModal}
        onClose={() => setGovModal(false)}
        title="Add Governorate"
      >
        <form onSubmit={createGov} className="space-y-4">
          <Input
            label="Code"
            required
            placeholder="DAM"
            value={govCode}
            onChange={(e) => setGovCode(e.target.value.toUpperCase())}
          />
          <Input
            label="Name (EN)"
            required
            value={govNameEn}
            onChange={(e) => setGovNameEn(e.target.value)}
          />
          <Input
            label="Name (AR)"
            required
            dir="rtl"
            value={govNameAr}
            onChange={(e) => setGovNameAr(e.target.value)}
          />
          <Input
            label="Shipping Fee (EGP)"
            type="number"
            required
            value={govFee}
            onChange={(e) => setGovFee(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Min Days"
              type="number"
              value={govDaysMin}
              onChange={(e) => setGovDaysMin(e.target.value)}
            />
            <Input
              label="Max Days"
              type="number"
              value={govDaysMax}
              onChange={(e) => setGovDaysMax(e.target.value)}
            />
          </div>
          <Button type="submit" variant="primary" fullWidth>
            Save Governorate
          </Button>
        </form>
      </Modal>

      <Modal
        open={areaModal}
        onClose={() => setAreaModal(false)}
        title="Add Delivery Area"
      >
        <form onSubmit={createArea} className="space-y-4">
          <Select
            label="Governorate"
            value={areaGovId}
            onChange={(e) => setAreaGovId(e.target.value)}
          >
            {governorates.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name_en}
              </option>
            ))}
          </Select>
          <Input
            label="Area Name (EN)"
            required
            value={areaNameEn}
            onChange={(e) => setAreaNameEn(e.target.value)}
          />
          <Input
            label="Area Name (AR)"
            required
            dir="rtl"
            value={areaNameAr}
            onChange={(e) => setAreaNameAr(e.target.value)}
          />
          <Input
            label="Fee Override (Optional, EGP)"
            type="number"
            value={areaFee}
            onChange={(e) => setAreaFee(e.target.value)}
          />
          <Button type="submit" variant="primary" fullWidth>
            Save Area
          </Button>
        </form>
      </Modal>
    </div>
  );
}
