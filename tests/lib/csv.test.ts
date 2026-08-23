import { describe, it, expect } from "vitest";
import {
  serializeCsv,
  parseCsv,
  stripBom,
  addBom,
  buildTemplateCsv,
} from "@/lib/csv";

describe("csv utils", () => {
  it("round-trips Arabic text with commas, quotes and newlines", () => {
    const rows = [
      ["الاسم", "العنوان", "ملاحظات"],
      ["محمد أحمد", "شارع الجمهورية، محطة الرمل", 'قال "مرحبا" ثم غادر'],
      ["شركة النيل", "سموحة\nالإسكندرية", "عميل مهم، يدفع آجل"],
    ];
    const csv = serializeCsv(rows);
    const parsed = parseCsv(csv);
    expect(parsed).toEqual(rows);
  });

  it("preserves Arabic characters exactly through parse/serialize cycle", () => {
    const row = ["عبد الرحمن المصري", "٠١٢٣٤٥٦٧٨٩", "م-١٥/٢٠٢٥"];
    expect(parseCsv(serializeCsv([row]))[0]).toEqual(row);
  });

  it("escapes embedded double quotes by doubling", () => {
    const csv = serializeCsv([["قل: \"أهلاً\""]]);
    expect(csv).toBe('"قل: ""أهلاً"""');
    expect(parseCsv(csv)[0][0]).toBe('قل: "أهلاً"');
  });

  it("parses quoted fields containing CRLF line endings", () => {
    const parsed = parseCsv("a,b\r\n\"س1، س2\",\"س3\r\nس4\",c");
    expect(parsed).toEqual([
      ["a", "b"],
      ["س1، س2", "س3\r\nس4", "c"],
    ]);
  });

  it("strips UTF-8 BOM before parsing so headers are clean", () => {
    const parsed = parseCsv("\uFEFFname,phone\nمحمد,0100");
    expect(parsed[0]).toEqual(["name", "phone"]);
  });

  it("addBom prepends BOM and removes any existing one first", () => {
    expect(addBom("a,b").charCodeAt(0)).toBe(0xfeff);
    expect(addBom("\uFEFFa,b").slice(1)).toBe("a,b");
  });

  it("stripBom removes only a leading BOM", () => {
    expect(stripBom("\uFEFFبيانات")).toBe("بيانات");
    expect(stripBom("بيانات")).toBe("بيانات");
  });

  it("skips fully empty rows while keeping empty fields in real rows", () => {
    const parsed = parseCsv("a,,c\n\n   \nd,e,f");
    expect(parsed.length).toBe(2);
    expect(parsed[0]).toEqual(["a", "", "c"]);
    expect(parsed[1]).toEqual(["d", "e", "f"]);
  });

  it("builds a template with header row plus sample rows", () => {
    const template = buildTemplateCsv(["serialNumber", "الماركة"], [["SN-1", "Canon"]]);
    const parsed = parseCsv(template);
    expect(parsed[0]).toEqual(["serialNumber", "الماركة"]);
    expect(parsed[1]).toEqual(["SN-1", "Canon"]);
  });

  it("template survives an Excel-style round trip (BOM + parse)", () => {
    const template = addBom(buildTemplateCsv(["name", "city"], [["عميل الإسكندرية، أ", "الإسكندرية"]]));
    const parsed = parseCsv(template);
    expect(parsed[1][0]).toBe("عميل الإسكندرية، أ");
  });
});
