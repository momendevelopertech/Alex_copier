"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/context";
import Pagination from "@/components/Pagination";
import SearchInput, { matchesQuery } from "@/components/SearchInput";
import ExportButton from "@/components/ExportButton";

interface Investor {
  id: string;
  name: string;
  phone: string;
  email: string;
  ownershipPct: number;
  isActive: boolean;
  createdAt: string;
}

const emptyForm = {
  name: "",
  phone: "",
  email: "",
  ownershipPct: "",
};

export default function InvestorsPage() {
  const { t, dir } = useI18n();
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  const fetchInvestors = async () => {
    try {
      const res = await fetch("/api/investors");
      const data = await res.json();
      setInvestors(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvestors();
  }, []);

  const filtered = investors.filter(
    (i) =>
      matchesQuery(i.name, search) ||
      (Boolean(i.phone) && i.phone.includes(search)) ||
      matchesQuery(i.email, search)
  );
  const hasActiveFilters = search !== "";
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const exportInvestors = () => ({
    headers: [
      t("investors.name"),
      t("customers.phone"),
      t("customers.email"),
      `${t("investors.ownershipPct")} %`,
    ],
    rows: filtered.map((i) => [
      i.name,
      i.phone || "",
      i.email || "",
      String(i.ownershipPct),
    ]),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/investors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        phone: form.phone || null,
        email: form.email || null,
        ownershipPct: parseFloat(form.ownershipPct),
      }),
    });
    setForm(emptyForm);
    setShowForm(false);
    fetchInvestors();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من الحذف؟")) return;
    await fetch(`/api/investors/${id}`, { method: "DELETE" });
    fetchInvestors();
  };

  const setField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div dir={dir}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between mb-6">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">{t("investors.title")}</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          {showForm ? t("common.cancel") : t("investors.addInvestor")}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">{t("investors.addInvestor")}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder={t("investors.name")}
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              className="border rounded-lg px-4 py-2 w-full"
              required
            />
            <input
              type="text"
              placeholder={t("customers.phone")}
              value={form.phone}
              onChange={(e) => setField("phone", e.target.value)}
              className="border rounded-lg px-4 py-2 w-full"
            />
            <input
              type="email"
              placeholder={t("customers.email")}
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
              className="border rounded-lg px-4 py-2 w-full"
            />
            <input
              type="number"
              step="0.01"
              placeholder={t("investors.ownershipPct") + " %"}
              value={form.ownershipPct}
              onChange={(e) => setField("ownershipPct", e.target.value)}
              className="border rounded-lg px-4 py-2 w-full"
              required
            />
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              {t("common.save")}
            </button>
          </form>
        </div>
      )}

      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:flex-wrap">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={t("investors.searchPlaceholder")}
        />
        {hasActiveFilters && (
          <button onClick={() => setSearch("")} className="text-sm text-gray-500 hover:text-gray-700 underline">
            {t("common.resetFilters")}
          </button>
        )}
        <div className="md:ms-auto">
          <ExportButton filename="investors" getExport={exportInvestors} disabled={filtered.length === 0} />
        </div>
      </div>

      <div className="bg-white rounded-xl overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("investors.name")}</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("customers.phone")}</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("customers.email")}</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("investors.ownershipPct")}</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-400">
                    {t("common.loading")}
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-400">
                    {t("common.noData")}
                  </td>
                </tr>
              ) : (
                paged.map((investor) => (
                  <tr key={investor.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">{investor.name}</td>
                    <td className="px-4 py-3 text-sm">{investor.phone || "—"}</td>
                    <td className="px-4 py-3 text-sm">{investor.email || "—"}</td>
                    <td className="px-4 py-3 text-sm">{investor.ownershipPct}%</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(investor.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        {t("common.delete")}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={safePage}
          totalPages={totalPages}
          onPageChange={setPage}
          totalItems={filtered.length}
          pageSize={PAGE_SIZE}
        />
      </div>
    </div>
  );
}
