"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/context";

interface Customer {
  id: string;
  name: string;
}

interface Engineer {
  id: string;
  name: string;
}

interface Machine {
  id: string;
  serialNumber: string;
}

interface Location {
  id: string;
  name: string;
}

interface ProblemDetail {
  id: string;
  description: string;
}

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
  const { t } = useI18n();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [assignEngineerId, setAssignEngineerId] = useState("");
  const [form, setForm] = useState({
    customerId: "",
    locationId: "",
    machineId: "",
    description: "",
    priority: "NORMAL",
  });

  const fetchData = async () => {
    setLoading(true);
    const [reqRes, custRes, engRes] = await Promise.all([
      fetch("/api/service-requests"),
      fetch("/api/customers"),
      fetch("/api/engineers"),
    ]);
    setRequests(await reqRes.json());
    setCustomers(await custRes.json());
    setEngineers(await engRes.json());
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">{t("serviceRequests.title")}</h1>
        <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          {t("serviceRequests.newRequest")}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })} className="border rounded-lg px-4 py-2" required>
              <option value="">Select Customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <input type="text" placeholder={t("common.description")} value={form.locationId} onChange={(e) => setForm({ ...form, locationId: e.target.value })} className="border rounded-lg px-4 py-2" />
            <input type="text" placeholder="Machine ID" value={form.machineId} onChange={(e) => setForm({ ...form, machineId: e.target.value })} className="border rounded-lg px-4 py-2" />
            <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="border rounded-lg px-4 py-2">
              <option value="NORMAL">{t("serviceRequests.normal")}</option>
              <option value="IMPORTANT">{t("serviceRequests.important")}</option>
              <option value="URGENT">{t("serviceRequests.urgent")}</option>
              <option value="EMERGENCY">{t("serviceRequests.emergency")}</option>
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
        {loading ? (
          <p className="text-gray-500">{t("common.loading")}</p>
        ) : requests.length === 0 ? (
          <p className="text-gray-500">{t("common.noData")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Request #</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Customer</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Machine</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">{t("serviceRequests.priority")}</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">{t("serviceRequests.status")}</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Engineer</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">{t("common.date")}</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">{t("serviceRequests.problems")}</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Rating</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">{req.requestNumber}</td>
                    <td className="px-4 py-3 text-sm">{req.customer.name}</td>
                    <td className="px-4 py-3 text-sm">{req.machine?.serialNumber || "-"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityColors[req.priority] || ""}`}>
                        {t(`serviceRequests.${req.priority.toLowerCase()}`)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[req.status] || ""}`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">{req.engineer?.name || "-"}</td>
                    <td className="px-4 py-3 text-sm">{new Date(req.createdAt).toLocaleDateString()}</td>
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
                              Resolve
                            </button>
                            <button onClick={() => handleStatus(req.id, "NOT_RESOLVED")} className="text-red-600 hover:underline text-xs">
                              Not Resolved
                            </button>
                          </>
                        )}
                        {req.status === "RESOLVED" && (
                          <button onClick={() => handleStatus(req.id, "CLOSED")} className="text-gray-600 hover:underline text-xs">Close</button>
                        )}
                      </div>
                      {assigningId === req.id && (
                        <div className="mt-2 flex gap-1">
                          <select value={assignEngineerId} onChange={(e) => setAssignEngineerId(e.target.value)} className="border rounded-lg px-2 py-1 text-xs">
                            <option value="">Select</option>
                            {engineers.map((eng) => (
                              <option key={eng.id} value={eng.id}>{eng.name}</option>
                            ))}
                          </select>
                          <button onClick={() => handleAssign(req.id)} className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700">OK</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
