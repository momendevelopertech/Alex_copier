import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const models = [
  "user", "company", "customer", "customerLocation", "supplier", "engineer",
  "engineerArea", "investor", "product", "machine", "machineOwnerHistory",
  "meterReading", "warehouse", "warehouseInventory", "stockMovement",
  "sparePartCustody", "purchaseOrder", "purchaseInvoice", "salesOrder",
  "salesOrderItem", "installment", "contract", "contractMachine",
  "serviceRequest", "problemDetail", "visit", "scrapOrder", "account",
  "journalEntry", "settlement", "expense", "warranty", "notification",
  "approvalLog",
] as const;

async function main() {
  for (const m of models) {
    const count = await (prisma as unknown as Record<string, { count: () => Promise<number> }>)[m].count();
    console.log(`${m}: ${count}`);
  }
  const users = await prisma.user.findMany({ select: { id: true, name: true, role: true, isActive: true, engineer: { select: { id: true } } } });
  console.log("\nUSERS:");
  users.forEach((u) => console.log(`- ${u.name} | ${u.role} | active=${u.isActive} | engineer=${u.engineer?.id ?? "-"} | ${u.id}`));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
