/**
 * Phase 1 data store for the Safiya Tuition ERP demo.
 *
 * Records live in localStorage under tuitionErp.data.v1. The first visit seeds
 * sample data and later visits keep whatever the user changed.
 *
 * A later phase can replace load/save with Flask + PostgreSQL as long as the
 * record shapes stay the same. Nothing here talks to a server. Role filters are
 * only for the screen — they are not authentication or authorisation.
 */
(function () {
  var DATA_KEY = 'tuitionErp.data.v1';
  var INSTITUTE_ID = 'inst-safiya';
  var DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function parseISO(value) {
    var parts = String(value || '').split('-').map(Number);
    return new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1);
  }

  function iso(date) {
    var d = date instanceof Date ? date : parseISO(date);
    var month = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + month + '-' + day;
  }

  function today() {
    return iso(new Date());
  }

  function addDays(value, days) {
    var d = parseISO(value);
    d.setDate(d.getDate() + days);
    return iso(d);
  }

  function weekday(value) {
    return parseISO(value).getDay();
  }

  function formatDate(value) {
    if (!value) return '—';
    var d = parseISO(value);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function monthLabel(date) {
    return date.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  }

  function academicYear(date) {
    var d = date || new Date();
    var start = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
    return start + '-' + String(start + 1).slice(-2);
  }

  function uid(prefix) {
    return prefix + '-' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);
  }

  function roundMoney(value) {
    return Math.round((Number(value) || 0) * 100) / 100;
  }

  function nextSerial(items, field, prefix, start) {
    var max = start;
    (items || []).forEach(function (item) {
      var match = String(item[field] || '').match(/(\d+)$/);
      if (match) max = Math.max(max, Number(match[1]));
    });
    return prefix + String(max + 1);
  }

  function nextAdmissionNo(students) {
    var prefix = 'STA-' + String(new Date().getFullYear()).slice(2);
    var max = 0;
    (students || []).forEach(function (student) {
      if (String(student.admissionNo).indexOf(prefix) === 0) {
        var n = Number(String(student.admissionNo).slice(prefix.length));
        if (!isNaN(n)) max = Math.max(max, n);
      }
    });
    return prefix + String(max + 1).padStart(3, '0');
  }

  function scheduleLabel(batch) {
    var days = (batch.days || []).slice().sort(function (a, b) { return a - b; });
    var key = days.join(',');
    var dayText = days.map(function (d) { return DAY_NAMES[d]; }).join(', ');
    if (key === '1,2,3,4,5') dayText = 'Mon–Fri';
    if (key === '1,2,3,4,5,6') dayText = 'Mon–Sat';
    if (key === '0,6') dayText = 'Sat–Sun';
    if (key === '2,4') dayText = 'Tue, Thu';
    if (key === '3,5') dayText = 'Wed, Fri';
    if (key === '6') dayText = 'Sat';
    return dayText + ' · ' + batch.startTime + '–' + batch.endTime;
  }

  function invoiceTotal(invoice) {
    return roundMoney(Number(invoice.amount) - Number(invoice.discount || 0) + Number(invoice.lateFee || 0));
  }

  function paidToward(invoiceId, payments) {
    return roundMoney((payments || []).reduce(function (sum, payment) {
      return payment.invoiceId === invoiceId ? sum + Number(payment.amount) : sum;
    }, 0));
  }

  function invoiceView(invoice, payments, todayIso) {
    var total = invoiceTotal(invoice);
    var paid = paidToward(invoice.id, payments);
    var balance = roundMoney(Math.max(0, total - paid));
    var status = 'Pending';
    if (balance <= 0) status = 'Paid';
    else if (invoice.dueDate < (todayIso || today())) status = 'Overdue';
    else if (paid > 0) status = 'Partial';
    return { total: total, paid: paid, balance: balance, status: status };
  }

  function scoreExam(subjects, obtainedList) {
    var marks = subjects.map(function (subject, index) {
      return { subjectId: subject.id, obtained: Number(obtainedList[index]) };
    });
    var total = marks.reduce(function (sum, mark) { return sum + mark.obtained; }, 0);
    var maxTotal = subjects.reduce(function (sum, subject) { return sum + Number(subject.maxMarks); }, 0);
    var percentage = maxTotal ? Math.round((total / maxTotal) * 1000) / 10 : 0;
    var failed = subjects.some(function (subject, index) {
      return Number(obtainedList[index]) < Number(subject.passMarks);
    });
    var grade = 'F';
    var result = 'Fail';
    if (!failed) {
      result = 'Pass';
      if (percentage >= 90) grade = 'A+';
      else if (percentage >= 80) grade = 'A';
      else if (percentage >= 70) grade = 'B';
      else if (percentage >= 60) grade = 'C';
      else if (percentage >= 50) grade = 'D';
      else grade = 'E';
    }
    return { marks: marks, total: total, maxTotal: maxTotal, percentage: percentage, grade: grade, result: result };
  }

  function blank() {
    return {
      institute: {
        id: INSTITUTE_ID,
        name: 'Safiya Tuition Academy',
        tagline: 'School, college, and competitive coaching',
        address: '42 Residency Road, Bengaluru 560025',
        phone: '+91 80 4567 2100',
        email: 'hello@safiya.edu',
        website: 'www.safiya.edu',
        established: '2014'
      },
      academicYears: [],
      currentAcademicYear: '',
      users: [],
      students: [],
      teachers: [],
      courses: [],
      batches: [],
      attendance: [],
      feeStructures: [],
      invoices: [],
      payments: [],
      exams: [],
      results: []
    };
  }

  function pushResult(data, exam, studentId, scores) {
    var scored = scoreExam(exam.subjects, scores);
    data.results.push({
      id: 'res-' + exam.id + '-' + studentId,
      instituteId: INSTITUTE_ID,
      examId: exam.id,
      studentId: studentId,
      marks: scored.marks,
      total: scored.total,
      maxTotal: scored.maxTotal,
      percentage: scored.percentage,
      grade: scored.grade,
      result: scored.result
    });
  }

  function addInvoice(data, opts) {
    var invoice = {
      id: opts.id,
      instituteId: INSTITUTE_ID,
      invoiceNo: nextSerial(data.invoices, 'invoiceNo', 'INV-', 1000),
      studentId: opts.studentId,
      feeStructureId: opts.feeStructureId,
      periodLabel: opts.periodLabel,
      amount: opts.amount,
      discount: opts.discount || 0,
      lateFee: opts.lateFee || 0,
      dueDate: opts.dueDate,
      academicYear: data.currentAcademicYear,
      createdAt: opts.createdAt || opts.dueDate
    };
    data.invoices.push(invoice);
    (opts.payments || []).forEach(function (payment) {
      if (!payment.amount) return;
      data.payments.push({
        id: 'pay-' + invoice.id + '-' + (data.payments.length + 1),
        instituteId: INSTITUTE_ID,
        invoiceId: invoice.id,
        studentId: opts.studentId,
        amount: payment.amount,
        method: payment.method,
        date: payment.date,
        receiptNo: nextSerial(data.payments, 'receiptNo', 'RCP-', 5000),
        note: payment.note || '',
        receivedBy: payment.receivedBy || 'Front Desk'
      });
    });
  }

  function seed() {
    var data = blank();
    var todayIso = today();
    var year = academicYear(new Date());
    var start = Number(year.slice(0, 4));
    data.currentAcademicYear = year;
    data.academicYears = [
      (start - 1) + '-' + String(start).slice(-2),
      year,
      (start + 1) + '-' + String(start + 2).slice(-2)
    ];

    data.courses = [
      { id: 'crs-10', instituteId: INSTITUTE_ID, name: 'Class 10 Foundation', type: 'School Tuition', duration: '10 months', description: 'CBSE mathematics and science for Class 10.', status: 'Active' },
      { id: 'crs-12', instituteId: INSTITUTE_ID, name: 'Class 12 Science', type: 'School Tuition', duration: '10 months', description: 'Physics, chemistry, and mathematics for Class 12.', status: 'Active' },
      { id: 'crs-bcom', instituteId: INSTITUTE_ID, name: 'B.Com Semester Coaching', type: 'College Tuition', duration: '6 months', description: 'Accountancy and economics support for B.Com.', status: 'Active' },
      { id: 'crs-jee', instituteId: INSTITUTE_ID, name: 'JEE Main 2027', type: 'Competitive Exams', duration: '12 months', description: 'Weekend coaching for the JEE Main cycle.', status: 'Active' },
      { id: 'crs-py', instituteId: INSTITUTE_ID, name: 'Python for Beginners', type: 'Computer Courses', duration: '3 months', description: 'Hands-on Python for school and college students.', status: 'Active' },
      { id: 'crs-eng', instituteId: INSTITUTE_ID, name: 'Spoken English', type: 'Other Courses', duration: '2 months', description: 'Conversation practice for school students.', status: 'Active' },
      { id: 'crs-robot', instituteId: INSTITUTE_ID, name: 'Robotics Explorer', type: 'Other Courses', duration: '8 weeks', description: 'Introductory robotics. No batch is attached yet.', status: 'Active' }
    ];

    data.teachers = [
      { id: 'tch-priya', instituteId: INSTITUTE_ID, employeeNo: 'EMP-101', name: 'Priya Nair', gender: 'Female', mobile: '9845011122', email: 'priya.nair@safiya.edu', address: 'Indiranagar, Bengaluru', qualification: 'M.Sc. Mathematics', subjects: ['Mathematics', 'Science'], joiningDate: '2018-06-04', status: 'Active' },
      { id: 'tch-rohan', instituteId: INSTITUTE_ID, employeeNo: 'EMP-102', name: 'Rohan Deshmukh', gender: 'Male', mobile: '9845022233', email: 'rohan.deshmukh@safiya.edu', address: 'Jayanagar, Bengaluru', qualification: 'M.Sc. Physics', subjects: ['Physics', 'English'], joiningDate: '2019-04-15', status: 'Active' },
      { id: 'tch-ananya', instituteId: INSTITUTE_ID, employeeNo: 'EMP-103', name: 'Ananya Iyer', gender: 'Female', mobile: '9845033344', email: 'ananya.iyer@safiya.edu', address: 'Malleshwaram, Bengaluru', qualification: 'M.Sc. Chemistry', subjects: ['Chemistry', 'Mathematics'], joiningDate: '2020-07-01', status: 'Active' },
      { id: 'tch-kabir', instituteId: INSTITUTE_ID, employeeNo: 'EMP-104', name: 'Kabir Khan', gender: 'Male', mobile: '9845044455', email: 'kabir.khan@safiya.edu', address: 'HSR Layout, Bengaluru', qualification: 'MCA', subjects: ['Computer Science', 'Accountancy'], joiningDate: '2021-01-11', status: 'Active' },
      { id: 'tch-meera', instituteId: INSTITUTE_ID, employeeNo: 'EMP-105', name: 'Meera Joshi', gender: 'Female', mobile: '9845055566', email: 'meera.joshi@safiya.edu', address: 'Koramangala, Bengaluru', qualification: 'M.A. English', subjects: ['English'], joiningDate: '2017-05-20', status: 'On Leave' }
    ];

    data.batches = [
      { id: 'bat-c10-am', instituteId: INSTITUTE_ID, name: 'Class 10 Morning', courseId: 'crs-10', teacherId: 'tch-priya', subjects: ['Mathematics', 'Science'], days: [1, 2, 3, 4, 5], startTime: '07:00', endTime: '08:30', maxStudents: 20, room: 'A1', academicYear: year, status: 'Active' },
      { id: 'bat-c10-pm', instituteId: INSTITUTE_ID, name: 'Class 10 Evening', courseId: 'crs-10', teacherId: 'tch-rohan', subjects: ['Mathematics', 'Science'], days: [1, 2, 3, 4, 5], startTime: '17:30', endTime: '19:00', maxStudents: 20, room: 'A2', academicYear: year, status: 'Active' },
      { id: 'bat-c12', instituteId: INSTITUTE_ID, name: 'Class 12 Science', courseId: 'crs-12', teacherId: 'tch-priya', subjects: ['Physics', 'Chemistry', 'Mathematics'], days: [1, 2, 3, 4, 5, 6], startTime: '16:00', endTime: '18:00', maxStudents: 18, room: 'B1', academicYear: year, status: 'Active' },
      { id: 'bat-jee', instituteId: INSTITUTE_ID, name: 'JEE Weekend', courseId: 'crs-jee', teacherId: 'tch-ananya', subjects: ['Physics', 'Chemistry', 'Mathematics'], days: [0, 6], startTime: '09:00', endTime: '12:00', maxStudents: 30, room: 'C1', academicYear: year, status: 'Active' },
      { id: 'bat-py', instituteId: INSTITUTE_ID, name: 'Python Weekday', courseId: 'crs-py', teacherId: 'tch-kabir', subjects: ['Computer Science'], days: [2, 4], startTime: '18:00', endTime: '20:00', maxStudents: 16, room: 'Lab 1', academicYear: year, status: 'Active' },
      { id: 'bat-eng', instituteId: INSTITUTE_ID, name: 'Spoken English', courseId: 'crs-eng', teacherId: 'tch-rohan', subjects: ['English'], days: [3, 5], startTime: '18:30', endTime: '19:30', maxStudents: 12, room: 'D1', academicYear: year, status: 'Active' },
      { id: 'bat-bcom', instituteId: INSTITUTE_ID, name: 'B.Com Evening', courseId: 'crs-bcom', teacherId: 'tch-kabir', subjects: ['Accountancy', 'Economics'], days: [1, 2, 3, 4, 5], startTime: '15:00', endTime: '16:30', maxStudents: 20, room: 'B2', academicYear: year, status: 'Active' },
      { id: 'bat-doubt', instituteId: INSTITUTE_ID, name: 'Class 10 Doubt Hour', courseId: 'crs-10', teacherId: 'tch-priya', subjects: ['Mathematics'], days: [6], startTime: '11:00', endTime: '12:00', maxStudents: 8, room: 'A1', academicYear: year, status: 'Active' }
    ];

    var studentRows = [
      ['stu-aarav', 'STA-26001', 'Aarav Mehta', 'Male', '2011-04-12', '9845123001', 'aarav.mehta@email.com', '12 MG Road, Bengaluru', 'Rajesh Mehta', '9845001001', 'crs-10', 'bat-c10-am', -2, 'Active'],
      ['stu-diya', 'STA-26002', 'Diya Mehta', 'Female', '2009-08-03', '9845123002', 'diya.mehta@email.com', '12 MG Road, Bengaluru', 'Rajesh Mehta', '9845001001', 'crs-12', 'bat-c12', -40, 'Active'],
      ['stu-ishaan', 'STA-26003', 'Ishaan Patel', 'Male', '2011-01-19', '9845123003', 'ishaan.patel@email.com', '88 Church Street, Bengaluru', 'Neelam Patel', '9845001003', 'crs-10', 'bat-c10-am', -80, 'Active'],
      ['stu-sara', 'STA-26004', 'Sara Khan', 'Female', '2011-11-02', '9845123004', 'sara.khan@email.com', '5 Fraser Town, Bengaluru', 'Imran Khan', '9845001004', 'crs-10', 'bat-c10-am', -60, 'Active'],
      ['stu-vivaan', 'STA-26005', 'Vivaan Rao', 'Male', '2011-06-25', '9845123005', 'vivaan.rao@email.com', '19 Jayanagar 4th Block, Bengaluru', 'Lakshmi Rao', '9845001005', 'crs-10', 'bat-c10-pm', -50, 'Active'],
      ['stu-myra', 'STA-26006', 'Myra Singh', 'Female', '2011-09-14', '9845123006', 'myra.singh@email.com', '7 Indiranagar 100 Feet Road, Bengaluru', 'Amit Singh', '9845001006', 'crs-10', 'bat-c10-pm', -5, 'Active'],
      ['stu-arjun', 'STA-26007', 'Arjun Reddy', 'Male', '2009-02-11', '9845123007', 'arjun.reddy@email.com', '41 Whitefield, Bengaluru', 'Suma Reddy', '9845001007', 'crs-12', 'bat-c12', -100, 'Active'],
      ['stu-kiara', 'STA-26008', 'Kiara Shah', 'Female', '2008-12-09', '9845123008', 'kiara.shah@email.com', '3 Cunningham Road, Bengaluru', 'Nirav Shah', '9845001008', 'crs-jee', 'bat-jee', -120, 'Active'],
      ['stu-advait', 'STA-26009', 'Advait Joshi', 'Male', '2008-05-30', '9845123009', 'advait.joshi@email.com', '16 Basavanagudi, Bengaluru', 'Pooja Joshi', '9845001009', 'crs-jee', 'bat-jee', -90, 'Active'],
      ['stu-neha', 'STA-26010', 'Neha Gupta', 'Female', '2004-07-22', '9845123010', 'neha.gupta@email.com', '28 HSR Layout, Bengaluru', 'Rakesh Gupta', '9845001010', 'crs-py', 'bat-py', -30, 'Active'],
      ['stu-rohanv', 'STA-26011', 'Rohan Verma', 'Male', '2007-03-18', '9845123011', 'rohan.verma@email.com', '9 Koramangala 4th Block, Bengaluru', 'Seema Verma', '9845001011', 'crs-py', 'bat-py', -20, 'Active'],
      ['stu-anika', 'STA-26012', 'Anika Bose', 'Female', '2005-10-01', '9845123012', 'anika.bose@email.com', '54 Ulsoor, Bengaluru', 'Arun Bose', '9845001012', 'crs-eng', 'bat-eng', -200, 'Alumni'],
      ['stu-kabir', 'STA-26013', 'Kabir Malhotra', 'Male', '2011-08-08', '9845123013', 'kabir.malhotra@email.com', '2 Richmond Town, Bengaluru', 'Anil Malhotra', '9845001013', 'crs-10', 'bat-c10-am', -15, 'Active'],
      ['stu-sana', 'STA-26014', 'Sana Qureshi', 'Female', '2009-04-27', '9845123014', 'sana.qureshi@email.com', '11 Shivajinagar, Bengaluru', 'Farah Qureshi', '9845001014', 'crs-12', 'bat-c12', -70, 'Active'],
      ['stu-harshita', 'STA-26015', 'Harshita Jain', 'Female', '2006-01-16', '9845123015', 'harshita.jain@email.com', '6 JP Nagar, Bengaluru', 'Mohit Jain', '9845001015', 'crs-bcom', 'bat-bcom', -45, 'Active'],
      ['stu-dev', 'STA-26016', 'Dev Sharma', 'Male', '2006-09-05', '9845123016', 'dev.sharma@email.com', '33 Hebbal, Bengaluru', 'Kavita Sharma', '9845001016', 'crs-bcom', 'bat-bcom', -8, 'Active']
    ];

    data.students = studentRows.map(function (row) {
      return {
        id: row[0],
        instituteId: INSTITUTE_ID,
        admissionNo: row[1],
        name: row[2],
        gender: row[3],
        dob: row[4],
        mobile: row[5],
        email: row[6],
        address: row[7],
        parentName: row[8],
        parentMobile: row[9],
        courseId: row[10],
        batchId: row[11],
        admissionDate: addDays(todayIso, row[12]),
        academicYear: year,
        status: row[13]
      };
    });

    data.users = [
      { id: 'usr-admin', instituteId: INSTITUTE_ID, name: 'Asha Menon', username: 'admin', email: 'admin@safiya.edu', password: 'Admin@123', role: 'admin', status: 'Active', teacherId: '', studentId: '', studentIds: [] },
      { id: 'usr-teacher', instituteId: INSTITUTE_ID, name: 'Priya Nair', username: 'priya', email: 'teacher@safiya.edu', password: 'Teacher@123', role: 'teacher', status: 'Active', teacherId: 'tch-priya', studentId: '', studentIds: [] },
      { id: 'usr-accountant', instituteId: INSTITUTE_ID, name: 'Farhan Ali', username: 'accounts', email: 'accountant@safiya.edu', password: 'Account@123', role: 'accountant', status: 'Active', teacherId: '', studentId: '', studentIds: [] },
      { id: 'usr-student', instituteId: INSTITUTE_ID, name: 'Aarav Mehta', username: 'aarav', email: 'student@safiya.edu', password: 'Student@123', role: 'student', status: 'Active', teacherId: '', studentId: 'stu-aarav', studentIds: [] },
      { id: 'usr-parent', instituteId: INSTITUTE_ID, name: 'Rajesh Mehta', username: 'rajesh', email: 'parent@safiya.edu', password: 'Parent@123', role: 'parent', status: 'Active', teacherId: '', studentId: '', studentIds: ['stu-aarav', 'stu-diya'] }
    ];

    data.feeStructures = [
      { id: 'fs-c10', instituteId: INSTITUTE_ID, name: 'Class 10 Monthly Tuition', courseId: 'crs-10', type: 'monthly', amount: 2500, academicYear: year, status: 'Active' },
      { id: 'fs-c12', instituteId: INSTITUTE_ID, name: 'Class 12 Quarterly Tuition', courseId: 'crs-12', type: 'quarterly', amount: 9000, academicYear: year, status: 'Active' },
      { id: 'fs-bcom', instituteId: INSTITUTE_ID, name: 'B.Com Monthly Tuition', courseId: 'crs-bcom', type: 'monthly', amount: 3000, academicYear: year, status: 'Active' },
      { id: 'fs-jee', instituteId: INSTITUTE_ID, name: 'JEE Annual Fee', courseId: 'crs-jee', type: 'yearly', amount: 48000, academicYear: year, status: 'Active' },
      { id: 'fs-py', instituteId: INSTITUTE_ID, name: 'Python Installment', courseId: 'crs-py', type: 'installment', amount: 4000, academicYear: year, status: 'Active' },
      { id: 'fs-eng', instituteId: INSTITUTE_ID, name: 'Spoken English Monthly', courseId: 'crs-eng', type: 'monthly', amount: 1500, academicYear: year, status: 'Active' }
    ];

    var thisMonth = monthLabel(new Date());
    var feePlan = [
      ['stu-aarav', 'fs-c10', thisMonth, 2500, 0, 0, -5, [{ amount: 2500, method: 'UPI', date: addDays(todayIso, -2) }]],
      ['stu-ishaan', 'fs-c10', thisMonth, 2500, 0, 0, -5, [{ amount: 2500, method: 'Cash', date: addDays(todayIso, -1) }]],
      ['stu-sara', 'fs-c10', thisMonth, 2500, 200, 0, -5, [{ amount: 2300, method: 'Card', date: addDays(todayIso, -4) }]],
      ['stu-vivaan', 'fs-c10', thisMonth, 2500, 0, 0, -4, [{ amount: 2500, method: 'Bank Transfer', date: addDays(todayIso, -3) }]],
      ['stu-myra', 'fs-c10', thisMonth, 2500, 0, 0, 5, [{ amount: 1000, method: 'UPI', date: addDays(todayIso, -1) }]],
      ['stu-kabir', 'fs-c10', thisMonth, 2500, 0, 100, -8, []],
      ['stu-diya', 'fs-c12', 'Oct–Dec 2026', 9000, 0, 0, -6, [{ amount: 9000, method: 'UPI', date: addDays(todayIso, -6) }]],
      ['stu-arjun', 'fs-c12', 'Oct–Dec 2026', 9000, 0, 0, 9, []],
      ['stu-sana', 'fs-c12', 'Oct–Dec 2026', 9000, 500, 0, 7, [{ amount: 4000, method: 'Bank Transfer', date: addDays(todayIso, -1) }]],
      ['stu-kiara', 'fs-jee', year, 48000, 0, 0, -10, [{ amount: 48000, method: 'Bank Transfer', date: addDays(todayIso, -10) }]],
      ['stu-advait', 'fs-jee', year, 48000, 0, 0, 12, []],
      ['stu-neha', 'fs-py', 'Installment 1', 4000, 0, 0, -3, [{ amount: 4000, method: 'UPI', date: addDays(todayIso, -1) }]],
      ['stu-rohanv', 'fs-py', 'Installment 1', 4000, 0, 0, 2, [{ amount: 2000, method: 'Cash', date: addDays(todayIso, -1) }]],
      ['stu-anika', 'fs-eng', thisMonth, 1500, 0, 0, -15, []],
      ['stu-harshita', 'fs-bcom', thisMonth, 3000, 0, 0, -2, [{ amount: 3000, method: 'Cash', date: addDays(todayIso, -2) }]],
      ['stu-dev', 'fs-bcom', thisMonth, 3000, 0, 0, 6, []]
    ];

    feePlan.forEach(function (row) {
      addInvoice(data, {
        id: 'inv-' + row[0],
        studentId: row[0],
        feeStructureId: row[1],
        periodLabel: row[2],
        amount: row[3],
        discount: row[4],
        lateFee: row[5],
        dueDate: addDays(todayIso, row[6]),
        createdAt: addDays(todayIso, row[6]),
        payments: row[7]
      });
    });

    var historyStudents = [
      ['stu-aarav', 2500, 'fs-c10'],
      ['stu-ishaan', 2500, 'fs-c10'],
      ['stu-sara', 2500, 'fs-c10'],
      ['stu-vivaan', 2500, 'fs-c10'],
      ['stu-diya', 3000, 'fs-c12'],
      ['stu-harshita', 3000, 'fs-bcom']
    ];
    for (var back = 1; back <= 5; back += 1) {
      var stamp = new Date();
      stamp.setDate(1);
      stamp.setMonth(stamp.getMonth() - back);
      var label = monthLabel(stamp);
      var paidDate = iso(new Date(stamp.getFullYear(), stamp.getMonth(), 8));
      var dueDate = iso(new Date(stamp.getFullYear(), stamp.getMonth(), 5));
      historyStudents.forEach(function (row, index) {
        if (back === 3 && index > 3) return;
        var amount = row[1] + (back === 2 && index === 0 ? 1500 : 0);
        addInvoice(data, {
          id: 'inv-h' + back + '-' + row[0],
          studentId: row[0],
          feeStructureId: row[2],
          periodLabel: label,
          amount: amount,
          dueDate: dueDate,
          createdAt: dueDate,
          payments: [{ amount: amount, method: index % 2 ? 'UPI' : 'Cash', date: paidDate }]
        });
      });
    }

    data.students.forEach(function (student) {
      if (student.status !== 'Active') return;
      var batch = data.batches.find(function (item) { return item.id === student.batchId; });
      if (!batch) return;
      for (var offset = -20; offset <= 0; offset += 1) {
        var date = addDays(todayIso, offset);
        if (batch.days.indexOf(weekday(date)) === -1) continue;
        var seed = 0;
        var key = date + student.id;
        for (var i = 0; i < key.length; i += 1) seed = (seed * 31 + key.charCodeAt(i)) >>> 0;
        var bucket = seed % 10;
        var status = 'present';
        if (bucket === 0) status = 'absent';
        else if (bucket === 1) status = 'late';
        data.attendance.push({
          id: 'att-' + batch.id + '-' + student.id + '-' + date,
          instituteId: INSTITUTE_ID,
          studentId: student.id,
          batchId: batch.id,
          date: date,
          status: status,
          markedBy: 'seed',
          updatedAt: date + 'T08:00:00.000Z'
        });
      }
    });

    var examMid = {
      id: 'ex-c10',
      instituteId: INSTITUTE_ID,
      name: 'Class 10 Mid Term',
      batchId: 'bat-c10-am',
      date: addDays(todayIso, -16),
      status: 'Completed',
      subjects: [
        { id: 'sub-c10-math', name: 'Mathematics', maxMarks: 100, passMarks: 35 },
        { id: 'sub-c10-sci', name: 'Science', maxMarks: 100, passMarks: 35 }
      ]
    };
    var examWeekly = {
      id: 'ex-c12',
      instituteId: INSTITUTE_ID,
      name: 'Class 12 Weekly Test',
      batchId: 'bat-c12',
      date: addDays(todayIso, -12),
      status: 'Completed',
      subjects: [
        { id: 'sub-c12-phy', name: 'Physics', maxMarks: 50, passMarks: 18 },
        { id: 'sub-c12-chem', name: 'Chemistry', maxMarks: 50, passMarks: 18 }
      ]
    };
    var examBcom = {
      id: 'ex-bcom',
      instituteId: INSTITUTE_ID,
      name: 'B.Com Accountancy Test',
      batchId: 'bat-bcom',
      date: addDays(todayIso, -9),
      status: 'Completed',
      subjects: [
        { id: 'sub-bcom-acc', name: 'Accountancy', maxMarks: 100, passMarks: 40 }
      ]
    };
    data.exams = [
      examMid,
      examWeekly,
      examBcom,
      {
        id: 'ex-c10-next',
        instituteId: INSTITUTE_ID,
        name: 'Class 10 Revision Test',
        batchId: 'bat-c10-am',
        date: addDays(todayIso, 6),
        status: 'Scheduled',
        subjects: [
          { id: 'sub-c10n-math', name: 'Mathematics', maxMarks: 50, passMarks: 18 },
          { id: 'sub-c10n-sci', name: 'Science', maxMarks: 50, passMarks: 18 }
        ]
      },
      {
        id: 'ex-py',
        instituteId: INSTITUTE_ID,
        name: 'Python Practical',
        batchId: 'bat-py',
        date: addDays(todayIso, 4),
        status: 'Scheduled',
        subjects: [
          { id: 'sub-py', name: 'Practical', maxMarks: 50, passMarks: 20 }
        ]
      },
      {
        id: 'ex-jee',
        instituteId: INSTITUTE_ID,
        name: 'JEE Mock Test',
        batchId: 'bat-jee',
        date: addDays(todayIso, 14),
        status: 'Scheduled',
        subjects: [
          { id: 'sub-jee-phy', name: 'Physics', maxMarks: 100, passMarks: 35 },
          { id: 'sub-jee-chem', name: 'Chemistry', maxMarks: 100, passMarks: 35 },
          { id: 'sub-jee-math', name: 'Mathematics', maxMarks: 100, passMarks: 35 }
        ]
      }
    ];

    pushResult(data, examMid, 'stu-aarav', [88, 91]);
    pushResult(data, examMid, 'stu-ishaan', [76, 72]);
    pushResult(data, examMid, 'stu-sara', [64, 58]);
    pushResult(data, examMid, 'stu-kabir', [30, 28]);
    pushResult(data, examWeekly, 'stu-diya', [42, 40]);
    pushResult(data, examWeekly, 'stu-arjun', [34, 33]);
    pushResult(data, examWeekly, 'stu-sana', [24, 26]);
    pushResult(data, examBcom, 'stu-harshita', [82]);
    pushResult(data, examBcom, 'stu-dev', [55]);
    return data;
  }

  function normalize(data) {
    var base = blank();
    var merged = Object.assign(base, data || {});
    ['users', 'students', 'teachers', 'courses', 'batches', 'attendance', 'feeStructures', 'invoices', 'payments', 'exams', 'results', 'academicYears'].forEach(function (key) {
      if (!Array.isArray(merged[key])) merged[key] = [];
    });
    if (!merged.institute || !merged.institute.id) merged.institute = base.institute;
    return merged;
  }

  function load() {
    try {
      var raw = localStorage.getItem(DATA_KEY);
      if (!raw) {
        var seeded = seed();
        localStorage.setItem(DATA_KEY, JSON.stringify(seeded));
        return seeded;
      }
      return normalize(JSON.parse(raw));
    } catch (err) {
      var fresh = seed();
      localStorage.setItem(DATA_KEY, JSON.stringify(fresh));
      return fresh;
    }
  }

  function save(data) {
    localStorage.setItem(DATA_KEY, JSON.stringify(data));
  }

  function update(mutator) {
    var data = load();
    mutator(data);
    save(data);
    return data;
  }

  function byId(list, id) {
    return (list || []).find(function (item) { return item.id === id; }) || null;
  }

  function nameOf(listName, id, fallback) {
    var found = byId(load()[listName], id);
    return found ? found.name : (fallback || '—');
  }

  function scope(user) {
    var data = load();
    if (!user || user.role === 'admin' || user.role === 'accountant') return data;
    if (user.role === 'teacher') {
      var batches = data.batches.filter(function (batch) { return batch.teacherId === user.teacherId; });
      var batchIds = {};
      batches.forEach(function (batch) { batchIds[batch.id] = true; });
      var students = data.students.filter(function (student) { return batchIds[student.batchId]; });
      var studentIds = {};
      students.forEach(function (student) { studentIds[student.id] = true; });
      var courseIds = {};
      batches.forEach(function (batch) { courseIds[batch.courseId] = true; });
      return Object.assign({}, data, {
        batches: batches,
        students: students,
        courses: data.courses.filter(function (course) { return courseIds[course.id]; }),
        teachers: data.teachers.filter(function (teacher) { return teacher.id === user.teacherId; }),
        attendance: data.attendance.filter(function (row) { return batchIds[row.batchId]; }),
        exams: data.exams.filter(function (exam) { return batchIds[exam.batchId]; }),
        results: data.results.filter(function (result) { return studentIds[result.studentId]; }),
        invoices: [],
        payments: [],
        feeStructures: []
      });
    }
    var ids = {};
    if (user.role === 'student' && user.studentId) ids[user.studentId] = true;
    if (user.role === 'parent') (user.studentIds || []).forEach(function (id) { ids[id] = true; });
    var ownStudents = data.students.filter(function (student) { return ids[student.id]; });
    var ownBatches = {};
    ownStudents.forEach(function (student) { ownBatches[student.batchId] = true; });
    return Object.assign({}, data, {
      students: ownStudents,
      batches: data.batches.filter(function (batch) { return ownBatches[batch.id]; }),
      attendance: data.attendance.filter(function (row) { return ids[row.studentId]; }),
      exams: data.exams.filter(function (exam) { return ownBatches[exam.batchId]; }),
      results: data.results.filter(function (result) { return ids[result.studentId]; }),
      invoices: data.invoices.filter(function (invoice) { return ids[invoice.studentId]; }),
      payments: data.payments.filter(function (payment) { return ids[payment.studentId]; }),
      users: data.users.filter(function (account) { return account.id === user.id; })
    });
  }

  function attendanceSummary(rows) {
    var present = 0;
    var absent = 0;
    var late = 0;
    (rows || []).forEach(function (row) {
      if (row.status === 'present') present += 1;
      else if (row.status === 'late') late += 1;
      else if (row.status === 'absent') absent += 1;
    });
    var total = present + absent + late;
    return {
      present: present,
      absent: absent,
      late: late,
      total: total,
      rate: total ? Math.round(((present + late) / total) * 100) : 0
    };
  }

  function defaultPeriod(structure, yearLabel) {
    var now = new Date();
    if (!structure || structure.type === 'monthly') return monthLabel(now);
    if (structure.type === 'quarterly') {
      var names = ['Jan–Mar', 'Apr–Jun', 'Jul–Sep', 'Oct–Dec'];
      return names[Math.floor(now.getMonth() / 3)] + ' ' + now.getFullYear();
    }
    if (structure.type === 'yearly') return yearLabel || academicYear(now);
    return 'Installment 1';
  }

  window.Storage = {
    DATA_KEY: DATA_KEY,
    INSTITUTE_ID: INSTITUTE_ID,
    DAY_NAMES: DAY_NAMES,
    load: load,
    save: save,
    update: update,
    today: today,
    iso: iso,
    addDays: addDays,
    weekday: weekday,
    formatDate: formatDate,
    monthLabel: monthLabel,
    academicYear: academicYear,
    uid: uid,
    roundMoney: roundMoney,
    nextSerial: nextSerial,
    nextAdmissionNo: nextAdmissionNo,
    scheduleLabel: scheduleLabel,
    invoiceTotal: invoiceTotal,
    invoiceView: invoiceView,
    scoreExam: scoreExam,
    byId: byId,
    nameOf: nameOf,
    scope: scope,
    attendanceSummary: attendanceSummary,
    defaultPeriod: defaultPeriod
  };
})();
