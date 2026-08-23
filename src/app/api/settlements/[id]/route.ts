import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requirePageAccess } from "@/lib/auth-helpers";
import { notifySettlementVerified } from "@/lib/notifications";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const settlement = await prisma.settlement.findUnique({
      where: { id },
      include: {
        company: true,
        customer: true,
        engineer: true,
        collector: true,
        verifier: true,
      },
    });

    if (!settlement) {
      return NextResponse.json({ error: "Settlement not found" }, { status: 404 });
    }

    return NextResponse.json(settlement);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch settlement" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verification is a finance/management action on the settlements page.
    const actor = await requirePageAccess("settlements");
    if (!actor) {
      const authed = await requireAuth();
      return NextResponse.json({ error: authed ? "Forbidden" : "Unauthorized" }, { status: authed ? 403 : 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.settlement.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "التسوية غير موجودة" }, { status: 404 });
    }

    if (body.status === "VERIFIED") {
      if (!["GENERAL_MANAGER", "ACCOUNTANT", "COMPANY_MANAGER"].includes((actor as { role?: string }).role ?? "")) {
        return NextResponse.json({ error: "لا تملك صلاحية التحقق من التسويات" }, { status: 403 });
      }
      // Two-step rule: the collector cannot verify his own collection.
      if (existing.collectedBy === actor.id) {
        return NextResponse.json(
          { error: "لا يمكنك التحقق من تسوية قمت أنت بتحصيلها" },
          { status: 403 },
        );
      }
      if (existing.status === "VERIFIED") {
        return NextResponse.json({ error: "التسوية تم التحقق منها بالفعل" }, { status: 409 });
      }
    } else if (body.status && body.status !== "INITIAL") {
      return NextResponse.json({ error: "حالة غير صالحة" }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if ("status" in body) data.status = body.status;
    if ("reason" in body && !body.status) data.reason = body.reason;
    if (body.status === "VERIFIED") data.verifiedBy = actor.id;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "لا توجد بيانات للتحديث" }, { status: 400 });
    }

    const settlement = await prisma.settlement.update({
      where: { id },
      data,
      include: {
        company: true,
        customer: true,
        engineer: true,
        collector: true,
        verifier: true,
      },
    });

    if (settlement.status === "VERIFIED" && existing.status !== "VERIFIED") {
      void notifySettlementVerified({
        settlementId: settlement.id,
        settlementNumber: settlement.settlementNumber,
        collectedByUserId: settlement.collectedBy,
        verifierId: actor.id,
      }).catch(() => undefined);
    }

    return NextResponse.json(settlement);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update settlement" }, { status: 500 });
  }
}
