import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const orders = await prisma.order.findMany({
    include: { customer: true, items: { include: { product: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(orders);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const order = await prisma.order.create({
    data: {
      customerId: body.customerId,
      status: body.status || "PENDING",
      notes: body.notes,
      total: body.items.reduce(
        (sum: number, item: { quantity: number; price: number }) => sum + item.quantity * item.price,
        0
      ),
      items: {
        create: body.items.map((item: { productId: string; quantity: number; price: number }) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
        })),
      },
    },
    include: { customer: true, items: { include: { product: true } } },
  });
  return NextResponse.json(order);
}
