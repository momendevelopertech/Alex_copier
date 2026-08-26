import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requirePageAccess } from "@/lib/auth-helpers";
import { recalculatePaymentStatus } from "@/lib/payment-status";

/**
 * POST /api/sales/[id]/payments
 * Record a payment against a specific sales order (for CREDIT/MIXED orders).
 * Body: { amount: number, paymentDate?: string, notes?: string, companyId?: string }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requirePageAccess("sales");
    if (!actor) {
      const authed = await requireAuth();
      return NextResponse.json(
        { error: authed ? "Forbidden" : "Unauthorized", code: authed ? "FORBIDDEN" : "UNAUTHORIZED" },
        { status: authed ? 403 : 401 }
      );
    }

    const { id: orderId } = await params;
    const body = await request.json();
    const { amount, paymentDate, notes, companyId } = body;

    const paymentAmount = Number(amount);
    if (!paymentAmount || paymentAmount <= 0) {
      return NextResponse.json(
        { error: "المبلغ يجب أن يكون أكبر من صفر", code: "INVALID_AMOUNT" },
        { status: 400 }
      );
    }

    // Fetch the order
    const order = await prisma.salesOrder.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        customerId: true,
        companyId: true,
        total: true,
        paidAmount: true,
        paymentMethod: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "فاتورة البيع غير موجودة", code: "ORDER_NOT_FOUND" },
        { status: 404 }
      );
    }

    const paymentDateTime = paymentDate ? new Date(paymentDate) : new Date();
    const targetCompanyId = companyId || order.companyId;

    const result = await prisma.$transaction(async (tx) => {
      // Create customer payment record
      await tx.customerPayment.create({
        data: {
          customerId: order.customerId,
          companyId: targetCompanyId,
          amount: paymentAmount,
          paymentDate: paymentDateTime,
          notes: notes || `دفع لفاتورة بيع ${orderId}`,
        },
      });

      // Update customer remaining debt
      await tx.customer.update({
        where: { id: order.customerId },
        data: {
          remainingDebt: { decrement: paymentAmount },
          lastPaymentDate: paymentDateTime,
        },
      });

      // Update customer ledger
      await tx.customerLedger.upsert({
        where: { customerId_companyId: { customerId: order.customerId, companyId: targetCompanyId } },
        update: { balance: { decrement: paymentAmount } },
        create: { customerId: order.customerId, companyId: targetCompanyId, balance: -paymentAmount },
      });

      // Increment paidAmount on the order
      await tx.salesOrder.update({
        where: { id: orderId },
        data: {
          paidAmount: { increment: paymentAmount },
        },
      });

      // Recalculate payment status
      const newStatus = await recalculatePaymentStatus(tx, orderId);

      return { paymentAmount, newStatus };
    });

    // Fetch updated order
    const updatedOrder = await prisma.salesOrder.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        company: true,
        items: { include: { product: true, tradeInProduct: true } },
        installments: true,
      },
    });

    return NextResponse.json({
      message: "تم تسجيل الدفع بنجاح",
      paidAmount: result.paymentAmount,
      paymentStatus: result.newStatus,
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Payment recording error:", error);
    return NextResponse.json(
      { error: "Failed to record payment" },
      { status: 500 }
    );
  }
}
