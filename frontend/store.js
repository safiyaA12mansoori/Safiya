const STORAGE_KEY = "safiya-clinic-frontend-v1";

export class ClinicError extends Error {
  constructor(message, code = "VALIDATION") {
    super(message);
    this.name = "ClinicError";
    this.code = code;
  }
}

function id() {
  return crypto.randomUUID();
}

function now() {
  return new Date().toISOString();
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function save(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function emptyState() {
  return {
    patients: [],
    dentists: [],
    medicines: [],
    prescriptions: [],
    treatments: [],
    appointments: [],
    bills: [],
  };
}

function seedIfEmpty(state) {
  if (state.patients.length) return state;

  const alice = {
    id: id(),
    firstName: "Alice",
    lastName: "Nguyen",
    email: "alice.nguyen@example.com",
    phone: "+1-555-0101",
    dateOfBirth: "1990-04-12",
    notes: "Prefers morning appointments",
    createdAt: now(),
  };
  const brian = {
    id: id(),
    firstName: "Brian",
    lastName: "Okoye",
    email: "brian.okoye@example.com",
    phone: "+1-555-0102",
    dateOfBirth: "1985-11-03",
    createdAt: now(),
  };
  const patel = {
    id: id(),
    firstName: "Priya",
    lastName: "Patel",
    email: "priya.patel@clinic.example",
    phone: "+1-555-0201",
    specialty: "General Dentistry",
    active: true,
    createdAt: now(),
  };
  const chen = {
    id: id(),
    firstName: "James",
    lastName: "Chen",
    email: "james.chen@clinic.example",
    phone: "+1-555-0202",
    specialty: "Orthodontics",
    active: true,
    createdAt: now(),
  };
  const cleaning = {
    id: id(),
    name: "Routine Cleaning",
    description: "Prophylaxis and exam",
    category: "preventive",
    durationMinutes: 45,
    basePriceCents: 12000,
    active: true,
    createdAt: now(),
  };
  const filling = {
    id: id(),
    name: "Composite Filling",
    description: "Tooth-colored filling",
    category: "restorative",
    durationMinutes: 60,
    basePriceCents: 18500,
    active: true,
    createdAt: now(),
  };
  const amox = {
    id: id(),
    name: "Amoxicillin",
    form: "capsule",
    strengthLabel: "500mg",
    unit: "capsule",
    minDose: 1,
    maxDose: 2,
    maxDailyDose: 6,
    stockQuantity: 120,
    maxDispenseQuantity: 42,
    active: true,
    createdAt: now(),
  };
  const ibu = {
    id: id(),
    name: "Ibuprofen",
    form: "tablet",
    strengthLabel: "200mg",
    unit: "tablet",
    minDose: 1,
    maxDose: 2,
    maxDailyDose: 6,
    stockQuantity: 200,
    maxDispenseQuantity: 60,
    active: true,
    createdAt: now(),
  };

  const start = new Date();
  start.setDate(start.getDate() + 1);
  start.setHours(14, 0, 0, 0);
  const end = new Date(start.getTime() + 45 * 60 * 1000);

  const appointment = {
    id: id(),
    patientId: alice.id,
    dentistId: patel.id,
    treatmentId: cleaning.id,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    status: "scheduled",
    reason: "Six-month checkup",
    createdAt: now(),
  };

  const bill = {
    id: id(),
    patientId: alice.id,
    lineItems: [
      {
        id: id(),
        description: cleaning.name,
        quantity: 1,
        unitPriceCents: cleaning.basePriceCents,
      },
    ],
    status: "issued",
    amountPaidCents: 0,
    issuedAt: now(),
    createdAt: now(),
  };

  const rx = {
    id: id(),
    patientId: alice.id,
    dentistId: patel.id,
    items: [
      {
        id: id(),
        medicineId: amox.id,
        doseAmount: 1,
        doseUnit: "capsule",
        frequencyPerDay: 3,
        durationDays: 7,
        quantity: 21,
        instructions: "Take after meals",
      },
    ],
    status: "active",
    prescribedAt: now(),
    createdAt: now(),
  };

  return {
    patients: [alice, brian],
    dentists: [patel, chen],
    medicines: [amox, ibu],
    prescriptions: [rx],
    treatments: [cleaning, filling],
    appointments: [appointment],
    bills: [bill],
  };
}

export function createStore() {
  let state = seedIfEmpty(load() || emptyState());
  save(state);

  const listeners = new Set();

  function emit() {
    save(state);
    listeners.forEach((fn) => fn(getState()));
  }

  function getState() {
    return structuredClone(state);
  }

  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  function find(list, itemId, label) {
    const item = state[list].find((x) => x.id === itemId);
    if (!item) throw new ClinicError(`${label} not found`, "NOT_FOUND");
    return item;
  }

  function validatePatient(input) {
    if (!input.firstName?.trim() || !input.lastName?.trim()) {
      throw new ClinicError("First and last name are required");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email || "")) {
      throw new ClinicError("Valid email is required", "INVALID_EMAIL");
    }
    if (!input.phone?.trim()) throw new ClinicError("Phone is required");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dateOfBirth || "")) {
      throw new ClinicError("Date of birth must be YYYY-MM-DD", "INVALID_DOB");
    }
    const dob = Date.parse(`${input.dateOfBirth}T00:00:00.000Z`);
    if (Number.isNaN(dob) || dob > Date.now()) {
      throw new ClinicError("Date of birth is invalid", "INVALID_DOB");
    }
  }

  function validateMedicine(input) {
    if (!input.name?.trim()) throw new ClinicError("Medicine name is required");
    if (!input.form?.trim()) throw new ClinicError("Form is required");
    if (!input.strengthLabel?.trim()) throw new ClinicError("Strength is required");
    const nums = ["minDose", "maxDose", "maxDailyDose"];
    for (const key of nums) {
      if (!Number.isFinite(input[key]) || input[key] <= 0) {
        throw new ClinicError(`${key} must be > 0`, "INVALID_DOSE");
      }
    }
    if (input.minDose > input.maxDose) {
      throw new ClinicError("Min dose cannot exceed max dose", "INVALID_DOSE_BOUNDS");
    }
    if (input.maxDailyDose < input.minDose) {
      throw new ClinicError("Max daily dose too low", "INVALID_DOSE_BOUNDS");
    }
    if (!Number.isInteger(input.stockQuantity) || input.stockQuantity < 0) {
      throw new ClinicError("Stock must be a non-negative whole number", "INVALID_QUANTITY");
    }
    if (!Number.isInteger(input.maxDispenseQuantity) || input.maxDispenseQuantity < 1) {
      throw new ClinicError("Max dispense must be ≥ 1", "INVALID_QUANTITY");
    }
  }

  function validateRxItem(item, medicine) {
    if (!medicine.active) throw new ClinicError("Medicine is inactive", "MEDICINE_INACTIVE");
    if (!Number.isFinite(item.doseAmount) || item.doseAmount <= 0) {
      throw new ClinicError("Dose must be > 0", "INVALID_DOSE");
    }
    if (item.doseAmount < medicine.minDose || item.doseAmount > medicine.maxDose) {
      throw new ClinicError(
        `Dose must be between ${medicine.minDose} and ${medicine.maxDose} ${medicine.unit}`,
        "DOSE_OUT_OF_RANGE",
      );
    }
    if (
      !Number.isInteger(item.frequencyPerDay) ||
      item.frequencyPerDay < 1 ||
      item.frequencyPerDay > 24
    ) {
      throw new ClinicError("Frequency must be 1–24 per day", "FREQUENCY_OUT_OF_RANGE");
    }
    if (
      !Number.isInteger(item.durationDays) ||
      item.durationDays < 1 ||
      item.durationDays > 365
    ) {
      throw new ClinicError("Duration must be 1–365 days", "DURATION_OUT_OF_RANGE");
    }
    const daily = item.doseAmount * item.frequencyPerDay;
    if (daily > medicine.maxDailyDose) {
      throw new ClinicError(
        `Daily dose ${daily} exceeds max ${medicine.maxDailyDose}`,
        "DAILY_DOSE_EXCEEDED",
      );
    }
    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      throw new ClinicError("Quantity must be a whole number ≥ 1", "INVALID_QUANTITY");
    }
    if (item.quantity > medicine.maxDispenseQuantity) {
      throw new ClinicError("Quantity exceeds max dispense", "QUANTITY_OUT_OF_RANGE");
    }
    if (item.quantity > medicine.stockQuantity) {
      throw new ClinicError("Quantity exceeds stock", "INSUFFICIENT_STOCK");
    }
    if (medicine.unit === "tablet" || medicine.unit === "capsule") {
      const course = item.frequencyPerDay * item.durationDays;
      if (item.quantity < course) {
        throw new ClinicError(
          `Quantity below course need (${course} ${medicine.unit}s)`,
          "QUANTITY_BELOW_COURSE",
        );
      }
    }
  }

  function intervalsOverlap(aStart, aEnd, bStart, bEnd) {
    const as = Date.parse(aStart);
    const ae = Date.parse(aEnd);
    const bs = Date.parse(bStart);
    const be = Date.parse(bEnd);
    if (!(ae > as && be > bs)) throw new ClinicError("End must be after start");
    return as < be && bs < ae;
  }

  function billTotals(bill) {
    const subtotalCents = bill.lineItems.reduce(
      (s, i) => s + i.quantity * i.unitPriceCents,
      0,
    );
    return {
      subtotalCents,
      amountPaidCents: bill.amountPaidCents,
      balanceDueCents: Math.max(0, subtotalCents - bill.amountPaidCents),
    };
  }

  const api = {
    getState,
    subscribe,
    resetDemo() {
      localStorage.removeItem(STORAGE_KEY);
      state = seedIfEmpty(emptyState());
      emit();
    },

    addPatient(input) {
      validatePatient(input);
      state.patients.push({
        id: id(),
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        email: input.email.trim().toLowerCase(),
        phone: input.phone.trim(),
        dateOfBirth: input.dateOfBirth,
        notes: input.notes?.trim() || undefined,
        createdAt: now(),
      });
      emit();
    },

    deletePatient(patientId) {
      find("patients", patientId, "Patient");
      state.patients = state.patients.filter((p) => p.id !== patientId);
      emit();
    },

    addDentist(input) {
      if (!input.firstName?.trim() || !input.lastName?.trim()) {
        throw new ClinicError("Name is required");
      }
      state.dentists.push({
        id: id(),
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        email: (input.email || "").trim().toLowerCase(),
        phone: (input.phone || "").trim(),
        specialty: (input.specialty || "").trim(),
        active: true,
        createdAt: now(),
      });
      emit();
    },

    deleteDentist(dentistId) {
      find("dentists", dentistId, "Dentist");
      state.dentists = state.dentists.filter((d) => d.id !== dentistId);
      emit();
    },

    addMedicine(input) {
      const parsed = {
        ...input,
        minDose: Number(input.minDose),
        maxDose: Number(input.maxDose),
        maxDailyDose: Number(input.maxDailyDose),
        stockQuantity: Number(input.stockQuantity),
        maxDispenseQuantity: Number(input.maxDispenseQuantity),
      };
      validateMedicine(parsed);
      state.medicines.push({
        id: id(),
        name: parsed.name.trim(),
        form: parsed.form.trim(),
        strengthLabel: parsed.strengthLabel.trim(),
        unit: parsed.unit,
        minDose: parsed.minDose,
        maxDose: parsed.maxDose,
        maxDailyDose: parsed.maxDailyDose,
        stockQuantity: parsed.stockQuantity,
        maxDispenseQuantity: parsed.maxDispenseQuantity,
        active: true,
        createdAt: now(),
      });
      emit();
    },

    deleteMedicine(medicineId) {
      find("medicines", medicineId, "Medicine");
      state.medicines = state.medicines.filter((m) => m.id !== medicineId);
      emit();
    },

    addPrescription(input) {
      find("patients", input.patientId, "Patient");
      if (input.dentistId) find("dentists", input.dentistId, "Dentist");
      const medicine = find("medicines", input.medicineId, "Medicine");
      const item = {
        medicineId: input.medicineId,
        doseAmount: Number(input.doseAmount),
        frequencyPerDay: Number(input.frequencyPerDay),
        durationDays: Number(input.durationDays),
        quantity: Number(input.quantity),
        instructions: input.instructions?.trim() || undefined,
      };
      validateRxItem(item, medicine);
      state.prescriptions.unshift({
        id: id(),
        patientId: input.patientId,
        dentistId: input.dentistId || undefined,
        items: [
          {
            id: id(),
            ...item,
            doseUnit: medicine.unit,
          },
        ],
        status: "draft",
        prescribedAt: now(),
        createdAt: now(),
      });
      emit();
    },

    activatePrescription(rxId) {
      const rx = find("prescriptions", rxId, "Prescription");
      if (rx.status !== "draft") throw new ClinicError("Only drafts can be activated");
      rx.items.forEach((item) => {
        validateRxItem(item, find("medicines", item.medicineId, "Medicine"));
      });
      rx.status = "active";
      emit();
    },

    fulfillPrescription(rxId) {
      const rx = find("prescriptions", rxId, "Prescription");
      if (rx.status !== "active") throw new ClinicError("Only active Rx can be fulfilled");
      rx.items.forEach((item) => {
        const medicine = find("medicines", item.medicineId, "Medicine");
        validateRxItem(item, medicine);
        medicine.stockQuantity -= item.quantity;
      });
      rx.status = "fulfilled";
      emit();
    },

    cancelPrescription(rxId) {
      const rx = find("prescriptions", rxId, "Prescription");
      if (rx.status === "fulfilled") throw new ClinicError("Cannot cancel fulfilled Rx");
      rx.status = "cancelled";
      emit();
    },

    addTreatment(input) {
      if (!input.name?.trim()) throw new ClinicError("Name is required");
      const durationMinutes = Number(input.durationMinutes);
      const basePriceCents = Math.round(Number(input.basePrice) * 100);
      if (!(durationMinutes > 0)) throw new ClinicError("Duration must be > 0");
      if (!(basePriceCents >= 0)) throw new ClinicError("Price invalid");
      state.treatments.push({
        id: id(),
        name: input.name.trim(),
        description: (input.description || "").trim(),
        category: input.category,
        durationMinutes,
        basePriceCents,
        active: true,
        createdAt: now(),
      });
      emit();
    },

    deleteTreatment(treatmentId) {
      find("treatments", treatmentId, "Treatment");
      state.treatments = state.treatments.filter((t) => t.id !== treatmentId);
      emit();
    },

    hasConflict(dentistId, startTime, endTime, excludeId) {
      return state.appointments.some((a) => {
        if (a.dentistId !== dentistId || a.status === "cancelled") return false;
        if (excludeId && a.id === excludeId) return false;
        return intervalsOverlap(startTime, endTime, a.startTime, a.endTime);
      });
    },

    addAppointment(input) {
      find("patients", input.patientId, "Patient");
      find("dentists", input.dentistId, "Dentist");
      const startTime = new Date(input.startTime).toISOString();
      const endTime = new Date(input.endTime).toISOString();
      if (!(Date.parse(endTime) > Date.parse(startTime))) {
        throw new ClinicError("End must be after start");
      }
      if (api.hasConflict(input.dentistId, startTime, endTime)) {
        throw new ClinicError("Dentist already has an overlapping appointment", "CONFLICT");
      }
      state.appointments.push({
        id: id(),
        patientId: input.patientId,
        dentistId: input.dentistId,
        treatmentId: input.treatmentId || undefined,
        startTime,
        endTime,
        status: "scheduled",
        reason: input.reason?.trim() || undefined,
        createdAt: now(),
      });
      emit();
    },

    cancelAppointment(appointmentId) {
      const a = find("appointments", appointmentId, "Appointment");
      a.status = "cancelled";
      emit();
    },

    deleteAppointment(appointmentId) {
      find("appointments", appointmentId, "Appointment");
      state.appointments = state.appointments.filter((a) => a.id !== appointmentId);
      emit();
    },

    addBill(input) {
      find("patients", input.patientId, "Patient");
      const unitPriceCents = Math.round(Number(input.amount) * 100);
      if (!(unitPriceCents >= 0) || !input.description?.trim()) {
        throw new ClinicError("Valid description and amount required");
      }
      state.bills.unshift({
        id: id(),
        patientId: input.patientId,
        lineItems: [
          {
            id: id(),
            description: input.description.trim(),
            quantity: 1,
            unitPriceCents,
          },
        ],
        status: "draft",
        amountPaidCents: 0,
        createdAt: now(),
      });
      emit();
    },

    issueBill(billId) {
      const bill = find("bills", billId, "Bill");
      if (bill.status !== "draft") throw new ClinicError("Only drafts can be issued");
      bill.status = "issued";
      bill.issuedAt = now();
      emit();
    },

    payBill(billId, amountUsd) {
      const bill = find("bills", billId, "Bill");
      if (bill.status === "draft" || bill.status === "void") {
        throw new ClinicError("Cannot pay this bill");
      }
      const cents = Math.round(Number(amountUsd) * 100);
      if (!(cents > 0)) throw new ClinicError("Payment must be > 0");
      bill.amountPaidCents += cents;
      const { subtotalCents, amountPaidCents } = billTotals(bill);
      bill.status =
        amountPaidCents >= subtotalCents
          ? "paid"
          : amountPaidCents > 0
            ? "partially_paid"
            : "issued";
      emit();
    },

    voidBill(billId) {
      const bill = find("bills", billId, "Bill");
      if (bill.status === "paid") throw new ClinicError("Cannot void a paid bill");
      bill.status = "void";
      emit();
    },

    totals: billTotals,
  };

  return api;
}
