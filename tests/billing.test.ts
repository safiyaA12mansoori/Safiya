import { describe, expect, it } from "vitest";
import {
  applyPayment,
  calculateBillTotals,
  deriveBillStatus,
  lineItemTotalCents,
} from "../src/domain/billing.js";
import { DomainError } from "../src/domain/types.js";
import { freshContext, seedBasics, windowA } from "./helpers.js";

describe("billing domain helpers", () => {
  it("computes line item and bill totals", () => {
    expect(
      lineItemTotalCents({
        id: "1",
        description: "Cleaning",
        quantity: 2,
        unitPriceCents: 5000,
      }),
    ).toBe(10000);

    const totals = calculateBillTotals({
      lineItems: [
        { id: "1", description: "A", quantity: 1, unitPriceCents: 12000 },
        { id: "2", description: "B", quantity: 2, unitPriceCents: 1500 },
      ],
      amountPaidCents: 5000,
    });

    expect(totals.subtotalCents).toBe(15000);
    expect(totals.amountPaidCents).toBe(5000);
    expect(totals.balanceDueCents).toBe(10000);
  });

  it("derives bill status from payments", () => {
    const base = {
      lineItems: [
        { id: "1", description: "Cleaning", quantity: 1, unitPriceCents: 10000 },
      ],
      amountPaidCents: 0,
      status: "issued" as const,
    };

    expect(deriveBillStatus(base)).toBe("issued");
    expect(deriveBillStatus({ ...base, amountPaidCents: 4000 })).toBe(
      "partially_paid",
    );
    expect(deriveBillStatus({ ...base, amountPaidCents: 10000 })).toBe("paid");
    expect(deriveBillStatus({ ...base, status: "void" })).toBe("void");
    expect(deriveBillStatus({ ...base, status: "draft" })).toBe("draft");
  });

  it("applies payments and rejects invalid states", () => {
    const issued = {
      id: "b1",
      patientId: "p1",
      lineItems: [
        { id: "1", description: "Cleaning", quantity: 1, unitPriceCents: 10000 },
      ],
      status: "issued" as const,
      amountPaidCents: 0,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };

    const { bill, totals } = applyPayment(issued, 4000);
    expect(bill.amountPaidCents).toBe(4000);
    expect(bill.status).toBe("partially_paid");
    expect(totals.balanceDueCents).toBe(6000);

    const paid = applyPayment(bill, 6000);
    expect(paid.bill.status).toBe("paid");
    expect(paid.totals.balanceDueCents).toBe(0);

    expect(() => applyPayment({ ...issued, status: "draft" }, 100)).toThrow(
      DomainError,
    );
    expect(() => applyPayment({ ...issued, status: "void" }, 100)).toThrow(
      DomainError,
    );
    expect(() => applyPayment(issued, 0)).toThrow(DomainError);
  });
});

