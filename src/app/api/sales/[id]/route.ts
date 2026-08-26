import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePageAccess } from "@/lib/auth-helpers";

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
    const actor = await requirePageAccess("sales");
    if (!actor) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.salesOrder.findUnique({
      where: { id },
      include: {
        items: { select: { id: true } },
        installments: { select: { id: true } },
        returns: { select: { id: true, status: true } },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Sales order not found" }, { status: 404 });
    }

    // Check if there are approved/completed returns - block deletion
    const activeReturns = existing.returns.filter(
      (r) => r.status === "APPROVED" || r.status === "COMPLETED"
    );
    if (activeReturns.length > 0) {
      return NextResponse.json(
        { error: "لا يمكن حذف فاتورة بيعلها مرتجعات مقبولة. احذف المرتجعات أولاً", code: "HAS_ACTIVE_RETURNS" },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      // Reverse stock movements for this order
      const stockMovements = await tx.stockMovement.findMany({
        where: { referenceId: id },
      });

      for (const movement of stockMovements) {
        if (movement.movementType === "SALE_OUT") {
          // Reverse sale: increment warehouse inventory
          await tx.warehouseInventory.upsert({
            where: { warehouseId_productId: { warehouseId: movement.warehouseId, productId: movement.productId } },
            update: { quantity: { increment: movement.quantity } },
            create: { warehouseId: movement.warehouseId, productId: movement.productId, quantity: movement.quantity },
          });
        } else if (movement.movementType === "PURCHASE_IN") {
          // Reverse trade-in: decrement warehouse inventory
          await tx.warehouseInventory.upsert({
            where: { warehouseId_productId: { warehouseId: movement.warehouseId, productId: movement.productId } },
            update: { quantity: { decrement: movement.quantity } },
            create: { warehouseId: movement.warehouseId, productId: movement.productId, quantity: 0 },
          });
        }
      }

      // Delete stock movements
      await tx.stockMovement.deleteMany({ where: { referenceId: id } });

      // Delete the order (cascades to items, installments, returns via Prisma)
      await tx.salesOrder.delete({ where: { id } });
    });

    return NextResponse.json({ message: "Sales order deleted" });
  } catch (error) {
    console.error("Failed to delete sales order:", error);
    return NextResponse.json({ error: "Failed to delete sales order" }, { status: 500 });
  }
}
