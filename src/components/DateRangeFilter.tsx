"use client";

import { useI18n } from "@/i18n/context";

interface DateRangeFilterProps {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
}

function matchesRange(valueIso: string | undefined | null, from: string, to: string): boolean {
  if (!from && !to) return true;
  if (!valueIso) return false;
  const dateStr = new Date(valueIso).toISOString().slice(0, 10);
  if (from && dateStr < from) return false;
  if (to && dateStr > to) return false;
  return true;
}

export function inDateRange(valueIso: string | undefined | null, from: string, to: string): boolean {
  return matchesRange(valueIso, from, to);
}

export default function DateRangeFilter({ from, to, onFromChange, onToChange }: DateRangeFilterProps) {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-1">
      <input
        type="date"
        value={from}
        max={to || undefined}
        onChange={(e) => onFromChange(e.target.value)}
        title={t("common.from")}
        className="border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <span className="text-gray-400 text-sm">—</span>
      <input
        type="date"
        value={to}
        min={from || undefined}
        onChange={(e) => onToChange(e.target.value)}
        title={t("common.to")}
        className="border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}
