"use client";

import { Fragment, useEffect, useState } from "react";
import { useI18n } from "@/i18n/context";
import Pagination from "@/components/Pagination";
import SearchInput, { matchesQuery } from "@/components/SearchInput";
import FilterSelect from "@/components/FilterSelect";
import DateRangeFilter, { inDateRange } from "@/components/DateRangeFilter";
import { Plus, Save, X } from "lucide-react";
import ExportButton from "@/components/ExportButton";
import PrinterLoader from "@/components/PrinterLoader";
import { useToast } from "@/components/UIProvider";
import { apiErrorMessage } from "@/lib/api-client";

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Ù†Ù‚Ø¯ÙŠ",
  CREDIT: "Ø¢Ø¬Ù„",
  INSTALLMENT: "Ø£Ù‚Ø³Ø§Ø·",
  MIXED: "Ù…Ø®ØªÙ„Ø·",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Ù…Ø¹Ù„Ù‚",
  PARTIAL: "Ø¬Ø²Ø¦ÙŠ",
  PAID: "Ù…Ø¯ÙÙˆØ¹",
  OVERDUE: "Ù…ØªØ£Ø®Ø±",
};

const ORDER_TYPE_LABELS: Record<string, string> = {
  MACHINE_SALE: "Ø¨ÙŠØ¹ Ø¬Ù‡Ø§Ø²",
  SPARE_PART_SALE: "Ø¨ÙŠØ¹ Ù‚Ø·Ø¹ ØºÙŠØ§Ø±",
};

const paymentStatusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  PARTIAL: "bg-orange-100 text-orange-800",
  PAID: "bg-green-100 text-green-800",
  OVERDUE: "bg-red-100 text-red-800",
};

interface Customer { id: string; name: string; }
interface Company { id: string; name: string; }
interface Product { id: string; name: string; }
interface SalesItem { id: string; productId: string; quantity: number; unitPrice: number; discount: number; product: Product; }
interface SalesOrder {
  id: string; companyId: string; customerId: string; orderType: string; status: string; total: number; discount: number;
  discountType: string; taxRate: number; paymentMethod: string; paymentStatus: string;
  notes: string | null; orderDate: string; createdAt: string; customer: Customer; company?: Company; items: SalesItem[];
}
interface ItemRow { productId: string; quantity: string; unitPrice: string; discount: string; }

