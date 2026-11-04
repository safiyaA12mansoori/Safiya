(function () {
  const store = window.SafiyaClinic.createStore();
  const ClinicError = window.SafiyaClinic.ClinicError;
  const $ = (sel) => document.querySelector(sel);
  const toastEl = $("#toast");
  const toast = bootstrap.Toast.getOrCreateInstance(toastEl);

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
    if (["paid", "fulfilled", "active", "scheduled", "confirmed"].includes(status)) return "badge-ok";
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
      .map(
        ([label, value]) =>
          `<div class="col-6 col-md-3"><div class="stat-tile"><span class="text-secondary">${label}</span><strong>${value}</strong></div></div>`
      )
      .join("");

    const upcoming = [...state.appointments]
      .filter((a) => a.status !== "cancelled")
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
      .slice(0, 5);

    $("#upcoming").innerHTML = listOrEmpty(
      upcoming
        .map((a) => {
          const patient = findById(state.patients, a.patientId);
          const dentist = findById(state.dentists, a.dentistId);
          return `<div class="list-row px-0">
            <div>
              <h3 class="h6 mb-1">${nameOf(patient)}</h3>
              <p class="meta">with ${nameOf(dentist)} · ${new Date(a.startTime).toLocaleString()}</p>
              <span class="badge ${badgeClass(a.status)}">${a.status}</span>
            </div>
          </div>`;
        })
        .join(""),
      "No upcoming appointments."
    );

    const openBills = state.bills.filter((b) =>
      ["issued", "partially_paid"].includes(b.status)
    );
    const activeRx = state.prescriptions.filter((p) => p.status === "active").slice(0, 3);
    const side = [
      ...openBills.map((b) => {
        const patient = findById(state.patients, b.patientId);
        return `<div class="list-row px-0"><div><h3 class="h6 mb-1">${nameOf(patient)}</h3><p class="meta">${money(store.totals(b).balanceDueCents)} due</p></div></div>`;
      }),
      ...activeRx.map((p) => {
        const patient = findById(state.patients, p.patientId);
        return `<div class="list-row px-0"><div><h3 class="h6 mb-1">Rx · ${nameOf(patient)}</h3><p class="meta">${p.items.length} item(s) · ${p.status}</p></div></div>`;
      }),
    ].join("");
    $("#open-side").innerHTML = listOrEmpty(side, "Nothing open.");

    $("#patients-list").innerHTML = listOrEmpty(
      state.patients
        .map(
          (p) => `<div class="list-row"><div><h3 class="h6 mb-1">${nameOf(p)}</h3><p class="meta">${p.email} · ${p.phone}</p></div>
          <button class="btn btn-sm btn-outline-danger" data-delete-patient="${p.id}">Delete</button></div>`
        )
        .join(""),
      "No patients yet."
    );

    $("#dentists-list").innerHTML = listOrEmpty(
      state.dentists
        .map(
          (d) => `<div class="list-row"><div><h3 class="h6 mb-1">${nameOf(d)}</h3><p class="meta">${d.specialty}</p></div>
          <button class="btn btn-sm btn-outline-danger" data-delete-dentist="${d.id}">Delete</button></div>`
        )
        .join(""),
      "No dentists yet."
    );

    $("#medicines-list").innerHTML = listOrEmpty(
      state.medicines
        .map(
          (m) => `<div class="list-row"><div>
            <h3 class="h6 mb-1">${m.name}</h3>
            <p class="meta">${m.strengthLabel} · dose ${m.minDose}–${m.maxDose} ${m.unit} · stock ${m.stockQuantity}</p>
          </div>
          <button class="btn btn-sm btn-outline-danger" data-delete-medicine="${m.id}">Delete</button></div>`
        )
        .join(""),
      "No medicines yet."
    );

    $("#prescriptions-list").innerHTML = listOrEmpty(
      state.prescriptions
        .map((p) => {
          const patient = findById(state.patients, p.patientId);
          const lines = p.items
            .map((item) => {
              const med = findById(state.medicines, item.medicineId);
              return `${med ? med.name : "Med"}: ${item.doseAmount} ${item.doseUnit} × ${item.frequencyPerDay}/day × ${item.durationDays}d (qty ${item.quantity})`;
            })
            .join("; ");
          return `<div class="list-row"><div>
            <h3 class="h6 mb-1">${nameOf(patient)}</h3>
            <p class="meta">${lines}</p>
            <span class="badge ${badgeClass(p.status)}">${p.status}</span>
          </div>
          <div class="d-flex flex-wrap gap-1">
            ${p.status === "draft" ? `<button class="btn btn-sm btn-outline-secondary" data-activate-rx="${p.id}">Activate</button>` : ""}
            ${p.status === "active" ? `<button class="btn btn-sm btn-clinic" data-fulfill-rx="${p.id}">Fulfill</button>` : ""}
            ${!["fulfilled", "cancelled"].includes(p.status) ? `<button class="btn btn-sm btn-outline-danger" data-cancel-rx="${p.id}">Cancel</button>` : ""}
          </div></div>`;
        })
        .join(""),
      "No prescriptions yet."
    );

    $("#appointments-list").innerHTML = listOrEmpty(
      state.appointments
        .map((a) => {
          const patient = findById(state.patients, a.patientId);
          const dentist = findById(state.dentists, a.dentistId);
          return `<div class="list-row"><div>
            <h3 class="h6 mb-1">${nameOf(patient)} → ${nameOf(dentist)}</h3>
            <p class="meta">${new Date(a.startTime).toLocaleString()}</p>
            <span class="badge ${badgeClass(a.status)}">${a.status}</span>
          </div>
          <div class="d-flex flex-wrap gap-1">
            ${a.status !== "cancelled" ? `<button class="btn btn-sm btn-outline-secondary" data-cancel-appointment="${a.id}">Cancel</button>` : ""}
            <button class="btn btn-sm btn-outline-danger" data-delete-appointment="${a.id}">Delete</button>
          </div></div>`;
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

    $("#bills-list").innerHTML = listOrEmpty(
      state.bills
        .map((b) => {
          const patient = findById(state.patients, b.patientId);
          const totals = store.totals(b);
          return `<div class="list-row"><div>
            <h3 class="h6 mb-1">${nameOf(patient)}</h3>
            <p class="meta">${money(totals.subtotalCents)} total · ${money(totals.balanceDueCents)} due</p>
            <span class="badge ${badgeClass(b.status)}">${b.status}</span>
          </div>
          <div class="d-flex flex-wrap gap-1">
            ${b.status === "draft" ? `<button class="btn btn-sm btn-outline-secondary" data-issue-bill="${b.id}">Issue</button>` : ""}
            ${["issued", "partially_paid"].includes(b.status) ? `<button class="btn btn-sm btn-clinic" data-pay-bill="${b.id}">Pay</button>` : ""}
            ${!["paid", "void"].includes(b.status) ? `<button class="btn btn-sm btn-outline-danger" data-void-bill="${b.id}">Void</button>` : ""}
          </div></div>`;
        })
        .join(""),
      "No bills yet."
    );

    fillSelect($('#prescription-form [name="patientId"]'), state.patients, nameOf);
    fillSelect($('#prescription-form [name="dentistId"]'), state.dentists, nameOf, true, "Optional");
    fillSelect(
      $('#prescription-form [name="medicineId"]'),
      state.medicines.filter((m) => m.active),
      (m) => `${m.name} (${m.strengthLabel})`
    );
    fillSelect($('#appointment-form [name="patientId"]'), state.patients, nameOf);
    fillSelect($('#appointment-form [name="dentistId"]'), state.dentists, nameOf);
    fillSelect($('#appointment-form [name="treatmentId"]'), state.treatments, (t) => t.name, true, "Optional");
    fillSelect($('#bill-form [name="patientId"]'), state.patients, nameOf);
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

  $("#dentist-form").addEventListener("submit", (e) => {
    e.preventDefault();
    run(() => {
      store.addDentist(formData(e.target));
      e.target.reset();
    });
  });

  $("#medicine-form").addEventListener("submit", (e) => {
    e.preventDefault();
    run(() => {
      store.addMedicine(formData(e.target));
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

  $("#treatment-form").addEventListener("submit", (e) => {
    e.preventDefault();
    run(() => {
      store.addTreatment(formData(e.target));
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

  ["dentistId", "startTime", "endTime"].forEach((name) => {
    $(`#appointment-form [name="${name}"]`).addEventListener("change", () => {
      const form = $("#appointment-form");
      const hint = $("#conflict-hint");
      if (!form.dentistId.value || !form.startTime.value || !form.endTime.value) {
        hint.classList.add("d-none");
        return;
      }
      try {
        const conflict = store.hasConflict(
          form.dentistId.value,
          new Date(form.startTime.value).toISOString(),
          new Date(form.endTime.value).toISOString()
        );
        hint.classList.toggle("d-none", !conflict);
        hint.textContent = conflict
          ? "Conflict: this dentist already has an overlapping appointment."
          : "";
      } catch (e) {
        hint.classList.add("d-none");
      }
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
      store.resetDemo();
      showToast("Demo data restored");
    }
  });

  document.body.addEventListener("click", (e) => {
    const t = e.target.closest("[data-delete-patient],[data-delete-dentist],[data-delete-medicine],[data-delete-treatment],[data-activate-rx],[data-fulfill-rx],[data-cancel-rx],[data-cancel-appointment],[data-delete-appointment],[data-issue-bill],[data-pay-bill],[data-void-bill]");
    if (!t) return;
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
    });
  });

  store.subscribe(render);
  render(store.getState());
})();
