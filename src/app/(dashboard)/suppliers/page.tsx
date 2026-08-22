"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/context";

interface Supplier {
  id: string;
  name: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
  taxNumber: string;
  companyId: string;
  isActive: boolean;
  createdAt: string;
}
interface Company { id: string; name: string; }

const emptyForm = {
  name: "",
  contactName: "",
  phone: "",
  email: "",
  address: "",
  taxNumber: "",
  companyId: "",
};

export default function SuppliersPage() {
  const { t, dir } = useI18n();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);

  const fetchSuppliers = async () => {
    setLoading(true);
    const [res, companyRes] = await Promise.all([fetch("/api/suppliers"), fetch("/api/companies")]);
    const data = await res.json();
    setSuppliers(data);
    setCompanies(await companyRes.json());
    setLoading(false);
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const filtered = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.contactName && s.contactName.toLowerCase().includes(search.toLowerCase())) ||
      (s.phone && s.phone.includes(search))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/suppliers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm(emptyForm);
    setShowForm(false);
    fetchSuppliers();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من الحذف؟")) return;
    await fetch(`/api/suppliers/${id}`, { method: "DELETE" });
    fetchSuppliers();
  };

  const setField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div dir={dir}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between mb-6">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">{t("suppliers.title")}</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          {showForm ? t("common.cancel") : t("suppliers.addSupplier")}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">{t("suppliers.addSupplier")}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder={t("suppliers.name")}
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              className="border rounded-lg px-4 py-2 w-full"
              required
            />
            <input
              type="text"
              placeholder="جهة الاتصال"
              value={form.contactName}
              onChange={(e) => setField("contactName", e.target.value)}
              className="border rounded-lg px-4 py-2 w-full"
            />
            <input
              type="text"
              placeholder={t("suppliers.phone")}
              value={form.phone}
              onChange={(e) => setField("phone", e.target.value)}
              className="border rounded-lg px-4 py-2 w-full"
            />
            <input
              type="email"
              placeholder={t("suppliers.email")}
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
              className="border rounded-lg px-4 py-2 w-full"
            />
            <input
              type="text"
              placeholder={t("suppliers.address")}
              value={form.address}
              onChange={(e) => setField("address", e.target.value)}
              className="border rounded-lg px-4 py-2 w-full"
            />
            <input
              type="text"
              placeholder="الرقم الضريبي"
              value={form.taxNumber}
              onChange={(e) => setField("taxNumber", e.target.value)}
              className="border rounded-lg px-4 py-2 w-full"
            />
            <select
              value={form.companyId}
              onChange={(e) => setField("companyId", e.target.value)}
              className="border rounded-lg px-4 py-2 w-full"
              required
            ><option value="">{t("companies.selectCompany")}</option>{companies.map(company => <option key={company.id} value={company.id}>{company.name}</option>)}</select>
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
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("suppliers.name")}</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">جهة الاتصال</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("suppliers.phone")}</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("suppliers.email")}</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">الرقم الضريبي</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-400">
                    {t("common.loading")}
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-400">
                    {t("common.noData")}
                  </td>
                </tr>
              ) : (
                filtered.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">{supplier.name}</td>
                    <td className="px-4 py-3 text-sm">{supplier.contactName || "—"}</td>
                    <td className="px-4 py-3 text-sm">{supplier.phone || "—"}</td>
                    <td className="px-4 py-3 text-sm">{supplier.email || "—"}</td>
                    <td className="px-4 py-3 text-sm">{supplier.taxNumber || "—"}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(supplier.id)}
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
