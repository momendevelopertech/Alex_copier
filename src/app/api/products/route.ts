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

export async function GET(request: Request) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const includeInactive = new URL(request.url).searchParams.get("all") === "true";
    const products = await prisma.product.findMany({
      where: includeInactive ? {} : { isActive: true },
      include: { company: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(products);
  } catch (error) {
    console.error("[products] GET failed:", error);
    return NextResponse.json({ error: "Failed to fetch products", code: "FETCH_FAILED" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requirePageAccess("inventory");
    if (!actor) {
      const authed = await requireAuth();
      return NextResponse.json(
        { error: authed ? "Forbidden" : "Unauthorized", code: authed ? "FORBIDDEN" : "UNAUTHORIZED" },
        { status: authed ? 403 : 401 },
      );
    }

    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "اسم المنتج مطلوب", code: "NAME_REQUIRED" }, { status: 400 });
    }

    const productType = typeof body.productType === "string" ? body.productType : "";
    if (!PRODUCT_TYPES.includes(productType)) {
      return NextResponse.json(
        { error: "نوع المنتج غير صالح", code: "INVALID_PRODUCT_TYPE" },
        { status: 400 },
      );
    }

    const companyId = typeof body.companyId === "string" ? body.companyId : "";
    if (!companyId) {
      return NextResponse.json({ error: "الشركة مطلوبة", code: "COMPANY_REQUIRED" }, { status: 400 });
    }
    const company = await prisma.company.findUnique({ where: { id: companyId }, select: { id: true } });
    if (!company) {
      return NextResponse.json({ error: "الشركة غير موجودة", code: "COMPANY_NOT_FOUND" }, { status: 400 });
    }

    const prices = extractPrices(body);
    if ("error" in prices) return prices.error;

    const optionalText = (value: unknown): string | null =>
      typeof value === "string" && value.trim() !== "" ? value.trim() : null;

    const product = await prisma.product.create({
      data: {
        name,
        description: optionalText(body.description),
        productType,
        companyId,
        sku: optionalText(body.sku),
        gs1Code: optionalText(body.gs1Code),
        egsCode: optionalText(body.egsCode),
        isActive: body.isActive !== false,
        ...prices.values,
      },
      include: { company: true },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("[products] POST failed:", error);
    return NextResponse.json({ error: "Failed to create product", code: "CREATE_FAILED" }, { status: 500 });
  }
}
