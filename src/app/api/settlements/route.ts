import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";

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
    const body = await request.json();

    const settlementNumber = `STL-${Date.now()}`;

    const settlement = await prisma.settlement.create({
      data: {
        ...body,
        settlementNumber,
      },
      include: {
        company: true,
        customer: true,
        engineer: true,
        collector: true,
      },
    });

    return NextResponse.json(settlement, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create settlement" }, { status: 500 });
  }
}
