"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/context";
import PrinterLoader from "@/components/PrinterLoader";
import { apiErrorMessage } from "@/lib/api-client";
import { useToast, useConfirm } from "@/components/UIProvider";
import { Pencil, Plus, Save, Trash2, X } from "lucide-react";

interface CompanyData {
  id: string;
  name: string;
  nameAr: string | null;
  taxNumber?: string | null;
  tradeRegister?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
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

const emptyForm = {
  name: "",
  nameAr: "",
  taxNumber: "",
  tradeRegister: "",
  address: "",
  phone: "",
  email: "",
};

export default function CompaniesPage() {
  const { t, dir } = useI18n();
  const [companies, setCompanies] = useState<CompanyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { success: toastSuccess, error: toastError } = useToast();
  const confirmAction = useConfirm();

  const fetchCompanies = () => {
    fetch("/api/companies")
      .then((r) => r.json())
      .then((data) => {
        setCompanies(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const totalSales = companies.reduce((s, c) => s + c.totalSales, 0);
  const totalPurchases = companies.reduce((s, c) => s + c.totalPurchases, 0);
  const totalSettlements = companies.reduce((s, c) => s + c.totalSettlements, 0);
  const totalNetProfit = companies.reduce((s, c) => s + c.netProfit, 0);

  const selected = companies.find((c) => c.id === selectedId);

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setError("");
    setShowForm(!showForm);
  };

  const openEdit = (company: CompanyData) => {
    setForm({
      name: company.name,
      nameAr: company.nameAr || "",
      taxNumber: company.taxNumber || "",
      tradeRegister: company.tradeRegister || "",
      address: company.address || "",
      phone: company.phone || "",
      email: company.email || "",
    });
    setEditingId(company.id);
    setError("");
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch(editingId ? `/api/companies/${editingId}` : "/api/companies", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(apiErrorMessage(data, t));
        return;
      }
      setShowForm(false);
      setForm(emptyForm);
      setEditingId(null);
      fetchCompanies();
      toastSuccess(t("common.savedSuccessfully"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmAction({ message: t("companies.deleteConfirm") }))) return;
    const res = await fetch(`/api/companies/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      toastError(apiErrorMessage(data, t));
      return;
    }
    setSelectedId(null);
    fetchCompanies();
    toastSuccess(t("common.deletedSuccessfully"));
  };

  if (loading) {
    return (
      <div dir={dir} className="flex min-h-[50vh] items-center justify-center px-4">
        <PrinterLoader size="md" label={t("common.loading")} />
      </div>
    );
  }

  return (
    <div dir={dir}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">{t("companies.title")}</h1>
          <p className="text-gray-500 mt-1">{t("companies.overview")}</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"
        >
          {showForm && !editingId ? (<><X size={16} />{t("common.cancel")}</>) : (<><Plus size={16} />{t("companies.addCompany")}</>)}
        </button>
      </div>

      {(error) && (
        <div
          className={`mb-4 flex items-center justify-between rounded-xl border px-4 py-3 text-sm ${
            error ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-800"
          }`}
          role="status"
        >
          <span>{error}</span>
          <button onClick={() => { setError(""); }} aria-label={t("common.close")} className="text-inherit">✕</button>
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingId ? t("companies.editCompany") : t("companies.addCompany")}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(
              [
                ["name", t("companies.legalName")],
                ["nameAr", t("companies.tradeName")],
                ["taxNumber", t("companies.taxNumber")],
                ["tradeRegister", t("companies.tradeRegister")],
                ["phone", t("common.phone")],
                ["email", t("customers.email")],
              ] as const
            ).map(([field, label]) => (
              <div key={field}>
                <label className="mb-1 block text-sm font-medium">{label}</label>
                <input
                  type={field === "email" ? "email" : "text"}
                  value={form[field]}
                  onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                  required={field === "name"}
                />
              </div>
            ))}
            <div className="md:col-span-2 lg:col-span-3">
              <label className="mb-1 block text-sm font-medium">{t("customers.address")}</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full rounded-lg border px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="md:col-span-2 lg:col-span-3 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {<Save size={16} />}{<Save size={16} />}{saving ? t("common.saving") : t("common.save")}
              </button>
            </div>
          </form>
        </div>
      )}

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

      <div className="mb-5"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`${t("common.search")} ${t("common.company")}...`} className="w-full rounded-lg border px-4 py-2 md:max-w-md" /></div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {companies.filter(company => [company.name, company.nameAr].filter(Boolean).join(" ").toLowerCase().includes(search.toLowerCase())).map((company) => (
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
            <div className="flex items-center gap-3">
              <button onClick={() => openEdit(selected)} className="text-blue-600 hover:text-blue-800 text-sm">
                <Pencil size={14} className="inline-block me-1" />{t("common.edit")}
              </button>
              <button onClick={() => handleDelete(selected.id)} className="text-red-600 hover:text-red-800 text-sm">
                <Trash2 size={14} className="inline-block me-1" />{t("common.delete")}
              </button>
              <button onClick={() => setSelectedId(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
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
