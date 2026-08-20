import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const engineers = await prisma.engineer.findMany({
      include: {
        areas: true,
        skills: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(engineers);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch engineers" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { areas, skills, ...data } = body;

    const engineer = await prisma.engineer.create({
      data: {
        ...data,
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
      },
    });

    return NextResponse.json(engineer, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create engineer" }, { status: 500 });
  }
}
