"use client";

import { Fragment, useEffect, useState } from "react";
import { useI18n } from "@/i18n/context";
import Pagination from "@/components/Pagination";
import SearchInput, { matchesQuery } from "@/components/SearchInput";
import FilterSelect from "@/components/FilterSelect";
import DateRangeFilter, { inDateRange } from "@/components/DateRangeFilter";
import { Eye, Pencil, Plus, Save, X } from "lucide-react";
import ExportButton from "@/components/ExportButton";
import PrinterLoader from "@/components/PrinterLoader";
import { useToast } from "@/components/UIProvider";
import { apiErrorMessage } from "@/lib/api-client";
import FormModal from "@/components/FormModal";

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "نقدي",
  CREDIT: "آجل",
  INSTALLMENT: "أقساط",
  MIXED: "مختلط",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "معلق",
  PARTIAL: "جزئي",
  PAID: "مدفوع",
  OVERDUE: "متأخر",
};

const ORDER_TYPE_LABELS: Record<string, string> = {
  MACHINE_SALE: "بيع جهاز",
  SPARE_PART_SALE: "بيع قطع غيار",
};

const paymentStatusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  PARTIAL: "bg-orange-100 text-orange-800",
  PAID: "bg-green-100 text-green-800",
  OVERDUE: "bg-red-100 text-red-800",
};

interface Customer { id: string; name: string; }
interface Company { id: string; name: string; }
interface Engineer { id: string; name: string; email?: string | null; }
interface Product { id: string; name: string; retailPrice?: number | null; wholesalePrice?: number | null; pricingTiers?: Record<string, number | null> | null; }
interface SalesItem { id: string; productId: string; quantity: number; unitPrice: number; discount: number; product: Product; }
interface SalesOrder {
  id: string; companyId: string; customerId: string; engineerId?: string | null; orderType: string; status: string; total: number; discount: number;
  discountType: string; taxRate: number; paymentMethod: string; paymentStatus: string;
  notes: string | null; orderDate: string; createdAt: string; customer: Customer; company?: Company; engineer?: Engineer | null; items: SalesItem[];
}
interface ItemRow { productId: string; quantity: string; unitPrice: string; discount: string; priceTier: string; }

const getProductTierPrice = (product: Product | undefined, tier: string) => {
  const tiers = product?.pricingTiers ?? {};
  const tierValue = tiers[tier];
  if (typeof tierValue === "number" && Number.isFinite(tierValue)) return tierValue;
  if (tier === "engineer") return product?.wholesalePrice ?? product?.retailPrice ?? 0;
  return product?.retailPrice ?? product?.wholesalePrice ?? 0;
};

