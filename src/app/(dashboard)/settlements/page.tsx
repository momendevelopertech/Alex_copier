"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useI18n } from "@/i18n/context";
import Pagination from "@/components/Pagination";
import SearchInput, { matchesQuery } from "@/components/SearchInput";
import FilterSelect from "@/components/FilterSelect";
import FormModal from "@/components/FormModal";
import { CheckCircle2, Plus, Save } from "lucide-react";
import DateRangeFilter, { inDateRange } from "@/components/DateRangeFilter";
import ExportButton from "@/components/ExportButton";
import PrinterLoader from "@/components/PrinterLoader";
import { useToast } from "@/components/UIProvider";
import { useUrlParams, useSearchWithDefault } from "@/hooks/useUrlParams";
import { apiErrorMessage } from "@/lib/api-client";

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

const CAN_VERIFY_ROLES = ["GENERAL_MANAGER", "ACCOUNTANT", "COMPANY_MANAGER"];

export default function SettlementsPage() {
  const { t, dir } = useI18n();
  
  const { success: toastSuccess, error: toastError } = useToast();
  const { data: session } = useSession();
  const canVerify = CAN_VERIFY_ROLES.includes(session?.user?.role ?? "");
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const urlParams = useUrlParams(["focus"]);
  const focusedSettlement = urlParams.focus ? settlements.find((s) => s.id === urlParams.focus) : undefined;
  const [search, setSearchInput] = useSearchWithDefault(focusedSettlement?.settlementNumber ?? "");
  const [statusFilter, setStatusFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [form, setForm] = useState({ companyId: "", customerId: "", engineerId: "", amount: "", paymentMethod: "CASH", reason: "" });
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  const fetchData = async () => {
    try {
      const [sRes, coRes, cuRes, eRes] = await Promise.all([fetch("/api/settlements"), fetch("/api/companies"), fetch("/api/customers"), fetch("/api/engineers")]);
      setSettlements(await sRes.json()); setCompanies(await coRes.json()); setCustomers(await cuRes.json()); setEngineers(await eRes.json());
    } finally {
      setLoading(false);
    }
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
    const res = await fetch(`/api/settlements/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "VERIFIED" }) });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toastError(apiErrorMessage(data, t));
    } else {
      toastSuccess(t("common.savedSuccessfully"));
    }
    fetchData();
  };

  const filtered = settlements.filter(settlement =>
    (!statusFilter || settlement.status === statusFilter) &&
    (!companyFilter || settlement.companyId === companyFilter) &&
    inDateRange(settlement.createdAt, dateFrom, dateTo) &&
    (matchesQuery(settlement.settlementNumber, search) ||
      matchesQuery(settlement.reason, search) ||
      matchesQuery(settlement.customer?.name, search) ||
      matchesQuery(settlement.engineer?.name, search) ||
      matchesQuery(settlement.collector?.name, search))
  );
  const hasActiveFilters = statusFilter !== "" || companyFilter !== "" || dateFrom !== "" || dateTo !== "" || search !== "";
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const exportSettlements = () => ({
    headers: [
      t("settlements.number"),
      t("common.company"),
      t("settlements.amount"),
      t("settlements.paymentMethod"),
      t("settlements.reason"),
      t("settlements.status"),
      t("settlements.collectedBy"),
      t("common.date"),
    ],
    rows: filtered.map((s) => [
      s.settlementNumber,
      s.company.name,
      String(s.amount),
      PAYMENT_METHOD_LABELS[s.paymentMethod] || s.paymentMethod,
      s.reason,
      STATUS_LABELS[s.status] || s.status,
      s.collector?.name || "",
      new Date(s.createdAt).toISOString().slice(0, 10),
    ]),
  });

  const INPUT = "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div dir={dir} className="space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium tracking-[0.2em] text-sky-600 uppercase">ERP</p>
          <h1 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl lg:text-3xl">{t("settlements.title")}</h1>
        </div>
        <button onClick={() => setShowForm(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"><Plus size={16} />{t("settlements.newSettlement")}</button>
      </div>

      <FormModal open={showForm} onClose={() => setShowForm(false)} title={t("settlements.newSettlement")}>
        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t("common.company")}</label>
            <select value={form.companyId} onChange={(e) => setForm({ ...form, companyId: e.target.value })} className={INPUT} required>
              <option value="">{t("settlements.selectCompany")}</option>
              {companies.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t("common.customer")}</label>
            <select value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })} className={INPUT}>
              <option value="">{t("settlements.selectCustomer")}</option>
              {customers.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t("common.engineer")}</label>
            <select value={form.engineerId} onChange={(e) => setForm({ ...form, engineerId: e.target.value })} className={INPUT}>
              <option value="">{t("settlements.selectEngineer")}</option>
              {engineers.map((e) => (<option key={e.id} value={e.id}>{e.name}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t("settlements.amount")}</label>
            <input type="number" placeholder={t("settlements.amount")} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={INPUT} required min="0" step="0.01" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t("settlements.paymentMethod")}</label>
            <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} className={INPUT}>
              <option value="CASH">{PAYMENT_METHOD_LABELS.CASH}</option>
              <option value="CREDIT">{PAYMENT_METHOD_LABELS.CREDIT}</option>
              <option value="INSTALLMENT">{PAYMENT_METHOD_LABELS.INSTALLMENT}</option>
              <option value="MIXED">{PAYMENT_METHOD_LABELS.MIXED}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t("settlements.reason")}</label>
            <input type="text" placeholder={t("settlements.reason")} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className={INPUT} required />
          </div>
          <div className="md:col-span-2 flex gap-2">
            <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"><Save size={16} />{t("common.save")}</button>
            <button type="button" onClick={() => setShowForm(false)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">{t("common.cancel")}</button>
          </div>
        </form>
      </FormModal>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-200 p-4 md:flex-row md:items-center md:flex-wrap">
          <SearchInput value={search} onChange={setSearchInput} placeholder={t("settlements.searchPlaceholder")} />
          <FilterSelect value={statusFilter} onChange={(v) => { setStatusFilter(v); setPage(1); }} options={Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))} allLabel={`${t("settlements.status")} — ${t("common.all")}`} className="md:w-40" />
          <FilterSelect value={companyFilter} onChange={(v) => { setCompanyFilter(v); setPage(1); }} options={companies.map((c) => ({ value: c.id, label: c.name }))} allLabel={`${t("common.company")} — ${t("common.all")}`} className="md:w-40" />
          <DateRangeFilter from={dateFrom} to={dateTo} onFromChange={(v) => { setDateFrom(v); setPage(1); }} onToChange={(v) => { setDateTo(v); setPage(1); }} />
          {hasActiveFilters && (
            <button onClick={() => { setSearchInput(null); setStatusFilter(""); setCompanyFilter(""); setDateFrom(""); setDateTo(""); }} className="text-sm text-gray-500 hover:text-gray-700 underline">
              {t("common.resetFilters")}
            </button>
          )}
          <div className="md:ms-auto">
            <ExportButton filename="settlements" getExport={exportSettlements} disabled={filtered.length === 0} />
          </div>
        </div>
        {loading ? (
          <div className="flex min-h-[320px] w-full items-center justify-center px-4 py-8">
            <PrinterLoader size="md" label={t("common.loading")} />
          </div>
        )
        : settlements.length === 0 ? (
          <div className="flex min-h-[200px] w-full items-center justify-center px-4 py-8">
            <p className="text-gray-500">{t("common.noData")}</p>
          </div>
        )
        : filtered.length === 0 ? (
          <div className="flex min-h-[200px] w-full items-center justify-center px-4 py-8">
            <p className="text-gray-500">{t("common.noData")}</p>
          </div>
        )
        : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-start text-sm font-medium text-gray-500">{t("settlements.number")}</th>
                    <th className="px-4 py-3 text-start text-sm font-medium text-gray-500">{t("common.company")}</th>
                    <th className="px-4 py-3 text-start text-sm font-medium text-gray-500">{t("settlements.amount")}</th>
                    <th className="px-4 py-3 text-start text-sm font-medium text-gray-500">{t("settlements.paymentMethod")}</th>
                    <th className="px-4 py-3 text-start text-sm font-medium text-gray-500">{t("settlements.reason")}</th>
                    <th className="px-4 py-3 text-start text-sm font-medium text-gray-500">{t("settlements.status")}</th>
                    <th className="px-4 py-3 text-start text-sm font-medium text-gray-500">{t("settlements.collectedBy")}</th>
                    <th className="px-4 py-3 text-start text-sm font-medium text-gray-500">{t("common.date")}</th>
                    <th className="px-4 py-3 text-start text-sm font-medium text-gray-500">{t("common.actions")}</th>
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
                        {s.status === "INITIAL" && canVerify && (<button onClick={() => handleVerify(s.id)} className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700"><CheckCircle2 size={14} className="inline-block me-1" />{t("common.verify")}</button>)}
                        {s.status === "VERIFIED" && s.verifier && (<span className="text-green-600 text-xs">{t("settlements.by")} {s.verifier.name}</span>)}
                      </td>
                    </tr>
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
