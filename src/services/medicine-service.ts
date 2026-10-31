import {
  assertPositiveFinite,
  assertWholeNumber,
  DOSE_UNITS,
} from "../domain/prescription.js";
import type { DoseUnit, Id, Medicine } from "../domain/types.js";
import { DomainError } from "../domain/types.js";
import { MemoryStore, newId, nowIso } from "../repositories/memory-store.js";

export interface MedicineInput {
  name: string;
  genericName?: string;
  form: string;
  strengthLabel: string;
  unit: DoseUnit;
  minDose: number;
  maxDose: number;
  maxDailyDose: number;
  stockQuantity: number;
  maxDispenseQuantity: number;
  active?: boolean;
  notes?: string;
}

function validateMedicineInput(input: MedicineInput): void {
  if (!input.name?.trim()) {
    throw new DomainError("Medicine name is required", "VALIDATION");
  }
  if (!input.form?.trim()) {
    throw new DomainError("Medicine form is required", "VALIDATION");
  }
  if (!input.strengthLabel?.trim()) {
    throw new DomainError("Strength label is required", "VALIDATION");
  }
  if (!DOSE_UNITS.includes(input.unit)) {
    throw new DomainError(`Invalid dose unit: ${input.unit}`, "INVALID_DOSE_UNIT");
  }

  assertPositiveFinite(input.minDose, "Minimum dose", "INVALID_DOSE");
  assertPositiveFinite(input.maxDose, "Maximum dose", "INVALID_DOSE");
  assertPositiveFinite(input.maxDailyDose, "Maximum daily dose", "INVALID_DOSE");

  if (input.minDose > input.maxDose) {
    throw new DomainError(
      "Minimum dose cannot be greater than maximum dose",
      "INVALID_DOSE_BOUNDS",
    );
  }
  if (input.maxDailyDose < input.minDose) {
    throw new DomainError(
      "Maximum daily dose must be at least the minimum single dose",
      "INVALID_DOSE_BOUNDS",
    );
  }

  if (typeof input.stockQuantity !== "number" || !Number.isFinite(input.stockQuantity)) {
    throw new DomainError("Stock quantity must be a finite number", "INVALID_QUANTITY");
  }
  if (input.stockQuantity < 0 || !Number.isInteger(input.stockQuantity)) {
    throw new DomainError(
      "Stock quantity must be a non-negative whole number",
      "INVALID_QUANTITY",
    );
  }

  assertWholeNumber(
    input.maxDispenseQuantity,
    "Max dispense quantity",
    "INVALID_QUANTITY",
  );
  if (input.maxDispenseQuantity < 1) {
    throw new DomainError(
      "Max dispense quantity must be at least 1",
      "QUANTITY_OUT_OF_RANGE",
    );
  }
}

export class MedicineService {
  constructor(private readonly store: MemoryStore) {}

  list(): Medicine[] {
    return this.store.listMedicines().sort((a, b) => a.name.localeCompare(b.name));
  }

  get(id: Id): Medicine {
    return this.store.getMedicine(id);
  }

  create(input: MedicineInput): Medicine {
    validateMedicineInput(input);
    const timestamp = nowIso();
    const medicine: Medicine = {
      id: newId(),
      name: input.name.trim(),
      genericName: input.genericName?.trim() || undefined,
      form: input.form.trim(),
      strengthLabel: input.strengthLabel.trim(),
      unit: input.unit,
      minDose: input.minDose,
      maxDose: input.maxDose,
      maxDailyDose: input.maxDailyDose,
      stockQuantity: input.stockQuantity,
      maxDispenseQuantity: input.maxDispenseQuantity,
      active: input.active ?? true,
      notes: input.notes?.trim() || undefined,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.store.medicines.set(medicine.id, medicine);
    return medicine;
  }

  update(id: Id, input: Partial<MedicineInput>): Medicine {
    const existing = this.store.getMedicine(id);
    const merged: MedicineInput = {
      name: input.name ?? existing.name,
      genericName:
        input.genericName !== undefined ? input.genericName : existing.genericName,
      form: input.form ?? existing.form,
      strengthLabel: input.strengthLabel ?? existing.strengthLabel,
      unit: input.unit ?? existing.unit,
      minDose: input.minDose ?? existing.minDose,
      maxDose: input.maxDose ?? existing.maxDose,
      maxDailyDose: input.maxDailyDose ?? existing.maxDailyDose,
      stockQuantity: input.stockQuantity ?? existing.stockQuantity,
      maxDispenseQuantity: input.maxDispenseQuantity ?? existing.maxDispenseQuantity,
      active: input.active ?? existing.active,
      notes: input.notes !== undefined ? input.notes : existing.notes,
    };
    validateMedicineInput(merged);
    const updated: Medicine = {
      ...existing,
      name: merged.name.trim(),
      genericName: merged.genericName?.trim() || undefined,
      form: merged.form.trim(),
      strengthLabel: merged.strengthLabel.trim(),
      unit: merged.unit,
      minDose: merged.minDose,
      maxDose: merged.maxDose,
      maxDailyDose: merged.maxDailyDose,
      stockQuantity: merged.stockQuantity,
      maxDispenseQuantity: merged.maxDispenseQuantity,
      active: merged.active ?? true,
      notes: merged.notes?.trim() || undefined,
      updatedAt: nowIso(),
    };
    this.store.medicines.set(id, updated);
    return updated;
  }

  adjustStock(id: Id, delta: number): Medicine {
    const existing = this.store.getMedicine(id);
    if (!Number.isFinite(delta) || !Number.isInteger(delta)) {
      throw new DomainError(
        "Stock adjustment must be a whole number",
        "INVALID_QUANTITY",
      );
    }
    const next = existing.stockQuantity + delta;
    if (next < 0) {
      throw new DomainError(
        "Stock quantity cannot go below zero",
        "INSUFFICIENT_STOCK",
      );
    }
    return this.update(id, { stockQuantity: next });
  }

  delete(id: Id): void {
    this.store.getMedicine(id);
    const inUse = this.store
      .listPrescriptions()
      .some(
        (p) =>
          p.status !== "cancelled" &&
          p.items.some((item) => item.medicineId === id),
      );
    if (inUse) {
      throw new DomainError(
        "Cannot delete medicine referenced by an active prescription",
        "MEDICINE_IN_USE",
      );
    }
    this.store.medicines.delete(id);
  }
}
