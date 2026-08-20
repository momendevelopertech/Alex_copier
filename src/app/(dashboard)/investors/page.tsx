"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/context";

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
  const { t } = useI18n();
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);

  const fetchInvestors = async () => {
    setLoading(true);
    const res = await fetch("/api/investors");
    const data = await res.json();
    setInvestors(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchInvestors();
  }, []);

  const filtered = investors.filter(
    (i) =>
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      (i.phone && i.phone.includes(search)) ||
      (i.email && i.email.toLowerCase().includes(search.toLowerCase()))
  );

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
    <div dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">{t("investors.title")}</h1>
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

      <div className="mb-4">
        <input
          type="text"
          placeholder={t("common.search") + "..."}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded-lg px-4 py-2 w-full md:w-96"
        />
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
                filtered.map((investor) => (
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
      </div>
    </div>
  );
}
