"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/context";
import Pagination from "@/components/Pagination";
import SearchInput, { matchesQuery } from "@/components/SearchInput";
import ExportButton from "@/components/ExportButton";

interface EngineerArea {
  id: string;
  areaName: string;
}

interface EngineerSkill {
  id: string;
  modelType: string;
  skillLevel: number;
}

interface Engineer {
  id: string;
  name: string;
  phone: string;
  email: string;
  baseSalary: number;
  transportAllowance: number;
  commissionRate: number;
  isActive: boolean;
  areas: EngineerArea[];
  skills: EngineerSkill[];
  createdAt: string;
}

const emptyForm = {
  name: "",
  phone: "",
  email: "",
  baseSalary: "",
  transportAllowance: "",
  commissionRate: "",
  areas: "",
};

export default function EngineersPage() {
  const { t, dir } = useI18n();
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Engineer | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  const fetchEngineers = async () => {
    try {
      const res = await fetch("/api/engineers");
      const data = await res.json();
      setEngineers(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEngineers();
  }, []);

  const filtered = engineers.filter(
    (e) =>
      matchesQuery(e.name, search) ||
      matchesQuery(e.email, search) ||
      matchesQuery(e.areas.map((a) => a.areaName).join(" "), search) ||
      matchesQuery(e.skills.map((s) => s.modelType).join(" "), search) ||
      (Boolean(e.phone) && e.phone.includes(search))
  );
  const hasActiveFilters = search !== "";
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const exportEngineers = () => ({
    headers: [
      t("engineers.name"),
      t("customers.phone"),
      t("customers.email"),
      t("engineers.baseSalary"),
      t("engineers.transportAllowance"),
      t("engineers.commissionRate"),
      t("engineers.areas"),
      t("engineers.skills"),
      t("common.status"),
    ],
    rows: filtered.map((e) => [
      e.name,
      e.phone || "",
      e.email || "",
      String(e.baseSalary),
      String(e.transportAllowance),
      String(e.commissionRate),
      e.areas.map((a) => a.areaName).join("، "),
      e.skills.map((s) => `${s.modelType} (${s.skillLevel})`).join("، "),
      e.isActive ? "نعم" : "لا",
    ]),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = {
      name: form.name,
      phone: form.phone || null,
      email: form.email || null,
      baseSalary: form.baseSalary ? parseFloat(form.baseSalary) : 8000,
      transportAllowance: form.transportAllowance ? parseFloat(form.transportAllowance) : 2000,
      commissionRate: form.commissionRate ? parseFloat(form.commissionRate) : 25,
      areas: form.areas
        ? form.areas.split(",").map((a) => a.trim()).filter(Boolean)
        : [],
    };
    await fetch("/api/engineers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setForm(emptyForm);
    setShowForm(false);
    fetchEngineers();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من الحذف؟")) return;
    await fetch(`/api/engineers/${id}`, { method: "DELETE" });
    fetchEngineers();
    setSelected(null);
  };

  const setField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div dir={dir}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between mb-6">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">{t("engineers.title")}</h1>
        <button
          onClick={() => { setShowForm(!showForm); setSelected(null); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          {showForm ? t("common.cancel") : t("engineers.addEngineer")}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">{t("engineers.addEngineer")}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder={t("engineers.name")}
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
              placeholder="الراتب الأساسي"
              value={form.baseSalary}
              onChange={(e) => setField("baseSalary", e.target.value)}
              className="border rounded-lg px-4 py-2 w-full"
            />
            <input
              type="number"
              placeholder="بدل النقل"
              value={form.transportAllowance}
              onChange={(e) => setField("transportAllowance", e.target.value)}
              className="border rounded-lg px-4 py-2 w-full"
            />
            <input
              type="number"
              placeholder="نسبة العمولة %"
              value={form.commissionRate}
              onChange={(e) => setField("commissionRate", e.target.value)}
              className="border rounded-lg px-4 py-2 w-full"
            />
            <input
              type="text"
              placeholder="المناطق (مفصولة بفاصلة)"
              value={form.areas}
              onChange={(e) => setField("areas", e.target.value)}
              className="border rounded-lg px-4 py-2 w-full md:col-span-2"
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

      {selected && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">{selected.name}</h2>
            <button
              onClick={() => setSelected(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              {t("common.close")}
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
            <div><span className="text-gray-500">{t("customers.phone")}:</span> {selected.phone || "—"}</div>
            <div><span className="text-gray-500">{t("customers.email")}:</span> {selected.email || "—"}</div>
            <div><span className="text-gray-500">الراتب الأساسي:</span> {selected.baseSalary.toLocaleString()}</div>
            <div><span className="text-gray-500">بدل النقل:</span> {selected.transportAllowance.toLocaleString()}</div>
            <div><span className="text-gray-500">العمولة:</span> {selected.commissionRate}%</div>
          </div>

          {selected.areas.length > 0 && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2">{t("engineers.areas")}</h3>
              <div className="flex flex-wrap gap-2">
                {selected.areas.map((area) => (
                  <span key={area.id} className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {area.areaName}
                  </span>
                ))}
              </div>
            </div>
          )}

          {selected.skills.length > 0 && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2">{t("engineers.skills")}</h3>
              <div className="flex flex-wrap gap-2">
                {selected.skills.map((skill) => (
                  <span key={skill.id} className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {skill.modelType} (مستوى {skill.skillLevel})
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <button
              onClick={() => handleDelete(selected.id)}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm"
            >
              {t("common.delete")}
            </button>
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:flex-wrap">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={t("engineers.searchPlaceholder")}
        />
        {hasActiveFilters && (
          <button onClick={() => setSearch("")} className="text-sm text-gray-500 hover:text-gray-700 underline">
            {t("common.resetFilters")}
          </button>
        )}
        <div className="md:ms-auto">
          <ExportButton filename="engineers" getExport={exportEngineers} disabled={filtered.length === 0} />
        </div>
      </div>

      <div className="bg-white rounded-xl overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("engineers.name")}</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("customers.phone")}</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">الراتب الأساسي</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">بدل النقل</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">العمولة</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">نشط</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-400">
                    {t("common.loading")}
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-400">
                    {t("common.noData")}
                  </td>
                </tr>
              ) : (
                paged.map((engineer) => (
                  <tr
                    key={engineer.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelected(engineer)}
                  >
                    <td className="px-4 py-3 text-sm font-medium">{engineer.name}</td>
                    <td className="px-4 py-3 text-sm">{engineer.phone || "—"}</td>
                    <td className="px-4 py-3 text-sm">{engineer.baseSalary.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm">{engineer.transportAllowance.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm">{engineer.commissionRate}%</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${engineer.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                        {engineer.isActive ? "نعم" : "لا"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(engineer.id); }}
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
