/**
 * Front-desk enquiries. Admin only.
 */
(function () {
  var STATUSES = ['New', 'Contacted', 'Converted', 'Closed'];
  var filters = { q: '', status: '' };

  function courses() {
    return Storage.load().courses.slice().sort(function (a, b) { return a.name < b.name ? -1 : 1; });
  }

  function courseName(id) {
    return Storage.nameOf('courses', id, 'Course');
  }

  function rows() {
    var query = filters.q.trim().toLowerCase();
    return Storage.load().enquiries.filter(function (item) {
      if (filters.status && item.status !== filters.status) return false;
      if (!query) return true;
      var hay = [item.name, item.phone, item.email, item.message, courseName(item.courseId)].join(' ').toLowerCase();
      return hay.indexOf(query) !== -1;
    }).sort(function (a, b) { return a.enquiryDate < b.enquiryDate ? 1 : -1; });
  }

  function paint() {
    var list = rows();
    document.getElementById('enquiry-table').innerHTML = list.length
      ? '<div class="table-wrap"><table><thead><tr><th>Name</th><th class="hide-sm">Phone</th><th>Course</th><th>Follow-up</th><th>Status</th><th></th></tr></thead><tbody>' + list.map(function (item) {
        return '<tr><td><div class="person"><strong>' + App.esc(item.name) + '</strong><span>' + App.esc(item.email) + '</span></div></td><td class="hide-sm">' + App.esc(item.phone) + '</td><td>' + App.esc(courseName(item.courseId)) + '</td><td>' + App.esc(item.followUpDate ? Storage.formatDate(item.followUpDate) : '—') + '</td><td>' + App.badge(item.status) + '</td><td class="actions"><button type="button" class="btn btn-secondary btn-sm" data-action="view" data-id="' + App.esc(item.id) + '">View</button><button type="button" class="btn btn-secondary btn-sm" data-action="edit" data-id="' + App.esc(item.id) + '">Edit</button><button type="button" class="btn btn-danger btn-sm" data-action="delete" data-id="' + App.esc(item.id) + '">Delete</button></td></tr>';
      }).join('') + '</tbody></table></div>'
      : App.empty('No enquiries match these filters.');
  }

  function openForm(enquiry) {
    var value = enquiry || {
      name: '', phone: '', email: '', courseId: '', message: '',
      enquiryDate: Storage.today(), followUpDate: '', status: 'New'
    };
    App.openModal({
      title: enquiry ? 'Edit enquiry' : 'Add enquiry',
      html: '<form id="enquiry-form" class="stack" novalidate><div class="form-grid"><div class="field"><label for="name">Name</label><input id="name" value="' + App.esc(value.name) + '" required><div class="field-error"></div></div><div class="field"><label for="phone">Phone</label><input id="phone" inputmode="numeric" value="' + App.esc(value.phone) + '" required><div class="field-error"></div></div><div class="field"><label for="email">Email</label><input id="email" type="email" value="' + App.esc(value.email) + '" required><div class="field-error"></div></div><div class="field"><label for="course">Course of interest</label><select id="course">' + App.optionsHtml(courses(), value.courseId, function (course) { return course.id; }, function (course) { return course.name; }, 'Select a course') + '</select><div class="field-error"></div></div><div class="field"><label for="enquiry-date">Enquiry date</label><input id="enquiry-date" type="date" value="' + App.esc(value.enquiryDate) + '" required><div class="field-error"></div></div><div class="field"><label for="follow-up">Follow-up date</label><input id="follow-up" type="date" value="' + App.esc(value.followUpDate || '') + '"><div class="field-error"></div></div></div><div class="field"><label for="status">Status</label><select id="status">' + STATUSES.map(function (status) { return '<option' + (status === value.status ? ' selected' : '') + '>' + status + '</option>'; }).join('') + '</select><div class="field-error"></div></div><div class="field"><label for="message">Message</label><textarea id="message" required>' + App.esc(value.message) + '</textarea><div class="field-error"></div></div><div class="modal-actions"><button type="button" class="btn btn-ghost" id="cancel-enquiry">Cancel</button><button class="btn btn-primary" type="submit">Save enquiry</button></div></form>',
      onMount: function (root) {
        root.querySelector('#cancel-enquiry').addEventListener('click', App.closeModal);
        root.querySelector('#enquiry-form').addEventListener('submit', function (event) {
          event.preventDefault();
          var name = root.querySelector('#name');
          var phone = root.querySelector('#phone');
          var email = root.querySelector('#email');
          var course = root.querySelector('#course');
          var enquiryDate = root.querySelector('#enquiry-date');
          var followUp = root.querySelector('#follow-up');
          var message = root.querySelector('#message');
          var ok = App.requireValue(name, 'Name') && App.requireValue(phone, 'Phone') && App.requireValue(email, 'Email') && App.requireValue(course, 'Course of interest') && App.requireValue(enquiryDate, 'Enquiry date') && App.requireValue(message, 'Message');
          if (phone.value.trim() && !App.validMobile(phone.value)) { App.setFieldError(phone, 'Enter a 10-digit mobile number.'); ok = false; }
          if (email.value.trim() && !App.validEmail(email.value)) { App.setFieldError(email, 'Enter a valid email.'); ok = false; }
          if (followUp.value && enquiryDate.value && followUp.value < enquiryDate.value) { App.setFieldError(followUp, 'Follow-up date cannot be before the enquiry date.'); ok = false; }
          if (!ok) { App.toast('Check the highlighted fields.', 'error'); return; }
          var record = {
            id: enquiry ? enquiry.id : Storage.uid('enq'),
            instituteId: Storage.INSTITUTE_ID,
            name: name.value.trim(),
            phone: phone.value.replace(/\D/g, '').slice(-10),
            email: email.value.trim(),
            courseId: course.value,
            message: message.value.trim(),
            enquiryDate: enquiryDate.value,
            followUpDate: followUp.value,
            status: root.querySelector('#status').value
          };
          Storage.update(function (data) {
            var index = data.enquiries.findIndex(function (item) { return item.id === record.id; });
            if (index === -1) data.enquiries.push(record);
            else data.enquiries[index] = record;
          });
          App.closeModal();
          App.toast(enquiry ? 'Enquiry updated.' : 'Enquiry added.', 'success');
          paint();
        });
      }
    });
  }

  function openView(enquiry) {
    App.openModal({
      title: enquiry.name,
      html: '<div class="kv"><span>Phone</span><div>' + App.esc(enquiry.phone) + '</div><span>Email</span><div>' + App.esc(enquiry.email) + '</div><span>Course</span><div>' + App.esc(courseName(enquiry.courseId)) + '</div><span>Enquiry date</span><div>' + App.esc(Storage.formatDate(enquiry.enquiryDate)) + '</div><span>Follow-up</span><div>' + App.esc(enquiry.followUpDate ? Storage.formatDate(enquiry.followUpDate) : '—') + '</div><span>Status</span><div>' + App.badge(enquiry.status) + '</div></div><p style="margin-top:14px">' + App.esc(enquiry.message) + '</p><div class="modal-actions"><button type="button" class="btn btn-ghost" id="close-enquiry">Close</button><button type="button" class="btn btn-primary" id="edit-enquiry">Edit</button></div>',
      onMount: function (root) {
        root.querySelector('#close-enquiry').addEventListener('click', App.closeModal);
        root.querySelector('#edit-enquiry').addEventListener('click', function () {
          App.closeModal();
          openForm(enquiry);
        });
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (document.body.dataset.page !== 'enquiries') return;
    var user = Auth.guard(['admin']);
    if (!user) return;
    var content = App.renderShell({ active: 'enquiries', title: 'Enquiries', subtitle: 'New leads, follow-ups, and conversions' });
    content.innerHTML = '<section class="card"><div class="toolbar"><div class="filters"><input id="q" type="search" placeholder="Search name, phone, or email"><select id="f-status"><option value="">All statuses</option>' + STATUSES.map(function (status) { return '<option>' + status + '</option>'; }).join('') + '</select></div><button type="button" class="btn btn-primary" id="add-enquiry">Add enquiry</button></div><div id="enquiry-table"></div></section>';
    content.querySelector('#q').addEventListener('input', function (event) { filters.q = event.target.value; paint(); });
    content.querySelector('#f-status').addEventListener('change', function (event) { filters.status = event.target.value; paint(); });
    content.querySelector('#add-enquiry').addEventListener('click', function () { openForm(null); });
    content.addEventListener('click', function (event) {
      var button = event.target.closest('[data-action]');
      if (!button) return;
      var enquiry = Storage.byId(Storage.load().enquiries, button.getAttribute('data-id'));
      if (!enquiry) return;
      var action = button.getAttribute('data-action');
      if (action === 'view') openView(enquiry);
      if (action === 'edit') openForm(enquiry);
      if (action === 'delete') {
        App.confirmDialog({ title: 'Delete enquiry', message: 'Delete the enquiry from ' + enquiry.name + '?', confirmText: 'Delete', danger: true }).then(function (yes) {
          if (!yes) return;
          Storage.update(function (data) { data.enquiries = data.enquiries.filter(function (item) { return item.id !== enquiry.id; }); });
          App.toast('Enquiry deleted.', 'success');
          paint();
        });
      }
    });
    paint();
  });
})();
