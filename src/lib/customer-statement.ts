import { prisma } from "./prisma";

export type StatementRowType = "SALE" | "PAYMENT" | "RETURN" | "SETTLEMENT";

export interface StatementRow {
  id: string;
  type: StatementRowType;
  date: string; // ISO datetime used for display + sort
  ref: string | null; // human reference (order number / settlement number / notes / reason)
  description: string | null;
  amount: number; // signed: positive increases the customer's debt, negative reduces it
  balance: number; // running debt balance after this row
}

export interface CustomerStatement {
  customerId: string;
  customerName: string;
  companyName: string | null;
  phone: string | null;
  rows: StatementRow[];
  openingBalance: number;
  totalBilled: number; // positive sum (invoices + money paid out)
  totalPaid: number; // positive sum (payments + returns + collections)
  closingBalance: number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Build a full chronological statement for a customer by merging every
 * financial movement: sales invoices, payments, sale returns, and settlements.
 *
 * Balance convention: rows are sorted by (date, createdAt). Each row carries a
 * signed `amount` where positive increases the customer's debt and negative
 * reduces it. The running `balance` therefore ends at the remaining debt.
 */
export async function buildCustomerStatement(customerId: string): Promise<CustomerStatement | null> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true, name: true, companyName: true, phone: true, remainingDebt: true },
  });
  if (!customer) return null;

  const [salesOrders, payments, returns, settlements] = await Promise.all([
    prisma.salesOrder.findMany({
      where: { customerId, status: { not: "DRAFT" } },
      select: {
        id: true,
        total: true,
        orderDate: true,
        createdAt: true,
        status: true,
        notes: true,
      },
      orderBy: [{ orderDate: "asc" }, { createdAt: "asc" }],
    }),
    prisma.customerPayment.findMany({
      where: { customerId },
      select: { id: true, amount: true, paymentDate: true, createdAt: true, notes: true },
      orderBy: { paymentDate: "asc" },
    }),
    prisma.returnTransaction.findMany({
      where: { customerId, type: "SALE_RETURN", status: { in: ["APPROVED", "COMPLETED"] } },
      select: { id: true, total: true, createdAt: true, reason: true, status: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.settlement.findMany({
      where: { customerId, status: "VERIFIED" },
      select: {
        id: true,
        amount: true,
        direction: true,
        reason: true,
        settlementNumber: true,
        createdAt: true,
        status: true,
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  interface Draft extends StatementRow {
    sort: number;
  }

  const drafts: Draft[] = [];

  for (const o of salesOrders) {
    drafts.push({
      id: o.id,
      type: "SALE",
      date: (o.orderDate ?? o.createdAt).toISOString(),
      ref: o.id,
      description: o.notes,
      amount: o.total,
      balance: 0,
      sort: o.orderDate?.getTime() ?? o.createdAt.getTime(),
    });
  }

  for (const p of payments) {
    drafts.push({
      id: p.id,
      type: "PAYMENT",
      date: (p.paymentDate ?? p.createdAt).toISOString(),
      ref: p.notes,
      description: p.notes,
      amount: -p.amount,
      balance: 0,
      sort: p.paymentDate?.getTime() ?? p.createdAt.getTime(),
    });
  }

  for (const r of returns) {
    drafts.push({
      id: r.id,
      type: "RETURN",
      date: r.createdAt.toISOString(),
      ref: r.reason,
      description: r.reason,
      amount: -r.total,
      balance: 0,
      sort: r.createdAt.getTime(),
    });
  }

  for (const s of settlements) {
    // ADDITION = money collected from the customer (reduces debt),
    // SUBTRACTION = money given to the customer (increases debt).
    drafts.push({
      id: s.id,
      type: "SETTLEMENT",
      date: s.createdAt.toISOString(),
      ref: s.settlementNumber,
      description: s.reason,
      amount: s.direction === "SUBTRACTION" ? s.amount : -s.amount,
      balance: 0,
      sort: s.createdAt.getTime(),
    });
  }

  // Sort chronologically; ties broken by created time.
  drafts.sort((a, b) => a.sort - b.sort || a.date.localeCompare(b.date));

  let totalBilled = 0;
  let totalPaid = 0;
  for (const d of drafts) {
    totalBilled += Math.max(0, d.amount);
    totalPaid += Math.max(0, -d.amount);
  }

  // The authoritative outstanding debt lives on the Customer record. The raw
  // movements (orders/payments/returns/settlements) are built up independently
  // and may carry historical drift, so we seed an opening balance that makes
  // the running balance reconcile EXACTLY to remainingDebt:
  //   openingBalance + Σ signed movements = remainingDebt
  const ledgerMovement = drafts.reduce((sum, d) => sum + d.amount, 0);
  const openingBalance = round2(customer.remainingDebt - ledgerMovement);

  const rows: StatementRow[] = [];
  let balance = openingBalance;
  for (const d of drafts) {
    balance += d.amount;
    d.balance = round2(balance);
    rows.push({ ...d, amount: round2(d.amount) });
  }

  return {
    customerId: customer.id,
    customerName: customer.name,
    companyName: customer.companyName,
    phone: customer.phone,
    rows,
    openingBalance,
    totalBilled: round2(totalBilled),
    totalPaid: round2(totalPaid),
    closingBalance: round2(balance),
  };
}
