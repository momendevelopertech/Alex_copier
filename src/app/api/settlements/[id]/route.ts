import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
    const { id } = await params;
    const body = await request.json();

    const data: Record<string, unknown> = { ...body };

    if (body.status === "VERIFIED") {
      data.verifiedBy = body.verifiedBy;
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

    return NextResponse.json(settlement);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update settlement" }, { status: 500 });
  }
}
