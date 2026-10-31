const state = {
  patients: [],
  dentists: [],
  treatments: [],
  appointments: [],
  bills: [],
  medicines: [],
  prescriptions: [],
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

function money(cents) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
  }).format((cents || 0) / 100);
}

function toast(message, isError = false) {
  const el = $("#toast");
  el.hidden = false;
  el.textContent = message;
  el.style.background = isError ? "#9f2d2d" : "#14231f";
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    el.hidden = true;
  }, 3200);
}

async function api(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || `Request failed (${res.status})`);
  }
  return data;
}

function nameOf(person) {
  return person ? `${person.firstName} ${person.lastName}` : "—";
}

function findById(list, id) {
  return list.find((item) => item.id === id);
}

function fillSelect(select, items, mapLabel, includeBlank = false, blankLabel = "Select…") {
  const current = select.value;
  select.innerHTML = "";
  if (includeBlank) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = blankLabel;
    select.appendChild(opt);
  }
  for (const item of items) {
    const opt = document.createElement("option");
    opt.value = item.id;
    opt.textContent = mapLabel(item);
    select.appendChild(opt);
  }
  if ([...select.options].some((o) => o.value === current)) {
    select.value = current;
  }
}

function renderStats() {
  const openBalance = state.bills
    .filter((b) => !["void", "draft", "paid"].includes(b.status))
    .reduce((sum, b) => sum + (b.totals?.balanceDueCents || 0), 0);

  $("#stats").innerHTML = [
    ["Patients", state.patients.length],
    ["Medicines", state.medicines.length],
    [
      "Active Rx",
      state.prescriptions.filter((p) => p.status === "active" || p.status === "draft")
        .length,
    ],
    ["Open balance", money(openBalance)],
  ]
    .map(
      ([label, value]) =>
        `<div class="stat"><span>${label}</span><strong>${value}</strong></div>`,
    )
    .join("");
}

function renderUpcoming() {
  const upcoming = [...state.appointments]
    .filter((a) => a.status !== "cancelled")
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
    .slice(0, 5);

  $("#upcoming").innerHTML = upcoming.length
    ? upcoming
        .map((a) => {
          const patient = findById(state.patients, a.patientId);
          const dentist = findById(state.dentists, a.dentistId);
          return `<article>
            <h3>${nameOf(patient)}</h3>
            <p class="meta">with ${nameOf(dentist)} · ${new Date(a.startTime).toLocaleString()}</p>
            <span class="badge ${a.status}">${a.status}</span>
          </article>`;
        })
        .join("")
    : `<p class="empty">No upcoming appointments.</p>`;
}

function renderOpenBills() {
  const open = state.bills.filter((b) =>
    ["issued", "partially_paid"].includes(b.status),
  );
  $("#open-bills").innerHTML = open.length
    ? open
        .map((b) => {
          const patient = findById(state.patients, b.patientId);
          return `<article>
            <h3>${nameOf(patient)}</h3>
            <p class="meta">${money(b.totals.balanceDueCents)} due · ${b.status}</p>
          </article>`;
        })
        .join("")
    : `<p class="empty">No open balances.</p>`;
}

function renderPatients() {
  $("#patients-list").innerHTML = state.patients.length
    ? state.patients
        .map(
          (p) => `<div class="row">
            <div>
              <h3>${nameOf(p)}</h3>
              <p class="meta">${p.email} · ${p.phone}</p>
            </div>
            <div class="actions">
              <button class="action danger" data-delete-patient="${p.id}">Delete</button>
            </div>
          </div>`,
        )
        .join("")
    : `<p class="empty">No patients yet.</p>`;
}

function renderDentists() {
  $("#dentists-list").innerHTML = state.dentists.length
    ? state.dentists
        .map(
          (d) => `<div class="row">
            <div>
              <h3>${nameOf(d)}</h3>
              <p class="meta">${d.specialty} · ${d.email}</p>
              <span class="badge">${d.active ? "active" : "inactive"}</span>
            </div>
            <div class="actions">
              <button class="action danger" data-delete-dentist="${d.id}">Delete</button>
            </div>
          </div>`,
        )
        .join("")
    : `<p class="empty">No dentists yet.</p>`;
}

function renderTreatments() {
  $("#treatments-list").innerHTML = state.treatments.length
    ? state.treatments
        .map(
          (t) => `<div class="row">
            <div>
              <h3>${t.name}</h3>
              <p class="meta">${t.category} · ${t.durationMinutes} min · ${money(t.basePriceCents)}</p>
            </div>
            <div class="actions">
              <button class="action danger" data-delete-treatment="${t.id}">Delete</button>
            </div>
          </div>`,
        )
        .join("")
    : `<p class="empty">No treatments yet.</p>`;
}

