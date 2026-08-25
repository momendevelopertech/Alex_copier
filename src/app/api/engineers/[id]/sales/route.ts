import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const engineer = await prisma.engineer.findUnique({ where: { id }, select: { id: true, name: true } });
    if (!engineer) return NextResponse.json({ error: "Engineer not found" }, { status: 404 });

    const sales = await prisma.salesOrder.findMany({
      where: { engineerId: id },
      include: {
        customer: { select: { id: true, name: true } },
        company: { select: { id: true, name: true, nameAr: true } },
        items: { include: { product: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(sales);
  } catch {
    return NextResponse.json({ error: "Failed to fetch engineer sales" }, { status: 500 });
  }
}
