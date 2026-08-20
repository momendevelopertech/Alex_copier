"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/i18n/context";
import { useSession, signOut } from "next-auth/react";
import { hasPageAccess, type Page } from "@/lib/permissions";
import {
  LayoutDashboard,
  Printer,
  Users,
  Wrench,
  AlertTriangle,
  FileText,
  ShoppingCart,
  DollarSign,
  Package,
  Cog,
  Wallet,
  Receipt,
  BarChart3,
  Settings,
  Building2,
  Truck,
  PieChart,
  LogOut,
  Menu,
  X,
} from "lucide-react";

const navItems: { key: string; href: string; icon: typeof LayoutDashboard; page: Page }[] = [
  { key: "navigation.dashboard", href: "/", icon: LayoutDashboard, page: "dashboard" },
  { key: "navigation.machines", href: "/machines", icon: Printer, page: "machines" },
  { key: "navigation.customers", href: "/customers", icon: Users, page: "customers" },
  { key: "navigation.engineers", href: "/engineers", icon: Wrench, page: "engineers" },
  { key: "navigation.serviceRequests", href: "/service-requests", icon: AlertTriangle, page: "serviceRequests" },
  { key: "navigation.contracts", href: "/contracts", icon: FileText, page: "contracts" },
  { key: "navigation.purchases", href: "/purchases", icon: ShoppingCart, page: "purchases" },
  { key: "navigation.sales", href: "/sales", icon: DollarSign, page: "sales" },
  { key: "navigation.inventory", href: "/inventory", icon: Package, page: "inventory" },
  { key: "navigation.workshop", href: "/workshop", icon: Cog, page: "workshop" },
  { key: "navigation.finance", href: "/finance", icon: Wallet, page: "finance" },
  { key: "navigation.companies", href: "/companies", icon: Building2, page: "companies" },
  { key: "navigation.settlements", href: "/settlements", icon: Receipt, page: "settlements" },
  { key: "navigation.suppliers", href: "/suppliers", icon: Truck, page: "suppliers" },
  { key: "navigation.investors", href: "/investors", icon: PieChart, page: "investors" },
  { key: "navigation.reports", href: "/reports", icon: BarChart3, page: "reports" },
  { key: "navigation.settings", href: "/settings", icon: Settings, page: "settings" },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { t } = useI18n();
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string })?.role;

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const allowedNavItems = navItems.filter((item) => hasPageAccess(userRole, item.page));

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        {!collapsed && (
          <div>
            <h1 className="text-white text-lg font-bold">اليكس كوبير</h1>
            <p className="text-gray-400 text-xs">Alex Copier</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-gray-400 hover:text-white hidden lg:block"
        >
          {collapsed ? <Menu size={20} /> : <X size={20} />}
        </button>
        <button
          onClick={() => setMobileOpen(false)}
          className="text-gray-400 hover:text-white lg:hidden"
        >
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        {allowedNavItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 mx-2 rounded-lg transition-colors ${
                active
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <Icon size={20} />
              {!collapsed && <span className="text-sm">{t(item.key)}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-700 p-3">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 px-4 py-3 mx-2 rounded-lg transition-colors w-full text-gray-300 hover:bg-red-600/20 hover:text-red-400"
        >
          <LogOut size={20} />
          {!collapsed && <span className="text-sm">{t("navigation.logout")}</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 right-4 z-50 lg:hidden bg-gray-900 text-white p-2 rounded-lg"
      >
        <Menu size={24} />
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 right-0 h-screen bg-gray-900 z-40 transition-all duration-300 ${
          collapsed ? "w-16" : "w-64"
        } ${mobileOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"}`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
