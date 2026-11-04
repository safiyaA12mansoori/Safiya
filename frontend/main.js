import "./styles.css";
import { ClinicError, createStore } from "./store.js";

const store = createStore();
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

function nameOf(person) {
  return person ? `${person.firstName} ${person.lastName}` : "—";
}

function findById(list, id) {
  return list.find((item) => item.id === id);
}

function fillSelect(select, items, mapLabel, includeBlank = false, blankLabel = "Select…") {
  if (!select) return;
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
  if ([...select.options].some((o) => o.value === current)) select.value = current;
}

function render(state) {
  const openBalance = state.bills
    .filter((b) => ["issued", "partially_paid"].includes(b.status))
    .reduce((sum, b) => sum + store.totals(b).balanceDueCents, 0);

  $("#stats").innerHTML = [
    ["Patients", state.patients.length],
    ["Medicines", state.medicines.length],
    [
      "Active Rx",
      state.prescriptions.filter((p) => ["draft", "active"].includes(p.status)).length,
    ],
    ["Open balance", money(openBalance)],
  ]
    .map(([label, value]) => `<div class="stat"><span>${label}</span><strong>${value}</strong></div>`)
    .join("");

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

  const openBills = state.bills.filter((b) =>
    ["issued", "partially_paid"].includes(b.status),
  );
  const activeRx = state.prescriptions.filter((p) => p.status === "active").slice(0, 3);
  $("#open-side").innerHTML = [
    ...openBills.map((b) => {
      const patient = findById(state.patients, b.patientId);
      return `<article>
        <h3>${nameOf(patient)}</h3>
        <p class="meta">${money(store.totals(b).balanceDueCents)} due</p>
      </article>`;
    }),
    ...activeRx.map((p) => {
      const patient = findById(state.patients, p.patientId);
      return `<article>
        <h3>Rx · ${nameOf(patient)}</h3>
        <p class="meta">${p.items.length} item(s) · ${p.status}</p>
      </article>`;
    }),
  ].join("") || `<p class="empty">Nothing open.</p>`;

  $("#patients-list").innerHTML = state.patients.length
    ? state.patients
        .map(
          (p) => `<div class="row"><div><h3>${nameOf(p)}</h3><p class="meta">${p.email} · ${p.phone}</p></div>
          <div class="actions"><button class="action danger" data-delete-patient="${p.id}">Delete</button></div></div>`,
        )
        .join("")
    : `<p class="empty">No patients yet.</p>`;

  $("#dentists-list").innerHTML = state.dentists.length
    ? state.dentists
        .map(
          (d) => `<div class="row"><div><h3>${nameOf(d)}</h3><p class="meta">${d.specialty}</p></div>
          <div class="actions"><button class="action danger" data-delete-dentist="${d.id}">Delete</button></div></div>`,
        )
        .join("")
    : `<p class="empty">No dentists yet.</p>`;

  $("#medicines-list").innerHTML = state.medicines.length
    ? state.medicines
        .map(
          (m) => `<div class="row"><div>
            <h3>${m.name}</h3>
            <p class="meta">${m.strengthLabel} · dose ${m.minDose}–${m.maxDose} ${m.unit} · stock ${m.stockQuantity}</p>
          </div>
          <div class="actions"><button class="action danger" data-delete-medicine="${m.id}">Delete</button></div></div>`,
        )
        .join("")
    : `<p class="empty">No medicines yet.</p>`;

  $("#prescriptions-list").innerHTML = state.prescriptions.length
    ? state.prescriptions
        .map((p) => {
          const patient = findById(state.patients, p.patientId);
          const lines = p.items
            .map((item) => {
              const med = findById(state.medicines, item.medicineId);
              return `${med?.name || "Med"}: ${item.doseAmount} ${item.doseUnit} × ${item.frequencyPerDay}/day × ${item.durationDays}d (qty ${item.quantity})`;
            })
            .join("; ");
          return `<div class="row"><div>
            <h3>${nameOf(patient)}</h3>
            <p class="meta">${lines}</p>
            <span class="badge ${p.status}">${p.status}</span>
          </div>
          <div class="actions">
            ${p.status === "draft" ? `<button class="action secondary" data-activate-rx="${p.id}">Activate</button>` : ""}
            ${p.status === "active" ? `<button class="action" data-fulfill-rx="${p.id}">Fulfill</button>` : ""}
            ${!["fulfilled", "cancelled"].includes(p.status) ? `<button class="action danger" data-cancel-rx="${p.id}">Cancel</button>` : ""}
          </div></div>`;
        })
        .join("")
    : `<p class="empty">No prescriptions yet.</p>`;

  $("#appointments-list").innerHTML = state.appointments.length
    ? state.appointments
        .map((a) => {
          const patient = findById(state.patients, a.patientId);
          const dentist = findById(state.dentists, a.dentistId);
          return `<div class="row"><div>
            <h3>${nameOf(patient)} → ${nameOf(dentist)}</h3>
            <p class="meta">${new Date(a.startTime).toLocaleString()}</p>
            <span class="badge ${a.status}">${a.status}</span>
          </div>
          <div class="actions">
            ${a.status !== "cancelled" ? `<button class="action secondary" data-cancel-appointment="${a.id}">Cancel</button>` : ""}
            <button class="action danger" data-delete-appointment="${a.id}">Delete</button>
          </div></div>`;
        })
        .join("")
    : `<p class="empty">No appointments yet.</p>`;

  $("#treatments-list").innerHTML = state.treatments.length
    ? state.treatments
        .map(
          (t) => `<div class="row"><div>
            <h3>${t.name}</h3>
            <p class="meta">${t.category} · ${t.durationMinutes} min · ${money(t.basePriceCents)}</p>
          </div>
          <div class="actions"><button class="action danger" data-delete-treatment="${t.id}">Delete</button></div></div>`,
        )
        .join("")
    : `<p class="empty">No treatments yet.</p>`;

  $("#bills-list").innerHTML = state.bills.length
    ? state.bills
        .map((b) => {
          const patient = findById(state.patients, b.patientId);
          const totals = store.totals(b);
          return `<div class="row"><div>
            <h3>${nameOf(patient)}</h3>
            <p class="meta">${money(totals.subtotalCents)} total · ${money(totals.balanceDueCents)} due</p>
            <span class="badge ${b.status}">${b.status}</span>
          </div>
          <div class="actions">
            ${b.status === "draft" ? `<button class="action secondary" data-issue-bill="${b.id}">Issue</button>` : ""}
            ${["issued", "partially_paid"].includes(b.status) ? `<button class="action" data-pay-bill="${b.id}">Pay</button>` : ""}
            ${!["paid", "void"].includes(b.status) ? `<button class="action danger" data-void-bill="${b.id}">Void</button>` : ""}
          </div></div>`;
        })
        .join("")
    : `<p class="empty">No bills yet.</p>`;

  fillSelect($('#prescription-form [name="patientId"]'), state.patients, nameOf);
  fillSelect($('#prescription-form [name="dentistId"]'), state.dentists, nameOf, true, "Optional");
  fillSelect(
    $('#prescription-form [name="medicineId"]'),
    state.medicines.filter((m) => m.active),
    (m) => `${m.name} (${m.strengthLabel})`,
  );
  fillSelect($('#appointment-form [name="patientId"]'), state.patients, nameOf);
  fillSelect($('#appointment-form [name="dentistId"]'), state.dentists, nameOf);
  fillSelect(
    $('#appointment-form [name="treatmentId"]'),
    state.treatments,
    (t) => t.name,
    true,
    "Optional",
  );
  fillSelect($('#bill-form [name="patientId"]'), state.patients, nameOf);
}

