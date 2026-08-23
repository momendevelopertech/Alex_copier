"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/context";
import Pagination from "@/components/Pagination";
import SearchInput, { matchesQuery } from "@/components/SearchInput";
import FilterSelect from "@/components/FilterSelect";
import DateRangeFilter, { inDateRange } from "@/components/DateRangeFilter";
import ExportButton from "@/components/ExportButton";
import PrinterLoader from "@/components/PrinterLoader";

const PRIORITY_LABELS: Record<string, string> = {
  NORMAL: "عادي",
  IMPORTANT: "مهم",
  URGENT: "عاجل",
  EMERGENCY: "طارئ",
};

const STATUS_LABELS: Record<string, string> = {
  NEW: "جديد",
  ASSIGNED: "تم التعيين",
  VISITED: "تمت الزيارة",
  RESOLVED: "تم الحل",
  NOT_RESOLVED: "لم يتم الحل",
  REASSIGNED: "إعادة التعيين",
  CLOSED: "مغلق",
};

interface Customer { id: string; name: string; locations?: Location[]; }
interface Engineer { id: string; name: string; }
interface Machine { id: string; serialNumber: string; model?: string | null; currentOwnerId?: string | null; customerLocationId?: string | null; }
interface Location { id: string; name: string; }
interface ProblemDetail { id: string; description: string; }

interface ServiceRequest {
  id: string;
  requestNumber: string;
  customerId: string;
  locationId: string | null;
  machineId: string | null;
  description: string;
  priority: string;
  status: string;
  engineerId: string | null;
  customerRating: number | null;
  ratingNotes: string | null;
  createdAt: string;
  customer: Customer;
  location: Location | null;
  machine: Machine | null;
  engineer: Engineer | null;
  problems: ProblemDetail[];
}

const priorityColors: Record<string, string> = {
  NORMAL: "bg-gray-100 text-gray-800",
  IMPORTANT: "bg-yellow-100 text-yellow-800",
  URGENT: "bg-orange-100 text-orange-800",
  EMERGENCY: "bg-red-100 text-red-800",
};

const statusColors: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-800",
  ASSIGNED: "bg-purple-100 text-purple-800",
  VISITED: "bg-yellow-100 text-yellow-800",
  RESOLVED: "bg-green-100 text-green-800",
  NOT_RESOLVED: "bg-red-100 text-red-800",
  REASSIGNED: "bg-indigo-100 text-indigo-800",
  CLOSED: "bg-gray-100 text-gray-800",
};

