import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requirePageAccess } from "@/lib/auth-helpers";

export async function GET() {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sales = await prisma.salesOrder.findMany({
      include: {
        customer: true,
        company: true,
        engineer: true,
        items: {
          include: { product: true },
        },
        installments: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(sales);
  } catch {
    return NextResponse.json({ error: "Failed to fetch sales" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requirePageAccess("sales");
    if (!actor) {
      const authed = await requireAuth();
      return NextResponse.json({ error: authed ? "Forbidden" : "Unauthorized", code: authed ? "FORBIDDEN" : "UNAUTHORIZED" }, { status: authed ? 403 : 401 });
    }
    const body = await request.json();
    const { items, installments, ...raw } = body;

    if (!raw.companyId || !raw.customerId || !raw.orderType || !raw.paymentMethod || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "بيانات البيع غير مكتملة (عميل وشركة وطريقة دفع وبند واحد على الأقل)", code: "SALE_FIELDS_REQUIRED" }, { status: 400 });
    }

    if (!raw.orderDate || isNaN(new Date(raw.orderDate).getTime())) {
      return NextResponse.json({ error: "تاريخ الطلب غير صالح", code: "INVALID_ORDER_DATE" }, { status: 400 });
    }

    const resolvedTaxRate = raw.isTaxInvoice ? 14 : Number(raw.taxRate) || 0;
    const engineerId = typeof raw.engineerId === "string" && raw.engineerId.trim() ? raw.engineerId : null;
    if (items.some((item: { productId?: string; quantity?: number; unitPrice?: number }) => !item.productId || !Number.isInteger(item.quantity) || (item.quantity ?? 0) <= 0 || !Number.isFinite(item.unitPrice) || (item.unitPrice ?? -1) < 0)) {
      return NextResponse.json({ error: "بنود البيع غير صالحة", code: "INVALID_SALE_ITEMS" }, { status: 400 });
    }

    const subtotal = items.reduce(
      (sum: number, item: { quantity: number; unitPrice: number; discount?: number }) =>
        sum + item.quantity * item.unitPrice - Math.min(item.discount ?? 0, item.quantity * item.unitPrice),
      0
    );
    const discount = Math.max(0, Number(raw.discount) || 0);
    const orderDiscount = raw.discountType === "PERCENTAGE" ? subtotal * Math.min(discount, 100) / 100 : Math.min(discount, subtotal);
    const taxable = subtotal - orderDiscount;
    const total = Math.round((taxable + taxable * Math.max(0, resolvedTaxRate) / 100) * 100) / 100;

    const warehouse = await prisma.warehouse.findFirst({
      where: { companyId: raw.companyId, isMain: true },
      select: { id: true },
    });

    const salesOrder = await prisma.$transaction(async (tx) => {
      if (warehouse) {
        for (const item of items as { productId: string; quantity: number }[]) {
          const existing = await tx.warehouseInventory.findUnique({
            where: { warehouseId_productId: { warehouseId: warehouse.id, productId: item.productId } },
          });
          const available = existing?.quantity ?? 0;
          if (available < item.quantity || !existing) {
            throw new Error(`INSUFFICIENT_STOCK:${item.productId}`);
          }
          await tx.warehouseInventory.update({
            where: { warehouseId_productId: { warehouseId: warehouse.id, productId: item.productId } },
            data: { quantity: available - item.quantity },
          });
        }
      }

      const order = await tx.salesOrder.create({
        data: {
          companyId: raw.companyId,
          customerId: raw.customerId,
          engineerId,
          orderType: raw.orderType,
          paymentMethod: raw.paymentMethod,
          notes: raw.notes || null,
          discount: Math.max(0, Number(raw.discount) || 0),
          discountType: raw.discountType || "FIXED",
          taxRate: resolvedTaxRate,
          isTaxInvoice: Boolean(raw.isTaxInvoice),
          total,
          orderDate: new Date(raw.orderDate),
          items: {
            create: items.map(
              (item: { productId: string; quantity: number; unitPrice: number; discount?: number }) => ({
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discount: Math.min(item.discount ?? 0, item.quantity * item.unitPrice),
              })
            ),
          },
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
          items: { include: { product: true } },
          installments: true,
        },
      });

      if (warehouse) {
        for (const item of items as { productId: string; quantity: number }[]) {
          await tx.stockMovement.create({
            data: {
              warehouseId: warehouse.id,
              productId: item.productId,
              quantity: item.quantity,
              movementType: "SALE_OUT",
              referenceId: order.id,
              notes: `بيع — ${raw.orderType} — ${order.id}`,
            },
          });
        }
      }

      return order;
    });

    return NextResponse.json(salesOrder, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("INSUFFICIENT_STOCK")) {
      return NextResponse.json({ error: "الكمية المتاحة في المخزون لا تكفي لهذه الحركة", code: "INSUFFICIENT_STOCK" }, { status: 409 });
    }
    console.error("Failed to create sales order:", error);
    return NextResponse.json({ error: "Failed to create sales order" }, { status: 500 });
  }
}
