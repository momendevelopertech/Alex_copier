"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/context";
import Pagination from "@/components/Pagination";
import SearchInput, { matchesQuery } from "@/components/SearchInput";
import FilterSelect from "@/components/FilterSelect";
import DateRangeFilter, { inDateRange } from "@/components/DateRangeFilter";
import { Plus, Save, X } from "lucide-react";
import ExportButton from "@/components/ExportButton";
import PrinterLoader from "@/components/PrinterLoader";
import FormModal from "@/components/FormModal";

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
  const { t, dir } = useI18n();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [form, setForm] = useState({ companyId: "", supplierId: "", notes: "" });
  const [itemRows, setItemRows] = useState<ItemRow[]>([{ productId: "", quantity: "", unitPrice: "" }]);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  const fetchData = async () => {
    try {
      const [pRes, sRes, prRes, coRes] = await Promise.all([fetch("/api/purchases"), fetch("/api/suppliers"), fetch("/api/inventory"), fetch("/api/companies")]);
      setOrders(await pRes.json());
      setSuppliers(await sRes.json());
      setCompanies(await coRes.json());
      const inv = await prRes.json();
      setProducts(Array.isArray(inv) ? inv.map((i: { product?: Product }) => i.product).filter((p): p is Product => Boolean(p)) : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = orders.filter(order =>
    (!statusFilter || order.status === statusFilter) &&
    (!companyFilter || order.companyId === companyFilter) &&
    (!supplierFilter || order.supplierId === supplierFilter) &&
    inDateRange(order.orderDate || order.createdAt, dateFrom, dateTo) &&
    (matchesQuery(order.supplier?.name, search) ||
      matchesQuery(order.company?.name, search) ||
      matchesQuery(STATUS_LABELS[order.status], search) ||
      matchesQuery(order.items.map(i => i.product?.name).join(" "), search))
  );
  const hasActiveFilters = statusFilter !== "" || companyFilter !== "" || supplierFilter !== "" || dateFrom !== "" || dateTo !== "" || search !== "";
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const exportPurchases = () => ({
    headers: [
      t("purchases.orderNumber"),
      t("common.company"),
      t("purchases.supplier"),
      t("common.status"),
      t("purchases.total"),
      t("common.date"),
    ],
    rows: filtered.map((order) => [
      order.id.slice(0, 8),
      order.company?.name || companies.find((c) => c.id === order.companyId)?.name || "",
      order.supplier.name,
      STATUS_LABELS[order.status] || order.status,
      String(order.total),
      new Date(order.orderDate || order.createdAt).toISOString().slice(0, 10),
    ]),
  });

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

  const inputClass = "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div dir={dir} className="space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium tracking-[0.2em] text-sky-600 uppercase">ERP</p>
          <h1 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl lg:text-3xl">{t("purchases.title")}</h1>
        </div>
        <button onClick={() => setShowForm(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"><Plus size={16} />{t("purchases.addOrder")}</button>
      </div>

      <FormModal open={showForm} onClose={() => setShowForm(false)} title={t("purchases.addOrder")}>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">{t("companies.selectCompany")}</label>
              <select value={form.companyId} onChange={(e) => setForm({ ...form, companyId: e.target.value })} className={inputClass} required>
                <option value="">{t("companies.selectCompany")}</option>
                {companies.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">{t("purchases.selectSupplier")}</label>
              <select value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })} className={inputClass} required>
                <option value="">{t("purchases.selectSupplier")}</option>
                {suppliers.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">{t("common.notes")}</label>
            <textarea placeholder={t("common.notes")} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputClass} rows={2} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm text-slate-700">{t("purchases.items")}</h3>
              <button type="button" onClick={addRow} className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800"><Plus size={16} />{t("purchases.addRow")}</button>
            </div>
            <div className="space-y-2">
              {itemRows.map((row, idx) => (
                <div key={idx} className="grid gap-2 rounded-lg border border-gray-200 bg-slate-50 p-3 sm:grid-cols-[1fr_100px_120px_auto]">
                  <select value={row.productId} onChange={(e) => updateRow(idx, "productId", e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">{t("purchases.selectProduct")}</option>
                    {products.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
                  </select>
                  <input type="number" placeholder={t("purchases.quantity")} value={row.quantity} onChange={(e) => updateRow(idx, "quantity", e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500" min="1" />
                  <input type="number" placeholder={t("purchases.unitPrice")} value={row.unitPrice} onChange={(e) => updateRow(idx, "unitPrice", e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500" min="0" step="0.01" />
                  {itemRows.length > 1 && (<button type="button" onClick={() => removeRow(idx)} className="rounded-lg border border-red-200 bg-red-50 px-2 text-red-600 transition hover:bg-red-100">×</button>)}
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"><X size={16} className="ms-1 inline-block" />{t("common.cancel")}</button>
            <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"><Save size={16} />{t("common.save")}</button>
          </div>
        </form>
      </FormModal>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-200 p-4 md:flex-row md:items-center md:flex-wrap">
          <div className="min-w-[220px] flex-1"><SearchInput value={search} onChange={setSearch} placeholder={t("purchases.searchPlaceholder")} /></div>
          <FilterSelect value={statusFilter} onChange={(v) => { setStatusFilter(v); setPage(1); }} options={Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))} allLabel={`${t("common.status")} — ${t("common.all")}`} className="md:w-40" />
          <FilterSelect value={companyFilter} onChange={(v) => { setCompanyFilter(v); setPage(1); }} options={companies.map((c) => ({ value: c.id, label: c.name }))} allLabel={`${t("common.company")} — ${t("common.all")}`} className="md:w-40" />
          <FilterSelect value={supplierFilter} onChange={(v) => { setSupplierFilter(v); setPage(1); }} options={suppliers.map((s) => ({ value: s.id, label: s.name }))} allLabel={`${t("purchases.supplier")} — ${t("common.all")}`} className="md:w-44" />
          <DateRangeFilter from={dateFrom} to={dateTo} onFromChange={(v) => { setDateFrom(v); setPage(1); }} onToChange={(v) => { setDateTo(v); setPage(1); }} />
          {hasActiveFilters && (
            <button onClick={() => { setSearch(""); setStatusFilter(""); setCompanyFilter(""); setSupplierFilter(""); setDateFrom(""); setDateTo(""); }} className="text-sm text-gray-500 hover:text-gray-700 underline">
              {t("common.resetFilters")}
            </button>
          )}
          <div className="md:ms-auto">
            <ExportButton filename="purchase-orders" getExport={exportPurchases} disabled={filtered.length === 0} />
          </div>
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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-start text-sm font-medium text-gray-500">{t("purchases.orderNumber")}</th>
                  <th className="px-4 py-3 text-start text-sm font-medium text-gray-500">{t("common.company")}</th>
                  <th className="px-4 py-3 text-start text-sm font-medium text-gray-500">{t("purchases.supplier")}</th>
                  <th className="px-4 py-3 text-start text-sm font-medium text-gray-500">{t("common.status")}</th>
                  <th className="px-4 py-3 text-start text-sm font-medium text-gray-500">{t("purchases.total")}</th>
                  <th className="px-4 py-3 text-start text-sm font-medium text-gray-500">{t("common.date")}</th>
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
        <Pagination currentPage={safePage} totalPages={totalPages} onPageChange={setPage} totalItems={filtered.length} pageSize={PAGE_SIZE} />
      </div>
    </div>
  );
}
