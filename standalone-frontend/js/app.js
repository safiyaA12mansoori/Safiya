(function () {
  const store = window.SafiyaClinic.createStore();
  const $ = (sel) => document.querySelector(sel);
  const toastEl = $("#toast");
  const toast = bootstrap.Toast.getOrCreateInstance(toastEl);
  let selectedPatientId = null;

  function money(cents) {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
    }).format((cents || 0) / 100);
  }

  function showToast(message, isError) {
    $("#toast-body").textContent = message;
    toastEl.classList.toggle("text-bg-danger", !!isError);
    toastEl.classList.toggle("text-bg-dark", !isError);
    toast.show();
  }

  function nameOf(person) {
    return person ? person.firstName + " " + person.lastName : "—";
  }

  function findById(list, id) {
    return list.find((item) => item.id === id);
  }

  function badgeClass(status) {
    if (["paid", "fulfilled", "active", "scheduled", "confirmed", "completed"].includes(status)) {
      return "badge-ok";
    }
    if (["draft", "issued", "partially_paid"].includes(status)) return "badge-warn";
    if (["void", "cancelled"].includes(status)) return "badge-danger-soft";
    return "badge-soft";
  }

  function fillSelect(select, items, mapLabel, includeBlank, blankLabel) {
    if (!select) return;
    const current = select.value;
    select.innerHTML = "";
    if (includeBlank) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = blankLabel || "Select…";
      select.appendChild(opt);
    }
    items.forEach((item) => {
      const opt = document.createElement("option");
      opt.value = item.id;
      opt.textContent = mapLabel(item);
      select.appendChild(opt);
    });
    if ([...select.options].some((o) => o.value === current)) select.value = current;
  }

  function listOrEmpty(html, emptyText) {
    return html || `<p class="empty mb-0">${emptyText}</p>`;
  }

  function showPatientDetail(patientId) {
    const state = store.getState();
    const patient = findById(state.patients, patientId);
    if (!patient) return;
    selectedPatientId = patientId;
    const history = store.getPatientHistory(patientId);
    const detail = $("#patient-detail");
    detail.classList.remove("d-none");
    detail.classList.add("show-detail");
    $("#detail-name").textContent = nameOf(patient);
    $("#detail-meta").textContent = `${patient.email} · ${patient.phone} · DOB ${patient.dateOfBirth}`;
    $("#detail-notes").textContent = patient.notes
      ? "Notes: " + patient.notes
      : "No notes on file.";

    $("#detail-appointments").innerHTML = listOrEmpty(
      history.appointments
        .map((a) => {
          const treatment = findById(state.treatments, a.treatmentId);
          return `<div class="history-item">
            <strong>${new Date(a.startTime).toLocaleString()}</strong>
            <div class="meta">${treatment ? treatment.name : "Visit"} · ${a.reason || "—"}</div>
            <span class="badge ${badgeClass(a.status)}">${a.status}</span>
          </div>`;
        })
        .join(""),
      "No previous appointments."
    );

    $("#detail-prescriptions").innerHTML = listOrEmpty(
      history.prescriptions
        .map(
          (p) => `<div class="history-item">
            <strong>${p.medication}</strong>
            <div class="meta">${p.dosage} · ${p.duration}</div>
            <div class="meta">${p.instructions || ""}</div>
            <span class="badge ${badgeClass(p.status)}">${p.status}</span>
          </div>`
        )
        .join(""),
      "No previous prescriptions."
    );

    $("#detail-bills").innerHTML = listOrEmpty(
      history.bills
        .map((b) => {
          const totals = store.totals(b);
          return `<div class="history-item">
            <strong>${money(totals.subtotalCents)}</strong>
            <div class="meta">${b.lineItems.map((i) => i.description).join(", ")}</div>
            <div class="meta">${money(totals.balanceDueCents)} due</div>
            <span class="badge ${badgeClass(b.status)}">${b.status}</span>
          </div>`;
        })
        .join(""),
      "No previous bills."
    );

    // highlight selected row
    document.querySelectorAll(".patient-row").forEach((row) => {
      row.classList.toggle("is-selected", row.dataset.patientId === patientId);
    });

    // switch to patients tab if needed
    const patientsTab = document.querySelector('[data-bs-target="#tab-patients"]');
    if (patientsTab) bootstrap.Tab.getOrCreateInstance(patientsTab).show();
  }

  function hidePatientDetail() {
    selectedPatientId = null;
    $("#patient-detail").classList.add("d-none");
    $("#patient-detail").classList.remove("show-detail");
    document.querySelectorAll(".patient-row").forEach((row) => row.classList.remove("is-selected"));
  }

  function render(state) {
    const openBalance = state.bills
      .filter((b) => ["issued", "partially_paid"].includes(b.status))
      .reduce((sum, b) => sum + store.totals(b).balanceDueCents, 0);

    $("#stats").innerHTML = [
      ["Patients", state.patients.length],
      ["Appointments", state.appointments.filter((a) => a.status !== "cancelled").length],
      ["Prescriptions", state.prescriptions.filter((p) => p.status === "active").length],
      ["Open balance", money(openBalance)],
    ]
      .map(
        ([label, value]) =>
          `<div class="col-6 col-md-3"><div class="stat-tile"><span class="text-secondary">${label}</span><strong>${value}</strong></div></div>`
      )
      .join("");

    const upcoming = [...state.appointments]
      .filter((a) => a.status !== "cancelled" && a.status !== "completed")
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
      .slice(0, 5);

    $("#upcoming").innerHTML = listOrEmpty(
      upcoming
        .map((a) => {
          const patient = findById(state.patients, a.patientId);
          return `<div class="list-row px-0 patient-row" data-patient-id="${a.patientId}">
            <div>
              <h3 class="h6 mb-1">${nameOf(patient)}</h3>
              <p class="meta">${new Date(a.startTime).toLocaleString()}</p>
              <span class="badge ${badgeClass(a.status)}">${a.status}</span>
            </div>
          </div>`;
        })
        .join(""),
      "No upcoming appointments."
    );

    const recent = [...state.patients]
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .slice(0, 5);
    $("#recent-patients").innerHTML = listOrEmpty(
      recent
        .map(
          (p) => `<div class="list-row px-0 patient-row" data-patient-id="${p.id}">
            <div>
              <h3 class="h6 mb-1">${nameOf(p)}</h3>
              <p class="meta">${p.email} · click to view history</p>
            </div>
          </div>`
        )
        .join(""),
      "No patients yet."
    );

    $("#patients-list").innerHTML = listOrEmpty(
      state.patients
        .map(
          (p) => `<div class="list-row patient-row ${selectedPatientId === p.id ? "is-selected" : ""}" data-patient-id="${p.id}">
            <div>
              <h3 class="h6 mb-1">${nameOf(p)}</h3>
              <p class="meta">${p.email} · ${p.phone}</p>
              <p class="meta">Click to view previous records</p>
            </div>
            <button class="btn btn-sm btn-outline-danger" data-delete-patient="${p.id}">Delete</button>
          </div>`
        )
        .join(""),
      "No patients yet."
    );

    $("#appointments-list").innerHTML = listOrEmpty(
      state.appointments
        .map((a) => {
          const patient = findById(state.patients, a.patientId);
          return `<div class="list-row">
            <div class="patient-row flex-grow-1" data-patient-id="${a.patientId}">
              <h3 class="h6 mb-1">${nameOf(patient)}</h3>
              <p class="meta">${new Date(a.startTime).toLocaleString()}</p>
              <span class="badge ${badgeClass(a.status)}">${a.status}</span>
            </div>
            <div class="d-flex flex-wrap gap-1">
              ${a.status !== "cancelled" && a.status !== "completed" ? `<button class="btn btn-sm btn-outline-secondary" data-cancel-appointment="${a.id}">Cancel</button>` : ""}
              <button class="btn btn-sm btn-outline-danger" data-delete-appointment="${a.id}">Delete</button>
            </div>
          </div>`;
        })
        .join(""),
      "No appointments yet."
    );

    $("#treatments-list").innerHTML = listOrEmpty(
      state.treatments
        .map(
          (t) => `<div class="list-row"><div>
            <h3 class="h6 mb-1">${t.name}</h3>
            <p class="meta">${t.category} · ${t.durationMinutes} min · ${money(t.basePriceCents)}</p>
          </div>
          <button class="btn btn-sm btn-outline-danger" data-delete-treatment="${t.id}">Delete</button></div>`
        )
        .join(""),
      "No treatments yet."
    );

    $("#prescriptions-list").innerHTML = listOrEmpty(
      state.prescriptions
        .map((p) => {
          const patient = findById(state.patients, p.patientId);
          return `<div class="list-row">
            <div class="patient-row flex-grow-1" data-patient-id="${p.patientId}">
              <h3 class="h6 mb-1">${nameOf(patient)} · ${p.medication}</h3>
              <p class="meta">${p.dosage} · ${p.duration}</p>
              <span class="badge ${badgeClass(p.status)}">${p.status}</span>
            </div>
            ${p.status !== "cancelled" ? `<button class="btn btn-sm btn-outline-danger" data-cancel-rx="${p.id}">Cancel</button>` : ""}
          </div>`;
        })
        .join(""),
      "No prescriptions yet."
    );

    $("#bills-list").innerHTML = listOrEmpty(
      state.bills
        .map((b) => {
          const patient = findById(state.patients, b.patientId);
          const totals = store.totals(b);
          return `<div class="list-row">
            <div class="patient-row flex-grow-1" data-patient-id="${b.patientId}">
              <h3 class="h6 mb-1">${nameOf(patient)}</h3>
              <p class="meta">${money(totals.subtotalCents)} total · ${money(totals.balanceDueCents)} due</p>
              <span class="badge ${badgeClass(b.status)}">${b.status}</span>
            </div>
            <div class="d-flex flex-wrap gap-1">
              ${b.status === "draft" ? `<button class="btn btn-sm btn-outline-secondary" data-issue-bill="${b.id}">Issue</button>` : ""}
              ${["issued", "partially_paid"].includes(b.status) ? `<button class="btn btn-sm btn-clinic" data-pay-bill="${b.id}">Pay</button>` : ""}
              ${!["paid", "void"].includes(b.status) ? `<button class="btn btn-sm btn-outline-danger" data-void-bill="${b.id}">Void</button>` : ""}
            </div>
          </div>`;
        })
        .join(""),
      "No bills yet."
    );

    fillSelect($('#appointment-form [name="patientId"]'), state.patients, nameOf);
    fillSelect($('#appointment-form [name="treatmentId"]'), state.treatments, (t) => t.name, true, "Optional");
    fillSelect($('#prescription-form [name="patientId"]'), state.patients, nameOf);
    fillSelect($('#bill-form [name="patientId"]'), state.patients, nameOf);

    if (selectedPatientId && findById(state.patients, selectedPatientId)) {
      showPatientDetail(selectedPatientId);
    } else if (selectedPatientId) {
      hidePatientDetail();
    }
  }

  function run(fn) {
    try {
      fn();
      showToast("Saved");
    } catch (err) {
      showToast(err && err.message ? err.message : "Error", true);
    }
  }

  function formData(form) {
    return Object.fromEntries(new FormData(form).entries());
  }

  $("#patient-form").addEventListener("submit", (e) => {
    e.preventDefault();
    run(() => {
      store.addPatient(formData(e.target));
      e.target.reset();
    });
  });

  $("#appointment-form").addEventListener("submit", (e) => {
    e.preventDefault();
    run(() => {
      store.addAppointment(formData(e.target));
      e.target.reset();
      $("#conflict-hint").classList.add("d-none");
    });
  });

  ["patientId", "startTime", "endTime"].forEach((name) => {
    const el = $(`#appointment-form [name="${name}"]`);
    if (!el) return;
    el.addEventListener("change", () => {
      const form = $("#appointment-form");
      const hint = $("#conflict-hint");
      if (!form.patientId.value || !form.startTime.value || !form.endTime.value) {
        hint.classList.add("d-none");
        return;
      }
      try {
        const conflict = store.hasConflict(
          form.patientId.value,
          new Date(form.startTime.value).toISOString(),
          new Date(form.endTime.value).toISOString()
        );
        hint.classList.toggle("d-none", !conflict);
        hint.textContent = conflict
          ? "Conflict: this patient already has an overlapping appointment."
          : "";
      } catch (e) {
        hint.classList.add("d-none");
      }
    });
  });

  $("#treatment-form").addEventListener("submit", (e) => {
    e.preventDefault();
    run(() => {
      store.addTreatment(formData(e.target));
      e.target.reset();
    });
  });

  $("#prescription-form").addEventListener("submit", (e) => {
    e.preventDefault();
    run(() => {
      store.addPrescription(formData(e.target));
      e.target.reset();
    });
  });

  $("#bill-form").addEventListener("submit", (e) => {
    e.preventDefault();
    run(() => {
      store.addBill(formData(e.target));
      e.target.reset();
    });
  });

  $("#btn-reset").addEventListener("click", () => {
    if (confirm("Reset all data to demo sample?")) {
      hidePatientDetail();
      store.resetDemo();
      showToast("Demo data restored");
    }
  });

  $("#btn-close-detail").addEventListener("click", hidePatientDetail);

  document.body.addEventListener("click", (e) => {
    const patientRow = e.target.closest(".patient-row");
    if (patientRow && patientRow.dataset.patientId && !e.target.closest("button")) {
      showPatientDetail(patientRow.dataset.patientId);
      return;
    }

    const t = e.target.closest(
      "[data-delete-patient],[data-delete-treatment],[data-cancel-appointment],[data-delete-appointment],[data-cancel-rx],[data-issue-bill],[data-pay-bill],[data-void-bill]"
    );
    if (!t) return;
    run(() => {
      if (t.dataset.deletePatient) {
        if (selectedPatientId === t.dataset.deletePatient) hidePatientDetail();
        store.deletePatient(t.dataset.deletePatient);
      } else if (t.dataset.deleteTreatment) store.deleteTreatment(t.dataset.deleteTreatment);
      else if (t.dataset.cancelAppointment) store.cancelAppointment(t.dataset.cancelAppointment);
      else if (t.dataset.deleteAppointment) store.deleteAppointment(t.dataset.deleteAppointment);
      else if (t.dataset.cancelRx) store.cancelPrescription(t.dataset.cancelRx);
      else if (t.dataset.issueBill) store.issueBill(t.dataset.issueBill);
      else if (t.dataset.payBill) {
        const amount = prompt("Payment amount in USD?");
        if (amount == null) return;
        store.payBill(t.dataset.payBill, amount);
      } else if (t.dataset.voidBill) store.voidBill(t.dataset.voidBill);
    });
  });

  store.subscribe(render);
  render(store.getState());
})();
