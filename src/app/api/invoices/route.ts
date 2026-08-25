import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { generateInvoiceHtml, type InvoiceData } from "@/lib/invoice-template";

export async function GET(request: Request) {
  try {
    const user = await requireAuth();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const id = searchParams.get("id");

    if (!type || !id) {
      return NextResponse.json({ error: "type and id are required" }, { status: 400 });
    }

    let invoiceData: InvoiceData | null = null;

    if (type === "sale") {
      const order = await prisma.salesOrder.findUnique({
        where: { id },
        include: {
          company: true,
          customer: true,
          engineer: true,
          items: { include: { product: true } },
        },
      });
      if (!order) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }

      const items = order.items.map((item) => ({
        name: item.product?.name || "منتج",
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
      }));

      const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
      const taxAmount = order.taxRate > 0 ? ((subtotal - order.discount) * order.taxRate) / 100 : 0;

      invoiceData = {
        type: "sale",
        id: order.id,
        date: order.orderDate?.toISOString() || order.createdAt.toISOString(),
        companyName: order.company?.name || "الشركة",
        companyAddress: order.company?.address || undefined,
        companyPhone: order.company?.phone || undefined,
        companyTaxNumber: order.company?.taxNumber || undefined,
        counterpartyName: order.customer?.name || "عميل",
        counterpartyAddress: order.customer?.address || undefined,
        counterpartyPhone: order.customer?.phone || undefined,
        counterpartyTaxNumber: order.customer?.taxNumber || undefined,
        items,
        subtotal,
        discount: order.discount,
        taxRate: order.taxRate,
        taxAmount,
        total: order.total,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        notes: order.notes || undefined,
        extraFields: order.engineer ? [{ label: "المهندس", value: order.engineer.name }] : undefined,
      };
    } else if (type === "purchase") {
      const order = await prisma.purchaseOrder.findUnique({
        where: { id },
        include: {
          company: true,
          supplier: true,
          items: { include: { product: true } },
        },
      });
      if (!order) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }

      const items = order.items.map((item) => ({
        name: item.product?.name || "منتج",
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: 0,
      }));

      const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

      invoiceData = {
        type: "purchase",
        id: order.id,
        date: order.orderDate?.toISOString() || order.createdAt.toISOString(),
        companyName: order.company?.name || "الشركة",
        companyAddress: order.company?.address || undefined,
        companyPhone: order.company?.phone || undefined,
        companyTaxNumber: order.company?.taxNumber || undefined,
        counterpartyName: order.supplier?.name || "مورد",
        counterpartyAddress: order.supplier?.address || undefined,
        counterpartyPhone: order.supplier?.phone || undefined,
        items,
        subtotal,
        discount: 0,
        taxRate: 0,
        taxAmount: 0,
        total: order.total,
        notes: order.notes || undefined,
      };
    } else if (type === "contract") {
      const contract = await prisma.contract.findUnique({
        where: { id },
        include: {
          customer: true,
          machines: { include: { machine: true } },
          _count: { select: { visits: true } },
        },
      });
      if (!contract) {
        return NextResponse.json({ error: "Contract not found" }, { status: 404 });
      }

      const machineNames = contract.machines
        .map((m) => m.machine?.serialNumber || "")
        .filter(Boolean)
        .join(", ");

      const CYCLE_LABELS: Record<string, string> = {
        MONTHLY: "شهري",
        HALF_YEARLY: "نصف سنوي",
        QUARTERLY: "ربع سنوي",
        YEARLY: "سنوي",
      };
      const TYPE_LABELS: Record<string, string> = {
        MAINTENANCE_ONLY: "صيانة فقط",
        MAINTENANCE_AND_PARTS: "صيانة وقطع غيار",
        MAINTENANCE_AND_PRINTING: "صيانة وطباعة",
        RENTAL: "إيجار",
      };

      invoiceData = {
        type: "contract",
        id: contract.id,
        date: contract.startDate.toISOString(),
        companyName: "اليكس كوبير",
        counterpartyName: contract.customer?.name || "عميل",
        counterpartyAddress: contract.customer?.address || undefined,
        counterpartyPhone: contract.customer?.phone || undefined,
        counterpartyTaxNumber: contract.customer?.taxNumber || undefined,
        items: [{ name: `عقد ${TYPE_LABELS[contract.contractType] || contract.contractType}`, quantity: 1, unitPrice: contract.value, discount: 0 }],
        subtotal: contract.value,
        discount: 0,
        taxRate: 0,
        taxAmount: 0,
        total: contract.value,
        extraFields: [
          { label: "رقم العقد", value: contract.contractNumber },
          { label: "الفترة", value: CYCLE_LABELS[contract.billingCycle] || contract.billingCycle },
          { label: "تاريخ البداية", value: new Date(contract.startDate).toLocaleDateString("ar-EG") },
          { label: "تاريخ النهاية", value: new Date(contract.endDate).toLocaleDateString("ar-EG") },
          { label: "المبلغ المدفوع", value: `${contract.amountPaid.toLocaleString("ar-EG")} ج.م` },
          ...(machineNames ? [{ label: "الأجهزة", value: machineNames }] : []),
        ],
        notes: contract.notes || undefined,
      };
    } else if (type === "return") {
      const ret = await prisma.returnTransaction.findUnique({
        where: { id },
        include: {
          company: true,
          customer: true,
          supplier: true,
          product: true,
          warehouse: true,
          salesOrder: true,
          salesOrderItem: true,
        },
      });
      if (!ret) {
        return NextResponse.json({ error: "Return not found" }, { status: 404 });
      }

      const items = ret.product
        ? [{ name: ret.product.name, quantity: ret.quantity, unitPrice: ret.unitPrice, discount: 0 }]
        : [];

      invoiceData = {
        type: "return",
        id: ret.id,
        date: ret.createdAt.toISOString(),
        companyName: ret.company?.name || "الشركة",
        companyAddress: ret.company?.address || undefined,
        companyPhone: ret.company?.phone || undefined,
        companyTaxNumber: ret.company?.taxNumber || undefined,
        counterpartyName: ret.customer?.name || ret.supplier?.name || "—",
        counterpartyAddress: ret.customer?.address || undefined,
        counterpartyPhone: ret.customer?.phone || undefined,
        counterpartyTaxNumber: ret.customer?.taxNumber || undefined,
        items,
        subtotal: ret.total,
        discount: 0,
        taxRate: 0,
        taxAmount: 0,
        total: ret.total,
        notes: ret.reason || undefined,
        extraFields: [
          { label: "النوع", value: ret.type === "SALE_RETURN" ? "مرتجع مبيعات" : "مرتجع مشتريات" },
          { label: "المستودع", value: ret.warehouse?.name || "—" },
          { label: "الحالة", value: ret.status },
          ...(ret.salesOrder ? [{ label: "فاتورة البيع", value: ret.salesOrder.id.slice(0, 8) }] : []),
        ],
      };
    }

    if (!invoiceData) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    const html = generateInvoiceHtml(invoiceData);

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Failed to generate invoice:", error);
    return NextResponse.json({ error: "Failed to generate invoice" }, { status: 500 });
  }
}
