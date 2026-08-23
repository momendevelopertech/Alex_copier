const fs = require("fs");
const files = ["machines", "sales", "purchases", "expenses", "customers", "suppliers", "companies", "investors", "workshop"];
const pageMap = {
  machines: "machines",
  sales: "sales",
  purchases: "purchases",
  expenses: "finance",
  customers: "customers",
  suppliers: "suppliers",
  companies: "companies",
  investors: "investors",
  workshop: "workshop",
};
for (const f of files) {
  const p = "src/app/api/" + f + "/route.ts";
  let c = fs.readFileSync(p, "utf8");
  c = c.replace(
    'import { requireAuth } from "@/lib/auth-helpers";',
    'import { requireAuth, requirePageAccess } from "@/lib/auth-helpers";'
  );
  const page = pageMap[f];
  const postRe = /(export async function POST\(request: Request\) \{\s*try \{\s*\n)(\s*const body = await request\.json\(\);)/;
  const guard =
    "\n    const actor = await requirePageAccess(\"" + page + "\");\n" +
    "    if (!actor) {\n" +
    "      const authed = await requireAuth();\n" +
    '      return NextResponse.json({ error: authed ? "Forbidden" : "Unauthorized" }, { status: authed ? 403 : 401 });\n' +
    "    }\n";
  if (postRe.test(c)) {
    c = c.replace(postRe, "$1" + guard + "    $2");
    fs.writeFileSync(p, c);
    console.log("guarded POST: " + f);
  } else {
    console.log("NO MATCH POST in " + f);
  }
}
