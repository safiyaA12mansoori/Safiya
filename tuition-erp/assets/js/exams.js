/**
 * Examinations and mark entry. Totals, percentage, grade, and pass/fail
 * are calculated from the subject marks.
 */
(function () {
  var user = null;
  var selectedExam = '';

  function examList() {
    var data = user.role === 'teacher' ? Storage.scope(user) : Storage.load();
    return data.exams.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
  }

  function batchChoices() {
    return user.role === 'teacher' ? Storage.scope(user).batches : Storage.load().batches;
  }

  function resultCount(examId) {
    return Storage.load().results.filter(function (result) { return result.examId === examId; }).length;
  }

  function renderExams() {
    var rows = examList();
    var content = document.getElementById('content');
    content.innerHTML = '<section class="card"><div class="toolbar"><p class="muted">Create a paper, attach it to a batch, then enter marks on Results.</p><button type="button" class="btn btn-primary" id="add-exam">Create examination</button></div>' +
      (rows.length ? '<div class="table-wrap"><table><thead><tr><th>Examination</th><th>Batch</th><th>Date</th><th class="hide-sm">Subjects</th><th>Status</th><th></th></tr></thead><tbody>' + rows.map(function (exam) {
        return '<tr><td>' + App.esc(exam.name) + '</td><td>' + App.esc(Storage.nameOf('batches', exam.batchId)) + '</td><td>' + App.esc(Storage.formatDate(exam.date)) + '</td><td class="hide-sm">' + App.esc(exam.subjects.map(function (subject) { return subject.name; }).join(', ')) + '</td><td>' + App.badge(exam.status) + '</td><td class="actions"><a class="btn btn-ghost btn-sm" href="' + App.pageHref('results.html') + '?exam=' + encodeURIComponent(exam.id) + '">Marks</a><button type="button" class="btn btn-secondary btn-sm" data-edit="' + App.esc(exam.id) + '">Edit</button><button type="button" class="btn btn-danger btn-sm" data-delete="' + App.esc(exam.id) + '">Delete</button></td></tr>';
      }).join('') + '</tbody></table></div>' : App.empty('No examinations yet.')) + '</section>';
    content.querySelector('#add-exam').addEventListener('click', function () { examForm(null); });
    content.querySelectorAll('[data-edit]').forEach(function (button) {
      button.addEventListener('click', function () { examForm(Storage.byId(examList(), button.getAttribute('data-edit'))); });
    });
    content.querySelectorAll('[data-delete]').forEach(function (button) {
      button.addEventListener('click', function () {
        var exam = Storage.byId(examList(), button.getAttribute('data-delete'));
        App.confirmDialog({
          title: 'Delete examination',
          message: 'Delete ' + exam.name + ' and its ' + resultCount(exam.id) + ' result sheet' + (resultCount(exam.id) === 1 ? '' : 's') + '?',
          confirmText: 'Delete',
          danger: true
        }).then(function (yes) {
          if (!yes) return;
          Storage.update(function (data) {
            data.exams = data.exams.filter(function (item) { return item.id !== exam.id; });
            data.results = data.results.filter(function (item) { return item.examId !== exam.id; });
          });
          App.toast('Examination deleted.', 'success');
          renderExams();
        });
      });
    });
  }

  function subjectEditor(subjects, locked) {
    return subjects.map(function (subject, index) {
      return '<div class="form-grid subject-row"><input data-subject="name" data-index="' + index + '" value="' + App.esc(subject.name) + '" placeholder="Subject" ' + (locked ? 'readonly' : '') + '><input data-subject="max" data-index="' + index + '" type="number" min="1" value="' + App.esc(subject.maxMarks) + '" ' + (locked ? 'readonly' : '') + '><input data-subject="pass" data-index="' + index + '" type="number" min="0" value="' + App.esc(subject.passMarks) + '" ' + (locked ? 'readonly' : '') + '>' + (locked ? '' : '<button type="button" class="btn btn-ghost btn-sm" data-remove-subject="' + index + '">Remove</button>') + '</div>';
    }).join('');
  }

  function examForm(exam) {
    var locked = exam && resultCount(exam.id) > 0;
    var subjects = exam ? exam.subjects.map(function (subject) { return Object.assign({}, subject); }) : [{ id: Storage.uid('sub'), name: '', maxMarks: 100, passMarks: 35 }];
    function html() {
      return '<form id="exam-form" class="stack"><div class="field"><label for="name">Name</label><input id="name" value="' + App.esc(exam ? exam.name : '') + '" required><div class="field-error"></div></div><div class="field"><label for="batch">Batch</label><select id="batch">' + App.optionsHtml(batchChoices(), exam ? exam.batchId : '', function (batch) { return batch.id; }, function (batch) { return batch.name; }, 'Select a batch') + '</select><div class="field-error"></div></div><div class="field"><label for="date">Date</label><input id="date" type="date" value="' + App.esc(exam ? exam.date : Storage.addDays(Storage.today(), 7)) + '" required><div class="field-error"></div></div><div class="field"><span class="section-label">Subjects</span><p class="help">Columns are name, maximum marks, and pass marks.' + (locked ? ' Subjects stay locked because results already exist.' : '') + '</p><div id="subjects">' + subjectEditor(subjects, locked) + '</div>' + (locked ? '' : '<button type="button" class="btn btn-secondary btn-sm" id="add-subject">Add subject</button>') + '<div class="field-error" id="subject-error"></div></div><div class="modal-actions"><button type="button" class="btn btn-ghost" id="cancel-exam">Cancel</button><button class="btn btn-primary" type="submit">Save examination</button></div></form>';
    }
    App.openModal({
      title: exam ? 'Edit examination' : 'Create examination',
      wide: true,
      html: html(),
      onMount: function (root) {
        function redrawSubjects() {
          root.querySelector('#subjects').innerHTML = subjectEditor(subjects, locked);
          bindRemove();
        }
        function bindRemove() {
          root.querySelectorAll('[data-remove-subject]').forEach(function (button) {
            button.addEventListener('click', function () {
              if (subjects.length === 1) { App.toast('An examination needs at least one subject.', 'error'); return; }
              readSubjects();
              subjects.splice(Number(button.getAttribute('data-remove-subject')), 1);
              redrawSubjects();
            });
          });
        }
        function readSubjects() {
          if (locked) return;
          root.querySelectorAll('[data-subject="name"]').forEach(function (input) {
            var index = Number(input.getAttribute('data-index'));
            subjects[index].name = input.value;
            subjects[index].maxMarks = Number(root.querySelector('[data-subject="max"][data-index="' + index + '"]').value);
            subjects[index].passMarks = Number(root.querySelector('[data-subject="pass"][data-index="' + index + '"]').value);
          });
        }
        bindRemove();
        var add = root.querySelector('#add-subject');
        if (add) add.addEventListener('click', function () {
          readSubjects();
          subjects.push({ id: Storage.uid('sub'), name: '', maxMarks: 100, passMarks: 35 });
          redrawSubjects();
        });
        root.querySelector('#cancel-exam').addEventListener('click', App.closeModal);
        root.querySelector('#exam-form').addEventListener('submit', function (event) {
          event.preventDefault();
          readSubjects();
          var ok = App.requireValue(root.querySelector('#name'), 'Name');
          if (!root.querySelector('#batch').value) { App.setFieldError(root.querySelector('#batch'), 'Batch is required.'); ok = false; }
          if (!App.requireValue(root.querySelector('#date'), 'Date')) ok = false;
          var subjectOk = subjects.every(function (subject) {
            return subject.name.trim() && Number(subject.maxMarks) > 0 && Number(subject.passMarks) >= 0 && Number(subject.passMarks) <= Number(subject.maxMarks);
          });
          root.querySelector('#subject-error').textContent = subjectOk ? '' : 'Each subject needs a name, a maximum, and a pass mark that is not above the maximum.';
          if (!subjectOk) ok = false;
          if (!ok) { App.toast('Check the highlighted fields.', 'error'); return; }
          var record = {
            id: exam ? exam.id : Storage.uid('ex'),
            instituteId: Storage.INSTITUTE_ID,
            name: root.querySelector('#name').value.trim(),
            batchId: root.querySelector('#batch').value,
            date: root.querySelector('#date').value,
            status: exam ? exam.status : 'Scheduled',
            subjects: subjects.map(function (subject) {
              return { id: subject.id, name: subject.name.trim(), maxMarks: Number(subject.maxMarks), passMarks: Number(subject.passMarks) };
            })
          };
          if (!exam && record.date < Storage.today()) record.status = 'Scheduled';
          Storage.update(function (data) {
            var index = data.exams.findIndex(function (item) { return item.id === record.id; });
            if (index === -1) data.exams.push(record);
            else data.exams[index] = record;
          });
          App.closeModal();
          App.toast('Examination saved.', 'success');
          renderExams();
        });
      }
    });
  }

  function studentsFor(exam) {
    return Storage.load().students.filter(function (student) {
      return student.batchId === exam.batchId && student.status === 'Active';
    }).sort(function (a, b) { return a.name < b.name ? -1 : 1; });
  }

  function renderResults() {
    var exams = examList();
    if (!selectedExam && exams.length) selectedExam = exams[0].id;
    var exam = Storage.byId(exams, selectedExam);
    var content = document.getElementById('content');
    if (!exam && exams.length) {
      selectedExam = exams[0].id;
      exam = exams[0];
    }
    if (!exams.length) {
      content.innerHTML = '<section class="card empty-card"><h2>No examinations yet</h2><p>Create one before entering marks.</p><a class="btn btn-primary" href="' + App.pageHref('examinations.html') + '">Create examination</a></section>';
      return;
    }
    var students = exam ? studentsFor(exam) : [];
    var saved = Storage.load().results.filter(function (result) { return exam && result.examId === exam.id; });
    var head = exam.subjects.map(function (subject) { return '<th>' + App.esc(subject.name) + '<div class="muted">/' + subject.maxMarks + '</div></th>'; }).join('');
    var body = students.map(function (student) {
      var result = saved.find(function (item) { return item.studentId === student.id; });
      var inputs = exam.subjects.map(function (subject) {
        var mark = result && result.marks.find(function (item) { return item.subjectId === subject.id; });
        return '<td><input class="marks-input" data-student="' + App.esc(student.id) + '" data-subject="' + App.esc(subject.id) + '" type="number" min="0" max="' + subject.maxMarks + '" step="0.5" value="' + (mark ? App.esc(mark.obtained) : '') + '"></td>';
      }).join('');
      var summary = result ? result.total + '/' + result.maxTotal + ' · ' + result.percentage + '% · ' + result.grade : '—';
      return '<tr data-result-row="' + App.esc(student.id) + '"><td>' + App.esc(student.name) + '</td>' + inputs + '<td class="summary">' + App.esc(summary) + '</td><td>' + (result ? App.badge(result.result) : '—') + '</td><td><button type="button" class="btn btn-ghost btn-sm" data-print="' + App.esc(student.id) + '">Print</button></td></tr>';
    }).join('');
    content.innerHTML = '<section class="card"><div class="toolbar"><label class="field">Examination<select id="exam-select">' + exams.map(function (item) { return '<option value="' + App.esc(item.id) + '"' + (item.id === selectedExam ? ' selected' : '') + '>' + App.esc(item.name) + ' · ' + App.esc(Storage.formatDate(item.date)) + '</option>'; }).join('') + '</select></label><div class="row"><button type="button" class="btn btn-secondary" id="print-all">Print result sheet</button><button type="button" class="btn btn-primary" id="save-marks">Save marks</button></div></div>' +
      (students.length ? '<div class="table-wrap"><table><thead><tr><th>Student</th>' + head + '<th>Total</th><th>Result</th><th></th></tr></thead><tbody>' + body + '</tbody></table></div>' : App.empty('This batch has no active students.')) + '</section>';
    content.querySelector('#exam-select').addEventListener('change', function (event) { selectedExam = event.target.value; renderResults(); });
    content.querySelectorAll('.marks-input').forEach(function (input) {
      input.addEventListener('input', function () { refreshRow(exam, input.getAttribute('data-student')); });
    });
    var save = content.querySelector('#save-marks');
    if (save) save.addEventListener('click', function () { saveMarks(exam); });
    var printAll = content.querySelector('#print-all');
    if (printAll) printAll.addEventListener('click', function () { printSheet(exam, null); });
    content.querySelectorAll('[data-print]').forEach(function (button) {
      button.addEventListener('click', function () { printSheet(exam, button.getAttribute('data-print')); });
    });
  }

  function collected(exam) {
    var students = studentsFor(exam);
    var rows = [];
    var valid = true;
    students.forEach(function (student) {
      var scores = exam.subjects.map(function (subject) {
        var input = document.querySelector('.marks-input[data-student="' + student.id + '"][data-subject="' + subject.id + '"]');
        var value = input ? input.value.trim() : '';
        if (value === '' || Number(value) < 0 || Number(value) > Number(subject.maxMarks) || isNaN(Number(value))) {
          if (input) App.setFieldError(input, '0 to ' + subject.maxMarks);
          valid = false;
          return 0;
        }
        if (input) App.setFieldError(input, '');
        return Number(value);
      });
      rows.push({ student: student, scores: scores, scored: Storage.scoreExam(exam.subjects, scores) });
    });
    return { rows: rows, valid: valid };
  }

  function refreshRow(exam, studentId) {
    var input = document.querySelector('.marks-input[data-student="' + studentId + '"]');
    if (!input) return;
    var scores = exam.subjects.map(function (subject) {
      var field = document.querySelector('.marks-input[data-student="' + studentId + '"][data-subject="' + subject.id + '"]');
      var value = field && field.value !== '' ? Number(field.value) : NaN;
      return isNaN(value) ? null : value;
    });
    var cell = document.querySelector('[data-result-row="' + studentId + '"] .summary');
    if (!cell) return;
    if (scores.some(function (score) { return score == null; })) { cell.textContent = '—'; return; }
    var scored = Storage.scoreExam(exam.subjects, scores);
    cell.textContent = scored.total + '/' + scored.maxTotal + ' · ' + scored.percentage + '% · ' + scored.grade;
  }

  function saveMarks(exam) {
    var collectedRows = collected(exam);
    if (!collectedRows.rows.length) { App.toast('There are no students to mark.', 'error'); return; }
    if (!collectedRows.valid) { App.toast('Enter a mark inside each subject maximum.', 'error'); return; }
    Storage.update(function (data) {
      collectedRows.rows.forEach(function (row) {
        var existing = data.results.find(function (result) { return result.examId === exam.id && result.studentId === row.student.id; });
        var record = {
          id: existing ? existing.id : Storage.uid('res'),
          instituteId: Storage.INSTITUTE_ID,
          examId: exam.id,
          studentId: row.student.id,
          marks: row.scored.marks,
          total: row.scored.total,
          maxTotal: row.scored.maxTotal,
          percentage: row.scored.percentage,
          grade: row.scored.grade,
          result: row.scored.result
        };
        if (existing) Object.assign(existing, record);
        else data.results.push(record);
      });
      var stored = Storage.byId(data.exams, exam.id);
      if (stored) stored.status = 'Completed';
    });
    App.toast('Results saved.', 'success');
    renderResults();
  }

  function printSheet(exam, studentId) {
    var saved = Storage.load().results.filter(function (result) {
      return result.examId === exam.id && (!studentId || result.studentId === studentId);
    });
    if (!saved.length) { App.toast('Save marks before printing.', 'error'); return; }
    var head = exam.subjects.map(function (subject) { return '<th>' + App.esc(subject.name) + '</th>'; }).join('');
    var body = saved.map(function (result) {
      var student = Storage.byId(Storage.load().students, result.studentId);
      var marks = exam.subjects.map(function (subject) {
        var mark = result.marks.find(function (item) { return item.subjectId === subject.id; });
        return '<td>' + (mark ? mark.obtained : '—') + '</td>';
      }).join('');
      return '<tr><td>' + App.esc(student ? student.name : 'Student') + '</td>' + marks + '<td>' + result.total + '/' + result.maxTotal + '</td><td>' + result.percentage + '%</td><td>' + App.esc(result.grade) + '</td><td>' + App.esc(result.result) + '</td></tr>';
    }).join('');
    App.printDocument({
      title: exam.name + ' result sheet',
      subtitle: Storage.nameOf('batches', exam.batchId) + ' · ' + Storage.formatDate(exam.date),
      html: '<table><thead><tr><th>Student</th>' + head + '<th>Total</th><th>Percent</th><th>Grade</th><th>Result</th></tr></thead><tbody>' + body + '</tbody></table>'
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var page = document.body.dataset.page;
    if (page !== 'examinations' && page !== 'results') return;
    user = Auth.guard(['admin', 'teacher']);
    if (!user) return;
    if (page === 'examinations') {
      App.renderShell({ active: 'examinations', title: 'Examinations', subtitle: 'Papers, batches, and subjects' });
      renderExams();
    } else {
      selectedExam = new URLSearchParams(location.search).get('exam') || '';
      App.renderShell({ active: 'results', title: 'Results', subtitle: 'Marks, totals, grades, and pass or fail' });
      renderResults();
    }
  });
})();
