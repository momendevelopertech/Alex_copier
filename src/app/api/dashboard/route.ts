import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import {
  OPEN_REQUEST_STATUSES,
  buildAlerts,
  buildCompanyPerformance,
  buildEngineerWorkload,
  buildExpiringContracts,
  machinesInService,
  toRecentRequestViews,
  type CompanyFinanceRaw,
  type MachineStatusCounts,
} from "@/lib/dashboard";

export async function GET() {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const openStatuses = [...OPEN_REQUEST_STATUSES];
    const expiryLimit = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [
      companies,
      machineStatusGroups,
      activeContracts,
      serviceCounts,
      urgentRequests,
      unassignedRequests,
      monthVisits,
      recentRequests,
      engineerVisits,
      engineerAssigned,
      overdueInstallmentAggregate,
      expiringContracts,
    ] = await Promise.all([
      prisma.company.findMany({ orderBy: { name: "asc" } }),
      prisma.machine.groupBy({ by: ["currentStatus"], _count: { _all: true } }),
      prisma.contract.count({ where: { status: "ACTIVE" } }),
      prisma.serviceRequest.count({ where: { status: { in: openStatuses } } }),
      prisma.serviceRequest.count({ where: { status: { in: openStatuses }, priority: { in: ["URGENT", "EMERGENCY"] } } }),
      prisma.serviceRequest.count({ where: { status: { in: openStatuses }, engineerId: null } }),
      prisma.visit.count({ where: { visitedAt: { gte: monthStart } } }),
      prisma.serviceRequest.findMany({
        where: { status: { in: openStatuses } },
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        take: 6,
        select: {
          id: true, requestNumber: true, description: true, priority: true, status: true, createdAt: true,
          customer: { select: { name: true } },
          machine: { select: { serialNumber: true } },
          engineer: { select: { name: true } },
        },
      }),
      prisma.visit.groupBy({
        by: ["engineerId"],
        where: { visitedAt: { gte: monthStart } },
        _count: { _all: true },
        orderBy: { _count: { engineerId: "desc" } },
      }),
      prisma.serviceRequest.groupBy({
        by: ["engineerId"],
        where: { status: { in: openStatuses }, engineerId: { not: null } },
        _count: { _all: true },
      }),
      prisma.installment.aggregate({
        where: { dueDate: { lt: now }, status: { not: "PAID" } },
        _count: { _all: true },
        _sum: { amount: true },
      }),
      prisma.contract.findMany({
        where: { status: "ACTIVE", endDate: { lte: expiryLimit } },
        orderBy: { endDate: "asc" },
        take: 10,
        select: { id: true, contractNumber: true, endDate: true, customer: { select: { name: true } } },
      }),
    ]);

    const machineStatuses: MachineStatusCounts = Object.fromEntries(
      machineStatusGroups.map((group) => [group.currentStatus, group._count._all])
    );

    const engineerIds = new Set<string>([
      ...engineerVisits.map((item) => item.engineerId),
      ...engineerAssigned.filter((item) => item.engineerId !== null).map((item) => item.engineerId as string),
    ]);
    const engineers = engineerIds.size
      ? await prisma.engineer.findMany({ where: { id: { in: [...engineerIds] } }, select: { id: true, name: true } })
      : [];

    const financeByCompany: Record<string, CompanyFinanceRaw> = {};
    await Promise.all(
      companies.map(async (company) => {
        const [sales, purchases, expenses, settlements, openRequests] = await Promise.all([
          prisma.salesOrder.aggregate({ where: { companyId: company.id, orderDate: { gte: monthStart } }, _sum: { total: true } }),
          prisma.purchaseOrder.aggregate({ where: { companyId: company.id, orderDate: { gte: monthStart } }, _sum: { total: true } }),
          prisma.expense.aggregate({ where: { companyId: company.id, date: { gte: monthStart } }, _sum: { amount: true } }),
          prisma.settlement.aggregate({ where: { companyId: company.id, status: "VERIFIED", createdAt: { gte: monthStart } }, _sum: { amount: true } }),
          prisma.serviceRequest.count({ where: { companyId: company.id, status: { in: openStatuses } } }),
        ]);
        financeByCompany[company.id] = { sales, purchases, expenses, settlements, openRequests };
      })
    );

    const payload = {
      monthStart: monthStart.toISOString(),
      generatedAt: now.toISOString(),
      kpis: {
        openRequests: serviceCounts,
        urgentRequests,
        unassignedRequests,
        visitsThisMonth: monthVisits,
        activeContracts,
        machinesInService: machinesInService(machineStatuses),
      },
      machineStatuses,
      companies: buildCompanyPerformance(companies, financeByCompany),
      alerts: buildAlerts({
        urgentRequests,
        unassignedRequests,
        overdueInstallments: {
          count: overdueInstallmentAggregate._count._all,
          totalAmount: overdueInstallmentAggregate._sum.amount ?? 0,
        },
        expiringContracts: buildExpiringContracts(expiringContracts, now),
      }),
      recentRequests: toRecentRequestViews(recentRequests),
      engineerWorkload: buildEngineerWorkload(
        engineerVisits,
        engineerAssigned.filter((item): item is { engineerId: string; _count: { _all: number } } => item.engineerId !== null),
        engineers
      ),
    };

    return NextResponse.json(payload);
  } catch {
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}
