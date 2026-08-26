"use client";

import { Fragment, useEffect, useState } from "react";
import { AddFormBoundary, useAutoAddForm } from "@/hooks/useAutoAddForm";
import { useI18n } from "@/i18n/context";
import Pagination from "@/components/Pagination";
import SearchInput, { matchesQuery } from "@/components/SearchInput";
import FilterSelect from "@/components/FilterSelect";
import DateRangeFilter, { inDateRange } from "@/components/DateRangeFilter";
import { Eye, FileText, Pencil, Plus, Printer, RotateCcw, Save, X } from "lucide-react";
import ExportButton from "@/components/ExportButton";
import PrinterLoader from "@/components/PrinterLoader";
import { useToast } from "@/components/UIProvider";
import { apiErrorMessage } from "@/lib/api-client";
import FormModal from "@/components/FormModal";
import SelectWithAdd from "@/components/SelectWithAdd";

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
interface ItemRow { 
  productId: string; 
  quantity: string; 
  unitPrice: string; 
  discount: string; 
  priceTier: string; 
  tradeIn?: {
    name: string;
    brand: string;
    condition: string;
    value: string;
    serialNumber: string;
  };
}

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
  const [formMode, setFormMode] = useState<"regular" | "tradeIn">("regular");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingOrder, setViewingOrder] = useState<SalesOrder | null>(null);
  const [form, setForm] = useState({ companyId: "", customerId: "", engineerId: "", orderType: "MACHINE_SALE", paymentMethod: "CASH", isTaxInvoice: false, discount: "", discountType: "FIXED", taxRate: "14", notes: "" });
  const [itemRows, setItemRows] = useState<ItemRow[]>([{ productId: "", quantity: "", unitPrice: "", discount: "", priceTier: "newCustomer" }]);
  const [tradeInProduct, setTradeInProduct] = useState<{ name: string; brand: string; condition: string; value: string; serialNumber: string }>({ name: "", brand: "", condition: "", value: "", serialNumber: "" });
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

  const autoAddOpen = useAutoAddForm();
  useEffect(() => {
    if (autoAddOpen) setShowForm(true);
  }, [autoAddOpen]);

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
    const hasTradeIn = order.items?.some((item: any) => item.tradeInProduct);
    setFormMode(hasTradeIn ? "tradeIn" : "regular");
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
        ? order.items.map((item: any) => ({
            productId: item.productId,
            quantity: String(item.quantity),
            unitPrice: String(item.unitPrice),
            discount: String(item.discount),
            priceTier: "newCustomer",
          }))
        : [{ productId: "", quantity: "", unitPrice: "", discount: "", priceTier: "newCustomer" }]
    );
    if (hasTradeIn) {
      const tradeInItem = order.items.find((item: any) => item.tradeInProduct);
      if (tradeInItem) {
        const tip = (tradeInItem as any).tradeInProduct;
        setTradeInProduct({
          name: tip?.name || "",
          brand: tip?.brand || "",
          condition: tip?.condition || "",
          value: String((tradeInItem as any).tradeInValue || ""),
          serialNumber: tip?.description?.replace("S/N: ", "") || "",
        });
      }
    } else {
      setTradeInProduct({ name: "", brand: "", condition: "", value: "", serialNumber: "" });
    }
    setShowForm(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const items = itemRows
      .filter(row => row.productId && row.quantity && row.unitPrice)
      .map(row => { 
        const useTopLevel = formMode === "tradeIn" && tradeInProduct.name && tradeInProduct.value;
        const tradeIn = useTopLevel ? {
          name: tradeInProduct.name,
          brand: tradeInProduct.brand || undefined,
          condition: tradeInProduct.condition || undefined,
          value: Number(tradeInProduct.value) || 0,
          serialNumber: tradeInProduct.serialNumber || undefined,
        } : row.tradeIn && row.tradeIn.name && row.tradeIn.value ? {
          name: row.tradeIn.name,
          brand: row.tradeIn.brand || undefined,
          condition: row.tradeIn.condition || undefined,
          value: Number(row.tradeIn.value) || 0,
          serialNumber: row.tradeIn.serialNumber || undefined,
        } : undefined;
        return {
          productId: row.productId, 
          quantity: Number(row.quantity), 
          unitPrice: Number(row.unitPrice), 
          discount: Number(row.discount) || 0, 
          priceTier: row.priceTier,
          tradeIn,
        };
      });
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
    setTradeInProduct({ name: "", brand: "", condition: "", value: "", serialNumber: "" });
    setEditingId(null);
    setFormMode("regular");
    setShowForm(false);
    fetchData();
    toastSuccess(t("common.savedSuccessfully"));
  };

  return (
    <div dir={dir} className="space-y-5">
      <AddFormBoundary />
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium tracking-[0.2em] text-sky-600 uppercase">ERP</p>
          <h1 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl lg:text-3xl">{t("sales.title")}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setFormMode("regular"); setShowForm(true); }} className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"><Plus size={16} />{t("sales.addOrder")}</button>
          <button onClick={() => { setFormMode("tradeIn"); setShowForm(true); }} className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600"><RotateCcw size={16} />إضافة فاتورة استبدال</button>
        </div>
      </div>

      <FormModal open={showForm} onClose={() => { setShowForm(false); setEditingId(null); }} title={editingId ? "تعديل فاتورة بيع" : formMode === "tradeIn" ? "إضافة فاتورة استبدال" : t("sales.addOrder")} wide>
        <form onSubmit={handleCreate} className="space-y-5">
          {formMode === "tradeIn" && (
            <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🔄</span>
                <p className="text-sm font-bold text-amber-800">بيانات المنتج المستبدل (القديم)</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-5">
                <input type="text" placeholder="اسم المنتج القديم *" value={tradeInProduct.name} onChange={(e) => setTradeInProduct({ ...tradeInProduct, name: e.target.value })} className="rounded-lg border border-amber-300 bg-white px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500" required />
                <input type="text" placeholder="الماركة" value={tradeInProduct.brand} onChange={(e) => setTradeInProduct({ ...tradeInProduct, brand: e.target.value })} className="rounded-lg border border-amber-300 bg-white px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500" />
                <select value={tradeInProduct.condition} onChange={(e) => setTradeInProduct({ ...tradeInProduct, condition: e.target.value })} className="rounded-lg border border-amber-300 bg-white px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500">
                  <option value="">الحالة</option>
                  <option value="excellent">ممتاز</option>
                  <option value="good">جيد</option>
                  <option value="fair">مقبول</option>
                  <option value="poor">ضعيف</option>
                </select>
                <input type="number" min="0" placeholder="قيمة الاستبدال *" value={tradeInProduct.value} onChange={(e) => setTradeInProduct({ ...tradeInProduct, value: e.target.value })} className="rounded-lg border border-amber-300 bg-white px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500" required />
                <input type="text" placeholder="الرقم التسلسلي (اختياري)" value={tradeInProduct.serialNumber} onChange={(e) => setTradeInProduct({ ...tradeInProduct, serialNumber: e.target.value })} className="rounded-lg border border-amber-300 bg-white px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5"><label className="block text-sm font-medium text-slate-700">{t("companies.selectCompany")}</label><select value={form.companyId} onChange={(e) => setForm({ ...form, companyId: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500" required><option value="">{t("companies.selectCompany")}</option>{companies.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}</select></div>
            <SelectWithAdd
              label={t("sales.customer")}
              value={form.customerId}
              onChange={(v) => setForm({ ...form, customerId: v })}
              options={customers.map((c) => ({ value: c.id, label: c.name }))}
              placeholder={t("sales.selectCustomer")}
              required
              quickAddTitle="إضافة عميل جديد"
              quickAddFields={[
                { key: "name", label: "اسم العميل", required: true },
                { key: "phone", label: "الهاتف", placeholder: "01xxxxxxxxx" },
                { key: "companyName", label: "اسم الشركة" },
                { key: "email", label: "البريد الإلكتروني", type: "email" },
                { key: "address", label: "العنوان" },
                { key: "city", label: "المدينة" },
                { key: "customerType", label: "نوع العميل", type: "select", options: [{ value: "INDIVIDUAL", label: "فرد" }, { value: "COMPANY", label: "شركة" }] },
                { key: "whatsapp", label: "واتساب" },
              ]}
              quickAddEndpoint="/api/customers"
              onQuickAddSuccess={(item) => {
                setCustomers((prev) => [...prev, item]);
                setForm((f) => ({ ...f, customerId: item.id }));
              }}
            />
            <div className="space-y-1.5"><label className="block text-sm font-medium text-slate-700">المهندس (اختياري)</label><select value={form.engineerId} onChange={(e) => setForm({ ...form, engineerId: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="">المهندس (اختياري)</option>{engineers.map((engineer) => (<option key={engineer.id} value={engineer.id}>{engineer.name}</option>))}</select></div>
            <div className="space-y-1.5"><label className="block text-sm font-medium text-slate-700">نوع الطلب</label><select value={form.orderType} onChange={(e) => setForm({ ...form, orderType: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="MACHINE_SALE">{ORDER_TYPE_LABELS.MACHINE_SALE}</option><option value="SPARE_PART_SALE">{ORDER_TYPE_LABELS.SPARE_PART_SALE}</option></select></div>
            <div className="space-y-1.5"><label className="block text-sm font-medium text-slate-700">طريقة الدفع</label><select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="CASH">{PAYMENT_METHOD_LABELS.CASH}</option><option value="CREDIT">{PAYMENT_METHOD_LABELS.CREDIT}</option><option value="INSTALLMENT">{PAYMENT_METHOD_LABELS.INSTALLMENT}</option><option value="MIXED">{PAYMENT_METHOD_LABELS.MIXED}</option></select></div>
            <div className="space-y-1.5"><label className="block text-sm font-medium text-slate-700">الضريبة</label><div className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2.5"><input id="isTaxInvoice" type="checkbox" checked={form.isTaxInvoice} onChange={(e) => setForm({ ...form, isTaxInvoice: e.target.checked, taxRate: e.target.checked ? "14" : "0" })} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" /><label htmlFor="isTaxInvoice" className="text-sm font-medium text-slate-700">فاتورة ضريبية</label>{form.isTaxInvoice && <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">14%</span>}</div></div>
            {form.isTaxInvoice && <div className="space-y-1.5"><label className="block text-sm font-medium text-slate-700">{t("sales.taxRate")}</label><input type="number" min="0" step="0.01" placeholder={t("sales.taxRate")} value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5"><label className="block text-sm font-medium text-slate-700">{t("sales.discount")}</label><div className="flex gap-2"><input type="number" placeholder={t("sales.discount")} value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500" /><select value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="FIXED">{t("sales.discountTypeFixed")}</option><option value="PERCENTAGE">{t("sales.discountTypePercent")}</option></select></div></div>
          </div>

          {(formMode === "tradeIn" || itemRows.some(row => row.tradeIn && row.tradeIn.value)) && (
            <div className="rounded-xl border border-amber-200 bg-gradient-to-l from-amber-50 to-white p-4">
              <h4 className="mb-3 text-sm font-bold text-amber-800">📊 ملخص الحسابات</h4>
              {(() => {
                const subtotal = itemRows.reduce((sum, row) => sum + (row.quantity ? Number(row.quantity) * Number(row.unitPrice) - (Number(row.discount) || 0) : 0), 0);
                const tradeInVal = formMode === "tradeIn" ? (Number(tradeInProduct.value) || 0) : itemRows.reduce((sum, row) => sum + (row.tradeIn?.value ? Number(row.tradeIn.value) : 0), 0);
                const afterTradeIn = Math.max(0, subtotal - tradeInVal);
                return (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-slate-600"><span>اجمالي المنتجات</span><span className="font-medium">{subtotal.toLocaleString("ar-EG")} ج.م</span></div>
                    {tradeInVal > 0 && (
                      <>
                        <div className="flex justify-between text-amber-700"><span>قيمة الاستبدال (الخصم)</span><span className="font-bold">- {tradeInVal.toLocaleString("ar-EG")} ج.م</span></div>
                        <div className="border-t border-amber-200 pt-2 flex justify-between text-slate-800 font-semibold"><span>المبلغ بعد خصم الاستبدال</span><span>{afterTradeIn.toLocaleString("ar-EG")} ج.م</span></div>
                      </>
                    )}
                    {tradeInVal === 0 && <div className="text-xs text-slate-400">لم يتم إدخال قيمة استبدال</div>}
                  </div>
                );
              })()}
            </div>
          )}

          <div className="space-y-1.5"><label className="block text-sm font-medium text-slate-700">{t("common.notes")}</label><textarea placeholder={t("common.notes")} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500" rows={2} /></div>

          <div className="rounded-lg border border-gray-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold text-slate-700">{t("sales.items")}</h3><button type="button" onClick={() => setItemRows([...itemRows, { productId: "", quantity: "", unitPrice: "", discount: "", priceTier: "newCustomer" }])} className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800"><Plus size={16} />{t("purchases.addRow")}</button></div>
            <div className="space-y-3">{itemRows.map((row, index) => {
              const selectedProduct = products.find((product) => product.id === row.productId);
              const availableQty = row.productId ? inventoryByProduct[row.productId] ?? 0 : 0;
              const rowPrice = selectedProduct ? getProductTierPrice(selectedProduct, row.priceTier || "newCustomer") : 0;
              return (
                <div key={index}>
                  <div className="grid gap-2 rounded-lg border border-gray-200 bg-white p-3 sm:grid-cols-[1.2fr_120px_120px_140px_120px_auto]">
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
                  
                  {formMode === "tradeIn" && row.tradeIn && (
                    <div className="mt-2 rounded-lg border border-dashed border-amber-300 bg-amber-50 p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-amber-800">🔄 بيانات الاستبدال لهذا المنتج</span>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-5">
                        <input type="text" placeholder="اسم المنتج القديم" value={row.tradeIn.name} onChange={(e) => updateItemRow(index, { tradeIn: { ...row.tradeIn!, name: e.target.value } })} className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500" />
                        <input type="text" placeholder="الماركة" value={row.tradeIn.brand} onChange={(e) => updateItemRow(index, { tradeIn: { ...row.tradeIn!, brand: e.target.value } })} className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500" />
                        <select value={row.tradeIn.condition} onChange={(e) => updateItemRow(index, { tradeIn: { ...row.tradeIn!, condition: e.target.value } })} className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500">
                          <option value="">الحالة</option>
                          <option value="excellent">ممتاز</option>
                          <option value="good">جيد</option>
                          <option value="fair">مقبول</option>
                          <option value="poor">ضعيف</option>
                        </select>
                        <input type="number" min="0" placeholder="قيمة الاستبدال" value={row.tradeIn.value} onChange={(e) => updateItemRow(index, { tradeIn: { ...row.tradeIn!, value: e.target.value } })} className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500" />
                        <input type="text" placeholder="الرقم التسلسلي (اختياري)" value={row.tradeIn.serialNumber} onChange={(e) => updateItemRow(index, { tradeIn: { ...row.tradeIn!, serialNumber: e.target.value } })} className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500" />
                      </div>
                    </div>
                  )}
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
                        <td className="px-3 py-2 text-sm">
                          {item.product.name}
                          {(item as any).tradeInProduct && (
                            <div className="mt-2 rounded-lg border border-dashed border-amber-300 bg-amber-50 p-2">
                              <div className="flex items-center gap-2 text-xs text-amber-700">
                                <span>🔄 استبدال:</span>
                                <span className="font-medium">{(item as any).tradeInProduct.name}</span>
                                {(item as any).tradeInProduct.brand && <span>({(item as any).tradeInProduct.brand})</span>}
                                {(item as any).tradeInValue > 0 && <span className="font-bold">- {(item as any).tradeInValue.toLocaleString()} ج.م</span>}
                              </div>
                            </div>
                          )}
                        </td>
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
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 md:flex-row md:items-center md:flex-wrap">
          <div className="w-full md:w-80 md:flex-none"><SearchInput value={search} onChange={setSearch} placeholder={t("sales.searchPlaceholder")} /></div>
          <FilterSelect value={paymentFilter} onChange={(v) => { setPaymentFilter(v); setPage(1); }} options={Object.entries(PAYMENT_STATUS_LABELS).map(([value, label]) => ({ value, label }))} allLabel={`${t("sales.paymentStatus")} — ${t("common.all")}`} className="md:w-40" />
          <FilterSelect value={typeFilter} onChange={(v) => { setTypeFilter(v); setPage(1); }} options={Object.entries(ORDER_TYPE_LABELS).map(([value, label]) => ({ value, label }))} allLabel={`${t("sales.typeFilter")} — ${t("common.all")}`} className="md:w-40" />
          <FilterSelect value={companyFilter} onChange={(v) => { setCompanyFilter(v); setPage(1); }} options={companies.map((c) => ({ value: c.id, label: c.name }))} allLabel={`${t("common.company")} — ${t("common.all")}`} className="md:w-40" />
          <DateRangeFilter from={dateFrom} to={dateTo} onFromChange={(v) => { setDateFrom(v); setPage(1); }} onToChange={(v) => { setDateTo(v); setPage(1); }} />
          {hasActiveFilters && (<button onClick={() => { setSearch(""); setPaymentFilter(""); setTypeFilter(""); setCompanyFilter(""); setDateFrom(""); setDateTo(""); }} className="text-sm text-gray-500 underline transition hover:text-gray-700">{t("common.resetFilters")}</button>)}
          <div className="md:ms-auto mt-2 md:mt-0"><ExportButton filename="sales-orders" getExport={exportSales} disabled={filtered.length === 0} /></div>
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
                      <td className="px-4 py-3 text-sm">
                        {order.total.toLocaleString()}
                        {(order as any).tradeInTotal > 0 && (
                          <div className="text-xs text-amber-600">🔄 -{(order as any).tradeInTotal.toLocaleString()} ج.م</div>
                        )}
                      </td>
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
                          <button onClick={(e) => { e.stopPropagation(); window.open(`/api/invoices?type=sale&id=${order.id}`, "_blank"); }} className="inline-flex items-center gap-1 rounded-lg border border-green-200 bg-green-50 px-2.5 py-2 text-xs font-medium text-green-600 transition hover:bg-green-100" title="طباعة الفاتورة">
                            <Printer size={14} />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); window.open(`/api/invoices?type=sale&id=${order.id}&format=receipt`, "_blank"); }} className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-xs font-medium text-emerald-600 transition hover:bg-emerald-100" title="طباعة الريسيت">
                            <FileText size={14} />
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
                                  <td className="px-3 py-2 text-sm">
                                    {item.product.name}
                                    {(item as any).tradeInProduct && (
                                      <div className="mt-1 rounded-lg border border-dashed border-amber-300 bg-amber-50 p-1.5">
                                        <div className="flex items-center gap-1 text-[11px] text-amber-700">
                                          <span>🔄 استبدال:</span>
                                          <span className="font-medium">{(item as any).tradeInProduct.name}</span>
                                          {(item as any).tradeInProduct.brand && <span>({(item as any).tradeInProduct.brand})</span>}
                                          {(item as any).tradeInValue > 0 && <span className="font-bold">- {(item as any).tradeInValue.toLocaleString()}</span>}
                                        </div>
                                      </div>
                                    )}
                                  </td>
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
