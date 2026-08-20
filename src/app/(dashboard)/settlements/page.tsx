"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/context";
import Pagination from "@/components/Pagination";

interface Company { id: string; name: string; }
interface Customer { id: string; name: string; }
interface Engineer { id: string; name: string; }
interface User { id: string; name: string; }
interface Settlement {
  id: string; settlementNumber: string; companyId: string; customerId: string | null; engineerId: string | null;
  amount: number; paymentMethod: string; reason: string; status: string; collectedBy: string;
  verifiedBy: string | null; createdAt: string; company: Company; customer: Customer | null;
  engineer: Engineer | null; collector: User; verifier: User | null;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = { CASH: "نقدي", CREDIT: "آجل", INSTALLMENT: "أقساط", MIXED: "مختلط" };
const STATUS_LABELS: Record<string, string> = { INITIAL: "أولي", VERIFIED: "تم التحقق" };

export default function SettlementsPage() {
  const { t } = useI18n();
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ companyId: "", customerId: "", engineerId: "", amount: "", paymentMethod: "CASH", reason: "" });
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  const fetchData = async () => {
    setLoading(true);
    const [sRes, coRes, cuRes, eRes] = await Promise.all([fetch("/api/settlements"), fetch("/api/companies"), fetch("/api/customers"), fetch("/api/engineers")]);
    setSettlements(await sRes.json()); setCompanies(await coRes.json()); setCustomers(await cuRes.json()); setEngineers(await eRes.json());
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/settlements", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, amount: parseFloat(form.amount) || 0, customerId: form.customerId || undefined, engineerId: form.engineerId || undefined, collectedBy: "" }),
    });
    setForm({ companyId: "", customerId: "", engineerId: "", amount: "", paymentMethod: "CASH", reason: "" });
    setShowForm(false); fetchData();
  };

  const handleVerify = async (id: string) => {
    await fetch(`/api/settlements/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "VERIFIED" }) });
    fetchData();
  };

  const filtered = settlements;
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">{t("settlements.title")}</h1>
        <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">{t("settlements.newSettlement")}</button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select value={form.companyId} onChange={(e) => setForm({ ...form, companyId: e.target.value })} className="border rounded-lg px-4 py-2" required>
              <option value="">{t("settlements.selectCompany")}</option>
              {companies.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
            <select value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })} className="border rounded-lg px-4 py-2">
              <option value="">{t("settlements.selectCustomer")}</option>
              {customers.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
            <select value={form.engineerId} onChange={(e) => setForm({ ...form, engineerId: e.target.value })} className="border rounded-lg px-4 py-2">
              <option value="">{t("settlements.selectEngineer")}</option>
              {engineers.map((e) => (<option key={e.id} value={e.id}>{e.name}</option>))}
            </select>
            <input type="number" placeholder={t("settlements.amount")} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="border rounded-lg px-4 py-2" required min="0" step="0.01" />
            <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} className="border rounded-lg px-4 py-2">
              <option value="CASH">{PAYMENT_METHOD_LABELS.CASH}</option>
              <option value="CREDIT">{PAYMENT_METHOD_LABELS.CREDIT}</option>
              <option value="INSTALLMENT">{PAYMENT_METHOD_LABELS.INSTALLMENT}</option>
              <option value="MIXED">{PAYMENT_METHOD_LABELS.MIXED}</option>
            </select>
            <input type="text" placeholder={t("settlements.reason")} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="border rounded-lg px-4 py-2" required />
            <div className="md:col-span-2 flex gap-2">
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">{t("common.save")}</button>
              <button type="button" onClick={() => setShowForm(false)} className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400">{t("common.cancel")}</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-md p-6">
        {loading ? <p className="text-gray-500">{t("common.loading")}</p>
        : settlements.length === 0 ? <p className="text-gray-500">{t("common.noData")}</p>
        : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("settlements.number")}</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("common.company")}</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("settlements.amount")}</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("settlements.paymentMethod")}</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("settlements.reason")}</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("settlements.status")}</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("settlements.collectedBy")}</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("common.date")}</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paged.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium">{s.settlementNumber}</td>
                      <td className="px-4 py-3 text-sm">{s.company.name}</td>
                      <td className="px-4 py-3 text-sm">{s.amount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm">{PAYMENT_METHOD_LABELS[s.paymentMethod] || s.paymentMethod}</td>
                      <td className="px-4 py-3 text-sm">{s.reason}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${s.status === "VERIFIED" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                          {s.status === "VERIFIED" && "✓ "}{STATUS_LABELS[s.status] || s.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{s.collector.name}</td>
                      <td className="px-4 py-3 text-sm">{new Date(s.createdAt).toLocaleDateString("ar-EG")}</td>
                      <td className="px-4 py-3 text-sm">
                        {s.status === "INITIAL" && (<button onClick={() => handleVerify(s.id)} className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700">{t("common.verify")}</button>)}
                        {s.status === "VERIFIED" && s.verifier && (<span className="text-green-600 text-xs">{t("settlements.by")} {s.verifier.name}</span>)}
                      </td>
                    </tr>
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
