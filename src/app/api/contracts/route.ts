import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requirePageAccess } from "@/lib/auth-helpers";

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
    const actor = await requirePageAccess("contracts");
    if (!actor) {
      const authed = await requireAuth();
      return NextResponse.json({ error: authed ? "Forbidden" : "Unauthorized" }, { status: authed ? 403 : 401 });
    }
    const body = await request.json();
    const { machineIds, ...data } = body;

    if (!data.customerId || !data.startDate || !data.endDate) {
      return NextResponse.json({ error: "العميل وتاريخا البداية والنهاية مطلوبان", code: "CONTRACT_FIELDS_REQUIRED" }, { status: 400 });
    }

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
