import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";

interface MonthlyData {
  month: string;
  sales: number;
  purchases: number;
  expenses: number;
  settlements: number;
}

type DateFilter = {
  createdAt?: { gte?: Date; lte?: Date };
};

/**
 * Per-company financial report.
 *
 * All figures are grouped strictly by `companyId` so that every transaction
 * (sales, purchases, expenses, settlements, returns) rolls up to exactly one
 * company. Financial statements (income statement + cash position) are derived
 * live from these operational modules — not from a separate accounting table —
 * so a newly created sales/purchase invoice appears here automatically.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const company = await prisma.company.findUnique({
      where: { id },
      select: { id: true, name: true, nameAr: true },
    });
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const from = fromParam ? new Date(`${fromParam}T00:00:00.000`) : null;
    // Make the end date inclusive of the full day — parse the day, then clamp
    // to its end (23:59:59.999). Without this, any transaction on the `to` day
    // AFTER local midnight UTC is wrongly excluded from the report.
    const to = toParam
      ? new Date(new Date(`${toParam}T00:00:00.000`).getTime() + 86_400_000 - 1)
      : null;

    const dateFilter: DateFilter = from || to
      ? {
          createdAt: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        }
      : {};

    const orderDateFilter = from || to
      ? {
          orderDate: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        }
      : {};

    const [salesOrders, purchaseOrders, expenses, settlements, returnTransactions, customerLedgers] =
      await Promise.all([
        prisma.salesOrder.findMany({
          where: { companyId: id, ...orderDateFilter },
          include: {
            items: { include: { product: true } },
            customer: true,
          },
          orderBy: { orderDate: "desc" },
        }),
        prisma.purchaseOrder.findMany({
          where: { companyId: id, ...orderDateFilter },
          include: {
            items: { include: { product: true } },
            supplier: true,
          },
          orderBy: { orderDate: "desc" },
        }),
        prisma.expense.findMany({
          where: { companyId: id, ...dateFilter },
          orderBy: { date: "desc" },
        }),
        prisma.settlement.findMany({
          where: { companyId: id, ...dateFilter },
          include: {
            collector: { select: { id: true, name: true } },
            verifier: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.returnTransaction.findMany({
          where: { companyId: id, ...dateFilter },
          include: { product: true, customer: true, supplier: true },
          orderBy: { createdAt: "desc" },
        }),
        prisma.customerLedger.findMany({
          where: { companyId: id, balance: { gt: 0 } },
          include: { customer: { select: { id: true, name: true, phone: true } } },
          orderBy: { balance: "desc" },
        }),
      ]);

    // ─────────────────────────────────────────────────────────
    // SALES
    // ─────────────────────────────────────────────────────────
    const totalSales = salesOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalSalesCount = salesOrders.length;
    const salesByPaymentMethod: Record<string, number> = {
      CASH: 0,
      CREDIT: 0,
      INSTALLMENT: 0,
      MIXED: 0,
    };
    for (const order of salesOrders) {
      salesByPaymentMethod[order.paymentMethod] =
        (salesByPaymentMethod[order.paymentMethod] || 0) + (order.total || 0);
    }
    // Cash actually received from sales (paid portion). For cash orders the
    // full total counts; otherwise the recorded paid amount.
    const cashFromSales = salesOrders.reduce(
      (sum, o) => sum + (o.paymentMethod === "CASH" ? o.total : o.paidAmount || 0),
      0
    );

    // ─────────────────────────────────────────────────────────
    // PURCHASES
    // ─────────────────────────────────────────────────────────
    const totalPurchases = purchaseOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalPurchasesCount = purchaseOrders.length;
    // Cash paid out for purchases: the total of received purchase orders
    // (purchases have no per-order payment tracking yet, so received = paid).
    const cashForPurchases = purchaseOrders
      .filter((o) => o.status === "RECEIVED")
      .reduce((sum, o) => sum + (o.total || 0), 0);

    // ─────────────────────────────────────────────────────────
    // EXPENSES
    // ─────────────────────────────────────────────────────────
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const expensesByCategory: Record<string, number> = {};
    for (const expense of expenses) {
      expensesByCategory[expense.category] =
        (expensesByCategory[expense.category] || 0) + (expense.amount || 0);
    }

    // ─────────────────────────────────────────────────────────
    // RETURNS (split sale vs purchase returns)
    // ─────────────────────────────────────────────────────────
    const salesReturns = returnTransactions
      .filter((r) => r.type === "SALE_RETURN")
      .reduce((sum, r) => sum + (r.total || 0), 0);
    const purchaseReturns = returnTransactions
      .filter((r) => r.type === "PURCHASE_RETURN")
      .reduce((sum, r) => sum + (r.total || 0), 0);
    const totalReturns = salesReturns + purchaseReturns;

    // ─────────────────────────────────────────────────────────
    // SETTLEMENTS
    // ─────────────────────────────────────────────────────────
    const totalSettlements = settlements
      .filter((s) => s.status === "VERIFIED")
      .reduce((sum, s) => sum + (s.amount || 0), 0);
    const totalSettlementsPending = settlements
      .filter((s) => s.status === "INITIAL")
      .reduce((sum, s) => sum + (s.amount || 0), 0);
    const settlementsCount = settlements.length;

    // ─────────────────────────────────────────────────────────
    // CUSTOMER DEBT (المبالغ المستحقة من العملاء)
    // ─────────────────────────────────────────────────────────
    const totalCustomerDebt = customerLedgers.reduce((sum, l) => sum + (l.balance || 0), 0);
    const customerDebtDetails = customerLedgers.map((l) => ({
      customerId: l.customerId,
      customerName: l.customer?.name || "—",
      phone: l.customer?.phone || null,
      balance: l.balance,
    }));

    // ─────────────────────────────────────────────────────────
    // INCOME STATEMENT (قائمة الدخل)
    // revenue − cost of purchases − expenses − sales returns + purchase returns
    // ─────────────────────────────────────────────────────────
    const netProfit =
      totalSales - totalPurchases - totalExpenses - salesReturns + purchaseReturns;

    // ─────────────────────────────────────────────────────────
    // CASH POSITION (الموقف النقدي)
    // in: verified settlements + cash from sales (+ any payment); out: expenses + cash purchases
    // ─────────────────────────────────────────────────────────
    const cashIn = totalSettlements + cashFromSales;
    const cashOut = totalExpenses + cashForPurchases;
    const netCash = cashIn - cashOut;

    // ─────────────────────────────────────────────────────────
    // MONTHLY BREAKDOWN
    // ─────────────────────────────────────────────────────────
    const monthlyDataMap: Record<string, MonthlyData> = {};

    if (!from && !to) {
      const now = new Date();
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        monthlyDataMap[key] = { month: key, sales: 0, purchases: 0, expenses: 0, settlements: 0 };
      }
    }

    const bucket = (key: string): MonthlyData => {
      if (!monthlyDataMap[key]) {
        monthlyDataMap[key] = { month: key, sales: 0, purchases: 0, expenses: 0, settlements: 0 };
      }
      return monthlyDataMap[key];
    };
    const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

    for (const order of salesOrders) bucket(monthKey(new Date(order.orderDate))).sales += order.total || 0;
    for (const order of purchaseOrders) bucket(monthKey(new Date(order.orderDate))).purchases += order.total || 0;
    for (const expense of expenses) bucket(monthKey(new Date(expense.date))).expenses += expense.amount || 0;
    for (const settlement of settlements) bucket(monthKey(new Date(settlement.createdAt))).settlements += settlement.amount || 0;

    const monthlyData = Object.values(monthlyDataMap).sort((a, b) => a.month.localeCompare(b.month));

    return NextResponse.json({
      company,
      from: fromParam || null,
      to: toParam || null,
      sales: {
        total: totalSales,
        count: totalSalesCount,
        byPaymentMethod: salesByPaymentMethod,
        orders: salesOrders,
      },
      purchases: {
        total: totalPurchases,
        count: totalPurchasesCount,
        orders: purchaseOrders,
      },
      expenses: {
        total: totalExpenses,
        byCategory: expensesByCategory,
        items: expenses,
      },
      returns: {
        total: totalReturns,
        salesReturns,
        purchaseReturns,
        items: returnTransactions,
      },
      settlements: {
        total: totalSettlements,
        pending: totalSettlementsPending,
        count: settlementsCount,
        items: settlements,
      },
      customerDebt: {
        total: totalCustomerDebt,
        details: customerDebtDetails,
      },
      incomeStatement: {
        salesRevenue: totalSales,
        purchasesCost: totalPurchases,
        salesReturns,
        purchaseReturns,
        expenses: totalExpenses,
        settlementsCollected: totalSettlements,
        netProfit,
      },
      cashPosition: {
        cashIn,
        cashOut,
        netCash,
        settlementsVerified: totalSettlements,
        cashFromSales,
        expenses: totalExpenses,
        cashForPurchases,
      },
      netProfit,
      monthlyData,
    });
  } catch (error) {
    console.error("[companies/report] GET failed:", error);
    return NextResponse.json({ error: "Failed to fetch company report" }, { status: 500 });
  }
}
