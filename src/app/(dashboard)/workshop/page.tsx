"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/context";

interface Machine {
  id: string;
  serialNumber: string;
  manufacturer: string;
  model: string;
  status: string;
  purchaseDate?: string;
  notes?: string;
}

interface ScrapForm {
  reason: string;
  approvedBy: string;
  scrapValue: number;
}

const statusColors: Record<string, string> = {
  UNDER_INSPECTION: "bg-yellow-100 text-yellow-800",
  UNDER_MAINTENANCE: "bg-orange-100 text-orange-800",
};

const STATUS_LABELS: Record<string, string> = {
  UNDER_INSPECTION: "تحت الفحص",
  UNDER_MAINTENANCE: "تحت الصيانة",
  SOLD: "مباع",
  RENTED: "مؤجر",
  IN_WAREHOUSE: "في المستودع",
  SCRAPPED: "مهمل",
};

export default function WorkshopPage() {
  const { t } = useI18n();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [scrapTarget, setScrapTarget] = useState<string | null>(null);
  const [scrapForm, setScrapForm] = useState<ScrapForm>({
    reason: "",
    approvedBy: "",
    scrapValue: 0,
  });

  const fetchMachines = () => {
    fetch("/api/workshop")
      .then((r) => r.json())
      .then((data) => {
        setMachines(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchMachines();
  }, []);

  const handleScrap = async (e: React.FormEvent, machineId: string) => {
    e.preventDefault();
    await fetch(`/api/workshop/${machineId}/scrap`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(scrapForm),
    });
    setScrapForm({ reason: "", approvedBy: "", scrapValue: 0 });
    setScrapTarget(null);
    fetchMachines();
  };

  return (
    <div dir="rtl">
      <h1 className="text-2xl font-bold mb-6">{t("workshop.title")}</h1>

      <div className="bg-white rounded-xl shadow-md p-6">
        {loading ? (
          <p className="text-gray-500">{t("common.loading")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">{t("machines.serialNumber")}</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">{t("machines.manufacturer")}</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">{t("machines.model")}</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">{t("machines.status")}</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">{t("workshop.purchaseDate")}</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">{t("common.notes")}</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {machines.map((machine) => (
                  <tr key={machine.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{machine.serialNumber}</td>
                    <td className="px-4 py-3 text-sm">{machine.manufacturer}</td>
                    <td className="px-4 py-3 text-sm">{machine.model}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[machine.status] || "bg-gray-100 text-gray-800"}`}>
                        {STATUS_LABELS[machine.status] || machine.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">{machine.purchaseDate ? new Date(machine.purchaseDate).toLocaleDateString("ar-EG") : "-"}</td>
                    <td className="px-4 py-3 text-sm max-w-xs truncate">{machine.notes || "-"}</td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={() => setScrapTarget(scrapTarget === machine.id ? null : machine.id)}
                        className="bg-red-500 text-white px-3 py-1 rounded-lg text-xs hover:bg-red-600 transition"
                      >
                        {t("workshop.createScrapOrder")}
                      </button>
                    </td>
                  </tr>
                ))}
                {machines.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">{t("common.noData")}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {scrapTarget && (
        <div className="bg-white rounded-xl shadow-md p-6 mt-6">
          <h2 className="text-lg font-semibold mb-4">{t("workshop.scrapOrder")} - {machines.find((m) => m.id === scrapTarget)?.serialNumber}</h2>
          <form onSubmit={(e) => handleScrap(e, scrapTarget)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("workshop.reason")}</label>
              <textarea
                value={scrapForm.reason}
                onChange={(e) => setScrapForm({ ...scrapForm, reason: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("workshop.approvedBy")}</label>
              <input
                type="text"
                value={scrapForm.approvedBy}
                onChange={(e) => setScrapForm({ ...scrapForm, approvedBy: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("workshop.scrapValue")}</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={scrapForm.scrapValue}
                onChange={(e) => setScrapForm({ ...scrapForm, scrapValue: Number(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition">
                {t("common.submit")}
              </button>
              <button type="button" onClick={() => setScrapTarget(null)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition">
                {t("common.cancel")}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
