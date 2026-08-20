"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/context";

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
  const { t } = useI18n();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);

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

  return (
    <div dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">{t("machines.title")}</h1>
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
                filtered.map((machine) => (
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
      </div>
    </div>
  );
}
