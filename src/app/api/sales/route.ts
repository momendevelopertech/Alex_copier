import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";

export async function GET() {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sales = await prisma.salesOrder.findMany({
      include: {
        customer: true,
        company: true,
        items: {
          include: { product: true },
        },
        installments: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(sales);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch sales" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { items, installments, ...data } = body;

    const total = items?.reduce(
      (sum: number, item: { quantity: number; unitPrice: number; discount?: number }) =>
        sum + item.quantity * item.unitPrice - (item.discount ?? 0),
      0
    ) ?? 0;

    const salesOrder = await prisma.salesOrder.create({
      data: {
        ...data,
        total,
        ...(items && {
          items: {
            create: items.map(
              (item: { productId: string; quantity: number; unitPrice: number; discount?: number }) => ({
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discount: item.discount ?? 0,
              })
            ),
          },
        }),
        ...(installments && {
          installments: {
            create: installments.map(
              (inst: { installmentNo: number; amount: number; dueDate: string }) => ({
                installmentNo: inst.installmentNo,
                amount: inst.amount,
                dueDate: new Date(inst.dueDate),
              })
            ),
          },
        }),
      },
      include: {
        customer: true,
        items: {
          include: { product: true },
        },
        installments: true,
      },
    });

    return NextResponse.json(salesOrder, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create sales order" }, { status: 500 });
  }
}
