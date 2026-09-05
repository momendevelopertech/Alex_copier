import { describe, it, expect } from "vitest";
import {
  availableCredit,
  computeCreditSplit,
  isCreditUsedNote,
  creditUsedNote,
  CREDIT_USED_PREFIX,
} from "@/lib/customer-credit";

describe("customer-credit", () => {
  describe("availableCredit", () => {
    it("returns 0 when the customer owes money", () => {
      expect(availableCredit(500)).toBe(0);
      expect(availableCredit(0)).toBe(0);
    });

    it("returns the positive credit when remainingDebt is negative", () => {
      expect(availableCredit(-1200)).toBe(1200);
    });
  });

  describe("computeCreditSplit", () => {
    it("consumes credit for CASH orders (full total covered)", () => {
      const split = computeCreditSplit(1000, -1200, 0, "CASH");
      expect(split).toEqual({ creditUsed: 1000, cashUpfront: 0, paidAmount: 1000, unpaid: 0 });
    });

    it("covers CASH total partially by credit and rest by cash", () => {
      const split = computeCreditSplit(1000, -400, 0, "CASH");
      expect(split).toEqual({ creditUsed: 400, cashUpfront: 600, paidAmount: 1000, unpaid: 0 });
    });

    it("credit covers the first part of a CREDIT order, upfront cash next", () => {
      const split = computeCreditSplit(1500, -800, 200, "CREDIT");
      expect(split).toEqual({ creditUsed: 800, cashUpfront: 200, paidAmount: 1000, unpaid: 500 });
    });

    it("credit alone pays a small CREDIT order (no cash, no debt)", () => {
      const split = computeCreditSplit(300, -800, 0, "CREDIT");
      expect(split).toEqual({ creditUsed: 300, cashUpfront: 0, paidAmount: 300, unpaid: 0 });
    });

    it("returns previous behaviour when there is no credit", () => {
      const split = computeCreditSplit(1000, 500, 250, "CREDIT");
      expect(split).toEqual({ creditUsed: 0, cashUpfront: 250, paidAmount: 250, unpaid: 750 });
    });

    it("handles a customer with no debt and no credit (neutral)", () => {
      const split = computeCreditSplit(1000, 0, 0, "CREDIT");
      expect(split).toEqual({ creditUsed: 0, cashUpfront: 0, paidAmount: 0, unpaid: 1000 });
    });
  });

  describe("credit-used notes", () => {
    it("builds the statement note that identifies credit usage by order", () => {
      const note = creditUsedNote("ord_1");
      expect(note).toBe(`${CREDIT_USED_PREFIX} — ord_1`);
      expect(isCreditUsedNote(note)).toBe(true);
      expect(isCreditUsedNote("دفع مبدئي مع فاتورة بيع ord_1")).toBe(false);
      expect(isCreditUsedNote(null)).toBe(false);
    });
  });
});