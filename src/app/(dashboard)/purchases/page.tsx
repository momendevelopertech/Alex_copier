"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/context";
import Pagination from "@/components/Pagination";

interface Supplier { id: string; name: string; }
interface Company { id: string; name: string; }
interface Product { id: string; name: string; }
interface PurchaseItem { id: string; productId: string; quantity: number; unitPrice: number; product: Product; }
interface PurchaseOrder {
  id: string; companyId: string; supplierId: string; status: string; total: number; notes: string | null;
  orderDate: string; createdAt: string; supplier: Supplier; company?: Company; items: PurchaseItem[];
}
interface ItemRow { productId: string; quantity: string; unitPrice: string; }

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "مسودة",
  CONFIRMED: "مؤكد",
  RECEIVED: "تم الاستلام",
  CANCELLED: "ملغي",
};

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  RECEIVED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
};

export default function PurchasesPage() {
  const { t } = useI18n();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ companyId: "", supplierId: "", notes: "" });
  const [itemRows, setItemRows] = useState<ItemRow[]>([{ productId: "", quantity: "", unitPrice: "" }]);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  const fetchData = async () => {
    setLoading(true);
    const [pRes, sRes, prRes, coRes] = await Promise.all([fetch("/api/purchases"), fetch("/api/suppliers"), fetch("/api/inventory"), fetch("/api/companies")]);
    setOrders(await pRes.json());
    setSuppliers(await sRes.json());
    setCompanies(await coRes.json());
    const inv = await prRes.json();
    setProducts(Array.isArray(inv) ? inv.map((i: { product?: Product }) => i.product).filter((p): p is Product => Boolean(p)) : []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = orders;
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const addRow = () => setItemRows([...itemRows, { productId: "", quantity: "", unitPrice: "" }]);
  const removeRow = (index: number) => { if (itemRows.length > 1) setItemRows(itemRows.filter((_, i) => i !== index)); };
  const updateRow = (index: number, field: keyof ItemRow, value: string) => {
    const updated = [...itemRows];
    updated[index] = { ...updated[index], [field]: value };
    setItemRows(updated);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const items = itemRows.filter((r) => r.productId && r.quantity && r.unitPrice).map((r) => ({ productId: r.productId, quantity: parseInt(r.quantity), unitPrice: parseFloat(r.unitPrice) }));
    if (items.length === 0) return;
    await fetch("/api/purchases", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, orderDate: new Date().toISOString(), items }) });
    setForm({ companyId: "", supplierId: "", notes: "" });
    setItemRows([{ productId: "", quantity: "", unitPrice: "" }]);
    setShowForm(false);
    fetchData();
  };

  return (
    <div dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">{t("purchases.title")}</h1>
        <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">{t("purchases.addOrder")}</button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <select value={form.companyId} onChange={(e) => setForm({ ...form, companyId: e.target.value })} className="border rounded-lg px-4 py-2" required>
                <option value="">{t("companies.selectCompany")}</option>
                {companies.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
              <select value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })} className="border rounded-lg px-4 py-2" required>
                <option value="">{t("purchases.selectSupplier")}</option>
                {suppliers.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
              </select>
              <textarea placeholder={t("common.notes")} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="border rounded-lg px-4 py-2" rows={2} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{t("purchases.items")}</h3>
                <button type="button" onClick={addRow} className="text-blue-600 hover:underline text-sm">{t("purchases.addRow")}</button>
              </div>
              {itemRows.map((row, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <select value={row.productId} onChange={(e) => updateRow(idx, "productId", e.target.value)} className="border rounded-lg px-4 py-2 flex-1">
                    <option value="">{t("purchases.selectProduct")}</option>
                    {products.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
                  </select>
                  <input type="number" placeholder={t("purchases.quantity")} value={row.quantity} onChange={(e) => updateRow(idx, "quantity", e.target.value)} className="border rounded-lg px-4 py-2 w-24" min="1" />
                  <input type="number" placeholder={t("purchases.unitPrice")} value={row.unitPrice} onChange={(e) => updateRow(idx, "unitPrice", e.target.value)} className="border rounded-lg px-4 py-2 w-32" min="0" step="0.01" />
                  {itemRows.length > 1 && (<button type="button" onClick={() => removeRow(idx)} className="text-red-600 hover:text-red-800 text-lg font-bold px-2">×</button>)}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">{t("common.save")}</button>
              <button type="button" onClick={() => setShowForm(false)} className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400">{t("common.cancel")}</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-md p-6">
        {loading ? <p className="text-gray-500">{t("common.loading")}</p>
        : orders.length === 0 ? <p className="text-gray-500">{t("common.noData")}</p>
        : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("purchases.orderNumber")}</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("common.company")}</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("purchases.supplier")}</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("common.status")}</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("purchases.total")}</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("common.date")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paged.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">{order.id.slice(0, 8)}</td>
                    <td className="px-4 py-3 text-sm">{order.company?.name || companies.find(c => c.id === order.companyId)?.name || "—"}</td>
                    <td className="px-4 py-3 text-sm">{order.supplier.name}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[order.status] || ""}`}>
                        {STATUS_LABELS[order.status] || order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">{order.total.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm">{new Date(order.orderDate || order.createdAt).toLocaleDateString("ar-EG")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} totalItems={filtered.length} pageSize={PAGE_SIZE} />
      </div>
    </div>
  );
}
