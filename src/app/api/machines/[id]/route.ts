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
    const machine = await prisma.machine.findUnique({
      where: { id },
      include: {
        history: { include: { customer: true }, orderBy: { date: "desc" } },
        meterReadings: { orderBy: { readingDate: "desc" } },
        currentOwner: true,
        product: true,
        customerLocation: { include: { customer: true } },
        serviceRequests: {
          include: {
            customer: true,
            location: true,
            engineer: true,
            visits: { include: { engineer: true }, orderBy: { visitedAt: "desc" } },
          },
          orderBy: { createdAt: "desc" },
        },
        contracts: { include: { contract: { include: { customer: true } } } },
        scrapOrder: true,
        warranty: true,
      },
    });

    if (!machine) {
      return NextResponse.json({ error: "Machine not found" }, { status: 404 });
    }

    return NextResponse.json(machine);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch machine" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const machine = await prisma.machine.update({
      where: { id },
      data: body,
      include: {
        history: true,
        meterReadings: true,
        currentOwner: true,
        product: true,
      },
    });

    return NextResponse.json(machine);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update machine" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.machine.delete({ where: { id } });
    return NextResponse.json({ message: "Machine deleted" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete machine" }, { status: 500 });
  }
}
