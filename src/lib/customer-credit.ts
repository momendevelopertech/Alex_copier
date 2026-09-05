// Customer "money under account" (رصيد تحت الحساب) logic.
//
// The credit balance is encoded inside Customer.remainingDebt: a positive value
// means the customer owes us (مدين), a negative value means they have money
// deposited under their account (دائن) that offsets future invoices/collections.
// This file is the single source of truth for how a sales order's total is
// covered when such a credit exists.

export interface CreditSplit {
  creditUsed: number; // portion of the order total covered by under-account money
  cashUpfront: number; // upfront cash paid on top of the credit (non-CASH orders)
  paidAmount: number; // creditUsed + cashUpfront
  unpaid: number; // remainder left as debt (total - paidAmount)
}

/** Credit available under the customer's account (0 when they owe us, >= 0 when they deposited money). */
export function availableCredit(remainingDebt: number): number {
  return Math.max(0, -remainingDebt);
}

export const CREDIT_USED_PREFIX = "خصم من رصيد تحت الحساب";

export function creditUsedNote(orderId: string): string {
  return `${CREDIT_USED_PREFIX} — ${orderId}`;
}

export function isCreditUsedNote(notes: string | null | undefined): boolean {
  return Boolean(notes && notes.startsWith(CREDIT_USED_PREFIX));
}

/**
 * Split how an order `total` is covered when the customer has money under their
 * account. The credit is always consumed FIRST; only then any upfront cash.
 *
 * - CASH orders: the credit covers part of the total, the rest is paid in cash
 *   (paidAmount = total, unpaid = 0).
 * - CREDIT/INSTALLMENT/MIXED orders: credit covers the first part, an optional
 *   `upfrontPaid` cash amount covers the next part, and anything left becomes
 *   debt (unpaid).
 */
export function computeCreditSplit(
  total: number,
  remainingDebt: number,
  upfrontPaid: number,
  paymentMethod: string,
): CreditSplit {
  const t = Math.max(0, total);
  const credit = availableCredit(remainingDebt);
  const creditUsed = Math.min(credit, t);

  if (paymentMethod === "CASH") {
    return { creditUsed, cashUpfront: t - creditUsed, paidAmount: t, unpaid: 0 };
  }

  const cashUpfront = Math.min(Math.max(0, upfrontPaid), t - creditUsed);
  const paidAmount = creditUsed + cashUpfront;
  return { creditUsed, cashUpfront, paidAmount, unpaid: t - paidAmount };
}