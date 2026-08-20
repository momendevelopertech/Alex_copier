import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [
      companies,
      users,
      customers,
      engineers,
      machines,
      contracts,
      serviceRequests,
      purchaseOrders,
      salesOrders,
      products,
    ] = await Promise.all([
      prisma.company.count(),
      prisma.user.count(),
      prisma.customer.count(),
      prisma.engineer.count(),
      prisma.machine.count(),
      prisma.contract.count(),
      prisma.serviceRequest.count(),
      prisma.purchaseOrder.count(),
      prisma.salesOrder.count(),
      prisma.product.count(),
    ]);

    const tables = {
      companies,
      users,
      customers,
      engineers,
      machines,
      contracts,
      serviceRequests,
      purchaseOrders,
      salesOrders,
      products,
    };

    return NextResponse.json({ status: "healthy", tables });
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
