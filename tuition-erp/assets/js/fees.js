/**
 * Fee structures, invoices, and payments. Status is calculated from amounts
 * and due dates so the lists stay in step with the receipts.
 */
(function () {
  var tab = 'structures';
  var feeFilters = { q: '', status: '' };
  var payFilters = { q: '', method: '' };
  var page = 1;

  function views() {
    var data = Storage.load();
    return data.invoices.map(function (invoice) {
      return Object.assign({}, invoice, Storage.invoiceView(invoice, data.payments, Storage.today()));
    });
  }

  function typeLabel(type) {
    return ({ monthly: 'Monthly', quarterly: 'Quarterly', yearly: 'Yearly', installment: 'Installment' })[type] || type;
  }

  function paintStructures() {
    var data = Storage.load();
    var rows = data.feeStructures.slice().sort(function (a, b) { return a.name < b.name ? -1 : 1; });
    return rows.length ? '<div class="table-wrap"><table><thead><tr><th>Structure</th><th>Course</th><th>Type</th><th class="num">Amount</th><th>Status</th><th></th></tr></thead><tbody>' + rows.map(function (item) {
      return '<tr><td>' + App.esc(item.name) + '</td><td>' + App.esc(Storage.nameOf('courses', item.courseId)) + '</td><td>' + App.esc(typeLabel(item.type)) + '</td><td class="num">' + App.money(item.amount) + '</td><td>' + App.badge(item.status) + '</td><td class="actions"><button type="button" class="btn btn-secondary btn-sm" data-edit-structure="' + App.esc(item.id) + '">Edit</button><button type="button" class="btn btn-danger btn-sm" data-delete-structure="' + App.esc(item.id) + '">Delete</button></td></tr>';
    }).join('') + '</tbody></table></div>' : App.empty('No fee structures yet.');
  }

  function paintInvoices() {
    var rows = views().filter(function (invoice) {
      var name = Storage.nameOf('students', invoice.studentId, '');
      var hay = (name + ' ' + invoice.invoiceNo + ' ' + invoice.periodLabel).toLowerCase();
      if (feeFilters.q && hay.indexOf(feeFilters.q.toLowerCase()) === -1) return false;
      if (feeFilters.status && invoice.status !== feeFilters.status) return false;
      return true;
    }).sort(function (a, b) { return a.dueDate < b.dueDate ? 1 : -1; });
    var pages = Math.max(1, Math.ceil(rows.length / 8));
    if (page > pages) page = pages;
    var slice = rows.slice((page - 1) * 8, page * 8);
    if (!slice.length) return App.empty('No invoices match these filters.');
    return '<div class="table-wrap"><table><thead><tr><th>Invoice</th><th>Student</th><th class="hide-sm">Period</th><th class="num">Total</th><th class="num">Balance</th><th>Status</th><th></th></tr></thead><tbody>' + slice.map(function (invoice) {
      return '<tr><td>' + App.esc(invoice.invoiceNo) + '</td><td>' + App.esc(Storage.nameOf('students', invoice.studentId)) + '</td><td class="hide-sm">' + App.esc(invoice.periodLabel) + '</td><td class="num">' + App.money(invoice.total) + '</td><td class="num">' + App.money(invoice.balance) + '</td><td>' + App.badge(invoice.status) + '</td><td class="actions"><button type="button" class="btn btn-ghost btn-sm" data-view-invoice="' + App.esc(invoice.id) + '">View</button>' + (invoice.balance > 0 ? '<a class="btn btn-secondary btn-sm" href="' + App.pageHref('payments.html') + '?invoice=' + encodeURIComponent(invoice.id) + '">Record payment</a>' : '') + '</td></tr>';
    }).join('') + '</tbody></table></div>' + App.pager(page, pages);
  }

  function renderFees() {
    var content = document.getElementById('content');
    content.innerHTML = '<div class="tabs"><button type="button" class="tab" data-tab="structures" aria-selected="' + (tab === 'structures') + '">Structures</button><button type="button" class="tab" data-tab="invoices" aria-selected="' + (tab === 'invoices') + '">Invoices</button></div><section class="card"><div class="toolbar"><div class="filters">' +
      (tab === 'invoices' ? '<input id="fee-q" type="search" placeholder="Search student or invoice" value="' + App.esc(feeFilters.q) + '"><select id="fee-status"><option value="">All statuses</option>' + ['Paid', 'Partial', 'Pending', 'Overdue'].map(function (status) { return '<option' + (feeFilters.status === status ? ' selected' : '') + '>' + status + '</option>'; }).join('') + '</select>' : '<p class="muted">Monthly, quarterly, yearly, and installment plans.</p>') +
      '</div>' + (tab === 'structures' ? '<button type="button" class="btn btn-primary" id="add-structure">Add structure</button>' : '<button type="button" class="btn btn-primary" id="assign-fee">Assign fee</button>') +
      '</div><div id="fee-body">' + (tab === 'structures' ? paintStructures() : paintInvoices()) + '</div></section>';
    content.querySelectorAll('[data-tab]').forEach(function (button) {
      button.addEventListener('click', function () { tab = button.getAttribute('data-tab'); page = 1; renderFees(); });
    });
    var add = content.querySelector('#add-structure');
    if (add) add.addEventListener('click', function () { structureForm(null); });
    var assign = content.querySelector('#assign-fee');
    if (assign) assign.addEventListener('click', assignForm);
    var q = content.querySelector('#fee-q');
    if (q) {
      q.addEventListener('input', function () { feeFilters.q = q.value; page = 1; document.getElementById('fee-body').innerHTML = paintInvoices(); bindInvoicePager(); });
      content.querySelector('#fee-status').addEventListener('change', function (event) { feeFilters.status = event.target.value; page = 1; document.getElementById('fee-body').innerHTML = paintInvoices(); bindInvoicePager(); });
    }
    bindStructureButtons();
    bindInvoicePager();
  }

  function bindInvoicePager() {
    document.querySelectorAll('#fee-body .pager [data-page]').forEach(function (button) {
      button.addEventListener('click', function () {
        if (button.disabled) return;
        page = Number(button.getAttribute('data-page'));
        document.getElementById('fee-body').innerHTML = paintInvoices();
        bindInvoicePager();
      });
    });
    document.querySelectorAll('[data-view-invoice]').forEach(function (button) {
      button.addEventListener('click', function () { viewInvoice(button.getAttribute('data-view-invoice')); });
    });
  }

  function bindStructureButtons() {
    document.querySelectorAll('[data-edit-structure]').forEach(function (button) {
      button.addEventListener('click', function () {
        structureForm(Storage.byId(Storage.load().feeStructures, button.getAttribute('data-edit-structure')));
      });
    });
    document.querySelectorAll('[data-delete-structure]').forEach(function (button) {
      button.addEventListener('click', function () { deleteStructure(button.getAttribute('data-delete-structure')); });
    });
  }

  function structureForm(structure) {
    var data = Storage.load();
    var value = structure || { name: '', courseId: '', type: 'monthly', amount: '', academicYear: data.currentAcademicYear, status: 'Active' };
    App.openModal({
      title: structure ? 'Edit fee structure' : 'Add fee structure',
      html: '<form id="structure-form" class="stack"><div class="field"><label for="name">Name</label><input id="name" value="' + App.esc(value.name) + '" required><div class="field-error"></div></div><div class="field"><label for="courseId">Course</label><select id="courseId">' + App.optionsHtml(data.courses, value.courseId, function (course) { return course.id; }, function (course) { return course.name; }, 'Select a course') + '</select><div class="field-error"></div></div><div class="field"><label for="type">Payment type</label><select id="type">' + [['monthly', 'Monthly'], ['quarterly', 'Quarterly'], ['yearly', 'Yearly'], ['installment', 'Installment']].map(function (pair) { return '<option value="' + pair[0] + '"' + (value.type === pair[0] ? ' selected' : '') + '>' + pair[1] + '</option>'; }).join('') + '</select><div class="field-error"></div></div><div class="field"><label for="amount">Amount (INR)</label><input id="amount" type="number" min="1" step="1" value="' + App.esc(value.amount) + '" required><div class="field-error"></div></div><div class="field"><label for="year">Academic year</label><select id="year">' + data.academicYears.map(function (year) { return '<option' + (year === value.academicYear ? ' selected' : '') + '>' + App.esc(year) + '</option>'; }).join('') + '</select><div class="field-error"></div></div><div class="field"><label for="status">Status</label><select id="status"><option' + (value.status !== 'Inactive' ? ' selected' : '') + '>Active</option><option' + (value.status === 'Inactive' ? ' selected' : '') + '>Inactive</option></select><div class="field-error"></div></div><div class="modal-actions"><button type="button" class="btn btn-ghost" id="cancel-structure">Cancel</button><button class="btn btn-primary" type="submit">Save structure</button></div></form>',
      onMount: function (root) {
        root.querySelector('#cancel-structure').addEventListener('click', App.closeModal);
        root.querySelector('#structure-form').addEventListener('submit', function (event) {
          event.preventDefault();
          var ok = App.requireValue(root.querySelector('#name'), 'Name');
          if (!root.querySelector('#courseId').value) { App.setFieldError(root.querySelector('#courseId'), 'Course is required.'); ok = false; }
          var amount = Number(root.querySelector('#amount').value);
          if (!amount || amount <= 0) { App.setFieldError(root.querySelector('#amount'), 'Enter an amount greater than zero.'); ok = false; }
          if (!ok) { App.toast('Check the highlighted fields.', 'error'); return; }
          var record = {
            id: structure ? structure.id : Storage.uid('fs'),
            instituteId: Storage.INSTITUTE_ID,
            name: root.querySelector('#name').value.trim(),
            courseId: root.querySelector('#courseId').value,
            type: root.querySelector('#type').value,
            amount: amount,
            academicYear: root.querySelector('#year').value,
            status: root.querySelector('#status').value
          };
          Storage.update(function (store) {
            var index = store.feeStructures.findIndex(function (item) { return item.id === record.id; });
            if (index === -1) store.feeStructures.push(record);
            else store.feeStructures[index] = record;
          });
          App.closeModal();
          App.toast('Fee structure saved.', 'success');
          renderFees();
        });
      }
    });
  }

  function deleteStructure(id) {
    var structure = Storage.byId(Storage.load().feeStructures, id);
    if (!structure) return;
    if (Storage.load().invoices.some(function (invoice) { return invoice.feeStructureId === id; })) {
      App.toast('This structure is used by invoices. Deactivate it instead of deleting it.', 'error');
      return;
    }
    App.confirmDialog({ title: 'Delete fee structure', message: 'Delete ' + structure.name + '?', confirmText: 'Delete', danger: true }).then(function (yes) {
      if (!yes) return;
      Storage.update(function (data) { data.feeStructures = data.feeStructures.filter(function (item) { return item.id !== id; }); });
      App.toast('Fee structure deleted.', 'success');
      renderFees();
    });
  }

  function assignForm() {
    var data = Storage.load();
    var active = data.feeStructures.filter(function (item) { return item.status === 'Active'; });
    if (!active.length) { App.toast('Add an active fee structure first.', 'error'); return; }
    App.openModal({
      title: 'Assign fee',
      wide: true,
      html: '<form id="assign-form" class="stack"><div class="field"><label for="structure">Fee structure</label><select id="structure">' + active.map(function (item) { return '<option value="' + App.esc(item.id) + '">' + App.esc(item.name) + ' · ' + App.money(item.amount) + '</option>'; }).join('') + '</select><div class="field-error"></div></div><div class="field"><label for="period">Period</label><input id="period" required><div class="field-error"></div></div><div class="field"><label for="due">Due date</label><input id="due" type="date" required><div class="field-error"></div></div><div class="form-grid"><div class="field"><label for="discount">Discount</label><input id="discount" type="number" min="0" step="1" value="0"><div class="field-error"></div></div><div class="field"><label for="late">Late fee</label><input id="late" type="number" min="0" step="1" value="0"><div class="field-error"></div></div></div><div class="field"><span class="section-label">Students</span><div class="check-grid" id="assign-students"></div><div class="field-error" id="student-error"></div></div><div class="modal-actions"><button type="button" class="btn btn-ghost" id="cancel-assign">Cancel</button><button class="btn btn-primary" type="submit">Generate invoices</button></div></form>',
      onMount: function (root) {
        var structureSelect = root.querySelector('#structure');
        var period = root.querySelector('#period');
        var due = root.querySelector('#due');
        function fill() {
          var structure = Storage.byId(Storage.load().feeStructures, structureSelect.value);
          period.value = Storage.defaultPeriod(structure, Storage.load().currentAcademicYear);
          due.value = Storage.addDays(Storage.today(), 7);
          var students = Storage.load().students.filter(function (student) { return student.courseId === structure.courseId && student.status === 'Active'; });
          root.querySelector('#assign-students').innerHTML = students.length ? students.map(function (student) {
            return '<label><input type="checkbox" name="student" value="' + App.esc(student.id) + '" checked> ' + App.esc(student.name) + '</label>';
          }).join('') : '<p class="muted">No active students in this course.</p>';
        }
        structureSelect.addEventListener('change', fill);
        fill();
        root.querySelector('#cancel-assign').addEventListener('click', App.closeModal);
        root.querySelector('#assign-form').addEventListener('submit', function (event) {
          event.preventDefault();
          var structure = Storage.byId(Storage.load().feeStructures, structureSelect.value);
          var periodLabel = period.value.trim();
          var dueDate = due.value;
          var discount = Number(root.querySelector('#discount').value || 0);
          var late = Number(root.querySelector('#late').value || 0);
          var ok = true;
          if (!periodLabel) { App.setFieldError(period, 'Period is required.'); ok = false; } else App.setFieldError(period, '');
          if (!dueDate) { App.setFieldError(due, 'Due date is required.'); ok = false; } else App.setFieldError(due, '');
          if (discount < 0 || discount >= Number(structure.amount)) { App.setFieldError(root.querySelector('#discount'), 'Discount must be less than the fee.'); ok = false; }
          if (late < 0) { App.setFieldError(root.querySelector('#late'), 'Late fee cannot be negative.'); ok = false; }
          var ids = Array.prototype.map.call(root.querySelectorAll('input[name="student"]:checked'), function (box) { return box.value; });
          if (!ids.length) { root.querySelector('#student-error').textContent = 'Choose at least one student.'; ok = false; } else root.querySelector('#student-error').textContent = '';
          if (!ok) { App.toast('Check the highlighted fields.', 'error'); return; }
          var created = 0;
          var skipped = 0;
          Storage.update(function (store) {
            ids.forEach(function (studentId) {
              var exists = store.invoices.some(function (invoice) {
                return invoice.studentId === studentId && invoice.feeStructureId === structure.id && invoice.periodLabel === periodLabel;
              });
              if (exists) { skipped += 1; return; }
              store.invoices.push({
                id: Storage.uid('inv'),
                instituteId: Storage.INSTITUTE_ID,
                invoiceNo: Storage.nextSerial(store.invoices, 'invoiceNo', 'INV-', 1000),
                studentId: studentId,
                feeStructureId: structure.id,
                periodLabel: periodLabel,
                amount: Number(structure.amount),
                discount: discount,
                lateFee: late,
                dueDate: dueDate,
                academicYear: structure.academicYear,
                createdAt: Storage.today()
              });
              created += 1;
            });
          });
          App.closeModal();
          App.toast(created + ' invoice' + (created === 1 ? '' : 's') + ' created.' + (skipped ? ' Skipped ' + skipped + ' duplicate period' + (skipped === 1 ? '' : 's') + '.' : ''), created ? 'success' : 'error');
          tab = 'invoices';
          renderFees();
        });
      }
    });
  }

  function viewInvoice(id) {
    var data = Storage.load();
    var invoice = data.invoices.find(function (item) { return item.id === id; });
    if (!invoice) return;
    var view = Storage.invoiceView(invoice, data.payments, Storage.today());
    var payments = data.payments.filter(function (payment) { return payment.invoiceId === id; });
    App.openModal({
      title: invoice.invoiceNo,
      html: '<div class="kv"><span>Student</span><div>' + App.esc(Storage.nameOf('students', invoice.studentId)) + '</div><span>Period</span><div>' + App.esc(invoice.periodLabel) + '</div><span>Tuition</span><div>' + App.money(invoice.amount) + '</div><span>Discount</span><div>' + App.money(invoice.discount || 0) + '</div><span>Late fee</span><div>' + App.money(invoice.lateFee || 0) + '</div><span>Total</span><div>' + App.money(view.total) + '</div><span>Paid</span><div>' + App.money(view.paid) + '</div><span>Balance</span><div>' + App.money(view.balance) + '</div><span>Status</span><div>' + App.badge(view.status) + '</div><span>Due</span><div>' + App.esc(Storage.formatDate(invoice.dueDate)) + '</div></div>' +
        (payments.length ? '<h3 class="card-title" style="margin-top:14px">Payments</h3><div class="list">' + payments.map(function (payment) { return '<div class="list-row"><div>' + App.esc(payment.receiptNo) + ' · ' + App.esc(payment.method) + '</div><div>' + App.money(payment.amount) + '</div></div>'; }).join('') + '</div>' : '<p class="muted" style="margin-top:12px">No payments yet.</p>')
    });
  }

  function paymentRows() {
    var data = Storage.load();
    return data.payments.filter(function (payment) {
      var name = Storage.nameOf('students', payment.studentId, '');
      var hay = (name + ' ' + payment.receiptNo + ' ' + payment.method).toLowerCase();
      if (payFilters.q && hay.indexOf(payFilters.q.toLowerCase()) === -1) return false;
      if (payFilters.method && payment.method !== payFilters.method) return false;
      return true;
    }).sort(function (a, b) { return a.date < b.date ? 1 : -1; });
  }

  function renderPayments() {
    var rows = paymentRows();
    var pages = Math.max(1, Math.ceil(rows.length / 8));
    if (page > pages) page = pages;
    var slice = rows.slice((page - 1) * 8, page * 8);
    var content = document.getElementById('content');
    content.innerHTML = '<section class="card"><div class="toolbar"><div class="filters"><input id="pay-q" type="search" placeholder="Search student or receipt" value="' + App.esc(payFilters.q) + '"><select id="pay-method"><option value="">All methods</option>' + ['Cash', 'UPI', 'Bank Transfer', 'Card'].map(function (method) { return '<option' + (payFilters.method === method ? ' selected' : '') + '>' + method + '</option>'; }).join('') + '</select></div><button type="button" class="btn btn-primary" id="record-payment">Record payment</button></div>' +
      (slice.length ? '<div class="table-wrap"><table><thead><tr><th>Receipt</th><th>Student</th><th>Date</th><th>Method</th><th class="num">Amount</th><th></th></tr></thead><tbody>' + slice.map(function (payment) {
        return '<tr><td>' + App.esc(payment.receiptNo) + '</td><td>' + App.esc(Storage.nameOf('students', payment.studentId)) + '</td><td>' + App.esc(Storage.formatDate(payment.date)) + '</td><td>' + App.esc(payment.method) + '</td><td class="num">' + App.money(payment.amount) + '</td><td class="actions"><button type="button" class="btn btn-ghost btn-sm" data-receipt="' + App.esc(payment.id) + '">Receipt</button><button type="button" class="btn btn-secondary btn-sm" data-edit-payment="' + App.esc(payment.id) + '">Edit</button><button type="button" class="btn btn-danger btn-sm" data-delete-payment="' + App.esc(payment.id) + '">Delete</button></td></tr>';
      }).join('') + '</tbody></table></div>' + App.pager(page, pages) : App.empty('No payments match these filters.')) + '</section>';
    content.querySelector('#pay-q').addEventListener('input', function (event) {
      payFilters.q = event.target.value;
      var caret = event.target.selectionStart;
      page = 1;
      renderPayments();
      var again = document.getElementById('pay-q');
      if (again) {
        again.focus();
        if (caret != null) again.setSelectionRange(caret, caret);
      }
    });
    content.querySelector('#pay-method').addEventListener('change', function (event) { payFilters.method = event.target.value; page = 1; renderPayments(); });
    content.querySelector('#record-payment').addEventListener('click', function () { paymentForm(null); });
    content.querySelectorAll('.pager [data-page]').forEach(function (button) {
      button.addEventListener('click', function () { if (!button.disabled) { page = Number(button.getAttribute('data-page')); renderPayments(); } });
    });
    content.querySelectorAll('[data-receipt]').forEach(function (button) { button.addEventListener('click', function () { showReceipt(button.getAttribute('data-receipt'), true); }); });
    content.querySelectorAll('[data-edit-payment]').forEach(function (button) { button.addEventListener('click', function () { paymentForm(Storage.byId(Storage.load().payments, button.getAttribute('data-edit-payment'))); }); });
    content.querySelectorAll('[data-delete-payment]').forEach(function (button) {
      button.addEventListener('click', function () {
        var payment = Storage.byId(Storage.load().payments, button.getAttribute('data-delete-payment'));
        App.confirmDialog({ title: 'Delete payment', message: 'Delete receipt ' + payment.receiptNo + '? The invoice balance will update.', confirmText: 'Delete', danger: true }).then(function (yes) {
          if (!yes) return;
          Storage.update(function (data) { data.payments = data.payments.filter(function (item) { return item.id !== payment.id; }); });
          App.toast('Payment deleted.', 'success');
          renderPayments();
        });
      });
    });
  }

  function openInvoices(studentId, includeId) {
    return views().filter(function (invoice) {
      if (invoice.studentId !== studentId) return false;
      return invoice.balance > 0 || invoice.id === includeId;
    });
  }

  function paymentForm(payment) {
    var data = Storage.load();
    var presetInvoice = payment ? payment.invoiceId : new URLSearchParams(location.search).get('invoice');
    var preset = presetInvoice ? data.invoices.find(function (invoice) { return invoice.id === presetInvoice; }) : null;
    var studentId = payment ? payment.studentId : (preset ? preset.studentId : '');
    App.openModal({
      title: payment ? 'Edit payment' : 'Record payment',
      html: '<form id="payment-form" class="stack"><div class="field"><label for="student">Student</label><select id="student">' + App.optionsHtml(data.students.slice().sort(function (a, b) { return a.name < b.name ? -1 : 1; }), studentId, function (student) { return student.id; }, function (student) { return student.name + ' · ' + student.admissionNo; }, 'Select a student') + '</select><div class="field-error"></div></div><div class="field"><label for="invoice">Invoice</label><select id="invoice"></select><div class="field-error"></div><p class="help" id="balance-note"></p></div><div class="field"><label for="amount">Amount</label><input id="amount" type="number" min="1" step="1" value="' + (payment ? App.esc(payment.amount) : '') + '" required><div class="field-error"></div></div><div class="field"><label for="method">Method</label><select id="method">' + ['Cash', 'UPI', 'Bank Transfer', 'Card'].map(function (method) { return '<option' + (payment && payment.method === method ? ' selected' : '') + '>' + method + '</option>'; }).join('') + '</select><div class="field-error"></div></div><div class="field"><label for="date">Date</label><input id="date" type="date" value="' + App.esc(payment ? payment.date : Storage.today()) + '" required><div class="field-error"></div></div><div class="field"><label for="note">Note</label><input id="note" value="' + App.esc(payment ? payment.note || '' : '') + '"><div class="field-error"></div></div><div class="modal-actions"><button type="button" class="btn btn-ghost" id="cancel-payment">Cancel</button><button class="btn btn-primary" type="submit">Save payment</button></div></form>',
      onMount: function (root) {
        var student = root.querySelector('#student');
        var invoice = root.querySelector('#invoice');
        var note = root.querySelector('#balance-note');
        function fillInvoices() {
          var list = openInvoices(student.value, payment ? payment.invoiceId : presetInvoice);
          invoice.innerHTML = list.length ? list.map(function (item) {
            var selected = (payment && payment.invoiceId === item.id) || (!payment && presetInvoice === item.id);
            return '<option value="' + App.esc(item.id) + '"' + (selected ? ' selected' : '') + '>' + App.esc(item.invoiceNo) + ' · ' + App.esc(item.periodLabel) + ' · due ' + App.money(item.balance) + '</option>';
          }).join('') : '<option value="">No open invoice</option>';
          var current = list.find(function (item) { return item.id === invoice.value; }) || list[0];
          note.textContent = current ? 'Balance ' + App.money(current.balance) + ' · ' + current.status : 'Choose a student with an open invoice.';
          if (!payment && current && !root.querySelector('#amount').value) root.querySelector('#amount').value = current.balance;
        }
        student.addEventListener('change', function () { root.querySelector('#amount').value = ''; fillInvoices(); });
        invoice.addEventListener('change', function () {
          var current = openInvoices(student.value, payment ? payment.invoiceId : presetInvoice).find(function (item) { return item.id === invoice.value; });
          if (current && !payment) root.querySelector('#amount').value = current.balance;
          note.textContent = current ? 'Balance ' + App.money(current.balance) + ' · ' + current.status : '';
        });
        fillInvoices();
        root.querySelector('#cancel-payment').addEventListener('click', App.closeModal);
        root.querySelector('#payment-form').addEventListener('submit', function (event) {
          event.preventDefault();
          var ok = true;
          if (!student.value) { App.setFieldError(student, 'Student is required.'); ok = false; }
          if (!invoice.value) { App.setFieldError(invoice, 'Invoice is required.'); ok = false; }
          var amount = Number(root.querySelector('#amount').value);
          var date = root.querySelector('#date').value;
          if (!amount || amount <= 0) { App.setFieldError(root.querySelector('#amount'), 'Enter an amount greater than zero.'); ok = false; }
          if (!date) { App.setFieldError(root.querySelector('#date'), 'Date is required.'); ok = false; }
          else if (date > Storage.today()) { App.setFieldError(root.querySelector('#date'), 'Payment date cannot be in the future.'); ok = false; }
          var current = views().find(function (item) { return item.id === invoice.value; });
          var room = current ? current.balance + (payment && payment.invoiceId === current.id ? Number(payment.amount) : 0) : 0;
          if (current && amount > room + 0.001) { App.setFieldError(root.querySelector('#amount'), 'Amount is higher than the balance of ' + App.money(room) + '.'); ok = false; }
          if (!ok) { App.toast('Check the highlighted fields.', 'error'); return; }
          var savedId = payment ? payment.id : Storage.uid('pay');
          Storage.update(function (store) {
            var record = {
              id: savedId,
              instituteId: Storage.INSTITUTE_ID,
              invoiceId: invoice.value,
              studentId: student.value,
              amount: amount,
              method: root.querySelector('#method').value,
              date: date,
              receiptNo: payment ? payment.receiptNo : Storage.nextSerial(store.payments, 'receiptNo', 'RCP-', 5000),
              note: root.querySelector('#note').value.trim(),
              receivedBy: Auth.currentUser().name
            };
            var index = store.payments.findIndex(function (item) { return item.id === record.id; });
            if (index === -1) store.payments.push(record);
            else store.payments[index] = record;
          });
          App.closeModal();
          App.toast('Payment saved.', 'success');
          if (document.body.dataset.page === 'payments') renderPayments();
          showReceipt(savedId, false);
        });
      }
    });
  }

  function showReceipt(id, fromList) {
    var data = Storage.load();
    var payment = Storage.byId(data.payments, id);
    if (!payment) return;
    var invoice = Storage.byId(data.invoices, payment.invoiceId);
    var student = Storage.byId(data.students, payment.studentId);
    var html = '<div class="kv"><span>Receipt</span><div>' + App.esc(payment.receiptNo) + '</div><span>Date</span><div>' + App.esc(Storage.formatDate(payment.date)) + '</div><span>Student</span><div>' + App.esc(student ? student.name : '—') + '</div><span>Admission no.</span><div>' + App.esc(student ? student.admissionNo : '—') + '</div><span>Invoice</span><div>' + App.esc(invoice ? invoice.invoiceNo : '—') + ' · ' + App.esc(invoice ? invoice.periodLabel : '') + '</div><span>Method</span><div>' + App.esc(payment.method) + '</div><span>Amount</span><div>' + App.money(payment.amount) + '</div><span>Received by</span><div>' + App.esc(payment.receivedBy || '—') + '</div>' + (payment.note ? '<span>Note</span><div>' + App.esc(payment.note) + '</div>' : '') + '</div><div class="modal-actions"><button type="button" class="btn btn-primary" id="print-receipt">Print receipt</button>' + (fromList ? '' : '<button type="button" class="btn btn-ghost" id="close-receipt">Close</button>') + '</div>';
    App.openModal({
      title: 'Fee receipt',
      html: html,
      onMount: function (root) {
        root.querySelector('#print-receipt').addEventListener('click', function () {
          App.printDocument({
            title: 'Fee receipt ' + payment.receiptNo,
            subtitle: Storage.formatDate(payment.date),
            html: '<table><tbody><tr><th>Student</th><td>' + App.esc(student ? student.name : '') + '</td></tr><tr><th>Admission no.</th><td>' + App.esc(student ? student.admissionNo : '') + '</td></tr><tr><th>Invoice</th><td>' + App.esc(invoice ? invoice.invoiceNo : '') + '</td></tr><tr><th>Period</th><td>' + App.esc(invoice ? invoice.periodLabel : '') + '</td></tr><tr><th>Method</th><td>' + App.esc(payment.method) + '</td></tr><tr><th>Amount</th><td>' + App.money(payment.amount) + '</td></tr><tr><th>Received by</th><td>' + App.esc(payment.receivedBy || '') + '</td></tr></tbody></table>'
          });
        });
        var close = root.querySelector('#close-receipt');
        if (close) close.addEventListener('click', App.closeModal);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var pageName = document.body.dataset.page;
    if (pageName !== 'fees' && pageName !== 'payments') return;
    var user = Auth.guard(['admin', 'accountant']);
    if (!user) return;
    if (pageName === 'fees') {
      App.renderShell({ active: 'fees', title: 'Fees', subtitle: 'Structures, invoices, discounts, and late fees' });
      renderFees();
    } else {
      App.renderShell({ active: 'payments', title: 'Payments', subtitle: 'Cash, UPI, bank transfer, and card' });
      renderPayments();
      if (new URLSearchParams(location.search).get('invoice')) paymentForm(null);
    }
  });
})();
