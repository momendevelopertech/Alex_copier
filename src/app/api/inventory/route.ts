import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";

export async function GET(request: Request) {
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
    if (new URL(request.url).searchParams.get("catalog") === "true") {
      const [warehouses, products] = await Promise.all([
        prisma.warehouse.findMany({ orderBy: { name: "asc" } }),
        prisma.product.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
      ]);
      return NextResponse.json({ inventory, warehouses, products });
    }
    return NextResponse.json(inventory);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch inventory" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await request.json();
    const { warehouseId, productId, quantity, movementType, referenceId, notes } = body;

    if (!warehouseId || !productId || !movementType || !Number.isInteger(quantity) || quantity <= 0) {
      return NextResponse.json({ error: "Invalid stock movement data" }, { status: 400 });
    }

    const incoming = ["PURCHASE_IN", "INTER_COMPANY_IN", "ENGINEER_RETURN"].includes(movementType);
    const movement = await prisma.$transaction(async (tx) => {
      const existing = await tx.warehouseInventory.findUnique({
        where: { warehouseId_productId: { warehouseId, productId } },
      });
      const available = existing?.quantity ?? 0;
      if (!incoming && available < quantity) {
        throw new Error("INSUFFICIENT_STOCK");
      }

      if (existing) {
        await tx.warehouseInventory.update({
          where: { warehouseId_productId: { warehouseId, productId } },
          data: { quantity: incoming ? available + quantity : available - quantity },
        });
      } else if (incoming) {
        await tx.warehouseInventory.create({ data: { warehouseId, productId, quantity } });
      } else {
        throw new Error("INSUFFICIENT_STOCK");
      }

      return tx.stockMovement.create({
        data: { warehouseId, productId, quantity, movementType, referenceId, notes },
        include: { warehouse: true, product: true },
      });
    });

    return NextResponse.json(movement, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "INSUFFICIENT_STOCK") {
      return NextResponse.json({ error: "Insufficient stock for this movement" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create stock movement" }, { status: 500 });
  }
}
