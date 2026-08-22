import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const serviceRequest = await prisma.serviceRequest.findUnique({
      where: { id },
      include: {
        customer: true,
        location: true,
        machine: true,
        engineer: true,
        problems: true,
        visits: {
          include: { engineer: true },
          orderBy: { visitedAt: "desc" },
        },
      },
    });

    if (!serviceRequest) {
      return NextResponse.json({ error: "Service request not found" }, { status: 404 });
    }

    return NextResponse.json(serviceRequest);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch service request" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const body = await request.json();

    const serviceRequest = await prisma.serviceRequest.update({
      where: { id },
      data: {
        status: body.status,
        engineerId: body.engineerId,
        ...body,
      },
      include: {
        customer: true,
        location: true,
        machine: true,
        engineer: true,
        problems: true,
        visits: true,
      },
    });

    return NextResponse.json(serviceRequest);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update service request" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    await prisma.serviceRequest.delete({ where: { id } });
    return NextResponse.json({ message: "Service request deleted" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete service request" }, { status: 500 });
  }
}
