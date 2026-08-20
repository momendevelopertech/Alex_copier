import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const machine = await prisma.machine.findUnique({
      where: { id },
      include: {
        history: true,
        meterReadings: true,
        currentOwner: true,
        product: true,
        customerLocation: true,
        serviceRequests: true,
        contracts: true,
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
