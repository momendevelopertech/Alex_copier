import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole } from "@/lib/auth-helpers";
import { ROLES } from "@/lib/permissions";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireRole("GENERAL_MANAGER");
    if (!admin) {
      const authed = await requireAuth();
      return NextResponse.json(
        { error: authed ? "Forbidden" : "Unauthorized" },
        { status: authed ? 403 : 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
    }

    if (target.id === admin.id && ("role" in body || "isActive" in body)) {
      return NextResponse.json(
        { error: "لا يمكنك تعديل دور أو حالة حسابك الشخصي" },
        { status: 400 }
      );
    }

    const data: Record<string, unknown> = {};

    if ("name" in body) {
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (!name) {
        return NextResponse.json({ error: "الاسم مطلوب" }, { status: 400 });
      }
      data.name = name;
    }

    if ("email" in body) {
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      if (!EMAIL_REGEX.test(email)) {
        return NextResponse.json({ error: "صيغة البريد الإلكتروني غير صحيحة" }, { status: 400 });
      }
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing && existing.id !== id) {
        return NextResponse.json({ error: "البريد الإلكتروني مستخدم بالفعل" }, { status: 409 });
      }
      data.email = email;
    }

    if ("password" in body && body.password !== "") {
      const password = typeof body.password === "string" ? body.password : "";
      if (password.length < 6) {
        return NextResponse.json(
          { error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" },
          { status: 400 }
        );
      }
      data.passwordHash = await hash(password, 10);
    }

    if ("role" in body) {
      if (!ROLES.includes(body.role)) {
        return NextResponse.json({ error: "الدور غير صالح" }, { status: 400 });
      }
      data.role = body.role;
    }

    if ("isActive" in body) {
      if (typeof body.isActive !== "boolean") {
        return NextResponse.json({ error: "قيمة الحالة غير صالحة" }, { status: 400 });
      }
      data.isActive = body.isActive;
    }

    if ("companyId" in body) {
      const companyId =
        typeof body.companyId === "string" && body.companyId !== "" ? body.companyId : null;
      if (companyId) {
        const company = await prisma.company.findUnique({ where: { id: companyId } });
        if (!company) {
          return NextResponse.json({ error: "الشركة غير موجودة" }, { status: 400 });
        }
      }
      data.companyId = companyId;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "لا توجد بيانات للتحديث" }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        companyId: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json(user);
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      return NextResponse.json({ error: "البريد الإلكتروني مستخدم بالفعل" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
