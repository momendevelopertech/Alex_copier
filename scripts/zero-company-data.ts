import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("=== Zeroing company transactional & accounting data (keeping master data) ===\n");

  const del = async (label: string, fn: () => Promise<{ count: number }>) => {
    const r = await fn();
    console.log(`  deleted ${label}: ${r.count}`);
  };

  // ---- Accounting (double-entry) ----
  await del("JournalEntryItem", () => prisma.journalEntryItem.deleteMany({}));
  await del("JournalEntry", () => prisma.journalEntry.deleteMany({}));

  // ---- Sales ----
  await del("Installment", () => prisma.installment.deleteMany({}));
  await del("SalesOrderItem", () => prisma.salesOrderItem.deleteMany({}));
  await del("SalesOrder", () => prisma.salesOrder.deleteMany({}));

  // ---- Inter-company ----
  await del("InterCompanyInvoice", () => prisma.interCompanyInvoice.deleteMany({}));

  // ---- Purchases ----
  await del("PurchaseInvoice", () => prisma.purchaseInvoice.deleteMany({}));
  await del("PurchaseOrderItem", () => prisma.purchaseOrderItem.deleteMany({}));
  await del("PurchaseOrder", () => prisma.purchaseOrder.deleteMany({}));

  // ---- Returns / Expenses / Settlements ----
  await del("ReturnTransaction", () => prisma.returnTransaction.deleteMany({}));
  await del("Expense", () => prisma.expense.deleteMany({}));
  await del("Settlement", () => prisma.settlement.deleteMany({}));

  // ---- Stock movement history (transactions only; current stock levels kept) ----
  await del("StockMovement", () => prisma.stockMovement.deleteMany({}));

  // ---- Customer payments & ledgers ----
  await del("CustomerPayment", () => prisma.customerPayment.deleteMany({}));
  await del("CustomerLedger", () => prisma.customerLedger.deleteMany({}));

  // ---- Reset customer balances/debts ----
  const custZero = await prisma.customer.updateMany({
    data: { totalDebt: 0, remainingDebt: 0, lastPaymentDate: null },
  });
  console.log(`  reset customer debts: ${custZero.count}`);

  // ---- Reset company account chart balances to zero (keep the chart for inter-company flow) ----
  const accZero = await prisma.account.updateMany({ data: { balance: 0 } });
  console.log(`  reset account balances to 0: ${accZero.count}`);

  console.log("\n=== Done. Master data (companies, users, customers, products, suppliers, warehouses, machines, engineers, contracts, service requests) kept. ===");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
