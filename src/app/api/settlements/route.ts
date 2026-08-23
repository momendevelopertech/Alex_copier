import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requirePageAccess } from "@/lib/auth-helpers";
import { notifySettlementPendingVerification } from "@/lib/notifications";

export async function GET() {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const settlements = await prisma.settlement.findMany({
      include: {
        company: true,
        customer: true,
        engineer: true,
        collector: true,
        verifier: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(settlements);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch settlements" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requirePageAccess("settlements");
    if (!actor) {
      const authed = await requireAuth();
      return NextResponse.json({ error: authed ? "Forbidden" : "Unauthorized" }, { status: authed ? 403 : 401 });
    }

    const body = await request.json();

    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "المبلغ يجب أن يكون رقمًا أكبر من صفر" }, { status: 400 });
    }
    if (!body.companyId || !body.reason || String(body.reason).trim() === "") {
      return NextResponse.json({ error: "الشركة والسبب مطلوبان" }, { status: 400 });
    }
    if (!["CASH", "CREDIT", "INSTALLMENT", "MIXED"].includes(body.paymentMethod)) {
      return NextResponse.json({ error: "طريقة الدفع غير صالحة" }, { status: 400 });
    }

    // The collector is whoever is creating the record unless stated otherwise.
    const collectedBy: string =
      typeof body.collectedBy === "string" && body.collectedBy !== "" ? body.collectedBy : actor.id;
    const collectorExists = await prisma.user.findUnique({ where: { id: collectedBy }, select: { id: true, name: true } });
    if (!collectorExists) {
      return NextResponse.json({ error: "المستخدم المُحصِّل غير موجود" }, { status: 400 });
    }

    const settlementNumber = `STL-${Date.now()}`;

    const settlement = await prisma.settlement.create({
      data: {
        companyId: body.companyId,
        customerId: body.customerId || null,
        engineerId: body.engineerId || null,
        amount,
        paymentMethod: body.paymentMethod,
        reason: body.reason,
        status: "INITIAL",
        collectedBy,
        settlementNumber,
      },
      include: {
        company: true,
        customer: true,
        engineer: true,
        collector: true,
      },
    });

    // Business event: finance must review every new field collection.
    void notifySettlementPendingVerification({
      settlementId: settlement.id,
      settlementNumber: settlement.settlementNumber,
      amount: settlement.amount,
      collectorName: settlement.collector?.name ?? collectorExists.name,
      actorId: actor.id,
    }).catch(() => undefined);

    return NextResponse.json(settlement, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create settlement" }, { status: 500 });
  }
}
