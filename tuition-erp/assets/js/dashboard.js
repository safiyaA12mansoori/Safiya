/**
 * Role dashboards plus the student and parent portals.
 * Counts are calculated from the stored records on each render.
 */
(function () {
  var charts = [];
  var childId = '';

  function destroyCharts() {
    charts.splice(0).forEach(function (chart) { chart.destroy(); });
  }

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function lastMonths(payments) {
    var labels = [];
    var values = [];
    var now = new Date();
    for (var i = 5; i >= 0; i -= 1) {
      var date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      var key = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
      labels.push(date.toLocaleString('en-IN', { month: 'short' }));
      var total = payments.reduce(function (sum, payment) {
        return String(payment.date).slice(0, 7) === key ? sum + Number(payment.amount) : sum;
      }, 0);
      values.push(Math.round(total));
    }
    return { labels: labels, values: values };
  }

  function lastDays(rows) {
    var labels = [];
    var present = [];
    var late = [];
    var absent = [];
    var today = Storage.today();
    for (var i = 6; i >= 0; i -= 1) {
      var date = Storage.addDays(today, -i);
      labels.push(Storage.formatDate(date).replace(/ \d{4}$/, ''));
      var dayRows = rows.filter(function (row) { return row.date === date; });
      var summary = Storage.attendanceSummary(dayRows);
      present.push(summary.present);
      late.push(summary.late);
      absent.push(summary.absent);
    }
    return { labels: labels, present: present, late: late, absent: absent };
  }

  function axisColor() {
    return { ticks: { color: cssVar('--muted') }, grid: { color: cssVar('--border') } };
  }

  function drawBar(canvas, labels, values, label) {
    if (!canvas || typeof Chart === 'undefined') return;
    charts.push(new Chart(canvas, {
      type: 'bar',
      data: { labels: labels, datasets: [{ label: label, data: values, backgroundColor: '#4f46e5', borderRadius: 8 }] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { ticks: { color: cssVar('--muted') }, grid: { display: false } }, y: axisColor() }
      }
    }));
  }

  function drawAttendance(canvas, series) {
    if (!canvas || typeof Chart === 'undefined') return;
    charts.push(new Chart(canvas, {
      type: 'bar',
      data: {
        labels: series.labels,
        datasets: [
          { label: 'Present', data: series.present, backgroundColor: '#059669', borderRadius: 6 },
          { label: 'Late', data: series.late, backgroundColor: '#d97706', borderRadius: 6 },
          { label: 'Absent', data: series.absent, backgroundColor: '#dc2626', borderRadius: 6 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { x: { stacked: true, ticks: { color: cssVar('--muted') }, grid: { display: false } }, y: Object.assign({ stacked: true }, axisColor()) }
      }
    }));
  }

  function drawStatus(canvas, invoices) {
    if (!canvas || typeof Chart === 'undefined') return;
    var totals = { Paid: 0, Partial: 0, Pending: 0, Overdue: 0 };
    invoices.forEach(function (invoice) {
      var view = Storage.invoiceView(invoice, Storage.load().payments, Storage.today());
      totals[view.status] += view.status === 'Paid' ? view.total : view.balance;
    });
    charts.push(new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: Object.keys(totals),
        datasets: [{ data: Object.keys(totals).map(function (key) { return Math.round(totals[key]); }), backgroundColor: ['#059669', '#d97706', '#0284c7', '#dc2626'] }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: cssVar('--text') } } } }
    }));
  }

  function stat(label, value, note, icon, tone) {
    return '<article class="card stat ' + (tone || '') + '"><div class="stat-top"><div><div class="stat-label">' + App.esc(label) + '</div><div class="stat-value">' + value + '</div></div><span class="stat-icon">' + App.icon(icon) + '</span></div><div class="stat-note">' + note + '</div></article>';
  }

  function list(title, rows, empty) {
    var body = rows.length ? rows.map(function (row) {
      return '<div class="list-row"><div><strong>' + row.title + '</strong><div class="muted">' + row.meta + '</div></div><div>' + row.side + '</div></div>';
    }).join('') : App.empty(empty);
    return '<article class="card"><h2 class="card-title">' + App.esc(title) + '</h2><div class="list">' + body + '</div></article>';
  }

  function invoiceRows(invoices, payments) {
    return invoices.map(function (invoice) {
      return Object.assign({}, invoice, Storage.invoiceView(invoice, payments, Storage.today()));
    });
  }

  function studentFacts(student) {
    var data = Storage.load();
    var attendance = data.attendance.filter(function (row) { return row.studentId === student.id; });
    var summary = Storage.attendanceSummary(attendance);
    var invoices = invoiceRows(data.invoices.filter(function (invoice) { return invoice.studentId === student.id; }), data.payments);
    var balance = invoices.reduce(function (sum, invoice) { return sum + invoice.balance; }, 0);
    var paid = invoices.reduce(function (sum, invoice) { return sum + invoice.paid; }, 0);
    var upcoming = data.exams.filter(function (exam) {
      return exam.batchId === student.batchId && exam.date >= Storage.today();
    }).sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    var results = data.results.filter(function (result) { return result.studentId === student.id; });
    return { attendance: attendance, summary: summary, invoices: invoices, balance: balance, paid: paid, upcoming: upcoming, results: results };
  }

  function portal(student, full) {
    var data = Storage.load();
    var facts = studentFacts(student);
    var batch = Storage.byId(data.batches, student.batchId);
    var course = Storage.byId(data.courses, student.courseId);
    var html = '<section class="stat-grid">' +
      stat('Attendance', facts.summary.rate + '%', facts.summary.present + ' present · ' + facts.summary.late + ' late · ' + facts.summary.absent + ' absent', 'attendance', 'tone-green') +
      stat('Fees paid', App.money(facts.paid), 'Recorded receipts', 'payments', '') +
      stat('Balance', App.money(facts.balance), 'Still to be collected', 'fees', facts.balance ? 'tone-rose' : 'tone-green') +
      stat('Upcoming exams', String(facts.upcoming.length), facts.upcoming[0] ? App.esc(facts.upcoming[0].name) : 'Nothing scheduled', 'exams', 'tone-sky') +
      '</section>';
    html += '<section class="split-2"><article class="card"><h2 class="card-title">Profile</h2><div class="kv">' +
      '<span>Admission no.</span><div>' + App.esc(student.admissionNo) + '</div>' +
      '<span>Course</span><div>' + App.esc(course ? course.name : '—') + '</div>' +
      '<span>Batch</span><div>' + App.esc(batch ? batch.name : '—') + '</div>' +
      '<span>Parent</span><div>' + App.esc(student.parentName) + ' · ' + App.esc(student.parentMobile) + '</div>' +
      '<span>Contact</span><div>' + App.esc(student.mobile) + ' · ' + App.esc(student.email) + '</div>' +
      '<span>Status</span><div>' + App.badge(student.status) + '</div></div></article>';
    html += '<article class="card"><h2 class="card-title">Upcoming examinations</h2>' +
      (facts.upcoming.length ? facts.upcoming.map(function (exam) {
        return '<div class="list-row"><div><strong>' + App.esc(exam.name) + '</strong><div class="muted">' + exam.subjects.map(function (subject) { return App.esc(subject.name); }).join(', ') + '</div></div><div>' + App.esc(Storage.formatDate(exam.date)) + '</div></div>';
      }).join('') : App.empty('No upcoming examination for this batch.')) +
      '</article></section>';
    if (!full) return html;
    var recent = facts.attendance.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; }).slice(0, 8);
    html += '<section class="split-2"><article class="card"><h2 class="card-title">Recent attendance</h2>' +
      (recent.length ? '<div class="table-wrap"><table><thead><tr><th>Date</th><th>Status</th></tr></thead><tbody>' + recent.map(function (row) {
        return '<tr><td>' + App.esc(Storage.formatDate(row.date)) + '</td><td>' + App.badge(row.status.charAt(0).toUpperCase() + row.status.slice(1)) + '</td></tr>';
      }).join('') + '</tbody></table></div>' : App.empty('Attendance has not been marked yet.')) +
      '</article><article class="card"><h2 class="card-title">Fee status</h2>' +
      (facts.invoices.length ? '<div class="table-wrap"><table><thead><tr><th>Period</th><th>Status</th><th class="num">Balance</th></tr></thead><tbody>' + facts.invoices.slice().sort(function (a, b) { return a.dueDate < b.dueDate ? 1 : -1; }).slice(0, 8).map(function (invoice) {
        return '<tr><td>' + App.esc(invoice.periodLabel) + '</td><td>' + App.badge(invoice.status) + '</td><td class="num">' + App.money(invoice.balance) + '</td></tr>';
      }).join('') + '</tbody></table></div>' : App.empty('No invoices yet.')) +
      '</article></section>';
    html += '<article class="card"><h2 class="card-title">Examination results</h2>' +
      (facts.results.length ? '<div class="table-wrap"><table><thead><tr><th>Examination</th><th>Total</th><th>Percent</th><th>Grade</th><th>Result</th></tr></thead><tbody>' + facts.results.map(function (result) {
        var exam = Storage.byId(data.exams, result.examId);
        return '<tr><td>' + App.esc(exam ? exam.name : 'Examination') + '</td><td>' + result.total + '/' + result.maxTotal + '</td><td>' + result.percentage + '%</td><td>' + App.esc(result.grade) + '</td><td>' + App.badge(result.result) + '</td></tr>';
      }).join('') + '</tbody></table></div>' : App.empty('No results published yet.')) +
      '</article>';
    return html;
  }

  function paintStaff(user) {
    destroyCharts();
    var full = Storage.load();
    var data = user.role === 'teacher' ? Storage.scope(user) : full;
    var today = Storage.today();
    var activeStudents = data.students.filter(function (student) { return student.status === 'Active'; });
    var teachers = (user.role === 'teacher' ? data.teachers : full.teachers).filter(function (teacher) { return teacher.status !== 'Resigned'; });
    var batches = data.batches.filter(function (batch) { return batch.status === 'Active'; });
    var todayRows = data.attendance.filter(function (row) { return row.date === today; });
    var summary = Storage.attendanceSummary(todayRows);
    var payments = user.role === 'teacher' ? [] : full.payments;
    var views = invoiceRows(user.role === 'teacher' ? [] : full.invoices, full.payments);
    var collected = payments.reduce(function (sum, payment) { return sum + Number(payment.amount); }, 0);
    var pending = views.reduce(function (sum, invoice) { return sum + invoice.balance; }, 0);
    var overdue = views.filter(function (invoice) { return invoice.status === 'Overdue'; }).reduce(function (sum, invoice) { return sum + invoice.balance; }, 0);
    var content = document.getElementById('content');
    var html = '';
    if (user.role === 'admin') {
      html += '<section class="stat-grid">' +
        stat('Total students', String(activeStudents.length), data.students.length + ' on record', 'students', '') +
        stat('Total teachers', String(teachers.length), full.teachers.filter(function (teacher) { return teacher.status === 'On Leave'; }).length + ' on leave', 'teachers', 'tone-sky') +
        stat('Total batches', String(batches.length), 'Active batches', 'batches', '') +
        stat("Today's attendance", String(summary.present), summary.total ? (summary.late + ' late · ' + summary.absent + ' absent') : 'Not marked yet', 'attendance', 'tone-green') +
        stat('Fees collected', App.money(collected), 'All recorded payments', 'payments', 'tone-green') +
        stat('Pending fees', App.money(pending), App.money(overdue) + ' overdue', 'fees', 'tone-rose') +
        '</section>';
      html += '<div class="quick-actions"><a class="btn btn-primary" href="' + App.pageHref('students.html') + '">Students</a><a class="btn btn-secondary" href="' + App.pageHref('attendance.html') + '">Mark attendance</a><a class="btn btn-secondary" href="' + App.pageHref('payments.html') + '">Record payment</a><a class="btn btn-secondary" href="' + App.pageHref('examinations.html') + '">Examinations</a></div>';
    } else if (user.role === 'teacher') {
      html += '<section class="stat-grid">' +
        stat('My students', String(activeStudents.length), 'In assigned batches', 'students', '') +
        stat('My batches', String(batches.length), 'Active', 'batches', 'tone-sky') +
        stat('Present today', String(summary.present), summary.total ? (summary.absent + ' absent · ' + summary.late + ' late') : 'Not marked yet', 'attendance', 'tone-green') +
        stat('Upcoming exams', String(data.exams.filter(function (exam) { return exam.date >= today; }).length), 'For your batches', 'exams', 'tone-amber') +
        '</section>';
      html += '<div class="quick-actions"><a class="btn btn-primary" href="' + App.pageHref('attendance.html') + '">Mark attendance</a><a class="btn btn-secondary" href="' + App.pageHref('results.html') + '">Enter marks</a></div>';
    } else {
      html += '<section class="stat-grid">' +
        stat('Fees collected', App.money(collected), payments.length + ' receipts', 'payments', 'tone-green') +
        stat('Pending fees', App.money(pending), 'Open balance', 'fees', 'tone-amber') +
        stat('Overdue', App.money(overdue), views.filter(function (invoice) { return invoice.status === 'Overdue'; }).length + ' invoices', 'fees', 'tone-rose') +
        stat('Students', String(activeStudents.length), 'Active enrolments', 'students', '') +
        '</section>';
      html += '<div class="quick-actions"><a class="btn btn-primary" href="' + App.pageHref('payments.html') + '">Record payment</a><a class="btn btn-secondary" href="' + App.pageHref('fees.html') + '">Fee structures</a><a class="btn btn-secondary" href="' + App.pageHref('reports.html') + '">Reports</a></div>';
    }

    if (user.role !== 'teacher') {
      html += '<section class="chart-grid"><article class="card"><h2 class="card-title">Monthly revenue</h2><div class="chart-box"><canvas id="revenue-chart"></canvas></div></article>';
      html += user.role === 'accountant'
        ? '<article class="card"><h2 class="card-title">Invoice balances</h2><div class="chart-box"><canvas id="status-chart"></canvas></div></article>'
        : '<article class="card"><h2 class="card-title">Attendance, last 7 days</h2><div class="chart-box"><canvas id="attendance-chart"></canvas></div></article>';
      html += '</section>';
    } else {
      html += '<article class="card" style="margin-bottom:14px"><h2 class="card-title">Attendance, last 7 days</h2><div class="chart-box"><canvas id="attendance-chart"></canvas></div></article>';
    }

    var admissions = data.students.slice().sort(function (a, b) { return a.admissionDate < b.admissionDate ? 1 : -1; }).slice(0, 5).map(function (student) {
      return { title: App.esc(student.name), meta: App.esc(student.admissionNo) + ' · ' + App.esc(Storage.formatDate(student.admissionDate)), side: App.badge(student.status) };
    });
    var recentPays = (user.role === 'teacher' ? [] : full.payments.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; }).slice(0, 5)).map(function (payment) {
      return { title: App.esc(Storage.nameOf('students', payment.studentId, 'Student')), meta: App.esc(payment.receiptNo) + ' · ' + App.esc(payment.method), side: App.money(payment.amount) };
    });
    var upcoming = data.exams.filter(function (exam) { return exam.date >= today; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; }).slice(0, 5).map(function (exam) {
      return { title: App.esc(exam.name), meta: App.esc(Storage.nameOf('batches', exam.batchId, 'Batch')), side: App.esc(Storage.formatDate(exam.date)) };
    });
    if (user.role === 'accountant') {
      var due = views.filter(function (invoice) { return invoice.balance > 0; }).sort(function (a, b) { return a.dueDate > b.dueDate ? 1 : -1; }).slice(0, 5).map(function (invoice) {
        return { title: App.esc(Storage.nameOf('students', invoice.studentId, 'Student')), meta: App.esc(invoice.invoiceNo) + ' · due ' + App.esc(Storage.formatDate(invoice.dueDate)), side: App.badge(invoice.status) };
      });
      html += '<section class="split-3">' + list('Recent payments', recentPays, 'No payments yet.') + list('Open invoices', due, 'Nothing outstanding.') + list('Recent admissions', admissions, 'No admissions yet.') + '</section>';
    } else if (user.role === 'teacher') {
      var missed = todayRows.filter(function (row) { return row.status !== 'present'; }).map(function (row) {
        return { title: App.esc(Storage.nameOf('students', row.studentId, 'Student')), meta: App.esc(Storage.nameOf('batches', row.batchId, 'Batch')), side: App.badge(row.status.charAt(0).toUpperCase() + row.status.slice(1)) };
      });
      html += '<section class="split-3">' + list('Recent admissions', admissions, 'No students yet.') + list('Upcoming examinations', upcoming, 'Nothing scheduled.') + list('Not present today', missed, 'Everyone marked present, or attendance is still open.') + '</section>';
    } else {
      html += '<section class="split-3">' + list('Recent admissions', admissions, 'No admissions yet.') + list('Recent payments', recentPays, 'No payments yet.') + list('Upcoming examinations', upcoming, 'Nothing scheduled.') + '</section>';
    }
    content.innerHTML = html;
    if (typeof Chart === 'undefined') {
      document.querySelectorAll('.chart-box').forEach(function (box) { box.innerHTML = '<p class="muted">Chart library did not load.</p>'; });
      return;
    }
    if (user.role !== 'teacher') {
      var revenue = lastMonths(payments);
      drawBar(document.getElementById('revenue-chart'), revenue.labels, revenue.values, 'Collected');
      if (user.role === 'accountant') drawStatus(document.getElementById('status-chart'), full.invoices);
      else drawAttendance(document.getElementById('attendance-chart'), lastDays(data.attendance));
    } else {
      drawAttendance(document.getElementById('attendance-chart'), lastDays(data.attendance));
    }
  }

  function paintStudent(full) {
    destroyCharts();
    var user = Auth.currentUser();
    var student = Storage.byId(Storage.load().students, user.studentId);
    var content = document.getElementById('content');
    if (!student) {
      content.innerHTML = '<section class="card empty-card"><h2>Profile is not linked</h2><p>Ask an admin to link this login to a student record.</p></section>';
      return;
    }
    var more = full ? '' : '<div class="quick-actions"><a class="btn btn-primary" href="' + App.pageHref('student-portal.html') + '">Open full portal</a></div>';
    content.innerHTML = more + portal(student, full);
  }

  function paintParent(full) {
    destroyCharts();
    var user = Auth.currentUser();
    var students = Storage.scope(user).students;
    var content = document.getElementById('content');
    if (!students.length) {
      content.innerHTML = '<section class="card empty-card"><h2>No children linked</h2><p>Ask the institute to link your children to this login.</p></section>';
      return;
    }
    if (!childId || !students.some(function (student) { return student.id === childId; })) childId = students[0].id;
    if (!full) {
      content.innerHTML = '<div class="quick-actions"><a class="btn btn-primary" href="' + App.pageHref('parents.html') + '">Open children portal</a></div><section class="split-2">' + students.map(function (student) {
        var facts = studentFacts(student);
        return '<article class="card"><h2 class="card-title">' + App.esc(student.name) + '</h2><p class="muted">' + App.esc(Storage.nameOf('batches', student.batchId, 'No batch')) + '</p><div class="kv" style="margin-top:10px"><span>Attendance</span><div>' + facts.summary.rate + '%</div><span>Balance</span><div>' + App.money(facts.balance) + '</div><span>Results</span><div>' + facts.results.length + '</div></div></article>';
      }).join('') + '</section>';
      return;
    }
    var current = students.find(function (student) { return student.id === childId; });
    content.innerHTML = '<div class="child-switch">' + students.map(function (student) {
      return '<button type="button" class="tab" data-child="' + App.esc(student.id) + '" aria-selected="' + (student.id === childId ? 'true' : 'false') + '">' + App.esc(student.name) + '</button>';
    }).join('') + '</div>' + portal(current, true);
    content.querySelectorAll('[data-child]').forEach(function (button) {
      button.addEventListener('click', function () {
        childId = button.getAttribute('data-child');
        paintParent(true);
      });
    });
  }

  function boot(page) {
    var roles = page === 'student-portal' ? ['student'] : page === 'parents' ? ['parent'] : ['admin', 'teacher', 'accountant', 'student', 'parent'];
    var user = Auth.guard(roles);
    if (!user) return;
    var titles = {
      dashboard: ['Dashboard', App.greeting(user.name) + ' · ' + Storage.load().currentAcademicYear],
      'student-portal': ['My portal', 'Profile, attendance, fees, and results'],
      parents: ['My children', 'Attendance, fees, and results for linked students']
    };
    App.renderShell({ active: page === 'dashboard' ? 'dashboard' : page, title: titles[page][0], subtitle: titles[page][1] });
    function paint() {
      if (page === 'student-portal') paintStudent(true);
      else if (page === 'parents') paintParent(true);
      else if (user.role === 'student') paintStudent(false);
      else if (user.role === 'parent') paintParent(false);
      else paintStaff(user);
    }
    paint();
    document.addEventListener('themechange', function () {
      if (document.body.dataset.page === 'dashboard' && (user.role === 'admin' || user.role === 'teacher' || user.role === 'accountant')) paint();
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var page = document.body.dataset.page;
    if (page === 'dashboard' || page === 'student-portal' || page === 'parents') boot(page);
  });
})();
