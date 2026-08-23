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

interface Warehouse {
  id: string;
  name: string;
  isMain: boolean;
  companyId: string;
  company?: Company;
  _count?: { inventory: number };
}

const emptyForm = { name: "", companyId: "", isMain: false };

export default function WarehousesPage() {
  const { t, dir } = useI18n();
  const confirmAction = useConfirm();
  const { success: toastSuccess, error: toastError } = useToast();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
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
      const [wRes, cRes] = await Promise.all([fetch("/api/warehouses"), fetch("/api/companies")]);
      const [wData, cData] = await Promise.all([wRes.json(), cRes.json()]);
      setWarehouses(Array.isArray(wData) ? wData : []);
      setCompanies(Array.isArray(cData) ? cData : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = warehouses.filter(
    (w) =>
      (matchesQuery(w.name, search) ||
        matchesQuery(w.company?.nameAr, search) ||
        matchesQuery(w.company?.name, search)) &&
      (!companyFilter || w.companyId === companyFilter)
  );
  const hasActiveFilters = companyFilter !== "" || search !== "";

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const exportWarehouses = () => ({
    headers: [t("warehouses.name"), t("warehouses.company"), t("warehouses.isMain"), t("warehouses.itemsCount")],
    rows: filtered.map((w) => [
      w.name,
      w.company?.nameAr || w.company?.name || "",
      w.isMain ? t("common.yes") : t("common.no"),
      String(w._count?.inventory ?? 0),
    ]),
  });

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setError("");
    setShowForm(!showForm);
  };

  const openEdit = (warehouse: Warehouse) => {
    setForm({ name: warehouse.name, companyId: warehouse.companyId, isMain: warehouse.isMain });
    setEditingId(warehouse.id);
    setError("");
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch(editingId ? `/api/warehouses/${editingId}` : "/api/warehouses", {
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
    if (!(await confirmAction({ message: t("warehouses.deleteConfirm") }))) return;
    const res = await fetch(`/api/warehouses/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      toastError(apiErrorMessage(data, t));
      return;
    }
    await fetchData();
    toastSuccess(t("common.deletedSuccessfully"));
  };

  return (
    <div dir={dir}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between mb-6">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">{t("warehouses.title")}</h1>
        <button
          onClick={openCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"
        >
          {showForm && !editingId ? (<><X size={16} />{t("common.cancel")}</>) : (<><Plus size={16} />{t("warehouses.addWarehouse")}</>)}
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
            {editingId ? t("warehouses.editWarehouse") : t("warehouses.addWarehouse")}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">{t("warehouses.name")}</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-lg border px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                required
              />
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
            <div className="flex items-end gap-2 pb-1">
              <input
                id="warehouse-isMain"
                type="checkbox"
                checked={form.isMain}
                onChange={(e) => setForm({ ...form, isMain: e.target.checked })}
                className="h-4 w-4"
              />
              <label htmlFor="warehouse-isMain" className="text-sm font-medium">
                {t("warehouses.isMain")}
              </label>
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
          placeholder={`${t("common.search")} ${t("warehouses.title")}`}
        />
        <FilterSelect
          value={companyFilter}
          onChange={(v) => { setCompanyFilter(v); setPage(1); }}
          options={companies.map((c) => ({ value: c.id, label: c.nameAr || c.name }))}
          allLabel={`${t("warehouses.company")} — ${t("common.all")}`}
          className="md:w-52"
        />
        {hasActiveFilters && (
          <button
            onClick={() => { setSearch(""); setCompanyFilter(""); }}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            {t("common.resetFilters")}
          </button>
        )}
        <ExportButton filename="warehouses" getExport={exportWarehouses} disabled={filtered.length === 0} />
      </div>

      <div className="bg-white rounded-xl overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-start text-sm font-medium text-gray-500">{t("warehouses.name")}</th>
                <th className="px-4 py-3 text-start text-sm font-medium text-gray-500">{t("warehouses.company")}</th>
                <th className="px-4 py-3 text-start text-sm font-medium text-gray-500">{t("warehouses.isMain")}</th>
                <th className="px-4 py-3 text-start text-sm font-medium text-gray-500">{t("warehouses.itemsCount")}</th>
                <th className="px-4 py-3 text-start text-sm font-medium text-gray-500">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-10">
                    <div className="flex items-center justify-center">
                      <PrinterLoader size="sm" label={t("common.loading")} />
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-400">
                    {t("common.noData")}
                  </td>
                </tr>
              ) : (
                paged.map((warehouse) => (
                  <tr key={warehouse.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">{warehouse.name}</td>
                    <td className="px-4 py-3 text-sm">{warehouse.company?.nameAr || warehouse.company?.name || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex whitespace-nowrap px-2 py-1 rounded-full text-xs font-medium ${warehouse.isMain ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                        {warehouse.isMain ? t("common.yes") : t("common.no")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">{warehouse._count?.inventory ?? 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEdit(warehouse)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          <Pencil size={14} className="inline-block me-1" />{t("common.edit")}
                        </button>
                        <button
                          onClick={() => handleDelete(warehouse.id)}
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
