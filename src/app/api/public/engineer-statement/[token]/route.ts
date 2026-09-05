import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildEngineerStatement } from "@/lib/engineer-statement";

// Public, unauthenticated endpoint: resolves an engineer by their secret
// statement token and returns their full activity statement. The token is
// unguessable, so the data is only reachable by whoever was given the link.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Invalid link" }, { status: 400 });
    }

    const engineer = await prisma.engineer.findUnique({
      where: { statementToken: token },
      select: { id: true },
    });
    if (!engineer) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    const statement = await buildEngineerStatement(engineer.id);
    if (!statement) {
      return NextResponse.json({ error: "Statement not found" }, { status: 404 });
    }

    return NextResponse.json(statement);
  } catch {
    return NextResponse.json({ error: "Failed to load statement" }, { status: 500 });
  }
}