"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/context";
import Pagination from "@/components/Pagination";
import SearchInput, { matchesQuery } from "@/components/SearchInput";
import FilterSelect from "@/components/FilterSelect";
import ExportButton from "@/components/ExportButton";
import { Pencil, Plus, Save, Trash2, X } from "lucide-react";
import PrinterLoader from "@/components/PrinterLoader";
import { useConfirm, useToast } from "@/components/UIProvider";
import { apiErrorMessage } from "@/lib/api-client";

interface Company {
  id: string;
  name: string;
  nameAr?: string | null;
}

interface Product {
  id: string;
  name: string;
  description?: string | null;
  productType: string;
  companyId: string;
  company?: Company;
  sku?: string | null;
  egsCode?: string | null;
  purchasePrice?: number | null;
  wholesalePrice?: number | null;
  retailPrice?: number | null;
  isActive: boolean;
}

const emptyForm = {
  name: "",
  productType: "SPARE_PART",
  companyId: "",
  sku: "",
  egsCode: "",
  purchasePrice: "",
  wholesalePrice: "",
  retailPrice: "",
  description: "",
};

const TYPE_BADGES: Record<string, string> = {
  SPARE_PART: "bg-orange-100 text-orange-800",
  MACHINE: "bg-blue-100 text-blue-800",
};