describe("BillingService", () => {
  it("creates a bill from appointment treatment", () => {
    const ctx = freshContext();
    const { patient, dentist, treatment } = seedBasics(ctx);

    const appointment = ctx.appointments.create({
      patientId: patient.id,
      dentistId: dentist.id,
      treatmentId: treatment.id,
      ...windowA,
    });

    const bill = ctx.billing.create({
      patientId: patient.id,
      appointmentId: appointment.id,
      fromAppointmentTreatment: true,
    });

    expect(bill.status).toBe("draft");
    expect(bill.lineItems).toHaveLength(1);
    expect(bill.lineItems[0].treatmentId).toBe(treatment.id);
    expect(bill.lineItems[0].unitPriceCents).toBe(treatment.basePriceCents);
    expect(bill.totals.subtotalCents).toBe(10000);
  });

  it("issues a bill and records partial then full payment", () => {
    const ctx = freshContext();
    const { patient, filling } = seedBasics(ctx);

    const draft = ctx.billing.create({
      patientId: patient.id,
      lineItems: [
        {
          description: filling.name,
          quantity: 1,
          unitPriceCents: filling.basePriceCents,
          treatmentId: filling.id,
        },
      ],
    });

    const issued = ctx.billing.issue(draft.id);
    expect(issued.status).toBe("issued");
    expect(issued.issuedAt).toBeTruthy();

    const partial = ctx.billing.recordPayment(issued.id, 5000);
    expect(partial.status).toBe("partially_paid");
    expect(partial.totals.balanceDueCents).toBe(15000);

    const paid = ctx.billing.recordPayment(issued.id, 15000);
    expect(paid.status).toBe("paid");
    expect(paid.totals.balanceDueCents).toBe(0);
  });

  it("prevents a second non-void bill for the same appointment", () => {
    const ctx = freshContext();
    const { patient, dentist, treatment } = seedBasics(ctx);

    const appointment = ctx.appointments.create({
      patientId: patient.id,
      dentistId: dentist.id,
      treatmentId: treatment.id,
      ...windowA,
    });

    ctx.billing.create({
      patientId: patient.id,
      appointmentId: appointment.id,
      fromAppointmentTreatment: true,
    });

    expect(() =>
      ctx.billing.create({
        patientId: patient.id,
        appointmentId: appointment.id,
        fromAppointmentTreatment: true,
      }),
    ).toThrow(DomainError);
  });

  it("allows a new bill after voiding the previous appointment bill", () => {
    const ctx = freshContext();
    const { patient, dentist, treatment } = seedBasics(ctx);

    const appointment = ctx.appointments.create({
      patientId: patient.id,
      dentistId: dentist.id,
      treatmentId: treatment.id,
      ...windowA,
    });

    const first = ctx.billing.create({
      patientId: patient.id,
      appointmentId: appointment.id,
      fromAppointmentTreatment: true,
    });
    ctx.billing.void(first.id);

    const second = ctx.billing.create({
      patientId: patient.id,
      appointmentId: appointment.id,
      fromAppointmentTreatment: true,
    });

    expect(second.id).not.toBe(first.id);
    expect(second.status).toBe("draft");
  });

  it("rejects payment on draft bills until issued", () => {
    const ctx = freshContext();
    const { patient } = seedBasics(ctx);

    const draft = ctx.billing.create({
      patientId: patient.id,
      lineItems: [
        { description: "Consult", quantity: 1, unitPriceCents: 7500 },
      ],
    });

    expect(() => ctx.billing.recordPayment(draft.id, 1000)).toThrow(DomainError);
  });

  it("rejects mismatched patient/appointment pairing", () => {
    const ctx = freshContext();
    const { patient, otherPatient, dentist } = seedBasics(ctx);

    const appointment = ctx.appointments.create({
      patientId: patient.id,
      dentistId: dentist.id,
      ...windowA,
    });

    expect(() =>
      ctx.billing.create({
        patientId: otherPatient.id,
        appointmentId: appointment.id,
        lineItems: [
          { description: "Extra", quantity: 1, unitPriceCents: 1000 },
        ],
      }),
    ).toThrow(DomainError);
  });

  it("updates draft line items and voids unpaid bills", () => {
    const ctx = freshContext();
    const { patient } = seedBasics(ctx);

    const draft = ctx.billing.create({
      patientId: patient.id,
      lineItems: [
        { description: "Consult", quantity: 1, unitPriceCents: 5000 },
      ],
    });

    const updated = ctx.billing.update(draft.id, {
      lineItems: [
        { description: "Consult", quantity: 1, unitPriceCents: 5000 },
        { description: "X-Ray", quantity: 1, unitPriceCents: 3000 },
      ],
    });
    expect(updated.totals.subtotalCents).toBe(8000);

    const issued = ctx.billing.issue(updated.id);
    const voided = ctx.billing.void(issued.id);
    expect(voided.status).toBe("void");
  });
});
