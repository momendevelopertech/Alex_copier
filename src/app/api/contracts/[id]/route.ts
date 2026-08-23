import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requirePageAccess } from "@/lib/auth-helpers";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const contract = await prisma.contract.findUnique({
      where: { id },
      include: {
        customer: true,
        machines: {
          include: { machine: true },
        },
        visits: true,
      },
    });

    if (!contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    return NextResponse.json(contract);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch contract" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requirePageAccess("contracts");
    if (!actor) {
      const authed = await requireAuth();
      return NextResponse.json({ error: authed ? "Forbidden" : "Unauthorized" }, { status: authed ? 403 : 401 });
    }
    const { id } = await params;
    const body = await request.json();
    const { machineIds, ...data } = body;

    if (machineIds) {
      await prisma.contractMachine.deleteMany({ where: { contractId: id } });
    }

    const contract = await prisma.contract.update({
      where: { id },
      data: {
        ...data,
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
        visits: true,
      },
    });

    return NextResponse.json(contract);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update contract" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requirePageAccess("contracts");
    if (!actor) {
      const authed = await requireAuth();
      return NextResponse.json({ error: authed ? "Forbidden" : "Unauthorized" }, { status: authed ? 403 : 401 });
    }
    const { id } = await params;
    await prisma.contract.delete({ where: { id } });
    return NextResponse.json({ message: "Contract deleted" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete contract" }, { status: 500 });
  }
}
