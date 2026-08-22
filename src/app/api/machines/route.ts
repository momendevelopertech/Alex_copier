import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";

export async function GET() {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    const { currentOwnerId, companyId, ...data } = body;

    const machine = await prisma.machine.create({
      data: { ...data, currentOwnerId: currentOwnerId || null },
      include: {
        history: true,
        meterReadings: true,
        currentOwner: true,
        product: true,
      },
    });

    // Ownership is part of the machine's lifecycle.  Only create a history
    // event when the caller has a real company context for the event.
    if (currentOwnerId && companyId) {
      await prisma.machineOwnerHistory.create({
        data: {
          machineId: machine.id,
          transactionType: "SALE",
          customerId: currentOwnerId,
          companyId,
        },
      });
    }

    return NextResponse.json(machine, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create machine" }, { status: 500 });
  }
}
