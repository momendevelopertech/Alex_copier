"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/context";
import Pagination from "@/components/Pagination";
import SearchInput, { matchesQuery } from "@/components/SearchInput";
import FilterSelect from "@/components/FilterSelect";
import DateRangeFilter, { inDateRange } from "@/components/DateRangeFilter";
import { Plus, Save, X } from "lucide-react";
import ExportButton from "@/components/ExportButton";
import PrinterLoader from "@/components/PrinterLoader";
import { AddFormBoundary, useAutoAddForm } from "@/hooks/useAutoAddForm";
import FormModal from "@/components/FormModal";
import SubmitButton from "@/components/SubmitButton";
import { DateTimeCell } from "@/components/DateTimeCell";

interface Company { id: string; name: string; }
interface Expense {
  id: string; companyId: string; category: string; description: string; amount: number;
  paidBy: string; date: string; createdAt: string; company: Company;
}

export default function FinancePage() {
  const { t, dir } = useI18n();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({ companyId: "", category: "", description: "", amount: "" });
  const PAGE_SIZE = 15;

  const fetchData = async () => {
    try {
      const [eRes, cRes] = await Promise.all([fetch("/api/expenses"), fetch("/api/companies")]);
      setExpenses(await eRes.json()); setCompanies(await cRes.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const autoAddOpen = useAutoAddForm();
  useEffect(() => {
    if (autoAddOpen) setShowForm(true);
  }, [autoAddOpen]);

  const filtered = expenses.filter(expense =>
    (!companyFilter || expense.companyId === companyFilter) &&
    (!categoryFilter || expense.category === categoryFilter) &&
    inDateRange(expense.date || expense.createdAt, dateFrom, dateTo) &&
    (matchesQuery(expense.category, search) ||
      matchesQuery(expense.description, search) ||
      matchesQuery(expense.company?.name, search))
  );
  const categories = Array.from(new Set(expenses.map((e) => e.category).filter(Boolean)));
  const hasActiveFilters = companyFilter !== "" || categoryFilter !== "" || dateFrom !== "" || dateTo !== "" || search !== "";
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const exportExpenses = () => ({
    headers: [
      t("common.date"),
      t("common.company"),
      t("finance.category"),
      t("common.description"),
      t("common.amount"),
      t("finance.paidBy"),
    ],
    rows: filtered.map((expense) => [
      new Date(expense.date || expense.createdAt).toISOString().slice(0, 10),
      expense.company?.name || "",
      expense.category,
      expense.description,
      String(expense.amount),
      expense.paidBy,
    ]),
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/expenses", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, amount: parseFloat(form.amount) || 0, paidBy: "" }),
    });
    setSaving(false);
    setForm({ companyId: "", category: "", description: "", amount: "" });
    setShowForm(false); fetchData();
  };

  return (
    <div dir={dir} className="space-y-5">
      <AddFormBoundary />
      <div className="space-y-5">
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium tracking-[0.2em] text-sky-600 uppercase">ERP</p>
            <h1 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl lg:text-3xl">{t("finance.expenses")}</h1>
          </div>
          <button onClick={() => setShowForm(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"><Plus size={16} />{t("finance.newExpense")}</button>
        </div>

        <FormModal open={showForm} onClose={() => setShowForm(false)} title={t("finance.newExpense")}>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5"><label className="block text-sm font-medium text-slate-700">{t("finance.selectCompany")}</label><select value={form.companyId} onChange={(e) => setForm({ ...form, companyId: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500" required><option value="">{t("finance.selectCompany")}</option>{companies.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}</select></div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5"><label className="block text-sm font-medium text-slate-700">{t("finance.category")}</label><input type="text" placeholder={t("finance.category")} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500" required /></div>
              <div className="space-y-1.5"><label className="block text-sm font-medium text-slate-700">{t("common.amount")}</label><input type="number" placeholder={t("common.amount")} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500" required min="0" step="0.01" /></div>
            </div>
            <div className="space-y-1.5"><label className="block text-sm font-medium text-slate-700">{t("common.description")}</label><textarea placeholder={t("common.description")} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500" rows={2} required /></div>
            <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"><X size={16} className="ms-1 inline-block" />{t("common.cancel")}</button>
              <SubmitButton loading={saving} label={t("common.save")} loadingLabel={t("common.saving")} className="bg-blue-600 hover:bg-blue-700 text-white"><Save size={16} /></SubmitButton>
            </div>
          </form>
        </FormModal>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 md:flex-row md:items-center md:flex-wrap">
            <div className="w-full md:w-80 md:flex-none"><SearchInput value={search} onChange={setSearch} placeholder={t("finance.searchPlaceholder")} /></div>
            <FilterSelect value={companyFilter} onChange={(v) => { setCompanyFilter(v); setPage(1); }} options={companies.map((c) => ({ value: c.id, label: c.name }))} allLabel={`${t("common.company")} — ${t("common.all")}`} className="md:w-40" />
            <FilterSelect value={categoryFilter} onChange={(v) => { setCategoryFilter(v); setPage(1); }} options={categories.map((cat) => ({ value: cat, label: cat }))} allLabel={`${t("finance.categoryFilter")} — ${t("common.all")}`} className="md:w-44" />
            <DateRangeFilter from={dateFrom} to={dateTo} onFromChange={(v) => { setDateFrom(v); setPage(1); }} onToChange={(v) => { setDateTo(v); setPage(1); }} />
            {hasActiveFilters && (
              <button onClick={() => { setSearch(""); setCompanyFilter(""); setCategoryFilter(""); setDateFrom(""); setDateTo(""); }} className="text-sm text-gray-500 hover:text-gray-700 underline">
                {t("common.resetFilters")}
              </button>
            )}
            <div className="md:ms-auto mt-2 md:mt-0">
              <ExportButton filename="expenses" getExport={exportExpenses} disabled={filtered.length === 0} />
            </div>
          </div>
          {loading ? (
            <div className="flex min-h-[320px] w-full items-center justify-center px-4 py-8">
              <PrinterLoader size="md" label={t("common.loading")} />
            </div>
          ) : expenses.length === 0 ? (
            <div className="flex min-h-[200px] items-center justify-center">
              <p className="text-sm text-gray-400">{t("common.noData")}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex min-h-[200px] items-center justify-center">
              <p className="text-sm text-gray-400">{t("common.noData")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-start text-sm font-medium text-gray-500">{t("common.date")}</th>
                    <th className="px-4 py-3 text-start text-sm font-medium text-gray-500">{t("finance.category")}</th>
                    <th className="px-4 py-3 text-start text-sm font-medium text-gray-500">{t("common.description")}</th>
                    <th className="px-4 py-3 text-start text-sm font-medium text-gray-500">{t("common.amount")}</th>
                    <th className="px-4 py-3 text-start text-sm font-medium text-gray-500">{t("finance.paidBy")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paged.map((expense) => (
                    <tr key={expense.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm"><DateTimeCell value={expense.date || expense.createdAt} /></td>
                      <td className="px-4 py-3 text-sm">{expense.category}</td>
                      <td className="px-4 py-3 text-sm">{expense.description}</td>
                      <td className="px-4 py-3 text-sm">{expense.amount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm">{expense.paidBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pagination currentPage={safePage} totalPages={totalPages} onPageChange={setPage} totalItems={filtered.length} pageSize={PAGE_SIZE} />
        </div>
      </div>
    </div>
  );
}
