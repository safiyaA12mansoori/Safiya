/* Safiya Dental — patient-focused browser store (localStorage). */
(function (global) {
  const STORAGE_KEY = "safiya-bootstrap-clinic-v2";

  class ClinicError extends Error {
    constructor(message, code) {
      super(message);
      this.name = "ClinicError";
      this.code = code || "VALIDATION";
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
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function save(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function emptyState() {
    return {
      patients: [],
      prescriptions: [],
      treatments: [],
      appointments: [],
      bills: [],
    };
  }

  function seedIfEmpty(state) {
    if (state.patients && state.patients.length) return state;

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
      notes: "",
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

    const start = new Date();
    start.setDate(start.getDate() + 1);
    start.setHours(14, 0, 0, 0);
    const end = new Date(start.getTime() + 45 * 60 * 1000);

    const pastStart = new Date();
    pastStart.setDate(pastStart.getDate() - 30);
    pastStart.setHours(10, 0, 0, 0);
    const pastEnd = new Date(pastStart.getTime() + 45 * 60 * 1000);

    const appointments = [
      {
        id: id(),
        patientId: alice.id,
        treatmentId: cleaning.id,
        startTime: pastStart.toISOString(),
        endTime: pastEnd.toISOString(),
        status: "completed",
        reason: "Checkup",
        createdAt: now(),
      },
      {
        id: id(),
        patientId: alice.id,
        treatmentId: cleaning.id,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        status: "scheduled",
        reason: "Six-month checkup",
        createdAt: now(),
      },
    ];

    const prescriptions = [
      {
        id: id(),
        patientId: alice.id,
        medication: "Amoxicillin 500mg",
        dosage: "1 capsule 3x daily",
        duration: "7 days",
        instructions: "Take after meals",
        status: "active",
        prescribedAt: pastStart.toISOString(),
        createdAt: now(),
      },
    ];

    const bills = [
      {
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
        createdAt: pastStart.toISOString(),
      },
    ];

    return {
      patients: [alice, brian],
      treatments: [cleaning, filling],
      appointments: appointments,
      prescriptions: prescriptions,
      bills: bills,
    };
  }

  function createStore() {
    let state = seedIfEmpty(load() || emptyState());
    // migrate away from old dentist/medicine-heavy shape
    state.patients = state.patients || [];
    state.treatments = state.treatments || [];
    state.appointments = state.appointments || [];
    state.prescriptions = state.prescriptions || [];
    state.bills = state.bills || [];
    save(state);

    const listeners = [];

    function emit() {
      save(state);
      listeners.forEach(function (fn) {
        fn(getState());
      });
    }

    function getState() {
      return JSON.parse(JSON.stringify(state));
    }

    function subscribe(fn) {
      listeners.push(fn);
    }

    function find(list, itemId, label) {
      const item = state[list].find(function (x) {
        return x.id === itemId;
      });
      if (!item) throw new ClinicError(label + " not found", "NOT_FOUND");
      return item;
    }

    function validatePatient(input) {
      if (!input.firstName || !String(input.firstName).trim() || !input.lastName || !String(input.lastName).trim()) {
        throw new ClinicError("First and last name are required");
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email || "")) {
        throw new ClinicError("Valid email is required", "INVALID_EMAIL");
      }
      if (!input.phone || !String(input.phone).trim()) throw new ClinicError("Phone is required");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dateOfBirth || "")) {
        throw new ClinicError("Date of birth must be YYYY-MM-DD", "INVALID_DOB");
      }
      const dob = Date.parse(input.dateOfBirth + "T00:00:00.000Z");
      if (Number.isNaN(dob) || dob > Date.now()) {
        throw new ClinicError("Date of birth is invalid", "INVALID_DOB");
      }
    }

    function intervalsOverlap(aStart, aEnd, bStart, bEnd) {
      var as = Date.parse(aStart);
      var ae = Date.parse(aEnd);
      var bs = Date.parse(bStart);
      var be = Date.parse(bEnd);
      if (!(ae > as && be > bs)) throw new ClinicError("End must be after start");
      return as < be && bs < ae;
    }

    function billTotals(bill) {
      var subtotalCents = bill.lineItems.reduce(function (s, i) {
        return s + i.quantity * i.unitPriceCents;
      }, 0);
      return {
        subtotalCents: subtotalCents,
        amountPaidCents: bill.amountPaidCents,
        balanceDueCents: Math.max(0, subtotalCents - bill.amountPaidCents),
      };
    }

    var api = {
      ClinicError: ClinicError,
      getState: getState,
      subscribe: subscribe,
      totals: billTotals,
      resetDemo: function () {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem("safiya-bootstrap-clinic-v1");
        state = seedIfEmpty(emptyState());
        emit();
      },
      getPatientHistory: function (patientId) {
        find("patients", patientId, "Patient");
        return {
          appointments: state.appointments
            .filter(function (a) {
              return a.patientId === patientId;
            })
            .sort(function (a, b) {
              return b.startTime.localeCompare(a.startTime);
            }),
          prescriptions: state.prescriptions
            .filter(function (p) {
              return p.patientId === patientId;
            })
            .sort(function (a, b) {
              return String(b.prescribedAt || b.createdAt).localeCompare(
                String(a.prescribedAt || a.createdAt)
              );
            }),
          bills: state.bills
            .filter(function (b) {
              return b.patientId === patientId;
            })
            .sort(function (a, b) {
              return String(b.createdAt).localeCompare(String(a.createdAt));
            }),
        };
      },
      addPatient: function (input) {
        validatePatient(input);
        state.patients.push({
          id: id(),
          firstName: String(input.firstName).trim(),
          lastName: String(input.lastName).trim(),
          email: String(input.email).trim().toLowerCase(),
          phone: String(input.phone).trim(),
          dateOfBirth: input.dateOfBirth,
          notes: input.notes ? String(input.notes).trim() : "",
          createdAt: now(),
        });
        emit();
      },
      deletePatient: function (patientId) {
        find("patients", patientId, "Patient");
        state.patients = state.patients.filter(function (p) {
          return p.id !== patientId;
        });
        emit();
      },
      addTreatment: function (input) {
        if (!input.name || !String(input.name).trim()) throw new ClinicError("Name is required");
        var durationMinutes = Number(input.durationMinutes);
        var basePriceCents = Math.round(Number(input.basePrice) * 100);
        if (!(durationMinutes > 0)) throw new ClinicError("Duration must be > 0");
        if (!(basePriceCents >= 0)) throw new ClinicError("Price invalid");
        state.treatments.push({
          id: id(),
          name: String(input.name).trim(),
          description: String(input.description || "").trim(),
          category: input.category,
          durationMinutes: durationMinutes,
          basePriceCents: basePriceCents,
          active: true,
          createdAt: now(),
        });
        emit();
      },
      deleteTreatment: function (treatmentId) {
        find("treatments", treatmentId, "Treatment");
        state.treatments = state.treatments.filter(function (t) {
          return t.id !== treatmentId;
        });
        emit();
      },
      hasConflict: function (patientId, startTime, endTime, excludeId) {
        return state.appointments.some(function (a) {
          if (a.patientId !== patientId || a.status === "cancelled") return false;
          if (excludeId && a.id === excludeId) return false;
          return intervalsOverlap(startTime, endTime, a.startTime, a.endTime);
        });
      },
      addAppointment: function (input) {
        find("patients", input.patientId, "Patient");
        var startTime = new Date(input.startTime).toISOString();
        var endTime = new Date(input.endTime).toISOString();
        if (!(Date.parse(endTime) > Date.parse(startTime))) {
          throw new ClinicError("End must be after start");
        }
        if (api.hasConflict(input.patientId, startTime, endTime)) {
          throw new ClinicError("Patient already has an overlapping appointment", "CONFLICT");
        }
        state.appointments.push({
          id: id(),
          patientId: input.patientId,
          treatmentId: input.treatmentId || undefined,
          startTime: startTime,
          endTime: endTime,
          status: "scheduled",
          reason: input.reason ? String(input.reason).trim() : undefined,
          createdAt: now(),
        });
        emit();
      },
      cancelAppointment: function (appointmentId) {
        find("appointments", appointmentId, "Appointment").status = "cancelled";
        emit();
      },
      deleteAppointment: function (appointmentId) {
        find("appointments", appointmentId, "Appointment");
        state.appointments = state.appointments.filter(function (a) {
          return a.id !== appointmentId;
        });
        emit();
      },
      addPrescription: function (input) {
        find("patients", input.patientId, "Patient");
        if (!input.medication || !String(input.medication).trim()) {
          throw new ClinicError("Medication is required");
        }
        if (!input.dosage || !String(input.dosage).trim()) {
          throw new ClinicError("Dosage is required");
        }
        if (!input.duration || !String(input.duration).trim()) {
          throw new ClinicError("Duration is required");
        }
        state.prescriptions.unshift({
          id: id(),
          patientId: input.patientId,
          medication: String(input.medication).trim(),
          dosage: String(input.dosage).trim(),
          duration: String(input.duration).trim(),
          instructions: input.instructions ? String(input.instructions).trim() : "",
          status: "active",
          prescribedAt: now(),
          createdAt: now(),
        });
        emit();
      },
      cancelPrescription: function (rxId) {
        find("prescriptions", rxId, "Prescription").status = "cancelled";
        emit();
      },
      addBill: function (input) {
        find("patients", input.patientId, "Patient");
        var unitPriceCents = Math.round(Number(input.amount) * 100);
        if (!(unitPriceCents >= 0) || !input.description || !String(input.description).trim()) {
          throw new ClinicError("Valid description and amount required");
        }
        state.bills.unshift({
          id: id(),
          patientId: input.patientId,
          lineItems: [
            {
              id: id(),
              description: String(input.description).trim(),
              quantity: 1,
              unitPriceCents: unitPriceCents,
            },
          ],
          status: "draft",
          amountPaidCents: 0,
          createdAt: now(),
        });
        emit();
      },
      issueBill: function (billId) {
        var bill = find("bills", billId, "Bill");
        if (bill.status !== "draft") throw new ClinicError("Only drafts can be issued");
        bill.status = "issued";
        bill.issuedAt = now();
        emit();
      },
      payBill: function (billId, amountUsd) {
        var bill = find("bills", billId, "Bill");
        if (bill.status === "draft" || bill.status === "void") {
          throw new ClinicError("Cannot pay this bill");
        }
        var cents = Math.round(Number(amountUsd) * 100);
        if (!(cents > 0)) throw new ClinicError("Payment must be > 0");
        bill.amountPaidCents += cents;
        var totals = billTotals(bill);
        bill.status =
          totals.amountPaidCents >= totals.subtotalCents
            ? "paid"
            : totals.amountPaidCents > 0
              ? "partially_paid"
              : "issued";
        emit();
      },
      voidBill: function (billId) {
        var bill = find("bills", billId, "Bill");
        if (bill.status === "paid") throw new ClinicError("Cannot void a paid bill");
        bill.status = "void";
        emit();
      },
    };

    return api;
  }

  global.SafiyaClinic = {
    createStore: createStore,
    ClinicError: ClinicError,
  };
})(window);
