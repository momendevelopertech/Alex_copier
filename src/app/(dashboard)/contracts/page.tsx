"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/context";
import Pagination from "@/components/Pagination";

const TYPE_LABELS: Record<string, string> = {
  MAINTENANCE_ONLY: "صيانة فقط",
  MAINTENANCE_AND_PARTS: "صيانة وقطع غيار",
  MAINTENANCE_AND_PRINTING: "صيانة وطباعة",
  RENTAL: "إيجار",
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "نشط",
  EXPIRED: "منتهي",
  TERMINATED: "ملغي",
  SUSPENDED: "موقوف",
};

const BILLING_LABELS: Record<string, string> = {
  MONTHLY: "شهري",
  QUARTERLY: "ربع سنوي",
  YEARLY: "سنوي",
};

const contractTypeColors: Record<string, string> = {
  MAINTENANCE_ONLY: "bg-blue-100 text-blue-800",
  MAINTENANCE_AND_PARTS: "bg-green-100 text-green-800",
  MAINTENANCE_AND_PRINTING: "bg-purple-100 text-purple-800",
  RENTAL: "bg-orange-100 text-orange-800",
};

const statusColors: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  EXPIRED: "bg-gray-100 text-gray-800",
  TERMINATED: "bg-red-100 text-red-800",
  SUSPENDED: "bg-yellow-100 text-yellow-800",
};

interface Customer { id: string; name: string; }
interface Machine { id: string; serialNumber: string; model: string | null; currentOwnerId: string | null; }
interface ContractMachine { id: string; machineId: string; machine: { id: string; serialNumber: string; model: string | null }; }
interface Contract {
  id: string; contractNumber: string; customerId: string; contractType: string; status: string;
  startDate: string; endDate: string; value: number; billingCycle: string;
  visitLimit: number | null; costPerCopy: number | null; earlyTerminationFee: number | null;
  notes: string | null; createdAt: string; customer: Customer; machines: ContractMachine[];
  _count: { visits: number };
}

