import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requirePageAccess } from "@/lib/auth-helpers";

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

    const [payment] = await prisma.$transaction([
      prisma.customerPayment.create({
        data: {
          customerId: id,
          companyId: companyId || null,
          amount: paymentAmount,
          paymentDate: payDate,
          notes: notes || null,
        },
      }),
      prisma.customer.update({
        where: { id },
        data: {
          remainingDebt: newRemaining,
          lastPaymentDate: payDate,
        },
      }),
      ...(companyId
        ? [
            prisma.customerLedger.upsert({
              where: { customerId_companyId: { customerId: id, companyId } },
              update: { balance: { decrement: paymentAmount } },
              create: { customerId: id, companyId, balance: -paymentAmount },
            }),
          ]
        : []),
    ]);

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    console.error("[customer-payments] POST failed:", error);
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
  }
}
