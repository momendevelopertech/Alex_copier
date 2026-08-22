import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";

export async function GET() {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const contracts = await prisma.contract.findMany({
      include: {
        customer: true,
        machines: {
          include: { machine: true },
        },
        _count: {
          select: { visits: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(contracts);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch contracts" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { machineIds, ...data } = body;

    const contractNumber = `CTR-${Date.now()}`;

    const contract = await prisma.contract.create({
      data: {
        ...data,
        contractNumber,
        ...(machineIds && {
          machines: {
            create: machineIds.map((machineId: string) => ({
              machineId,
            })),
          },
        }),
      },
      include: {
        customer: true,
        machines: {
          include: { machine: true },
        },
      },
    });

    return NextResponse.json(contract, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create contract" }, { status: 500 });
  }
}
