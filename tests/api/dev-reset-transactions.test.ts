import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const db = {
    returnTransaction: { deleteMany: vi.fn() },
    settlement: { deleteMany: vi.fn() },
    expense: { deleteMany: vi.fn() },
    purchaseInvoice: { deleteMany: vi.fn() },
    purchaseOrder: { deleteMany: vi.fn() },
    salesOrder: { deleteMany: vi.fn() },
    $transaction: vi.fn(),
  };
  return { requireRole: vi.fn(), requireAuth: vi.fn(), db };
});

vi.mock("@/lib/auth-helpers", () => ({
  requireRole: mocks.requireRole,
  requireAuth: mocks.requireAuth,
}));
vi.mock("@/lib/prisma", () => ({ prisma: mocks.db }));

import { POST } from "@/app/api/dev/reset-transactions/route";

describe("POST /api/dev/reset-transactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue({ id: "u1", role: "GENERAL_MANAGER" });
    mocks.db.$transaction.mockImplementation(async (cb: (tx: typeof mocks.db) => Promise<unknown>) =>
      cb(mocks.db),
    );
    mocks.db.returnTransaction.deleteMany.mockResolvedValue({ count: 2 });
    mocks.db.settlement.deleteMany.mockResolvedValue({ count: 3 });
    mocks.db.expense.deleteMany.mockResolvedValue({ count: 4 });
    mocks.db.purchaseInvoice.deleteMany.mockResolvedValue({ count: 5 });
    mocks.db.purchaseOrder.deleteMany.mockResolvedValue({ count: 6 });
    mocks.db.salesOrder.deleteMany.mockResolvedValue({ count: 7 });
  });

  it("rejects non-general-managers with 403", async () => {
    mocks.requireRole.mockResolvedValue(null);
    mocks.requireAuth.mockResolvedValue({ id: "u1", role: "ACCOUNTANT" });

    const res = await POST();
    expect(res.status).toBe(403);
    expect(mocks.db.$transaction).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated requests with 401", async () => {
    mocks.requireRole.mockResolvedValue(null);
    mocks.requireAuth.mockResolvedValue(null);

    const res = await POST();
    expect(res.status).toBe(401);
  });

  it("deletes all transaction types in the correct order and returns counts", async () => {
    const res = await POST();
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.ok).toBe(true);
    expect(body.counts).toEqual({
      sales: 7,
      purchases: 6,
      purchaseInvoices: 5,
      settlements: 3,
      expenses: 4,
      returns: 2,
    });

    const callers = mocks.db.$transaction.mock.calls[0];
    expect(callers[0]).toBeInstanceOf(Function);
  });

  it("deletes returns before sales orders and invoices before purchase orders", async () => {
    const order: string[] = [];
    mocks.db.returnTransaction.deleteMany.mockImplementation(() => {
      order.push("returns");
      return Promise.resolve({ count: 0 });
    });
    mocks.db.purchaseInvoice.deleteMany.mockImplementation(() => {
      order.push("invoices");
      return Promise.resolve({ count: 0 });
    });
    mocks.db.purchaseOrder.deleteMany.mockImplementation(() => {
      order.push("purchases");
      return Promise.resolve({ count: 0 });
    });
    mocks.db.salesOrder.deleteMany.mockImplementation(() => {
      order.push("sales");
      return Promise.resolve({ count: 0 });
    });
    mocks.db.settlement.deleteMany.mockImplementation(() => {
      order.push("settlements");
      return Promise.resolve({ count: 0 });
    });
    mocks.db.expense.deleteMany.mockImplementation(() => {
      order.push("expenses");
      return Promise.resolve({ count: 0 });
    });

    await POST();

    expect(order.indexOf("returns")).toBeLessThan(order.indexOf("sales"));
    expect(order.indexOf("invoices")).toBeLessThan(order.indexOf("purchases"));
  });

  it("maps database failures to a 500 error", async () => {
    mocks.db.$transaction.mockRejectedValue(new Error("connection refused"));

    const res = await POST();
    expect(res.status).toBe(500);
  });
});