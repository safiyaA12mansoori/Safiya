import { describe, expect, it } from "vitest";
import {
  MAX_DURATION_DAYS,
  MAX_FREQUENCY_PER_DAY,
  MIN_DURATION_DAYS,
  MIN_FREQUENCY_PER_DAY,
  validatePrescriptionItemAgainstMedicine,
} from "../src/domain/prescription.js";
import { DomainError } from "../src/domain/types.js";
import { freshContext, seedBasics } from "./helpers.js";

function amoxicillin(ctx = freshContext()) {
  const medicine = ctx.medicines.create({
    name: "Amoxicillin",
    genericName: "amoxicillin",
    form: "capsule",
    strengthLabel: "500mg",
    unit: "capsule",
    minDose: 1,
    maxDose: 2,
    maxDailyDose: 6,
    stockQuantity: 100,
    maxDispenseQuantity: 60,
  });
  return { ctx, medicine };
}

describe("PatientService invalid entries", () => {
  it("rejects missing required fields", () => {
    const ctx = freshContext();
    expect(() =>
      ctx.patients.create({
        firstName: "",
        lastName: "X",
        email: "a@b.com",
        phone: "1",
        dateOfBirth: "1990-01-01",
      }),
    ).toThrow(DomainError);

    expect(() =>
      ctx.patients.create({
        firstName: "A",
        lastName: "B",
        email: "",
        phone: "1",
        dateOfBirth: "1990-01-01",
      }),
    ).toThrow(/email/i);
  });

  it("rejects invalid email and future/malformed date of birth", () => {
    const ctx = freshContext();

    expect(() =>
      ctx.patients.create({
        firstName: "A",
        lastName: "B",
        email: "not-an-email",
        phone: "555",
        dateOfBirth: "1990-01-01",
      }),
    ).toThrow(/email/i);

    expect(() =>
      ctx.patients.create({
        firstName: "A",
        lastName: "B",
        email: "a@b.com",
        phone: "555",
        dateOfBirth: "01-01-1990",
      }),
    ).toThrow(/date of birth/i);

    expect(() =>
      ctx.patients.create({
        firstName: "A",
        lastName: "B",
        email: "a@b.com",
        phone: "555",
        dateOfBirth: "2999-01-01",
      }),
    ).toThrow(/future/i);
  });
});

describe("MedicineService boundaries", () => {
  it("creates a valid medicine and rejects inverted dose bounds", () => {
    const { medicine } = amoxicillin();
    expect(medicine.minDose).toBe(1);
    expect(medicine.maxDose).toBe(2);

    const ctx = freshContext();
    expect(() =>
      ctx.medicines.create({
        name: "Bad",
        form: "tablet",
        strengthLabel: "10mg",
        unit: "tablet",
        minDose: 5,
        maxDose: 2,
        maxDailyDose: 10,
        stockQuantity: 10,
        maxDispenseQuantity: 10,
      }),
    ).toThrow(/minimum dose/i);
  });

  it("rejects invalid stock and dispense quantity entries", () => {
    const ctx = freshContext();
    const base = {
      name: "Ibuprofen",
      form: "tablet",
      strengthLabel: "200mg",
      unit: "tablet" as const,
      minDose: 1,
      maxDose: 2,
      maxDailyDose: 6,
      stockQuantity: 20,
      maxDispenseQuantity: 30,
    };

    expect(() =>
      ctx.medicines.create({ ...base, stockQuantity: -1 }),
    ).toThrow(/stock/i);

    expect(() =>
      ctx.medicines.create({ ...base, stockQuantity: 1.5 }),
    ).toThrow(/stock/i);

    expect(() =>
      ctx.medicines.create({ ...base, maxDispenseQuantity: 0 }),
    ).toThrow(/dispense/i);

    expect(() =>
      ctx.medicines.create({ ...base, unit: "pounds" as never }),
    ).toThrow(/unit/i);
  });

  it("adjusts stock and blocks negative stock", () => {
    const { ctx, medicine } = amoxicillin();
    const updated = ctx.medicines.adjustStock(medicine.id, -10);
    expect(updated.stockQuantity).toBe(90);
    expect(() => ctx.medicines.adjustStock(medicine.id, -1000)).toThrow(
      /stock/i,
    );
  });
});

