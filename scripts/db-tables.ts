import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const rows = await prisma.$queryRaw<{ table_name: string }[]>`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`;
  console.log(rows.map((r) => r.table_name).join("\n"));
  const notifCount = await prisma.$queryRaw<{ cnt: bigint }[]>`SELECT count(*) as cnt FROM "User"`;
  console.log("users ok");
}

main()
  .catch((e) => { console.error(String(e).slice(0, 500)); process.exit(1); })
  .finally(() => prisma.$disconnect());
