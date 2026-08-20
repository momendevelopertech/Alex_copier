"use client";

import { Fragment, useEffect, useState } from "react";
import { useI18n } from "@/i18n/context";
import Pagination from "@/components/Pagination";

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
interface Product { id: string; name: string; }
interface SalesItem { id: string; productId: string; quantity: number; unitPrice: number; discount: number; product: Product; }
interface SalesOrder {
  id: string; companyId: string; customerId: string; orderType: string; status: string; total: number; discount: number;
  discountType: string; taxRate: number; paymentMethod: string; paymentStatus: string;
  notes: string | null; orderDate: string; createdAt: string; customer: Customer; company?: Company; items: SalesItem[];
}

export default function SalesPage() {
  const { t } = useI18n();
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState({ companyId: "", customerId: "", orderType: "MACHINE_SALE", paymentMethod: "CASH", discount: "", discountType: "FIXED", taxRate: "", notes: "" });
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  const filtered = orders;
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const fetchData = async () => {
    setLoading(true);
    const [sRes, cRes, coRes] = await Promise.all([fetch("/api/sales"), fetch("/api/customers"), fetch("/api/companies")]);
    setOrders(await sRes.json());
    setCustomers(await cRes.json());
    setCompanies(await coRes.json());
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, discount: parseFloat(form.discount) || 0, taxRate: parseFloat(form.taxRate) || 0, items: [] }),
    });
    setForm({ companyId: "", customerId: "", orderType: "MACHINE_SALE", paymentMethod: "CASH", discount: "", discountType: "FIXED", taxRate: "", notes: "" });
    setShowForm(false);
    fetchData();
  };

  return (
    <div dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">{t("sales.title")}</h1>
        <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">{t("sales.addOrder")}</button>
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
            <div className="md:col-span-2 flex gap-2">
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
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} totalItems={filtered.length} pageSize={PAGE_SIZE} />
          </>
        )}
      </div>
    </div>
  );
}