export default function ContractsPage() {
  const { t, dir } = useI18n();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [form, setForm] = useState({
    customerId: "", contractType: "MAINTENANCE_ONLY", startDate: "", endDate: "",
    value: "", billingCycle: "MONTHLY", visitLimit: "", costPerCopy: "",
    earlyTerminationFee: "", notes: "", machineIds: [] as string[],
  });
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  const fetchData = async () => {
    setLoading(true);
    const [cRes, custRes, machineRes] = await Promise.all([fetch("/api/contracts"), fetch("/api/customers"), fetch("/api/machines")]);
    setContracts(await cRes.json());
    setCustomers(await custRes.json());
    setMachines(await machineRes.json());
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/contracts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        value: parseFloat(form.value) || 0,
        visitLimit: form.visitLimit ? parseInt(form.visitLimit) : undefined,
        costPerCopy: form.costPerCopy ? parseFloat(form.costPerCopy) : undefined,
        earlyTerminationFee: form.earlyTerminationFee ? parseFloat(form.earlyTerminationFee) : undefined,
      }),
    });
    setForm({ customerId: "", contractType: "MAINTENANCE_ONLY", startDate: "", endDate: "", value: "", billingCycle: "MONTHLY", visitLimit: "", costPerCopy: "", earlyTerminationFee: "", notes: "", machineIds: [] });
    setShowForm(false);
    fetchData();
  };

  const handleStatusToggle = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === "ACTIVE" ? "TERMINATED" : "ACTIVE";
    await fetch(`/api/contracts/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: nextStatus }) });
    fetchData();
  };

  const filtered = contracts.filter(contract => (!statusFilter || contract.status === statusFilter) && [contract.contractNumber, contract.customer.name, contract.contractType].join(" ").toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div dir={dir}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between mb-6">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">{t("contracts.title")}</h1>
        <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">{t("contracts.addContract")}</button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })} className="border rounded-lg px-4 py-2" required>
              <option value="">{t("contracts.selectCustomer")}</option>
              {customers.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
            <select value={form.contractType} onChange={(e) => setForm({ ...form, contractType: e.target.value })} className="border rounded-lg px-4 py-2">
              <option value="MAINTENANCE_ONLY">{TYPE_LABELS.MAINTENANCE_ONLY}</option>
              <option value="MAINTENANCE_AND_PARTS">{TYPE_LABELS.MAINTENANCE_AND_PARTS}</option>
              <option value="MAINTENANCE_AND_PRINTING">{TYPE_LABELS.MAINTENANCE_AND_PRINTING}</option>
              <option value="RENTAL">{TYPE_LABELS.RENTAL}</option>
            </select>
            <select value={form.billingCycle} onChange={(e) => setForm({ ...form, billingCycle: e.target.value })} className="border rounded-lg px-4 py-2">
              <option value="MONTHLY">{BILLING_LABELS.MONTHLY}</option>
              <option value="QUARTERLY">{BILLING_LABELS.QUARTERLY}</option>
              <option value="YEARLY">{BILLING_LABELS.YEARLY}</option>
            </select>
            <div>
              <label className="text-sm text-gray-500 mb-1 block">{t("contracts.startDate")}</label>
              <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="border rounded-lg px-4 py-2 w-full" required />
            </div>
            <div>
              <label className="text-sm text-gray-500 mb-1 block">{t("contracts.endDate")}</label>
              <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="border rounded-lg px-4 py-2 w-full" required />
            </div>
            <input type="number" placeholder={t("contracts.value")} value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className="border rounded-lg px-4 py-2" required />
            <input type="number" placeholder={t("contracts.visitLimit")} value={form.visitLimit} onChange={(e) => setForm({ ...form, visitLimit: e.target.value })} className="border rounded-lg px-4 py-2" />
            <input type="number" placeholder={t("contracts.costPerCopy")} value={form.costPerCopy} onChange={(e) => setForm({ ...form, costPerCopy: e.target.value })} className="border rounded-lg px-4 py-2" />
            <input type="number" placeholder={t("contracts.earlyTerminationFee")} value={form.earlyTerminationFee} onChange={(e) => setForm({ ...form, earlyTerminationFee: e.target.value })} className="border rounded-lg px-4 py-2" />
            {form.customerId && <div className="md:col-span-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="mb-2 text-sm font-medium text-slate-700">{t("contracts.coveredMachines")}</p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {machines.filter(machine => machine.currentOwnerId === form.customerId).map(machine => <label key={machine.id} className="flex cursor-pointer items-center gap-2 rounded-md bg-white px-3 py-2 text-sm"><input type="checkbox" checked={form.machineIds.includes(machine.id)} onChange={(e) => setForm({ ...form, machineIds: e.target.checked ? [...form.machineIds, machine.id] : form.machineIds.filter(id => id !== machine.id) })} /><span>{machine.serialNumber}{machine.model ? ` · ${machine.model}` : ""}</span></label>)}
                {machines.filter(machine => machine.currentOwnerId === form.customerId).length === 0 && <p className="text-sm text-slate-500">{t("common.noData")}</p>}
              </div>
            </div>}
            <textarea placeholder={t("common.notes")} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="border rounded-lg px-4 py-2 md:col-span-3" rows={2} />
            <div className="md:col-span-3 flex gap-2">
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">{t("common.save")}</button>
              <button type="button" onClick={() => setShowForm(false)} className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400">{t("common.cancel")}</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="mb-4 grid gap-3 md:grid-cols-2"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`${t("common.search")} ${t("contracts.contractNumber")} / ${t("serviceRequests.customer")}...`} className="border rounded-lg px-4 py-2" /><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border rounded-lg px-4 py-2"><option value="">{t("common.status")} ({t("common.selectOption")})</option>{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
        {loading ? <p className="text-gray-500">{t("common.loading")}</p>
        : contracts.length === 0 ? <p className="text-gray-500">{t("common.noData")}</p>
        : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("contracts.contractNumber")}</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("serviceRequests.customer")}</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("contracts.type")}</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("common.status")}</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("contracts.value")}</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("contracts.startDate")}</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("contracts.endDate")}</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("contracts.machines")}</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paged.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">{c.contractNumber}</td>
                    <td className="px-4 py-3 text-sm">{c.customer.name}</td>
                    <td className="px-4 py-3"><span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${contractTypeColors[c.contractType] || ""}`}>{TYPE_LABELS[c.contractType] || c.contractType}</span></td>
                    <td className="px-4 py-3"><span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[c.status] || ""}`}>{STATUS_LABELS[c.status] || c.status}</span></td>
                    <td className="px-4 py-3 text-sm">{c.value.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm">{new Date(c.startDate).toLocaleDateString("ar-EG")}</td>
                    <td className="px-4 py-3 text-sm">{new Date(c.endDate).toLocaleDateString("ar-EG")}</td>
                    <td className="px-4 py-3 text-sm text-center">{c.machines.length}</td>
                    <td className="px-4 py-3 text-sm">
                      <button onClick={() => handleStatusToggle(c.id, c.status)} className={`text-xs hover:underline ${c.status === "ACTIVE" ? "text-red-600" : "text-green-600"}`}>
                        {c.status === "ACTIVE" ? t("contracts.terminate") : t("contracts.activate")}
                      </button>
                    </td>
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
