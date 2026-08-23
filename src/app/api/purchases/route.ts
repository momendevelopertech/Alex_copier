import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requirePageAccess } from "@/lib/auth-helpers";

export async function GET() {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const purchases = await prisma.purchaseOrder.findMany({
      include: {
        supplier: true,
        company: true,
        items: {
          include: { product: true },
        },
        invoices: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(purchases);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch purchases" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {

    const actor = await requirePageAccess("purchases");
    if (!actor) {
      const authed = await requireAuth();
      return NextResponse.json({ error: authed ? "Forbidden" : "Unauthorized" }, { status: authed ? 403 : 401 });
    }
        const body = await request.json();
    const { items, ...data } = body;

    const total = items?.reduce(
      (sum: number, item: { quantity: number; unitPrice: number }) =>
        sum + item.quantity * item.unitPrice,
      0
    ) ?? 0;

    const purchaseOrder = await prisma.purchaseOrder.create({
      data: {
        ...data,
        total,
        ...(items && {
          items: {
            create: items.map((item: { productId: string; quantity: number; unitPrice: number }) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            })),
          },
        }),
      },
      include: {
        supplier: true,
        items: {
          include: { product: true },
        },
        invoices: true,
      },
    });

    return NextResponse.json(purchaseOrder, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create purchase order" }, { status: 500 });
  }
}
