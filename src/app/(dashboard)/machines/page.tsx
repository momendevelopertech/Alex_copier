"use client";

import { useEffect, useState, useMemo } from "react";
import { useI18n } from "@/i18n/context";
import Pagination from "@/components/Pagination";

interface Machine {
  id: string;
  serialNumber: string;
  manufacturer: string;
  model: string;
  isColor: boolean;
  paperSize: string;
  currentStatus: string;
  purchaseDate: string;
  purchasePrice: number;
  notes: string;
  currentOwnerId: string;
  currentOwner: { name: string } | null;
  createdAt: string;
}

interface MachineDetails extends Machine {
  currentOwner: { id: string; name: string; phone?: string | null } | null;
  customerLocation: { name: string; address?: string | null; customer: { id: string; name: string } } | null;
  warranty: { startDate: string; endDate: string; isExpired: boolean } | null;
  meterReadings: { id: string; reading: number; readingDate: string; source: string; notes?: string | null }[];
  history: { id: string; transactionType: string; date: string; financialValue?: number | null; notes?: string | null; customer?: { name: string } | null }[];
  contracts: { id: string; contract: { contractNumber: string; status: string; endDate: string; contractType: string } }[];
  serviceRequests: { id: string; requestNumber: string; status: string; priority: string; createdAt: string; engineer?: { name: string } | null; visits: { id: string; visitedAt: string; resolved: boolean; engineer: { name: string } }[] }[];
}

const STATUS_COLORS: Record<string, string> = {
  SOLD: "bg-green-100 text-green-800",
  RENTED: "bg-blue-100 text-blue-800",
  IN_WAREHOUSE: "bg-gray-100 text-gray-800",
  UNDER_MAINTENANCE: "bg-yellow-100 text-yellow-800",
  UNDER_INSPECTION: "bg-orange-100 text-orange-800",
  SCRAPPED: "bg-red-100 text-red-800",
};

const STATUS_LABELS: Record<string, string> = {
  SOLD: "مباع",
  RENTED: "مؤجر",
  IN_WAREHOUSE: "في المستودع",
  UNDER_MAINTENANCE: "تحت الصيانة",
  UNDER_INSPECTION: "تحت الفحص",
  SCRAPPED: "مهمل",
};

const emptyForm = {
  serialNumber: "",
  manufacturer: "",
  model: "",
  isColor: false,
  paperSize: "A4",
  purchaseDate: "",
  purchasePrice: "",
  notes: "",
  currentOwnerId: "",
};

