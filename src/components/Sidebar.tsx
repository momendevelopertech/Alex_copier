"use client";

import { useEffect, useState } from "react";
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
  Warehouse,
  Boxes,
  Cog,
  Wallet,
  Receipt,
  BarChart3,
  Building2,
  Truck,
  PieChart,
  Bell,
  LogOut,
  Menu,
  X,
} from "lucide-react";

interface NavItem {
  key: string;
  href: string;
  icon: typeof LayoutDashboard;
  page?: Page;
}

const navGroups: { key: string; items: NavItem[] }[] = [
  {
    key: "navigation.group.general",
    items: [
      { key: "navigation.dashboard", href: "/", icon: LayoutDashboard, page: "dashboard" },
      { key: "navigation.notifications", href: "/notifications", icon: Bell },
    ],
  },
  {
    key: "navigation.group.salesCustomers",
    items: [
      { key: "navigation.sales", href: "/sales", icon: DollarSign, page: "sales" },
      { key: "navigation.customers", href: "/customers", icon: Users, page: "customers" },
      { key: "navigation.contracts", href: "/contracts", icon: FileText, page: "contracts" },
      { key: "navigation.machines", href: "/machines", icon: Printer, page: "machines" },
    ],
  },
  {
    key: "navigation.group.purchasing",
    items: [
      { key: "navigation.purchases", href: "/purchases", icon: ShoppingCart, page: "purchases" },
      { key: "navigation.suppliers", href: "/suppliers", icon: Truck, page: "suppliers" },
      { key: "navigation.inventory", href: "/inventory", icon: Package, page: "inventory" },
      { key: "navigation.warehouses", href: "/warehouses", icon: Warehouse, page: "warehouses" },
      { key: "navigation.products", href: "/products", icon: Boxes, page: "products" },
    ],
  },
  {
    key: "navigation.group.maintenance",
    items: [
      { key: "navigation.serviceRequests", href: "/service-requests", icon: AlertTriangle, page: "serviceRequests" },
      { key: "navigation.engineers", href: "/engineers", icon: Wrench, page: "engineers" },
      { key: "navigation.workshop", href: "/workshop", icon: Cog, page: "workshop" },
    ],
  },
  {
    key: "navigation.group.finance",
    items: [
      { key: "navigation.finance", href: "/finance", icon: Wallet, page: "finance" },
      { key: "navigation.settlements", href: "/settlements", icon: Receipt, page: "settlements" },
      { key: "navigation.investors", href: "/investors", icon: PieChart, page: "investors" },
    ],
  },
  {
    key: "navigation.group.admin",
    items: [
      { key: "navigation.reports", href: "/reports", icon: BarChart3, page: "reports" },
      { key: "navigation.companies", href: "/companies", icon: Building2, page: "companies" },
      { key: "navigation.users", href: "/users", icon: Users, page: "settings" },
    ],
  },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const pathname = usePathname();
  const { t } = useI18n();
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string })?.role;

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const updateDesktopState = () => setIsDesktop(mediaQuery.matches);
    updateDesktopState();
    mediaQuery.addEventListener("change", updateDesktopState);
    return () => mediaQuery.removeEventListener("change", updateDesktopState);
  }, []);

  const isCollapsed = isDesktop && collapsed;

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        {!isCollapsed && (
          <div>
            <h1 className="text-white text-[length:var(--text-subtitle)] font-bold">اليكس كوبير</h1>
            <p className="text-gray-400 text-[length:var(--text-caption)]">Alex Copier</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          aria-label={isCollapsed ? "Open menu" : t("common.close")}
          className="hidden min-h-11 min-w-11 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white lg:flex"
        >
          {isCollapsed ? <Menu size={20} /> : <X size={20} />}
        </button>
        <button
          onClick={() => setMobileOpen(false)}
          aria-label={t("common.close")}
          className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white lg:hidden"
        >
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 sidebar-scroll">
        {navGroups.map((group, groupIndex) => {
          const items = group.items.filter((item) => !item.page || hasPageAccess(userRole, item.page));
          if (items.length === 0) return null;
          return (
            <div
              key={group.key}
              className={
                isCollapsed && groupIndex > 0 ? "mt-3 border-t border-gray-700 pt-3" : isCollapsed ? "" : "mb-4"
              }
            >
              {!isCollapsed && (
                <p className="px-6 mb-1 text-[11px] font-semibold tracking-wide text-gray-500">
                  {t(group.key)}
                </p>
              )}
              {items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    title={isCollapsed ? t(item.key) : undefined}
                    className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg transition-colors ${
                      active
                        ? "bg-blue-600 text-white"
                        : "text-gray-300 hover:bg-gray-800 hover:text-white"
                    } ${isCollapsed ? "justify-center px-0" : ""}`}
                  >
                    <Icon size={20} className="shrink-0" />
                    {!isCollapsed && <span className="text-sm whitespace-nowrap">{t(item.key)}</span>}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-gray-700 p-3">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          title={isCollapsed ? t("navigation.logout") : undefined}
          className={`flex items-center gap-3 px-4 py-3 mx-2 rounded-lg transition-colors text-gray-300 hover:bg-red-600/20 hover:text-red-400 ${
            isCollapsed ? "justify-center px-0" : "w-[calc(100%-16px)]"
          }`}
        >
          <LogOut size={20} className="shrink-0" />
          {!isCollapsed && <span className="text-sm whitespace-nowrap">{t("navigation.logout")}</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation menu"
        aria-expanded={mobileOpen}
        className={`fixed right-3 top-3 z-50 flex min-h-11 min-w-11 items-center justify-center rounded-xl bg-gray-900 p-2 text-white shadow-lg transition-opacity lg:hidden ${mobileOpen ? "pointer-events-none opacity-0" : "opacity-100"}`}
      >
        <Menu size={24} />
      </button>

      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 lg:hidden ${
          mobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      <aside
        id="dashboard-sidebar"
        className={`fixed top-0 right-0 z-50 h-screen w-[min(20rem,86vw)] bg-gray-900 shadow-2xl transition-transform duration-300 ease-out will-change-transform lg:sticky lg:z-40 lg:top-0 lg:h-screen lg:shadow-none lg:transition-all ${
          collapsed ? "lg:w-16" : "lg:w-64"
        } ${mobileOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"}`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