function renderAppointments() {
  $("#appointments-list").innerHTML = state.appointments.length
    ? state.appointments
        .map((a) => {
          const patient = findById(state.patients, a.patientId);
          const dentist = findById(state.dentists, a.dentistId);
          return `<div class="row">
            <div>
              <h3>${nameOf(patient)} → ${nameOf(dentist)}</h3>
              <p class="meta">${new Date(a.startTime).toLocaleString()} – ${new Date(a.endTime).toLocaleTimeString()}</p>
              <span class="badge ${a.status}">${a.status}</span>
            </div>
            <div class="actions">
              ${
                a.status !== "cancelled"
                  ? `<button class="action secondary" data-cancel-appointment="${a.id}">Cancel</button>`
                  : ""
              }
              <button class="action danger" data-delete-appointment="${a.id}">Delete</button>
            </div>
          </div>`;
        })
        .join("")
    : `<p class="empty">No appointments yet.</p>`;
}

function renderBills() {
  $("#bills-list").innerHTML = state.bills.length
    ? state.bills
        .map((b) => {
          const patient = findById(state.patients, b.patientId);
          return `<div class="row">
            <div>
              <h3>${nameOf(patient)}</h3>
              <p class="meta">${money(b.totals.subtotalCents)} total · ${money(b.totals.balanceDueCents)} due</p>
              <span class="badge ${b.status}">${b.status}</span>
            </div>
            <div class="actions">
              ${
                b.status === "draft"
                  ? `<button class="action secondary" data-issue-bill="${b.id}">Issue</button>`
                  : ""
              }
              ${
                ["issued", "partially_paid"].includes(b.status)
                  ? `<button class="action" data-pay-bill="${b.id}">Record payment</button>`
                  : ""
              }
              ${
                !["paid", "void"].includes(b.status)
                  ? `<button class="action danger" data-void-bill="${b.id}">Void</button>`
                  : ""
              }
            </div>
          </div>`;
        })
        .join("")
    : `<p class="empty">No bills yet.</p>`;
}

function renderMedicines() {
  $("#medicines-list").innerHTML = state.medicines.length
    ? state.medicines
        .map(
          (m) => `<div class="row">
            <div>
              <h3>${m.name}</h3>
              <p class="meta">${m.strengthLabel} · ${m.form} · dose ${m.minDose}–${m.maxDose} ${m.unit}/dose · stock ${m.stockQuantity}</p>
              <span class="badge">${m.active ? "active" : "inactive"}</span>
            </div>
            <div class="actions">
              <button class="action danger" data-delete-medicine="${m.id}">Delete</button>
            </div>
          </div>`,
        )
        .join("")
    : `<p class="empty">No medicines yet.</p>`;
}

function renderPrescriptions() {
  $("#prescriptions-list").innerHTML = state.prescriptions.length
    ? state.prescriptions
        .map((p) => {
          const patient = findById(state.patients, p.patientId);
          const lines = p.items
            .map((item) => {
              const med = findById(state.medicines, item.medicineId);
              return `${med?.name || "Medicine"}: ${item.doseAmount} ${item.doseUnit} × ${item.frequencyPerDay}/day × ${item.durationDays}d (qty ${item.quantity})`;
            })
            .join("; ");
          return `<div class="row">
            <div>
              <h3>${nameOf(patient)}</h3>
              <p class="meta">${lines}</p>
              <span class="badge ${p.status}">${p.status}</span>
            </div>
            <div class="actions">
              ${
                p.status === "draft"
                  ? `<button class="action secondary" data-activate-rx="${p.id}">Activate</button>`
                  : ""
              }
              ${
                p.status === "active"
                  ? `<button class="action" data-fulfill-rx="${p.id}">Fulfill</button>`
                  : ""
              }
              ${
                p.status !== "fulfilled" && p.status !== "cancelled"
                  ? `<button class="action danger" data-cancel-rx="${p.id}">Cancel</button>`
                  : ""
              }
            </div>
          </div>`;
        })
        .join("")
    : `<p class="empty">No prescriptions yet.</p>`;
}