describe("Prescription dosage and quantity boundaries", () => {
  it("accepts boundary dose, frequency, duration, and quantity values", () => {
    const { ctx, medicine } = amoxicillin();
    const { patient, dentist } = seedBasics(ctx);

    const minOk = validatePrescriptionItemAgainstMedicine(
      {
        medicineId: medicine.id,
        doseAmount: medicine.minDose,
        frequencyPerDay: MIN_FREQUENCY_PER_DAY,
        durationDays: MIN_DURATION_DAYS,
        quantity: 1,
      },
      medicine,
    );
    expect(minOk).toBeUndefined();

    const maxFreq = {
      medicineId: medicine.id,
      doseAmount: 1,
      frequencyPerDay: Math.min(MAX_FREQUENCY_PER_DAY, medicine.maxDailyDose),
      durationDays: 2,
      quantity: Math.min(MAX_FREQUENCY_PER_DAY, medicine.maxDailyDose) * 2,
    };
    expect(() =>
      validatePrescriptionItemAgainstMedicine(maxFreq, medicine),
    ).not.toThrow();

    const rx = ctx.prescriptions.create({
      patientId: patient.id,
      dentistId: dentist.id,
      items: [
        {
          medicineId: medicine.id,
          doseAmount: 1,
          frequencyPerDay: 3,
          durationDays: 7,
          quantity: 21,
        },
      ],
    });
    expect(rx.items[0].quantity).toBe(21);
    expect(rx.status).toBe("draft");
  });

  it("rejects dose below min and above max", () => {
    const { medicine } = amoxicillin();

    expect(() =>
      validatePrescriptionItemAgainstMedicine(
        {
          medicineId: medicine.id,
          doseAmount: 0,
          frequencyPerDay: 1,
          durationDays: 1,
          quantity: 1,
        },
        medicine,
      ),
    ).toThrow(/greater than zero|Dose amount/i);

    expect(() =>
      validatePrescriptionItemAgainstMedicine(
        {
          medicineId: medicine.id,
          doseAmount: medicine.minDose - 0.5,
          frequencyPerDay: 1,
          durationDays: 1,
          quantity: 1,
        },
        medicine,
      ),
    ).toThrow(DomainError);

    expect(() =>
      validatePrescriptionItemAgainstMedicine(
        {
          medicineId: medicine.id,
          doseAmount: medicine.maxDose + 1,
          frequencyPerDay: 1,
          durationDays: 1,
          quantity: 1,
        },
        medicine,
      ),
    ).toThrow(/between/i);
  });

  it("rejects frequency and duration outside allowed ranges", () => {
    const { medicine } = amoxicillin();

    expect(() =>
      validatePrescriptionItemAgainstMedicine(
        {
          medicineId: medicine.id,
          doseAmount: 1,
          frequencyPerDay: 0,
          durationDays: 1,
          quantity: 1,
        },
        medicine,
      ),
    ).toThrow(/Frequency/i);

    expect(() =>
      validatePrescriptionItemAgainstMedicine(
        {
          medicineId: medicine.id,
          doseAmount: 1,
          frequencyPerDay: MAX_FREQUENCY_PER_DAY + 1,
          durationDays: 1,
          quantity: 25,
        },
        medicine,
      ),
    ).toThrow(/Frequency/i);

    expect(() =>
      validatePrescriptionItemAgainstMedicine(
        {
          medicineId: medicine.id,
          doseAmount: 1,
          frequencyPerDay: 1,
          durationDays: 0,
          quantity: 1,
        },
        medicine,
      ),
    ).toThrow(/Duration/i);

    expect(() =>
      validatePrescriptionItemAgainstMedicine(
        {
          medicineId: medicine.id,
          doseAmount: 1,
          frequencyPerDay: 1,
          durationDays: MAX_DURATION_DAYS + 1,
          quantity: MAX_DURATION_DAYS + 1,
        },
        medicine,
      ),
    ).toThrow(/Duration/i);

    expect(() =>
      validatePrescriptionItemAgainstMedicine(
        {
          medicineId: medicine.id,
          doseAmount: 1,
          frequencyPerDay: 1.5,
          durationDays: 1,
          quantity: 2,
        },
        medicine,
      ),
    ).toThrow(/whole number/i);
  });

  it("rejects daily dose overflow and invalid quantities", () => {
    const { medicine } = amoxicillin();

    // 2 capsules × 4/day = 8 > maxDailyDose 6
    expect(() =>
      validatePrescriptionItemAgainstMedicine(
        {
          medicineId: medicine.id,
          doseAmount: 2,
          frequencyPerDay: 4,
          durationDays: 3,
          quantity: 12,
        },
        medicine,
      ),
    ).toThrow(/Daily dose/i);

    expect(() =>
      validatePrescriptionItemAgainstMedicine(
        {
          medicineId: medicine.id,
          doseAmount: 1,
          frequencyPerDay: 1,
          durationDays: 1,
          quantity: 0,
        },
        medicine,
      ),
    ).toThrow(/Quantity/i);

    expect(() =>
      validatePrescriptionItemAgainstMedicine(
        {
          medicineId: medicine.id,
          doseAmount: 1,
          frequencyPerDay: 1,
          durationDays: 1,
          quantity: -5,
        },
        medicine,
      ),
    ).toThrow(/Quantity|greater than zero/i);

    expect(() =>
      validatePrescriptionItemAgainstMedicine(
        {
          medicineId: medicine.id,
          doseAmount: 1,
          frequencyPerDay: 1,
          durationDays: 1,
          quantity: 1.25,
        },
        medicine,
      ),
    ).toThrow(/whole number/i);

    expect(() =>
      validatePrescriptionItemAgainstMedicine(
        {
          medicineId: medicine.id,
          doseAmount: 1,
          frequencyPerDay: 1,
          durationDays: 1,
          quantity: medicine.maxDispenseQuantity + 1,
        },
        medicine,
      ),
    ).toThrow(/max dispense/i);

    expect(() =>
      validatePrescriptionItemAgainstMedicine(
        {
          medicineId: medicine.id,
          doseAmount: 1,
          frequencyPerDay: 3,
          durationDays: 40,
          quantity: 120,
        },
        { ...medicine, stockQuantity: 50, maxDispenseQuantity: 200 },
      ),
    ).toThrow(/stock/i);

    expect(() =>
      validatePrescriptionItemAgainstMedicine(
        {
          medicineId: medicine.id,
          doseAmount: 1,
          frequencyPerDay: 3,
          durationDays: 7,
          quantity: 10,
        },
        medicine,
      ),
    ).toThrow(/course requirement/i);
  });

  it("rejects wrong dose unit and inactive medicine", () => {
    const { medicine } = amoxicillin();

    expect(() =>
      validatePrescriptionItemAgainstMedicine(
        {
          medicineId: medicine.id,
          doseAmount: 1,
          doseUnit: "mg",
          frequencyPerDay: 1,
          durationDays: 1,
          quantity: 1,
        },
        medicine,
      ),
    ).toThrow(/Dose unit/i);

    expect(() =>
      validatePrescriptionItemAgainstMedicine(
        {
          medicineId: medicine.id,
          doseAmount: 1,
          frequencyPerDay: 1,
          durationDays: 1,
          quantity: 1,
        },
        { ...medicine, active: false },
      ),
    ).toThrow(/inactive/i);
  });

  it("fulfills an active prescription and decrements stock", () => {
    const { ctx, medicine } = amoxicillin();
    const { patient, dentist } = seedBasics(ctx);

    const rx = ctx.prescriptions.create({
      patientId: patient.id,
      dentistId: dentist.id,
      items: [
        {
          medicineId: medicine.id,
          doseAmount: 1,
          frequencyPerDay: 3,
          durationDays: 5,
          quantity: 15,
        },
      ],
    });

    ctx.prescriptions.activate(rx.id);
    const fulfilled = ctx.prescriptions.fulfill(rx.id);
    expect(fulfilled.status).toBe("fulfilled");
    expect(ctx.medicines.get(medicine.id).stockQuantity).toBe(85);
  });

  it("rejects empty item lists and unknown patient/medicine", () => {
    const { ctx } = amoxicillin();
    const { patient } = seedBasics(ctx);

    expect(() =>
      ctx.prescriptions.create({
        patientId: patient.id,
        items: [],
      }),
    ).toThrow(/at least one/i);

    expect(() =>
      ctx.prescriptions.create({
        patientId: "missing-patient",
        items: [
          {
            medicineId: "x",
            doseAmount: 1,
            frequencyPerDay: 1,
            durationDays: 1,
            quantity: 1,
          },
        ],
      }),
    ).toThrow(/not found/i);
  });
});
