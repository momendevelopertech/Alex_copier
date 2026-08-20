import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";

export async function GET() {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const inventory = await prisma.warehouseInventory.findMany({
      include: {
        product: true,
        warehouse: true,
      },
      orderBy: { warehouse: { name: "asc" } },
    });
    return NextResponse.json(inventory);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch inventory" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { warehouseId, productId, quantity, movementType, referenceId, notes } = body;

    const existing = await prisma.warehouseInventory.findUnique({
      where: { warehouseId_productId: { warehouseId, productId } },
    });

    if (existing) {
      const newQuantity =
        movementType === "PURCHASE_IN" || movementType === "INTER_COMPANY_IN" || movementType === "ENGINEER_RETURN"
          ? existing.quantity + quantity
          : existing.quantity - quantity;

      await prisma.warehouseInventory.update({
        where: { warehouseId_productId: { warehouseId, productId } },
        data: { quantity: Math.max(0, newQuantity) },
      });
    } else {
      await prisma.warehouseInventory.create({
        data: {
          warehouseId,
          productId,
          quantity,
        },
      });
    }

    const movement = await prisma.stockMovement.create({
      data: {
        warehouseId,
        productId,
        quantity,
        movementType,
        referenceId,
        notes,
      },
      include: {
        warehouse: true,
        product: true,
      },
    });

    return NextResponse.json(movement, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create stock movement" }, { status: 500 });
  }
}
