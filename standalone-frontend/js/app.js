(function () {
  const store = window.SafiyaClinic.createStore();
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => [...document.querySelectorAll(sel)];
  const toastEl = $("#toast");
  const toast = bootstrap.Toast.getOrCreateInstance(toastEl);
  let selectedPatientId = null;
  let currentRole = localStorage.getItem("safiya-clinic-role") || null;

  const NAV = {
    receptionist: [
      { target: "#tab-today", label: "Appointments" },
      { target: "#tab-followup", label: "Daily follow-up" },
      { target: "#tab-noshows", label: "No-shows" },
      { target: "#tab-patients", label: "Patients" },
    ],
    owner: [
      { target: "#tab-overview", label: "Overview" },
      { target: "#tab-patients", label: "Patients" },
      { target: "#tab-treatments", label: "Treatments" },
      { target: "#tab-prescriptions", label: "Prescriptions" },
      { target: "#tab-billing", label: "Billing" },
      { target: "#tab-noshows", label: "No-shows" },
    ],
  };

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
    if (status === "no_show") return "badge-noshow";
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

  function enterRole(role) {
    currentRole = role;
    localStorage.setItem("safiya-clinic-role", role);
    $("#role-gate").classList.add("d-none");
    $("#app-shell").classList.remove("d-none");
    $("#role-label").textContent = role === "owner" ? "Owner workspace" : "Receptionist workspace";

    const nav = $("#nav-links");
    nav.innerHTML = NAV[role]
      .map(
        (item, i) =>
          `<li class="nav-item"><button class="nav-link ${i === 0 ? "active" : ""}" data-bs-toggle="tab" data-bs-target="${item.target}" type="button">${item.label}</button></li>`
      )
      .join("");

    $$(".tab-pane").forEach((pane) => {
      const roles = (pane.dataset.roles || "").split(",").map((r) => r.trim());
      const allowed = roles.includes(role);
      pane.classList.toggle("d-none", !allowed);
      pane.classList.remove("show", "active");
    });

    const first = NAV[role][0].target;
    const firstPane = $(first);
    if (firstPane) firstPane.classList.add("show", "active");

    render(store.getState());
  }

  function leaveRole() {
    currentRole = null;
    localStorage.removeItem("safiya-clinic-role");
    $("#app-shell").classList.add("d-none");
    $("#role-gate").classList.remove("d-none");
    hidePatientDetail();
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
    $("#detail-notes").textContent = patient.notes ? "Notes: " + patient.notes : "No notes on file.";

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
      "No appointments."
    );

    $("#detail-noshows").innerHTML = listOrEmpty(
      history.noShows
        .map(
          (a) => `<div class="history-item noshow-row">
            <strong>${new Date(a.startTime).toLocaleString()}</strong>
            <div class="meta">${a.followUpNote || "Did not come"}</div>
            <span class="badge badge-noshow">no show</span>
          </div>`
        )
        .join(""),
      "No missed visits."
    );

    $("#detail-prescriptions").innerHTML = listOrEmpty(
      history.prescriptions
        .map(
          (p) => `<div class="history-item">
            <strong>${p.medication}</strong>
            <div class="meta">${p.dosage} · ${p.duration}</div>
            <span class="badge ${badgeClass(p.status)}">${p.status}</span>
          </div>`
        )
        .join(""),
      "No prescriptions."
    );

    $("#detail-bills").innerHTML = listOrEmpty(
      history.bills
        .map((b) => {
          const totals = store.totals(b);
          return `<div class="history-item">
            <strong>${money(totals.subtotalCents)}</strong>
            <div class="meta">${money(totals.balanceDueCents)} due</div>
            <span class="badge ${badgeClass(b.status)}">${b.status}</span>
          </div>`;
        })
        .join(""),
      "No bills."
    );

    document.querySelectorAll(".patient-row").forEach((row) => {
      row.classList.toggle("is-selected", row.dataset.patientId === patientId);
    });

    const patientsTabBtn = document.querySelector('[data-bs-target="#tab-patients"]');
    if (patientsTabBtn) bootstrap.Tab.getOrCreateInstance(patientsTabBtn).show();
  }

  function hidePatientDetail() {
    selectedPatientId = null;
    const detail = $("#patient-detail");
    if (!detail) return;
    detail.classList.add("d-none");
    detail.classList.remove("show-detail");
  }

  function renderNoShowRows(items, state) {
    return listOrEmpty(
      items
        .map((a) => {
          const patient = findById(state.patients, a.patientId);
          return `<div class="list-row noshow-row">
            <div class="patient-row flex-grow-1" data-patient-id="${a.patientId}">
              <h3 class="h6 mb-1 text-danger">${nameOf(patient)}</h3>
              <p class="meta">${new Date(a.startTime).toLocaleString()} · ${a.reason || "Appointment"}</p>
              <p class="meta">${a.followUpNote || "Patient did not come"}</p>
              <span class="badge badge-noshow">NO SHOW</span>
            </div>
          </div>`;
        })
        .join(""),
      "No no-show patients stored yet."
    );
  }

  function render(state) {
    if (!currentRole) return;

    const openBalance = state.bills
      .filter((b) => ["issued", "partially_paid"].includes(b.status))
      .reduce((sum, b) => sum + store.totals(b).balanceDueCents, 0);
    const noShows = store.listNoShows();
    const today = store.listTodayAppointments();

    if ($("#stats")) {
      $("#stats").innerHTML = [
        ["Patients", state.patients.length],
        ["Today’s visits", today.length],
        ["No-shows", noShows.length],
        ["Open balance", money(openBalance)],
      ]
        .map(
          ([label, value]) =>
            `<div class="col-6 col-md-3"><div class="stat-tile"><span class="text-secondary">${label}</span><strong class="${label === "No-shows" ? "text-danger" : ""}">${value}</strong></div></div>`
        )
        .join("");
    }

    if ($("#today-list")) {
      $("#today-list").innerHTML = listOrEmpty(
        today
          .map((a) => {
            const patient = findById(state.patients, a.patientId);
            const rowClass = a.status === "no_show" ? "list-row noshow-row" : "list-row";
            return `<div class="${rowClass}">
              <div class="patient-row flex-grow-1" data-patient-id="${a.patientId}">
                <h3 class="h6 mb-1">${nameOf(patient)}</h3>
                <p class="meta">${new Date(a.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – ${new Date(a.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · ${a.reason || "Visit"}</p>
                <span class="badge ${badgeClass(a.status)}">${a.status === "no_show" ? "NO SHOW" : a.status}</span>
              </div>
            </div>`;
          })
          .join(""),
        "No appointments scheduled for today."
      );
    }

    if ($("#followup-list")) {
      const pending = today.filter((a) => a.status === "scheduled");
      $("#followup-list").innerHTML = listOrEmpty(
        pending
          .map((a) => {
            const patient = findById(state.patients, a.patientId);
            return `<div class="list-row">
              <div class="patient-row flex-grow-1" data-patient-id="${a.patientId}">
                <h3 class="h6 mb-1">${nameOf(patient)}</h3>
                <p class="meta">${new Date(a.startTime).toLocaleString()} · ${a.reason || "Visit"}</p>
                <span class="badge ${badgeClass(a.status)}">${a.status}</span>
              </div>
              <div class="followup-actions">
                <button class="btn btn-sm btn-clinic" data-mark-done="${a.id}">Appointment done</button>
                <button class="btn btn-sm btn-outline-danger" data-mark-noshow="${a.id}">Did not come</button>
              </div>
            </div>`;
          })
          .join(""),
        "All of today’s appointments are already followed up."
      );
    }

    if ($("#noshow-list")) {
      $("#noshow-list").innerHTML = renderNoShowRows(noShows, state);
    }
    if ($("#owner-noshows")) {
      $("#owner-noshows").innerHTML = renderNoShowRows(noShows.slice(0, 5), state);
    }

    if ($("#upcoming")) {
      const upcoming = [...state.appointments]
        .filter((a) => a.status === "scheduled")
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
              </div>
            </div>`;
          })
          .join(""),
        "No upcoming appointments."
      );
    }

    if ($("#patients-list")) {
      $("#patients-list").innerHTML = listOrEmpty(
        state.patients
          .map((p) => {
            const missed = noShows.filter((a) => a.patientId === p.id).length;
            return `<div class="list-row patient-row ${selectedPatientId === p.id ? "is-selected" : ""} ${missed ? "noshow-row" : ""}" data-patient-id="${p.id}">
              <div>
                <h3 class="h6 mb-1">${nameOf(p)}</h3>
                <p class="meta">${p.email} · ${p.phone}</p>
                <p class="meta">${missed ? missed + " no-show record(s) · " : ""}Click to view history</p>
              </div>
              ${currentRole === "owner" ? `<button class="btn btn-sm btn-outline-danger" data-delete-patient="${p.id}">Delete</button>` : ""}
            </div>`;
          })
          .join(""),
        "No patients yet."
      );
    }

    if ($("#treatments-list")) {
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
    }

    if ($("#prescriptions-list")) {
      $("#prescriptions-list").innerHTML = listOrEmpty(
        state.prescriptions
          .map((p) => {
            const patient = findById(state.patients, p.patientId);
            return `<div class="list-row">
              <div class="patient-row flex-grow-1" data-patient-id="${p.patientId}">
                <h3 class="h6 mb-1">${nameOf(patient)} · ${p.medication}</h3>
                <p class="meta">${p.dosage} · ${p.duration}</p>
              </div>
            </div>`;
          })
          .join(""),
        "No prescriptions yet."
      );
    }

    if ($("#bills-list")) {
      $("#bills-list").innerHTML = listOrEmpty(
        state.bills
          .map((b) => {
            const patient = findById(state.patients, b.patientId);
            const totals = store.totals(b);
            return `<div class="list-row">
              <div class="patient-row flex-grow-1" data-patient-id="${b.patientId}">
                <h3 class="h6 mb-1">${nameOf(patient)}</h3>
                <p class="meta">${money(totals.subtotalCents)} · ${money(totals.balanceDueCents)} due</p>
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
    }

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

  $$("[data-role]").forEach((btn) => {
    btn.addEventListener("click", () => enterRole(btn.dataset.role));
  });

  $("#btn-switch-role").addEventListener("click", leaveRole);

  const patientForm = $("#patient-form");
  if (patientForm) {
    patientForm.addEventListener("submit", (e) => {
      e.preventDefault();
      run(() => {
        store.addPatient(formData(e.target));
        e.target.reset();
      });
    });
  }

  const appointmentForm = $("#appointment-form");
  if (appointmentForm) {
    appointmentForm.addEventListener("submit", (e) => {
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
  }

  const treatmentForm = $("#treatment-form");
  if (treatmentForm) {
    treatmentForm.addEventListener("submit", (e) => {
      e.preventDefault();
      run(() => {
        store.addTreatment(formData(e.target));
        e.target.reset();
      });
    });
  }

  const prescriptionForm = $("#prescription-form");
  if (prescriptionForm) {
    prescriptionForm.addEventListener("submit", (e) => {
      e.preventDefault();
      run(() => {
        store.addPrescription(formData(e.target));
        e.target.reset();
      });
    });
  }

  const billForm = $("#bill-form");
  if (billForm) {
    billForm.addEventListener("submit", (e) => {
      e.preventDefault();
      run(() => {
        store.addBill(formData(e.target));
        e.target.reset();
      });
    });
  }

  const resetBtn = $("#btn-reset");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (confirm("Reset all data to demo sample?")) {
        hidePatientDetail();
        store.resetDemo();
        showToast("Demo data restored");
      }
    });
  }

  const closeDetail = $("#btn-close-detail");
  if (closeDetail) closeDetail.addEventListener("click", hidePatientDetail);

  document.body.addEventListener("click", (e) => {
    const patientRow = e.target.closest(".patient-row");
    if (patientRow && patientRow.dataset.patientId && !e.target.closest("button")) {
      showPatientDetail(patientRow.dataset.patientId);
      return;
    }

    const t = e.target.closest(
      "[data-mark-done],[data-mark-noshow],[data-delete-patient],[data-delete-treatment],[data-issue-bill],[data-pay-bill],[data-void-bill]"
    );
    if (!t) return;

    run(() => {
      if (t.dataset.markDone) store.markCompleted(t.dataset.markDone);
      else if (t.dataset.markNoshow) {
        store.markNoShow(t.dataset.markNoshow, "Patient did not come");
        showToast("Moved to No-shows");
      } else if (t.dataset.deletePatient) {
        if (selectedPatientId === t.dataset.deletePatient) hidePatientDetail();
        store.deletePatient(t.dataset.deletePatient);
      } else if (t.dataset.deleteTreatment) store.deleteTreatment(t.dataset.deleteTreatment);
      else if (t.dataset.issueBill) store.issueBill(t.dataset.issueBill);
      else if (t.dataset.payBill) {
        const amount = prompt("Payment amount in USD?");
        if (amount == null) return;
        store.payBill(t.dataset.payBill, amount);
      } else if (t.dataset.voidBill) store.voidBill(t.dataset.voidBill);
    });
  });

  store.subscribe(render);

  if (currentRole === "receptionist" || currentRole === "owner") {
    enterRole(currentRole);
  }
})();
