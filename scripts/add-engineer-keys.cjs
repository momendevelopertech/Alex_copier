const fs = require("fs");

function addKeys(path, patch) {
  const j = JSON.parse(fs.readFileSync(path, "utf8"));
  const merge = (target, src) => {
    for (const [k, v] of Object.entries(src)) {
      if (v && typeof v === "object" && !Array.isArray(v)) {
        target[k] = target[k] || {};
        merge(target[k], v);
      } else {
        target[k] = v;
      }
    }
  };
  merge(j, patch);
  fs.writeFileSync(path, JSON.stringify(j, null, 2) + "\n", "utf8");
  console.log("updated " + path);
}

addKeys("src/i18n/ar.json", {
  engineers: {
    linkedAccount: "حساب الدخول المرتبط",
    workload: "طلبات مفتوحة",
    selectAccountOptional: "ربط بحساب مستخدم (اختياري)",
    noLinkedAccount: "لا يوجد حساب مرتبط",
    accountLinked: "تم تحديث ربط الحساب",
    deleteConfirm: "هل أنت متأكد من الحذف؟"
  }
});

addKeys("src/i18n/en.json", {
  engineers: {
    linkedAccount: "Linked login account",
    workload: "Open requests",
    selectAccountOptional: "Link user account (optional)",
    noLinkedAccount: "No linked account",
    accountLinked: "Account link updated",
    deleteConfirm: "Are you sure you want to delete?"
  }
});