function refreshSelects() {
  fillSelect($('#appointment-form [name="patientId"]'), state.patients, nameOf);
  fillSelect($('#appointment-form [name="dentistId"]'), state.dentists, nameOf);
  fillSelect(
    $('#appointment-form [name="treatmentId"]'),
    state.treatments,
    (t) => `${t.name} (${money(t.basePriceCents)})`,
    true,
    "Optional",
  );
  fillSelect($('#bill-form [name="patientId"]'), state.patients, nameOf);
  fillSelect(
    $('#bill-form [name="appointmentId"]'),
    state.appointments.filter((a) => a.status !== "cancelled"),
    (a) => {
      const patient = findById(state.patients, a.patientId);
      return `${nameOf(patient)} · ${new Date(a.startTime).toLocaleString()}`;
    },
    true,
    "None",
  );
  fillSelect($('#prescription-form [name="patientId"]'), state.patients, nameOf);
  fillSelect(
    $('#prescription-form [name="dentistId"]'),
    state.dentists,
    nameOf,
    true,
    "Optional",
  );
  fillSelect(
    $('#prescription-form [name="medicineId"]'),
    state.medicines.filter((m) => m.active),
    (m) => `${m.name} (${m.strengthLabel})`,
  );
}

async function refresh() {
  const [patients, dentists, treatments, appointments, bills, medicines, prescriptions] =
    await Promise.all([
      api("/patients"),
      api("/dentists"),
      api("/treatments"),
      api("/appointments"),
      api("/bills"),
      api("/medicines"),
      api("/prescriptions"),
    ]);
  Object.assign(state, {
    patients,
    dentists,
    treatments,
    appointments,
    bills,
    medicines,
    prescriptions,
  });
  renderStats();
  renderUpcoming();
  renderOpenBills();
  renderPatients();
  renderDentists();
  renderTreatments();
  renderAppointments();
  renderBills();
  renderMedicines();
  renderPrescriptions();
  refreshSelects();
}

function toIsoLocal(value) {
  const d = new Date(value);
  return d.toISOString();
}

async function checkConflict() {
  const form = $("#appointment-form");
  const dentistId = form.dentistId.value;
  const start = form.startTime.value;
  const end = form.endTime.value;
  const hint = $("#conflict-hint");
  if (!dentistId || !start || !end) {
    hint.hidden = true;
    return;
  }
  try {
    const result = await api("/appointments/check-conflict", {
      method: "POST",
      body: JSON.stringify({
        dentistId,
        startTime: toIsoLocal(start),
        endTime: toIsoLocal(end),
      }),
    });
    if (result.hasConflict) {
      hint.hidden = false;
      hint.textContent = "Conflict: this dentist already has an overlapping appointment.";
    } else {
      hint.hidden = true;
    }
  } catch {
    hint.hidden = true;
  }
}

$$(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    $$(".tab").forEach((t) => t.classList.remove("is-active"));
    $$(".view").forEach((v) => v.classList.remove("is-active"));
    tab.classList.add("is-active");
    $(`#view-${tab.dataset.view}`).classList.add("is-active");
  });
});

$("#patient-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  try {
    await api("/patients", {
      method: "POST",
      body: JSON.stringify(Object.fromEntries(fd.entries())),
    });
    e.target.reset();
    toast("Patient saved");
    await refresh();
  } catch (err) {
    toast(err.message, true);
  }
});

$("#dentist-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  try {
    await api("/dentists", {
      method: "POST",
      body: JSON.stringify(Object.fromEntries(fd.entries())),
    });
    e.target.reset();
    toast("Dentist saved");
    await refresh();
  } catch (err) {
    toast(err.message, true);
  }
});

$("#treatment-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const payload = Object.fromEntries(fd.entries());
  payload.durationMinutes = Number(payload.durationMinutes);
  payload.basePriceCents = Math.round(Number(payload.basePrice) * 100);
  delete payload.basePrice;
  try {
    await api("/treatments", { method: "POST", body: JSON.stringify(payload) });
    e.target.reset();
    toast("Treatment saved");
    await refresh();
  } catch (err) {
    toast(err.message, true);
  }
});

$("#appointment-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const payload = Object.fromEntries(fd.entries());
  payload.startTime = toIsoLocal(payload.startTime);
  payload.endTime = toIsoLocal(payload.endTime);
  if (!payload.treatmentId) delete payload.treatmentId;
  try {
    await api("/appointments", { method: "POST", body: JSON.stringify(payload) });
    e.target.reset();
    $("#conflict-hint").hidden = true;
    toast("Appointment booked");
    await refresh();
  } catch (err) {
    toast(err.message, true);
  }
});

["dentistId", "startTime", "endTime"].forEach((name) => {
  $(`#appointment-form [name="${name}"]`).addEventListener("change", checkConflict);
});

