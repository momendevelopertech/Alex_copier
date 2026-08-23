import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requirePageAccess } from "@/lib/auth-helpers";

const OPEN_STATUSES = ["NEW", "ASSIGNED", "VISITED", "REASSIGNED"];

export async function GET() {
  try {
    const actor = await requireAuth();
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const engineers = await prisma.engineer.findMany({
      include: {
        areas: true,
        skills: true,
        user: { select: { id: true, name: true, email: true } },
        serviceRequests: { select: { id: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(
      engineers.map((e) => ({
        ...e,
        openAssignedCount: e.serviceRequests.filter((r) => OPEN_STATUSES.includes(r.status)).length,
        serviceRequests: undefined,
      })),
    );
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch engineers" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requirePageAccess("engineers");
    if (!actor) {
      const authed = await requireAuth();
      return NextResponse.json({ error: authed ? "Forbidden" : "Unauthorized" }, { status: authed ? 403 : 401 });
    }
    const body = await request.json();
    const { areas, skills, ...data } = body;

    if (!data.name || String(data.name).trim() === "") {
      return NextResponse.json({ error: "اسم المهندس مطلوب", code: "NAME_REQUIRED" }, { status: 400 });
    }

    let userId: string | null = null;
    if (typeof data.userId === "string" && data.userId !== "") {
      const linkedUser = await prisma.user.findUnique({ where: { id: data.userId } });
      if (!linkedUser) return NextResponse.json({ error: "المستخدم غير موجود", code: "USER_NOT_FOUND" }, { status: 400 });
      if (linkedUser.role !== "ENGINEER") {
        return NextResponse.json({ error: "الحساب المرتبط يجب أن يكون بدور مهندس", code: "LINKED_USER_MUST_BE_ENGINEER" }, { status: 400 });
      }
      const taken = await prisma.engineer.findUnique({ where: { userId: linkedUser.id } });
      if (taken) return NextResponse.json({ error: "هذا الحساب مرتبط بمهندس آخر", code: "ACCOUNT_ALREADY_LINKED" }, { status: 409 });
      userId = linkedUser.id;
    }

    const engineer = await prisma.engineer.create({
      data: {
        ...data,
        userId,
        ...(areas && {
          areas: {
            create: areas.map((a: { areaName: string; isDefault?: boolean }) => ({
              areaName: a.areaName,
              isDefault: a.isDefault ?? true,
            })),
          },
        }),
        ...(skills && {
          skills: {
            create: skills.map((s: { modelType: string; skillLevel?: number }) => ({
              modelType: s.modelType,
              skillLevel: s.skillLevel ?? 1,
            })),
          },
        }),
      },
      include: {
        areas: true,
        skills: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(engineer, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create engineer" }, { status: 500 });
  }
}
