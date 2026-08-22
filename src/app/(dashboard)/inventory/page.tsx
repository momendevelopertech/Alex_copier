"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/context";

interface InventoryItem {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  productName?: string;
  warehouseName?: string;
}

interface StockMovementForm {
  warehouseId: string;
  productId: string;
  quantity: number;
  movementType: string;
  notes: string;
}

const movementTypeColors: Record<string, string> = {
  PURCHASE_IN: "bg-green-100 text-green-800",
  INTER_COMPANY_IN: "bg-blue-100 text-blue-800",
  INTER_COMPANY_OUT: "bg-indigo-100 text-indigo-800",
  SALE_OUT: "bg-emerald-100 text-emerald-800",
  ENGINEER_CUSTODY_OUT: "bg-orange-100 text-orange-800",
  ENGINEER_RETURN: "bg-amber-100 text-amber-800",
  CONSUMED: "bg-red-100 text-red-800",
  SCRAP: "bg-rose-100 text-rose-800",
  ADJUSTMENT: "bg-gray-100 text-gray-800",
};

const MOVEMENT_LABELS: Record<string, string> = {
  PURCHASE_IN: "وارد شراء",
  INTER_COMPANY_IN: "وارد بين الشركات",
  INTER_COMPANY_OUT: "صادر بين الشركات",
  SALE_OUT: "صادر مبيعات",
  ENGINEER_CUSTODY_OUT: "عهدة مهندس (صادر)",
  ENGINEER_RETURN: "مرتجع مهندس",
  CONSUMED: "مستهلك",
  SCRAP: "مهمل",
  ADJUSTMENT: "تسوية",
};

export default function InventoryPage() {
  const { t } = useI18n();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<StockMovementForm>({
    warehouseId: "",
    productId: "",
    quantity: 1,
    movementType: "PURCHASE_IN",
    notes: "",
  });
  const [loading, setLoading] = useState(true);

  const fetchInventory = () => {
    fetch("/api/inventory")
      .then((r) => r.json())
      .then((data) => {
        setInventory(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/inventory/movements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ warehouseId: "", productId: "", quantity: 1, movementType: "PURCHASE_IN", notes: "" });
    setShowForm(false);
    fetchInventory();
  };

  return (
    <div dir="rtl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">{t("inventory.title")}</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          {t("inventory.addStockMovement")}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">{t("inventory.stockMovement")}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("inventory.warehouseId")}</label>
              <input
                type="text"
                value={form.warehouseId}
                onChange={(e) => setForm({ ...form, warehouseId: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("inventory.productId")}</label>
              <input
                type="text"
                value={form.productId}
                onChange={(e) => setForm({ ...form, productId: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("inventory.quantity")}</label>
              <input
                type="number"
                min="1"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("inventory.movementType")}</label>
              <select
                value={form.movementType}
                onChange={(e) => setForm({ ...form, movementType: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(MOVEMENT_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("common.notes")}</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition">
                {t("common.save")}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition">
                {t("common.cancel")}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-md p-6">
        {loading ? (
          <p className="text-gray-500">{t("common.loading")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">{t("inventory.product")}</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">{t("inventory.warehouse")}</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">{t("inventory.quantity")}</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((item) => (
                  <tr key={item.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{item.productName || item.productId}</td>
                    <td className="px-4 py-3 text-sm">{item.warehouseName || item.warehouseId}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${item.quantity > 10 ? "bg-green-100 text-green-800" : item.quantity > 0 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}`}>
                        {item.quantity}
                      </span>
                    </td>
                  </tr>
                ))}
                {inventory.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-gray-400">{t("common.noData")}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
