import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const machines = await prisma.machine.findMany({
      include: {
        history: true,
        meterReadings: true,
        currentOwner: true,
        product: true,
        customerLocation: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(machines);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch machines" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { currentOwnerId, ...data } = body;

    const machine = await prisma.machine.create({
      data,
      include: {
        history: true,
        meterReadings: true,
        currentOwner: true,
        product: true,
      },
    });

    if (currentOwnerId) {
      await prisma.machineOwnerHistory.create({
        data: {
          machineId: machine.id,
          transactionType: "SALE",
          customerId: currentOwnerId,
          companyId: data.companyId || "",
        },
      });
    }

    return NextResponse.json(machine, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create machine" }, { status: 500 });
  }
}