$("#medicine-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const payload = Object.fromEntries(fd.entries());
  payload.minDose = Number(payload.minDose);
  payload.maxDose = Number(payload.maxDose);
  payload.maxDailyDose = Number(payload.maxDailyDose);
  payload.stockQuantity = Number(payload.stockQuantity);
  payload.maxDispenseQuantity = Number(payload.maxDispenseQuantity);
  if (!payload.genericName) delete payload.genericName;
  try {
    await api("/medicines", { method: "POST", body: JSON.stringify(payload) });
    e.target.reset();
    toast("Medicine saved");
    await refresh();
  } catch (err) {
    toast(err.message, true);
  }
});

$("#prescription-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const payload = {
    patientId: fd.get("patientId"),
    items: [
      {
        medicineId: fd.get("medicineId"),
        doseAmount: Number(fd.get("doseAmount")),
        frequencyPerDay: Number(fd.get("frequencyPerDay")),
        durationDays: Number(fd.get("durationDays")),
        quantity: Number(fd.get("quantity")),
        instructions: String(fd.get("instructions") || "").trim() || undefined,
      },
    ],
  };
  const dentistId = fd.get("dentistId");
  if (dentistId) payload.dentistId = dentistId;
  try {
    await api("/prescriptions", { method: "POST", body: JSON.stringify(payload) });
    e.target.reset();
    toast("Prescription draft created");
    await refresh();
  } catch (err) {
    toast(err.message, true);
  }
});

$("#bill-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const payload = {
    patientId: fd.get("patientId"),
    fromAppointmentTreatment: fd.get("fromAppointmentTreatment") === "on",
  };
  const appointmentId = fd.get("appointmentId");
  if (appointmentId) payload.appointmentId = appointmentId;
  const description = String(fd.get("description") || "").trim();
  const amount = Number(fd.get("amount") || 0);
  if (description && amount >= 0) {
    payload.lineItems = [
      {
        description,
        quantity: 1,
        unitPriceCents: Math.round(amount * 100),
      },
    ];
  }
  try {
    await api("/bills", { method: "POST", body: JSON.stringify(payload) });
    e.target.reset();
    e.target.fromAppointmentTreatment.checked = true;
    toast("Draft bill created");
    await refresh();
  } catch (err) {
    toast(err.message, true);
  }
});

document.body.addEventListener("click", async (e) => {
  const t = e.target;
  if (!(t instanceof HTMLElement)) return;
  try {
    if (t.dataset.deletePatient) {
      await api(`/patients/${t.dataset.deletePatient}`, { method: "DELETE" });
      toast("Patient deleted");
    } else if (t.dataset.deleteDentist) {
      await api(`/dentists/${t.dataset.deleteDentist}`, { method: "DELETE" });
      toast("Dentist deleted");
    } else if (t.dataset.deleteTreatment) {
      await api(`/treatments/${t.dataset.deleteTreatment}`, { method: "DELETE" });
      toast("Treatment deleted");
    } else if (t.dataset.cancelAppointment) {
      await api(`/appointments/${t.dataset.cancelAppointment}/cancel`, {
        method: "POST",
      });
      toast("Appointment cancelled");
    } else if (t.dataset.deleteAppointment) {
      await api(`/appointments/${t.dataset.deleteAppointment}`, { method: "DELETE" });
      toast("Appointment deleted");
    } else if (t.dataset.issueBill) {
      await api(`/bills/${t.dataset.issueBill}/issue`, { method: "POST" });
      toast("Bill issued");
    } else if (t.dataset.payBill) {
      const amount = prompt("Payment amount in USD?");
      if (amount == null) return;
      await api(`/bills/${t.dataset.payBill}/payments`, {
        method: "POST",
        body: JSON.stringify({ amountCents: Math.round(Number(amount) * 100) }),
      });
      toast("Payment recorded");
    } else if (t.dataset.voidBill) {
      await api(`/bills/${t.dataset.voidBill}/void`, { method: "POST" });
      toast("Bill voided");
    } else if (t.dataset.deleteMedicine) {
      await api(`/medicines/${t.dataset.deleteMedicine}`, { method: "DELETE" });
      toast("Medicine deleted");
    } else if (t.dataset.activateRx) {
      await api(`/prescriptions/${t.dataset.activateRx}/activate`, {
        method: "POST",
      });
      toast("Prescription activated");
    } else if (t.dataset.fulfillRx) {
      await api(`/prescriptions/${t.dataset.fulfillRx}/fulfill`, {
        method: "POST",
      });
      toast("Prescription fulfilled");
    } else if (t.dataset.cancelRx) {
      await api(`/prescriptions/${t.dataset.cancelRx}/cancel`, {
        method: "POST",
      });
      toast("Prescription cancelled");
    } else {
      return;
    }
    await refresh();
  } catch (err) {
    toast(err.message, true);
  }
});

refresh().catch((err) => toast(err.message, true));
