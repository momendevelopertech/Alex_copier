import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, name: true, role: true, isActive: true, engineer: { select: { id: true } } } });
  console.log("USERS:");
  users.forEach((u) => console.log(`- ${u.name} | ${u.role} | active=${u.isActive} | eng=${u.engineer?.id ?? "-"} | ${u.id}`));

  const engineers = await prisma.engineer.findMany({ select: { id: true, name: true, userId: true }, orderBy: { name: "asc" } });
  console.log("\nENGINEERS:");
  engineers.forEach((e) => console.log(`- ${e.name} | userId=${e.userId ?? "-"} | ${e.id}`));

  const sr = await prisma.serviceRequest.findMany({ select: { id: true, requestNumber: true, status: true, priority: true, engineerId: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 15 });
  console.log("\nSERVICE REQUESTS:");
  sr.forEach((r) => console.log(`- ${r.requestNumber} ${r.status}/${r.priority} eng=${r.engineerId ?? "-"}`));

  const settlements = await prisma.settlement.findMany({ select: { settlementNumber: true, status: true }, take: 5 });
  console.log("\nSETTLEMENTS sample:", JSON.stringify(settlements));
}

main()
  .catch((e) => { console.error(String(e).slice(0, 300)); process.exit(1); })
  .finally(() => prisma.$disconnect());
