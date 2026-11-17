/**
 * Batches: timings, capacity, teacher, subjects, and the enrolled list.
 */
(function () {
  var user = null;
  var filters = { q: '', course: '', status: '' };

  function canWrite() { return user && user.role === 'admin'; }

  function list() {
    var data = user.role === 'teacher' ? Storage.scope(user) : Storage.load();
    return data.batches.filter(function (batch) {
      if (filters.q && batch.name.toLowerCase().indexOf(filters.q.toLowerCase()) === -1) return false;
      if (filters.course && batch.courseId !== filters.course) return false;
      if (filters.status && batch.status !== filters.status) return false;
      return true;
    }).sort(function (a, b) { return a.name < b.name ? -1 : 1; });
  }

  function enrolled(batchId) {
    return Storage.load().students.filter(function (student) { return student.batchId === batchId; });
  }

  function paint() {
    var items = list();
    document.getElementById('batch-table').innerHTML = items.length ? '<div class="table-wrap"><table><thead><tr><th>Batch</th><th class="hide-sm">Course</th><th>Teacher</th><th class="hide-sm">Timing</th><th>Students</th><th>Status</th><th></th></tr></thead><tbody>' + items.map(function (batch) {
      var count = enrolled(batch.id).length;
      var actions = '<button type="button" class="btn btn-ghost btn-sm" data-action="view" data-id="' + App.esc(batch.id) + '">Students</button>';
      if (canWrite()) actions += '<button type="button" class="btn btn-secondary btn-sm" data-action="edit" data-id="' + App.esc(batch.id) + '">Edit</button><button type="button" class="btn btn-danger btn-sm" data-action="delete" data-id="' + App.esc(batch.id) + '">Delete</button>';
      return '<tr><td>' + App.esc(batch.name) + '</td><td class="hide-sm">' + App.esc(Storage.nameOf('courses', batch.courseId)) + '</td><td>' + App.esc(Storage.nameOf('teachers', batch.teacherId, 'Unassigned')) + '</td><td class="hide-sm">' + App.esc(Storage.scheduleLabel(batch)) + '</td><td>' + count + ' / ' + batch.maxStudents + '</td><td>' + App.badge(batch.status) + '</td><td class="actions">' + actions + '</td></tr>';
    }).join('') + '</tbody></table></div>' : App.empty('No batches match these filters.');
  }

  function openForm(batch) {
    var data = Storage.load();
    var value = batch || { name: '', courseId: '', teacherId: '', subjects: [], days: [1, 2, 3, 4, 5], startTime: '16:00', endTime: '17:30', maxStudents: 20, room: '', academicYear: data.currentAcademicYear, status: 'Active' };
    var subjects = ['Mathematics', 'Science', 'Physics', 'Chemistry', 'Biology', 'English', 'Accountancy', 'Economics', 'Computer Science', 'Reasoning'];
    (value.subjects || []).forEach(function (subject) { if (subjects.indexOf(subject) === -1) subjects.push(subject); });
    App.openModal({
      title: batch ? 'Edit batch' : 'Add batch',
      wide: true,
      html: '<form id="batch-form" class="form-grid"><div class="field"><label for="name">Batch name</label><input id="name" value="' + App.esc(value.name) + '" required><div class="field-error"></div></div><div class="field"><label for="courseId">Course</label><select id="courseId">' + App.optionsHtml(data.courses, value.courseId, function (course) { return course.id; }, function (course) { return course.name; }, 'Select a course') + '</select><div class="field-error"></div></div><div class="field"><label for="teacherId">Teacher</label><select id="teacherId">' + App.optionsHtml(data.teachers.filter(function (teacher) { return teacher.status !== 'Resigned'; }), value.teacherId, function (teacher) { return teacher.id; }, function (teacher) { return teacher.name; }, 'Unassigned') + '</select><div class="field-error"></div></div><div class="field"><label for="room">Room</label><input id="room" value="' + App.esc(value.room || '') + '" required><div class="field-error"></div></div><div class="field"><label for="startTime">Start</label><input id="startTime" type="time" value="' + App.esc(value.startTime) + '" required><div class="field-error"></div></div><div class="field"><label for="endTime">End</label><input id="endTime" type="time" value="' + App.esc(value.endTime) + '" required><div class="field-error"></div></div><div class="field"><label for="maxStudents">Maximum students</label><input id="maxStudents" type="number" min="1" value="' + App.esc(value.maxStudents) + '" required><div class="field-error"></div></div><div class="field"><label for="academicYear">Academic year</label><select id="academicYear">' + data.academicYears.map(function (year) { return '<option' + (year === value.academicYear ? ' selected' : '') + '>' + App.esc(year) + '</option>'; }).join('') + '</select><div class="field-error"></div></div><div class="field"><label for="status">Status</label><select id="status"><option' + (value.status !== 'Inactive' ? ' selected' : '') + '>Active</option><option' + (value.status === 'Inactive' ? ' selected' : '') + '>Inactive</option></select><div class="field-error"></div></div><div class="field span-2"><span class="section-label">Days</span><div class="check-grid">' + Storage.DAY_NAMES.map(function (day, index) { return '<label><input type="checkbox" name="day" value="' + index + '"' + ((value.days || []).indexOf(index) !== -1 ? ' checked' : '') + '> ' + day + '</label>'; }).join('') + '</div><div class="field-error" id="day-error"></div></div><div class="field span-2"><span class="section-label">Subjects</span><div class="check-grid">' + subjects.map(function (subject) { return '<label><input type="checkbox" name="subject" value="' + App.esc(subject) + '"' + ((value.subjects || []).indexOf(subject) !== -1 ? ' checked' : '') + '> ' + App.esc(subject) + '</label>'; }).join('') + '</div><div class="field-error" id="subject-error"></div></div><div class="span-2 modal-actions"><button type="button" class="btn btn-ghost" id="cancel-batch">Cancel</button><button class="btn btn-primary" type="submit">Save batch</button></div></form>',
      onMount: function (root) {
        root.querySelector('#cancel-batch').addEventListener('click', App.closeModal);
        root.querySelector('#batch-form').addEventListener('submit', function (event) {
          event.preventDefault();
          var ok = true;
          if (!App.requireValue(root.querySelector('#name'), 'Batch name')) ok = false;
          if (!root.querySelector('#courseId').value) { App.setFieldError(root.querySelector('#courseId'), 'Course is required.'); ok = false; } else App.setFieldError(root.querySelector('#courseId'), '');
          if (!App.requireValue(root.querySelector('#room'), 'Room')) ok = false;
          var days = Array.prototype.map.call(root.querySelectorAll('input[name="day"]:checked'), function (box) { return Number(box.value); });
          var subjectsChosen = Array.prototype.map.call(root.querySelectorAll('input[name="subject"]:checked'), function (box) { return box.value; });
          root.querySelector('#day-error').textContent = days.length ? '' : 'Choose at least one day.';
          root.querySelector('#subject-error').textContent = subjectsChosen.length ? '' : 'Choose at least one subject.';
          if (!days.length || !subjectsChosen.length) ok = false;
          var start = root.querySelector('#startTime').value;
          var end = root.querySelector('#endTime').value;
          if (start && end && end <= start) { App.setFieldError(root.querySelector('#endTime'), 'End time must be after the start time.'); ok = false; }
          var maxStudents = Number(root.querySelector('#maxStudents').value);
          var currentCount = batch ? enrolled(batch.id).length : 0;
          if (!maxStudents || maxStudents < 1) { App.setFieldError(root.querySelector('#maxStudents'), 'Enter a maximum of at least 1.'); ok = false; }
          else if (maxStudents < currentCount) { App.setFieldError(root.querySelector('#maxStudents'), 'Maximum cannot be below the ' + currentCount + ' enrolled students.'); ok = false; }
          else App.setFieldError(root.querySelector('#maxStudents'), '');
          if (!ok) { App.toast('Check the highlighted fields.', 'error'); return; }
          var record = {
            id: batch ? batch.id : Storage.uid('bat'),
            instituteId: Storage.INSTITUTE_ID,
            name: root.querySelector('#name').value.trim(),
            courseId: root.querySelector('#courseId').value,
            teacherId: root.querySelector('#teacherId').value,
            subjects: subjectsChosen,
            days: days,
            startTime: start,
            endTime: end,
            maxStudents: maxStudents,
            room: root.querySelector('#room').value.trim(),
            academicYear: root.querySelector('#academicYear').value,
            status: root.querySelector('#status').value
          };
          Storage.update(function (store) {
            var index = store.batches.findIndex(function (item) { return item.id === record.id; });
            if (index === -1) store.batches.push(record);
            else store.batches[index] = record;
          });
          App.closeModal();
          App.toast(batch ? 'Batch updated.' : 'Batch added.', 'success');
          paint();
        });
      }
    });
  }

  function viewStudents(batch) {
    var students = enrolled(batch.id);
    App.openModal({
      title: batch.name,
      html: '<p class="muted">' + App.esc(Storage.scheduleLabel(batch)) + ' · Room ' + App.esc(batch.room || '—') + '</p>' + (students.length ? '<div class="table-wrap"><table><thead><tr><th>Admission</th><th>Student</th><th>Status</th></tr></thead><tbody>' + students.map(function (student) {
        return '<tr><td>' + App.esc(student.admissionNo) + '</td><td>' + App.esc(student.name) + '</td><td>' + App.badge(student.status) + '</td></tr>';
      }).join('') + '</tbody></table></div>' : App.empty('No students are enrolled in this batch.'))
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (document.body.dataset.page !== 'batches') return;
    user = Auth.guard(['admin', 'teacher']);
    if (!user) return;
    var content = App.renderShell({ active: 'batches', title: 'Batches', subtitle: user.role === 'teacher' ? 'Batches assigned to you' : 'Timings, capacity, and enrolment' });
    var courses = user.role === 'teacher' ? Storage.scope(user).courses : Storage.load().courses;
    content.innerHTML = '<section class="card"><div class="toolbar"><div class="filters"><input id="q" type="search" placeholder="Search batches"><select id="f-course">' + App.optionsHtml(courses, '', function (course) { return course.id; }, function (course) { return course.name; }, 'All courses') + '</select><select id="f-status"><option value="">All statuses</option><option>Active</option><option>Inactive</option></select></div>' + (canWrite() ? '<button type="button" class="btn btn-primary" id="add-batch">Add batch</button>' : '') + '</div><div id="batch-table"></div></section>';
    content.querySelector('#q').addEventListener('input', function (event) { filters.q = event.target.value; paint(); });
    content.querySelector('#f-course').addEventListener('change', function (event) { filters.course = event.target.value; paint(); });
    content.querySelector('#f-status').addEventListener('change', function (event) { filters.status = event.target.value; paint(); });
    var add = content.querySelector('#add-batch');
    if (add) add.addEventListener('click', function () { openForm(null); });
    content.addEventListener('click', function (event) {
      var button = event.target.closest('[data-action]');
      if (!button) return;
      var pool = user.role === 'teacher' ? Storage.scope(user).batches : Storage.load().batches;
      var batch = Storage.byId(pool, button.getAttribute('data-id'));
      if (!batch) return;
      var action = button.getAttribute('data-action');
      if (action === 'view') viewStudents(batch);
      if (action === 'edit') openForm(batch);
      if (action === 'delete') {
        if (enrolled(batch.id).length) { App.toast('Move students out of this batch before deleting it.', 'error'); return; }
        App.confirmDialog({ title: 'Delete batch', message: 'Delete ' + batch.name + '?', confirmText: 'Delete', danger: true }).then(function (yes) {
          if (!yes) return;
          Storage.update(function (data) { data.batches = data.batches.filter(function (item) { return item.id !== batch.id; }); });
          App.toast('Batch deleted.', 'success');
          paint();
        });
      }
    });
    paint();
  });
})();
