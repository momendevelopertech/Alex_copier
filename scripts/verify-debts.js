require("dotenv/config");
const XLSX = require("xlsx");
const { PrismaClient } = require("../src/generated/prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function xd(s) {
  if (!s || typeof s === "string") return null;
  const d = new Date((s - 25569) * 86400000);
  return d.toISOString().slice(0, 10);
}

async function main() {
  const wb = XLSX.readFile("customers-payment.xls");
  const ws = wb.Sheets[wb.SheetNames[0]];
  const excelData = XLSX.utils.sheet_to_json(ws);

  const excelMap = {};
  for (const r of excelData) {
    const name = r["اسم العميل"];
    const paid = r["قيمة أخر دفعة"] === "لم يدفع" ? 0 : r["قيمة أخر دفعة"];
    const date = xd(r["تاريخ اخر دفعة"]);
    const remaining = r["رصيد مدين"];
    excelMap[name] = { paid, date, remaining };
  }

  console.log("Excel customers:", Object.keys(excelMap).length);

  // Get all customers with debt
  const customers = await prisma.customer.findMany({
    where: { remainingDebt: { gt: 0 } },
    include: { payments: true },
    orderBy: { remainingDebt: "desc" },
  });

  console.log("DB customers with debt:", customers.length);

  let diffs = 0;
  for (const c of customers) {
    const ex = excelMap[c.name];
    if (!ex) {
      console.log("  IN DB NOT EXCEL:", c.name, "remaining=" + c.remainingDebt);
      diffs++;
      continue;
    }
    const rDiff = c.remainingDebt !== ex.remaining;
    const tDiff = c.totalDebt !== ex.paid + ex.remaining;
    if (rDiff || tDiff) {
      console.log("  DIFF:", c.name, "db: total=" + c.totalDebt + " remaining=" + c.remainingDebt, "excel: total=" + (ex.paid + ex.remaining) + " remaining=" + ex.remaining);
      diffs++;
    }
  }

  // Check excel customers not in DB debt list
  const dbNames = new Set(customers.map(c => c.name));
  for (const [name, ex] of Object.entries(excelMap)) {
    if (ex.remaining > 0 && !dbNames.has(name)) {
      console.log("  IN EXCEL NOT DB:", name, "remaining=" + ex.remaining);
      diffs++;
    }
  }

  console.log("Differences:", diffs);

  // Summary
  const dbRemaining = customers.reduce((s, c) => s + c.remainingDebt, 0);
  const exRemaining = Object.values(excelMap).reduce((s, e) => s + e.remaining, 0);
  console.log("DB total remaining:", dbRemaining);
  console.log("Excel total remaining:", exRemaining);

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