export default function ProductsPage() {
  const { t, dir } = useI18n();
  const confirmAction = useConfirm();
  const { success: toastSuccess, error: toastError } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  const fetchData = async () => {
    try {
      // ?all=true — admins manage inactive products here too.
      const [pRes, cRes] = await Promise.all([
        fetch("/api/products?all=true"),
        fetch("/api/companies"),
      ]);
      const [pData, cData] = await Promise.all([pRes.json(), cRes.json()]);
      setProducts(Array.isArray(pData) ? pData : []);
      setCompanies(Array.isArray(cData) ? cData : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = products.filter(
    (p) =>
      (matchesQuery(p.name, search) ||
        matchesQuery(p.sku, search) ||
        matchesQuery(p.egsCode, search)) &&
      (!typeFilter || p.productType === typeFilter) &&
      (!companyFilter || p.companyId === companyFilter) &&
      (!activeFilter || String(p.isActive) === activeFilter)
  );
  const hasActiveFilters = typeFilter !== "" || companyFilter !== "" || activeFilter !== "" || search !== "";

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const exportProducts = () => ({
    headers: [
      t("products.name"),
      t("products.type"),
      t("warehouses.company"),
      t("products.sku"),
      t("products.purchasePrice"),
      t("products.wholesalePrice"),
      t("products.retailPrice"),
      t("common.status"),
    ],
    rows: filtered.map((p) => [
      p.name,
      p.productType === "MACHINE" ? t("products.machine") : t("products.sparePart"),
      p.company?.nameAr || p.company?.name || "",
      p.sku || "",
      p.purchasePrice != null ? String(p.purchasePrice) : "",
      p.wholesalePrice != null ? String(p.wholesalePrice) : "",
      p.retailPrice != null ? String(p.retailPrice) : "",
      p.isActive ? t("common.active") : t("common.inactive"),
    ]),
  });

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setError("");
    setShowForm(!showForm);
  };

  const openEdit = (product: Product) => {
    setForm({
      name: product.name,
      productType: product.productType,
      companyId: product.companyId,
      sku: product.sku || "",
      egsCode: product.egsCode || "",
      purchasePrice: product.purchasePrice != null ? String(product.purchasePrice) : "",
      wholesalePrice: product.wholesalePrice != null ? String(product.wholesalePrice) : "",
      retailPrice: product.retailPrice != null ? String(product.retailPrice) : "",
      description: product.description || "",
    });
    setEditingId(product.id);
    setError("");
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch(editingId ? `/api/products/${editingId}` : "/api/products", {
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
      await fetchData();
      toastSuccess(t("common.savedSuccessfully"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmAction({ message: t("products.deleteConfirm") }))) return;
    const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => null);
    setError("");
    if (!res.ok) {
      toastError(apiErrorMessage(data, t));
      return;
    }
    await fetchData();
    toastSuccess(data?.archived ? t("products.archivedNotice") : t("common.deletedSuccessfully"));
  };

  const toggleActive = async (product: Product) => {
    const res = await fetch(`/api/products/${product.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !product.isActive }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      toastError(apiErrorMessage(data, t));
      return;
    }
    await fetchData();
    toastSuccess(t("common.savedSuccessfully"));
  };

  const priceField = (
    label: string,
    field: "purchasePrice" | "wholesalePrice" | "retailPrice"
  ) => (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <input
        type="number"
        min="0"
        step="0.01"
        value={form[field]}
        onChange={(e) => setForm({ ...form, [field]: e.target.value })}
        className="w-full rounded-lg border px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
      />
    </div>
  );

  return (
    <div dir={dir}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between mb-6">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">{t("products.title")}</h1>
        <button
          onClick={openCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"
        >
          {showForm && !editingId ? (<><X size={16} />{t("common.cancel")}</>) : (<><Plus size={16} />{t("products.addProduct")}</>)}
        </button>
      </div>

      {error && (
        <div
          className="mb-4 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="status"
        >
          <span>{error}</span>
          <button onClick={() => setError("")} aria-label={t("common.close")} className="text-inherit">
            ✕
          </button>
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingId ? t("products.editProduct") : t("products.addProduct")}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">{t("products.name")}</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-lg border px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t("products.type")}</label>
              <select
                value={form.productType}
                onChange={(e) => setForm({ ...form, productType: e.target.value })}
                className="w-full rounded-lg border bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                required
              >
                <option value="SPARE_PART">{t("products.sparePart")}</option>
                <option value="MACHINE">{t("products.machine")}</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t("warehouses.company")}</label>
              <select
                value={form.companyId}
                onChange={(e) => setForm({ ...form, companyId: e.target.value })}
                className="w-full rounded-lg border bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                required
              >
                <option value="">{t("common.selectOption")}</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.nameAr || company.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">SKU</label>
              <input
                type="text"
                dir="ltr"
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                className="w-full rounded-lg border px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">EGS</label>
              <input
                type="text"
                dir="ltr"
                value={form.egsCode}
                onChange={(e) => setForm({ ...form, egsCode: e.target.value })}
                className="w-full rounded-lg border px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div></div>
            {priceField(t("products.purchasePrice"), "purchasePrice")}
            {priceField(t("products.wholesalePrice"), "wholesalePrice")}
            {priceField(t("products.retailPrice"), "retailPrice")}
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium">{t("products.description")}</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full rounded-lg border px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="md:col-span-3 flex justify-end">
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

      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:flex-wrap">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={`${t("common.search")} ${t("products.title")}`}
        />
        <FilterSelect
          value={typeFilter}
          onChange={(v) => { setTypeFilter(v); setPage(1); }}
          options={[
            { value: "SPARE_PART", label: t("products.sparePart") },
            { value: "MACHINE", label: t("products.machine") },
          ]}
          allLabel={`${t("products.type")} — ${t("common.all")}`}
          className="md:w-44"
        />
        <FilterSelect
          value={companyFilter}
          onChange={(v) => { setCompanyFilter(v); setPage(1); }}
          options={companies.map((c) => ({ value: c.id, label: c.nameAr || c.name }))}
          allLabel={`${t("warehouses.company")} — ${t("common.all")}`}
          className="md:w-52"
        />
        <FilterSelect
          value={activeFilter}
          onChange={(v) => { setActiveFilter(v); setPage(1); }}
          options={[
            { value: "true", label: t("common.active") },
            { value: "false", label: t("common.inactive") },
          ]}
          allLabel={`${t("common.status")} — ${t("common.all")}`}
          className="md:w-36"
        />
        {hasActiveFilters && (
          <button
            onClick={() => { setSearch(""); setTypeFilter(""); setCompanyFilter(""); setActiveFilter(""); }}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            {t("common.resetFilters")}
          </button>
        )}
        <ExportButton filename="products" getExport={exportProducts} disabled={filtered.length === 0} />
      </div>

      <div className="bg-white rounded-xl overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-start text-sm font-medium text-gray-500">{t("products.name")}</th>
                <th className="px-4 py-3 text-start text-sm font-medium text-gray-500">{t("products.type")}</th>
                <th className="px-4 py-3 text-start text-sm font-medium text-gray-500">{t("warehouses.company")}</th>
                <th className="px-4 py-3 text-start text-sm font-medium text-gray-500">SKU</th>
                <th className="px-4 py-3 text-start text-sm font-medium text-gray-500">{t("products.purchasePrice")}</th>
                <th className="px-4 py-3 text-start text-sm font-medium text-gray-500">{t("products.retailPrice")}</th>
                <th className="px-4 py-3 text-start text-sm font-medium text-gray-500">{t("common.status")}</th>
                <th className="px-4 py-3 text-start text-sm font-medium text-gray-500">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-10">
                    <div className="flex items-center justify-center">
                      <PrinterLoader size="sm" label={t("common.loading")} />
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-400">
                    {t("common.noData")}
                  </td>
                </tr>
              ) : (
                paged.map((product) => (
                  <tr key={product.id} className={`hover:bg-gray-50 ${product.isActive ? "" : "opacity-60"}`}>
                    <td className="px-4 py-3 text-sm font-medium">{product.name}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex whitespace-nowrap px-2 py-1 rounded-full text-xs font-medium ${TYPE_BADGES[product.productType] || ""}`}>
                        {product.productType === "MACHINE" ? t("products.machine") : t("products.sparePart")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">{product.company?.nameAr || product.company?.name || "—"}</td>
                    <td className="px-4 py-3 text-sm"><span dir="ltr">{product.sku || "—"}</span></td>
                    <td className="px-4 py-3 text-sm">{product.purchasePrice != null ? product.purchasePrice.toLocaleString() : "—"}</td>
                    <td className="px-4 py-3 text-sm">{product.retailPrice != null ? product.retailPrice.toLocaleString() : "—"}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActive(product)}
                        title={t("common.edit")}
                        className={`inline-flex whitespace-nowrap px-2 py-1 rounded-full text-xs font-medium cursor-pointer ${product.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                      >
                        {product.isActive ? t("common.active") : t("common.inactive")}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEdit(product)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          <Pencil size={14} className="inline-block me-1" />{t("common.edit")}
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          <Trash2 size={14} className="inline-block me-1" />{t("common.delete")}
                        </button>
                      </div>
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
