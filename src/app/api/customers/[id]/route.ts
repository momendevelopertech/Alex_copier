import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requirePageAccess } from "@/lib/auth-helpers";

async function guardMutations() {
  const actor = await requirePageAccess("customers");
  if (actor) return { actor };
  const authed = await requireAuth();
  return {
    actor: null,
    response: NextResponse.json(
      { error: authed ? "Forbidden" : "Unauthorized", code: authed ? "FORBIDDEN" : "UNAUTHORIZED" },
      { status: authed ? 403 : 401 },
    ),
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        locations: true,
        ledgers: true,
        orders: true,
        contracts: true,
        serviceRequests: true,
        machines: true,
      },
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    return NextResponse.json(customer);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch customer" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { actor, response } = await guardMutations();
    if (!actor && response) return response;
    const { id } = await params;
    const body = await request.json();

    if ("name" in body && (typeof body.name !== "string" || body.name.trim() === "")) {
      return NextResponse.json({ error: "اسم العميل مطلوب", code: "NAME_REQUIRED" }, { status: 400 });
    }
    for (const field of [
      "name", "companyName", "contactPerson", "phone", "whatsapp",
      "email", "address", "city", "governorate", "taxNumber", "tradeRegister", "paymentTerms",
    ] as const) {
      if (field in body && typeof body[field] === "string") {
        body[field] = body[field].trim() === "" ? null : body[field].trim();
      }
    }

    const customer = await prisma.customer.update({
      where: { id },
      data: body,
      include: {
        locations: true,
        ledgers: true,
      },
    });

    return NextResponse.json(customer);
  } catch (error) {
    console.error("[customers] PUT failed:", error);
    return NextResponse.json({ error: "Failed to update customer", code: "UPDATE_FAILED" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { actor, response } = await guardMutations();
    if (!actor && response) return response;
    const { id } = await params;

    const [machinesCount, requestsCount, contractsCount] = await Promise.all([
      prisma.machine.count({ where: { currentOwnerId: id } }),
      prisma.serviceRequest.count({ where: { customerId: id } }),
      prisma.contract.count({ where: { customerId: id } }),
    ]);
    if (machinesCount + requestsCount + contractsCount > 0) {
      return NextResponse.json(
        { error: "لا يمكن حذف عميل مرتبط بماكينات أو عقود أو طلبات صيانة", code: "CUSTOMER_IN_USE" },
        { status: 409 },
      );
    }

    await prisma.customer.delete({ where: { id } });
    return NextResponse.json({ message: "Customer deleted" });
  } catch (error) {
    console.error("[customers] DELETE failed:", error);
    return NextResponse.json({ error: "Failed to delete customer", code: "DELETE_FAILED" }, { status: 500 });
  }
}
