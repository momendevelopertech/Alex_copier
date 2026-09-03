import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildCustomerStatement } from "@/lib/customer-statement";

// Public, unauthenticated endpoint: resolves a customer by its secret
// statement token and returns their full account statement. The token is
// unguessable, so the data is only reachable by whoever was given the link.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Invalid link" }, { status: 400 });
    }

    const customer = await prisma.customer.findUnique({
      where: { statementToken: token },
      select: { id: true },
    });
    if (!customer) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    const statement = await buildCustomerStatement(customer.id);
    if (!statement) {
      return NextResponse.json({ error: "Statement not found" }, { status: 404 });
    }

    return NextResponse.json(statement);
  } catch {
    return NextResponse.json({ error: "Failed to load statement" }, { status: 500 });
  }
}
