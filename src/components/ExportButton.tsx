"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { useI18n } from "@/i18n/context";
import { exportRowsToCsv } from "@/lib/csv";

interface ExportButtonProps {
  filename: string;
  getExport: () => { headers: string[]; rows: string[][] };
  disabled?: boolean;
}

export default function ExportButton({ filename, getExport, disabled }: ExportButtonProps) {
  const { t, locale } = useI18n();
  const [exporting, setExporting] = useState(false);

  const handleExport = () => {
    try {
      setExporting(true);
      const { headers, rows } = getExport();
      const dateTag = new Date().toISOString().slice(0, 10);
      exportRowsToCsv(`${filename}-${dateTag}`, headers, rows);
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={disabled || exporting}
      title={locale === "ar" ? "تصدير النتائج الحالية إلى CSV (يفتح في Excel)" : "Export current results to CSV"}
      className="border border-green-600 text-green-700 hover:bg-green-50 disabled:opacity-50 px-3 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-2"
    >
      <Download size={15} />
      {t("common.export")}
    </button>
  );
}
