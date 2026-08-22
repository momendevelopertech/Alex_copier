"use client";

import { useState, useEffect } from "react";
import { useI18n } from "@/i18n/context";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  companyId: string | null;
  createdAt: string;
}

export default function SettingsPage() {
  const { t, locale, setLocale } = useI18n();
  const [activeTab, setActiveTab] = useState<"language" | "users">("language");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeTab === "users") {
      setLoading(true);
      fetch("/api/users")
        .then((r) => r.json())
        .then((data) => {
          setUsers(Array.isArray(data) ? data : []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [activeTab]);

  const ROLE_BADGES: Record<string, string> = {
    GENERAL_MANAGER: "bg-purple-100 text-purple-800",
    COMPANY_MANAGER: "bg-blue-100 text-blue-800",
    ACCOUNTANT: "bg-green-100 text-green-800",
    MAINTENANCE_MANAGER: "bg-yellow-100 text-yellow-800",
    WORKSHOP_MANAGER: "bg-orange-100 text-orange-800",
    ENGINEER: "bg-cyan-100 text-cyan-800",
    SALES_EMPLOYEE: "bg-pink-100 text-pink-800",
  };

  const tabs = [
    { key: "language" as const, label: t("settings.language"), icon: "🌐" },
    { key: "users" as const, label: t("settings.users"), icon: "👥" },
  ];

  return (
    <div dir="rtl">
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
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400">{t("common.loading")}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">الاسم</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("customers.email")}</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">الدور</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("common.date")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium">{user.name}</td>
                      <td className="px-4 py-3 text-sm">{user.email}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${ROLE_BADGES[user.role] || "bg-gray-100"}`}>
                          {t(`roles.${user.role}`)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {new Date(user.createdAt).toLocaleDateString("ar-EG")}
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-400">{t("common.noData")}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
