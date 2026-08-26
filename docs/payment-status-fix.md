# PaymentStatus Fix — Summary Report

## What Was The Problem?

`paymentStatus` was a write-once field: every sales order was created as `PENDING` and **never updated**. No code in the system ever transitioned it to `PARTIAL`, `PAID`, or `OVERDUE`. All orders appeared as "معلق" forever.

**Root cause:** There was no `paidAmount` field on SalesOrder, so the system had no way to know how much of an order had been paid.

---

## What Was Implemented

### 1. Schema Change: `paidAmount` field
- Added `paidAmount Float @default(0)` to `SalesOrder` model
- Safe migration — existing orders get `0`, backfill sets correct values

### 2. Central Computation Service (`src/lib/payment-status.ts`)
Single function `recalculatePaymentStatus(tx, orderId)` that computes:

| Condition | Status |
|-----------|--------|
| `paidAmount >= effectiveTotal` | `PAID` |
| Any installment OVERDUE and not paid | `OVERDUE` |
| `paidAmount > 0` but less than total | `PARTIAL` |
| Nothing paid yet | `PENDING` |

Where `effectiveTotal = order.total - sum(approved returns)`

### 3. Mutation Points Wired Up

| Operation | File | What Happens |
|-----------|------|-------------|
| **Create order (CASH)** | `api/sales/route.ts` | `paidAmount = total`, `paymentStatus = PAID` |
| **Create order (other)** | `api/sales/route.ts` | `paidAmount = 0`, `paymentStatus = PENDING` |
| **Pay installment** | `api/sales/[id]/installments/route.ts` | **NEW** — marks installments PAID, increments paidAmount, recalculates |
| **Record payment (CREDIT)** | `api/sales/[id]/payments/route.ts` | **NEW** — records payment, increments paidAmount, recalculates |
| **Create return** | `api/returns/route.ts` | Recalculates (return reduces effectiveTotal) |
| **Return status change** | `api/returns/[id]/route.ts` | Recalculates (APPROVED/REJECTED affects effectiveTotal) |
| **Delete return** | `api/returns/[id]/route.ts` | Recalculates (reversal increases effectiveTotal) |

### 4. New API Endpoints

- **`POST /api/sales/[id]/installments`** — Record installment payments
  - Body: `{ installmentIds: string[], paidDate?: string }`
  - Marks installments as PAID, increments order paidAmount

- **`POST /api/sales/[id]/payments`** — Record payment for CREDIT orders
  - Body: `{ amount: number, paymentDate?: string, notes?: string, companyId?: string }`
  - Creates CustomerPayment, updates remainingDebt, increments order paidAmount

### 5. Backfill Results

All 3 existing orders (all CASH) updated to PAID with correct paidAmount.

---

## Files Modified

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Added `paidAmount` field |
| `src/lib/payment-status.ts` | **NEW** — central computation service |
| `src/app/api/sales/route.ts` | Set paidAmount/paymentStatus on CASH creation |
| `src/app/api/sales/[id]/installments/route.ts` | **NEW** — installment payment endpoint |
| `src/app/api/sales/[id]/payments/route.ts` | **NEW** — credit payment endpoint |
| `src/app/api/returns/route.ts` | Recalculate after return creation |
| `src/app/api/returns/[id]/route.ts` | Recalculate after return status change/delete |

---

## Edge Cases Requiring Your Decision

### 1. CREDIT Orders Without Payment Tracking
CREDIT orders currently show `PENDING` because there's no historical payment data linked to specific orders. **New payments** via the new `POST /api/sales/[id]/payments` endpoint will be tracked, but old credit payments won't retroactively update.

**Options:**
- Accept that old CREDIT orders stay `PENDING`
- Manually set `paidAmount` for known-fully-paid credit orders via admin tools

### 2. MIXED Orders — Cash Portion
The sales form doesn't specify how much of a MIXED payment is cash vs installment. Currently MIXED orders start at `paidAmount = 0`. If you want the cash portion tracked, the form needs a "cash amount" field for MIXED orders.

### 3. Returns Reduce effectiveTotal
When a return is approved, the effective total goes down. If an order was `PAID` and then a return is made, it might stay `PAID` (because paidAmount >= new effectiveTotal). This is **correct behavior** — the customer overpaid relative to what they kept.

### 4. No Installment Payment UI
The installment payment endpoint exists (`POST /api/sales/[id]/installments`) but there's **no frontend UI** for it yet. You'll need a page or modal where users can select installments and mark them as paid.
