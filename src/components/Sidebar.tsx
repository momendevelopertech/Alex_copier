"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/i18n/context";
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
  Menu,
  X,
} from "lucide-react";

const navItems = [
  { key: "dashboard", href: "/", icon: LayoutDashboard },
  { key: "machines", href: "/machines", icon: Printer },
  { key: "customers", href: "/customers", icon: Users },
  { key: "engineers", href: "/engineers", icon: Wrench },
  { key: "serviceRequests", href: "/service-requests", icon: AlertTriangle },
  { key: "contracts", href: "/contracts", icon: FileText },
  { key: "purchases", href: "/purchases", icon: ShoppingCart },
  { key: "sales", href: "/sales", icon: DollarSign },
  { key: "inventory", href: "/inventory", icon: Package },
  { key: "workshop", href: "/workshop", icon: Cog },
  { key: "finance", href: "/finance", icon: Wallet },
  { key: "settlements", href: "/settlements", icon: Receipt },
  { key: "reports", href: "/reports", icon: BarChart3 },
  { key: "settings", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { t } = useI18n();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        {!collapsed && (
          <div>
            <h1 className="text-white text-lg font-bold">الكسندريا كوبير</h1>
            <p className="text-gray-400 text-xs">Alexandria Copier</p>
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
        {navItems.map((item) => {
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
