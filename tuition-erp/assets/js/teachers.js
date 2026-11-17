/**
 * Teacher directory. Admins can add, edit, assign subjects and batches, or delete.
 */
(function () {
  var page = 1;
  var filters = { q: '', status: '', subject: '' };
  var pageSize = 8;
  var SUBJECTS = ['Mathematics', 'Science', 'Physics', 'Chemistry', 'Biology', 'English', 'Accountancy', 'Economics', 'Computer Science', 'Reasoning'];

  function field(id, label, control, wide) {
    return '<div class="field' + (wide ? ' span-2' : '') + '"><label for="' + id + '">' + label + '</label>' + control + '<div class="field-error"></div></div>';
  }

  function subjectChoices(selected) {
    var known = SUBJECTS.slice();
    (selected || []).forEach(function (subject) {
      if (known.indexOf(subject) === -1) known.push(subject);
    });
    return known;
  }

  function filtered() {
    return Storage.load().teachers.filter(function (teacher) {
      var hay = (teacher.name + ' ' + teacher.employeeNo + ' ' + teacher.mobile + ' ' + teacher.email).toLowerCase();
      if (filters.q && hay.indexOf(filters.q.toLowerCase()) === -1) return false;
      if (filters.status && teacher.status !== filters.status) return false;
      if (filters.subject && (teacher.subjects || []).indexOf(filters.subject) === -1) return false;
      return true;
    }).sort(function (a, b) { return a.name < b.name ? -1 : 1; });
  }

  function batchNames(teacherId) {
    return Storage.load().batches.filter(function (batch) { return batch.teacherId === teacherId; }).map(function (batch) { return batch.name; });
  }

  function paint() {
    var rows = filtered();
    var pages = Math.max(1, Math.ceil(rows.length / pageSize));
    if (page > pages) page = pages;
    var slice = rows.slice((page - 1) * pageSize, page * pageSize);
    document.getElementById('teacher-table').innerHTML = slice.length ? '<div class="table-wrap"><table><thead><tr><th>Employee</th><th>Teacher</th><th class="hide-sm">Subjects</th><th class="hide-sm">Batches</th><th>Status</th><th></th></tr></thead><tbody>' + slice.map(function (teacher) {
      return '<tr><td>' + App.esc(teacher.employeeNo) + '</td><td><div class="person"><strong>' + App.esc(teacher.name) + '</strong><span>' + App.esc(teacher.email) + '</span></div></td><td class="hide-sm">' + App.esc((teacher.subjects || []).join(', ') || '—') + '</td><td class="hide-sm">' + App.esc(batchNames(teacher.id).join(', ') || '—') + '</td><td>' + App.badge(teacher.status) + '</td><td class="actions"><button type="button" class="btn btn-ghost btn-sm" data-action="view" data-id="' + App.esc(teacher.id) + '">View</button><button type="button" class="btn btn-secondary btn-sm" data-action="edit" data-id="' + App.esc(teacher.id) + '">Edit</button><button type="button" class="btn btn-danger btn-sm" data-action="delete" data-id="' + App.esc(teacher.id) + '">Delete</button></td></tr>';
    }).join('') + '</tbody></table></div>' + App.pager(page, pages) : App.empty('No teachers match these filters.');
  }

  function formHtml(teacher) {
    var data = Storage.load();
    var value = teacher || { employeeNo: Storage.nextSerial(data.teachers, 'employeeNo', 'EMP-', 100), name: '', gender: 'Female', mobile: '', email: '', address: '', qualification: '', subjects: [], joiningDate: Storage.today(), status: 'Active' };
    var assigned = data.batches.filter(function (batch) { return batch.teacherId === (teacher && teacher.id); }).map(function (batch) { return batch.id; });
    return '<form id="teacher-form" class="form-grid">' +
      field('employeeNo', 'Employee number', '<input id="employeeNo" value="' + App.esc(value.employeeNo) + '" required>') +
      field('fullName', 'Full name', '<input id="fullName" value="' + App.esc(value.name) + '" required>') +
      field('gender', 'Gender', '<select id="gender">' + ['Female', 'Male', 'Other'].map(function (gender) { return '<option' + (gender === value.gender ? ' selected' : '') + '>' + gender + '</option>'; }).join('') + '</select>') +
      field('mobile', 'Mobile number', '<input id="mobile" value="' + App.esc(value.mobile) + '" required>') +
      field('email', 'Email', '<input id="email" type="email" value="' + App.esc(value.email) + '" required>') +
      field('qualification', 'Qualification', '<input id="qualification" value="' + App.esc(value.qualification) + '" required>') +
      field('address', 'Address', '<input id="address" value="' + App.esc(value.address) + '" required>', true) +
      field('joiningDate', 'Joining date', '<input id="joiningDate" type="date" value="' + App.esc(value.joiningDate) + '" required>') +
      field('status', 'Employment status', '<select id="status">' + ['Active', 'On Leave', 'Resigned'].map(function (status) { return '<option' + (status === value.status ? ' selected' : '') + '>' + status + '</option>'; }).join('') + '</select>') +
      '<div class="field span-2"><span class="section-label">Subjects</span><div class="check-grid" id="subject-list">' + subjectChoices(value.subjects).map(function (subject) {
        return '<label><input type="checkbox" name="subject" value="' + App.esc(subject) + '"' + ((value.subjects || []).indexOf(subject) !== -1 ? ' checked' : '') + '> ' + App.esc(subject) + '</label>';
      }).join('') + '</div><div class="field-error" id="subject-error"></div></div>' +
      '<div class="field span-2"><span class="section-label">Batches</span><p class="help">Choosing a batch moves it to this teacher.</p><div class="check-grid">' + data.batches.map(function (batch) {
        return '<label><input type="checkbox" name="batch" value="' + App.esc(batch.id) + '"' + (assigned.indexOf(batch.id) !== -1 ? ' checked' : '') + '> ' + App.esc(batch.name) + '</label>';
      }).join('') + '</div></div>' +
      '<div class="span-2 modal-actions"><button type="button" class="btn btn-ghost" id="cancel-teacher">Cancel</button><button type="submit" class="btn btn-primary">Save teacher</button></div></form>';
  }

  function openForm(teacher) {
    App.openModal({
      title: teacher ? 'Edit teacher' : 'Add teacher',
      wide: true,
      html: formHtml(teacher),
      onMount: function (root) {
        root.querySelector('#cancel-teacher').addEventListener('click', App.closeModal);
        root.querySelector('#teacher-form').addEventListener('submit', function (event) {
          event.preventDefault();
          var ok = true;
          ['employeeNo', 'fullName', 'mobile', 'email', 'qualification', 'address', 'joiningDate'].forEach(function (id) {
            var input = root.querySelector('#' + id);
            if (!App.requireValue(input, root.querySelector('label[for="' + id + '"]').textContent)) ok = false;
          });
          var email = root.querySelector('#email');
          var mobile = root.querySelector('#mobile');
          if (email.value && !App.validEmail(email.value)) { App.setFieldError(email, 'Enter a valid email.'); ok = false; }
          if (mobile.value && !App.validMobile(mobile.value)) { App.setFieldError(mobile, 'Enter a 10-digit mobile number.'); ok = false; }
          if (root.querySelector('#joiningDate').value > Storage.today()) {
            App.setFieldError(root.querySelector('#joiningDate'), 'Joining date cannot be in the future.');
            ok = false;
          }
          var subjects = Array.prototype.map.call(root.querySelectorAll('input[name="subject"]:checked'), function (box) { return box.value; });
          var subjectError = root.querySelector('#subject-error');
          if (!subjects.length) { subjectError.textContent = 'Choose at least one subject.'; ok = false; } else subjectError.textContent = '';
          var batches = Array.prototype.map.call(root.querySelectorAll('input[name="batch"]:checked'), function (box) { return box.value; });
          var record = {
            id: teacher ? teacher.id : Storage.uid('tch'),
            instituteId: Storage.INSTITUTE_ID,
            employeeNo: root.querySelector('#employeeNo').value.trim(),
            name: root.querySelector('#fullName').value.trim(),
            gender: root.querySelector('#gender').value,
            mobile: mobile.value.trim(),
            email: email.value.trim(),
            address: root.querySelector('#address').value.trim(),
            qualification: root.querySelector('#qualification').value.trim(),
            subjects: subjects,
            joiningDate: root.querySelector('#joiningDate').value,
            status: root.querySelector('#status').value
          };
          Storage.load().teachers.forEach(function (other) {
            if (teacher && other.id === teacher.id) return;
            if (other.employeeNo.toLowerCase() === record.employeeNo.toLowerCase()) {
              App.setFieldError(root.querySelector('#employeeNo'), 'This employee number is already used.');
              ok = false;
            }
          });
          if (!ok) { App.toast('Check the highlighted fields.', 'error'); return; }
          Storage.update(function (data) {
            var index = data.teachers.findIndex(function (item) { return item.id === record.id; });
            if (index === -1) data.teachers.push(record);
            else data.teachers[index] = record;
            data.batches.forEach(function (batch) {
              if (batches.indexOf(batch.id) !== -1) batch.teacherId = record.id;
              else if (batch.teacherId === record.id) batch.teacherId = '';
            });
          });
          App.closeModal();
          App.toast(teacher ? 'Teacher updated.' : 'Teacher added.', 'success');
          paint();
        });
      }
    });
  }

  function viewTeacher(teacher) {
    App.openModal({
      title: teacher.name,
      html: '<div class="kv"><span>Employee no.</span><div>' + App.esc(teacher.employeeNo) + '</div><span>Gender</span><div>' + App.esc(teacher.gender) + '</div><span>Mobile</span><div>' + App.esc(teacher.mobile) + '</div><span>Email</span><div>' + App.esc(teacher.email) + '</div><span>Address</span><div>' + App.esc(teacher.address) + '</div><span>Qualification</span><div>' + App.esc(teacher.qualification) + '</div><span>Subjects</span><div>' + App.esc((teacher.subjects || []).join(', ')) + '</div><span>Batches</span><div>' + App.esc(batchNames(teacher.id).join(', ') || 'None') + '</div><span>Joined</span><div>' + App.esc(Storage.formatDate(teacher.joiningDate)) + '</div><span>Status</span><div>' + App.badge(teacher.status) + '</div></div>'
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (document.body.dataset.page !== 'teachers') return;
    var user = Auth.guard(['admin']);
    if (!user) return;
    var content = App.renderShell({ active: 'teachers', title: 'Teachers', subtitle: 'Contacts, subjects, and batch assignment' });
    var subjects = SUBJECTS.slice();
    content.innerHTML = '<section class="card"><div class="toolbar"><div class="filters"><input id="q" type="search" placeholder="Search name, employee no., mobile"><select id="f-status"><option value="">All statuses</option><option>Active</option><option>On Leave</option><option>Resigned</option></select><select id="f-subject"><option value="">All subjects</option>' + subjects.map(function (subject) { return '<option>' + App.esc(subject) + '</option>'; }).join('') + '</select></div><button type="button" class="btn btn-primary" id="add-teacher">Add teacher</button></div><div id="teacher-table"></div></section>';
    content.querySelector('#q').addEventListener('input', function (event) { filters.q = event.target.value; page = 1; paint(); });
    content.querySelector('#f-status').addEventListener('change', function (event) { filters.status = event.target.value; page = 1; paint(); });
    content.querySelector('#f-subject').addEventListener('change', function (event) { filters.subject = event.target.value; page = 1; paint(); });
    content.querySelector('#add-teacher').addEventListener('click', function () { openForm(null); });
    content.addEventListener('click', function (event) {
      var pagerBtn = event.target.closest('.pager [data-page]');
      if (pagerBtn && !pagerBtn.disabled) { page = Number(pagerBtn.getAttribute('data-page')); paint(); return; }
      var button = event.target.closest('[data-action]');
      if (!button) return;
      var teacher = Storage.byId(Storage.load().teachers, button.getAttribute('data-id'));
      if (!teacher) return;
      var action = button.getAttribute('data-action');
      if (action === 'view') viewTeacher(teacher);
      if (action === 'edit') openForm(teacher);
      if (action === 'delete') {
        App.confirmDialog({
          title: 'Delete teacher',
          message: 'Delete ' + teacher.name + '? Their batches stay, but those batches will have no teacher until you assign one.',
          confirmText: 'Delete',
          danger: true
        }).then(function (yes) {
          if (!yes) return;
          Storage.update(function (data) {
            data.teachers = data.teachers.filter(function (item) { return item.id !== teacher.id; });
            data.batches.forEach(function (batch) { if (batch.teacherId === teacher.id) batch.teacherId = ''; });
            data.users.forEach(function (account) { if (account.teacherId === teacher.id) account.teacherId = ''; });
          });
          App.toast('Teacher deleted.', 'success');
          paint();
        });
      }
    });
    paint();
  });
})();
