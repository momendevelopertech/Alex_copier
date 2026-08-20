import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const companies = await prisma.company.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(companies);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch companies" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const company = await prisma.company.create({
      data: body,
    });
    return NextResponse.json(company, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create company" }, { status: 500 });
  }
}
