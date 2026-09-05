import { describe, it, expect } from "vitest";
import {
  assembleEngineerStatement,
  type EngineerStatementData,
} from "@/lib/engineer-statement";

const D = (iso: string) => new Date(iso);

function sampleData(overrides: Partial<EngineerStatementData> = {}): EngineerStatementData {
  return {
    engineer: {
      id: "eng-1",
      name: "أحمد رجب",
      phone: "01000000000",
      email: null,
      isActive: true,
      baseSalary: 8000,
      transportAllowance: 2000,
      commissionRate: 25,
    },
    salesOrders: [],
    settlements: [],
    serviceRequests: [],
    visits: [],
    salaryRecords: [],
    custodyItems: [],
    ...overrides,
  };
}

describe("engineer-statement", () => {
  describe("summary", () => {
    it("totals confirmed sales as money brought to the company", () => {
      const s = assembleEngineerStatement(
        sampleData({
          salesOrders: [
            { id: "so-1", total: 10000, createdAt: D("2026-01-01"), customer: { name: "عميل أ" } },
            { id: "so-2", total: 15000, createdAt: D("2026-02-01"), customer: { name: "عميل ب" } },
          ],
        }),
      );
      expect(s.summary.totalSales).toBe(25000);
      expect(s.summary.salesCount).toBe(2);
      expect(s.closingBalance).toBe(25000);
    });

    it("counts settlements only when VERIFIED, netting direction", () => {
      const s = assembleEngineerStatement(
        sampleData({
          settlements: [
            { id: "st-1", amount: 5000, direction: "ADDITION", reason: "تحصيل", settlementNumber: "S-1", status: "VERIFIED", createdAt: D("2026-01-10"), customer: null },
            { id: "st-2", amount: 1000, direction: "SUBTRACTION", reason: "فروق", settlementNumber: "S-2", status: "VERIFIED", createdAt: D("2026-01-12"), customer: null },
            { id: "st-3", amount: 999, direction: "ADDITION", reason: "لم يعتمد", settlementNumber: "S-3", status: "INITIAL", createdAt: D("2026-01-14"), customer: null },
          ],
        }),
      );
      expect(s.summary.settlementCount).toBe(2);
      expect(s.summary.totalCollections).toBe(4000);
      expect(s.closingBalance).toBe(4000);
    });

    it("sums commission and paid vs planned salary", () => {
      const s = assembleEngineerStatement(
        sampleData({
          salaryRecords: [
            { id: "sal-1", month: 7, year: 2026, commissionAmount: 750, netPayable: 8500, isPaid: true, createdAt: D("2026-08-05") },
            { id: "sal-2", month: 8, year: 2026, commissionAmount: 1200, netPayable: 10000, isPaid: false, createdAt: D("2026-09-05") },
          ],
        }),
      );
      expect(s.summary.totalCommission).toBe(1950);
      expect(s.summary.totalPlannedSalary).toBe(18500);
      expect(s.summary.totalSalaryPaid).toBe(8500);
    });

    it("counts requests by state and visits by resolution", () => {
      const s = assembleEngineerStatement(
        sampleData({
          serviceRequests: [
            { id: "rq-1", requestNumber: "R-1", status: "ASSIGNED", createdAt: D("2026-01-05"), customer: null },
            { id: "rq-2", requestNumber: "R-2", status: "RESOLVED", createdAt: D("2026-02-05"), customer: null },
            { id: "rq-3", requestNumber: "R-3", status: "CLOSED", createdAt: D("2026-03-05"), customer: null },
          ],
          visits: [
            { id: "vs-1", visitedAt: D("2026-01-06"), resolutionNotes: "تم", resolved: true, serviceRequest: { requestNumber: "R-1" } },
            { id: "vs-2", visitedAt: D("2026-02-06"), resolutionNotes: null, resolved: false, serviceRequest: { requestNumber: "R-2" } },
          ],
          custodyItems: [{ id: "cu-1", quantityIssued: 3 }],
        }),
      );
      expect(s.summary.serviceRequestCount).toBe(3);
      expect(s.summary.openRequests).toBe(1);
      expect(s.summary.resolvedRequests).toBe(2);
      expect(s.summary.visitsCount).toBe(2);
      expect(s.summary.resolvedVisits).toBe(1);
      expect(s.summary.custodyItems).toBe(1);
    });
  });

  describe("rows & balance", () => {
    it("merges activity chronologically and runs the money-flow balance", () => {
      const s = assembleEngineerStatement(
        sampleData({
          salesOrders: [
            { id: "so-1", total: 20000, createdAt: D("2026-01-15"), customer: { name: "عميل أ" } },
          ],
          settlements: [
            { id: "st-1", amount: 5000, direction: "ADDITION", reason: "تحصيل", settlementNumber: "S-1", status: "VERIFIED", createdAt: D("2026-02-01"), customer: null },
          ],
          salaryRecords: [
            { id: "sal-1", month: 1, year: 2026, commissionAmount: 0, netPayable: 10000, isPaid: true, createdAt: D("2026-02-05") },
          ],
          serviceRequests: [
            { id: "rq-1", requestNumber: "R-1", status: "RESOLVED", createdAt: D("2026-01-20"), customer: null },
          ],
          visits: [
            { id: "vs-1", visitedAt: D("2026-01-21"), resolutionNotes: "تم", resolved: true, serviceRequest: { requestNumber: "R-1" } },
          ],
        }),
      );
      expect(s.rows.map((r) => r.type)).toEqual([
        "SALE",
        "SERVICE_REQUEST",
        "VISIT",
        "SETTLEMENT",
        "SALARY",
      ]);
      expect(s.rows[0].balance).toBe(20000);
      expect(s.rows[3].balance).toBe(25000);
      expect(s.closingBalance).toBe(15000);
    });

    it("keeps unpaid salaries and unverified settlements visible but neutral", () => {
      const s = assembleEngineerStatement(
        sampleData({
          settlements: [
            { id: "st-1", amount: 5000, direction: "ADDITION", reason: "لم يعتمد", settlementNumber: "S-1", status: "INITIAL", createdAt: D("2026-01-01"), customer: null },
          ],
          salaryRecords: [
            { id: "sal-1", month: 1, year: 2026, commissionAmount: 0, netPayable: 8000, isPaid: false, createdAt: D("2026-01-03") },
          ],
        }),
      );
      expect(s.rows).toHaveLength(2);
      expect(s.rows[0].amount).toBe(5000);
      expect(s.rows[0].balance).toBe(0); // unverified => balance unchanged
      expect(s.rows[1].amount).toBe(-8000);
      expect(s.rows[1].balance).toBe(0); // unpaid => balance unchanged
      expect(s.closingBalance).toBe(0);
    });
  });
});