"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/context";

interface CompanyData {
  id: string;
  name: string;
  nameAr: string | null;
  totalSales: number;
  totalPurchases: number;
  totalSettlements: number;
  netProfit: number;
  counts: {
    salesOrders: number;
    purchaseOrders: number;
  };
}

const COMPANY_ICONS: Record<string, string> = {
  "شركة جملة آلات": "🖨️",
  "شركة جملة قطع غيار": "🔧",
  "شركة القطاعي": "⚡",
};

export default function CompaniesPage() {
  const { t } = useI18n();
  const [companies, setCompanies] = useState<CompanyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/companies")
      .then((r) => r.json())
      .then((data) => {
        setCompanies(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const totalSales = companies.reduce((s, c) => s + c.totalSales, 0);
  const totalPurchases = companies.reduce((s, c) => s + c.totalPurchases, 0);
  const totalSettlements = companies.reduce((s, c) => s + c.totalSettlements, 0);
  const totalNetProfit = companies.reduce((s, c) => s + c.netProfit, 0);

  const selected = companies.find((c) => c.id === selectedId);

  if (loading) {
    return <div dir="rtl" className="text-gray-500 text-center py-10">{t("common.loading")}</div>;
  }

  return (
    <div dir="rtl">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">{t("companies.title")}</h1>
        <p className="text-gray-500 mt-1">{t("companies.overview")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-md p-5 border-r-4 border-blue-500">
          <p className="text-sm text-gray-500">{t("companies.allCompanies")}</p>
          <p className="text-3xl font-bold mt-1">{companies.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-5 border-r-4 border-green-500">
          <p className="text-sm text-gray-500">{t("companies.totalRevenue")}</p>
          <p className="text-3xl font-bold mt-1 text-green-600">{totalSales.toLocaleString("ar-EG")} ج.م</p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-5 border-r-4 border-red-500">
          <p className="text-sm text-gray-500">{t("companies.totalExpenses")}</p>
          <p className="text-3xl font-bold mt-1 text-red-600">{totalPurchases.toLocaleString("ar-EG")} ج.م</p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-5 border-r-4 border-purple-500">
          <p className="text-sm text-gray-500">{t("companies.netProfit")}</p>
          <p className={`text-3xl font-bold mt-1 ${totalNetProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
            {totalNetProfit.toLocaleString("ar-EG")} ج.م
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {companies.map((company) => (
          <div
            key={company.id}
            onClick={() => setSelectedId(selectedId === company.id ? null : company.id)}
            className={`bg-white rounded-xl shadow-md p-6 cursor-pointer transition-all hover:shadow-lg border-2 ${
              selectedId === company.id ? "border-blue-500" : "border-transparent"
            }`}
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">{COMPANY_ICONS[company.name] || "🏢"}</span>
              <div>
                <h2 className="font-bold text-lg">{company.name}</h2>
                {company.nameAr && <p className="text-sm text-gray-400">{company.nameAr}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-green-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">{t("companies.totalRevenue")}</p>
                <p className="font-bold text-green-700">{company.totalSales.toLocaleString("ar-EG")}</p>
              </div>
              <div className="bg-red-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">{t("companies.totalExpenses")}</p>
                <p className="font-bold text-red-700">{company.totalPurchases.toLocaleString("ar-EG")}</p>
              </div>
              <div className={`rounded-lg p-3 ${company.netProfit >= 0 ? "bg-blue-50" : "bg-orange-50"}`}>
                <p className="text-xs text-gray-500">{t("companies.netProfit")}</p>
                <p className={`font-bold ${company.netProfit >= 0 ? "text-blue-700" : "text-orange-700"}`}>
                  {company.netProfit.toLocaleString("ar-EG")}
                </p>
              </div>
              <div className="bg-purple-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">التسويات</p>
                <p className="font-bold text-purple-700">{company.totalSettlements}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="bg-gray-50 rounded-lg py-2">
                <p className="font-bold text-lg">{company.counts.salesOrders}</p>
                <p className="text-gray-500">{t("navigation.sales")}</p>
              </div>
              <div className="bg-gray-50 rounded-lg py-2">
                <p className="font-bold text-lg">{company.counts.purchaseOrders}</p>
                <p className="text-gray-500">{t("navigation.purchases")}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">{selected.name} — تفاصيل</h2>
            <button onClick={() => setSelectedId(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border rounded-lg p-4">
              <h3 className="font-bold mb-2">المبيعات</h3>
              <p className="text-2xl font-bold text-green-600">{selected.totalSales.toLocaleString("ar-EG")} ج.م</p>
              <p className="text-sm text-gray-500">{selected.counts.salesOrders} فاتورة</p>
            </div>
            <div className="border rounded-lg p-4">
              <h3 className="font-bold mb-2">المشتريات</h3>
              <p className="text-2xl font-bold text-red-600">{selected.totalPurchases.toLocaleString("ar-EG")} ج.م</p>
              <p className="text-sm text-gray-500">{selected.counts.purchaseOrders} فاتورة</p>
            </div>
            <div className="border rounded-lg p-4">
              <h3 className="font-bold mb-2">صافي الربح</h3>
              <p className={`text-2xl font-bold ${selected.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                {selected.netProfit.toLocaleString("ar-EG")} ج.م
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
