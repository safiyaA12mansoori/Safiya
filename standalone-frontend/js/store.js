/* Safiya Dental — patient-focused browser store (localStorage). */
(function (global) {
  const STORAGE_KEY = "safiya-bootstrap-clinic-v4";

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

  function splitName(fullName) {
    var parts = String(fullName || "")
      .trim()
      .split(/\s+/);
    if (!parts.length || !parts[0]) return { firstName: "", lastName: "" };
    if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] };
    return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
  }

  function patientDisplayName(p) {
    if (!p) return "—";
    if (p.patientName) return p.patientName;
    return ((p.firstName || "") + " " + (p.lastName || "")).trim() || "—";
  }

  function seedIfEmpty(state) {
    if (state.patients && state.patients.length) return state;

    var alice = {
      id: id(),
      patientName: "Alice Nguyen",
      firstName: "Alice",
      lastName: "Nguyen",
      address: "12 Maple Street, Suite 4",
      email: "alice.nguyen@example.com",
      phone: "+1-555-0101",
      notes: "Prefers morning appointments",
      createdAt: now(),
    };
    var brian = {
      id: id(),
      patientName: "Brian Okoye",
      firstName: "Brian",
      lastName: "Okoye",
      address: "88 Oak Avenue",
      email: "brian.okoye@example.com",
      phone: "+1-555-0102",
      notes: "",
      createdAt: now(),
    };
    var cleaning = {
      id: id(),
      name: "Routine Cleaning",
      description: "Prophylaxis and exam",
      category: "preventive",
      durationMinutes: 45,
      basePriceCents: 12000,
      active: true,
      createdAt: now(),
    };
    var filling = {
      id: id(),
      name: "Composite Filling",
      description: "Tooth-colored filling",
      category: "restorative",
      durationMinutes: 60,
      basePriceCents: 18500,
      active: true,
      createdAt: now(),
    };

    var tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0);
    var tomorrowEnd = new Date(tomorrow.getTime() + 45 * 60 * 1000);

    var todayMorning = new Date();
    todayMorning.setHours(9, 0, 0, 0);
    var todayMorningEnd = new Date(todayMorning.getTime() + 45 * 60 * 1000);

    var todayNoon = new Date();
    todayNoon.setHours(11, 30, 0, 0);
    var todayNoonEnd = new Date(todayNoon.getTime() + 45 * 60 * 1000);

    var pastStart = new Date();
    pastStart.setDate(pastStart.getDate() - 7);
    pastStart.setHours(10, 0, 0, 0);
    var pastEnd = new Date(pastStart.getTime() + 45 * 60 * 1000);

    var noShowStart = new Date();
    noShowStart.setDate(noShowStart.getDate() - 2);
    noShowStart.setHours(16, 0, 0, 0);
    var noShowEnd = new Date(noShowStart.getTime() + 45 * 60 * 1000);

    var appointments = [
      {
        id: id(),
        patientId: alice.id,
        treatmentId: cleaning.id,
        startTime: pastStart.toISOString(),
        endTime: pastEnd.toISOString(),
        status: "completed",
        reason: "Checkup",
        allottedTime: "10:00",
        createdAt: now(),
      },
      {
        id: id(),
        patientId: brian.id,
        treatmentId: filling.id,
        startTime: noShowStart.toISOString(),
        endTime: noShowEnd.toISOString(),
        status: "no_show",
        reason: "Filling",
        allottedTime: "16:00",
        followUpNote: "Patient did not come",
        markedAt: now(),
        createdAt: now(),
      },
      {
        id: id(),
        patientId: alice.id,
        treatmentId: cleaning.id,
        startTime: todayMorning.toISOString(),
        endTime: todayMorningEnd.toISOString(),
        status: "scheduled",
        reason: "Morning cleaning",
        allottedTime: "09:00",
        createdAt: now(),
      },
      {
        id: id(),
        patientId: brian.id,
        treatmentId: cleaning.id,
        startTime: todayNoon.toISOString(),
        endTime: todayNoonEnd.toISOString(),
        status: "scheduled",
        reason: "Follow-up visit",
        allottedTime: "11:30",
        createdAt: now(),
      },
      {
        id: id(),
        patientId: alice.id,
        treatmentId: cleaning.id,
        startTime: tomorrow.toISOString(),
        endTime: tomorrowEnd.toISOString(),
        status: "scheduled",
        reason: "Six-month checkup",
        allottedTime: "14:00",
        createdAt: now(),
      },
    ];

    var prescriptions = [
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

    var bills = [
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
    var state = seedIfEmpty(load() || emptyState());
    state.patients = state.patients || [];
    state.treatments = state.treatments || [];
    state.appointments = state.appointments || [];
    state.prescriptions = state.prescriptions || [];
    state.bills = state.bills || [];
    save(state);

    var listeners = [];

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
      var item = state[list].find(function (x) {
        return x.id === itemId;
      });
      if (!item) throw new ClinicError(label + " not found", "NOT_FOUND");
      return item;
    }

    function validatePatient(input) {
      var name = String(input.patientName || "").trim();
      if (!name) {
        var fn = String(input.firstName || "").trim();
        var ln = String(input.lastName || "").trim();
        if (fn && ln) name = fn + " " + ln;
      }
      if (!name) throw new ClinicError("Patient name is required");
      if (!input.address || !String(input.address).trim()) {
        throw new ClinicError("Address is required");
      }
      if (!input.phone || !String(input.phone).trim()) {
        throw new ClinicError("Phone number is required");
      }
      var email = String(input.email || "").trim();
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new ClinicError("Email is invalid", "INVALID_EMAIL");
      }
      return name;
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

    function findOrCreatePatient(input) {
      var name = validatePatient(input);
      var phone = String(input.phone).trim();
      var existing = state.patients.find(function (p) {
        return (
          String(p.phone).trim() === phone &&
          patientDisplayName(p).toLowerCase() === name.toLowerCase()
        );
      });
      if (existing) {
        existing.address = String(input.address).trim();
        if (input.email) existing.email = String(input.email).trim().toLowerCase();
        return existing;
      }
      var parts = splitName(name);
      var patient = {
        id: id(),
        patientName: name,
        firstName: parts.firstName,
        lastName: parts.lastName,
        address: String(input.address).trim(),
        email: input.email ? String(input.email).trim().toLowerCase() : "",
        phone: phone,
        notes: input.notes ? String(input.notes).trim() : "",
        createdAt: now(),
      };
      state.patients.push(patient);
      return patient;
    }

    function parseTimeSlot(slot) {
      var m = String(slot || "").match(/^(\d{1,2}):(\d{2})$/);
      if (!m) throw new ClinicError("Choose an allotted time slot");
      var h = Number(m[1]);
      var min = Number(m[2]);
      if (h < 0 || h > 23 || min < 0 || min > 59) {
        throw new ClinicError("Invalid time slot");
      }
      return { hours: h, minutes: min };
    }

    function todayDateString() {
      var d = new Date();
      var y = d.getFullYear();
      var m = String(d.getMonth() + 1).padStart(2, "0");
      var day = String(d.getDate()).padStart(2, "0");
      return y + "-" + m + "-" + day;
    }

    var TIME_SLOTS = [
      "09:00",
      "09:30",
      "10:00",
      "10:30",
      "11:00",
      "11:30",
      "12:00",
      "13:00",
      "13:30",
      "14:00",
      "14:30",
      "15:00",
      "15:30",
      "16:00",
      "16:30",
      "17:00",
    ];

    var api = {
      ClinicError: ClinicError,
      TIME_SLOTS: TIME_SLOTS,
      todayDateString: todayDateString,
      patientDisplayName: patientDisplayName,
      getState: getState,
      subscribe: subscribe,
      totals: billTotals,
      resetDemo: function () {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem("safiya-bootstrap-clinic-v1");
        localStorage.removeItem("safiya-bootstrap-clinic-v2");
        localStorage.removeItem("safiya-bootstrap-clinic-v3");
        state = seedIfEmpty(emptyState());
        emit();
      },
      listNoShows: function () {
        return state.appointments
          .filter(function (a) {
            return a.status === "no_show";
          })
          .sort(function (a, b) {
            return b.startTime.localeCompare(a.startTime);
          });
      },
      listTodayAppointments: function () {
        var today = new Date().toDateString();
        return state.appointments
          .filter(function (a) {
            return new Date(a.startTime).toDateString() === today;
          })
          .sort(function (a, b) {
            return a.startTime.localeCompare(b.startTime);
          });
      },
      markCompleted: function (appointmentId) {
        var a = find("appointments", appointmentId, "Appointment");
        if (a.status === "cancelled") {
          throw new ClinicError("Cancelled appointments cannot be completed");
        }
        a.status = "completed";
        a.markedAt = now();
        emit();
      },
      markNoShow: function (appointmentId, note) {
        var a = find("appointments", appointmentId, "Appointment");
        if (a.status === "cancelled") {
          throw new ClinicError("Cancelled appointments cannot be marked no-show");
        }
        a.status = "no_show";
        a.followUpNote = note ? String(note).trim() : "Patient did not come";
        a.markedAt = now();
        emit();
      },
      getPatientHistory: function (patientId) {
        find("patients", patientId, "Patient");
        var all = state.appointments
          .filter(function (a) {
            return a.patientId === patientId;
          })
          .sort(function (a, b) {
            return b.startTime.localeCompare(a.startTime);
          });
        return {
          appointments: all.filter(function (a) {
            return a.status !== "no_show";
          }),
          noShows: all.filter(function (a) {
            return a.status === "no_show";
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
        var name = validatePatient(input);
        var parts = splitName(name);
        state.patients.push({
          id: id(),
          patientName: name,
          firstName: parts.firstName,
          lastName: parts.lastName,
          address: String(input.address).trim(),
          email: input.email ? String(input.email).trim().toLowerCase() : "",
          phone: String(input.phone).trim(),
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
        var patient;
        if (input.patientName && input.phone && input.address) {
          patient = findOrCreatePatient(input);
        } else {
          patient = find("patients", input.patientId, "Patient");
        }

        var start;
        var end;
        var allotted = input.timeSlot || input.allottedTime;

        if (allotted) {
          var slot = parseTimeSlot(allotted);
          var dateStr = input.appointmentDate || todayDateString();
          start = new Date(dateStr + "T00:00:00");
          if (Number.isNaN(start.getTime())) {
            throw new ClinicError("Invalid appointment date");
          }
          start.setHours(slot.hours, slot.minutes, 0, 0);
          end = new Date(start.getTime() + 30 * 60 * 1000);
        } else {
          start = new Date(input.startTime);
          end = new Date(input.endTime);
        }

        var startTime = start.toISOString();
        var endTime = end.toISOString();
        if (!(Date.parse(endTime) > Date.parse(startTime))) {
          throw new ClinicError("End must be after start");
        }
        if (api.hasConflict(patient.id, startTime, endTime)) {
          throw new ClinicError("Patient already has an overlapping appointment", "CONFLICT");
        }
        state.appointments.push({
          id: id(),
          patientId: patient.id,
          treatmentId: input.treatmentId || undefined,
          startTime: startTime,
          endTime: endTime,
          status: "scheduled",
          reason: input.reason ? String(input.reason).trim() : undefined,
          allottedTime: allotted || undefined,
          addressSnapshot: patient.address,
          phoneSnapshot: patient.phone,
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
