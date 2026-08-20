import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const companies = await prisma.company.findMany({
      orderBy: { createdAt: "desc" },
    });

    const companiesWithFinance = await Promise.all(
      companies.map(async (company) => {
        const [salesAgg, purchaseAgg, settlementCount, salesCount, purchaseCount] = await Promise.all([
          prisma.salesOrder.aggregate({
            where: { companyId: company.id },
            _sum: { total: true },
          }),
          prisma.purchaseOrder.aggregate({
            where: { companyId: company.id },
            _sum: { total: true },
          }),
          prisma.settlement.count({
            where: { companyId: company.id },
          }),
          prisma.salesOrder.count({
            where: { companyId: company.id },
          }),
          prisma.purchaseOrder.count({
            where: { companyId: company.id },
          }),
        ]);

        const totalSales = salesAgg._sum?.total ?? 0;
        const totalPurchases = purchaseAgg._sum?.total ?? 0;

        return {
          ...company,
          totalSales,
          totalPurchases,
          totalSettlements: settlementCount,
          netProfit: totalSales - totalPurchases,
          counts: {
            salesOrders: salesCount,
            purchaseOrders: purchaseCount,
          },
        };
      })
    );

    return NextResponse.json(companiesWithFinance);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch companies" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const company = await prisma.company.create({
      data: body,
    });
    return NextResponse.json(company, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create company" }, { status: 500 });
  }
}
