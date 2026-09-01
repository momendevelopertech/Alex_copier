import "dotenv/config";
import { PrismaClient, PaymentStatus } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// Effective total = order total minus approved/completed returns.
async function getEffectiveTotal(tx: PrismaClient, orderId: string, orderTotal: number): Promise<number> {
  const returns = await tx.returnTransaction.findMany({
    where: { salesOrderId: orderId, status: { in: ["APPROVED", "COMPLETED"] } },
    select: { total: true },
  });
  const totalReturns = returns.reduce((s, r) => s + (r.total || 0), 0);
  return Math.max(0, (orderTotal || 0) - totalReturns);
}

async function computePaymentStatus(
  tx: PrismaClient,
  order: { id: string; total: number; paidAmount: number; paymentMethod: string },
): Promise<PaymentStatus> {
  const effectiveTotal = await getEffectiveTotal(tx, order.id, order.total);
  if (order.paidAmount >= effectiveTotal && effectiveTotal > 0) return "PAID";
  if (order.paymentMethod === "INSTALLMENT" || order.paymentMethod === "MIXED") {
    const installments = await tx.installment.findMany({
      where: { salesOrderId: order.id, status: "OVERDUE", paidDate: null },
      select: { id: true },
    });
    if (installments.length > 0) return "OVERDUE";
  }
  if (order.paidAmount > 0 && order.paidAmount < effectiveTotal) return "PARTIAL";
  return "PENDING";
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  const customers = await prisma.customer.findMany({
    where: { payments: { some: { amount: { gt: 0 } } } },
    select: {
      id: true,
      name: true,
      orders: {
        where: { paymentMethod: { not: "CASH" }, status: { notIn: ["DRAFT", "CANCELLED"] } },
        select: { id: true, total: true, paidAmount: true, paymentMethod: true },
        orderBy: [{ orderDate: "asc" }, { createdAt: "asc" }],
      },
      payments: {
        select: { amount: true },
        orderBy: [{ paymentDate: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  let totalOrdersFixed = 0;

  for (const customer of customers) {
    const creditOrders = customer.orders.filter((o) => (o.total || 0) > 0);
    if (creditOrders.length === 0) continue;

    const totalCredit = creditOrders.reduce((s, o) => s + (o.total || 0), 0);
    const totalPaidRecords = customer.payments.reduce((s, p) => s + (p.amount || 0), 0);
    const pooled = Math.min(totalPaidRecords, totalCredit);
    let remaining = pooled;

    for (const order of creditOrders) {
      const applied = Math.min(remaining, order.total);
      remaining -= applied;
      const newPaidAmount = Math.max(order.paidAmount || 0, Math.max(applied, 0));

      if (dryRun) {
        if (Math.abs(newPaidAmount - (order.paidAmount || 0)) > 0.001) {
          console.log(`  would update order ${order.id}: paidAmount ${order.paidAmount} -> ${newPaidAmount}`);
        }
      } else if (Math.abs(newPaidAmount - (order.paidAmount || 0)) > 0.001) {
        await prisma.salesOrder.update({
          where: { id: order.id },
          data: { paidAmount: newPaidAmount },
        });
      }
    }

    for (const order of creditOrders) {
      const fresh = await prisma.salesOrder.findUnique({ where: { id: order.id } });
      if (!fresh) continue;
      const status = await computePaymentStatus(prisma, fresh);
      if (!dryRun && fresh.paymentStatus !== status) {
        await prisma.salesOrder.update({ where: { id: order.id }, data: { paymentStatus: status } });
      } else if (dryRun && fresh.paymentStatus !== status) {
        console.log(`  would update order ${order.id} status ${fresh.paymentStatus} -> ${status}`);
      }
    }

    totalOrdersFixed += creditOrders.length;
    console.log(
      `${dryRun ? "[DRY RUN] " : ""}${customer.name}: ${creditOrders.length} credit orders, ` +
        `records=${totalPaidRecords.toFixed(2)}, pooled=${pooled.toFixed(2)}`,
    );
  }

  console.log(`\nBackfill ${dryRun ? "dry-run" : "complete"}. Processed ${totalOrdersFixed} credit orders.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
