"use client";

import { useEffect, useState, useMemo } from "react";
import { useI18n } from "@/i18n/context";
import { useToast } from "@/components/UIProvider";
import PrinterLoader from "@/components/PrinterLoader";
import { ArrowLeft, Printer } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

interface ReportData {
  company: {
    id: string;
    name: string;
    nameAr: string | null;
  };
  summary: {
    totalSales: number;
    totalPurchases: number;
    totalExpenses: number;
    netProfit: number;
  };
  sales: Array<{
    id: string;
    orderNumber: string;
    date: string;
    customer: string;
    paymentMethod: string;
    total: number;
    paymentStatus: string;
  }>;
  purchases: Array<{
    id: string;
    orderNumber: string;
    date: string;
    supplier: string;
    total: number;
    status: string;
  }>;
  expenses: Array<{
    id: string;
    date: string;
    category: string;
    description: string;
    amount: number;
  }>;
  settlements: Array<{
    id: string;
    number: string;
    date: string;
    amount: number;
    collectedBy: string;
    status: string;
  }>;
  returns: Array<{
    id: string;
    date: string;
    customer: string;
    total: number;
    reason: string;
  }>;
}

const moneyFormatter = new Intl.NumberFormat("ar-EG", {
  style: "currency",
  currency: "EGP",
  maximumFractionDigits: 0,
});

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("ar-EG");

const STATUS_BADGE: Record<string, string> = {
  INITIAL: "bg-yellow-100 text-yellow-700",
  VERIFIED: "bg-green-100 text-green-700",
  PAID: "bg-green-100 text-green-700",
  PENDING: "bg-yellow-100 text-yellow-700",
  OVERDUE: "bg-red-100 text-red-700",
  DRAFT: "bg-gray-100 text-gray-600",
  CONFIRMED: "bg-blue-100 text-blue-700",
  RECEIVED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-600",
  PARTIAL: "bg-yellow-100 text-yellow-700",
  CREDIT: "bg-purple-100 text-purple-700",
  INSTALLMENT: "bg-blue-100 text-blue-700",
  CASH: "bg-emerald-100 text-emerald-700",
  MIXED: "bg-orange-100 text-orange-700",
};

const statusBadge = (status: string) => {
  const cls = STATUS_BADGE[status] ?? "bg-gray-100 text-gray-600";
  const labels: Record<string, string> = {
    INITIAL: "أولي",
    VERIFIED: "تم التحقق",
    PAID: "مدفوع",
    PENDING: "معلق",
    OVERDUE: "متأخر",
    DRAFT: "مسودة",
    CONFIRMED: "مؤكد",
    RECEIVED: "تم الاستلام",
    CANCELLED: "ملغي",
    PARTIAL: "جزئي",
    CREDIT: "آجل",
    INSTALLMENT: "أقساط",
    CASH: "نقدي",
    MIXED: "مختلط",
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {labels[status] ?? status}
    </span>
  );
};

const paymentMethodLabel = (method: string) => {
  const map: Record<string, string> = {
    CASH: "نقدي",
    CREDIT: "آجل",
    INSTALLMENT: "أقساط",
    MIXED: "مختلط",
  };
  return map[method] ?? method;
};

const paymentStatusLabel = (status: string) => {
  const map: Record<string, string> = {
    PENDING: "معلق",
    PAID: "مدفوع",
    PARTIAL: "جزئي",
    OVERDUE: "متأخر",
  };
  return map[status] ?? status;
};

const SubtotalRow = ({ label, value, colSpan, color }: { label: string; value: number; colSpan: number; color?: string }) => (
  <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold">
    <td colSpan={colSpan} className="px-4 py-3 text-sm text-right">
      {label}
    </td>
    <td className={`px-4 py-3 text-sm text-left ${color ?? ""}`}>
      {moneyFormatter.format(value)}
    </td>
  </tr>
);