export default function ServiceRequestsPage() {
  const { t, dir } = useI18n();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [assignEngineerId, setAssignEngineerId] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [engineerFilter, setEngineerFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [form, setForm] = useState({
    customerId: "",
    locationId: "",
    machineId: "",
    description: "",
    priority: "NORMAL",
  });
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  const fetchData = async () => {
    try {
      const [reqRes, custRes, engRes, machineRes] = await Promise.all([
        fetch("/api/service-requests"),
        fetch("/api/customers"),
        fetch("/api/engineers"),
        fetch("/api/machines"),
      ]);
      setRequests(await reqRes.json());
      setCustomers(await custRes.json());
      setEngineers(await engRes.json());
      setMachines(await machineRes.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/service-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        locationId: form.locationId || undefined,
        machineId: form.machineId || undefined,
      }),
    });
    setForm({ customerId: "", locationId: "", machineId: "", description: "", priority: "NORMAL" });
    setShowForm(false);
    fetchData();
  };

  const handleAssign = async (id: string) => {
    await fetch(`/api/service-requests/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ engineerId: assignEngineerId, status: "ASSIGNED" }),
    });
    setAssigningId(null);
    setAssignEngineerId("");
    fetchData();
  };

  const handleStatus = async (id: string, status: string) => {
    await fetch(`/api/service-requests/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchData();
  };

  const renderStars = (rating: number | null) => {
    if (rating === null) return null;
    return (
      <span className="text-yellow-500">
        {"★".repeat(rating)}{"☆".repeat(5 - rating)}
      </span>
    );
  };

  const filtered = requests.filter(request =>
    (!statusFilter || request.status === statusFilter) &&
    (!priorityFilter || request.priority === priorityFilter) &&
    (!engineerFilter || request.engineerId === engineerFilter) &&
    inDateRange(request.createdAt, dateFrom, dateTo) &&
    (matchesQuery(request.requestNumber, search) ||
      matchesQuery(request.description, search) ||
      matchesQuery(request.customer?.name, search) ||
      matchesQuery(request.machine?.serialNumber, search) ||
      matchesQuery(request.engineer?.name, search))
  );
  const hasActiveFilters = statusFilter !== "" || priorityFilter !== "" || engineerFilter !== "" || dateFrom !== "" || dateTo !== "" || search !== "";
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const exportRequests = () => ({
    headers: [
      t("serviceRequests.requestNumber"),
      t("serviceRequests.customer"),
      t("serviceRequests.machine"),
      t("serviceRequests.priority"),
      t("serviceRequests.status"),
      t("serviceRequests.engineer"),
      t("common.date"),
      t("serviceRequests.problems"),
      t("serviceRequests.rating"),
    ],
    rows: filtered.map((req) => [
      req.requestNumber,
      req.customer.name,
      req.machine?.serialNumber || "",
      PRIORITY_LABELS[req.priority] || req.priority,
      STATUS_LABELS[req.status] || req.status,
      req.engineer?.name || "",
      new Date(req.createdAt).toISOString().slice(0, 10),
      String(req.problems.length),
      req.customerRating != null ? String(req.customerRating) : "",
    ]),
  });

  return (
    <div dir={dir}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between mb-6">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">{t("serviceRequests.title")}</h1>
        <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          {t("serviceRequests.newRequest")}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })} className="border rounded-lg px-4 py-2" required>
              <option value="">{t("serviceRequests.selectCustomer")}</option>
              {customers.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
            <select value={form.locationId} onChange={(e) => setForm({ ...form, locationId: e.target.value, machineId: "" })} className="border rounded-lg px-4 py-2">
              <option value="">{t("machineDetails.location")} ({t("common.selectOption")})</option>
              {customers.find(customer => customer.id === form.customerId)?.locations?.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}
            </select>
            <select value={form.machineId} onChange={(e) => setForm({ ...form, machineId: e.target.value })} className="border rounded-lg px-4 py-2">
              <option value="">{t("serviceRequests.machine")} ({t("common.selectOption")})</option>
              {machines.filter(machine => machine.currentOwnerId === form.customerId && (!form.locationId || machine.customerLocationId === form.locationId)).map(machine => <option key={machine.id} value={machine.id}>{machine.serialNumber}{machine.model ? ` · ${machine.model}` : ""}</option>)}
            </select>
            <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="border rounded-lg px-4 py-2">
              <option value="NORMAL">{PRIORITY_LABELS.NORMAL}</option>
              <option value="IMPORTANT">{PRIORITY_LABELS.IMPORTANT}</option>
              <option value="URGENT">{PRIORITY_LABELS.URGENT}</option>
              <option value="EMERGENCY">{PRIORITY_LABELS.EMERGENCY}</option>
            </select>
            <textarea placeholder={t("common.description")} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="border rounded-lg px-4 py-2 md:col-span-2" rows={3} required />
            <div className="md:col-span-2 flex gap-2">
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">{t("common.save")}</button>
              <button type="button" onClick={() => setShowForm(false)} className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400">{t("common.cancel")}</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:flex-wrap">
          <SearchInput value={search} onChange={setSearch} placeholder={t("serviceRequests.searchPlaceholder")} />
          <FilterSelect value={statusFilter} onChange={(v) => { setStatusFilter(v); setPage(1); }} options={Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))} allLabel={`${t("serviceRequests.status")} — ${t("common.all")}`} className="md:w-40" />
          <FilterSelect value={priorityFilter} onChange={(v) => { setPriorityFilter(v); setPage(1); }} options={Object.entries(PRIORITY_LABELS).map(([value, label]) => ({ value, label }))} allLabel={`${t("serviceRequests.priorityFilter")} — ${t("common.all")}`} className="md:w-36" />
          <FilterSelect value={engineerFilter} onChange={(v) => { setEngineerFilter(v); setPage(1); }} options={engineers.map((e) => ({ value: e.id, label: e.name }))} allLabel={`${t("serviceRequests.engineerFilter")} — ${t("common.all")}`} className="md:w-44" />
          <DateRangeFilter from={dateFrom} to={dateTo} onFromChange={(v) => { setDateFrom(v); setPage(1); }} onToChange={(v) => { setDateTo(v); setPage(1); }} />
          {hasActiveFilters && (
            <button onClick={() => { setSearch(""); setStatusFilter(""); setPriorityFilter(""); setEngineerFilter(""); setDateFrom(""); setDateTo(""); }} className="text-sm text-gray-500 hover:text-gray-700 underline">
              {t("common.resetFilters")}
            </button>
          )}
          <div className="md:ms-auto">
            <ExportButton filename="service-requests" getExport={exportRequests} disabled={filtered.length === 0} />
          </div>
        </div>
        {loading ? (
          <div className="flex min-h-[320px] w-full items-center justify-center px-4 py-8">
            <PrinterLoader size="md" label={t("common.loading")} />
          </div>
        ) : requests.length === 0 ? (
          <p className="text-gray-500">{t("common.noData")}</p>
        ) : (
          <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("serviceRequests.requestNumber")}</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("serviceRequests.customer")}</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("serviceRequests.machine")}</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("serviceRequests.priority")}</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("serviceRequests.status")}</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("serviceRequests.engineer")}</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("common.date")}</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("serviceRequests.problems")}</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("serviceRequests.rating")}</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paged.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">{req.requestNumber}</td>
                    <td className="px-4 py-3 text-sm">{req.customer.name}</td>
                    <td className="px-4 py-3 text-sm">{req.machine?.serialNumber || "-"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityColors[req.priority] || ""}`}>
                        {PRIORITY_LABELS[req.priority] || req.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[req.status] || ""}`}>
                        {STATUS_LABELS[req.status] || req.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">{req.engineer?.name || "-"}</td>
                    <td className="px-4 py-3 text-sm">{new Date(req.createdAt).toLocaleDateString("ar-EG")}</td>
                    <td className="px-4 py-3 text-sm text-center">{req.problems.length}</td>
                    <td className="px-4 py-3 text-sm">{renderStars(req.customerRating)}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex gap-1">
                        {req.status !== "CLOSED" && req.status !== "RESOLVED" && req.status !== "NOT_RESOLVED" && (
                          <>
                            <button onClick={() => setAssigningId(assigningId === req.id ? null : req.id)} className="text-purple-600 hover:underline text-xs">
                              {t("serviceRequests.assign")}
                            </button>
                            <button onClick={() => handleStatus(req.id, "RESOLVED")} className="text-green-600 hover:underline text-xs">
                              {t("common.resolve")}
                            </button>
                            <button onClick={() => handleStatus(req.id, "NOT_RESOLVED")} className="text-red-600 hover:underline text-xs">
                              {t("common.notResolve")}
                            </button>
                          </>
                        )}
                        {req.status === "RESOLVED" && (
                          <button onClick={() => handleStatus(req.id, "CLOSED")} className="text-gray-600 hover:underline text-xs">{t("serviceRequests.closed")}</button>
                        )}
                      </div>
                      {assigningId === req.id && (
                        <div className="mt-2 flex gap-1">
                          <select value={assignEngineerId} onChange={(e) => setAssignEngineerId(e.target.value)} className="border rounded-lg px-2 py-1 text-xs">
                            <option value="">{t("serviceRequests.selectEngineer")}</option>
                            {engineers.map((eng) => (<option key={eng.id} value={eng.id}>{eng.name}</option>))}
                          </select>
                          <button onClick={() => handleAssign(req.id)} className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700">{t("serviceRequests.ok")}</button>
                        </div>
                      )}
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
