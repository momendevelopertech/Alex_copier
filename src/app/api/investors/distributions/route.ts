import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const cycles = await prisma.investorDistributionCycle.findMany({
      include: {
        distributions: {
          include: { investor: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(cycles);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch distribution cycles" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { cycleDate, totalProfit, notes } = body;

    const investors = await prisma.investor.findMany({
      where: { isActive: true },
    });

    const totalOwnership = investors.reduce((sum, inv) => sum + inv.ownershipPct, 0);

    if (totalOwnership === 0) {
      return NextResponse.json({ error: "No active investors found" }, { status: 400 });
    }

    const cycle = await prisma.investorDistributionCycle.create({
      data: {
        cycleDate: new Date(cycleDate),
        totalProfit,
        notes,
        distributions: {
          create: investors.map((investor) => ({
            investorId: investor.id,
            amount: (investor.ownershipPct / totalOwnership) * totalProfit,
          })),
        },
      },
      include: {
        distributions: {
          include: { investor: true },
        },
      },
    });

    return NextResponse.json(cycle, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create distribution cycle" }, { status: 500 });
  }
}
