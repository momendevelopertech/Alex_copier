"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/context";
import Link from "next/link";

interface DashboardStats {
  totalMachines: number;
  totalCustomers: number;
  activeContracts: number;
  pendingServiceRequests: number;
  totalRevenue: number;
}

interface RecentItem {
  id: string;
  title: string;
  date: string;
}

const statCards = [
  { key: "totalMachines", label: "machines", color: "bg-blue-500", icon: "📦" },
  { key: "totalCustomers", label: "customers", color: "bg-green-500", icon: "👥" },
  { key: "activeContracts", label: "contracts", color: "bg-purple-500", icon: "📋" },
  { key: "pendingServiceRequests", label: "pendingServiceRequests", color: "bg-amber-500", icon: "⏳" },
  { key: "totalRevenue", label: "totalRevenue", color: "bg-emerald-500", icon: "💰" },
];

const quickActions = [
  { label: "addMachine", href: "/machines", color: "bg-blue-50 text-blue-700 hover:bg-blue-100" },
  { label: "createServiceRequest", href: "/service-requests", color: "bg-amber-50 text-amber-700 hover:bg-amber-100" },
  { label: "newSale", href: "/sales", color: "bg-green-50 text-green-700 hover:bg-green-100" },
  { label: "addCustomer", href: "/customers", color: "bg-purple-50 text-purple-700 hover:bg-purple-100" },
];

export default function Dashboard() {
  const { t } = useI18n();
  const [stats, setStats] = useState<DashboardStats>({
    totalMachines: 0,
    totalCustomers: 0,
    activeContracts: 0,
    pendingServiceRequests: 0,
    totalRevenue: 0,
  });
  const [recentRequests, setRecentRequests] = useState<RecentItem[]>([]);
  const [recentSales, setRecentSales] = useState<RecentItem[]>([]);

  useEffect(() => {
    Promise.allSettled([
      fetch("/api/machines").then((r) => r.json()),
      fetch("/api/customers").then((r) => r.json()),
      fetch("/api/contracts").then((r) => r.json()),
      fetch("/api/service-requests").then((r) => r.json()),
      fetch("/api/sales").then((r) => r.json()),
    ]).then((results) => {
      const machines = results[0].status === "fulfilled" ? results[0].value : [];
      const customers = results[1].status === "fulfilled" ? results[1].value : [];
      const contracts = results[2].status === "fulfilled" ? results[2].value : [];
      const serviceRequests = results[3].status === "fulfilled" ? results[3].value : [];
      const sales = results[4].status === "fulfilled" ? results[4].value : [];

      const machinesArr = Array.isArray(machines) ? machines : [];
      const customersArr = Array.isArray(customers) ? customers : [];
      const contractsArr = Array.isArray(contracts) ? contracts : [];
      const requestsArr = Array.isArray(serviceRequests) ? serviceRequests : [];
      const salesArr = Array.isArray(sales) ? sales : [];

      const activeContracts = contractsArr.filter((c: { status?: string }) => c.status === "ACTIVE").length;
      const pendingRequests = requestsArr.filter((r: { status?: string }) => r.status === "PENDING").length;
      const totalRevenue = salesArr.reduce((sum: number, s: { total?: number; amount?: number }) => sum + (s.total || s.amount || 0), 0);

      setStats({
        totalMachines: machinesArr.length,
        totalCustomers: customersArr.length,
        activeContracts,
        pendingServiceRequests: pendingRequests,
        totalRevenue,
      });

      setRecentRequests(
        requestsArr.slice(-5).reverse().map((r: { id?: string; _id?: string; title?: string; description?: string; createdAt?: string }) => ({
          id: r.id || r._id || "",
          title: r.title || r.description || "-",
          date: r.createdAt || "",
        }))
      );

      setRecentSales(
        salesArr.slice(-5).reverse().map((s: { id?: string; _id?: string; customerName?: string; createdAt?: string; total?: number; amount?: number }) => ({
          id: s.id || s._id || "",
          title: `${s.customerName || "-"} - ${(s.total || s.amount || 0).toLocaleString()}`,
          date: s.createdAt || "",
        }))
      );
    });
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{t("dashboard")}</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {statCards.map((card) => (
          <div key={card.key} className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 ${card.color} rounded-lg flex items-center justify-center text-white text-xl`}>
                {card.icon}
              </div>
              <div>
                <p className="text-gray-500 text-sm">{t(card.label)}</p>
                <p className="text-2xl font-bold">
                  {card.key === "totalRevenue" ? `$${(stats[card.key as keyof DashboardStats] as number).toLocaleString()}` : stats[card.key as keyof DashboardStats]}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">{t("recentServiceRequests")}</h2>
          {recentRequests.length === 0 ? (
            <p className="text-gray-400 text-sm">{t("noData")}</p>
          ) : (
            <ul className="space-y-3">
              {recentRequests.map((item) => (
                <li key={item.id} className="flex items-center justify-between border-b border-gray-50 pb-2">
                  <span className="text-sm">{item.title}</span>
                  <span className="text-xs text-gray-400">{item.date ? new Date(item.date).toLocaleDateString() : ""}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">{t("recentSales")}</h2>
          {recentSales.length === 0 ? (
            <p className="text-gray-400 text-sm">{t("noData")}</p>
          ) : (
            <ul className="space-y-3">
              {recentSales.map((item) => (
                <li key={item.id} className="flex items-center justify-between border-b border-gray-50 pb-2">
                  <span className="text-sm">{item.title}</span>
                  <span className="text-xs text-gray-400">{item.date ? new Date(item.date).toLocaleDateString() : ""}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4">{t("quickActions")}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className={`block rounded-xl px-4 py-6 text-center font-medium transition ${action.color}`}
            >
              {t(action.label)}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
