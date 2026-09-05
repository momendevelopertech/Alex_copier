import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { buildEngineerStatement } from "@/lib/engineer-statement";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const engineer = await prisma.engineer.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!engineer) return NextResponse.json({ error: "Engineer not found" }, { status: 404 });

    const statement = await buildEngineerStatement(id);
    if (!statement) return NextResponse.json({ error: "Statement not found" }, { status: 404 });

    return NextResponse.json(statement);
  } catch {
    return NextResponse.json({ error: "Failed to generate engineer statement" }, { status: 500 });
  }
}