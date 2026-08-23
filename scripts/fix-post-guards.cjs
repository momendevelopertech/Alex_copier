const fs = require("fs");
const fixes = [
  { f: "sales", page: "sales", old: '    const user = await requireAuth();\n    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });\n    const body = await request.json();' },
  { f: "customers", page: "customers", old: '    const user = await requireAuth();\n    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });\n    const body = await request.json();' },
  { f: "suppliers", page: "suppliers", old: '    const user = await requireAuth();\n    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });\n    const body = await request.json();' },
];
for (const { f, page, old } of fixes) {
  const p = "src/app/api/" + f + "/route.ts";
  let c = fs.readFileSync(p, "utf8");
  // only replace within POST function: find last occurrence before "export async function POST"
  const postIdx = c.indexOf("export async function POST");
  const before = c.slice(0, postIdx);
  let after = c.slice(postIdx);
  const guard =
    "    const actor = await requirePageAccess(\"" + page + "\");\n" +
    "    if (!actor) {\n" +
    "      const authed = await requireAuth();\n" +
    '      return NextResponse.json({ error: authed ? "Forbidden" : "Unauthorized" }, { status: authed ? 403 : 401 });\n' +
    "    }\n";
  after = after.replace(old, guard + "    const body = await request.json();");
  c = before + after;
  fs.writeFileSync(p, c);
  console.log("fixed " + f);
}
