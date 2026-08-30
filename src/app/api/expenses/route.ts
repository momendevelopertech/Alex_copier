import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requirePageAccess } from "@/lib/auth-helpers";

export async function GET() {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const expenses = await prisma.expense.findMany({
      include: {
        company: true,
        payer: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(expenses);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch expenses" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requirePageAccess("finance");
    if (!actor) {
      const authed = await requireAuth();
      return NextResponse.json({ error: authed ? "Forbidden" : "Unauthorized" }, { status: authed ? 403 : 401 });
    }

    const body = await request.json();
    const companyId = typeof body.companyId === "string" ? body.companyId : "";
    const category = typeof body.category === "string" ? body.category.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const amount = Number(body.amount);

    if (!companyId || !category || !description || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Invalid expense data" }, { status: 400 });
    }

    const expense = await prisma.expense.create({
      data: {
        companyId,
        category,
        description,
        amount,
        paidBy: actor.id,
      },
      include: {
        company: true,
        payer: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create expense" }, { status: 500 });
  }
}
