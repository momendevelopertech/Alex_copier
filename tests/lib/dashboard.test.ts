import { describe, expect, it } from "vitest";
import {
  buildAlerts,
  buildCompanyPerformance,
  buildEngineerWorkload,
  buildExpiringContracts,
  machinesInService,
  toRecentRequestViews,
  OPEN_REQUEST_STATUSES,
  CONTRACT_EXPIRY_WINDOW_DAYS,
} from "@/lib/dashboard";

const NOW = new Date("2026-08-15T12:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;

describe("OPEN_REQUEST_STATUSES", () => {
  it("covers every status that keeps a request operational", () => {
    expect(OPEN_REQUEST_STATUSES).toEqual(["NEW", "ASSIGNED", "VISITED", "NOT_RESOLVED", "REASSIGNED"]);
    expect(OPEN_REQUEST_STATUSES).not.toContain("RESOLVED");
    expect(OPEN_REQUEST_STATUSES).not.toContain("CLOSED");
  });
});

describe("buildCompanyPerformance", () => {
  it("maps aggregates to company rows using the Arabic name", () => {
    const companies = [{ id: "c1", name: "alex-copier", nameAr: "اليكس كوبير" }];
    const finance = {
      c1: {
        sales: { _sum: { total: 1500 } },
        purchases: { _sum: { total: 400 } },
        expenses: { _sum: { amount: 100 } },
        settlements: { _sum: { amount: 900 } },
        openRequests: 3,
      },
    };

    expect(buildCompanyPerformance(companies, finance)).toEqual([
      { id: "c1", name: "اليكس كوبير", sales: 1500, purchases: 400, expenses: 100, collected: 900, openRequests: 3 },
    ]);
  });

  it("falls back to latin name when nameAr is missing and zeros for missing aggregates", () => {
    const companies = [
      { id: "c1", name: "alpha" },
      { id: "c2", name: "beta", nameAr: null },
    ];

    const result = buildCompanyPerformance(companies, {});
    expect(result).toEqual([
      { id: "c1", name: "alpha", sales: 0, purchases: 0, expenses: 0, collected: 0, openRequests: 0 },
      { id: "c2", name: "beta", sales: 0, purchases: 0, expenses: 0, collected: 0, openRequests: 0 },
    ]);
  });

  it("treats null sums as zero", () => {
    const companies = [{ id: "c1", name: "alpha" }];
    const finance = {
      c1: {
        sales: { _sum: { total: null } },
        purchases: { _sum: { total: 50 } },
        expenses: { _sum: { amount: null } },
        settlements: { _sum: { amount: null } },
        openRequests: 0,
      },
    };

    const [row] = buildCompanyPerformance(companies, finance);
    expect(row.sales).toBe(0);
    expect(row.purchases).toBe(50);
    expect(row.expenses).toBe(0);
    expect(row.collected).toBe(0);
  });
});

describe("machinesInService", () => {
  it("sums maintenance and inspection counts", () => {
    expect(machinesInService({ UNDER_MAINTENANCE: 4, UNDER_INSPECTION: 2, SOLD: 10 })).toBe(6);
  });

  it("returns zero when statuses are absent or empty", () => {
    expect(machinesInService({})).toBe(0);
    expect(machinesInService({ SOLD: 5 })).toBe(0);
  });
});

describe("buildEngineerWorkload", () => {
  it("merges visits and assignments per engineer with names", () => {
    const visits = [{ engineerId: "e1", _count: { _all: 7 } }];
    const assigned = [
      { engineerId: "e1", _count: { _all: 3 } },
      { engineerId: "e2", _count: { _all: 5 } },
    ];
    const engineers = [
      { id: "e1", name: "أحمد" },
      { id: "e2", name: "محمد" },
    ];

    expect(buildEngineerWorkload(visits, assigned, engineers)).toEqual([
      { engineerId: "e2", name: "محمد", visitsThisMonth: 0, openAssigned: 5 },
      { engineerId: "e1", name: "أحمد", visitsThisMonth: 7, openAssigned: 3 },
    ]);
  });

  it("uses a dash for engineers missing from the table", () => {
    const result = buildEngineerWorkload([{ engineerId: "ghost", _count: { _all: 2 } }], [], []);
    expect(result[0].name).toBe("—");
    expect(result[0].visitsThisMonth).toBe(2);
    expect(result[0].openAssigned).toBe(0);
  });

  it("breaks ties by visits then name", () => {
    const assigned = [
      { engineerId: "a", _count: { _all: 2 } },
      { engineerId: "b", _count: { _all: 2 } },
      { engineerId: "c", _count: { _all: 2 } },
    ];
    const visits = [
      { engineerId: "b", _count: { _all: 4 } },
      { engineerId: "a", _count: { _all: 4 } },
      { engineerId: "c", _count: { _all: 1 } },
    ];
    const engineers = [
      { id: "a", name: "كريم" },
      { id: "b", name: "سامي" },
      { id: "c", name: "عمر" },
    ];

    expect(buildEngineerWorkload(visits, assigned, engineers).map((r) => r.engineerId)).toEqual(["b", "a", "c"]);
  });

  it("returns an empty array with no data", () => {
    expect(buildEngineerWorkload([], [], [])).toEqual([]);
  });
});

describe("buildExpiringContracts", () => {
  it("keeps only contracts inside the window sorted by days left", () => {
    const contracts = [
      { id: "far", contractNumber: "CT-100", endDate: new Date(NOW.getTime() + (CONTRACT_EXPIRY_WINDOW_DAYS + 5) * DAY_MS) },
      { id: "soon", contractNumber: "CT-101", endDate: new Date(NOW.getTime() + 3 * DAY_MS), customer: { name: "مكتب النور" } },
      { id: "mid", contractNumber: "CT-102", endDate: new Date(NOW.getTime() + 20 * DAY_MS) },
      { id: "past", contractNumber: "CT-103", endDate: new Date(NOW.getTime() - 2 * DAY_MS) },
      { id: "today", contractNumber: "CT-104", endDate: NOW },
    ];

    const result = buildExpiringContracts(contracts, NOW);
    expect(result.map((contract) => contract.id)).toEqual(["today", "soon", "mid"]);
    expect(result.find((contract) => contract.id === "soon")?.customerName).toBe("مكتب النور");
  });

  it("accepts ISO string end dates and reports days left as integer", () => {
    const result = buildExpiringContracts(
      [{ id: "c1", contractNumber: "CT-9", endDate: new Date(NOW.getTime() + 36 * 60 * 60 * 1000).toISOString() }],
      NOW
    );
    expect(result).toHaveLength(1);
    expect(result[0].daysLeft).toBeGreaterThanOrEqual(1);
    expect(result[0].daysLeft).toBeLessThanOrEqual(2);
  });

  it("returns empty list when nothing expires", () => {
    expect(buildExpiringContracts([], NOW)).toEqual([]);
  });
});

describe("buildAlerts", () => {
  it("returns nothing when operations are clean", () => {
    expect(
      buildAlerts({
        urgentRequests: 0,
        unassignedRequests: 0,
        overdueInstallments: { count: 0, totalAmount: 0 },
        expiringContracts: [],
      })
    ).toEqual([]);
  });

  it("orders high severity before medium", () => {
    const alerts = buildAlerts({
      urgentRequests: 2,
      unassignedRequests: 4,
      overdueInstallments: { count: 1, totalAmount: 5000 },
      expiringContracts: [
        { id: "c1", contractNumber: "CT-1", customerName: null, endDate: NOW.toISOString(), daysLeft: 5 },
      ],
    });

    expect(alerts.map((alert) => alert.severity)).toEqual(["HIGH", "HIGH", "MEDIUM", "MEDIUM"]);
    expect(alerts.map((alert) => alert.kind)).toEqual([
      "URGENT_REQUESTS",
      "OVERDUE_INSTALLMENTS",
      "UNASSIGNED_REQUESTS",
      "CONTRACTS_EXPIRING",
    ]);
  });

  it("carries installment totals and contract details", () => {
    const details = Array.from({ length: 8 }, (_, index) => ({
      id: `c${index}`,
      contractNumber: `CT-${index}`,
      customerName: null,
      endDate: NOW.toISOString(),
      daysLeft: index + 1,
    }));

    const alerts = buildAlerts({
      urgentRequests: 0,
      unassignedRequests: 0,
      overdueInstallments: { count: 3, totalAmount: 12500 },
      expiringContracts: details,
    });

    const installmentAlert = alerts.find((alert) => alert.kind === "OVERDUE_INSTALLMENTS");
    expect(installmentAlert?.count).toBe(3);
    expect(installmentAlert?.totalAmount).toBe(12500);

    const contractAlert = alerts.find((alert) => alert.kind === "CONTRACTS_EXPIRING");
    expect(contractAlert?.count).toBe(8);
    expect(contractAlert?.details).toHaveLength(5);
  });
});

describe("toRecentRequestViews", () => {
  it("flattens joined relations into a serializable view", () => {
    const views = toRecentRequestViews([
      {
        id: "r1",
        requestNumber: "SR-1",
        description: "الجهاز لا تعمل",
        priority: "URGENT",
        status: "ASSIGNED",
        createdAt: new Date("2026-08-01T00:00:00.000Z"),
        customer: { name: "شركة مصر" },
        machine: { serialNumber: "SN-77" },
        engineer: { name: "أحمد" },
      },
    ]);

    expect(views).toEqual([
      {
        id: "r1",
        requestNumber: "SR-1",
        description: "الجهاز لا تعمل",
        priority: "URGENT",
        status: "ASSIGNED",
        createdAt: "2026-08-01T00:00:00.000Z",
        customerName: "شركة مصر",
        machineSerial: "SN-77",
        engineerName: "أحمد",
      },
    ]);
  });

  it("fills defaults when relations are absent", () => {
    const [view] = toRecentRequestViews([
      {
        id: "r2",
        requestNumber: "SR-2",
        description: "وصف",
        priority: "NORMAL",
        status: "NEW",
        createdAt: "2026-08-02T00:00:00.000Z",
      },
    ]);

    expect(view.customerName).toBe("—");
    expect(view.machineSerial).toBeNull();
    expect(view.engineerName).toBeNull();
  });
});