export default function CompanyReportPage() {
  const { dir } = useI18n();
  const { success: toastSuccess, error: toastError } = useToast();
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const toISODate = (d: Date) => d.toISOString().slice(0, 10);

  const [from, setFrom] = useState(toISODate(firstOfMonth));
  const [to, setTo] = useState(toISODate(today));
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = () => {
    setLoading(true);
    const qs = new URLSearchParams({ from, to });
    fetch(`/api/companies/${id}/report?${qs}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed");
        return r.json();
      })
      .then((data) => setReport(data))
      .catch(() => {
        toastError("حدث خطأ أثناء تحميل التقرير");
        setReport(null);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const salesTotal = useMemo(
    () => report?.sales.reduce((s, r) => s + r.total, 0) ?? 0,
    [report],
  );
  const purchasesTotal = useMemo(
    () => report?.purchases.reduce((s, r) => s + r.total, 0) ?? 0,
    [report],
  );
  const expensesTotal = useMemo(
    () => report?.expenses.reduce((s, r) => s + r.amount, 0) ?? 0,
    [report],
  );
  const settlementsTotal = useMemo(
    () => report?.settlements.reduce((s, r) => s + r.amount, 0) ?? 0,
    [report],
  );
  const returnsTotal = useMemo(
    () => report?.returns.reduce((s, r) => s + r.total, 0) ?? 0,
    [report],
  );

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { font-size: 12pt; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; }
          .print-full { width: 100% !important; }
        }
      `}</style>

      <div dir={dir} className="space-y-6">
        <div className="no-print flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/companies")}
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 p-2 text-gray-600 transition hover:bg-gray-50"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <p className="text-xs font-medium tracking-[0.2em] text-sky-600 uppercase">ERP</p>
              <h1 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">
                {report?.company?.nameAr || report?.company?.name || "التقرير المالي"}
              </h1>
              <p className="text-sm text-gray-500">التقرير المالي — {from} إلى {to}</p>
            </div>
          </div>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
          >
            <Printer size={16} />
            طباعة
          </button>
        </div>

        <div className="no-print flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">من تاريخ</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">إلى تاريخ</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={fetchReport}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? "جاري التحميل..." : "عرض التقرير"}
          </button>
        </div>

        {loading ? (
          <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
            <PrinterLoader size="md" label="جاري تحميل التقرير..." />
          </div>
        ) : report ? (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm border-r-4 border-green-500">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 text-green-600">💰</div>
                  <p className="text-sm text-gray-500">اجمالي المبيعات</p>
                </div>
                <p className="mt-2 text-2xl font-bold text-green-600">{moneyFormatter.format(salesTotal)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm border-r-4 border-blue-500">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">📦</div>
                  <p className="text-sm text-gray-500">اجمالي المشتريات</p>
                </div>
                <p className="mt-2 text-2xl font-bold text-blue-600">{moneyFormatter.format(purchasesTotal)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm border-r-4 border-orange-500">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600">📋</div>
                  <p className="text-sm text-gray-500">المصروفات</p>
                </div>
                <p className="mt-2 text-2xl font-bold text-orange-600">{moneyFormatter.format(expensesTotal)}</p>
              </div>
              <div className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm border-r-4 ${report.summary.netProfit >= 0 ? "border-green-500" : "border-red-500"}`}>
                <div className="flex items-center gap-2">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${report.summary.netProfit >= 0 ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>
                    {report.summary.netProfit >= 0 ? "📈" : "📉"}
                  </div>
                  <p className="text-sm text-gray-500">صافي الربح / الخسارة</p>
                </div>
                <p className={`mt-2 text-2xl font-bold ${report.summary.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {moneyFormatter.format(report.summary.netProfit)}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-200 px-5 py-3">
                <h2 className="text-lg font-bold text-slate-900">المبيعات</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">التاريخ</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">رقم الطلب</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">العميل</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">طريقة الدفع</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">الاجمالي</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">حالة الدفع</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.sales.map((row) => (
                      <tr key={row.id} className="border-t border-gray-100 hover:bg-slate-50/50">
                        <td className="px-4 py-3 text-sm">{formatDate(row.date)}</td>
                        <td className="px-4 py-3 text-sm font-medium">{row.orderNumber}</td>
                        <td className="px-4 py-3 text-sm">{row.customer}</td>
                        <td className="px-4 py-3 text-sm">{statusBadge(row.paymentMethod)}</td>
                        <td className="px-4 py-3 text-sm font-bold text-green-700">{moneyFormatter.format(row.total)}</td>
                        <td className="px-4 py-3 text-sm">{statusBadge(row.paymentStatus)}</td>
                      </tr>
                    ))}
                    {report.sales.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-400">لا توجد بيانات</td>
                      </tr>
                    )}
                  </tbody>
                  {report.sales.length > 0 && (
                    <tfoot>
                      <SubtotalRow label="اجمالي المبيعات" value={salesTotal} colSpan={4} color="text-green-700" />
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-200 px-5 py-3">
                <h2 className="text-lg font-bold text-slate-900">المشتريات</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">التاريخ</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">رقم الطلب</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">المورد</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">الاجمالي</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.purchases.map((row) => (
                      <tr key={row.id} className="border-t border-gray-100 hover:bg-slate-50/50">
                        <td className="px-4 py-3 text-sm">{formatDate(row.date)}</td>
                        <td className="px-4 py-3 text-sm font-medium">{row.orderNumber}</td>
                        <td className="px-4 py-3 text-sm">{row.supplier}</td>
                        <td className="px-4 py-3 text-sm font-bold text-blue-700">{moneyFormatter.format(row.total)}</td>
                        <td className="px-4 py-3 text-sm">{statusBadge(row.status)}</td>
                      </tr>
                    ))}
                    {report.purchases.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-400">لا توجد بيانات</td>
                      </tr>
                    )}
                  </tbody>
                  {report.purchases.length > 0 && (
                    <tfoot>
                      <SubtotalRow label="اجمالي المشتريات" value={purchasesTotal} colSpan={3} color="text-blue-700" />
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-200 px-5 py-3">
                <h2 className="text-lg font-bold text-slate-900">المصروفات</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[500px]">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">التاريخ</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">الفئة</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">الوصف</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">المبلغ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.expenses.map((row) => (
                      <tr key={row.id} className="border-t border-gray-100 hover:bg-slate-50/50">
                        <td className="px-4 py-3 text-sm">{formatDate(row.date)}</td>
                        <td className="px-4 py-3 text-sm font-medium">{row.category}</td>
                        <td className="px-4 py-3 text-sm">{row.description}</td>
                        <td className="px-4 py-3 text-sm font-bold text-orange-700">{moneyFormatter.format(row.amount)}</td>
                      </tr>
                    ))}
                    {report.expenses.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-gray-400">لا توجد بيانات</td>
                      </tr>
                    )}
                  </tbody>
                  {report.expenses.length > 0 && (
                    <tfoot>
                      <SubtotalRow label="اجمالي المصروفات" value={expensesTotal} colSpan={3} color="text-orange-700" />
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-200 px-5 py-3">
                <h2 className="text-lg font-bold text-slate-900">التسويات</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[550px]">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">التاريخ</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">رقم التسوية</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">المبلغ</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">محصلها</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.settlements.map((row) => (
                      <tr key={row.id} className="border-t border-gray-100 hover:bg-slate-50/50">
                        <td className="px-4 py-3 text-sm">{formatDate(row.date)}</td>
                        <td className="px-4 py-3 text-sm font-medium">{row.number}</td>
                        <td className="px-4 py-3 text-sm font-bold text-purple-700">{moneyFormatter.format(row.amount)}</td>
                        <td className="px-4 py-3 text-sm">{row.collectedBy}</td>
                        <td className="px-4 py-3 text-sm">{statusBadge(row.status)}</td>
                      </tr>
                    ))}
                    {report.settlements.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-400">لا توجد بيانات</td>
                      </tr>
                    )}
                  </tbody>
                  {report.settlements.length > 0 && (
                    <tfoot>
                      <SubtotalRow label="اجمالي التسويات" value={settlementsTotal} colSpan={3} color="text-purple-700" />
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-200 px-5 py-3">
                <h2 className="text-lg font-bold text-slate-900">المرتجعات</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[550px]">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">التاريخ</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">العميل</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">الاجمالي</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">السبب</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.returns.map((row) => (
                      <tr key={row.id} className="border-t border-gray-100 hover:bg-slate-50/50">
                        <td className="px-4 py-3 text-sm">{formatDate(row.date)}</td>
                        <td className="px-4 py-3 text-sm">{row.customer}</td>
                        <td className="px-4 py-3 text-sm font-bold text-red-700">{moneyFormatter.format(row.total)}</td>
                        <td className="px-4 py-3 text-sm">{row.reason}</td>
                      </tr>
                    ))}
                    {report.returns.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-gray-400">لا توجد بيانات</td>
                      </tr>
                    )}
                  </tbody>
                  {report.returns.length > 0 && (
                    <tfoot>
                      <SubtotalRow label="اجمالي المرتجعات" value={returnsTotal} colSpan={2} color="text-red-700" />
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
            <p className="text-gray-400">لا توجد بيانات</p>
          </div>
        )}
      </div>
    </>
  );
}