function run(fn) {
  try {
    fn();
    toast("Saved");
  } catch (err) {
    toast(err instanceof ClinicError || err instanceof Error ? err.message : "Error", true);
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

$("#patient-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target).entries());
  run(() => {
    store.addPatient(data);
    e.target.reset();
  });
});

$("#dentist-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target).entries());
  run(() => {
    store.addDentist(data);
    e.target.reset();
  });
});

$("#medicine-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target).entries());
  run(() => {
    store.addMedicine(data);
    e.target.reset();
  });
});

$("#prescription-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target).entries());
  run(() => {
    store.addPrescription(data);
    e.target.reset();
  });
});

$("#treatment-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target).entries());
  run(() => {
    store.addTreatment(data);
    e.target.reset();
  });
});

$("#appointment-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target).entries());
  run(() => {
    store.addAppointment(data);
    e.target.reset();
    $("#conflict-hint").hidden = true;
  });
});

["dentistId", "startTime", "endTime"].forEach((name) => {
  $(`#appointment-form [name="${name}"]`).addEventListener("change", () => {
    const form = $("#appointment-form");
    const hint = $("#conflict-hint");
    if (!form.dentistId.value || !form.startTime.value || !form.endTime.value) {
      hint.hidden = true;
      return;
    }
    try {
      const conflict = store.hasConflict(
        form.dentistId.value,
        new Date(form.startTime.value).toISOString(),
        new Date(form.endTime.value).toISOString(),
      );
      hint.hidden = !conflict;
      hint.textContent = conflict
        ? "Conflict: this dentist already has an overlapping appointment."
        : "";
    } catch {
      hint.hidden = true;
    }
  });
});

$("#bill-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target).entries());
  run(() => {
    store.addBill(data);
    e.target.reset();
  });
});

document.body.addEventListener("click", (e) => {
  const t = e.target;
  if (!(t instanceof HTMLElement)) return;
  run(() => {
    if (t.dataset.deletePatient) store.deletePatient(t.dataset.deletePatient);
    else if (t.dataset.deleteDentist) store.deleteDentist(t.dataset.deleteDentist);
    else if (t.dataset.deleteMedicine) store.deleteMedicine(t.dataset.deleteMedicine);
    else if (t.dataset.deleteTreatment) store.deleteTreatment(t.dataset.deleteTreatment);
    else if (t.dataset.activateRx) store.activatePrescription(t.dataset.activateRx);
    else if (t.dataset.fulfillRx) store.fulfillPrescription(t.dataset.fulfillRx);
    else if (t.dataset.cancelRx) store.cancelPrescription(t.dataset.cancelRx);
    else if (t.dataset.cancelAppointment) store.cancelAppointment(t.dataset.cancelAppointment);
    else if (t.dataset.deleteAppointment) store.deleteAppointment(t.dataset.deleteAppointment);
    else if (t.dataset.issueBill) store.issueBill(t.dataset.issueBill);
    else if (t.dataset.payBill) {
      const amount = prompt("Payment amount in USD?");
      if (amount == null) return;
      store.payBill(t.dataset.payBill, amount);
    } else if (t.dataset.voidBill) store.voidBill(t.dataset.voidBill);
    else return;
  });
});

store.subscribe(render);
render(store.getState());
