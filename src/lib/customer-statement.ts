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
  totalBilled: number; // total debt (customer.totalDebt) — total billed to the customer
  totalPaid: number; // total paid toward the debt (totalDebt - remainingDebt, capped at totalDebt)
  creditBalance: number; // money under the customer's account when closingBalance is negative
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
    select: { id: true, name: true, companyName: true, phone: true, totalDebt: true, remainingDebt: true },
  });
  if (!customer) return null;

  const [salesOrders, payments, returns, settlements] = await Promise.all([
    prisma.salesOrder.findMany({
      where: { customerId },
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
      where: { customerId },
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
    finalized: boolean;
  }

  const drafts: Draft[] = [];

  for (const o of salesOrders) {
    const statusNote = o.status === "DRAFT" ? " (مسودة)" : "";
    drafts.push({
      id: o.id,
      type: "SALE",
      date: o.createdAt.toISOString(),
      ref: o.id,
      description: o.notes ? `${o.notes}${statusNote}` : statusNote.trim() || o.notes,
      amount: o.total,
      balance: 0,
      sort: o.createdAt.getTime(),
      finalized: o.status !== "DRAFT",
    });
  }
  for (const p of payments) {
    drafts.push({
      id: p.id,
      type: "PAYMENT",
      date: p.createdAt.toISOString(),
      ref: p.notes,
      description: p.notes,
      amount: -p.amount,
      balance: 0,
      sort: p.createdAt.getTime(),
      finalized: true,
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
      finalized: true,
    });
  }

  for (const s of settlements) {
    // ADDITION = money collected from the customer (reduces debt),
    // SUBTRACTION = money given to the customer (increases debt).
    const statusNote = s.status === "INITIAL" ? " (غير معتمدة)" : "";
    drafts.push({
      id: s.id,
      type: "SETTLEMENT",
      date: s.createdAt.toISOString(),
      ref: s.settlementNumber,
      description: s.reason ? `${s.reason}${statusNote}` : statusNote.trim() || s.reason,
      amount: s.direction === "SUBTRACTION" ? s.amount : -s.amount,
      balance: 0,
      sort: s.createdAt.getTime(),
      finalized: s.status === "VERIFIED",
    });
  }

  // Sort chronologically; ties broken by created time.
  drafts.sort((a, b) => a.sort - b.sort || a.date.localeCompare(b.date));

  // The authoritative debt figures live on the Customer record. The raw
  // movements are built up independently and may carry historical drift, so we
  // seed an opening balance that makes the running balance reconcile EXACTLY to
  // remainingDebt:
  //   openingBalance + Σ finalized movements = remainingDebt
  //
  // Non-finalized rows (DRAFT invoices, INITIAL settlements) are shown for full
  // visibility but do not move the balance since they are not confirmed.
  //
  // Summary stats are anchored to the authoritative values too so they stay
  // consistent with the dashboard and each other (billed - paid = remaining).
  const finalizedMovement = drafts
    .filter((d) => d.finalized)
    .reduce((sum, d) => sum + d.amount, 0);
  const openingBalance = round2(customer.remainingDebt - finalizedMovement);

  const rows: StatementRow[] = [];
  let balance = openingBalance;
  for (const d of drafts) {
    if (d.finalized) balance += d.amount;
    d.balance = round2(balance);
    rows.push({
      id: d.id,
      type: d.type,
      date: d.date,
      ref: d.ref,
      description: d.description,
      amount: round2(d.amount),
      balance: d.balance,
    });
  }

  return {
    customerId: customer.id,
    customerName: customer.name,
    companyName: customer.companyName,
    phone: customer.phone,
    rows,
    openingBalance,
    totalBilled: round2(customer.totalDebt),
    // Cap at totalDebt: overpayments become credit (negative remainingDebt) and
    // must not inflate the "paid" figure beyond what was actually billed.
    totalPaid: round2(Math.min(customer.totalDebt, Math.max(0, customer.totalDebt - customer.remainingDebt))),
    creditBalance: round2(Math.max(0, -(customer.totalDebt - customer.remainingDebt))),
    closingBalance: round2(balance),
  };
}