export default function SalesPage() {
  const { t, dir } = useI18n();

  const { success: toastSuccess, error: toastError } = useToast();
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [inventoryByProduct, setInventoryByProduct] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingOrder, setViewingOrder] = useState<SalesOrder | null>(null);
  const [form, setForm] = useState({ companyId: "", customerId: "", engineerId: "", orderType: "MACHINE_SALE", paymentMethod: "CASH", isTaxInvoice: false, discount: "", discountType: "FIXED", taxRate: "14", notes: "" });
  const [itemRows, setItemRows] = useState<ItemRow[]>([{ productId: "", quantity: "", unitPrice: "", discount: "", priceTier: "newCustomer" }]);
  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  const filtered = orders.filter(order =>
    (!paymentFilter || order.paymentStatus === paymentFilter) &&
    (!typeFilter || order.orderType === typeFilter) &&
    (!companyFilter || order.companyId === companyFilter) &&
    inDateRange(order.orderDate || order.createdAt, dateFrom, dateTo) &&
    (matchesQuery(order.customer?.name, search) ||
      matchesQuery(order.id, search) ||
      matchesQuery(ORDER_TYPE_LABELS[order.orderType], search) ||
      matchesQuery(order.items.map(i => i.product?.name).join(" "), search))
  );
  const hasActiveFilters = paymentFilter !== "" || typeFilter !== "" || companyFilter !== "" || dateFrom !== "" || dateTo !== "" || search !== "";
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const exportSales = () => ({
    headers: [
      t("sales.orderNumber"),
      t("common.company"),
      t("sales.customer"),
      t("sales.orderType"),
      t("sales.total"),
      t("sales.discount"),
      t("sales.paymentMethod"),
      t("sales.paymentStatus"),
      t("common.date"),
    ],
    rows: filtered.map((order) => [
      order.id.slice(0, 8),
      order.company?.name || companies.find((c) => c.id === order.companyId)?.name || "",
      order.customer.name,
      ORDER_TYPE_LABELS[order.orderType] || order.orderType,
      String(order.total),
      String(order.discount),
      PAYMENT_METHOD_LABELS[order.paymentMethod] || order.paymentMethod,
      PAYMENT_STATUS_LABELS[order.paymentStatus] || order.paymentStatus,
      new Date(order.orderDate || order.createdAt).toISOString().slice(0, 10),
    ]),
  });

  const fetchData = async () => {
    try {
      const [sRes, cRes, coRes, eRes, inventoryRes] = await Promise.all([
        fetch("/api/sales"),
        fetch("/api/customers"),
        fetch("/api/companies"),
        fetch("/api/engineers"),
        fetch("/api/inventory?catalog=true")
      ]);
      const ordersData = await sRes.json();
      const customersData = await cRes.json();
      const companiesData = await coRes.json();
      const engineersData = await eRes.json();
      const inventoryData = await inventoryRes.json();
      setOrders(Array.isArray(ordersData) ? ordersData : []);
      setCustomers(Array.isArray(customersData) ? customersData : []);
      setCompanies(Array.isArray(companiesData) ? companiesData : []);
      setEngineers(Array.isArray(engineersData) ? engineersData : []);
      const catalogProducts = Array.isArray(inventoryData.products) ? inventoryData.products : [];
      setProducts(catalogProducts);
      const stockMap: Record<string, number> = {};
      for (const entry of Array.isArray(inventoryData.inventory) ? inventoryData.inventory : []) {
        stockMap[entry.productId] = (stockMap[entry.productId] ?? 0) + Number(entry.quantity || 0);
      }
      setInventoryByProduct(stockMap);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const updateItemRow = (index: number, next: Partial<ItemRow>) => {
    setItemRows((current) => current.map((row, rowIndex) => {
      if (rowIndex !== index) return row;
      const merged = { ...row, ...next };
      const selectedProduct = products.find((product) => product.id === merged.productId);
      if (merged.productId && selectedProduct) {
        const chosenTier = merged.priceTier || "newCustomer";
        merged.unitPrice = String(getProductTierPrice(selectedProduct, chosenTier));
      }
      return merged;
    }));
  };

  const openEdit = (order: SalesOrder) => {
    setEditingId(order.id);
    setForm({
      companyId: order.companyId,
      customerId: order.customerId,
      engineerId: order.engineerId || "",
      orderType: order.orderType,
      paymentMethod: order.paymentMethod,
      isTaxInvoice: order.taxRate > 0,
      discount: String(order.discount),
      discountType: order.discountType,
      taxRate: String(order.taxRate),
      notes: order.notes || "",
    });
    setItemRows(
      order.items.length > 0
        ? order.items.map((item) => ({
            productId: item.productId,
            quantity: String(item.quantity),
            unitPrice: String(item.unitPrice),
            discount: String(item.discount),
            priceTier: "newCustomer",
          }))
        : [{ productId: "", quantity: "", unitPrice: "", discount: "", priceTier: "newCustomer" }]
    );
    setShowForm(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const items = itemRows
      .filter(row => row.productId && row.quantity && row.unitPrice)
      .map(row => ({ productId: row.productId, quantity: Number(row.quantity), unitPrice: Number(row.unitPrice), discount: Number(row.discount) || 0, priceTier: row.priceTier }));
    if (!items.length) { toastError(t("errors.INVALID_SALE_ITEMS")); return; }
    const safeTaxRate = form.isTaxInvoice ? 14 : (parseFloat(form.taxRate) || 0);
    const response = await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        engineerId: form.engineerId || undefined,
        discount: parseFloat(form.discount) || 0,
        taxRate: safeTaxRate,
        orderDate: new Date().toISOString(),
        items,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { toastError(apiErrorMessage(data, t)); return; }
    setForm({ companyId: "", customerId: "", engineerId: "", orderType: "MACHINE_SALE", paymentMethod: "CASH", isTaxInvoice: false, discount: "", discountType: "FIXED", taxRate: "14", notes: "" });
    setItemRows([{ productId: "", quantity: "", unitPrice: "", discount: "", priceTier: "newCustomer" }]);
    setEditingId(null);
    setShowForm(false);
    fetchData();
    toastSuccess(t("common.savedSuccessfully"));
  };

  return (
    <div dir={dir} className="space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium tracking-[0.2em] text-sky-600 uppercase">ERP</p>
          <h1 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl lg:text-3xl">{t("sales.title")}</h1>
        </div>
        <button onClick={() => setShowForm(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"><Plus size={16} />{t("sales.addOrder")}</button>
      </div>

      <FormModal open={showForm} onClose={() => { setShowForm(false); setEditingId(null); }} title={editingId ? "تعديل فاتورة بيع" : t("sales.addOrder")} wide>
        <form onSubmit={handleCreate} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5"><label className="block text-sm font-medium text-slate-700">{t("companies.selectCompany")}</label><select value={form.companyId} onChange={(e) => setForm({ ...form, companyId: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500" required><option value="">{t("companies.selectCompany")}</option>{companies.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}</select></div>
            <div className="space-y-1.5"><label className="block text-sm font-medium text-slate-700">{t("sales.selectCustomer")}</label><select value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500" required><option value="">{t("sales.selectCustomer")}</option>{customers.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}</select></div>
            <div className="space-y-1.5"><label className="block text-sm font-medium text-slate-700">المهندس (اختياري)</label><select value={form.engineerId} onChange={(e) => setForm({ ...form, engineerId: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="">المهندس (اختياري)</option>{engineers.map((engineer) => (<option key={engineer.id} value={engineer.id}>{engineer.name}</option>))}</select></div>
            <div className="space-y-1.5"><label className="block text-sm font-medium text-slate-700">نوع الطلب</label><select value={form.orderType} onChange={(e) => setForm({ ...form, orderType: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="MACHINE_SALE">{ORDER_TYPE_LABELS.MACHINE_SALE}</option><option value="SPARE_PART_SALE">{ORDER_TYPE_LABELS.SPARE_PART_SALE}</option></select></div>
            <div className="space-y-1.5"><label className="block text-sm font-medium text-slate-700">طريقة الدفع</label><select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="CASH">{PAYMENT_METHOD_LABELS.CASH}</option><option value="CREDIT">{PAYMENT_METHOD_LABELS.CREDIT}</option><option value="INSTALLMENT">{PAYMENT_METHOD_LABELS.INSTALLMENT}</option><option value="MIXED">{PAYMENT_METHOD_LABELS.MIXED}</option></select></div>
            <div className="space-y-1.5"><label className="block text-sm font-medium text-slate-700">الضريبة</label><div className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2.5"><input id="isTaxInvoice" type="checkbox" checked={form.isTaxInvoice} onChange={(e) => setForm({ ...form, isTaxInvoice: e.target.checked, taxRate: e.target.checked ? "14" : "0" })} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" /><label htmlFor="isTaxInvoice" className="text-sm font-medium text-slate-700">فاتورة ضريبية</label>{form.isTaxInvoice && <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">14%</span>}</div></div>
            {form.isTaxInvoice && <div className="space-y-1.5"><label className="block text-sm font-medium text-slate-700">{t("sales.taxRate")}</label><input type="number" min="0" step="0.01" placeholder={t("sales.taxRate")} value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5"><label className="block text-sm font-medium text-slate-700">{t("sales.discount")}</label><div className="flex gap-2"><input type="number" placeholder={t("sales.discount")} value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500" /><select value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="FIXED">{t("sales.discountTypeFixed")}</option><option value="PERCENTAGE">{t("sales.discountTypePercent")}</option></select></div></div>
          </div>

          <div className="space-y-1.5"><label className="block text-sm font-medium text-slate-700">{t("common.notes")}</label><textarea placeholder={t("common.notes")} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500" rows={2} /></div>

          <div className="rounded-lg border border-gray-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold text-slate-700">{t("sales.items")}</h3><button type="button" onClick={() => setItemRows([...itemRows, { productId: "", quantity: "", unitPrice: "", discount: "", priceTier: "newCustomer" }])} className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800"><Plus size={16} />{t("purchases.addRow")}</button></div>
            <div className="space-y-3">{itemRows.map((row, index) => {
              const selectedProduct = products.find((product) => product.id === row.productId);
              const availableQty = row.productId ? inventoryByProduct[row.productId] ?? 0 : 0;
              const rowPrice = selectedProduct ? getProductTierPrice(selectedProduct, row.priceTier || "newCustomer") : 0;
              return (
                <div key={index} className="grid gap-2 rounded-lg border border-gray-200 bg-white p-3 sm:grid-cols-[1.2fr_120px_120px_140px_120px_auto]">
                  <div>
                    <select value={row.productId} onChange={(e) => updateItemRow(index, { productId: e.target.value, priceTier: row.priceTier || "newCustomer" })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                      <option value="">{t("purchases.selectProduct")}</option>
                      {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                    </select>
                    {selectedProduct && (<div className="mt-1 text-[11px] text-slate-500">السعر: {rowPrice.toLocaleString()} · المتاح: {availableQty}</div>)}
                  </div>
                  <select value={row.priceTier} onChange={(e) => updateItemRow(index, { priceTier: e.target.value, unitPrice: String(getProductTierPrice(selectedProduct || undefined, e.target.value)) })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="legacyCustomer">عميل قديم</option><option value="newCustomer">عميل جديد</option><option value="jumlaMachines">شركة جملة آلات</option><option value="jumlaParts">شركة جملة قطع غيار</option><option value="sectori">شركة قطاعي</option><option value="engineer">مهندس</option></select>
                  <input type="number" min="1" required placeholder={t("sales.qty")} value={row.quantity} onChange={(e) => updateItemRow(index, { quantity: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <input type="number" min="0" step="0.01" required placeholder={t("sales.unitPrice")} value={row.unitPrice} onChange={(e) => updateItemRow(index, { unitPrice: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <input type="number" min="0" step="0.01" placeholder={t("sales.discount")} value={row.discount} onChange={(e) => updateItemRow(index, { discount: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  {itemRows.length > 1 && <button type="button" onClick={() => setItemRows(itemRows.filter((_, i) => i !== index))} className="rounded-lg border border-red-200 bg-red-50 px-2 text-red-600 transition hover:bg-red-100">×</button>}
                </div>
              );
            })}</div>
          </div>

          <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"><X size={16} className="ms-1 inline-block" />{t("common.cancel")}</button>
            <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"><Save size={16} />{t("common.save")}</button>
          </div>
        </form>
      </FormModal>

      {viewingOrder && (
        <FormModal open={!!viewingOrder} onClose={() => setViewingOrder(null)} title="تفاصيل فاتورة بيع" wide>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div><span className="text-xs font-medium text-gray-500">{t("sales.orderNumber")}</span><p className="mt-1 text-sm font-medium text-slate-900">{viewingOrder.id.slice(0, 8)}</p></div>
              <div><span className="text-xs font-medium text-gray-500">{t("common.company")}</span><p className="mt-1 text-sm text-slate-900">{viewingOrder.company?.name || companies.find(c => c.id === viewingOrder.companyId)?.name || "—"}</p></div>
              <div><span className="text-xs font-medium text-gray-500">{t("sales.customer")}</span><p className="mt-1 text-sm text-slate-900">{viewingOrder.customer.name}</p></div>
              <div><span className="text-xs font-medium text-gray-500">{t("sales.orderType")}</span><p className="mt-1 text-sm text-slate-900">{ORDER_TYPE_LABELS[viewingOrder.orderType] || viewingOrder.orderType}</p></div>
              <div><span className="text-xs font-medium text-gray-500">{t("sales.total")}</span><p className="mt-1 text-sm font-semibold text-slate-900">{viewingOrder.total.toLocaleString()}</p></div>
              <div><span className="text-xs font-medium text-gray-500">{t("sales.discount")}</span><p className="mt-1 text-sm text-slate-900">{viewingOrder.discount > 0 ? `${viewingOrder.discount} (${viewingOrder.discountType === "FIXED" ? t("sales.discountTypeFixed") : t("sales.discountTypePercent")})` : "-"}</p></div>
              <div><span className="text-xs font-medium text-gray-500">{t("sales.paymentMethod")}</span><p className="mt-1 text-sm text-slate-900">{PAYMENT_METHOD_LABELS[viewingOrder.paymentMethod] || viewingOrder.paymentMethod}</p></div>
              <div><span className="text-xs font-medium text-gray-500">{t("sales.paymentStatus")}</span><p className="mt-1"><span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${paymentStatusColors[viewingOrder.paymentStatus] || ""}`}>{PAYMENT_STATUS_LABELS[viewingOrder.paymentStatus] || viewingOrder.paymentStatus}</span></p></div>
              <div><span className="text-xs font-medium text-gray-500">{t("common.date")}</span><p className="mt-1 text-sm text-slate-900">{new Date(viewingOrder.orderDate || viewingOrder.createdAt).toLocaleDateString("ar-EG")}</p></div>
              {viewingOrder.engineer && <div><span className="text-xs font-medium text-gray-500">المهندس</span><p className="mt-1 text-sm text-slate-900">{viewingOrder.engineer.name}</p></div>}
              {viewingOrder.notes && <div className="md:col-span-2"><span className="text-xs font-medium text-gray-500">{t("common.notes")}</span><p className="mt-1 text-sm text-slate-900">{viewingOrder.notes}</p></div>}
            </div>
            {viewingOrder.items.length > 0 && (
              <div className="rounded-lg border border-gray-200 bg-slate-50 p-4">
                <h3 className="mb-3 text-sm font-semibold text-slate-700">{t("sales.items")}</h3>
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="px-3 py-2 text-start text-xs font-medium text-gray-500">{t("sales.product")}</th>
                      <th className="px-3 py-2 text-start text-xs font-medium text-gray-500">{t("sales.qty")}</th>
                      <th className="px-3 py-2 text-start text-xs font-medium text-gray-500">{t("sales.unitPrice")}</th>
                      <th className="px-3 py-2 text-start text-xs font-medium text-gray-500">{t("sales.discount")}</th>
                      <th className="px-3 py-2 text-start text-xs font-medium text-gray-500">{t("sales.subtotal")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {viewingOrder.items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-3 py-2 text-sm">{item.product.name}</td>
                        <td className="px-3 py-2 text-sm">{item.quantity}</td>
                        <td className="px-3 py-2 text-sm">{item.unitPrice.toLocaleString()}</td>
                        <td className="px-3 py-2 text-sm">{item.discount > 0 ? item.discount.toLocaleString() : "-"}</td>
                        <td className="px-3 py-2 text-sm font-medium">{(item.quantity * item.unitPrice - item.discount).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </FormModal>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-200 p-4 md:flex-row md:items-center md:flex-wrap">
          <div className="min-w-[220px] flex-1"><SearchInput value={search} onChange={setSearch} placeholder={t("sales.searchPlaceholder")} /></div>
          <FilterSelect value={paymentFilter} onChange={(v) => { setPaymentFilter(v); setPage(1); }} options={Object.entries(PAYMENT_STATUS_LABELS).map(([value, label]) => ({ value, label }))} allLabel={`${t("sales.paymentStatus")} — ${t("common.all")}`} className="md:w-40" />
          <FilterSelect value={typeFilter} onChange={(v) => { setTypeFilter(v); setPage(1); }} options={Object.entries(ORDER_TYPE_LABELS).map(([value, label]) => ({ value, label }))} allLabel={`${t("sales.typeFilter")} — ${t("common.all")}`} className="md:w-40" />
          <FilterSelect value={companyFilter} onChange={(v) => { setCompanyFilter(v); setPage(1); }} options={companies.map((c) => ({ value: c.id, label: c.name }))} allLabel={`${t("common.company")} — ${t("common.all")}`} className="md:w-40" />
          <DateRangeFilter from={dateFrom} to={dateTo} onFromChange={(v) => { setDateFrom(v); setPage(1); }} onToChange={(v) => { setDateTo(v); setPage(1); }} />
          {hasActiveFilters && (<button onClick={() => { setSearch(""); setPaymentFilter(""); setTypeFilter(""); setCompanyFilter(""); setDateFrom(""); setDateTo(""); }} className="text-sm text-gray-500 underline transition hover:text-gray-700">{t("common.resetFilters")}</button>)}
          <div className="md:ms-auto"><ExportButton filename="sales-orders" getExport={exportSales} disabled={filtered.length === 0} /></div>
        </div>
        {loading ? (
          <div className="flex min-h-[320px] w-full items-center justify-center px-4 py-8">
            <PrinterLoader size="md" label={t("common.loading")} />
          </div>
        )
        : orders.length === 0 ? (
          <div className="flex min-h-[200px] items-center justify-center">
            <p className="text-sm text-gray-400">{t("common.noData")}</p>
          </div>
        )
        : filtered.length === 0 ? (
          <div className="flex min-h-[200px] items-center justify-center">
            <p className="text-sm text-gray-400">{t("common.noData")}</p>
          </div>
        )
        : (
          <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-start text-sm font-medium text-gray-500">{t("sales.orderNumber")}</th>
                  <th className="px-4 py-3 text-start text-sm font-medium text-gray-500">{t("common.company")}</th>
                  <th className="px-4 py-3 text-start text-sm font-medium text-gray-500">{t("sales.customer")}</th>
                  <th className="px-4 py-3 text-start text-sm font-medium text-gray-500">{t("sales.orderType")}</th>
                  <th className="px-4 py-3 text-start text-sm font-medium text-gray-500">{t("sales.total")}</th>
                  <th className="px-4 py-3 text-start text-sm font-medium text-gray-500">{t("sales.discount")}</th>
                  <th className="px-4 py-3 text-start text-sm font-medium text-gray-500">{t("sales.paymentMethod")}</th>
                  <th className="px-4 py-3 text-start text-sm font-medium text-gray-500">{t("sales.paymentStatus")}</th>
                  <th className="px-4 py-3 text-start text-sm font-medium text-gray-500">{t("common.date")}</th>
                  <th className="px-4 py-3 text-start text-sm font-medium text-gray-500"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paged.map((order) => (
                  <Fragment key={order.id}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium">{order.id.slice(0, 8)}</td>
                      <td className="px-4 py-3 text-sm">{order.company?.name || companies.find(c => c.id === order.companyId)?.name || "—"}</td>
                      <td className="px-4 py-3 text-sm">{order.customer.name}</td>
                      <td className="px-4 py-3 text-sm">{ORDER_TYPE_LABELS[order.orderType] || order.orderType}</td>
                      <td className="px-4 py-3 text-sm">{order.total.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm">{order.discount > 0 ? `${order.discount} (${order.discountType === "FIXED" ? t("sales.discountTypeFixed") : t("sales.discountTypePercent")})` : "-"}</td>
                      <td className="px-4 py-3 text-sm">{PAYMENT_METHOD_LABELS[order.paymentMethod] || order.paymentMethod}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${paymentStatusColors[order.paymentStatus] || ""}`}>
                          {PAYMENT_STATUS_LABELS[order.paymentStatus] || order.paymentStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{new Date(order.orderDate || order.createdAt).toLocaleDateString("ar-EG")}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={(e) => { e.stopPropagation(); setViewingOrder(order); }} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2 text-xs font-medium text-gray-600 transition hover:bg-gray-100" title={t("common.view")}>
                            <Eye size={14} />{t("common.view")}
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); openEdit(order); }} className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-2 text-xs font-medium text-blue-600 transition hover:bg-blue-100" title={t("common.edit")}>
                            <Pencil size={14} />{t("common.edit")}
                          </button>
                          {order.items.length > 0 && (
                            <button onClick={() => setExpandedId(expandedId === order.id ? null : order.id)} className="text-blue-600 hover:underline text-xs">
                              {expandedId === order.id ? t("sales.hide") : `${order.items.length} ${t("sales.items")}`}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expandedId === order.id && (
                      <tr key={`${order.id}-items`}>
                        <td colSpan={10} className="px-4 py-3 bg-gray-50">
                          <table className="w-full">
                            <thead>
                              <tr>
                                <th className="px-3 py-2 text-start text-xs font-medium text-gray-500">{t("sales.product")}</th>
                                <th className="px-3 py-2 text-start text-xs font-medium text-gray-500">{t("sales.qty")}</th>
                                <th className="px-3 py-2 text-start text-xs font-medium text-gray-500">{t("sales.unitPrice")}</th>
                                <th className="px-3 py-2 text-start text-xs font-medium text-gray-500">{t("sales.discount")}</th>
                                <th className="px-3 py-2 text-start text-xs font-medium text-gray-500">{t("sales.subtotal")}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {order.items.map((item) => (
                                <tr key={item.id}>
                                  <td className="px-3 py-2 text-sm">{item.product.name}</td>
                                  <td className="px-3 py-2 text-sm">{item.quantity}</td>
                                  <td className="px-3 py-2 text-sm">{item.unitPrice.toLocaleString()}</td>
                                  <td className="px-3 py-2 text-sm">{item.discount > 0 ? item.discount.toLocaleString() : "-"}</td>
                                  <td className="px-3 py-2 text-sm">{(item.quantity * item.unitPrice - item.discount).toLocaleString()}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination currentPage={safePage} totalPages={totalPages} onPageChange={setPage} totalItems={filtered.length} pageSize={PAGE_SIZE} />
          </>
        )}
      </div>
    </div>
  );
}