export default function SalesPage() {
  const { t, dir } = useI18n();
  
  const { success: toastSuccess, error: toastError } = useToast();
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState({ companyId: "", customerId: "", orderType: "MACHINE_SALE", paymentMethod: "CASH", discount: "", discountType: "FIXED", taxRate: "", notes: "" });
  const [itemRows, setItemRows] = useState<ItemRow[]>([{ productId: "", quantity: "", unitPrice: "", discount: "" }]);
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
      const [sRes, cRes, coRes, inventoryRes] = await Promise.all([fetch("/api/sales"), fetch("/api/customers"), fetch("/api/companies"), fetch("/api/inventory?catalog=true")]);
      setOrders(await sRes.json());
      setCustomers(await cRes.json());
      setCompanies(await coRes.json());
      const inventoryData = await inventoryRes.json();
      setProducts(Array.isArray(inventoryData.products) ? inventoryData.products : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const items = itemRows.filter(row => row.productId && row.quantity && row.unitPrice).map(row => ({ productId: row.productId, quantity: Number(row.quantity), unitPrice: Number(row.unitPrice), discount: Number(row.discount) || 0 }));
    if (!items.length) { toastError(t("errors.INVALID_SALE_ITEMS")); return; }
    const response = await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, discount: parseFloat(form.discount) || 0, taxRate: parseFloat(form.taxRate) || 0, orderDate: new Date().toISOString(), items }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { toastError(apiErrorMessage(data, t)); return; }
    setForm({ companyId: "", customerId: "", orderType: "MACHINE_SALE", paymentMethod: "CASH", discount: "", discountType: "FIXED", taxRate: "", notes: "" });
    setItemRows([{ productId: "", quantity: "", unitPrice: "", discount: "" }]);
    setShowForm(false);
    fetchData();
    toastSuccess(t("common.savedSuccessfully"));
  };

  return (
    <div dir={dir}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between mb-6">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">{t("sales.title")}</h1>
        <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"><Plus size={16} />{t("sales.addOrder")}</button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select value={form.companyId} onChange={(e) => setForm({ ...form, companyId: e.target.value })} className="border rounded-lg px-4 py-2" required>
              <option value="">{t("companies.selectCompany")}</option>
              {companies.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
            <select value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })} className="border rounded-lg px-4 py-2" required>
              <option value="">{t("sales.selectCustomer")}</option>
              {customers.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
            <select value={form.orderType} onChange={(e) => setForm({ ...form, orderType: e.target.value })} className="border rounded-lg px-4 py-2">
              <option value="MACHINE_SALE">{ORDER_TYPE_LABELS.MACHINE_SALE}</option>
              <option value="SPARE_PART_SALE">{ORDER_TYPE_LABELS.SPARE_PART_SALE}</option>
            </select>
            <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} className="border rounded-lg px-4 py-2">
              <option value="CASH">{PAYMENT_METHOD_LABELS.CASH}</option>
              <option value="CREDIT">{PAYMENT_METHOD_LABELS.CREDIT}</option>
              <option value="INSTALLMENT">{PAYMENT_METHOD_LABELS.INSTALLMENT}</option>
              <option value="MIXED">{PAYMENT_METHOD_LABELS.MIXED}</option>
            </select>
            <div className="flex gap-2">
              <input type="number" placeholder={t("sales.discount")} value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} className="border rounded-lg px-4 py-2 flex-1" />
              <select value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value })} className="border rounded-lg px-4 py-2">
                <option value="FIXED">{t("sales.discountTypeFixed")}</option>
                <option value="PERCENTAGE">{t("sales.discountTypePercent")}</option>
              </select>
            </div>
            <input type="number" placeholder={t("sales.taxRate")} value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: e.target.value })} className="border rounded-lg px-4 py-2" />
            <textarea placeholder={t("common.notes")} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="border rounded-lg px-4 py-2" rows={2} />
            <div className="md:col-span-2 rounded-lg border border-slate-200 p-4">
              <div className="mb-3 flex items-center justify-between"><h3 className="font-medium">{t("sales.items")}</h3><button type="button" onClick={() => setItemRows([...itemRows, { productId: "", quantity: "", unitPrice: "", discount: "" }])} className="text-sm text-blue-600 hover:underline"><Plus size={16} />{t("purchases.addRow")}</button></div>
              <div className="space-y-2">{itemRows.map((row, index) => <div key={index} className="grid gap-2 sm:grid-cols-[1fr_100px_130px_120px_auto]"><select value={row.productId} onChange={(e) => setItemRows(itemRows.map((item, i) => i === index ? { ...item, productId: e.target.value } : item))} className="border rounded-lg px-3 py-2" required><option value="">{t("purchases.selectProduct")}</option>{products.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}</select><input type="number" min="1" required placeholder={t("sales.qty")} value={row.quantity} onChange={(e) => setItemRows(itemRows.map((item, i) => i === index ? { ...item, quantity: e.target.value } : item))} className="border rounded-lg px-3 py-2" /><input type="number" min="0" step="0.01" required placeholder={t("sales.unitPrice")} value={row.unitPrice} onChange={(e) => setItemRows(itemRows.map((item, i) => i === index ? { ...item, unitPrice: e.target.value } : item))} className="border rounded-lg px-3 py-2" /><input type="number" min="0" step="0.01" placeholder={t("sales.discount")} value={row.discount} onChange={(e) => setItemRows(itemRows.map((item, i) => i === index ? { ...item, discount: e.target.value } : item))} className="border rounded-lg px-3 py-2" />{itemRows.length > 1 && <button type="button" onClick={() => setItemRows(itemRows.filter((_, i) => i !== index))} className="text-red-600">Ã—</button>}</div>)}</div>
            </div>
            <div className="md:col-span-2 flex gap-2">
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"><Save size={16} />{t("common.save")}</button>
              <button type="button" onClick={() => setShowForm(false)} className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 inline-flex items-center gap-2"><X size={16} />{t("common.cancel")}</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:flex-wrap">
          <SearchInput value={search} onChange={setSearch} placeholder={t("sales.searchPlaceholder")} />
          <FilterSelect value={paymentFilter} onChange={(v) => { setPaymentFilter(v); setPage(1); }} options={Object.entries(PAYMENT_STATUS_LABELS).map(([value, label]) => ({ value, label }))} allLabel={`${t("sales.paymentStatus")} â€” ${t("common.all")}`} className="md:w-40" />
          <FilterSelect value={typeFilter} onChange={(v) => { setTypeFilter(v); setPage(1); }} options={Object.entries(ORDER_TYPE_LABELS).map(([value, label]) => ({ value, label }))} allLabel={`${t("sales.typeFilter")} â€” ${t("common.all")}`} className="md:w-40" />
          <FilterSelect value={companyFilter} onChange={(v) => { setCompanyFilter(v); setPage(1); }} options={companies.map((c) => ({ value: c.id, label: c.name }))} allLabel={`${t("common.company")} â€” ${t("common.all")}`} className="md:w-40" />
          <DateRangeFilter from={dateFrom} to={dateTo} onFromChange={(v) => { setDateFrom(v); setPage(1); }} onToChange={(v) => { setDateTo(v); setPage(1); }} />
          {hasActiveFilters && (
            <button onClick={() => { setSearch(""); setPaymentFilter(""); setTypeFilter(""); setCompanyFilter(""); setDateFrom(""); setDateTo(""); }} className="text-sm text-gray-500 hover:text-gray-700 underline">
              {t("common.resetFilters")}
            </button>
          )}
          <div className="md:ms-auto">
            <ExportButton filename="sales-orders" getExport={exportSales} disabled={filtered.length === 0} />
          </div>
        </div>
        {loading ? (
          <div className="flex min-h-[320px] w-full items-center justify-center px-4 py-8">
            <PrinterLoader size="md" label={t("common.loading")} />
          </div>
        )
        : orders.length === 0 ? <p className="text-gray-500">{t("common.noData")}</p>
        : (
          <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("sales.orderNumber")}</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("common.company")}</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("sales.customer")}</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("sales.orderType")}</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("sales.total")}</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("sales.discount")}</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("sales.paymentMethod")}</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("sales.paymentStatus")}</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("common.date")}</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paged.map((order) => (
                  <Fragment key={order.id}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium">{order.id.slice(0, 8)}</td>
                      <td className="px-4 py-3 text-sm">{order.company?.name || companies.find(c => c.id === order.companyId)?.name || "â€”"}</td>
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
                        {order.items.length > 0 && (
                          <button onClick={() => setExpandedId(expandedId === order.id ? null : order.id)} className="text-blue-600 hover:underline text-xs">
                            {expandedId === order.id ? t("sales.hide") : `${order.items.length} ${t("sales.items")}`}
                          </button>
                        )}
                      </td>
                    </tr>
                    {expandedId === order.id && (
                      <tr key={`${order.id}-items`}>
                        <td colSpan={9} className="px-4 py-3 bg-gray-50">
                          <table className="w-full">
                            <thead>
                              <tr>
                                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">{t("sales.product")}</th>
                                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">{t("sales.qty")}</th>
                                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">{t("sales.unitPrice")}</th>
                                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">{t("sales.discount")}</th>
                                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">{t("sales.subtotal")}</th>
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
