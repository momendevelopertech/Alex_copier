"use client";

import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { useI18n } from "@/i18n/context";
import { usePathname } from "next/navigation";

const pageTitles: Record<string, string> = {
  "/": "dashboard",
  "/machines": "machines",
  "/customers": "customers",
  "/engineers": "engineers",
  "/service-requests": "serviceRequests",
  "/contracts": "contracts",
  "/purchases": "purchases",
  "/sales": "sales",
  "/inventory": "inventory",
  "/workshop": "workshop",
  "/finance": "finance",
  "/settlements": "settlements",
  "/reports": "reports",
  "/settings": "settings",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useI18n();

  const titleKey = pageTitles[pathname] || "dashboard";

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title={t(titleKey)} />
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
