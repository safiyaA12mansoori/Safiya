/**
 * Course catalogue. Teachers can read the courses attached to their batches.
 */
(function () {
  var user = null;
  var filters = { q: '', type: '', status: '' };
  var TYPES = ['School Tuition', 'College Tuition', 'Competitive Exams', 'Computer Courses', 'Other Courses'];

  function canWrite() { return user && user.role === 'admin'; }

  function rows() {
    var list = user.role === 'teacher' ? Storage.scope(user).courses : Storage.load().courses;
    return list.filter(function (course) {
      if (filters.q && course.name.toLowerCase().indexOf(filters.q.toLowerCase()) === -1) return false;
      if (filters.type && course.type !== filters.type) return false;
      if (filters.status && course.status !== filters.status) return false;
      return true;
    }).sort(function (a, b) { return a.name < b.name ? -1 : 1; });
  }

  function paint() {
    var data = Storage.load();
    var list = rows();
    document.getElementById('course-table').innerHTML = list.length ? '<div class="table-wrap"><table><thead><tr><th>Course</th><th>Type</th><th class="hide-sm">Duration</th><th>Batches</th><th>Status</th>' + (canWrite() ? '<th></th>' : '') + '</tr></thead><tbody>' + list.map(function (course) {
      var count = data.batches.filter(function (batch) { return batch.courseId === course.id; }).length;
      var actions = canWrite()
        ? '<td class="actions"><button type="button" class="btn btn-secondary btn-sm" data-action="edit" data-id="' + App.esc(course.id) + '">Edit</button><button type="button" class="btn btn-ghost btn-sm" data-action="toggle" data-id="' + App.esc(course.id) + '">' + (course.status === 'Active' ? 'Deactivate' : 'Activate') + '</button><button type="button" class="btn btn-danger btn-sm" data-action="delete" data-id="' + App.esc(course.id) + '">Delete</button></td>'
        : '';
      return '<tr><td><div class="person"><strong>' + App.esc(course.name) + '</strong><span>' + App.esc(course.description || '') + '</span></div></td><td>' + App.esc(course.type) + '</td><td class="hide-sm">' + App.esc(course.duration) + '</td><td>' + count + '</td><td>' + App.badge(course.status) + '</td>' + actions + '</tr>';
    }).join('') + '</tbody></table></div>' : App.empty('No courses match these filters.');
  }

  function openForm(course) {
    var value = course || { name: '', type: 'School Tuition', duration: '', description: '', status: 'Active' };
    App.openModal({
      title: course ? 'Edit course' : 'Add course',
      html: '<form id="course-form" class="stack"><div class="field"><label for="name">Course name</label><input id="name" value="' + App.esc(value.name) + '" required><div class="field-error"></div></div><div class="field"><label for="type">Course type</label><select id="type">' + TYPES.map(function (type) { return '<option' + (type === value.type ? ' selected' : '') + '>' + type + '</option>'; }).join('') + '</select><div class="field-error"></div></div><div class="field"><label for="duration">Duration</label><input id="duration" value="' + App.esc(value.duration) + '" placeholder="10 months" required><div class="field-error"></div></div><div class="field"><label for="description">Description</label><textarea id="description">' + App.esc(value.description || '') + '</textarea><div class="field-error"></div></div><div class="field"><label for="status">Status</label><select id="status"><option' + (value.status === 'Active' ? ' selected' : '') + '>Active</option><option' + (value.status === 'Inactive' ? ' selected' : '') + '>Inactive</option></select><div class="field-error"></div></div><div class="modal-actions"><button type="button" class="btn btn-ghost" id="cancel-course">Cancel</button><button class="btn btn-primary" type="submit">Save course</button></div></form>',
      onMount: function (root) {
        root.querySelector('#cancel-course').addEventListener('click', App.closeModal);
        root.querySelector('#course-form').addEventListener('submit', function (event) {
          event.preventDefault();
          var ok = App.requireValue(root.querySelector('#name'), 'Course name') & App.requireValue(root.querySelector('#duration'), 'Duration');
          if (!ok) { App.toast('Check the highlighted fields.', 'error'); return; }
          var record = {
            id: course ? course.id : Storage.uid('crs'),
            instituteId: Storage.INSTITUTE_ID,
            name: root.querySelector('#name').value.trim(),
            type: root.querySelector('#type').value,
            duration: root.querySelector('#duration').value.trim(),
            description: root.querySelector('#description').value.trim(),
            status: root.querySelector('#status').value
          };
          Storage.update(function (data) {
            var index = data.courses.findIndex(function (item) { return item.id === record.id; });
            if (index === -1) data.courses.push(record);
            else data.courses[index] = record;
          });
          App.closeModal();
          App.toast(course ? 'Course updated.' : 'Course added.', 'success');
          paint();
        });
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (document.body.dataset.page !== 'courses') return;
    user = Auth.guard(['admin', 'teacher']);
    if (!user) return;
    var content = App.renderShell({ active: 'courses', title: 'Courses', subtitle: 'School, college, competitive, computer, and other classes' });
    content.innerHTML = '<section class="card"><div class="toolbar"><div class="filters"><input id="q" type="search" placeholder="Search courses"><select id="f-type"><option value="">All types</option>' + TYPES.map(function (type) { return '<option>' + type + '</option>'; }).join('') + '</select><select id="f-status"><option value="">All statuses</option><option>Active</option><option>Inactive</option></select></div>' + (canWrite() ? '<button type="button" class="btn btn-primary" id="add-course">Add course</button>' : '') + '</div><div id="course-table"></div></section>';
    content.querySelector('#q').addEventListener('input', function (event) { filters.q = event.target.value; paint(); });
    content.querySelector('#f-type').addEventListener('change', function (event) { filters.type = event.target.value; paint(); });
    content.querySelector('#f-status').addEventListener('change', function (event) { filters.status = event.target.value; paint(); });
    var add = content.querySelector('#add-course');
    if (add) add.addEventListener('click', function () { openForm(null); });
    content.addEventListener('click', function (event) {
      var button = event.target.closest('[data-action]');
      if (!button) return;
      var course = Storage.byId(Storage.load().courses, button.getAttribute('data-id'));
      if (!course) return;
      var action = button.getAttribute('data-action');
      if (action === 'edit') openForm(course);
      if (action === 'toggle') {
        var next = course.status === 'Active' ? 'Inactive' : 'Active';
        App.confirmDialog({ title: next === 'Inactive' ? 'Deactivate course' : 'Activate course', message: next + ' ' + course.name + '?', confirmText: next === 'Inactive' ? 'Deactivate' : 'Activate', danger: next === 'Inactive' }).then(function (yes) {
          if (!yes) return;
          Storage.update(function (data) {
            var item = Storage.byId(data.courses, course.id);
            if (item) item.status = next;
          });
          App.toast('Course is now ' + next.toLowerCase() + '.', 'success');
          paint();
        });
      }
      if (action === 'delete') {
        var used = Storage.load().batches.some(function (batch) { return batch.courseId === course.id; });
        if (used) { App.toast('Remove or move the batches for this course before deleting it.', 'error'); return; }
        App.confirmDialog({ title: 'Delete course', message: 'Delete ' + course.name + '?', confirmText: 'Delete', danger: true }).then(function (yes) {
          if (!yes) return;
          Storage.update(function (data) { data.courses = data.courses.filter(function (item) { return item.id !== course.id; }); });
          App.toast('Course deleted.', 'success');
          paint();
        });
      }
    });
    paint();
  });
})();
