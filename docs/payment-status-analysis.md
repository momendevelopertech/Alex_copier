# SalesOrder `paymentStatus` — Full Analysis

## What is it?

An enum field on every `SalesOrder` with 4 possible values:

| Value | Arabic Label | Badge Color |
|-------|-------------|-------------|
| `PENDING` | معلق | Yellow |
| `PARTIAL` | جزئي | Orange |
| `PAID` | مدفوع | Green |
| `OVERDUE` | متأخر | Red |

Default in schema: `PENDING`

---

## Where is it set (WRITE)?

### On creation (`POST /api/sales`)
- **Never explicitly set** — always gets the schema default `PENDING`
- No code in the create handler includes `paymentStatus` in the Prisma `create()` call

### On update (`PUT /api/sales/:id`)
- The endpoint is a **pass-through** — it blindly accepts whatever JSON body is sent
- Technically accepts `{ "paymentStatus": "PAID" }` and would update it
- **But NO frontend code ever calls this with a paymentStatus value**

### Installments
- Installments have their own `InstallmentStatus` enum (`PENDING`/`PAID`/`OVERDUE`)
- **No code syncs installment statuses to the parent order's paymentStatus**
- No installment API endpoints exist (`src/app/api/installments/` does not exist)

### Returns/Refunds
- Return logic updates inventory and customer ledger
- **Never touches `paymentStatus`**

### Settlements
- Completely separate system
- **Never touches `paymentStatus`**

---

## Where is it read (DISPLAY)?

### Sales page table (`src/app/(dashboard)/sales/page.tsx`)
- Displayed as a colored badge in every row
- Filterable via a `<FilterSelect>` dropdown
- Included in CSV/Excel export

### Order detail modal
- Shows the colored badge alongside other order info

### Invoice/Receipt generation
- Rendered as Arabic text on printed invoices and receipts

---

## The Problem

**`paymentStatus` is a write-once, never-updated field.**

1. Every order is created as `PENDING`
2. No code ever transitions it to `PARTIAL`, `PAID`, or `OVERDUE`
3. No UI exists to manually change it
4. Installment payments don't update it
5. Returns don't update it
6. In practice, **every order stays `PENDING` forever**

The `PARTIAL`, `PAID`, and `OVERDUE` values exist in the schema, seed data, and display logic — but no runtime code ever uses them.

---

## Recommendation

**Option A — Remove it** (safest, cleanest):
- Delete the `paymentStatus` field from the schema
- Remove the filter, badge, and export column from the sales page
- Remove from invoice/receipt templates
- Remove the enum from Prisma schema
- Run `npx prisma migrate dev`

**Option B — Make it work** (more work):
- Add a computed field or trigger that calculates paymentStatus from:
  - `paymentMethod` (CASH → PAID immediately)
  - Installment statuses (all PAID → PAID, some PAID → PARTIAL, any OVERDUE → OVERDUE)
  - Return amounts (partial refund → PARTIAL)
- Add an API endpoint to recalculate on demand
- Or add a Prisma middleware/hook

**Option C — Keep as manual toggle** (middle ground):
- Add a dropdown in the sales page form or detail view
- Let users manually set the status
- Still no automation, but at least editable

---

## Files Involved

| File | Role |
|------|------|
| `prisma/schema.prisma` | Enum + field definition |
| `src/app/(dashboard)/sales/page.tsx` | Display, filter, export |
| `src/app/api/sales/route.ts` | Create (always PENDING) |
| `src/app/api/sales/[id]/route.ts` | Pass-through PUT (could update) |
| `src/app/api/invoices/route.ts` | Reads for invoice |
| `src/lib/invoice-template.ts` | Renders on invoice/receipt |
| `prisma/seed.ts` | Seed data with hardcoded values |
