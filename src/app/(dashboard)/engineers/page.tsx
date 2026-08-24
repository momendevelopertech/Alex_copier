"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/context";
import Pagination from "@/components/Pagination";
import SearchInput, { matchesQuery } from "@/components/SearchInput";
import ExportButton from "@/components/ExportButton";
import PrinterLoader from "@/components/PrinterLoader";
import { Plus, Save, Trash2, X } from "lucide-react";
import { useConfirm, useToast } from "@/components/UIProvider";
import { apiErrorMessage } from "@/lib/api-client";

interface EngineerArea {
  id: string;
  areaName: string;
}

interface EngineerSkill {
  id: string;
  modelType: string;
  skillLevel: number;
}

interface LinkedUser {
  id: string;
  name: string;
  email: string;
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
  user?: LinkedUser | null;
  openAssignedCount?: number;
  createdAt: string;
}

interface LinkableUser {
  id: string;
  name: string;
  email: string;
  linkedEngineerId: string | null;
}

const emptyForm = {
  name: "",
  phone: "",
  email: "",
  baseSalary: "",
  transportAllowance: "",
  commissionRate: "",
  areas: "",
  userId: "",
};

export default function EngineersPage() {
  const { t, dir, locale } = useI18n();
  const confirmAction = useConfirm();
  const { success: toastSuccess, error: toastError } = useToast();
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [linkableUsers, setLinkableUsers] = useState<LinkableUser[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [selectedAccount, setSelectedAccount] = useState<LinkableUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Engineer | null>(null);
  const [linkDraft, setLinkDraft] = useState<{ engineerId: string; userId: string }>({ engineerId: "", userId: "" });
const [savingLink, setSavingLink] = useState(false);
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

  const fetchLinkableUsers = async () => {
    const res = await fetch("/api/engineers/linkable-users");
    const data = await res.json();
    setLinkableUsers(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/engineers").then((res) => res.json()),
      fetch("/api/engineers/linkable-users")
        .then((res) => res.json())
        .catch(() => []),
    ])
      .then(([engineerData, userData]) => {
        if (cancelled) return;
        setEngineers(engineerData);
        if (Array.isArray(userData)) setLinkableUsers(userData);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Draft value for the linked-account select: falls back to the selected engineer's
  // current link until the user picks a different account.
  const detailLinkUserId =
    selected && linkDraft.engineerId === selected.id ? linkDraft.userId : (selected?.user?.id ?? "");

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
      t("engineers.linkedAccount"),
      t("engineers.workload"),
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
      e.user?.name || "",
      String(e.openAssignedCount ?? 0),
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
      userId: form.userId || null,
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
    setSelectedAccount(null);
    setShowForm(false);
    fetchEngineers();
    fetchLinkableUsers();
  };

  const handleUserSelection = (userId: string) => {
    const selectedUser = linkableUsers.find((user) => user.id === userId) ?? null;
    setSelectedAccount(selectedUser);
    setForm((prev) => ({
      ...prev,
      userId,
      name: prev.name || selectedUser?.name || "",
      email: prev.email || selectedUser?.email || "",
    }));
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmAction({ message: t("engineers.deleteConfirm") }))) return;
    const res = await fetch(`/api/engineers/${id}`, { method: "DELETE" });
    if (res.ok) {
      const payload = await res.json().catch(() => null);
      toastSuccess(payload?.deactivated ? payload.message : t("common.deletedSuccessfully"));
    } else {
      const payload = await res.json().catch(() => null);
      toastError(apiErrorMessage(payload, t));
    }
    fetchEngineers();
    setSelected(null);
  };

  const saveLinkedUser = async () => {
    if (!selected) return;
    setSavingLink(true);
    try {
      const res = await fetch(`/api/engineers/${selected.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: detailLinkUserId || null }),
      });
      const payload = await res.json().catch(() => null);
      if (res.ok) {
        toastSuccess(t("engineers.accountLinked"));
        await fetchEngineers();
        await fetchLinkableUsers();
      } else {
        toastError(apiErrorMessage(payload, t));
      }
    } finally {
      setSavingLink(false);
    }
  };

  const setField = (field: string, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "userId" && value === "") {
        setSelectedAccount(null);
      }
      return next;
    });
  };

  // Users available for linking: unlinked accounts + the one already linked to the selected engineer.
  const availableForDetail = linkableUsers.filter(
    (u) => !u.linkedEngineerId || u.linkedEngineerId === selected?.id
  );

  return (
    <div dir={dir}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between mb-6">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">{t("engineers.title")}</h1>
        <button
          onClick={() => { setShowForm(!showForm); setSelected(null); setSelectedAccount(null); setForm(emptyForm); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"
        >
          {showForm ? (<><X size={16} />{t("common.cancel")}</>) : (<><Plus size={16} />{t("engineers.addEngineer")}</>)}
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
            <select
              value={form.userId}
              onChange={(e) => handleUserSelection(e.target.value)}
              className="border rounded-lg px-4 py-2 w-full"
            >
              <option value="">{t("engineers.selectAccountOptional")}</option>
              {linkableUsers.filter((u) => !u.linkedEngineerId).map((u) => (
                <option key={u.id} value={u.id}>{u.name} — {u.email}</option>
              ))}
            </select>

            {selectedAccount && (
              <div className="md:col-span-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
                <div className="font-medium mb-1">{t("engineers.selectedAccount")}</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div><span className="font-medium">{t("engineers.name")}: </span>{selectedAccount.name}</div>
                  <div><span className="font-medium">{t("customers.email")}: </span>{selectedAccount.email}</div>
                  <div className="md:col-span-2"><span className="font-medium">{t("settings.password")}: </span>{t("engineers.passwordHidden")}</div>
                </div>
              </div>
            )}
            <input
              type="number"
              placeholder={t("engineers.baseSalary")}
              value={form.baseSalary}
              onChange={(e) => setField("baseSalary", e.target.value)}
              className="border rounded-lg px-4 py-2 w-full"
            />
            <input
              type="number"
              placeholder={t("engineers.transportAllowance")}
              value={form.transportAllowance}
              onChange={(e) => setField("transportAllowance", e.target.value)}
              className="border rounded-lg px-4 py-2 w-full"
            />
            <input
              type="number"
              placeholder={`${t("engineers.commissionRate")} %`}
              value={form.commissionRate}
              onChange={(e) => setField("commissionRate", e.target.value)}
              className="border rounded-lg px-4 py-2 w-full"
            />
            <input
              type="text"
              placeholder={`${t("engineers.areas")} (${locale === "ar" ? "مفصولة بفاصلة" : "comma separated"})`}
              value={form.areas}
              onChange={(e) => setField("areas", e.target.value)}
              className="border rounded-lg px-4 py-2 w-full md:col-span-2"
            />
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 text-sm mb-4">
            <div className="rounded-xl bg-slate-50 p-3"><span className="block text-gray-500 mb-1">{t("customers.phone")}</span><span className="font-medium">{selected.phone || "—"}</span></div>
            <div className="rounded-xl bg-slate-50 p-3"><span className="block text-gray-500 mb-1">{t("customers.email")}</span><span className="font-medium">{selected.email || selected.user?.email || "—"}</span></div>
            <div className="rounded-xl bg-slate-50 p-3"><span className="block text-gray-500 mb-1">{t("engineers.baseSalary")}</span><span className="font-medium">{selected.baseSalary.toLocaleString()}</span></div>
            <div className="rounded-xl bg-slate-50 p-3"><span className="block text-gray-500 mb-1">{t("engineers.transportAllowance")}</span><span className="font-medium">{selected.transportAllowance.toLocaleString()}</span></div>
            <div className="rounded-xl bg-slate-50 p-3"><span className="block text-gray-500 mb-1">{t("engineers.commissionRate")}</span><span className="font-medium">{selected.commissionRate}%</span></div>
            <div className="rounded-xl bg-slate-50 p-3"><span className="block text-gray-500 mb-1">{t("engineers.workload")}</span><span className="font-medium">{selected.openAssignedCount ?? 0}</span></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] gap-4 items-end mb-4 border-t border-gray-100 pt-4">
           <div>
             <label className="block text-sm font-medium mb-1">{t("engineers.linkedAccount")}</label>
             <select
               value={detailLinkUserId}
               onChange={(e) =>
                 setLinkDraft({ engineerId: selected.id, userId: e.target.value })
               }
               className="border rounded-lg px-3 py-2.5 w-full bg-white"
             >
               <option value="">{t("engineers.noLinkedAccount")}</option>
               {availableForDetail.map((u) => (
                 <option key={u.id} value={u.id}>{u.name} — {u.email}</option>
               ))}
             </select>
           </div>
           <button
             onClick={saveLinkedUser}
             disabled={savingLink || detailLinkUserId === (selected.user?.id ?? "")}
             className="bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2"
           >
             <Save size={16} />
             {savingLink ? t("common.loading") : t("common.save")}
           </button>
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
                    {skill.modelType} ({locale === "ar" ? "مستوى" : "level"} {skill.skillLevel})
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
              <Trash2 size={14} className="inline-block me-1" />{t("common.delete")}
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
          <table className="w-full min-w-[720px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-start text-sm font-medium text-gray-500">{t("engineers.name")}</th>
                <th className="px-4 py-3 text-start text-sm font-medium text-gray-500">{t("customers.email")}</th>
                <th className="px-4 py-3 text-start text-sm font-medium text-gray-500">{t("customers.phone")}</th>
                <th className="px-4 py-3 text-start text-sm font-medium text-gray-500">{t("engineers.baseSalary")}</th>
                <th className="px-4 py-3 text-start text-sm font-medium text-gray-500">{t("engineers.transportAllowance")}</th>
                <th className="px-4 py-3 text-start text-sm font-medium text-gray-500">{t("engineers.commissionRate")}</th>
                <th className="px-4 py-3 text-start text-sm font-medium text-gray-500">{t("engineers.workload")}</th>
                <th className="px-4 py-3 text-start text-sm font-medium text-gray-500">{t("engineers.linkedAccount")}</th>
                <th className="px-4 py-3 text-start text-sm font-medium text-gray-500">{t("common.status")}</th>
                <th className="px-4 py-3 text-start text-sm font-medium text-gray-500">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-10">
                    <div className="flex items-center justify-center">
                      <PrinterLoader size="sm" label={t("common.loading")} />
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-8 text-gray-400">
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
                    <td className="px-4 py-3 text-sm font-medium whitespace-nowrap">{engineer.name}</td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap" dir="ltr">{engineer.email || engineer.user?.email || "—"}</td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap"><span dir="ltr">{engineer.phone || "—"}</span></td>
                    <td className="px-4 py-3 text-sm">{engineer.baseSalary.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm">{engineer.transportAllowance.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm">{engineer.commissionRate}%</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        (engineer.openAssignedCount ?? 0) >= 5
                          ? "bg-red-100 text-red-800"
                          : (engineer.openAssignedCount ?? 0) >= 3
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-700"
                      }`}>
                        {engineer.openAssignedCount ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{engineer.user?.name || engineer.user?.email || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${engineer.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${engineer.isActive ? "bg-green-500" : "bg-red-500"}`} />
                        {engineer.isActive ? t("common.active") : t("common.inactive")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(engineer.id); }}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-xs font-medium text-red-600 transition hover:bg-red-100"
                        title={t("common.delete")}
                        aria-label={t("common.delete")}
                      >
                        <Trash2 size={14} />
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
