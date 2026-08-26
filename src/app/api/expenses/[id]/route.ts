import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requirePageAccess } from "@/lib/auth-helpers";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requirePageAccess("finance");
    if (!actor) {
      const authed = await requireAuth();
      return NextResponse.json({ error: authed ? "Forbidden" : "Unauthorized" }, { status: authed ? 403 : 401 });
    }
    const { id } = await params;
    const existing = await prisma.expense.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.expense.delete({ where: { id } });
    return NextResponse.json({ message: "Deleted" });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
