import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requirePageAccess } from "@/lib/auth-helpers";
import { recalculatePaymentStatus } from "@/lib/payment-status";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const payments = await prisma.customerPayment.findMany({
      where: { customerId: id },
      orderBy: { paymentDate: "desc" },
      include: { company: { select: { id: true, name: true } } },
    });
    return NextResponse.json(payments);
  } catch {
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
  }
}

/**
 * Auto-distribute a payment amount across outstanding (unpaid) sales orders
 * using FIFO by orderDate. Updates each order's paidAmount and paymentStatus.
 * Returns the total amount actually applied to orders.
 */
async function distributeToOrders(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  customerId: string,
  companyId: string | null,
  paymentAmount: number,
): Promise<number> {
  const where: Record<string, unknown> = {
    customerId,
    paymentMethod: { not: "CASH" },
    paymentStatus: { notIn: ["PAID"] },
  };
  if (companyId) where.companyId = companyId;

  const unpaidOrders = await tx.salesOrder.findMany({
    where,
    select: { id: true, total: true, paidAmount: true },
    orderBy: { orderDate: "asc" },
  });

  let remaining = paymentAmount;

  for (const order of unpaidOrders) {
    if (remaining <= 0) break;
    const outstanding = order.total - order.paidAmount;
    if (outstanding <= 0) continue;

    const applied = Math.min(remaining, outstanding);
    remaining -= applied;

    await tx.salesOrder.update({
      where: { id: order.id },
      data: { paidAmount: { increment: applied } },
    });

    await recalculatePaymentStatus(tx, order.id);
  }

  return paymentAmount - remaining;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requirePageAccess("customers");
    if (!actor) {
      const authed = await requireAuth();
      return NextResponse.json(
        { error: authed ? "Forbidden" : "Unauthorized", code: authed ? "FORBIDDEN" : "UNAUTHORIZED" },
        { status: authed ? 403 : 401 }
      );
    }
    const { id } = await params;
    const body = await request.json();
    const { amount, paymentDate, notes, companyId } = body;

    if (!amount || Number(amount) <= 0) {
      return NextResponse.json({ error: "المبلغ يجب أن يكون أكبر من صفر", code: "INVALID_AMOUNT" }, { status: 400 });
    }

    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) {
      return NextResponse.json({ error: "العميل غير موجود", code: "NOT_FOUND" }, { status: 404 });
    }

    if (companyId) {
      const company = await prisma.company.findUnique({ where: { id: companyId } });
      if (!company) {
        return NextResponse.json({ error: "الشركة غير موجودة", code: "COMPANY_NOT_FOUND" }, { status: 404 });
      }
    }

    const paymentAmount = Number(amount);
    const newRemaining = Math.max(0, customer.remainingDebt - paymentAmount);
    const payDate = paymentDate ? new Date(paymentDate) : new Date();

    const payment = await prisma.$transaction(async (tx) => {
      // 1. Update customer remaining debt
      await tx.customer.update({
        where: { id },
        data: {
          remainingDebt: newRemaining,
          lastPaymentDate: payDate,
        },
      });

      // 2. Update customer ledger for the company
      if (companyId) {
        await tx.customerLedger.upsert({
          where: { customerId_companyId: { customerId: id, companyId } },
          update: { balance: { decrement: paymentAmount } },
          create: { customerId: id, companyId, balance: -paymentAmount },
        });
      }

      // 3. Auto-distribute payment across outstanding orders
      const distributed = await distributeToOrders(
        tx, id, companyId || null, paymentAmount,
      );

      // 4. Record the payment — the amount is the full paymentAmount regardless
      //    of distribution. The SalesOrder.paidAmount tracks per-order allocation.
      const record = await tx.customerPayment.create({
        data: {
          customerId: id,
          companyId: companyId || null,
          amount: paymentAmount,
          paymentDate: payDate,
          notes: notes || null,
        },
      });

      // Expose how much was actually distributed to orders for transparency
      (record as Record<string, unknown>)._distributedToOrders = distributed < paymentAmount;

      return record;
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    console.error("[customer-payments] POST failed:", error);
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
  }
}
