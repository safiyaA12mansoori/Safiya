import {
  type PrescriptionItemInput,
  validatePrescriptionItemAgainstMedicine,
} from "../domain/prescription.js";
import type {
  Id,
  Prescription,
  PrescriptionItem,
  PrescriptionStatus,
} from "../domain/types.js";
import { DomainError } from "../domain/types.js";
import { MemoryStore, newId, nowIso } from "../repositories/memory-store.js";

export interface CreatePrescriptionInput {
  patientId: Id;
  dentistId?: Id;
  appointmentId?: Id;
  items: PrescriptionItemInput[];
  notes?: string;
  status?: Extract<PrescriptionStatus, "draft" | "active">;
}

export interface UpdatePrescriptionInput {
  dentistId?: Id;
  appointmentId?: Id | null;
  items?: PrescriptionItemInput[];
  notes?: string;
}

function toItems(
  inputs: PrescriptionItemInput[],
  store: MemoryStore,
): PrescriptionItem[] {
  if (!Array.isArray(inputs) || inputs.length === 0) {
    throw new DomainError(
      "Prescription must include at least one medicine item",
      "VALIDATION",
    );
  }

  return inputs.map((input) => {
    if (!input.medicineId?.trim()) {
      throw new DomainError("Medicine id is required on each item", "VALIDATION");
    }
    const medicine = store.getMedicine(input.medicineId);
    validatePrescriptionItemAgainstMedicine(input, medicine);
    return {
      id: newId(),
      medicineId: input.medicineId,
      doseAmount: input.doseAmount,
      doseUnit: input.doseUnit ?? medicine.unit,
      frequencyPerDay: input.frequencyPerDay,
      durationDays: input.durationDays,
      quantity: input.quantity,
      instructions: input.instructions?.trim() || undefined,
    };
  });
}

export class PrescriptionService {
  constructor(private readonly store: MemoryStore) {}

  list(): Prescription[] {
    return this.store
      .listPrescriptions()
      .sort((a, b) => b.prescribedAt.localeCompare(a.prescribedAt));
  }

  get(id: Id): Prescription {
    return this.store.getPrescription(id);
  }

  listForPatient(patientId: Id): Prescription[] {
    this.store.getPatient(patientId);
    return this.list().filter((p) => p.patientId === patientId);
  }

  create(input: CreatePrescriptionInput): Prescription {
    this.store.getPatient(input.patientId);
    if (input.dentistId) {
      this.store.getDentist(input.dentistId);
    }
    if (input.appointmentId) {
      const appointment = this.store.getAppointment(input.appointmentId);
      if (appointment.patientId !== input.patientId) {
        throw new DomainError(
          "Appointment does not belong to the given patient",
          "APPOINTMENT_PATIENT_MISMATCH",
        );
      }
    }

    const timestamp = nowIso();
    const prescription: Prescription = {
      id: newId(),
      patientId: input.patientId,
      dentistId: input.dentistId,
      appointmentId: input.appointmentId,
      items: toItems(input.items, this.store),
      status: input.status ?? "draft",
      notes: input.notes?.trim() || undefined,
      prescribedAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.store.prescriptions.set(prescription.id, prescription);
    return prescription;
  }

  update(id: Id, input: UpdatePrescriptionInput): Prescription {
    const existing = this.store.getPrescription(id);
    if (existing.status === "fulfilled" || existing.status === "cancelled") {
      throw new DomainError(
        `Cannot update a ${existing.status} prescription`,
        "PRESCRIPTION_LOCKED",
      );
    }

    if (input.dentistId) {
      this.store.getDentist(input.dentistId);
    }
    if (input.appointmentId) {
      const appointment = this.store.getAppointment(input.appointmentId);
      if (appointment.patientId !== existing.patientId) {
        throw new DomainError(
          "Appointment does not belong to the prescription patient",
          "APPOINTMENT_PATIENT_MISMATCH",
        );
      }
    }

    const updated: Prescription = {
      ...existing,
      dentistId:
        input.dentistId !== undefined ? input.dentistId : existing.dentistId,
      appointmentId:
        input.appointmentId === null
          ? undefined
          : input.appointmentId !== undefined
            ? input.appointmentId
            : existing.appointmentId,
      items: input.items ? toItems(input.items, this.store) : existing.items,
      notes:
        input.notes !== undefined
          ? input.notes.trim() || undefined
          : existing.notes,
      updatedAt: nowIso(),
    };
    this.store.prescriptions.set(id, updated);
    return updated;
  }

  activate(id: Id): Prescription {
    const existing = this.store.getPrescription(id);
    if (existing.status !== "draft") {
      throw new DomainError(
        "Only draft prescriptions can be activated",
        "PRESCRIPTION_NOT_DRAFT",
      );
    }
    // Re-validate against current medicine bounds/stock.
    toItems(
      existing.items.map((item) => ({
        medicineId: item.medicineId,
        doseAmount: item.doseAmount,
        doseUnit: item.doseUnit,
        frequencyPerDay: item.frequencyPerDay,
        durationDays: item.durationDays,
        quantity: item.quantity,
        instructions: item.instructions,
      })),
      this.store,
    );
    const updated: Prescription = {
      ...existing,
      status: "active",
      updatedAt: nowIso(),
    };
    this.store.prescriptions.set(id, updated);
    return updated;
  }

  fulfill(id: Id): Prescription {
    const existing = this.store.getPrescription(id);
    if (existing.status !== "active") {
      throw new DomainError(
        "Only active prescriptions can be fulfilled",
        "PRESCRIPTION_NOT_ACTIVE",
      );
    }

    for (const item of existing.items) {
      const medicine = this.store.getMedicine(item.medicineId);
      validatePrescriptionItemAgainstMedicine(
        {
          medicineId: item.medicineId,
          doseAmount: item.doseAmount,
          doseUnit: item.doseUnit,
          frequencyPerDay: item.frequencyPerDay,
          durationDays: item.durationDays,
          quantity: item.quantity,
        },
        medicine,
      );
      const nextStock = medicine.stockQuantity - item.quantity;
      this.store.medicines.set(medicine.id, {
        ...medicine,
        stockQuantity: nextStock,
        updatedAt: nowIso(),
      });
    }

    const updated: Prescription = {
      ...existing,
      status: "fulfilled",
      updatedAt: nowIso(),
    };
    this.store.prescriptions.set(id, updated);
    return updated;
  }

  cancel(id: Id): Prescription {
    const existing = this.store.getPrescription(id);
    if (existing.status === "fulfilled") {
      throw new DomainError(
        "Cannot cancel a fulfilled prescription",
        "PRESCRIPTION_FULFILLED",
      );
    }
    const updated: Prescription = {
      ...existing,
      status: "cancelled",
      updatedAt: nowIso(),
    };
    this.store.prescriptions.set(id, updated);
    return updated;
  }

  delete(id: Id): void {
    const existing = this.store.getPrescription(id);
    if (existing.status !== "draft" && existing.status !== "cancelled") {
      throw new DomainError(
        "Only draft or cancelled prescriptions can be deleted",
        "PRESCRIPTION_NOT_DELETABLE",
      );
    }
    this.store.prescriptions.delete(id);
  }
}
