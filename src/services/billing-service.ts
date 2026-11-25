import {
  applyPayment,
  calculateBillTotals,
  deriveBillStatus,
} from "../domain/billing.js";
import type {
  Bill,
  BillLineItem,
  BillStatus,
  BillTotals,
  Id,
} from "../domain/types.js";
import { DomainError } from "../domain/types.js";
import { MemoryStore, newId, nowIso } from "../repositories/memory-store.js";

export interface BillLineItemInput {
  description: string;
  quantity: number;
  unitPriceCents: number;
  treatmentId?: Id;
}

export interface CreateBillInput {
  patientId: Id;
  appointmentId?: Id;
  lineItems?: BillLineItemInput[];
  notes?: string;
  /** When true, seed line items from the appointment's treatment if present. */
  fromAppointmentTreatment?: boolean;
}

export interface UpdateBillInput {
  lineItems?: BillLineItemInput[];
  notes?: string;
  status?: Extract<BillStatus, "draft" | "void">;
}

function toLineItems(inputs: BillLineItemInput[]): BillLineItem[] {
  if (!inputs.length) {
    throw new DomainError("Bill must have at least one line item", "VALIDATION");
  }
  return inputs.map((item) => {
    if (!item.description?.trim()) {
      throw new DomainError("Line item description is required", "VALIDATION");
    }
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      throw new DomainError("Line item quantity must be positive", "VALIDATION");
    }
    if (!Number.isFinite(item.unitPriceCents) || item.unitPriceCents < 0) {
      throw new DomainError("Unit price cannot be negative", "VALIDATION");
    }
    return {
      id: newId(),
      description: item.description.trim(),
      quantity: item.quantity,
      unitPriceCents: Math.round(item.unitPriceCents),
      treatmentId: item.treatmentId,
    };
  });
}

export class BillingService {
  constructor(private readonly store: MemoryStore) {}

  list(): Bill[] {
    return this.store
      .listBills()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  get(id: Id): Bill & { totals: BillTotals } {
    const bill = this.store.getBill(id);
    return { ...bill, totals: calculateBillTotals(bill) };
  }

  listForPatient(patientId: Id): Bill[] {
    this.store.getPatient(patientId);
    return this.list().filter((b) => b.patientId === patientId);
  }

  create(input: CreateBillInput): Bill & { totals: BillTotals } {
    this.store.getPatient(input.patientId);

    let lineInputs = input.lineItems ?? [];

    if (input.appointmentId) {
      const appointment = this.store.getAppointment(input.appointmentId);
      if (appointment.patientId !== input.patientId) {
        throw new DomainError(
          "Appointment does not belong to the given patient",
          "APPOINTMENT_PATIENT_MISMATCH",
        );
      }

      const existingForAppointment = this.store
        .listBills()
        .find(
          (b) =>
            b.appointmentId === input.appointmentId && b.status !== "void",
        );
      if (existingForAppointment) {
        throw new DomainError(
          `A non-void bill already exists for appointment ${input.appointmentId}`,
          "BILL_EXISTS_FOR_APPOINTMENT",
          409,
        );
      }

      if (
        (input.fromAppointmentTreatment || lineInputs.length === 0) &&
        appointment.treatmentId
      ) {
        const treatment = this.store.getTreatment(appointment.treatmentId);
        lineInputs = [
          {
            description: treatment.name,
            quantity: 1,
            unitPriceCents: treatment.basePriceCents,
            treatmentId: treatment.id,
          },
          ...lineInputs,
        ];
      }
    }

    if (lineInputs.length === 0) {
      throw new DomainError(
        "Bill requires line items or an appointment with a treatment",
        "VALIDATION",
      );
    }

    for (const item of lineInputs) {
      if (item.treatmentId) {
        this.store.getTreatment(item.treatmentId);
      }
    }

    const timestamp = nowIso();
    const bill: Bill = {
      id: newId(),
      patientId: input.patientId,
      appointmentId: input.appointmentId,
      lineItems: toLineItems(lineInputs),
      status: "draft",
      amountPaidCents: 0,
      notes: input.notes?.trim() || undefined,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.store.bills.set(bill.id, bill);
    return { ...bill, totals: calculateBillTotals(bill) };
  }

  update(id: Id, input: UpdateBillInput): Bill & { totals: BillTotals } {
    const existing = this.store.getBill(id);
    if (existing.status === "void") {
      throw new DomainError("Cannot update a voided bill", "BILL_VOID");
    }
    if (existing.status === "paid") {
      throw new DomainError("Cannot update a paid bill", "BILL_PAID");
    }
    if (
      existing.status !== "draft" &&
      input.lineItems !== undefined
    ) {
      throw new DomainError(
        "Only draft bills can change line items",
        "BILL_NOT_DRAFT",
      );
    }

    const updated: Bill = {
      ...existing,
      lineItems: input.lineItems
        ? toLineItems(input.lineItems)
        : existing.lineItems,
      notes:
        input.notes !== undefined
          ? input.notes.trim() || undefined
          : existing.notes,
      status: input.status === "void" ? "void" : existing.status,
      updatedAt: nowIso(),
    };
    this.store.bills.set(id, updated);
    return { ...updated, totals: calculateBillTotals(updated) };
  }

  issue(id: Id): Bill & { totals: BillTotals } {
    const existing = this.store.getBill(id);
    if (existing.status !== "draft") {
      throw new DomainError("Only draft bills can be issued", "BILL_NOT_DRAFT");
    }
    const issued: Bill = {
      ...existing,
      status: "issued",
      issuedAt: nowIso(),
      updatedAt: nowIso(),
    };
    issued.status = deriveBillStatus(issued);
    this.store.bills.set(id, issued);
    return { ...issued, totals: calculateBillTotals(issued) };
  }

  recordPayment(
    id: Id,
    paymentCents: number,
  ): Bill & { totals: BillTotals } {
    const existing = this.store.getBill(id);
    const { bill, totals } = applyPayment(existing, paymentCents);
    this.store.bills.set(id, bill);
    return { ...bill, totals };
  }

  void(id: Id): Bill & { totals: BillTotals } {
    const existing = this.store.getBill(id);
    if (existing.status === "paid") {
      throw new DomainError("Cannot void a fully paid bill", "BILL_PAID");
    }
    const voided: Bill = {
      ...existing,
      status: "void",
      updatedAt: nowIso(),
    };
    this.store.bills.set(id, voided);
    return { ...voided, totals: calculateBillTotals(voided) };
  }

  delete(id: Id): void {
    const bill = this.store.getBill(id);
    if (bill.status !== "draft" && bill.status !== "void") {
      throw new DomainError(
        "Only draft or void bills can be deleted",
        "BILL_NOT_DELETABLE",
      );
    }
    this.store.bills.delete(id);
  }
}
