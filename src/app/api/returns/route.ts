import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requirePageAccess } from "@/lib/auth-helpers";

export async function GET() {
  try {
    const user = await requireAuth();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const returns = await prisma.returnTransaction.findMany({
      include: {
        company: true,
        customer: true,
        supplier: true,
        product: true,
        warehouse: true,
        salesOrder: { select: { id: true } },
        salesOrderItem: { select: { id: true, unitPrice: true, quantity: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(returns);
  } catch (error) {
    console.error("Failed to fetch return transactions:", error);
    return NextResponse.json({ error: "Failed to fetch return transactions" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requirePageAccess("returns");
    if (!actor) {
      const authed = await requireAuth();
      return NextResponse.json(
        { error: authed ? "Forbidden" : "Unauthorized", code: authed ? "FORBIDDEN" : "UNAUTHORIZED" },
        { status: authed ? 403 : 401 }
      );
    }

    const body = await request.json();
    const { type, salesOrderId, salesOrderItemId, quantity, reason } = body;

    if (!type) {
      return NextResponse.json(
        { error: "نوع المرتجع مطلوب", code: "RETURN_TYPE_REQUIRED" },
        { status: 400 }
      );
    }

    if (type !== "SALE_RETURN" && type !== "PURCHASE_RETURN") {
      return NextResponse.json(
        { error: "نوع المرتجع غير صالح", code: "INVALID_RETURN_TYPE" },
        { status: 400 }
      );
    }

    if (type === "SALE_RETURN") {
      if (!salesOrderId || !salesOrderItemId) {
        return NextResponse.json(
          { error: "اختيار فاتورة البيع والمنتج مطلوب", code: "SALE_ORDER_REQUIRED" },
          { status: 400 }
        );
      }

      const normalizedQty = Number(quantity);
      if (!Number.isInteger(normalizedQty) || normalizedQty <= 0) {
        return NextResponse.json(
          { error: "الكمية يجب أن تكون عددًا صحيحًا أكبر من صفر", code: "INVALID_QUANTITY" },
          { status: 400 }
        );
      }

      const salesOrder = await prisma.salesOrder.findUnique({
        where: { id: salesOrderId },
        include: {
          items: { include: { product: true } },
          company: { select: { id: true, name: true, nameAr: true } },
          customer: { select: { id: true, name: true } },
        },
      });

      if (!salesOrder) {
        return NextResponse.json(
          { error: "فاتورة البيع غير موجودة", code: "SALE_ORDER_NOT_FOUND" },
          { status: 404 }
        );
      }

      const salesItem = salesOrder.items.find((i) => i.id === salesOrderItemId);
      if (!salesItem) {
        return NextResponse.json(
          { error: "المنتج غير موجود في فاتورة البيع", code: "SALE_ITEM_NOT_FOUND" },
          { status: 404 }
        );
      }

      const existingReturns = await prisma.returnTransaction.findMany({
        where: {
          salesOrderId,
          salesOrderItemId,
          status: { not: "REJECTED" },
        },
      });
      const totalReturned = existingReturns.reduce((sum, r) => sum + r.quantity, 0);
      const availableToReturn = salesItem.quantity - totalReturned;

      if (normalizedQty > availableToReturn) {
        return NextResponse.json(
          {
            error: `الكمية المطلوبة (${normalizedQty}) تتجاوز الكمية المتاحة للمرتجع (${availableToReturn})`,
            code: "EXCEEDED_RETURNABLE_QUANTITY",
          },
          { status: 400 }
        );
      }

      const warehouse = await prisma.warehouse.findFirst({
        where: { companyId: salesOrder.companyId, isMain: true },
        select: { id: true },
      });

      if (!warehouse) {
        return NextResponse.json(
          { error: "لا يوجد مستودع رئيسي للشركة", code: "NO_WAREHOUSE" },
          { status: 400 }
        );
      }

      const unitPrice = salesItem.unitPrice;
      const total = Number((normalizedQty * unitPrice).toFixed(2));

      const returnRecord = await prisma.$transaction(async (tx) => {
        const created = await tx.returnTransaction.create({
          data: {
            companyId: salesOrder.companyId,
            type: "SALE_RETURN",
            salesOrderId,
            salesOrderItemId,
            priceTier: null,
            warehouseId: warehouse.id,
            customerId: salesOrder.customerId,
            productId: salesItem.productId,
            quantity: normalizedQty,
            unitPrice,
            total,
            reason: reason || null,
            status: "APPROVED",
          },
        });

        await tx.warehouseInventory.upsert({
          where: { warehouseId_productId: { warehouseId: warehouse.id, productId: salesItem.productId } },
          update: { quantity: { increment: normalizedQty } },
          create: { warehouseId: warehouse.id, productId: salesItem.productId, quantity: normalizedQty },
        });

        await tx.stockMovement.create({
          data: {
            warehouseId: warehouse.id,
            productId: salesItem.productId,
            quantity: normalizedQty,
            movementType: "SALE_RETURN_IN",
            referenceId: created.id,
            notes: `مرتجع مبيعات — فاتورة ${salesOrder.id} — ${salesItem.product?.name || ""}`,
          },
        });

        await tx.customerLedger.upsert({
          where: { customerId_companyId: { customerId: salesOrder.customerId, companyId: salesOrder.companyId } },
          update: { balance: { decrement: total } },
          create: { customerId: salesOrder.customerId, companyId: salesOrder.companyId, balance: -total },
        });

        return created;
      });

      const full = await prisma.returnTransaction.findUnique({
        where: { id: returnRecord.id },
        include: {
          company: true,
          customer: true,
          product: true,
          warehouse: true,
          salesOrder: { select: { id: true } },
          salesOrderItem: { select: { id: true, unitPrice: true, quantity: true } },
        },
      });

      return NextResponse.json(full, { status: 201 });
    }

    return NextResponse.json({ error: "مرتجع المشتريات غير مدعوم بعد", code: "NOT_IMPLEMENTED" }, { status: 501 });
  } catch (error) {
    console.error("Failed to create return transaction:", error);
    return NextResponse.json({ error: "Failed to create return transaction" }, { status: 500 });
  }
}
