import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";

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
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const body = await request.json();

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
    return NextResponse.json({ error: "Failed to update customer" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    await prisma.customer.delete({ where: { id } });
    return NextResponse.json({ message: "Customer deleted" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete customer" }, { status: 500 });
  }
}
