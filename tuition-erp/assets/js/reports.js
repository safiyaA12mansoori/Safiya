/**
 * Operational reports. Filters apply to the on-screen table, the printout, and the CSV.
 */
(function () {
  var user = null;
  var current = '';
  var filters = { q: '', batch: '', from: '', to: '' };

  function allowed() {
    var all = [
      { id: 'admissions', label: 'Student admission', roles: ['admin', 'teacher', 'accountant'] },
      { id: 'attendance', label: 'Student attendance', roles: ['admin', 'teacher'] },
      { id: 'collection', label: 'Fee collection', roles: ['admin', 'accountant'] },
      { id: 'pending', label: 'Pending fees', roles: ['admin', 'accountant'] },
      { id: 'teachers', label: 'Teachers', roles: ['admin', 'teacher'] },
      { id: 'batches', label: 'Batches', roles: ['admin', 'teacher'] },
      { id: 'results', label: 'Examination results', roles: ['admin', 'teacher'] }
    ];
    return all.filter(function (report) { return report.roles.indexOf(user.role) !== -1; });
  }

  function dataFor() {
    if (user.role === 'teacher') return Storage.scope(user);
    return Storage.load();
  }

  function inRange(value) {
    if (!value) return !filters.from && !filters.to;
    if (filters.from && value < filters.from) return false;
    if (filters.to && value > filters.to) return false;
    return true;
  }

  function batchOk(batchId) {
    return !filters.batch || batchId === filters.batch;
  }

  function textOk(text) {
    return !filters.q || String(text).toLowerCase().indexOf(filters.q.toLowerCase()) !== -1;
  }

  function build() {
    var data = dataFor();
    var full = Storage.load();
    if (current === 'admissions') {
      var rows = data.students.filter(function (student) {
        return inRange(student.admissionDate) && batchOk(student.batchId) && textOk(student.name + ' ' + student.admissionNo);
      }).map(function (student) {
        return [student.admissionNo, student.name, student.gender, Storage.nameOf('courses', student.courseId), Storage.nameOf('batches', student.batchId), Storage.formatDate(student.admissionDate), student.status, student.mobile];
      });
      return { columns: ['Admission no.', 'Name', 'Gender', 'Course', 'Batch', 'Admitted', 'Status', 'Mobile'], rows: rows };
    }
    if (current === 'attendance') {
      var attendance = data.attendance.filter(function (row) {
        return inRange(row.date) && batchOk(row.batchId) && textOk(Storage.nameOf('students', row.studentId));
      }).map(function (row) {
        return [Storage.formatDate(row.date), Storage.nameOf('students', row.studentId), Storage.nameOf('batches', row.batchId), row.status];
      });
      return { columns: ['Date', 'Student', 'Batch', 'Status'], rows: attendance };
    }
    if (current === 'collection') {
      var payments = full.payments.filter(function (payment) {
        var student = Storage.byId(full.students, payment.studentId);
        return inRange(payment.date) && batchOk(student ? student.batchId : '') && textOk(Storage.nameOf('students', payment.studentId) + ' ' + payment.receiptNo);
      }).map(function (payment) {
        return [Storage.formatDate(payment.date), payment.receiptNo, Storage.nameOf('students', payment.studentId), payment.method, payment.amount];
      });
      return { columns: ['Date', 'Receipt', 'Student', 'Method', 'Amount'], rows: payments };
    }
    if (current === 'pending') {
      var pending = full.invoices.map(function (invoice) {
        return Object.assign({}, invoice, Storage.invoiceView(invoice, full.payments, Storage.today()));
      }).filter(function (invoice) {
        var student = Storage.byId(full.students, invoice.studentId);
        return invoice.balance > 0 && inRange(invoice.dueDate) && batchOk(student ? student.batchId : '') && textOk(Storage.nameOf('students', invoice.studentId) + ' ' + invoice.invoiceNo);
      }).map(function (invoice) {
        return [invoice.invoiceNo, Storage.nameOf('students', invoice.studentId), Storage.formatDate(invoice.dueDate), invoice.total, invoice.paid, invoice.balance, invoice.status];
      });
      return { columns: ['Invoice', 'Student', 'Due', 'Total', 'Paid', 'Balance', 'Status'], rows: pending };
    }
    if (current === 'teachers') {
      var teachers = (user.role === 'teacher' ? data.teachers : full.teachers).filter(function (teacher) {
        return (!filters.from && !filters.to || inRange(teacher.joiningDate)) && textOk(teacher.name + ' ' + teacher.employeeNo);
      }).map(function (teacher) {
        var names = full.batches.filter(function (batch) { return batch.teacherId === teacher.id; }).map(function (batch) { return batch.name; }).join(', ');
        return [teacher.employeeNo, teacher.name, (teacher.subjects || []).join(', '), names || '—', teacher.mobile, teacher.status];
      });
      return { columns: ['Employee no.', 'Name', 'Subjects', 'Batches', 'Mobile', 'Status'], rows: teachers };
    }
    if (current === 'batches') {
      var batches = data.batches.filter(function (batch) {
        return batchOk(batch.id) && textOk(batch.name + ' ' + Storage.nameOf('courses', batch.courseId));
      }).map(function (batch) {
        var count = full.students.filter(function (student) { return student.batchId === batch.id; }).length;
        return [batch.name, Storage.nameOf('courses', batch.courseId), Storage.nameOf('teachers', batch.teacherId, 'Unassigned'), Storage.scheduleLabel(batch), count + ' / ' + batch.maxStudents, batch.status];
      });
      return { columns: ['Batch', 'Course', 'Teacher', 'Timing', 'Enrolled', 'Status'], rows: batches };
    }
    var results = data.results.filter(function (result) {
      var exam = Storage.byId(full.exams, result.examId);
      var student = Storage.byId(full.students, result.studentId);
      return exam && inRange(exam.date) && batchOk(exam.batchId) && textOk((student ? student.name : '') + ' ' + exam.name);
    }).map(function (result) {
      var exam = Storage.byId(full.exams, result.examId);
      return [exam.name, Storage.nameOf('students', result.studentId), Storage.formatDate(exam.date), result.total + '/' + result.maxTotal, result.percentage + '%', result.grade, result.result];
    });
    return { columns: ['Examination', 'Student', 'Date', 'Total', 'Percent', 'Grade', 'Result'], rows: results };
  }

  function tableHtml(report) {
    if (!report.rows.length) return App.empty('No rows for these filters.');
    return '<div class="table-wrap"><table><thead><tr>' + report.columns.map(function (column) { return '<th>' + App.esc(column) + '</th>'; }).join('') + '</tr></thead><tbody>' + report.rows.map(function (row) {
      return '<tr>' + row.map(function (cell) { return '<td>' + App.esc(cell) + '</td>'; }).join('') + '</tr>';
    }).join('') + '</tbody></table></div><p class="muted">' + report.rows.length + ' row' + (report.rows.length === 1 ? '' : 's') + '</p>';
  }

  function render() {
    var reports = allowed();
    if (!current) current = reports[0].id;
    var report = build();
    var usesDate = current === 'admissions' || current === 'attendance' || current === 'collection' || current === 'pending' || current === 'results' || current === 'teachers';
    var usesBatch = current !== 'teachers';
    var content = document.getElementById('content');
    content.innerHTML = '<div class="tabs">' + reports.map(function (item) {
      return '<button type="button" class="tab" data-report="' + item.id + '" aria-selected="' + (item.id === current) + '">' + App.esc(item.label) + '</button>';
    }).join('') + '</div><section class="card"><div class="toolbar"><div class="filters"><input id="report-q" type="search" placeholder="Search" value="' + App.esc(filters.q) + '">' +
      (usesBatch ? '<select id="report-batch">' + App.optionsHtml(dataFor().batches, filters.batch, function (batch) { return batch.id; }, function (batch) { return batch.name; }, 'All batches') + '</select>' : '') +
      (usesDate ? '<input id="report-from" type="date" value="' + App.esc(filters.from) + '" aria-label="From date"><input id="report-to" type="date" value="' + App.esc(filters.to) + '" aria-label="To date">' : '') +
      '</div><div class="row"><button type="button" class="btn btn-secondary" id="report-print">Print</button><button type="button" class="btn btn-primary" id="report-csv">Export CSV</button></div></div><div id="report-body">' + tableHtml(report) + '</div></section>';
    content.querySelectorAll('[data-report]').forEach(function (button) {
      button.addEventListener('click', function () { current = button.getAttribute('data-report'); render(); });
    });
    var search = content.querySelector('#report-q');
    search.addEventListener('input', function () {
      filters.q = search.value;
      var caret = search.selectionStart;
      document.getElementById('report-body').innerHTML = tableHtml(build());
      search.focus();
      if (caret != null) search.selectionStart = search.selectionEnd = caret;
    });
    var batch = content.querySelector('#report-batch');
    if (batch) batch.addEventListener('change', function () { filters.batch = batch.value; document.getElementById('report-body').innerHTML = tableHtml(build()); });
    var from = content.querySelector('#report-from');
    var to = content.querySelector('#report-to');
    if (from) from.addEventListener('change', function () { filters.from = from.value; document.getElementById('report-body').innerHTML = tableHtml(build()); });
    if (to) to.addEventListener('change', function () { filters.to = to.value; document.getElementById('report-body').innerHTML = tableHtml(build()); });
    content.querySelector('#report-print').addEventListener('click', function () {
      var fresh = build();
      if (!fresh.rows.length) { App.toast('Nothing to print.', 'error'); return; }
      var label = reports.find(function (item) { return item.id === current; }).label;
      App.printDocument({
        title: label + ' report',
        subtitle: Storage.formatDate(Storage.today()),
        html: '<table><thead><tr>' + fresh.columns.map(function (column) { return '<th>' + App.esc(column) + '</th>'; }).join('') + '</tr></thead><tbody>' + fresh.rows.map(function (row) {
          return '<tr>' + row.map(function (cell) { return '<td>' + App.esc(cell) + '</td>'; }).join('') + '</tr>';
        }).join('') + '</tbody></table>'
      });
    });
    content.querySelector('#report-csv').addEventListener('click', function () {
      var fresh = build();
      if (!fresh.rows.length) { App.toast('Nothing to export.', 'error'); return; }
      App.downloadCsv(current + '-report.csv', [fresh.columns].concat(fresh.rows));
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (document.body.dataset.page !== 'reports') return;
    user = Auth.guard(['admin', 'teacher', 'accountant']);
    if (!user) return;
    App.renderShell({ active: 'reports', title: 'Reports', subtitle: 'Filter, print, or export CSV' });
    render();
  });
})();
