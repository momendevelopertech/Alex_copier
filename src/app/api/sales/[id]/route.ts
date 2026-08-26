import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sale = await prisma.salesOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        company: true,
        items: {
          include: { product: true, tradeInProduct: true },
        },
        installments: true,
      },
    });

    if (!sale) {
      return NextResponse.json({ error: "Sales order not found" }, { status: 404 });
    }

    return NextResponse.json(sale);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch sales order" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const sale = await prisma.salesOrder.update({
      where: { id },
      data: body,
      include: {
        customer: true,
        items: {
          include: { product: true, tradeInProduct: true },
        },
        installments: true,
      },
    });

    return NextResponse.json(sale);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update sales order" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.salesOrder.delete({ where: { id } });
    return NextResponse.json({ message: "Sales order deleted" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete sales order" }, { status: 500 });
  }
}
