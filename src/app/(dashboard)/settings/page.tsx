"use client";

import { useState, useEffect } from "react";
import { useI18n } from "@/i18n/context";
import { useSession } from "next-auth/react";
import SearchInput, { matchesQuery } from "@/components/SearchInput";
import FilterSelect from "@/components/FilterSelect";
import PrinterLoader from "@/components/PrinterLoader";
import { Plus, Pencil, Power, Eye, EyeOff, X } from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  companyId: string | null;
  isActive: boolean;
  createdAt: string;
}

const ROLE_BADGES: Record<string, string> = {
  GENERAL_MANAGER: "bg-purple-100 text-purple-800",
  COMPANY_MANAGER: "bg-blue-100 text-blue-800",
  ACCOUNTANT: "bg-green-100 text-green-800",
  MAINTENANCE_MANAGER: "bg-yellow-100 text-yellow-800",
  WORKSHOP_MANAGER: "bg-orange-100 text-orange-800",
  ENGINEER: "bg-cyan-100 text-cyan-800",
  SALES_EMPLOYEE: "bg-pink-100 text-pink-800",
};

const ALL_ROLES = Object.keys(ROLE_BADGES);

const emptyForm = {
  name: "",
  email: "",
  password: "",
  role: "SALES_EMPLOYEE",
  companyId: "",
};

