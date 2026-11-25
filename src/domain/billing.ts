import type { Bill, BillLineItem, BillTotals, BillStatus } from "./types.js";
import { DomainError } from "./types.js";

export function lineItemTotalCents(item: BillLineItem): number {
  if (item.quantity <= 0) {
    throw new DomainError("Line item quantity must be positive", "INVALID_LINE_ITEM");
  }
  if (item.unitPriceCents < 0) {
    throw new DomainError("Unit price cannot be negative", "INVALID_LINE_ITEM");
  }
  return item.quantity * item.unitPriceCents;
}

export function calculateBillTotals(bill: Pick<Bill, "lineItems" | "amountPaidCents">): BillTotals {
  const subtotalCents = bill.lineItems.reduce(
    (sum, item) => sum + lineItemTotalCents(item),
    0,
  );
  const amountPaidCents = bill.amountPaidCents;
  if (amountPaidCents < 0) {
    throw new DomainError("Amount paid cannot be negative", "INVALID_PAYMENT");
  }
  return {
    subtotalCents,
    amountPaidCents,
    balanceDueCents: Math.max(0, subtotalCents - amountPaidCents),
  };
}

export function deriveBillStatus(
  bill: Pick<Bill, "lineItems" | "amountPaidCents" | "status">,
): BillStatus {
  if (bill.status === "void" || bill.status === "draft") {
    return bill.status;
  }

  const { subtotalCents, amountPaidCents } = calculateBillTotals(bill);

  if (subtotalCents === 0) {
    return amountPaidCents > 0 ? "paid" : "issued";
  }
  if (amountPaidCents <= 0) {
    return "issued";
  }
  if (amountPaidCents >= subtotalCents) {
    return "paid";
  }
  return "partially_paid";
}

export function applyPayment(
  bill: Bill,
  paymentCents: number,
): { bill: Bill; totals: BillTotals } {
  if (bill.status === "void") {
    throw new DomainError("Cannot pay a voided bill", "BILL_VOID");
  }
  if (bill.status === "draft") {
    throw new DomainError("Cannot pay a draft bill; issue it first", "BILL_DRAFT");
  }
  if (paymentCents <= 0) {
    throw new DomainError("Payment amount must be positive", "INVALID_PAYMENT");
  }

  const next: Bill = {
    ...bill,
    amountPaidCents: bill.amountPaidCents + paymentCents,
    updatedAt: new Date().toISOString(),
  };
  next.status = deriveBillStatus(next);
  return { bill: next, totals: calculateBillTotals(next) };
}
