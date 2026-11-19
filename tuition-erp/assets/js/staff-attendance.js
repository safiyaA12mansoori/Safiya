/**
 * One attendance row per teacher per date.
 * Admin marks the staff. A teacher can only read their own history.
 */
(function () {
  var STATUSES = ['present', 'absent', 'late'];
  var markDate = '';
  var draft = {};
  var historyTeacher = '';
  var tab = 'mark';

  function roster() {
    return Storage.load().teachers.filter(function (teacher) { return teacher.status !== 'Resigned'; })
      .sort(function (a, b) { return a.name.localeCompare(b.name); });
  }

  function loadDraft() {
    draft = {};
    Storage.load().staffAttendance.forEach(function (row) {
      if (row.date === markDate) draft[row.teacherId] = row.status;
    });
    roster().forEach(function (teacher) {
      if (!draft[teacher.id]) draft[teacher.id] = 'present';
    });
  }

  function statusButtons(teacherId) {
    return '<div class="seg">' + STATUSES.map(function (status) {
      var pressed = draft[teacherId] === status;
      var label = status.charAt(0).toUpperCase() + status.slice(1);
      return '<button type="button" class="btn btn-sm ' + (pressed ? 'btn-primary' : 'btn-ghost') + '" data-set="' + status + '" data-teacher="' + App.esc(teacherId) + '" aria-pressed="' + pressed + '">' + label + '</button>';
    }).join('') + '</div>';
  }

  function paintMark() {
    var host = document.getElementById('staff-body');
    if (!host) return;
    var teachers = roster();
    host.innerHTML = teachers.length
      ? '<div class="table-wrap"><table><thead><tr><th>Teacher</th><th>Status</th><th>Mark</th></tr></thead><tbody>' + teachers.map(function (teacher) {
        return '<tr><td><div class="person"><strong>' + App.esc(teacher.name) + '</strong><span>' + App.esc(teacher.status) + '</span></div></td><td>' + App.badge(draft[teacher.id].charAt(0).toUpperCase() + draft[teacher.id].slice(1)) + '</td><td>' + statusButtons(teacher.id) + '</td></tr>';
      }).join('') + '</tbody></table></div><div class="toolbar" style="margin-top:12px"><button type="button" class="btn btn-primary" id="save-staff">Save attendance</button></div>'
      : App.empty('No teachers to mark.');
    var save = document.getElementById('save-staff');
    if (save) save.addEventListener('click', saveDay);
  }

  function historyRows(user) {
    var teacherId = user.role === 'teacher' ? user.teacherId : historyTeacher;
    return Storage.load().staffAttendance.filter(function (row) {
      if (user.role === 'teacher') return row.teacherId === user.teacherId;
      return !teacherId || row.teacherId === teacherId;
    }).sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : a.teacherId.localeCompare(b.teacherId); });
  }

  function paintHistory(user) {
    var host = document.getElementById('staff-body');
    if (!host) return;
    var list = historyRows(user);
    var canEdit = user.role === 'admin';
    host.innerHTML = list.length
      ? '<div class="table-wrap"><table><thead><tr><th>Date</th><th>Teacher</th><th>Status</th>' + (canEdit ? '<th></th>' : '') + '</tr></thead><tbody>' + list.map(function (row) {
        return '<tr><td>' + App.esc(Storage.formatDate(row.date)) + '</td><td>' + App.esc(Storage.nameOf('teachers', row.teacherId, 'Teacher')) + '</td><td>' + App.badge(row.status.charAt(0).toUpperCase() + row.status.slice(1)) + '</td>' + (canEdit ? '<td class="actions"><button type="button" class="btn btn-secondary btn-sm" data-action="edit-day" data-date="' + App.esc(row.date) + '">Edit</button></td>' : '') + '</tr>';
      }).join('') + '</tbody></table></div>'
      : App.empty(user.role === 'teacher' ? 'Your attendance has not been marked yet.' : 'No staff attendance for this filter.');
  }

  function saveDay() {
    if (markDate > Storage.today()) { App.toast('Attendance cannot be marked for a future date.', 'error'); return; }
    var user = Auth.currentUser();
    var existing = Storage.load().staffAttendance.filter(function (row) { return row.date === markDate; }).length;
    Storage.update(function (data) {
      roster().forEach(function (teacher) {
        var status = draft[teacher.id] || 'present';
        var index = data.staffAttendance.findIndex(function (row) { return row.teacherId === teacher.id && row.date === markDate; });
        var record = {
          id: index === -1 ? Storage.uid('staff') : data.staffAttendance[index].id,
          instituteId: Storage.INSTITUTE_ID,
          teacherId: teacher.id,
          date: markDate,
          status: status,
          markedBy: user ? user.id : '',
          updatedAt: new Date().toISOString()
        };
        if (index === -1) data.staffAttendance.push(record);
        else data.staffAttendance[index] = record;
      });
    });
    App.toast(existing ? 'Attendance updated. Duplicate rows were not added.' : 'Attendance saved.', 'success');
    paintMark();
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (document.body.dataset.page !== 'staff-attendance') return;
    var user = Auth.guard(['admin', 'teacher']);
    if (!user) return;
    markDate = Storage.today();
    if (user.role === 'teacher') {
      var content = App.renderShell({ active: 'staff-attendance', title: 'My attendance', subtitle: 'Days the office has marked for you' });
      content.innerHTML = '<section class="card"><div id="staff-body"></div></section>';
      paintHistory(user);
      return;
    }
    loadDraft();
    var content = App.renderShell({ active: 'staff-attendance', title: 'Staff attendance', subtitle: 'One row per teacher for the selected date' });
    content.innerHTML = '<section class="card"><div class="tabs" role="tablist"><button type="button" class="tab" data-tab="mark" aria-selected="true">Mark</button><button type="button" class="tab" data-tab="history">History</button></div><div class="toolbar"><div class="filters"><input id="staff-date" type="date" value="' + App.esc(markDate) + '"><select id="f-teacher"><option value="">All teachers</option>' + roster().map(function (teacher) { return '<option value="' + App.esc(teacher.id) + '">' + App.esc(teacher.name) + '</option>'; }).join('') + '</select></div></div><div id="staff-body"></div></section>';
    var dateInput = content.querySelector('#staff-date');
    var teacherFilter = content.querySelector('#f-teacher');
    function syncChrome() {
      dateInput.hidden = tab !== 'mark';
      teacherFilter.hidden = tab !== 'history';
      content.querySelectorAll('[data-tab]').forEach(function (button) {
        button.setAttribute('aria-selected', button.getAttribute('data-tab') === tab ? 'true' : 'false');
      });
    }
    content.querySelectorAll('[data-tab]').forEach(function (button) {
      button.addEventListener('click', function () {
        tab = button.getAttribute('data-tab');
        syncChrome();
        if (tab === 'mark') paintMark();
        else paintHistory(user);
      });
    });
    dateInput.addEventListener('change', function () {
      markDate = dateInput.value || Storage.today();
      loadDraft();
      paintMark();
    });
    teacherFilter.addEventListener('change', function () {
      historyTeacher = teacherFilter.value;
      paintHistory(user);
    });
    content.addEventListener('click', function (event) {
      var set = event.target.closest('[data-set]');
      if (set) {
        draft[set.getAttribute('data-teacher')] = set.getAttribute('data-set');
        paintMark();
        return;
      }
      var edit = event.target.closest('[data-action="edit-day"]');
      if (!edit) return;
      markDate = edit.getAttribute('data-date');
      dateInput.value = markDate;
      loadDraft();
      tab = 'mark';
      syncChrome();
      paintMark();
    });
    syncChrome();
    paintMark();
  });
})();
