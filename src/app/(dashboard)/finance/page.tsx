"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/context";
import Pagination from "@/components/Pagination";
import SearchInput, { matchesQuery } from "@/components/SearchInput";
import FilterSelect from "@/components/FilterSelect";
import DateRangeFilter, { inDateRange } from "@/components/DateRangeFilter";
import ExportButton from "@/components/ExportButton";

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
    await fetch("/api/expenses", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, amount: parseFloat(form.amount) || 0, paidBy: "" }),
    });
    setForm({ companyId: "", category: "", description: "", amount: "" });
    setShowForm(false); fetchData();
  };

  return (
    <div dir={dir}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between mb-6">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">{t("finance.expenses")}</h1>
        <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">{t("finance.newExpense")}</button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select value={form.companyId} onChange={(e) => setForm({ ...form, companyId: e.target.value })} className="border rounded-lg px-4 py-2" required>
              <option value="">{t("finance.selectCompany")}</option>
              {companies.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
            <input type="text" placeholder={t("finance.category")} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="border rounded-lg px-4 py-2" required />
            <input type="text" placeholder={t("common.description")} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="border rounded-lg px-4 py-2" required />
            <input type="number" placeholder={t("common.amount")} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="border rounded-lg px-4 py-2" required min="0" step="0.01" />
            <div className="md:col-span-2 flex gap-2">
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">{t("common.save")}</button>
              <button type="button" onClick={() => setShowForm(false)} className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400">{t("common.cancel")}</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:flex-wrap">
          <SearchInput value={search} onChange={setSearch} placeholder={t("finance.searchPlaceholder")} />
          <FilterSelect value={companyFilter} onChange={(v) => { setCompanyFilter(v); setPage(1); }} options={companies.map((c) => ({ value: c.id, label: c.name }))} allLabel={`${t("common.company")} — ${t("common.all")}`} className="md:w-40" />
          <FilterSelect value={categoryFilter} onChange={(v) => { setCategoryFilter(v); setPage(1); }} options={categories.map((cat) => ({ value: cat, label: cat }))} allLabel={`${t("finance.categoryFilter")} — ${t("common.all")}`} className="md:w-44" />
          <DateRangeFilter from={dateFrom} to={dateTo} onFromChange={(v) => { setDateFrom(v); setPage(1); }} onToChange={(v) => { setDateTo(v); setPage(1); }} />
          {hasActiveFilters && (
            <button onClick={() => { setSearch(""); setCompanyFilter(""); setCategoryFilter(""); setDateFrom(""); setDateTo(""); }} className="text-sm text-gray-500 hover:text-gray-700 underline">
              {t("common.resetFilters")}
            </button>
          )}
          <div className="md:ms-auto">
            <ExportButton filename="expenses" getExport={exportExpenses} disabled={filtered.length === 0} />
          </div>
        </div>
        {loading ? <p className="text-gray-500">{t("common.loading")}</p>
        : filtered.length === 0 ? <p className="text-gray-500">{t("common.noData")}</p>
        : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("common.date")}</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("finance.category")}</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("common.description")}</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("common.amount")}</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("finance.paidBy")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paged.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{new Date(expense.date || expense.createdAt).toLocaleDateString("ar-EG")}</td>
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
  );
}
