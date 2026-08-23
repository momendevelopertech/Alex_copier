"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/context";
import Pagination from "@/components/Pagination";
import SearchInput, { matchesQuery } from "@/components/SearchInput";
import FilterSelect from "@/components/FilterSelect";
import { Pencil, Plus, Trash2, Upload, X } from "lucide-react";
import ExportButton from "@/components/ExportButton";
import ImportDialog from "@/components/ImportDialog";
import PrinterLoader from "@/components/PrinterLoader";
import { useConfirm, useToast } from "@/components/UIProvider";
import { useUrlParams, useSearchWithDefault } from "@/hooks/useUrlParams";
import { apiErrorMessage } from "@/lib/api-client";

interface CustomerLocation {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  governorate?: string | null;
  phone?: string | null;
  isActive?: boolean;
}

interface Customer {
  id: string;
  name: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  city: string;
  governorate: string;
  taxNumber: string;
  creditLimit: number;
  paymentTerms: string;
  customerType: string;
  isActive: boolean;
  locations: CustomerLocation[];
  createdAt: string;
  machines?: { id: string; serialNumber: string; manufacturer?: string | null; model?: string | null; currentStatus: string }[];
  serviceRequests?: { id: string; requestNumber: string; status: string; priority: string; createdAt: string; machine?: { serialNumber: string } | null }[];
  contracts?: { id: string; contractNumber: string; status: string; endDate: string; value: number }[];
  orders?: { id: string; total: number; status: string; orderDate: string }[];
  ledgers?: { balance: number }[];
}

const emptyForm = {
  name: "",
  companyName: "",
  contactPerson: "",
  phone: "",
  whatsapp: "",
  email: "",
  address: "",
  city: "",
  governorate: "",
  taxNumber: "",
  creditLimit: "",
  paymentTerms: "",
  customerType: "INDIVIDUAL",
};

