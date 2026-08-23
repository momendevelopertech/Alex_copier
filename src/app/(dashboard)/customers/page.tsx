"use client";

import { useEffect, useState, useMemo } from "react";
import { useI18n } from "@/i18n/context";
import Pagination from "@/components/Pagination";
import SearchInput, { matchesQuery } from "@/components/SearchInput";
import FilterSelect from "@/components/FilterSelect";
import ExportButton from "@/components/ExportButton";
import ImportDialog from "@/components/ImportDialog";
import PrinterLoader from "@/components/PrinterLoader";

interface CustomerLocation {
  id: string;
  name: string;
  address: string;
  city: string;
  governorate: string;
  phone: string;
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
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [showImport, setShowImport] = useState(false);
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
    setSearch("");
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
    if (!confirm("هل أنت متأكد من الحذف؟")) return;
    await fetch(`/api/customers/${id}`, { method: "DELETE" });
    fetchCustomers();
    setSelected(null);
  };

  const setField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const openDetails = async (id: string) => {
    const res = await fetch(`/api/customers/${id}`);
    if (res.ok) setSelected(await res.json());
  };
  const date = (value: string) => new Date(value).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-GB");
  const isOpen = (status: string) => !["RESOLVED", "CLOSED"].includes(status);

  const TYPE_BADGES: Record<string, string> = {
    INDIVIDUAL: "bg-blue-100 text-blue-800",
    COMPANY: "bg-purple-100 text-purple-800",
  };

  const TYPE_LABELS: Record<string, string> = {
    INDIVIDUAL: "فرد",
    COMPANY: "شركة",
  };

  return (
    <div dir={dir}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between mb-6">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">{t("customers.title")}</h1>
        <button
          onClick={() => { setShowForm(!showForm); setSelected(null); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          {showForm ? t("common.cancel") : t("customers.addCustomer")}
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
              placeholder="اسم الشركة"
              value={form.companyName}
              onChange={(e) => setField("companyName", e.target.value)}
              className="border rounded-lg px-4 py-2 w-full"
            />
            <input
              type="text"
              placeholder="جهة الاتصال"
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
              placeholder="واتساب"
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
              placeholder="المدينة"
              value={form.city}
              onChange={(e) => setField("city", e.target.value)}
              className="border rounded-lg px-4 py-2 w-full"
            />
            <input
              type="text"
              placeholder="المحافظة"
              value={form.governorate}
              onChange={(e) => setField("governorate", e.target.value)}
              className="border rounded-lg px-4 py-2 w-full"
            />
            <input
              type="text"
              placeholder="الرقم الضريبي"
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
              placeholder="شروط الدفع"
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
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
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
            <div><span className="text-gray-500">الشركة:</span> {selected.companyName || "—"}</div>
            <div><span className="text-gray-500">جهة الاتصال:</span> {selected.contactPerson || "—"}</div>
            <div><span className="text-gray-500">{t("customers.phone")}:</span> {selected.phone || "—"}</div>
            <div><span className="text-gray-500">{t("customers.email")}:</span> {selected.email || "—"}</div>
            <div><span className="text-gray-500">{t("customers.address")}:</span> {selected.address || "—"}</div>
            <div><span className="text-gray-500">المدينة:</span> {selected.city || "—"}</div>
            <div><span className="text-gray-500">المحافظة:</span> {selected.governorate || "—"}</div>
            <div><span className="text-gray-500">الرقم الضريبي:</span> {selected.taxNumber || "—"}</div>
            <div><span className="text-gray-500">{t("customers.creditLimit")}:</span> {selected.creditLimit}</div>
            <div><span className="text-gray-500">شروط الدفع:</span> {selected.paymentTerms || "—"}</div>
            <div>
              <span className="text-gray-500">النوع:</span>{" "}
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

          {selected.locations.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-2">{t("customers.locations")}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-right">الاسم</th>
                      <th className="px-4 py-2 text-right">العنوان</th>
                      <th className="px-4 py-2 text-right">المدينة</th>
                      <th className="px-4 py-2 text-right">المحافظة</th>
                      <th className="px-4 py-2 text-right">الهاتف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {selected.locations.map((loc) => (
                      <tr key={loc.id}>
                        <td className="px-4 py-2">{loc.name}</td>
                        <td className="px-4 py-2">{loc.address || "—"}</td>
                        <td className="px-4 py-2">{loc.city || "—"}</td>
                        <td className="px-4 py-2">{loc.governorate || "—"}</td>
                        <td className="px-4 py-2">{loc.phone || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="grid gap-4 mt-5 lg:grid-cols-2">
            <CustomerPanel title={t("customers.machines")}>
              {selected.machines?.length ? selected.machines.map(machine => <div key={machine.id} className="flex justify-between border-b border-gray-100 py-2 text-sm"><span className="font-medium">{machine.serialNumber}</span><span>{[machine.manufacturer, machine.model].filter(Boolean).join(" ") || "—"} · {machine.currentStatus}</span></div>) : <p className="text-sm text-gray-400">{t("common.noData")}</p>}
            </CustomerPanel>
            <CustomerPanel title={t("customers.serviceHistory")}>
              {selected.serviceRequests?.length ? selected.serviceRequests.slice(0, 6).map(request => <div key={request.id} className="flex justify-between border-b border-gray-100 py-2 text-sm"><span className="font-medium">{request.requestNumber}</span><span>{request.machine?.serialNumber || "—"} · {request.status} · {date(request.createdAt)}</span></div>) : <p className="text-sm text-gray-400">{t("common.noData")}</p>}
            </CustomerPanel>
            <CustomerPanel title={t("customers.contracts")}>
              {selected.contracts?.length ? selected.contracts.map(contract => <div key={contract.id} className="flex justify-between border-b border-gray-100 py-2 text-sm"><span className="font-medium">{contract.contractNumber}</span><span>{contract.status} · {date(contract.endDate)}</span></div>) : <p className="text-sm text-gray-400">{t("common.noData")}</p>}
            </CustomerPanel>
            <CustomerPanel title={t("customers.sales")}>
              {selected.orders?.length ? selected.orders.slice(0, 6).map(order => <div key={order.id} className="flex justify-between border-b border-gray-100 py-2 text-sm"><span>{date(order.orderDate)}</span><span>{order.total.toLocaleString()} · {order.status}</span></div>) : <p className="text-sm text-gray-400">{t("common.noData")}</p>}
            </CustomerPanel>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={() => handleDelete(selected.id)}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm"
            >
              {t("common.delete")}
            </button>
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:flex-wrap">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={t("customers.searchPlaceholder")}
        />
        <FilterSelect
          value={typeFilter}
          onChange={(v) => { setTypeFilter(v); setPage(1); }}
          options={[
            { value: "INDIVIDUAL", label: TYPE_LABELS.INDIVIDUAL },
            { value: "COMPANY", label: TYPE_LABELS.COMPANY },
          ]}
          allLabel={`${t("customers.typeFilter")} — ${t("common.all")}`}
          className="md:w-44"
        />
        <FilterSelect
          value={cityFilter}
          onChange={(v) => { setCityFilter(v); setPage(1); }}
          options={cities.map((c) => ({ value: c, label: c }))}
          allLabel={`${t("customers.city")} — ${t("common.all")}`}
          className="md:w-40"
        />
        <FilterSelect
          value={activeFilter}
          onChange={(v) => { setActiveFilter(v); setPage(1); }}
          options={[
            { value: "true", label: t("common.yes") },
            { value: "false", label: t("common.no") },
          ]}
          allLabel={`${t("common.status")} — ${t("common.all")}`}
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
            {t("common.import")}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("customers.name")}</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">الشركة</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("customers.phone")}</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("customers.email")}</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">المدينة</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("customers.creditLimit")}</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">النوع</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">نشط</th>
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
                    <td className="px-4 py-3 text-sm">{customer.companyName || "—"}</td>
                    <td className="px-4 py-3 text-sm">{customer.phone || "—"}</td>
                    <td className="px-4 py-3 text-sm">{customer.email || "—"}</td>
                    <td className="px-4 py-3 text-sm">{customer.city || "—"}</td>
                    <td className="px-4 py-3 text-sm">{customer.creditLimit.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${TYPE_BADGES[customer.customerType] || ""}`}>
                        {TYPE_LABELS[customer.customerType] || customer.customerType}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${customer.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                        {customer.isActive ? "نعم" : "لا"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(customer.id); }}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        {t("common.delete")}
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
        title={`${t("common.import")} — ${t("customers.title")}`}
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
