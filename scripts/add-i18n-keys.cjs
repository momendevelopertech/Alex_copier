const fs = require("fs");

function addKeys(path, patch) {
  const j = JSON.parse(fs.readFileSync(path, "utf8"));
  // deep merge
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
  navigation: { notifications: "الإشعارات" },
  notifications: {
    viewAll: "عرض جميع الإشعارات",
    markRead: "تحديد كمقروء",
    markUnread: "تحديد كغير مقروء",
    filterAll: "الكل",
    filterUnread: "غير مقروء",
    filterRead: "مقروء",
    typeFilter: "النوع",
    categoryFilter: "التصنيف",
    statusFilter: "الحالة",
    soundOn: "تشغيل صوت التنبيه",
    soundOff: "كتم صوت التنبيه",
    unreadCount: "غير مقروءة",
    types: {
      SYSTEM: "النظام",
      SERVICE_REQUEST_CREATED: "طلب صيانة جديد",
      SERVICE_REQUEST_ASSIGNED: "تعيين طلب صيانة",
      SERVICE_REQUEST_UPDATED: "تحديث طلب صيانة",
      MACHINE_STATUS_CHANGED: "تغيير حالة جهاز",
      CONTRACT_EXPIRING: "انتهاء عقد",
      LOW_STOCK: "مخزون منخفض",
      PAYMENT_PENDING: "دفعة بانتظار المراجعة",
      PAYMENT_APPROVED: "اعتماد دفعة",
      PAYMENT_REJECTED: "رفض دفعة"
    },
    categories: {
      GENERAL: "عام",
      SYSTEM: "النظام",
      SERVICE_REQUEST: "طلبات الصيانة",
      MACHINE: "الأجهزة",
      INVENTORY: "المخزون",
      PAYMENT: "المدفوعات",
      CONTRACT: "العقود"
    },
    priorities: {
      LOW: "منخفضة",
      NORMAL: "عادية",
      HIGH: "عالية",
      CRITICAL: "حرجة"
    }
  }
});

addKeys("src/i18n/en.json", {
  navigation: { notifications: "Notifications" },
  notifications: {
    viewAll: "View all notifications",
    markRead: "Mark as read",
    markUnread: "Mark as unread",
    filterAll: "All",
    filterUnread: "Unread",
    filterRead: "Read",
    typeFilter: "Type",
    categoryFilter: "Category",
    statusFilter: "Status",
    soundOn: "Enable alert sound",
    soundOff: "Mute alert sound",
    unreadCount: "unread",
    types: {
      SYSTEM: "System",
      SERVICE_REQUEST_CREATED: "New service request",
      SERVICE_REQUEST_ASSIGNED: "Service request assigned",
      SERVICE_REQUEST_UPDATED: "Service request updated",
      MACHINE_STATUS_CHANGED: "Machine status changed",
      CONTRACT_EXPIRING: "Contract expiring",
      LOW_STOCK: "Low stock",
      PAYMENT_PENDING: "Payment pending review",
      PAYMENT_APPROVED: "Payment approved",
      PAYMENT_REJECTED: "Payment rejected"
    },
    categories: {
      GENERAL: "General",
      SYSTEM: "System",
      SERVICE_REQUEST: "Service requests",
      MACHINE: "Machines",
      INVENTORY: "Inventory",
      PAYMENT: "Payments",
      CONTRACT: "Contracts"
    },
    priorities: {
      LOW: "Low",
      NORMAL: "Normal",
      HIGH: "High",
      CRITICAL: "Critical"
    }
  }
});