export default function CustomersPage() {
  const { t, dir, locale } = useI18n();
  const confirmAction = useConfirm();
  const { success: toastSuccess } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const urlParams = useUrlParams(["q"]);
  const [search, setSearchInput] = useSearchWithDefault(urlParams.q ?? "");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [showLocForm, setShowLocForm] = useState(false);
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [locForm, setLocForm] = useState({ name: "", address: "", city: "", governorate: "", phone: "" });
  const [locError, setLocError] = useState("");
  const PAGE_SIZE = 15;

  const fetchCustomers = async () => {
    try {
      const res = await fetch("/api/customers");
      const data = await res.json();
      setCustomers(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const filtered = customers.filter(
    (c) =>
      (matchesQuery(c.name, search) ||
        matchesQuery(c.companyName, search) ||
        matchesQuery(c.email, search) ||
        (Boolean(c.phone) && c.phone.includes(search))) &&
      (!typeFilter || c.customerType === typeFilter) &&
      (!cityFilter || c.city === cityFilter) &&
      (!activeFilter || String(c.isActive) === activeFilter)
  );

  const cities = useMemo(
    () => Array.from(new Set(customers.map((c) => c.city).filter(Boolean))) as string[],
    [customers]
  );
  const hasActiveFilters = typeFilter !== "" || cityFilter !== "" || activeFilter !== "" || search !== "";

  const resetFilters = () => {
    setSearchInput(null);
    setTypeFilter("");
    setCityFilter("");
    setActiveFilter("");
  };

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const exportCustomers = () => ({
    headers: [
      t("customers.name"),
      t("customers.companyName"),
      t("customers.phone"),
      t("customers.email"),
      t("customers.city"),
      t("customers.governorate"),
      t("customers.creditLimit"),
      t("customers.type"),
      t("common.status"),
    ],
    rows: filtered.map((c) => [
      c.name,
      c.companyName || "",
      c.phone || "",
      c.email || "",
      c.city || "",
      c.governorate || "",
      String(c.creditLimit),
      TYPE_LABELS[c.customerType] || c.customerType,
      c.isActive ? t("common.yes") : t("common.no"),
    ]),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        creditLimit: form.creditLimit ? parseFloat(form.creditLimit) : 0,
      }),
    });
    setForm(emptyForm);
    setShowForm(false);
    fetchCustomers();
  };

  const handleDelete = async (id: string) => {
      if (!(await confirmAction({ message: t("common.deleteConfirm") }))) return;
      await fetch(`/api/customers/${id}`, { method: "DELETE" });
      fetchCustomers();
      setSelected(null);
      toastSuccess(t("common.deletedSuccessfully"));
    };

  const setField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const openDetails = async (id: string) => {
    const res = await fetch(`/api/customers/${id}`);
    if (res.ok) setSelected(await res.json());
  };

  const resetLocForm = () => {
    setLocForm({ name: "", address: "", city: "", governorate: "", phone: "" });
    setEditingLocationId(null);
    setShowLocForm(false);
    setLocError("");
  };

  const openLocationCreate = () => {
    setLocForm({ name: "", address: "", city: "", governorate: "", phone: "" });
    setEditingLocationId(null);
    setShowLocForm(true);
    setLocError("");
  };

  const openLocationEdit = (loc: CustomerLocation) => {
    setLocForm({
      name: loc.name,
      address: loc.address || "",
      city: loc.city || "",
      governorate: loc.governorate || "",
      phone: loc.phone || "",
    });
    setEditingLocationId(loc.id);
    setShowLocForm(true);
    setLocError("");
  };

  const handleLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setLocError("");
    const res = await fetch(
      editingLocationId ? `/api/locations/${editingLocationId}` : `/api/customers/${selected.id}/locations`,
      {
        method: editingLocationId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(locForm),
      },
    );
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setLocError(apiErrorMessage(data, t));
      return;
    }
    resetLocForm();
    await openDetails(selected.id);
  };

  const handleLocationDelete = async (locationId: string) => {
    if (!selected) return;
    if (!(await confirmAction({ message: t("customers.deleteLocationConfirm") }))) return;
    const res = await fetch(`/api/locations/${locationId}`, { method: "DELETE" });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setLocError(apiErrorMessage(data, t));
      return;
    }
    await openDetails(selected.id);
  };
  const date = (value: string) => new Date(value).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-GB");
  const isOpen = (status: string) => !["RESOLVED", "CLOSED"].includes(status);

  const TYPE_BADGES: Record<string, string> = {
    INDIVIDUAL: "bg-blue-100 text-blue-800",
    COMPANY: "bg-purple-100 text-purple-800",
  };

  const TYPE_LABELS: Record<string, string> = {
    INDIVIDUAL: "ÙØ±Ø¯",
    COMPANY: "Ø´Ø±ÙƒØ©",
  };

  return (
    <div dir={dir}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between mb-6">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">{t("customers.title")}</h1>
        <button
          onClick={() => { setShowForm(!showForm); setSelected(null); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"
        >
          {showForm ? (<><X size={16} />{t("common.cancel")}</>) : (<><Plus size={16} />{t("customers.addCustomer")}</>)}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">{t("customers.addCustomer")}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder={t("customers.name")}
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              className="border rounded-lg px-4 py-2 w-full"
              required
            />
            <input
              type="text"
              placeholder="Ø§Ø³Ù… Ø§Ù„Ø´Ø±ÙƒØ©"
              value={form.companyName}
              onChange={(e) => setField("companyName", e.target.value)}
              className="border rounded-lg px-4 py-2 w-full"
            />
            <input
              type="text"
              placeholder="Ø¬Ù‡Ø© Ø§Ù„Ø§ØªØµØ§Ù„"
              value={form.contactPerson}
              onChange={(e) => setField("contactPerson", e.target.value)}
              className="border rounded-lg px-4 py-2 w-full"
            />
            <input
              type="text"
              placeholder={t("customers.phone")}
              value={form.phone}
              onChange={(e) => setField("phone", e.target.value)}
              className="border rounded-lg px-4 py-2 w-full"
            />
            <input
              type="text"
              placeholder="ÙˆØ§ØªØ³Ø§Ø¨"
              value={form.whatsapp}
              onChange={(e) => setField("whatsapp", e.target.value)}
              className="border rounded-lg px-4 py-2 w-full"
            />
            <input
              type="email"
              placeholder={t("customers.email")}
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
              className="border rounded-lg px-4 py-2 w-full"
            />
            <input
              type="text"
              placeholder={t("customers.address")}
              value={form.address}
              onChange={(e) => setField("address", e.target.value)}
              className="border rounded-lg px-4 py-2 w-full"
            />
            <input
              type="text"
              placeholder="Ø§Ù„Ù…Ø¯ÙŠÙ†Ø©"
              value={form.city}
              onChange={(e) => setField("city", e.target.value)}
              className="border rounded-lg px-4 py-2 w-full"
            />
            <input
              type="text"
              placeholder="Ø§Ù„Ù…Ø­Ø§ÙØ¸Ø©"
              value={form.governorate}
              onChange={(e) => setField("governorate", e.target.value)}
              className="border rounded-lg px-4 py-2 w-full"
            />
            <input
              type="text"
              placeholder="Ø§Ù„Ø±Ù‚Ù… Ø§Ù„Ø¶Ø±ÙŠØ¨ÙŠ"
              value={form.taxNumber}
              onChange={(e) => setField("taxNumber", e.target.value)}
              className="border rounded-lg px-4 py-2 w-full"
            />
            <input
              type="number"
              placeholder={t("customers.creditLimit")}
              value={form.creditLimit}
              onChange={(e) => setField("creditLimit", e.target.value)}
              className="border rounded-lg px-4 py-2 w-full"
            />
            <input
              type="text"
              placeholder="Ø´Ø±ÙˆØ· Ø§Ù„Ø¯ÙØ¹"
              value={form.paymentTerms}
              onChange={(e) => setField("paymentTerms", e.target.value)}
              className="border rounded-lg px-4 py-2 w-full"
            />
            <select
              value={form.customerType}
              onChange={(e) => setField("customerType", e.target.value)}
              className="border rounded-lg px-4 py-2 w-full"
            >
              <option value="INDIVIDUAL">{TYPE_LABELS.INDIVIDUAL}</option>
              <option value="COMPANY">{TYPE_LABELS.COMPANY}</option>
            </select>
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"
            >
              {t("common.save")}
            </button>
          </form>
        </div>
      )}

      {selected && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">{selected.name}</h2>
            <button
              onClick={() => setSelected(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              {t("common.close")}
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
            <div><span className="text-gray-500">Ø§Ù„Ø´Ø±ÙƒØ©:</span> {selected.companyName || "â€”"}</div>
            <div><span className="text-gray-500">Ø¬Ù‡Ø© Ø§Ù„Ø§ØªØµØ§Ù„:</span> {selected.contactPerson || "â€”"}</div>
            <div><span className="text-gray-500">{t("customers.phone")}:</span> {selected.phone || "â€”"}</div>
            <div><span className="text-gray-500">{t("customers.email")}:</span> {selected.email || "â€”"}</div>
            <div><span className="text-gray-500">{t("customers.address")}:</span> {selected.address || "â€”"}</div>
            <div><span className="text-gray-500">Ø§Ù„Ù…Ø¯ÙŠÙ†Ø©:</span> {selected.city || "â€”"}</div>
            <div><span className="text-gray-500">Ø§Ù„Ù…Ø­Ø§ÙØ¸Ø©:</span> {selected.governorate || "â€”"}</div>
            <div><span className="text-gray-500">Ø§Ù„Ø±Ù‚Ù… Ø§Ù„Ø¶Ø±ÙŠØ¨ÙŠ:</span> {selected.taxNumber || "â€”"}</div>
            <div><span className="text-gray-500">{t("customers.creditLimit")}:</span> {selected.creditLimit}</div>
            <div><span className="text-gray-500">Ø´Ø±ÙˆØ· Ø§Ù„Ø¯ÙØ¹:</span> {selected.paymentTerms || "â€”"}</div>
            <div>
              <span className="text-gray-500">Ø§Ù„Ù†ÙˆØ¹:</span>{" "}
              <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${TYPE_BADGES[selected.customerType] || ""}`}>
                {TYPE_LABELS[selected.customerType] || selected.customerType}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-5 mb-6">
            <Summary label={t("customers.machines")} value={selected.machines?.length || 0} />
            <Summary label={t("customers.openRequests")} value={selected.serviceRequests?.filter(r => isOpen(r.status)).length || 0} />
            <Summary label={t("customers.contracts")} value={selected.contracts?.filter(c => c.status === "ACTIVE").length || 0} />
            <Summary label={t("customers.sales")} value={selected.orders?.length || 0} />
            <Summary label={t("customers.outstandingBalance")} value={(selected.ledgers || []).reduce((total, ledger) => total + ledger.balance, 0).toLocaleString()} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold">{t("customers.locations")}</h3>
              {!showLocForm && (
                <button
                  onClick={openLocationCreate}
                  className="border border-blue-600 text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-lg text-sm font-medium"
                >
                  + {t("customers.addLocation")}
                </button>
              )}
            </div>

            {locError && (
              <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {locError}
              </div>
            )}

            {showLocForm && (
              <form onSubmit={handleLocationSubmit} className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3 rounded-lg border border-gray-200 bg-slate-50 p-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">{t("customers.locationName")}</label>
                  <input
                    type="text"
                    value={locForm.name}
                    onChange={(e) => setLocForm({ ...locForm, name: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">{t("customers.address")}</label>
                  <input
                    type="text"
                    value={locForm.address}
                    onChange={(e) => setLocForm({ ...locForm, address: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">{t("customers.phone")}</label>
                  <input
                    type="text"
                    dir="ltr"
                    value={locForm.phone}
                    onChange={(e) => setLocForm({ ...locForm, phone: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">{t("customers.city")}</label>
                  <input
                    type="text"
                    value={locForm.city}
                    onChange={(e) => setLocForm({ ...locForm, city: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">{t("customers.governorate")}</label>
                  <input
                    type="text"
                    value={locForm.governorate}
                    onChange={(e) => setLocForm({ ...locForm, governorate: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="flex items-end justify-end gap-2">
                  <button type="button" onClick={resetLocForm} className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100">
                    {t("common.cancel")}
                  </button>
                  <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                    {t("common.save")}
                  </button>
                </div>
              </form>
            )}

            {selected.locations.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-right">Ø§Ù„Ø§Ø³Ù…</th>
                      <th className="px-4 py-2 text-right">Ø§Ù„Ø¹Ù†ÙˆØ§Ù†</th>
                      <th className="px-4 py-2 text-right">Ø§Ù„Ù…Ø¯ÙŠÙ†Ø©</th>
                      <th className="px-4 py-2 text-right">Ø§Ù„Ù…Ø­Ø§ÙØ¸Ø©</th>
                      <th className="px-4 py-2 text-right">Ø§Ù„Ù‡Ø§ØªÙ</th>
                      <th className="px-4 py-2 text-right">{t("common.actions")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {selected.locations.map((loc) => (
                      <tr key={loc.id} className={loc.isActive === false ? "opacity-50" : ""}>
                        <td className="px-4 py-2 font-medium">{loc.name}{loc.isActive === false && ` (${t("common.inactive")})`}</td>
                        <td className="px-4 py-2">{loc.address || "â€”"}</td>
                        <td className="px-4 py-2">{loc.city || "â€”"}</td>
                        <td className="px-4 py-2">{loc.governorate || "â€”"}</td>
                        <td className="px-4 py-2"><span dir="ltr">{loc.phone || "â€”"}</span></td>
                        <td className="px-4 py-2">
                          <div className="flex gap-2">
                            <button onClick={() => openLocationEdit(loc)} className="text-blue-600 hover:text-blue-800">
                              <Pencil size={14} className="inline-block me-1" />{t("common.edit")}
                            </button>
                            {loc.isActive !== false && (
                              <button onClick={() => handleLocationDelete(loc.id)} className="text-red-600 hover:text-red-800">
                                <Trash2 size={14} className="inline-block me-1" />{t("common.delete")}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              !showLocForm && <p className="text-sm text-gray-400">{t("customers.noLocations")}</p>
            )}
          </div>

          <div className="grid gap-4 mt-5 lg:grid-cols-2">
            <CustomerPanel title={t("customers.machines")}>
              {selected.machines?.length ? selected.machines.map(machine => <div key={machine.id} className="flex justify-between border-b border-gray-100 py-2 text-sm"><Link href={`/machines?serial=${encodeURIComponent(machine.serialNumber)}`} className="font-mono font-medium text-blue-600 hover:underline">{machine.serialNumber}</Link><span>{[machine.manufacturer, machine.model].filter(Boolean).join(" ") || "â€”"} Â· {machine.currentStatus}</span></div>) : <p className="text-sm text-gray-400">{t("common.noData")}</p>}
            </CustomerPanel>
            <CustomerPanel title={t("customers.serviceHistory")}>
              {selected.serviceRequests?.length ? selected.serviceRequests.slice(0, 6).map(request => <div key={request.id} className="flex justify-between border-b border-gray-100 py-2 text-sm"><Link href={`/service-requests?focus=${request.id}`} className="font-medium text-blue-600 hover:underline">{request.requestNumber}</Link><span>{request.machine?.serialNumber || "â€”"} Â· {request.status} Â· {date(request.createdAt)}</span></div>) : <p className="text-sm text-gray-400">{t("common.noData")}</p>}
            </CustomerPanel>
            <CustomerPanel title={t("customers.contracts")}>
              {selected.contracts?.length ? selected.contracts.map(contract => <div key={contract.id} className="flex justify-between border-b border-gray-100 py-2 text-sm"><Link href={`/contracts?focus=${contract.id}`} className="font-medium text-blue-600 hover:underline">{contract.contractNumber}</Link><span>{contract.status} Â· {date(contract.endDate)}</span></div>) : <p className="text-sm text-gray-400">{t("common.noData")}</p>}
            </CustomerPanel>
            <CustomerPanel title={t("customers.sales")}>
              {selected.orders?.length ? selected.orders.slice(0, 6).map(order => <div key={order.id} className="flex justify-between border-b border-gray-100 py-2 text-sm"><span>{date(order.orderDate)}</span><span>{order.total.toLocaleString()} Â· {order.status}</span></div>) : <p className="text-sm text-gray-400">{t("common.noData")}</p>}
            </CustomerPanel>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={() => handleDelete(selected.id)}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm"
            >
              <Trash2 size={14} className="inline-block me-1" />{t("common.delete")}
            </button>
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:flex-wrap">
        <SearchInput
          value={search}
          onChange={setSearchInput}
          placeholder={t("customers.searchPlaceholder")}
        />
        <FilterSelect
          value={typeFilter}
          onChange={(v) => { setTypeFilter(v); setPage(1); }}
          options={[
            { value: "INDIVIDUAL", label: TYPE_LABELS.INDIVIDUAL },
            { value: "COMPANY", label: TYPE_LABELS.COMPANY },
          ]}
          allLabel={`${t("customers.typeFilter")} â€” ${t("common.all")}`}
          className="md:w-44"
        />
        <FilterSelect
          value={cityFilter}
          onChange={(v) => { setCityFilter(v); setPage(1); }}
          options={cities.map((c) => ({ value: c, label: c }))}
          allLabel={`${t("customers.city")} â€” ${t("common.all")}`}
          className="md:w-40"
        />
        <FilterSelect
          value={activeFilter}
          onChange={(v) => { setActiveFilter(v); setPage(1); }}
          options={[
            { value: "true", label: t("common.yes") },
            { value: "false", label: t("common.no") },
          ]}
          allLabel={`${t("common.status")} â€” ${t("common.all")}`}
          className="md:w-36"
        />
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            {t("common.resetFilters")}
          </button>
        )}
        <div className="flex gap-2 md:ms-auto">
          <ExportButton filename="customers" getExport={exportCustomers} disabled={filtered.length === 0} />
          <button
            onClick={() => setShowImport(true)}
            className="border border-blue-600 text-blue-700 hover:bg-blue-50 px-3 py-2 rounded-lg text-sm font-medium"
          >
            <Upload size={14} className="inline-block me-1" />{t("common.import")}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("customers.name")}</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Ø§Ù„Ø´Ø±ÙƒØ©</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("customers.phone")}</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("customers.email")}</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Ø§Ù„Ù…Ø¯ÙŠÙ†Ø©</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("customers.creditLimit")}</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Ø§Ù„Ù†ÙˆØ¹</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Ù†Ø´Ø·</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-10">
                    <div className="flex items-center justify-center">
                      <PrinterLoader size="sm" label={t("common.loading")} />
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-gray-400">
                    {t("common.noData")}
                  </td>
                </tr>
              ) : (
                paged.map((customer) => (
                  <tr
                    key={customer.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => openDetails(customer.id)}
                  >
                    <td className="px-4 py-3 text-sm font-medium">{customer.name}</td>
                    <td className="px-4 py-3 text-sm">{customer.companyName || "â€”"}</td>
                    <td className="px-4 py-3 text-sm">{customer.phone || "â€”"}</td>
                    <td className="px-4 py-3 text-sm">{customer.email || "â€”"}</td>
                    <td className="px-4 py-3 text-sm">{customer.city || "â€”"}</td>
                    <td className="px-4 py-3 text-sm">{customer.creditLimit.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${TYPE_BADGES[customer.customerType] || ""}`}>
                        {TYPE_LABELS[customer.customerType] || customer.customerType}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${customer.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                        {customer.isActive ? "Ù†Ø¹Ù…" : "Ù„Ø§"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(customer.id); }}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        <Trash2 size={14} className="inline-block me-1" />{t("common.delete")}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={safePage}
          totalPages={totalPages}
          onPageChange={setPage}
          totalItems={filtered.length}
          pageSize={PAGE_SIZE}
        />
      </div>

      <ImportDialog
        open={showImport}
        onClose={() => setShowImport(false)}
        entity="customers"
        title={`${t("common.import")} â€” ${t("customers.title")}`}
        onImported={fetchCustomers}
      />
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-lg font-bold text-slate-900">{value}</p></div>;
}

function CustomerPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-xl border border-gray-200 p-4"><h3 className="mb-2 font-semibold">{title}</h3>{children}</section>;
}
