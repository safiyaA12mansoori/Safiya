/**
 * Mark, edit, and review attendance. One row is kept per student, batch, and date.
 */
(function () {
  var user = null;
  var tab = 'mark';
  var markDate = '';
  var markBatch = '';
  var draft = {};
  var history = { batch: '', from: '', to: '', q: '', page: 1 };
  var month = '';
  var monthBatch = '';

  function batches() {
    var list = user.role === 'teacher' ? Storage.scope(user).batches : Storage.load().batches;
    return list.filter(function (batch) { return batch.status === 'Active'; });
  }

  function roster(batchId) {
    return Storage.load().students.filter(function (student) {
      return student.batchId === batchId && student.status === 'Active';
    }).sort(function (a, b) { return a.name < b.name ? -1 : 1; });
  }

  function loadDraft() {
    draft = {};
    if (!markBatch) return;
    Storage.load().attendance.forEach(function (row) {
      if (row.batchId === markBatch && row.date === markDate) draft[row.studentId] = row.status;
    });
    roster(markBatch).forEach(function (student) {
      if (!draft[student.id]) draft[student.id] = 'present';
    });
  }

  function statusButtons(studentId) {
    return ['present', 'absent', 'late'].map(function (status) {
      var label = status.charAt(0).toUpperCase() + status.slice(1);
      var pressed = draft[studentId] === status;
      return '<button type="button" class="btn btn-sm ' + (pressed ? 'btn-primary' : 'btn-ghost') + '" data-set="' + status + '" data-student="' + App.esc(studentId) + '" aria-pressed="' + pressed + '">' + label + '</button>';
    }).join('');
  }

  function markPane() {
    var students = markBatch ? roster(markBatch) : [];
    var existing = Storage.load().attendance.some(function (row) {
      return row.batchId === markBatch && row.date === markDate;
    });
    return '<section class="card"><div class="toolbar"><div class="filters"><label class="field">Date<input id="mark-date" type="date" value="' + App.esc(markDate) + '"></label><label class="field">Batch<select id="mark-batch">' + App.optionsHtml(batches(), markBatch, function (batch) { return batch.id; }, function (batch) { return batch.name; }, 'Select a batch') + '</select></label></div><div class="row"><button type="button" class="btn btn-secondary" id="mark-all">Mark all present</button><button type="button" class="btn btn-primary" id="save-attendance">' + (existing ? 'Update attendance' : 'Save attendance') + '</button></div></div>' +
      (markBatch ? (students.length ? '<div class="table-wrap"><table><thead><tr><th>Admission</th><th>Student</th><th>Mark</th></tr></thead><tbody>' + students.map(function (student) {
        return '<tr><td>' + App.esc(student.admissionNo) + '</td><td>' + App.esc(student.name) + '</td><td><div class="seg">' + statusButtons(student.id) + '</div></td></tr>';
      }).join('') + '</tbody></table></div>' : App.empty('This batch has no active students.')) : App.empty('Choose a batch to mark attendance.')) +
      '</section>';
  }

  function historyRows() {
    var data = user.role === 'teacher' ? Storage.scope(user) : Storage.load();
    return data.attendance.filter(function (row) {
      if (history.batch && row.batchId !== history.batch) return false;
      if (history.from && row.date < history.from) return false;
      if (history.to && row.date > history.to) return false;
      var name = Storage.nameOf('students', row.studentId, '');
      if (history.q && name.toLowerCase().indexOf(history.q.toLowerCase()) === -1) return false;
      return true;
    }).sort(function (a, b) { return a.date < b.date ? 1 : -1; });
  }

  function historyPane() {
    var rows = historyRows();
    var pages = Math.max(1, Math.ceil(rows.length / 8));
    if (history.page > pages) history.page = pages;
    var slice = rows.slice((history.page - 1) * 8, history.page * 8);
    return '<section class="card"><div class="toolbar"><div class="filters"><input id="h-q" type="search" placeholder="Search student" value="' + App.esc(history.q) + '"><select id="h-batch">' + App.optionsHtml(batches(), history.batch, function (batch) { return batch.id; }, function (batch) { return batch.name; }, 'All batches') + '</select><input id="h-from" type="date" value="' + App.esc(history.from) + '"><input id="h-to" type="date" value="' + App.esc(history.to) + '"></div></div>' +
      (slice.length ? '<div class="table-wrap"><table><thead><tr><th>Date</th><th>Student</th><th>Batch</th><th>Status</th><th></th></tr></thead><tbody>' + slice.map(function (row) {
        return '<tr><td>' + App.esc(Storage.formatDate(row.date)) + '</td><td>' + App.esc(Storage.nameOf('students', row.studentId)) + '</td><td>' + App.esc(Storage.nameOf('batches', row.batchId)) + '</td><td>' + App.badge(row.status.charAt(0).toUpperCase() + row.status.slice(1)) + '</td><td class="actions"><button type="button" class="btn btn-secondary btn-sm" data-edit-date="' + App.esc(row.date) + '" data-edit-batch="' + App.esc(row.batchId) + '">Edit</button></td></tr>';
      }).join('') + '</tbody></table></div>' + App.pager(history.page, pages) : App.empty('No attendance in this range.')) + '</section>';
  }

  function monthRows() {
    if (!month || !monthBatch) return [];
    var prefix = month;
    return roster(monthBatch).map(function (student) {
      var rows = Storage.load().attendance.filter(function (row) {
        return row.studentId === student.id && row.batchId === monthBatch && row.date.slice(0, 7) === prefix;
      });
      var summary = Storage.attendanceSummary(rows);
      return { student: student, summary: summary };
    });
  }

  function monthlyPane() {
    var rows = monthRows();
    return '<section class="card"><div class="toolbar"><div class="filters"><label class="field">Month<input id="month" type="month" value="' + App.esc(month) + '"></label><label class="field">Batch<select id="month-batch">' + App.optionsHtml(batches(), monthBatch, function (batch) { return batch.id; }, function (batch) { return batch.name; }, 'Select a batch') + '</select></label></div><div class="row"><button type="button" class="btn btn-secondary" id="print-month">Print</button><button type="button" class="btn btn-secondary" id="csv-month">Export CSV</button></div></div>' +
      (month && monthBatch ? (rows.length ? '<div class="table-wrap"><table><thead><tr><th>Student</th><th class="num">Present</th><th class="num">Late</th><th class="num">Absent</th><th class="num">Rate</th></tr></thead><tbody>' + rows.map(function (row) {
        return '<tr><td>' + App.esc(row.student.name) + '</td><td class="num">' + row.summary.present + '</td><td class="num">' + row.summary.late + '</td><td class="num">' + row.summary.absent + '</td><td class="num">' + row.summary.rate + '%</td></tr>';
      }).join('') + '</tbody></table></div>' : App.empty('No active students in this batch.')) : App.empty('Choose a month and a batch.')) + '</section>';
  }

  function render() {
    var content = document.getElementById('content');
    var tabs = '<div class="tabs" role="tablist"><button type="button" class="tab" data-tab="mark" aria-selected="' + (tab === 'mark') + '">Mark</button><button type="button" class="tab" data-tab="history" aria-selected="' + (tab === 'history') + '">History</button><button type="button" class="tab" data-tab="monthly" aria-selected="' + (tab === 'monthly') + '">Monthly report</button></div>';
    var pane = tab === 'history' ? historyPane() : tab === 'monthly' ? monthlyPane() : markPane();
    content.innerHTML = tabs + pane;
    bind();
  }

  function save() {
    if (!markBatch) { App.toast('Choose a batch first.', 'error'); return; }
    if (!markDate) { App.toast('Choose a date.', 'error'); return; }
    if (markDate > Storage.today()) { App.toast('Attendance cannot be marked for a future date.', 'error'); return; }
    var students = roster(markBatch);
    if (!students.length) { App.toast('This batch has no active students.', 'error'); return; }
    var updated = 0;
    Storage.update(function (data) {
      students.forEach(function (student) {
        var status = draft[student.id] || 'present';
        var existing = data.attendance.find(function (row) {
          return row.studentId === student.id && row.batchId === markBatch && row.date === markDate;
        });
        if (existing) {
          existing.status = status;
          existing.markedBy = user.id;
          existing.updatedAt = new Date().toISOString();
          updated += 1;
        } else {
          data.attendance.push({
            id: Storage.uid('att'),
            instituteId: Storage.INSTITUTE_ID,
            studentId: student.id,
            batchId: markBatch,
            date: markDate,
            status: status,
            markedBy: user.id,
            updatedAt: new Date().toISOString()
          });
        }
      });
    });
    App.toast(updated ? 'Attendance updated. Duplicate rows were not added.' : 'Attendance saved.', 'success');
    render();
  }

  function exportMonth() {
    var rows = monthRows();
    if (!rows.length) { App.toast('Nothing to export.', 'error'); return; }
    var batch = Storage.byId(Storage.load().batches, monthBatch);
    App.downloadCsv('attendance-' + month + '.csv', [['Student', 'Admission', 'Present', 'Late', 'Absent', 'Rate']].concat(rows.map(function (row) {
      return [row.student.name, row.student.admissionNo, row.summary.present, row.summary.late, row.summary.absent, row.summary.rate + '%'];
    })));
    return batch;
  }

  function bind() {
    var content = document.getElementById('content');
    content.querySelectorAll('[data-tab]').forEach(function (button) {
      button.addEventListener('click', function () { tab = button.getAttribute('data-tab'); render(); });
    });
    var date = content.querySelector('#mark-date');
    var batch = content.querySelector('#mark-batch');
    if (date) date.addEventListener('change', function () { markDate = date.value; loadDraft(); render(); });
    if (batch) batch.addEventListener('change', function () { markBatch = batch.value; loadDraft(); render(); });
    var all = content.querySelector('#mark-all');
    if (all) all.addEventListener('click', function () {
      roster(markBatch).forEach(function (student) { draft[student.id] = 'present'; });
      render();
    });
    var saveBtn = content.querySelector('#save-attendance');
    if (saveBtn) saveBtn.addEventListener('click', save);
    content.querySelectorAll('[data-set]').forEach(function (button) {
      button.addEventListener('click', function () {
        draft[button.getAttribute('data-student')] = button.getAttribute('data-set');
        render();
      });
    });
    var hq = content.querySelector('#h-q');
    if (hq) {
      hq.addEventListener('input', function () {
        history.q = hq.value;
        var caret = hq.selectionStart;
        history.page = 1;
        render();
        var again = document.getElementById('h-q');
        if (again) {
          again.focus();
          if (caret != null) again.setSelectionRange(caret, caret);
        }
      });
      content.querySelector('#h-batch').addEventListener('change', function (event) { history.batch = event.target.value; history.page = 1; render(); });
      content.querySelector('#h-from').addEventListener('change', function (event) { history.from = event.target.value; history.page = 1; render(); });
      content.querySelector('#h-to').addEventListener('change', function (event) { history.to = event.target.value; history.page = 1; render(); });
    }
    content.querySelectorAll('[data-edit-date]').forEach(function (button) {
      button.addEventListener('click', function () {
        markDate = button.getAttribute('data-edit-date');
        markBatch = button.getAttribute('data-edit-batch');
        tab = 'mark';
        loadDraft();
        render();
      });
    });
    var pager = content.querySelector('.pager [data-page]');
    content.querySelectorAll('.pager [data-page]').forEach(function (button) {
      button.addEventListener('click', function () {
        if (button.disabled) return;
        history.page = Number(button.getAttribute('data-page'));
        render();
      });
    });
    var monthInput = content.querySelector('#month');
    if (monthInput) {
      monthInput.addEventListener('change', function () { month = monthInput.value; render(); });
      content.querySelector('#month-batch').addEventListener('change', function (event) { monthBatch = event.target.value; render(); });
      content.querySelector('#csv-month').addEventListener('click', exportMonth);
      content.querySelector('#print-month').addEventListener('click', function () {
        var rows = monthRows();
        if (!rows.length) { App.toast('Nothing to print.', 'error'); return; }
        var batchName = Storage.nameOf('batches', monthBatch);
        App.printDocument({
          title: 'Monthly attendance',
          subtitle: batchName + ' · ' + month,
          html: '<table><thead><tr><th>Student</th><th>Present</th><th>Late</th><th>Absent</th><th>Rate</th></tr></thead><tbody>' + rows.map(function (row) {
            return '<tr><td>' + App.esc(row.student.name) + '</td><td>' + row.summary.present + '</td><td>' + row.summary.late + '</td><td>' + row.summary.absent + '</td><td>' + row.summary.rate + '%</td></tr>';
          }).join('') + '</tbody></table>'
        });
      });
    }
    if (pager) { /* listener bound above */ }
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (document.body.dataset.page !== 'attendance') return;
    user = Auth.guard(['admin', 'teacher']);
    if (!user) return;
    markDate = Storage.today();
    month = Storage.today().slice(0, 7);
    var available = batches();
    if (available.length) {
      markBatch = available[0].id;
      monthBatch = available[0].id;
    }
    loadDraft();
    App.renderShell({ active: 'attendance', title: 'Attendance', subtitle: 'Present, absent, or late — one mark per student and session' });
    render();
  });
})();
