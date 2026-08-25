export interface InvoiceItem {
  name: string;
  quantity: number;
  unitPrice: number;
  discount: number;
}

export interface InvoiceData {
  type: "sale" | "purchase" | "contract" | "return";
  id: string;
  date: string;
  companyName: string;
  companyAddress?: string;
  companyPhone?: string;
  companyTaxNumber?: string;
  counterpartyName: string;
  counterpartyAddress?: string;
  counterpartyPhone?: string;
  counterpartyTaxNumber?: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  paymentMethod?: string;
  paymentStatus?: string;
  notes?: string;
  extraFields?: { label: string; value: string }[];
}

const TYPE_LABELS: Record<string, string> = {
  sale: "فاتورة بيع",
  purchase: "فاتورة شراء",
  contract: "عقد",
  return: "مرتجع",
};

const PAYMENT_METHOD_AR: Record<string, string> = {
  CASH: "نقدي",
  CREDIT: "آجل",
  INSTALLMENT: "أقساط",
  MIXED: "مختلط",
};

const PAYMENT_STATUS_AR: Record<string, string> = {
  PENDING: "معلق",
  PARTIAL: "جزئي",
  PAID: "مدفوع",
  OVERDUE: "متأخر",
};

export function generateInvoiceHtml(data: InvoiceData): string {
  const typeLabel = TYPE_LABELS[data.type] || data.type;
  const paymentMethod = data.paymentMethod ? PAYMENT_METHOD_AR[data.paymentMethod] || data.paymentMethod : "";
  const paymentStatus = data.paymentStatus ? PAYMENT_STATUS_AR[data.paymentStatus] || data.paymentStatus : "";

  const itemsRows = data.items
    .map(
      (item, i) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center;color:#6b7280;font-size:13px;">${i + 1}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;">${item.name}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:13px;">${item.quantity}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:13px;">${item.unitPrice.toLocaleString("ar-EG")}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:13px;">${item.discount > 0 ? item.discount.toLocaleString("ar-EG") : "-"}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:13px;font-weight:600;">${((item.quantity * item.unitPrice - item.discount)).toLocaleString("ar-EG")}</td>
    </tr>`
    )
    .join("");

  const extraRows = data.extraFields
    ? data.extraFields
        .map(
          (f) => `
      <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f3f4f6;">
        <span style="color:#6b7280;font-size:13px;">${f.label}</span>
        <span style="font-weight:500;font-size:13px;">${f.value}</span>
      </div>`
        )
        .join("")
    : "";

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${typeLabel} — ${data.id.slice(0, 8)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Cairo', sans-serif; background: #f9fafb; color: #111827; padding: 24px; }
  .invoice { max-width: 800px; margin: 0 auto; background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden; }
  .header { background: linear-gradient(135deg, #0284c7, #0369a1); color: #fff; padding: 28px 32px; display: flex; justify-content: space-between; align-items: flex-start; }
  .header-right h1 { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
  .header-right p { font-size: 13px; opacity: 0.85; }
  .header-left { text-align: left; }
  .header-left .badge { background: rgba(255,255,255,0.2); padding: 4px 14px; border-radius: 20px; font-size: 13px; font-weight: 600; }
  .header-left .inv-number { font-size: 18px; font-weight: 700; margin-top: 6px; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; padding: 24px 32px; border-bottom: 1px solid #e5e7eb; }
  .meta-box h3 { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
  .meta-box p { font-size: 13px; line-height: 1.7; }
  .meta-box .name { font-weight: 600; font-size: 14px; }
  table { width: 100%; border-collapse: collapse; }
  thead th { background: #f8fafc; padding: 10px 12px; text-align: center; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #e5e7eb; }
  thead th:nth-child(2) { text-align: right; }
  .totals { padding: 20px 32px; display: flex; justify-content: flex-end; }
  .totals-box { width: 280px; }
  .totals-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }
  .totals-row.total { border-top: 2px solid #0284c7; margin-top: 8px; padding-top: 10px; font-size: 16px; font-weight: 700; color: #0284c7; }
  .footer { padding: 20px 32px; background: #f8fafc; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; }
  .footer-notes { font-size: 12px; color: #6b7280; max-width: 60%; }
  .footer-date { font-size: 12px; color: #9ca3af; }
  .print-btn { position: fixed; bottom: 24px; left: 24px; background: #0284c7; color: #fff; border: none; padding: 12px 24px; border-radius: 8px; font-family: 'Cairo', sans-serif; font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 12px rgba(2,132,199,0.3); z-index: 100; }
  .print-btn:hover { background: #0369a1; }
  @media print { .print-btn { display: none; } body { padding: 0; background: #fff; } .invoice { box-shadow: none; border-radius: 0; } }
</style>
</head>
<body>
  <div class="invoice">
    <div class="header">
      <div class="header-right">
        <h1>${data.companyName}</h1>
        ${data.companyAddress ? `<p>${data.companyAddress}</p>` : ""}
        ${data.companyPhone ? `<p>${data.companyPhone}</p>` : ""}
        ${data.companyTaxNumber ? `<p>الرقم الضريبي: ${data.companyTaxNumber}</p>` : ""}
      </div>
      <div class="header-left">
        <div class="badge">${typeLabel}</div>
        <div class="inv-number">#${data.id.slice(0, 8)}</div>
      </div>
    </div>

    <div class="meta">
      <div class="meta-box">
        <h3>${data.type === "purchase" ? "المورد" : data.type === "contract" ? "الطرف" : "العميل"}</h3>
        <p class="name">${data.counterpartyName}</p>
        ${data.counterpartyAddress ? `<p>${data.counterpartyAddress}</p>` : ""}
        ${data.counterpartyPhone ? `<p>${data.counterpartyPhone}</p>` : ""}
        ${data.counterpartyTaxNumber ? `<p>رقم ضريبي: ${data.counterpartyTaxNumber}</p>` : ""}
      </div>
      <div class="meta-box">
        <h3>التفاصيل</h3>
        <p>التاريخ: ${new Date(data.date).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })}</p>
        ${paymentMethod ? `<p>طريقة الدفع: ${paymentMethod}</p>` : ""}
        ${paymentStatus ? `<p>حالة الدفع: ${paymentStatus}</p>` : ""}
        ${extraRows}
      </div>
    </div>

    <div style="padding: 0 32px;">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>المنتج</th>
            <th>الكمية</th>
            <th>سعر الوحدة</th>
            <th>الخصم</th>
            <th>الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>
    </div>

    <div class="totals">
      <div class="totals-box">
        <div class="totals-row">
          <span>المجموع الفرعي</span>
          <span>${data.subtotal.toLocaleString("ar-EG")} ج.م</span>
        </div>
        ${data.discount > 0 ? `
        <div class="totals-row">
          <span>الخصم</span>
          <span style="color:#dc2626;">-${data.discount.toLocaleString("ar-EG")} ج.م</span>
        </div>` : ""}
        ${data.taxRate > 0 ? `
        <div class="totals-row">
          <span>الضريبة (${data.taxRate}%)</span>
          <span>${data.taxAmount.toLocaleString("ar-EG")} ج.م</span>
        </div>` : ""}
        <div class="totals-row total">
          <span>الإجمالي</span>
          <span>${data.total.toLocaleString("ar-EG")} ج.م</span>
        </div>
      </div>
    </div>

    ${data.notes ? `
    <div style="padding: 0 32px 20px;">
      <div style="background:#f8fafc;border-radius:8px;padding:14px 18px;">
        <span style="font-size:12px;color:#6b7280;font-weight:600;">ملاحظات:</span>
        <p style="font-size:13px;margin-top:4px;color:#374151;">${data.notes}</p>
      </div>
    </div>` : ""}

    <div class="footer">
      <div class="footer-notes">
        ${data.type === "sale" ? "شكراً لتعاملكم معنا" : data.type === "purchase" ? "" : ""}
      </div>
      <div class="footer-date">تاريخ الطباعة: ${new Date().toLocaleDateString("ar-EG")}</div>
    </div>
  </div>

  <button class="print-btn" onclick="window.print()">🖨️ طباعة الفاتورة</button>
</body>
</html>`;
}
