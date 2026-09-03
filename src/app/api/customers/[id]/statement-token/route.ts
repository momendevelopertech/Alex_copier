import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePageAccess, requireAuth } from "@/lib/auth-helpers";
import { generateStatementToken } from "@/lib/statement-token";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requirePageAccess("customers");
    if (!actor) {
      const authed = await requireAuth();
      return NextResponse.json(
        { error: authed ? "Forbidden" : "Unauthorized", code: authed ? "FORBIDDEN" : "UNAUTHORIZED" },
        { status: authed ? 403 : 401 },
      );
    }
    const { id } = await params;
    const customer = await prisma.customer.findUnique({ where: { id }, select: { id: true, statementToken: true } });
    if (!customer) {
      return NextResponse.json({ error: "العميل غير موجود", code: "NOT_FOUND" }, { status: 404 });
    }
    let token = customer.statementToken;
    if (!token) {
      token = generateStatementToken();
      await prisma.customer.update({ where: { id }, data: { statementToken: token } });
    }
    return NextResponse.json({ token });
  } catch {
    return NextResponse.json({ error: "Failed to generate statement link", code: "FAILED" }, { status: 500 });
  }
}
