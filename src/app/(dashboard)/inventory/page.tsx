"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/context";
import Pagination from "@/components/Pagination";
import SearchInput, { matchesQuery } from "@/components/SearchInput";
import FilterSelect from "@/components/FilterSelect";
import ExportButton from "@/components/ExportButton";
import PrinterLoader from "@/components/PrinterLoader";
import { useToast } from "@/components/UIProvider";
import { useUrlParams, useSearchWithDefault } from "@/hooks/useUrlParams";
import { apiErrorMessage } from "@/lib/api-client";

interface InventoryItem {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  product?: { id: string; name: string; sku?: string | null; productType: string };
  warehouse?: { id: string; name: string };
}
interface Warehouse { id: string; name: string; }
interface Product { id: string; name: string; sku?: string | null; productType: string; }

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
  PURCHASE_IN: "ÙˆØ§Ø±Ø¯ Ø´Ø±Ø§Ø¡",
  INTER_COMPANY_IN: "ÙˆØ§Ø±Ø¯ Ø¨ÙŠÙ† Ø§Ù„Ø´Ø±ÙƒØ§Øª",
  INTER_COMPANY_OUT: "ØµØ§Ø¯Ø± Ø¨ÙŠÙ† Ø§Ù„Ø´Ø±ÙƒØ§Øª",
  SALE_OUT: "ØµØ§Ø¯Ø± Ù…Ø¨ÙŠØ¹Ø§Øª",
  ENGINEER_CUSTODY_OUT: "Ø¹Ù‡Ø¯Ø© Ù…Ù‡Ù†Ø¯Ø³ (ØµØ§Ø¯Ø±)",
  ENGINEER_RETURN: "Ù…Ø±ØªØ¬Ø¹ Ù…Ù‡Ù†Ø¯Ø³",
  CONSUMED: "Ù…Ø³ØªÙ‡Ù„Ùƒ",
  SCRAP: "Ù…Ù‡Ù…Ù„",
  ADJUSTMENT: "ØªØ³ÙˆÙŠØ©",
};

export default function InventoryPage() {
  const { t, dir } = useI18n();
  
  const { success: toastSuccess, error: toastError } = useToast();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const urlParams = useUrlParams(["q"]);
  const [search, setSearchInput] = useSearchWithDefault(urlParams.q ?? "");
  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<StockMovementForm>({
    warehouseId: "",
    productId: "",
    quantity: 1,
    movementType: "PURCHASE_IN",
    notes: "",
  });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  const filtered = inventory.filter(
    (item) =>
      (!warehouseFilter || item.warehouseId === warehouseFilter) &&
      (matchesQuery(item.product?.name, search) ||
        matchesQuery(item.product?.sku, search) ||
        matchesQuery(item.warehouse?.name, search))
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const exportInventory = () => ({
    headers: [
      t("inventory.product"),
      t("inventory.product") + " SKU",
      t("inventory.warehouse"),
      t("inventory.quantity"),
    ],
    rows: filtered.map((item) => [
      item.product?.name || item.productId,
      item.product?.sku || "",
      item.warehouse?.name || item.warehouseId,
      String(item.quantity),
    ]),
  });

  const fetchInventory = () => {
    fetch("/api/inventory?catalog=true")
      .then((r) => r.json())
      .then((data) => {
        setInventory(Array.isArray(data.inventory) ? data.inventory : []);
        setWarehouses(Array.isArray(data.warehouses) ? data.warehouses : []);
        setProducts(Array.isArray(data.products) ? data.products : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const response = await fetch("/api/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      toastError(apiErrorMessage(data, t));
      return;
    }
    setForm({ warehouseId: "", productId: "", quantity: 1, movementType: "PURCHASE_IN", notes: "" });
    setShowForm(false);
    fetchInventory();
    toastSuccess(t("common.savedSuccessfully"));
  };

  return (
    <div dir={dir}>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("inventory.warehouse")}</label>
              <select
                value={form.warehouseId}
                onChange={(e) => setForm({ ...form, warehouseId: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              ><option value="">{t("common.selectOption")}</option>{warehouses.map(warehouse => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}</select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("inventory.product")}</label>
              <select
                value={form.productId}
                onChange={(e) => setForm({ ...form, productId: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              ><option value="">{t("common.selectOption")}</option>{products.map(product => <option key={product.id} value={product.id}>{product.name}{product.sku ? ` Â· ${product.sku}` : ""}</option>)}</select>
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
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:flex-wrap">
          <SearchInput value={search} onChange={setSearchInput} placeholder={`${t("common.search")} ${t("inventory.product")} / SKU...`} />
          <FilterSelect value={warehouseFilter} onChange={(v) => { setWarehouseFilter(v); setPage(1); }} options={warehouses.map((w) => ({ value: w.id, label: w.name }))} allLabel={`${t("inventory.warehouse")} â€” ${t("common.all")}`} className="md:w-44" />
          {(search !== "" || warehouseFilter !== "") && (
            <button onClick={() => { setSearchInput(null); setWarehouseFilter(""); }} className="text-sm text-gray-500 hover:text-gray-700 underline">
              {t("common.resetFilters")}
            </button>
          )}
          <div className="md:ms-auto">
            <ExportButton filename="inventory" getExport={exportInventory} disabled={filtered.length === 0} />
          </div>
        </div>
        {loading ? (
          <div className="flex min-h-[320px] w-full items-center justify-center px-4 py-8">
            <PrinterLoader size="md" label={t("common.loading")} />
          </div>
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
                {paged.map((item) => (
                  <tr key={item.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{item.product?.name || item.productId}</td>
                    <td className="px-4 py-3 text-sm">{item.warehouse?.name || item.warehouseId}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${item.quantity > 10 ? "bg-green-100 text-green-800" : item.quantity > 0 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}`}>
                        {item.quantity}
                      </span>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-gray-400">{t("common.noData")}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        <Pagination currentPage={safePage} totalPages={totalPages} onPageChange={setPage} totalItems={filtered.length} pageSize={PAGE_SIZE} />
      </div>
    </div>
  );
}
