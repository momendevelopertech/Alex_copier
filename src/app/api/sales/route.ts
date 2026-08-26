import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requirePageAccess } from "@/lib/auth-helpers";
import { recalculatePaymentStatus } from "@/lib/payment-status";

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
          include: { product: true, tradeInProduct: true },
        },
        installments: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(sales);
  } catch (error) {
    console.error("Sales GET error:", error);
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

    const companyId = String(raw.companyId).trim();
    const customerId = String(raw.customerId).trim();
    const orderType = String(raw.orderType).trim() as "MACHINE_SALE" | "SPARE_PART_SALE";
    const paymentMethod = String(raw.paymentMethod).trim() as "CASH" | "CREDIT" | "INSTALLMENT" | "MIXED";
    const notes = raw.notes ? String(raw.notes) : null;
    const discountVal = Math.max(0, Number(raw.discount) || 0);
    const discountType = (raw.discountType === "PERCENTAGE" ? "PERCENTAGE" : "FIXED") as "FIXED" | "PERCENTAGE";
    const isTaxInvoice = Boolean(raw.isTaxInvoice);

    const subtotal = items.reduce(
      (sum: number, item: { quantity: number; unitPrice: number; discount?: number }) =>
        sum + item.quantity * item.unitPrice - Math.min(item.discount ?? 0, item.quantity * item.unitPrice),
      0
    );
    const orderDiscount = discountType === "PERCENTAGE" ? subtotal * Math.min(discountVal, 100) / 100 : Math.min(discountVal, subtotal);
    const taxable = subtotal - orderDiscount;
    const total = Math.round((taxable + taxable * Math.max(0, resolvedTaxRate) / 100) * 100) / 100;

    const warehouse = await prisma.warehouse.findFirst({
      where: { companyId, isMain: true },
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

      const installmentData = Array.isArray(installments) && installments.length > 0
        ? {
            create: installments.map(
              (inst: { installmentNo: number; amount: number; dueDate: string }) => ({
                installmentNo: inst.installmentNo,
                amount: inst.amount,
                dueDate: new Date(inst.dueDate),
              })
            ),
          }
        : undefined;

      const order = await tx.salesOrder.create({
        data: {
          companyId,
          customerId,
          engineerId,
          orderType,
          paymentMethod,
          notes,
          discount: discountVal,
          discountType,
          taxRate: resolvedTaxRate,
          isTaxInvoice,
          total,
          paidAmount: paymentMethod === "CASH" ? total : 0,
          paymentStatus: paymentMethod === "CASH" ? "PAID" : "PENDING",
          tradeInTotal: 0,
          orderDate: new Date(raw.orderDate),
          ...(installmentData && { installments: installmentData }),
        },
      });

      // For CREDIT/INSTALLMENT/MIXED orders, increment customer debt
      if (paymentMethod !== "CASH") {
        await tx.customer.update({
          where: { id: customerId },
          data: {
            totalDebt: { increment: total },
            remainingDebt: { increment: total },
          },
        });

        await tx.customerLedger.upsert({
          where: { customerId_companyId: { customerId, companyId } },
          update: { balance: { increment: total } },
          create: { customerId, companyId, balance: total },
        });
      }

      let tradeInTotal = 0;

      for (const item of items as {
        productId: string;
        quantity: number;
        unitPrice: number;
        discount?: number;
        tradeIn?: {
          name: string;
          brand?: string;
          condition?: string;
          value: number;
          serialNumber?: string;
        };
      }[]) {
        let tradeInProductId: string | undefined;

        if (item.tradeIn && item.tradeIn.value > 0) {
          const tradeInProduct = await tx.product.create({
            data: {
              name: item.tradeIn.name,
              productType: orderType === "MACHINE_SALE" ? "MACHINE" : "SPARE_PART",
              companyId,
              isTradeIn: true,
              tradeInValue: item.tradeIn.value,
              brand: item.tradeIn.brand || null,
              condition: item.tradeIn.condition || null,
              description: item.tradeIn.serialNumber ? `S/N: ${item.tradeIn.serialNumber}` : null,
            },
          });
          tradeInProductId = tradeInProduct.id;
          tradeInTotal += item.tradeIn.value;

          if (warehouse) {
            await tx.warehouseInventory.create({
              data: {
                warehouseId: warehouse.id,
                productId: tradeInProduct.id,
                quantity: 1,
              },
            });
            await tx.stockMovement.create({
              data: {
                warehouseId: warehouse.id,
                productId: tradeInProduct.id,
                quantity: 1,
                movementType: "PURCHASE_IN",
                referenceId: order.id,
                notes: `منتج استبدال — ${item.tradeIn.name}`,
              },
            });
          }
        }

        await tx.salesOrderItem.create({
          data: {
            salesOrderId: order.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: Math.min(item.discount ?? 0, item.quantity * item.unitPrice),
            tradeInProductId: tradeInProductId || null,
            tradeInValue: item.tradeIn?.value || 0,
          },
        });

        if (warehouse) {
          await tx.stockMovement.create({
            data: {
              warehouseId: warehouse.id,
              productId: item.productId,
              quantity: item.quantity,
              movementType: "SALE_OUT",
              referenceId: order.id,
              notes: `بيع — ${orderType} — ${order.id}`,
            },
          });
        }
      }

      if (tradeInTotal > 0) {
        await tx.salesOrder.update({
          where: { id: order.id },
          data: { tradeInTotal },
        });
      }

      // Recalculate payment status after all mutations
      await recalculatePaymentStatus(tx, order.id);

      const finalOrder = await tx.salesOrder.findUnique({
        where: { id: order.id },
        include: {
          customer: true,
          company: true,
          engineer: true,
          items: { include: { product: true, tradeInProduct: true } },
          installments: true,
        },
      });

      return finalOrder;
    });

    return NextResponse.json(salesOrder, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("INSUFFICIENT_STOCK")) {
      return NextResponse.json({ error: "الكمية المتاحة في المخزون لا تكفي لهذه الحركة", code: "INSUFFICIENT_STOCK" }, { status: 409 });
    }
    console.error("Failed to create sales order:", error);
    const msg = error instanceof Error ? (error.message || error.name || String(error)) : "Failed to create sales order";
    return NextResponse.json({ error: msg, detail: error instanceof Error ? error.stack : undefined }, { status: 500 });
  }
}
