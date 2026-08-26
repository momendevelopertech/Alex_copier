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

    const from = fromParam ? new Date(fromParam) : null;
    const to = toParam ? new Date(toParam) : null;

    const dateFilter = {
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    };

    const orderDateFilter = {
      ...(from || to
        ? {
            orderDate: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    };

    const [salesOrders, purchaseOrders, expenses, settlements, returnTransactions] =
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
          include: {
            product: true,
            customer: true,
            supplier: true,
          },
          orderBy: { createdAt: "desc" },
        }),
      ]);

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

    const totalPurchases = purchaseOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalPurchasesCount = purchaseOrders.length;

    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const expensesByCategory: Record<string, number> = {};
    for (const expense of expenses) {
      expensesByCategory[expense.category] =
        (expensesByCategory[expense.category] || 0) + (expense.amount || 0);
    }

    const totalReturns = returnTransactions.reduce((sum, r) => sum + (r.total || 0), 0);
    const returnsCount = returnTransactions.length;

    const totalSettlements = settlements
      .filter((s) => s.status === "VERIFIED")
      .reduce((sum, s) => sum + (s.amount || 0), 0);
    const totalSettlementsPending = settlements
      .filter((s) => s.status === "INITIAL")
      .reduce((sum, s) => sum + (s.amount || 0), 0);
    const settlementsCount = settlements.length;

    const netProfit = totalSales - totalPurchases - totalExpenses + totalReturns;

    const monthlyDataMap: Record<string, MonthlyData> = {};

    if (!from && !to) {
      const now = new Date();
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        monthlyDataMap[key] = { month: key, sales: 0, purchases: 0, expenses: 0, settlements: 0 };
      }
    }

    for (const order of salesOrders) {
      const d = new Date(order.orderDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!monthlyDataMap[key]) {
        monthlyDataMap[key] = { month: key, sales: 0, purchases: 0, expenses: 0, settlements: 0 };
      }
      monthlyDataMap[key].sales += order.total || 0;
    }

    for (const order of purchaseOrders) {
      const d = new Date(order.orderDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!monthlyDataMap[key]) {
        monthlyDataMap[key] = { month: key, sales: 0, purchases: 0, expenses: 0, settlements: 0 };
      }
      monthlyDataMap[key].purchases += order.total || 0;
    }

    for (const expense of expenses) {
      const d = new Date(expense.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!monthlyDataMap[key]) {
        monthlyDataMap[key] = { month: key, sales: 0, purchases: 0, expenses: 0, settlements: 0 };
      }
      monthlyDataMap[key].expenses += expense.amount || 0;
    }

    for (const settlement of settlements) {
      const d = new Date(settlement.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!monthlyDataMap[key]) {
        monthlyDataMap[key] = { month: key, sales: 0, purchases: 0, expenses: 0, settlements: 0 };
      }
      monthlyDataMap[key].settlements += settlement.amount || 0;
    }

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
        count: returnsCount,
        items: returnTransactions,
      },
      settlements: {
        total: totalSettlements,
        pending: totalSettlementsPending,
        count: settlementsCount,
        items: settlements,
      },
      netProfit,
      monthlyData,
    });
  } catch (error) {
    console.error("[companies/report] GET failed:", error);
    return NextResponse.json({ error: "Failed to fetch company report" }, { status: 500 });
  }
}
