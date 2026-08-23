import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requirePageAccess } from "@/lib/auth-helpers";

const PRODUCT_TYPES = ["MACHINE", "SPARE_PART"];
const PRICE_FIELDS = ["purchasePrice", "wholesalePrice", "retailPrice"] as const;

function extractPrices(body: Record<string, unknown>): { values: Record<string, number | null> } | { error: NextResponse } {
  const values: Record<string, number | null> = {};
  for (const field of PRICE_FIELDS) {
    if (!(field in body)) continue;
    const raw = body[field];
    if (raw === null || raw === "") {
      values[field] = null;
      continue;
    }
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0) {
      return {
        error: NextResponse.json(
          { error: "الأسعار يجب أن تكون أرقامًا موجبة", code: "INVALID_PRICE" },
          { status: 400 },
        ),
      };
    }
    values[field] = value;
  }
  return { values };
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requirePageAccess("inventory");
    if (!actor) {
      const authed = await requireAuth();
      return NextResponse.json(
        { error: authed ? "Forbidden" : "Unauthorized", code: authed ? "FORBIDDEN" : "UNAUTHORIZED" },
        { status: authed ? 403 : 401 },
      );
    }

    const { id } = await params;
    const body = await request.json();
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "المنتج غير موجود", code: "PRODUCT_NOT_FOUND" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if ("name" in body) {
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (!name) {
        return NextResponse.json({ error: "اسم المنتج مطلوب", code: "NAME_REQUIRED" }, { status: 400 });
      }
      data.name = name;
    }
    if ("productType" in body) {
      if (!PRODUCT_TYPES.includes(body.productType)) {
        return NextResponse.json(
          { error: "نوع المنتج غير صالح", code: "INVALID_PRODUCT_TYPE" },
          { status: 400 },
        );
      }
      data.productType = body.productType;
    }
    if ("companyId" in body) {
      const companyId = typeof body.companyId === "string" ? body.companyId : "";
      const company = companyId ? await prisma.company.findUnique({ where: { id: companyId }, select: { id: true } }) : null;
      if (!company) {
        return NextResponse.json({ error: "الشركة غير موجودة", code: "COMPANY_NOT_FOUND" }, { status: 400 });
      }
      data.companyId = companyId;
    }
    for (const field of ["description", "sku", "gs1Code", "egsCode"] as const) {
      if (field in body) {
        const value = body[field];
        data[field] = typeof value === "string" && value.trim() !== "" ? value.trim() : null;
      }
    }
    if ("isActive" in body) data.isActive = body.isActive === true;

    const prices = extractPrices(body);
    if ("error" in prices) return prices.error;
    Object.assign(data, prices.values);

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "لا توجد بيانات للتحديث", code: "NO_CHANGES" }, { status: 400 });
    }

    const product = await prisma.product.update({
      where: { id },
      data,
      include: { company: true },
    });
    return NextResponse.json(product);
  } catch (error) {
    console.error("[products] PUT failed:", error);
    return NextResponse.json({ error: "Failed to update product", code: "UPDATE_FAILED" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requirePageAccess("inventory");
    if (!actor) {
      const authed = await requireAuth();
      return NextResponse.json(
        { error: authed ? "Forbidden" : "Unauthorized", code: authed ? "FORBIDDEN" : "UNAUTHORIZED" },
        { status: authed ? 403 : 401 },
      );
    }

    const { id } = await params;
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "المنتج غير موجود", code: "PRODUCT_NOT_FOUND" }, { status: 404 });
    }

    const [inventoryCount, movementCount, orderItemCount, machineCount, compatibilityCount, custodyCount] =
      await Promise.all([
        prisma.warehouseInventory.count({ where: { productId: id } }),
        prisma.stockMovement.count({ where: { productId: id } }),
        prisma.salesOrderItem.count({ where: { productId: id } }),
        prisma.machine.count({ where: { productId: id } }),
        prisma.sparePartCompatibility.count({
          where: { OR: [{ sparePartId: id }, { machineModelId: id }] },
        }),
        prisma.sparePartCustody.count({ where: { productId: id } }),
      ]);

    const referenced =
      inventoryCount + movementCount + orderItemCount + machineCount + compatibilityCount + custodyCount > 0;

    if (referenced) {
      // Soft-disable instead: history must stay intact for reports.
      await prisma.product.update({ where: { id }, data: { isActive: false } });
      return NextResponse.json(
        { message: "Product archived (in use)", archived: true },
        { status: 200 },
      );
    }

    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ message: "Product deleted", archived: false });
  } catch (error) {
    console.error("[products] DELETE failed:", error);
    return NextResponse.json({ error: "Failed to delete product", code: "DELETE_FAILED" }, { status: 500 });
  }
}
