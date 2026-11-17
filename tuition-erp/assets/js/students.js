/**
 * Student list, registration, and profile. Teachers see assigned batches.
 * Accountants can read fee context. Only an admin can add, edit, or delete.
 */
(function () {
  var user = null;
  var page = 1;
  var filters = { q: '', course: '', batch: '', status: '' };
  var pageSize = 8;

  function canWrite() { return user && user.role === 'admin'; }

  function source() {
    return user.role === 'teacher' ? Storage.scope(user).students : Storage.load().students;
  }

  function filtered() {
    var data = Storage.load();
    return source().filter(function (student) {
      var hay = (student.name + ' ' + student.admissionNo + ' ' + student.mobile + ' ' + student.email).toLowerCase();
      if (filters.q && hay.indexOf(filters.q.toLowerCase()) === -1) return false;
      if (filters.course && student.courseId !== filters.course) return false;
      if (filters.batch && student.batchId !== filters.batch) return false;
      if (filters.status && student.status !== filters.status) return false;
      return true;
    }).sort(function (a, b) { return a.admissionNo < b.admissionNo ? -1 : 1; });
  }

  function field(id, label, control, wide) {
    return '<div class="field' + (wide ? ' span-2' : '') + '"><label for="' + id + '">' + label + '</label>' + control + '<div class="field-error"></div></div>';
  }

  function paint() {
    var data = Storage.load();
    var rows = filtered();
    var pages = Math.max(1, Math.ceil(rows.length / pageSize));
    if (page > pages) page = pages;
    var slice = rows.slice((page - 1) * pageSize, page * pageSize);
    var showFees = user.role === 'admin' || user.role === 'accountant';
    var host = document.getElementById('student-table');
    if (!host) return;
    host.innerHTML = (slice.length ? '<div class="table-wrap"><table><thead><tr><th>Admission</th><th>Student</th><th class="hide-sm">Course</th><th>Batch</th><th class="hide-sm">Mobile</th><th>Status</th>' + (showFees ? '<th class="num">Balance</th>' : '') + '<th></th></tr></thead><tbody>' + slice.map(function (student) {
      var balance = '';
      if (showFees) {
        var owed = data.invoices.filter(function (invoice) { return invoice.studentId === student.id; }).reduce(function (sum, invoice) {
          return sum + Storage.invoiceView(invoice, data.payments, Storage.today()).balance;
        }, 0);
        balance = '<td class="num">' + App.money(owed) + '</td>';
      }
      var actions = '<button type="button" class="btn btn-ghost btn-sm" data-action="view" data-id="' + App.esc(student.id) + '">View</button>';
      if (canWrite()) {
        actions += '<button type="button" class="btn btn-secondary btn-sm" data-action="edit" data-id="' + App.esc(student.id) + '">Edit</button><button type="button" class="btn btn-danger btn-sm" data-action="delete" data-id="' + App.esc(student.id) + '">Delete</button>';
      }
      return '<tr><td>' + App.esc(student.admissionNo) + '</td><td><div class="person"><strong>' + App.esc(student.name) + '</strong><span>' + App.esc(student.email) + '</span></div></td><td class="hide-sm">' + App.esc(Storage.nameOf('courses', student.courseId)) + '</td><td>' + App.esc(Storage.nameOf('batches', student.batchId)) + '</td><td class="hide-sm">' + App.esc(student.mobile) + '</td><td>' + App.badge(student.status) + '</td>' + balance + '<td class="actions">' + actions + '</td></tr>';
    }).join('') + '</tbody></table></div>' + App.pager(page, pages) : App.empty('No students match these filters.'));
  }

  function batchOptions(courseId, selected, includeId) {
    var batches = Storage.load().batches.filter(function (batch) {
      if (batch.courseId !== courseId) return false;
      return batch.status === 'Active' || batch.id === includeId;
    });
    return App.optionsHtml(batches, selected || '', function (batch) { return batch.id; }, function (batch) {
      return batch.name + ' (' + Storage.scheduleLabel(batch) + ')';
    }, 'Select a batch');
  }

  function formHtml(student) {
    var data = Storage.load();
    var value = student || {
      admissionNo: Storage.nextAdmissionNo(data.students),
      name: '', gender: '', dob: '', mobile: '', email: '', address: '',
      parentName: '', parentMobile: '', courseId: '', batchId: '',
      admissionDate: Storage.today(), academicYear: data.currentAcademicYear, status: 'Active'
    };
    return '<form id="student-form" class="form-grid">' +
      field('admissionNo', 'Admission number', '<input id="admissionNo" value="' + App.esc(value.admissionNo) + '" required>') +
      field('fullName', 'Full name', '<input id="fullName" value="' + App.esc(value.name) + '" required>') +
      field('gender', 'Gender', '<select id="gender">' + ['', 'Female', 'Male', 'Other'].map(function (gender) {
        return '<option value="' + gender + '"' + (gender === value.gender ? ' selected' : '') + '>' + (gender || 'Select') + '</option>';
      }).join('') + '</select>') +
      field('dob', 'Date of birth', '<input id="dob" type="date" value="' + App.esc(value.dob) + '" required>') +
      field('mobile', 'Mobile number', '<input id="mobile" inputmode="tel" value="' + App.esc(value.mobile) + '" required>') +
      field('email', 'Email', '<input id="email" type="email" value="' + App.esc(value.email) + '" required>') +
      field('address', 'Address', '<textarea id="address" required>' + App.esc(value.address) + '</textarea>', true) +
      field('parentName', 'Parent name', '<input id="parentName" value="' + App.esc(value.parentName) + '" required>') +
      field('parentMobile', 'Parent mobile', '<input id="parentMobile" inputmode="tel" value="' + App.esc(value.parentMobile) + '" required>') +
      field('courseId', 'Course', '<select id="courseId">' + App.optionsHtml(data.courses, value.courseId, function (course) { return course.id; }, function (course) { return course.name; }, 'Select a course') + '</select>') +
      field('batchId', 'Batch', '<select id="batchId">' + batchOptions(value.courseId, value.batchId, value.batchId) + '</select>') +
      field('admissionDate', 'Admission date', '<input id="admissionDate" type="date" value="' + App.esc(value.admissionDate) + '" required>') +
      field('academicYear', 'Academic year', '<select id="academicYear">' + data.academicYears.map(function (year) {
        return '<option' + (year === value.academicYear ? ' selected' : '') + '>' + App.esc(year) + '</option>';
      }).join('') + '</select>') +
      field('status', 'Student status', '<select id="status">' + ['Active', 'Inactive', 'Alumni'].map(function (status) {
        return '<option' + (status === value.status ? ' selected' : '') + '>' + status + '</option>';
      }).join('') + '</select>') +
      '<div class="span-2 modal-actions"><button type="button" class="btn btn-ghost" id="cancel-student">Cancel</button><button type="submit" class="btn btn-primary">Save student</button></div></form>';
  }

  function readForm(student) {
    var form = document.getElementById('student-form');
    var ok = true;
    function must(id, label) {
      if (!App.requireValue(form.querySelector('#' + id), label)) ok = false;
    }
    ['admissionNo', 'fullName', 'mobile', 'email', 'address', 'parentName', 'parentMobile', 'dob', 'admissionDate'].forEach(function (id) {
      must(id, form.querySelector('label[for="' + id + '"]').textContent);
    });
    var gender = form.querySelector('#gender');
    var course = form.querySelector('#courseId');
    var batch = form.querySelector('#batchId');
    if (!gender.value) { App.setFieldError(gender, 'Gender is required.'); ok = false; } else App.setFieldError(gender, '');
    if (!course.value) { App.setFieldError(course, 'Course is required.'); ok = false; } else App.setFieldError(course, '');
    if (!batch.value) { App.setFieldError(batch, 'Batch is required.'); ok = false; } else App.setFieldError(batch, '');
    var email = form.querySelector('#email');
    var mobile = form.querySelector('#mobile');
    var parentMobile = form.querySelector('#parentMobile');
    if (email.value && !App.validEmail(email.value)) { App.setFieldError(email, 'Enter a valid email.'); ok = false; }
    if (mobile.value && !App.validMobile(mobile.value)) { App.setFieldError(mobile, 'Enter a 10-digit mobile number.'); ok = false; }
    if (parentMobile.value && !App.validMobile(parentMobile.value)) { App.setFieldError(parentMobile, 'Enter a 10-digit mobile number.'); ok = false; }
    var dob = form.querySelector('#dob').value;
    var admission = form.querySelector('#admissionDate').value;
    if (dob && dob > Storage.today()) { App.setFieldError(form.querySelector('#dob'), 'Date of birth cannot be in the future.'); ok = false; }
    if (admission && admission > Storage.today()) { App.setFieldError(form.querySelector('#admissionDate'), 'Admission date cannot be in the future.'); ok = false; }
    if (dob && admission && admission < dob) { App.setFieldError(form.querySelector('#admissionDate'), 'Admission date is before the date of birth.'); ok = false; }
    if (!ok) return null;
    var record = {
      id: student ? student.id : Storage.uid('stu'),
      instituteId: Storage.INSTITUTE_ID,
      admissionNo: form.querySelector('#admissionNo').value.trim(),
      name: form.querySelector('#fullName').value.trim(),
      gender: gender.value,
      dob: dob,
      mobile: mobile.value.trim(),
      email: email.value.trim(),
      address: form.querySelector('#address').value.trim(),
      parentName: form.querySelector('#parentName').value.trim(),
      parentMobile: parentMobile.value.trim(),
      courseId: course.value,
      batchId: batch.value,
      admissionDate: admission,
      academicYear: form.querySelector('#academicYear').value,
      status: form.querySelector('#status').value
    };
    var clash = false;
    Storage.load().students.forEach(function (other) {
      if (student && other.id === student.id) return;
      if (other.admissionNo.toLowerCase() === record.admissionNo.toLowerCase()) {
        App.setFieldError(form.querySelector('#admissionNo'), 'This admission number is already used.');
        clash = true;
      }
    });
    var batchRecord = Storage.byId(Storage.load().batches, record.batchId);
    var enrolled = Storage.load().students.filter(function (other) {
      return other.batchId === record.batchId && (!student || other.id !== student.id);
    }).length;
    if (batchRecord && enrolled >= Number(batchRecord.maxStudents)) {
      App.setFieldError(batch, 'This batch is full (' + batchRecord.maxStudents + ' students).');
      clash = true;
    }
    if (clash) return null;
    return record;
  }

  function openForm(student) {
    App.openModal({
      title: student ? 'Edit student' : 'Add student',
      wide: true,
      html: formHtml(student),
      onMount: function (root) {
        var course = root.querySelector('#courseId');
        var batch = root.querySelector('#batchId');
        course.addEventListener('change', function () {
          var current = batch.value;
          batch.innerHTML = batchOptions(course.value, current, student ? student.batchId : '');
        });
        root.querySelector('#cancel-student').addEventListener('click', App.closeModal);
        root.querySelector('#student-form').addEventListener('submit', function (event) {
          event.preventDefault();
          var record = readForm(student);
          if (!record) {
            App.toast('Check the highlighted fields.', 'error');
            return;
          }
          Storage.update(function (data) {
            var index = data.students.findIndex(function (item) { return item.id === record.id; });
            if (index === -1) data.students.push(record);
            else data.students[index] = record;
          });
          App.closeModal();
          App.toast(student ? 'Student updated.' : 'Student added.', 'success');
          paint();
        });
      }
    });
  }

  function viewStudent(student) {
    var data = Storage.load();
    var summary = Storage.attendanceSummary(data.attendance.filter(function (row) { return row.studentId === student.id; }));
    var balance = data.invoices.filter(function (invoice) { return invoice.studentId === student.id; }).reduce(function (sum, invoice) {
      return sum + Storage.invoiceView(invoice, data.payments, Storage.today()).balance;
    }, 0);
    var feeLine = user.role === 'teacher' ? '' : '<span>Fee balance</span><div>' + App.money(balance) + '</div>';
    App.openModal({
      title: student.name,
      html: '<div class="kv"><span>Admission no.</span><div>' + App.esc(student.admissionNo) + '</div><span>Gender</span><div>' + App.esc(student.gender) + '</div><span>Date of birth</span><div>' + App.esc(Storage.formatDate(student.dob)) + '</div><span>Mobile</span><div>' + App.esc(student.mobile) + '</div><span>Email</span><div>' + App.esc(student.email) + '</div><span>Address</span><div>' + App.esc(student.address) + '</div><span>Parent</span><div>' + App.esc(student.parentName) + ' · ' + App.esc(student.parentMobile) + '</div><span>Course</span><div>' + App.esc(Storage.nameOf('courses', student.courseId)) + '</div><span>Batch</span><div>' + App.esc(Storage.nameOf('batches', student.batchId)) + '</div><span>Admission date</span><div>' + App.esc(Storage.formatDate(student.admissionDate)) + '</div><span>Academic year</span><div>' + App.esc(student.academicYear) + '</div><span>Status</span><div>' + App.badge(student.status) + '</div><span>Attendance</span><div>' + summary.rate + '% of ' + summary.total + ' sessions</div>' + feeLine + '</div>'
    });
  }

  function render() {
    var data = Storage.load();
    var courses = user.role === 'teacher' ? Storage.scope(user).courses : data.courses;
    var batches = user.role === 'teacher' ? Storage.scope(user).batches : data.batches;
    var content = document.getElementById('content');
    content.innerHTML =
      '<section class="card"><div class="toolbar"><div class="filters"><input id="q" type="search" placeholder="Search name, admission no., mobile" value="' + App.esc(filters.q) + '"><select id="f-course">' + App.optionsHtml(courses, filters.course, function (course) { return course.id; }, function (course) { return course.name; }, 'All courses') + '</select><select id="f-batch">' + App.optionsHtml(batches, filters.batch, function (batch) { return batch.id; }, function (batch) { return batch.name; }, 'All batches') + '</select><select id="f-status">' + ['', 'Active', 'Inactive', 'Alumni'].map(function (status) {
        return '<option value="' + status + '"' + (status === filters.status ? ' selected' : '') + '>' + (status || 'All statuses') + '</option>';
      }).join('') + '</select></div>' + (canWrite() ? '<button type="button" class="btn btn-primary" id="add-student">Add student</button>' : '') + '</div><div id="student-table"></div></section>';
    content.querySelector('#q').addEventListener('input', function (event) { filters.q = event.target.value; page = 1; paint(); });
    content.querySelector('#f-course').addEventListener('change', function (event) { filters.course = event.target.value; page = 1; paint(); });
    content.querySelector('#f-batch').addEventListener('change', function (event) { filters.batch = event.target.value; page = 1; paint(); });
    content.querySelector('#f-status').addEventListener('change', function (event) { filters.status = event.target.value; page = 1; paint(); });
    var add = content.querySelector('#add-student');
    if (add) add.addEventListener('click', function () { openForm(null); });
    paint();
  }

  function onClick(event) {
    var pagerBtn = event.target.closest('.pager [data-page]');
    if (pagerBtn && !pagerBtn.disabled) {
      page = Number(pagerBtn.getAttribute('data-page'));
      paint();
      return;
    }
    var button = event.target.closest('[data-action]');
    if (!button) return;
    var student = Storage.byId(source(), button.getAttribute('data-id'));
    if (!student) return;
    var action = button.getAttribute('data-action');
    if (action === 'view') viewStudent(student);
    if (action === 'edit') openForm(student);
    if (action === 'delete') {
      App.confirmDialog({
        title: 'Delete student',
        message: 'Delete ' + student.name + '? Attendance and exam results for this student are removed. Invoices stay in the fee register.',
        confirmText: 'Delete',
        danger: true
      }).then(function (yes) {
        if (!yes) return;
        Storage.update(function (data) {
          data.students = data.students.filter(function (item) { return item.id !== student.id; });
          data.attendance = data.attendance.filter(function (item) { return item.studentId !== student.id; });
          data.results = data.results.filter(function (item) { return item.studentId !== student.id; });
          data.users.forEach(function (account) {
            if (account.studentId === student.id) account.studentId = '';
            account.studentIds = (account.studentIds || []).filter(function (id) { return id !== student.id; });
          });
        });
        App.toast('Student deleted.', 'success');
        paint();
      });
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (document.body.dataset.page !== 'students') return;
    user = Auth.guard(['admin', 'teacher', 'accountant']);
    if (!user) return;
    var content = App.renderShell({
      active: 'students',
      title: 'Students',
      subtitle: user.role === 'teacher' ? 'Students in your batches' : 'Admissions, contacts, and enrolment'
    });
    content.addEventListener('click', onClick);
    render();
  });
})();
