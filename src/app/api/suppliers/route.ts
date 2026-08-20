import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const suppliers = await prisma.supplier.findMany({
      include: {
        company: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(suppliers);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch suppliers" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supplier = await prisma.supplier.create({
      data: body,
      include: {
        company: true,
      },
    });
    return NextResponse.json(supplier, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create supplier" }, { status: 500 });
  }
}
