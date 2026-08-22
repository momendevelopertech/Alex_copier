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
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await request.json();
    const { items, installments, ...data } = body;

    if (!data.companyId || !data.customerId || !data.orderType || !data.paymentMethod || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "A sale requires a customer, company, payment method, and at least one item" }, { status: 400 });
    }
    if (items.some((item: { productId?: string; quantity?: number; unitPrice?: number }) => !item.productId || !Number.isInteger(item.quantity) || (item.quantity ?? 0) <= 0 || !Number.isFinite(item.unitPrice) || (item.unitPrice ?? -1) < 0)) {
      return NextResponse.json({ error: "Invalid sales items" }, { status: 400 });
    }

    const subtotal = items.reduce(
      (sum: number, item: { quantity: number; unitPrice: number; discount?: number }) =>
        sum + item.quantity * item.unitPrice - (item.discount ?? 0),
      0
    );
    const discount = Math.max(0, Number(data.discount) || 0);
    const orderDiscount = data.discountType === "PERCENTAGE" ? subtotal * Math.min(discount, 100) / 100 : Math.min(discount, subtotal);
    const taxable = subtotal - orderDiscount;
    const total = Math.round((taxable + taxable * Math.max(0, Number(data.taxRate) || 0) / 100) * 100) / 100;

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
