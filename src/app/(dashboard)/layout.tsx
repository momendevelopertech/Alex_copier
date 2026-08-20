"use client";

import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { useI18n } from "@/i18n/context";
import { usePathname } from "next/navigation";

const pageTitles: Record<string, string> = {
  "/": "dashboard.title",
  "/machines": "machines.title",
  "/customers": "customers.title",
  "/engineers": "engineers.title",
  "/service-requests": "serviceRequests.title",
  "/contracts": "contracts.title",
  "/purchases": "purchases.title",
  "/sales": "sales.title",
  "/inventory": "inventory.title",
  "/workshop": "workshop.title",
  "/finance": "finance.title",
  "/settlements": "settlements.title",
  "/reports": "reports.title",
  "/settings": "settings.title",
  "/companies": "companies.title",
  "/investors": "investors.title",
  "/suppliers": "suppliers.title",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useI18n();

  const titleKey = pageTitles[pathname] || "dashboard.title";

  return (
    <div className="flex min-h-screen bg-gray-50" dir="rtl">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title={t(titleKey)} />
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
