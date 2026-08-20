"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/context";

interface Contract {
  id: string;
  contractNumber: string;
  customerId?: string;
  customerName?: string;
  type?: string;
  value: number;
  status: string;
}

interface Engineer {
  id: string;
  name: string;
  areas?: string[];
  skills?: string[];
  salary: number;
  commissionRate?: number;
}

const reportCards = [
  { key: "contractProfitability", icon: "💰", description: "revenueMinusCosts" },
  { key: "engineerPerformance", icon: "👷", description: "visitResolutionSales" },
  { key: "liveCashPosition", icon: "💵", description: "settlementsUnverified" },
  { key: "machinesNeedingInspection", icon: "🔍", description: "underInspectionCount" },
  { key: "expiringWarranties", icon: "🛡️", description: "warrantyExpiry" },
  { key: "customerSatisfaction", icon: "⭐", description: "averageRatings" },
  { key: "investorDistribution", icon: "📊", description: "distributionHistory" },
  { key: "sparePartsMatrix", icon: "🔧", description: "compatibilityMatrix" },
];

export default function ReportsPage() {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [loadingContracts, setLoadingContracts] = useState(false);
  const [loadingEngineers, setLoadingEngineers] = useState(false);

  const toggleCard = (key: string) => {
    if (expanded === key) {
      setExpanded(null);
      return;
    }
    setExpanded(key);

    if (key === "contractProfitability" && contracts.length === 0) {
      setLoadingContracts(true);
      fetch("/api/contracts")
        .then((r) => r.json())
        .then((data) => {
          setContracts(Array.isArray(data) ? data : []);
          setLoadingContracts(false);
        })
        .catch(() => setLoadingContracts(false));
    }

    if (key === "engineerPerformance" && engineers.length === 0) {
      setLoadingEngineers(true);
      fetch("/api/engineers")
        .then((r) => r.json())
        .then((data) => {
          setEngineers(Array.isArray(data) ? data : []);
          setLoadingEngineers(false);
        })
        .catch(() => setLoadingEngineers(false));
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{t("reports")}</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reportCards.map((card) => (
          <div key={card.key}>
            <button
              onClick={() => toggleCard(card.key)}
              className="bg-white rounded-xl shadow-md p-6 w-full text-left hover:shadow-lg transition cursor-pointer"
            >
              <div className="text-3xl mb-3">{card.icon}</div>
              <h3 className="text-lg font-semibold mb-1">{t(card.key)}</h3>
              <p className="text-sm text-gray-500">{t(card.description)}</p>
            </button>

            {expanded === card.key && card.key === "contractProfitability" && (
              <div className="bg-white rounded-xl shadow-md p-6 mt-3">
                <h3 className="text-lg font-semibold mb-4">{t("contractProfitability")}</h3>
                {loadingContracts ? (
                  <p className="text-gray-500">{t("loading")}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">{t("contractNumber")}</th>
                          <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">{t("customer")}</th>
                          <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">{t("type")}</th>
                          <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">{t("value")}</th>
                          <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">{t("status")}</th>
                          <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">{t("estimatedProfit")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {contracts.map((c) => {
                          const estimatedCosts = c.value * 0.6;
                          const estimatedProfit = c.value - estimatedCosts;
                          return (
                            <tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm font-medium">{c.contractNumber}</td>
                              <td className="px-4 py-3 text-sm">{c.customerName || c.customerId}</td>
                              <td className="px-4 py-3 text-sm">{c.type || "-"}</td>
                              <td className="px-4 py-3 text-sm">{c.value.toLocaleString()}</td>
                              <td className="px-4 py-3 text-sm">
                                <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {c.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <span className={`font-medium ${estimatedProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                                  {estimatedProfit.toLocaleString()}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                        {contracts.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-gray-400">{t("noData")}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {expanded === card.key && card.key === "engineerPerformance" && (
              <div className="bg-white rounded-xl shadow-md p-6 mt-3">
                <h3 className="text-lg font-semibold mb-4">{t("engineerPerformance")}</h3>
                {loadingEngineers ? (
                  <p className="text-gray-500">{t("loading")}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">{t("name")}</th>
                          <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">{t("areas")}</th>
                          <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">{t("skills")}</th>
                          <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">{t("salary")}</th>
                          <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">{t("commissionRate")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {engineers.map((eng) => (
                          <tr key={eng.id} className="border-t border-gray-100 hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium">{eng.name}</td>
                            <td className="px-4 py-3 text-sm">
                              {(eng.areas || []).map((a) => (
                                <span key={a} className="inline-flex px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800 mr-1 mb-1">
                                  {a}
                                </span>
                              ))}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {(eng.skills || []).map((s) => (
                                <span key={s} className="inline-flex px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800 mr-1 mb-1">
                                  {s}
                                </span>
                              ))}
                            </td>
                            <td className="px-4 py-3 text-sm">{eng.salary.toLocaleString()}</td>
                            <td className="px-4 py-3 text-sm">{eng.commissionRate != null ? `${eng.commissionRate}%` : "-"}</td>
                          </tr>
                        ))}
                        {engineers.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-gray-400">{t("noData")}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {expanded === card.key && !["contractProfitability", "engineerPerformance"].includes(card.key) && (
              <div className="bg-white rounded-xl shadow-md p-6 mt-3">
                <p className="text-gray-400 text-sm">{t("comingSoon")}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