export default function SettingsPage() {
  const { t, locale, setLocale, dir } = useI18n();
  const { data: session } = useSession();
  const meId = (session?.user as { id?: string })?.id;

  const [activeTab, setActiveTab] = useState<"language" | "users">("language");
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const loading = activeTab === "users" && !usersLoaded;
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (res.ok) setUsers(Array.isArray(data) ? data : []);
    } finally {
      setUsersLoaded(true);
    }
  };

  useEffect(() => {
    if (activeTab !== "users" || usersLoaded) return;
    let cancelled = false;
    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setUsers(Array.isArray(data) ? data : []);
        setUsersLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setUsersLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab, usersLoaded]);

  const filteredUsers = users.filter(
    (user) =>
      (!roleFilter || user.role === roleFilter) &&
      (matchesQuery(user.name, search) ||
        matchesQuery(user.email, search) ||
        matchesQuery(t(`roles.${user.role}`), search))
  );

  const openCreate = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setShowPassword(false);
    setFormError("");
    setModalOpen(true);
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setForm({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      companyId: user.companyId || "",
    });
    setShowPassword(false);
    setFormError("");
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setFormError("");
    try {
      const isEdit = Boolean(editingUser);
      const payload: Record<string, unknown> = {
        name: form.name,
        email: form.email,
        role: form.role,
        companyId: form.companyId || null,
      };
      if (!isEdit || form.password !== "") payload.password = form.password;

      const res = await fetch(isEdit ? `/api/users/${editingUser!.id}` : "/api/users", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || t("settings.actionFailed"));
        return;
      }

      setModalOpen(false);
      await fetchUsers();
      setBanner({ type: "success", text: t(isEdit ? "settings.userUpdated" : "settings.userCreated") });
    } catch {
      setFormError(t("settings.actionFailed"));
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (user: User) => {
    if (!window.confirm(`${t("settings.toggleStatusConfirm")}\n${user.name} — ${user.email}`)) return;
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      if (!res.ok) {
        const data = await res.json();
        setBanner({ type: "error", text: data.error || t("settings.actionFailed") });
        return;
      }
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, isActive: !user.isActive } : u)));
      setBanner({ type: "success", text: t("settings.statusChanged") });
    } catch {
      setBanner({ type: "error", text: t("settings.actionFailed") });
    }
  };

  const tabs = [
    { key: "language" as const, label: t("settings.language"), icon: "🌐" },
    { key: "users" as const, label: t("settings.users"), icon: "👥" },
  ];

  return (
    <div dir={dir}>
      <h1 className="text-xl sm:text-2xl font-bold mb-6">{t("settings.title")}</h1>

      <div className="flex gap-2 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === tab.key
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "language" && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">{t("settings.language")}</h2>
          <div className="flex gap-4">
            <button
              onClick={() => setLocale("ar")}
              className={`px-6 py-4 rounded-xl border-2 text-center transition ${
                locale === "ar"
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-gray-200 hover:border-gray-400"
              }`}
            >
              <div className="text-2xl mb-1">🇪🇬</div>
              <div className="font-semibold">العربية</div>
              <div className="text-xs text-gray-500 mt-1">Right to Left</div>
            </button>
            <button
              onClick={() => setLocale("en")}
              className={`px-6 py-4 rounded-xl border-2 text-center transition ${
                locale === "en"
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-gray-200 hover:border-gray-400"
              }`}
            >
              <div className="text-2xl mb-1">🇬🇧</div>
              <div className="font-semibold">English</div>
              <div className="text-xs text-gray-500 mt-1">Left to Right</div>
            </button>
          </div>
        </div>
      )}

      {activeTab === "users" && (
        <div className="space-y-3">
          {banner && (
            <div
              className={`rounded-lg px-4 py-3 text-sm flex items-center justify-between ${
                banner.type === "success"
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
              role="status"
            >
              <span>{banner.text}</span>
              <button onClick={() => setBanner(null)} className="shrink-0 opacity-60 hover:opacity-100" aria-label="close">
                <X size={16} />
              </button>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="p-4 border-b flex flex-col gap-2 md:flex-row md:items-center md:flex-wrap">
              <SearchInput value={search} onChange={setSearch} placeholder={t("settings.usersSearchPlaceholder")} className="md:max-w-md" />
              <FilterSelect
                value={roleFilter}
                onChange={(v) => setRoleFilter(v)}
                options={ALL_ROLES.map((role) => ({ value: role, label: t(`roles.${role}`) }))}
                allLabel={`${t("settings.roleFilter")} — ${t("common.all")}`}
                className="md:w-48"
              />
              {(search !== "" || roleFilter !== "") && (
                <button onClick={() => { setSearch(""); setRoleFilter(""); }} className="text-sm text-gray-500 hover:text-gray-700 underline">
                  {t("common.resetFilters")}
                </button>
              )}
              <button
                onClick={openCreate}
                className="md:ms-auto inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                <Plus size={18} />
                {t("settings.addUser")}
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center p-12">
                <PrinterLoader size="sm" label={t("common.loading")} />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px]">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-start text-sm font-medium text-gray-500">{t("settings.colUser")}</th>
                      <th className="px-4 py-3 text-start text-sm font-medium text-gray-500">{t("settings.colRole")}</th>
                      <th className="px-4 py-3 text-start text-sm font-medium text-gray-500">{t("settings.colStatus")}</th>
                      <th className="px-4 py-3 text-start text-sm font-medium text-gray-500">{t("common.date")}</th>
                      <th className="px-4 py-3 text-start text-sm font-medium text-gray-500 w-28">{t("common.actions") || ""}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredUsers.map((user) => {
                      const isSelf = user.id === meId;
                      const initials = user.name.trim().slice(0, 2);
                      return (
                        <tr key={user.id} className={`hover:bg-gray-50 ${!user.isActive ? "opacity-60" : ""}`}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${ROLE_BADGES[user.role] || "bg-gray-100 text-gray-700"}`}>
                                {initials}
                              </span>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">
                                  {user.name}
                                  {isSelf && (
                                    <span className="ms-2 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 align-middle">
                                      {t("settings.you")}
                                    </span>
                                  )}
                                </p>
                                <p className="text-xs text-gray-500 truncate" dir="ltr">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex whitespace-nowrap px-2.5 py-1 rounded-full text-xs font-medium ${ROLE_BADGES[user.role] || "bg-gray-100 text-gray-700"}`}>
                              {t(`roles.${user.role}`)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${
                              user.isActive ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                            }`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${user.isActive ? "bg-green-500" : "bg-gray-400"}`} />
                              {t(user.isActive ? "settings.active" : "settings.inactive")}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                            {new Date(user.createdAt).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-GB")}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => openEdit(user)}
                                title={t("settings.editUser")}
                                aria-label={t("settings.editUser")}
                                className="rounded-lg p-2 text-gray-400 transition hover:bg-blue-50 hover:text-blue-600"
                              >
                                <Pencil size={16} />
                              </button>
                              {!isSelf && (
                                <button
                                  onClick={() => toggleStatus(user)}
                                  title={t(user.isActive ? "settings.suspendAction" : "settings.activateAction")}
                                  aria-label={t(user.isActive ? "settings.suspendAction" : "settings.activateAction")}
                                  className={`rounded-lg p-2 transition ${
                                    user.isActive
                                      ? "text-gray-400 hover:bg-red-50 hover:text-red-600"
                                      : "text-gray-400 hover:bg-green-50 hover:text-green-600"
                                  }`}
                                >
                                  <Power size={16} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-400">{t("common.noData")}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}
        >
          <form
            onSubmit={handleSave}
            className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-white p-5 sm:p-6 shadow-xl max-h-[92vh] overflow-y-auto sidebar-scroll"
          >
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">
                {editingUser ? t("settings.editUser") : t("settings.newUser")}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                aria-label="close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="user-name" className="mb-1 block text-sm font-medium text-gray-700">{t("settings.fullName")}</label>
                <input
                  id="user-name"
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                  autoComplete="off"
                />
              </div>

              <div>
                <label htmlFor="user-email" className="mb-1 block text-sm font-medium text-gray-700">{t("customers.email")}</label>
                <input
                  id="user-email"
                  type="email"
                  required
                  dir="ltr"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  disabled={Boolean(editingUser)}
                  className={`w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none ${
                    editingUser ? "cursor-not-allowed bg-gray-100 text-gray-500" : ""
                  }`}
                  autoComplete="off"
                />
              </div>

              <div>
                <label htmlFor="user-password" className="mb-1 block text-sm font-medium text-gray-700">
                  {t("settings.password")}
                  {editingUser && <span className="block text-xs font-normal text-gray-400">{t("settings.passwordNewHint")}</span>}
                </label>
                <div className="relative">
                  <input
                    id="user-password"
                    type={showPassword ? "text" : "password"}
                    required={!editingUser}
                    minLength={editingUser ? undefined : 6}
                    dir="ltr"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 pr-10 text-sm focus:border-blue-500 focus:outline-none"
                    autoComplete="new-password"
                    placeholder={editingUser ? "••••••••" : ""}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    title={t(showPassword ? "settings.hidePassword" : "settings.showPassword")}
                    aria-label={t(showPassword ? "settings.hidePassword" : "settings.showPassword")}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                {!editingUser && <p className="mt-1 text-xs text-gray-400">{t("settings.passwordMin")}</p>}
              </div>

              <div>
                <label htmlFor="user-role" className="mb-1 block text-sm font-medium text-gray-700">{t("settings.colRole")}</label>
                <select
                  id="user-role"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  disabled={Boolean(editingUser) && editingUser!.id === meId}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100"
                >
                  {ALL_ROLES.map((role) => (
                    <option key={role} value={role}>{t(`roles.${role}`)}</option>
                  ))}
                </select>
              </div>
            </div>

            {formError && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700" role="alert">
                {formError}
              </div>
            )}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                {t("common.cancel")}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
                )}
                {saving ? t("common.loading") : t("common.save")}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
