import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const engineer = await prisma.engineer.findUnique({
      where: { id },
      include: {
        areas: true,
        skills: true,
        serviceRequests: true,
        visits: true,
        settlements: true,
        user: true,
      },
    });

    if (!engineer) {
      return NextResponse.json({ error: "Engineer not found" }, { status: 404 });
    }

    return NextResponse.json(engineer);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch engineer" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { areas, skills, ...data } = body;

    if (areas) {
      await prisma.engineerArea.deleteMany({ where: { engineerId: id } });
    }
    if (skills) {
      await prisma.engineerSkill.deleteMany({ where: { engineerId: id } });
    }

    const engineer = await prisma.engineer.update({
      where: { id },
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

    return NextResponse.json(engineer);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update engineer" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.engineer.delete({ where: { id } });
    return NextResponse.json({ message: "Engineer deleted" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete engineer" }, { status: 500 });
  }
}
