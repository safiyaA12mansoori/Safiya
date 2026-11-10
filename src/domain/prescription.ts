import type { DoseUnit, Medicine, PrescriptionItem } from "./types.js";
import { DomainError } from "./types.js";

/** Frequency: at least once per day, at most hourly. */
export const MIN_FREQUENCY_PER_DAY = 1;
export const MAX_FREQUENCY_PER_DAY = 24;

/** Course length bounds in whole days. */
export const MIN_DURATION_DAYS = 1;
export const MAX_DURATION_DAYS = 365;

/** Dispense quantity must be a positive whole number within medicine caps. */
export const MIN_DISPENSE_QUANTITY = 1;

export const DOSE_UNITS: DoseUnit[] = [
  "mg",
  "ml",
  "tablet",
  "capsule",
  "drop",
  "unit",
];

export function assertPositiveFinite(
  value: number,
  label: string,
  code = "VALIDATION",
): void {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new DomainError(`${label} must be a finite number`, code);
  }
  if (value <= 0) {
    throw new DomainError(`${label} must be greater than zero`, code);
  }
}

export function assertWholeNumber(
  value: number,
  label: string,
  code = "VALIDATION",
): void {
  assertPositiveFinite(value, label, code);
  if (!Number.isInteger(value)) {
    throw new DomainError(`${label} must be a whole number`, code);
  }
}

export function assertInRange(
  value: number,
  min: number,
  max: number,
  label: string,
  code = "VALIDATION",
): void {
  assertPositiveFinite(value, label, code);
  if (value < min || value > max) {
    throw new DomainError(
      `${label} must be between ${min} and ${max} (got ${value})`,
      code,
    );
  }
}

export interface PrescriptionItemInput {
  medicineId: string;
  doseAmount: number;
  doseUnit?: DoseUnit;
  frequencyPerDay: number;
  durationDays: number;
  quantity: number;
  instructions?: string;
}

/**
 * Validates a prescription line against medicine dosage / quantity boundaries.
 * Throws DomainError with stable codes for API mapping.
 */
export function validatePrescriptionItemAgainstMedicine(
  item: PrescriptionItemInput,
  medicine: Medicine,
): void {
  if (!medicine.active) {
    throw new DomainError(
      `Medicine is inactive: ${medicine.name}`,
      "MEDICINE_INACTIVE",
    );
  }

  assertPositiveFinite(item.doseAmount, "Dose amount", "INVALID_DOSE");
  if (item.doseAmount < medicine.minDose || item.doseAmount > medicine.maxDose) {
    throw new DomainError(
      `Dose amount must be between ${medicine.minDose} and ${medicine.maxDose} ${medicine.unit} (got ${item.doseAmount})`,
      "DOSE_OUT_OF_RANGE",
    );
  }

  const unit = item.doseUnit ?? medicine.unit;
  if (unit !== medicine.unit) {
    throw new DomainError(
      `Dose unit must be ${medicine.unit} for ${medicine.name}`,
      "INVALID_DOSE_UNIT",
    );
  }

  assertWholeNumber(item.frequencyPerDay, "Frequency per day", "INVALID_FREQUENCY");
  assertInRange(
    item.frequencyPerDay,
    MIN_FREQUENCY_PER_DAY,
    MAX_FREQUENCY_PER_DAY,
    "Frequency per day",
    "FREQUENCY_OUT_OF_RANGE",
  );

  assertWholeNumber(item.durationDays, "Duration days", "INVALID_DURATION");
  assertInRange(
    item.durationDays,
    MIN_DURATION_DAYS,
    MAX_DURATION_DAYS,
    "Duration days",
    "DURATION_OUT_OF_RANGE",
  );

  const dailyDose = item.doseAmount * item.frequencyPerDay;
  if (dailyDose > medicine.maxDailyDose) {
    throw new DomainError(
      `Daily dose ${dailyDose} ${medicine.unit} exceeds max daily dose ${medicine.maxDailyDose} ${medicine.unit}`,
      "DAILY_DOSE_EXCEEDED",
    );
  }

  assertWholeNumber(item.quantity, "Quantity", "INVALID_QUANTITY");
  if (item.quantity < MIN_DISPENSE_QUANTITY) {
    throw new DomainError(
      `Quantity must be at least ${MIN_DISPENSE_QUANTITY}`,
      "QUANTITY_OUT_OF_RANGE",
    );
  }
  if (item.quantity > medicine.maxDispenseQuantity) {
    throw new DomainError(
      `Quantity ${item.quantity} exceeds max dispense quantity ${medicine.maxDispenseQuantity}`,
      "QUANTITY_OUT_OF_RANGE",
    );
  }
  if (item.quantity > medicine.stockQuantity) {
    throw new DomainError(
      `Quantity ${item.quantity} exceeds available stock ${medicine.stockQuantity}`,
      "INSUFFICIENT_STOCK",
    );
  }

  // For solid oral forms, dispensed units should cover the course.
  if (medicine.unit === "tablet" || medicine.unit === "capsule") {
    const courseUnits = item.frequencyPerDay * item.durationDays;
    if (item.quantity < courseUnits) {
      throw new DomainError(
        `Quantity ${item.quantity} is below the course requirement of ${courseUnits} ${medicine.unit}(s)`,
        "QUANTITY_BELOW_COURSE",
      );
    }
  }
}

export function summarizeItem(item: PrescriptionItem, medicineName: string): string {
  return `${medicineName}: ${item.doseAmount} ${item.doseUnit} × ${item.frequencyPerDay}/day for ${item.durationDays} day(s); qty ${item.quantity}`;
}
