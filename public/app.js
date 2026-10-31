const state = {
  patients: [],
  dentists: [],
  treatments: [],
  appointments: [],
  bills: [],
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
    ["Dentists", state.dentists.length],
    ["Appointments", state.appointments.filter((a) => a.status !== "cancelled").length],
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
}

async function refresh() {
  const [patients, dentists, treatments, appointments, bills] = await Promise.all([
    api("/patients"),
    api("/dentists"),
    api("/treatments"),
    api("/appointments"),
    api("/bills"),
  ]);
  Object.assign(state, { patients, dentists, treatments, appointments, bills });
  renderStats();
  renderUpcoming();
  renderOpenBills();
  renderPatients();
  renderDentists();
  renderTreatments();
  renderAppointments();
  renderBills();
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
    } else {
      return;
    }
    await refresh();
  } catch (err) {
    toast(err.message, true);
  }
});

refresh().catch((err) => toast(err.message, true));
