"use client";

import { RefreshCw } from "lucide-react";
import { useI18n } from "@/i18n/context";

interface RefreshButtonProps {
  onRefresh: () => void | Promise<void>;
  refreshing?: boolean;
  className?: string;
}

export default function RefreshButton({ onRefresh, refreshing, className }: RefreshButtonProps) {
  const { t, locale } = useI18n();

  return (
    <button
      type="button"
      onClick={() => {
        void onRefresh();
      }}
      disabled={refreshing}
      title={locale === "ar" ? "تحديث البيانات الحالية" : "Refresh current data"}
      className={`inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-50 ${className ?? ""}`}
    >
      <RefreshCw size={15} className={refreshing ? "animate-spin" : undefined} />
      {t("common.refresh")}
    </button>
  );
}