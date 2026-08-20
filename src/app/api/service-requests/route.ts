import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const serviceRequests = await prisma.serviceRequest.findMany({
      include: {
        customer: true,
        location: true,
        machine: true,
        engineer: true,
        problems: true,
        visits: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(serviceRequests);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch service requests" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { problems, ...data } = body;

    const requestNumber = `SR-${Date.now()}`;

    const serviceRequest = await prisma.serviceRequest.create({
      data: {
        ...data,
        requestNumber,
        ...(problems && {
          problems: {
            create: problems.map((p: { description: string }) => ({
              description: p.description,
            })),
          },
        }),
      },
      include: {
        customer: true,
        location: true,
        machine: true,
        engineer: true,
        problems: true,
      },
    });

    return NextResponse.json(serviceRequest, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create service request" }, { status: 500 });
  }
}