export default function MachinesPage() {
  const { t, dir, locale } = useI18n();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<MachineDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  const fetchMachines = async () => {
    setLoading(true);
    const res = await fetch("/api/machines");
    const data = await res.json();
    setMachines(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchMachines();
  }, []);

  const filtered = machines.filter(
    (m) =>
      m.serialNumber.toLowerCase().includes(search.toLowerCase()) ||
      (m.model && m.model.toLowerCase().includes(search.toLowerCase()))
  );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/machines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        purchasePrice: form.purchasePrice ? parseFloat(form.purchasePrice) : null,
        purchaseDate: form.purchaseDate || null,
        currentOwnerId: form.currentOwnerId || null,
      }),
    });
    setForm(emptyForm);
    setShowForm(false);
    fetchMachines();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من الحذف؟")) return;
    await fetch(`/api/machines/${id}`, { method: "DELETE" });
    fetchMachines();
  };

  const setField = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const openDetails = async (id: string) => {
    setDetailsLoading(true);
    const res = await fetch(`/api/machines/${id}`);
    if (res.ok) setSelected(await res.json());
    setDetailsLoading(false);
  };

  const date = (value: string) => new Date(value).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-GB");
  const isOpen = (status: string) => !["RESOLVED", "CLOSED"].includes(status);

  return (
    <div dir={dir}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between mb-6">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">{t("machines.title")}</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          {showForm ? t("common.cancel") : t("machines.addMachine")}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">{t("machines.addMachine")}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder={t("machines.serialNumber")}
              value={form.serialNumber}
              onChange={(e) => setField("serialNumber", e.target.value)}
              className="border rounded-lg px-4 py-2 w-full"
              required
            />
            <input
              type="text"
              placeholder={t("machines.manufacturer")}
              value={form.manufacturer}
              onChange={(e) => setField("manufacturer", e.target.value)}
              className="border rounded-lg px-4 py-2 w-full"
            />
            <input
              type="text"
              placeholder={t("machines.model")}
              value={form.model}
              onChange={(e) => setField("model", e.target.value)}
              className="border rounded-lg px-4 py-2 w-full"
            />
            <label className="flex items-center gap-2 border rounded-lg px-4 py-2 w-full">
              <input
                type="checkbox"
                checked={form.isColor}
                onChange={(e) => setField("isColor", e.target.checked)}
              />
              <span>ملون</span>
            </label>
            <select
              value={form.paperSize}
              onChange={(e) => setField("paperSize", e.target.value)}
              className="border rounded-lg px-4 py-2 w-full"
            >
              <option value="A4">A4</option>
              <option value="A3">A3</option>
              <option value="A3_A4">A3/A4</option>
            </select>
            <input
              type="date"
              placeholder="تاريخ الشراء"
              value={form.purchaseDate}
              onChange={(e) => setField("purchaseDate", e.target.value)}
              className="border rounded-lg px-4 py-2 w-full"
            />
            <input
              type="number"
              placeholder="سعر الشراء"
              value={form.purchasePrice}
              onChange={(e) => setField("purchasePrice", e.target.value)}
              className="border rounded-lg px-4 py-2 w-full"
            />
            <input
              type="text"
              placeholder="معرّف المالك الحالي"
              value={form.currentOwnerId}
              onChange={(e) => setField("currentOwnerId", e.target.value)}
              className="border rounded-lg px-4 py-2 w-full"
            />
            <input
              type="text"
              placeholder={t("common.notes")}
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
              className="border rounded-lg px-4 py-2 w-full"
            />
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              {t("common.save")}
            </button>
          </form>
        </div>
      )}

      <div className="mb-4">
        <input
          type="text"
          placeholder={t("common.search") + "..."}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded-lg px-4 py-2 w-full md:w-96"
        />
      </div>

      <div className="bg-white rounded-xl overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("machines.serialNumber")}</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("machines.manufacturer")}</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("machines.model")}</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("machines.status")}</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">حجم الورق</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">المالك الحالي</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("common.date")}</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-400">
                    {t("common.loading")}
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-400">
                    {t("common.noData")}
                  </td>
                </tr>
              ) : (
                paged.map((machine) => (
                  <tr key={machine.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{machine.serialNumber}</td>
                    <td className="px-4 py-3 text-sm">{machine.manufacturer}</td>
                    <td className="px-4 py-3 text-sm">{machine.model}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          STATUS_COLORS[machine.currentStatus] || "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {STATUS_LABELS[machine.currentStatus] || machine.currentStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">{machine.paperSize}</td>
                    <td className="px-4 py-3 text-sm">{machine.currentOwner?.name || "—"}</td>
                    <td className="px-4 py-3 text-sm">
                      {new Date(machine.createdAt).toLocaleDateString("ar-EG")}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openDetails(machine.id)}
                        className="text-blue-600 hover:text-blue-800 text-sm me-3"
                      >
                        {t("machineDetails.view")}
                      </button>
                      <button
                        onClick={() => handleDelete(machine.id)}
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
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
          totalItems={filtered.length}
          pageSize={PAGE_SIZE}
        />
      </div>

      {(selected || detailsLoading) && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8" role="dialog" aria-modal="true">
          <div className="my-auto w-full max-w-5xl rounded-2xl bg-slate-50 shadow-2xl" dir={dir}>
            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-5 py-4 sm:px-7">
              <div>
                <p className="text-sm text-slate-500">{t("machines.title")}</p>
                <h2 className="text-xl font-bold text-slate-900">{selected?.serialNumber || t("common.loading")}</h2>
              </div>
              <button onClick={() => setSelected(null)} className="rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-100">{t("common.close")}</button>
            </div>
            {detailsLoading || !selected ? <p className="p-8 text-slate-500">{t("common.loading")}</p> : (
              <div className="space-y-6 p-5 sm:p-7">
                <section className="grid gap-4 md:grid-cols-4">
                  <Info label={t("machines.manufacturer")} value={selected.manufacturer || "—"} />
                  <Info label={t("machines.model")} value={selected.model || "—"} />
                  <Info label={t("machines.status")} value={STATUS_LABELS[selected.currentStatus] || selected.currentStatus} />
                  <Info label={t("machineDetails.currentMeter")} value={selected.meterReadings[0]?.reading?.toLocaleString() || "—"} />
                </section>

                <section className="grid gap-4 lg:grid-cols-2">
                  <Panel title={t("machineDetails.customer")}>
                    <p className="font-semibold">{selected.currentOwner?.name || selected.customerLocation?.customer.name || "—"}</p>
                    <p className="mt-1 text-sm text-slate-600">{t("machineDetails.location")}: {selected.customerLocation?.name || "—"}</p>
                    {selected.customerLocation?.address && <p className="text-sm text-slate-500">{selected.customerLocation.address}</p>}
                  </Panel>
                  <Panel title={t("machineDetails.warranty")}>
                    {selected.warranty ? <>
                      <p className={selected.warranty.isExpired || new Date(selected.warranty.endDate) < new Date() ? "font-medium text-red-700" : "font-medium text-emerald-700"}>{selected.warranty.isExpired || new Date(selected.warranty.endDate) < new Date() ? t("machineDetails.notCovered") : t("machineDetails.covered")}</p>
                      <p className="mt-1 text-sm text-slate-600">{t("machineDetails.expires")}: {date(selected.warranty.endDate)}</p>
                    </> : <Empty text={t("machineDetails.noWarranty")} />}
                  </Panel>
                </section>

                <section className="grid gap-4 lg:grid-cols-2">
                  <Panel title={t("machineDetails.contracts")}>
                    {selected.contracts.length ? <div className="space-y-2">{selected.contracts.map(({ id, contract }) => <div key={id} className="flex justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"><span className="font-medium">{contract.contractNumber}</span><span>{contract.status} · {date(contract.endDate)}</span></div>)}</div> : <Empty text={t("machineDetails.noContracts")} />}
                  </Panel>
                  <Panel title={t("machineDetails.meter")}>
                    {selected.meterReadings.length ? <div className="space-y-2">{selected.meterReadings.slice(0, 5).map(reading => <div key={reading.id} className="flex justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"><span className="font-medium">{reading.reading.toLocaleString()}</span><span>{date(reading.readingDate)} · {reading.source}</span></div>)}</div> : <Empty text={t("machineDetails.noMeters")} />}
                  </Panel>
                </section>

                <Panel title={`${t("machineDetails.service")} · ${selected.serviceRequests.filter(r => isOpen(r.status)).length} ${t("machineDetails.openRequests")}`}>
                  {selected.serviceRequests.length ? <div className="space-y-3">{selected.serviceRequests.map(request => <div key={request.id} className="rounded-lg border border-slate-200 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-semibold">{request.requestNumber}</span><span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{request.status}</span></div><p className="mt-1 text-sm text-slate-600">{t("machineDetails.assignedTo")}: {request.engineer?.name || "—"} · {date(request.createdAt)}</p>{request.visits.length > 0 && <p className="mt-1 text-sm text-slate-500">{t("machineDetails.visits")}: {request.visits.length}</p>}</div>)}</div> : <Empty text={t("machineDetails.noService")} />}
                </Panel>

                <Panel title={t("machineDetails.timeline")}>
                  <div className="space-y-3 border-s border-slate-200 ps-4">{[
                    { id: "created", at: selected.createdAt, title: t("machineDetails.created"), detail: selected.serialNumber },
                    ...selected.history.map(event => ({ id: event.id, at: event.date, title: event.transactionType, detail: event.customer?.name || event.notes || "" })),
                    ...selected.serviceRequests.map(request => ({ id: request.id, at: request.createdAt, title: `${t("machineDetails.request")} ${request.requestNumber}`, detail: request.status })),
                    ...selected.serviceRequests.flatMap(request => request.visits.map(visit => ({ id: visit.id, at: visit.visitedAt, title: `${t("machineDetails.visits")} · ${visit.engineer.name}`, detail: visit.resolved ? t("common.resolve") : "" }))),
                  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).map(event => <div key={event.id} className="relative"><span className="absolute -start-[21px] top-1.5 size-2.5 rounded-full bg-blue-500"/><p className="font-medium text-sm">{event.title}</p><p className="text-xs text-slate-500">{date(event.at)} {event.detail && `· ${event.detail}`}</p></div>)}</div>
                </Panel>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 font-semibold text-slate-900">{value}</p></div>;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-xl border border-slate-200 bg-white p-4"><h3 className="mb-3 font-semibold text-slate-900">{title}</h3>{children}</section>;
}

function Empty({ text }: { text: string }) {
  return <p className="py-2 text-sm text-slate-500">{text}</p>;
}
