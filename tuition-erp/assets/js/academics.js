/**
 * Course subjects, weekly timetable, and a short topic list per subject.
 * Admin and teachers manage it. Students and parents only see their timetable.
 */
(function () {
  var tab = 'subjects';
  var subjectCourse = '';
  var timetableBatch = '';
  var syllabusSubject = '';
  var childId = '';
  var DAYS = [
    { value: '1', label: 'Monday' },
    { value: '2', label: 'Tuesday' },
    { value: '3', label: 'Wednesday' },
    { value: '4', label: 'Thursday' },
    { value: '5', label: 'Friday' },
    { value: '6', label: 'Saturday' },
    { value: '0', label: 'Sunday' }
  ];

  function dayOrder(day) { return day === 0 ? 7 : day; }

  function dayLabel(day) {
    var found = DAYS.find(function (item) { return Number(item.value) === Number(day); });
    return found ? found.label : 'Day';
  }

  function subjects() {
    return Storage.load().courseSubjects.filter(function (subject) {
      return !subjectCourse || subject.courseId === subjectCourse;
    }).sort(function (a, b) {
      var course = Storage.nameOf('courses', a.courseId, '').localeCompare(Storage.nameOf('courses', b.courseId, ''));
      return course || a.name.localeCompare(b.name);
    });
  }

  function subjectsForCourse(courseId) {
    return Storage.load().courseSubjects.filter(function (subject) { return subject.courseId === courseId; })
      .sort(function (a, b) { return a.name.localeCompare(b.name); });
  }

  function slots() {
    return Storage.load().timetable.filter(function (slot) {
      return !timetableBatch || slot.batchId === timetableBatch;
    }).sort(function (a, b) {
      return dayOrder(a.day) - dayOrder(b.day) || a.startTime.localeCompare(b.startTime);
    });
  }

  function paintSubjects() {
    var list = subjects();
    return list.length
      ? '<div class="table-wrap"><table><thead><tr><th>Subject</th><th>Course</th><th class="hide-sm">Topics</th><th></th></tr></thead><tbody>' + list.map(function (subject) {
        return '<tr><td><strong>' + App.esc(subject.name) + '</strong></td><td>' + App.esc(Storage.nameOf('courses', subject.courseId, 'Course')) + '</td><td class="hide-sm">' + (subject.topics || []).length + '</td><td class="actions"><button type="button" class="btn btn-secondary btn-sm" data-action="edit-subject" data-id="' + App.esc(subject.id) + '">Edit</button><button type="button" class="btn btn-danger btn-sm" data-action="delete-subject" data-id="' + App.esc(subject.id) + '">Delete</button></td></tr>';
      }).join('') + '</tbody></table></div>'
      : App.empty('No subjects for this course yet.');
  }

  function paintTimetable() {
    var list = slots();
    return list.length
      ? '<div class="table-wrap"><table><thead><tr><th>Day</th><th>Time</th><th>Subject</th><th class="hide-sm">Teacher</th><th>Batch</th><th></th></tr></thead><tbody>' + list.map(function (slot) {
        return '<tr><td>' + App.esc(dayLabel(slot.day)) + '</td><td>' + App.esc(slot.startTime) + '–' + App.esc(slot.endTime) + '</td><td>' + App.esc(Storage.nameOf('courseSubjects', slot.subjectId, 'Subject')) + '</td><td class="hide-sm">' + App.esc(Storage.nameOf('teachers', slot.teacherId, 'Teacher')) + '</td><td>' + App.esc(Storage.nameOf('batches', slot.batchId, 'Batch')) + '</td><td class="actions"><button type="button" class="btn btn-secondary btn-sm" data-action="edit-slot" data-id="' + App.esc(slot.id) + '">Edit</button><button type="button" class="btn btn-danger btn-sm" data-action="delete-slot" data-id="' + App.esc(slot.id) + '">Delete</button></td></tr>';
      }).join('') + '</tbody></table></div>'
      : App.empty('No classes on this timetable yet.');
  }

  function paintSyllabus() {
    var subject = Storage.byId(Storage.load().courseSubjects, syllabusSubject);
    if (!subject) return App.empty('Add a subject first, then list its topics here.');
    var topics = subject.topics || [];
    var rows = topics.length ? '<div class="list">' + topics.map(function (topic, index) {
      return '<div class="list-row"><div><strong>' + App.esc(topic) + '</strong></div><div class="actions"><button type="button" class="btn btn-secondary btn-sm" data-action="edit-topic" data-index="' + index + '">Edit</button><button type="button" class="btn btn-danger btn-sm" data-action="delete-topic" data-index="' + index + '">Delete</button></div></div>';
    }).join('') + '</div>' : App.empty('No topics yet.');
    return '<p class="muted" style="margin-bottom:10px">' + App.esc(Storage.nameOf('courses', subject.courseId, 'Course')) + '</p>' + rows + '<div class="toolbar" style="margin-top:12px"><button type="button" class="btn btn-primary" id="add-topic">Add topic</button></div>';
  }

  function paint() {
    var host = document.getElementById('academics-body');
    if (!host) return;
    if (tab === 'subjects') host.innerHTML = paintSubjects();
    else if (tab === 'timetable') host.innerHTML = paintTimetable();
    else host.innerHTML = paintSyllabus();
    document.querySelectorAll('[data-tab]').forEach(function (button) {
      button.setAttribute('aria-selected', button.getAttribute('data-tab') === tab ? 'true' : 'false');
    });
    var addTopic = document.getElementById('add-topic');
    if (addTopic) addTopic.addEventListener('click', function () { openTopic(null); });
  }

  function openSubject(subject) {
    var value = subject || { courseId: subjectCourse || '', name: '', topics: [] };
    var courseList = Storage.load().courses.slice().sort(function (a, b) { return a.name.localeCompare(b.name); });
    App.openModal({
      title: subject ? 'Edit subject' : 'Add subject',
      html: '<form id="subject-form" class="stack" novalidate><div class="field"><label for="course">Course</label><select id="course">' + App.optionsHtml(courseList, value.courseId, function (course) { return course.id; }, function (course) { return course.name; }, 'Select a course') + '</select><div class="field-error"></div></div><div class="field"><label for="name">Subject name</label><input id="name" value="' + App.esc(value.name) + '" required><div class="field-error"></div></div><div class="field"><label for="topics">Topics, one per line</label><textarea id="topics" rows="6">' + App.esc((value.topics || []).join('\n')) + '</textarea><div class="field-error"></div></div><div class="modal-actions"><button type="button" class="btn btn-ghost" id="cancel-subject">Cancel</button><button class="btn btn-primary" type="submit">Save subject</button></div></form>',
      onMount: function (root) {
        root.querySelector('#cancel-subject').addEventListener('click', App.closeModal);
        root.querySelector('#subject-form').addEventListener('submit', function (event) {
          event.preventDefault();
          var course = root.querySelector('#course');
          var name = root.querySelector('#name');
          var ok = App.requireValue(course, 'Course') && App.requireValue(name, 'Subject name');
          var topics = root.querySelector('#topics').value.split('\n').map(function (line) { return line.trim(); }).filter(Boolean);
          var duplicate = Storage.load().courseSubjects.some(function (item) {
            return item.courseId === course.value && item.name.toLowerCase() === name.value.trim().toLowerCase() && (!subject || item.id !== subject.id);
          });
          if (duplicate) { App.setFieldError(name, 'This course already has that subject.'); ok = false; }
          if (!ok) { App.toast('Check the highlighted fields.', 'error'); return; }
          var record = {
            id: subject ? subject.id : Storage.uid('subj'),
            instituteId: Storage.INSTITUTE_ID,
            courseId: course.value,
            name: name.value.trim(),
            topics: topics
          };
          Storage.update(function (data) {
            var index = data.courseSubjects.findIndex(function (item) { return item.id === record.id; });
            if (index === -1) data.courseSubjects.push(record);
            else data.courseSubjects[index] = record;
          });
          if (!syllabusSubject) syllabusSubject = record.id;
          App.closeModal();
          App.toast(subject ? 'Subject updated.' : 'Subject added.', 'success');
          paint();
        });
      }
    });
  }

  function openSlot(slot) {
    var data = Storage.load();
    var batches = data.batches.filter(function (batch) { return batch.status === 'Active'; }).sort(function (a, b) { return a.name.localeCompare(b.name); });
    var teachers = data.teachers.filter(function (teacher) { return teacher.status !== 'Resigned'; }).sort(function (a, b) { return a.name.localeCompare(b.name); });
    var value = slot || { batchId: timetableBatch || (batches[0] && batches[0].id) || '', day: 1, startTime: '07:00', endTime: '08:00', subjectId: '', teacherId: '' };
    function subjectOptions(batchId, selected) {
      var batch = Storage.byId(batches, batchId) || Storage.byId(data.batches, batchId);
      var list = batch ? subjectsForCourse(batch.courseId) : [];
      return App.optionsHtml(list, selected, function (subject) { return subject.id; }, function (subject) { return subject.name; }, 'Select a subject');
    }
    App.openModal({
      title: slot ? 'Edit class' : 'Add class',
      html: '<form id="slot-form" class="stack" novalidate><div class="form-grid"><div class="field"><label for="batch">Batch</label><select id="batch">' + App.optionsHtml(batches, value.batchId, function (batch) { return batch.id; }, function (batch) { return batch.name; }, 'Select a batch') + '</select><div class="field-error"></div></div><div class="field"><label for="day">Day</label><select id="day">' + DAYS.map(function (day) { return '<option value="' + day.value + '"' + (Number(day.value) === Number(value.day) ? ' selected' : '') + '>' + day.label + '</option>'; }).join('') + '</select><div class="field-error"></div></div><div class="field"><label for="start">Start</label><input id="start" type="time" value="' + App.esc(value.startTime) + '" required><div class="field-error"></div></div><div class="field"><label for="end">End</label><input id="end" type="time" value="' + App.esc(value.endTime) + '" required><div class="field-error"></div></div><div class="field"><label for="subject">Subject</label><select id="subject">' + subjectOptions(value.batchId, value.subjectId) + '</select><div class="field-error"></div></div><div class="field"><label for="teacher">Teacher</label><select id="teacher">' + App.optionsHtml(teachers, value.teacherId, function (teacher) { return teacher.id; }, function (teacher) { return teacher.name; }, 'Select a teacher') + '</select><div class="field-error"></div></div></div><div class="modal-actions"><button type="button" class="btn btn-ghost" id="cancel-slot">Cancel</button><button class="btn btn-primary" type="submit">Save class</button></div></form>',
      onMount: function (root) {
        var batchInput = root.querySelector('#batch');
        var subjectInput = root.querySelector('#subject');
        batchInput.addEventListener('change', function () {
          subjectInput.innerHTML = subjectOptions(batchInput.value, '');
        });
        root.querySelector('#cancel-slot').addEventListener('click', App.closeModal);
        root.querySelector('#slot-form').addEventListener('submit', function (event) {
          event.preventDefault();
          var start = root.querySelector('#start');
          var end = root.querySelector('#end');
          var ok = App.requireValue(batchInput, 'Batch') && App.requireValue(subjectInput, 'Subject') && App.requireValue(root.querySelector('#teacher'), 'Teacher') && App.requireValue(start, 'Start time') && App.requireValue(end, 'End time');
          if (start.value && end.value && end.value <= start.value) { App.setFieldError(end, 'End time must be after the start time.'); ok = false; }
          if (!ok) { App.toast('Check the highlighted fields.', 'error'); return; }
          var record = {
            id: slot ? slot.id : Storage.uid('tt'),
            instituteId: Storage.INSTITUTE_ID,
            batchId: batchInput.value,
            day: Number(root.querySelector('#day').value),
            startTime: start.value,
            endTime: end.value,
            subjectId: subjectInput.value,
            teacherId: root.querySelector('#teacher').value
          };
          Storage.update(function (store) {
            var index = store.timetable.findIndex(function (item) { return item.id === record.id; });
            if (index === -1) store.timetable.push(record);
            else store.timetable[index] = record;
          });
          timetableBatch = record.batchId;
          var filter = document.getElementById('f-batch');
          if (filter) filter.value = record.batchId;
          App.closeModal();
          App.toast(slot ? 'Class updated.' : 'Class added.', 'success');
          paint();
        });
      }
    });
  }

  function openTopic(index) {
    var subject = Storage.byId(Storage.load().courseSubjects, syllabusSubject);
    if (!subject) return;
    var current = index === null ? '' : (subject.topics || [])[index] || '';
    App.openModal({
      title: index === null ? 'Add topic' : 'Edit topic',
      html: '<form id="topic-form" class="stack" novalidate><div class="field"><label for="topic">Topic</label><input id="topic" value="' + App.esc(current) + '" required><div class="field-error"></div></div><div class="modal-actions"><button type="button" class="btn btn-ghost" id="cancel-topic">Cancel</button><button class="btn btn-primary" type="submit">Save topic</button></div></form>',
      onMount: function (root) {
        root.querySelector('#cancel-topic').addEventListener('click', App.closeModal);
        root.querySelector('#topic-form').addEventListener('submit', function (event) {
          event.preventDefault();
          var input = root.querySelector('#topic');
          if (!App.requireValue(input, 'Topic')) { App.toast('Check the highlighted fields.', 'error'); return; }
          Storage.update(function (data) {
            var item = Storage.byId(data.courseSubjects, syllabusSubject);
            if (!item) return;
            item.topics = item.topics || [];
            if (index === null) item.topics.push(input.value.trim());
            else item.topics[index] = input.value.trim();
          });
          App.closeModal();
          App.toast(index === null ? 'Topic added.' : 'Topic updated.', 'success');
          paint();
        });
      }
    });
  }

  function renderManager() {
    var data = Storage.load();
    var courseList = data.courses.slice().sort(function (a, b) { return a.name.localeCompare(b.name); });
    var batches = data.batches.slice().sort(function (a, b) { return a.name.localeCompare(b.name); });
    if (!syllabusSubject && data.courseSubjects[0]) syllabusSubject = data.courseSubjects[0].id;
    var content = App.renderShell({ active: 'academics', title: 'Academics', subtitle: 'Subjects, weekly timetable, and topic lists' });
    content.innerHTML = '<section class="card"><div class="tabs" role="tablist"><button type="button" class="tab" data-tab="subjects" aria-selected="true">Subjects</button><button type="button" class="tab" data-tab="timetable">Timetable</button><button type="button" class="tab" data-tab="syllabus">Syllabus</button></div><div class="toolbar"><div class="filters"><select id="f-course"><option value="">All courses</option>' + courseList.map(function (course) { return '<option value="' + App.esc(course.id) + '">' + App.esc(course.name) + '</option>'; }).join('') + '</select><select id="f-batch"><option value="">All batches</option>' + batches.map(function (batch) { return '<option value="' + App.esc(batch.id) + '">' + App.esc(batch.name) + '</option>'; }).join('') + '</select><select id="f-subject">' + App.optionsHtml(data.courseSubjects.slice().sort(function (a, b) { return a.name.localeCompare(b.name); }), syllabusSubject, function (subject) { return subject.id; }, function (subject) { return subject.name + ' · ' + Storage.nameOf('courses', subject.courseId, ''); }) + '</select></div><button type="button" class="btn btn-primary" id="add-academics">Add subject</button></div><div id="academics-body"></div></section>';
    function syncFilters() {
      content.querySelector('#f-course').hidden = tab !== 'subjects';
      content.querySelector('#f-batch').hidden = tab !== 'timetable';
      content.querySelector('#f-subject').hidden = tab !== 'syllabus';
      var add = content.querySelector('#add-academics');
      add.hidden = tab === 'syllabus';
      add.textContent = tab === 'timetable' ? 'Add class' : 'Add subject';
    }
    content.querySelectorAll('[data-tab]').forEach(function (button) {
      button.addEventListener('click', function () {
        tab = button.getAttribute('data-tab');
        syncFilters();
        paint();
      });
    });
    content.querySelector('#f-course').addEventListener('change', function (event) { subjectCourse = event.target.value; paint(); });
    content.querySelector('#f-batch').addEventListener('change', function (event) { timetableBatch = event.target.value; paint(); });
    content.querySelector('#f-subject').addEventListener('change', function (event) { syllabusSubject = event.target.value; paint(); });
    content.querySelector('#add-academics').addEventListener('click', function () {
      if (tab === 'timetable') openSlot(null);
      else openSubject(null);
    });
    content.addEventListener('click', function (event) {
      var button = event.target.closest('[data-action]');
      if (!button) return;
      var id = button.getAttribute('data-id');
      var action = button.getAttribute('data-action');
      var store = Storage.load();
      if (action === 'edit-subject') openSubject(Storage.byId(store.courseSubjects, id));
      if (action === 'delete-subject') {
        var subject = Storage.byId(store.courseSubjects, id);
        if (!subject) return;
        App.confirmDialog({ title: 'Delete subject', message: 'Delete ' + subject.name + '? Classes that use it will be removed too.', confirmText: 'Delete', danger: true }).then(function (yes) {
          if (!yes) return;
          Storage.update(function (data) {
            data.courseSubjects = data.courseSubjects.filter(function (item) { return item.id !== subject.id; });
            data.timetable = data.timetable.filter(function (slot) { return slot.subjectId !== subject.id; });
          });
          if (syllabusSubject === subject.id) syllabusSubject = '';
          App.toast('Subject deleted.', 'success');
          paint();
        });
      }
      if (action === 'edit-slot') openSlot(Storage.byId(store.timetable, id));
      if (action === 'delete-slot') {
        var slot = Storage.byId(store.timetable, id);
        if (!slot) return;
        App.confirmDialog({ title: 'Delete class', message: 'Remove ' + Storage.nameOf('courseSubjects', slot.subjectId, 'this class') + ' from the timetable?', confirmText: 'Delete', danger: true }).then(function (yes) {
          if (!yes) return;
          Storage.update(function (data) { data.timetable = data.timetable.filter(function (item) { return item.id !== slot.id; }); });
          App.toast('Class removed.', 'success');
          paint();
        });
      }
      if (action === 'edit-topic') openTopic(Number(button.getAttribute('data-index')));
      if (action === 'delete-topic') {
        var index = Number(button.getAttribute('data-index'));
        var current = Storage.byId(store.courseSubjects, syllabusSubject);
        var topic = current && current.topics ? current.topics[index] : '';
        App.confirmDialog({ title: 'Delete topic', message: 'Delete “' + topic + '”?', confirmText: 'Delete', danger: true }).then(function (yes) {
          if (!yes) return;
          Storage.update(function (data) {
            var item = Storage.byId(data.courseSubjects, syllabusSubject);
            if (item && item.topics) item.topics.splice(index, 1);
          });
          App.toast('Topic deleted.', 'success');
          paint();
        });
      }
    });
    syncFilters();
    paint();
  }

  function timetableCard(batchId) {
    var list = Storage.load().timetable.filter(function (slot) { return slot.batchId === batchId; }).sort(function (a, b) {
      return dayOrder(a.day) - dayOrder(b.day) || a.startTime.localeCompare(b.startTime);
    });
    var subjectIds = {};
    list.forEach(function (slot) { subjectIds[slot.subjectId] = true; });
    var topics = Storage.load().courseSubjects.filter(function (subject) { return subjectIds[subject.id]; });
    var table = list.length
      ? '<div class="table-wrap"><table><thead><tr><th>Day</th><th>Time</th><th>Subject</th><th>Teacher</th></tr></thead><tbody>' + list.map(function (slot) {
        return '<tr><td>' + App.esc(dayLabel(slot.day)) + '</td><td>' + App.esc(slot.startTime) + '–' + App.esc(slot.endTime) + '</td><td>' + App.esc(Storage.nameOf('courseSubjects', slot.subjectId, 'Subject')) + '</td><td>' + App.esc(Storage.nameOf('teachers', slot.teacherId, 'Teacher')) + '</td></tr>';
      }).join('') + '</tbody></table></div>'
      : App.empty('No timetable has been published for this batch.');
    var syllabus = topics.length
      ? '<div class="list">' + topics.map(function (subject) {
        var lines = (subject.topics || []).map(function (topic) { return App.esc(topic); }).join(', ') || 'No topics listed yet.';
        return '<div class="list-row"><div><strong>' + App.esc(subject.name) + '</strong><div class="muted">' + lines + '</div></div></div>';
      }).join('') + '</div>'
      : '';
    return '<article class="card"><h2 class="card-title">' + App.esc(Storage.nameOf('batches', batchId, 'Batch')) + '</h2>' + table + (syllabus ? '<h3 class="card-title" style="margin-top:16px">Topics</h3>' + syllabus : '') + '</article>';
  }

  function renderViewer(user) {
    var students = user.role === 'student'
      ? Storage.load().students.filter(function (student) { return student.id === user.studentId; })
      : Storage.scope(user).students;
    var content = App.renderShell({
      active: 'timetable',
      title: 'Timetable',
      subtitle: user.role === 'parent' ? 'Weekly classes for your children' : 'Weekly classes for your batch'
    });
    if (!students.length) {
      content.innerHTML = '<section class="card empty-card"><h2>No student is linked</h2><p>Ask the institute to link this login before the timetable can be shown.</p></section>';
      return;
    }
    if (!childId || !students.some(function (student) { return student.id === childId; })) childId = students[0].id;
    function draw() {
      var student = students.find(function (item) { return item.id === childId; }) || students[0];
      var switcher = students.length > 1
        ? '<div class="child-switch">' + students.map(function (item) {
          return '<button type="button" class="tab" data-child="' + App.esc(item.id) + '" aria-selected="' + (item.id === student.id ? 'true' : 'false') + '">' + App.esc(item.name) + '</button>';
        }).join('') + '</div>'
        : '';
      content.innerHTML = switcher + (student.batchId ? timetableCard(student.batchId) : '<section class="card empty-card"><h2>No batch yet</h2><p>' + App.esc(student.name) + ' is not in a batch, so there is no timetable to show.</p></section>');
      content.querySelectorAll('[data-child]').forEach(function (button) {
        button.addEventListener('click', function () {
          childId = button.getAttribute('data-child');
          draw();
        });
      });
    }
    draw();
  }

  document.addEventListener('DOMContentLoaded', function () {
    var page = document.body.dataset.page;
    if (page !== 'academics' && page !== 'timetable') return;
    var user = page === 'timetable' ? Auth.guard(['student', 'parent']) : Auth.guard(['admin', 'teacher']);
    if (!user) return;
    if (page === 'timetable') renderViewer(user);
    else renderManager();
  });
})();
