/**
 * Institute profile, academic year, users, appearance, and logout.
 * Other configuration stays out of this phase.
 */
(function () {
  var section = 'profile';
  var user = null;

  function render() {
    var isAdmin = user.role === 'admin';
    var sections = [
      { id: 'profile', label: 'Institute profile' },
      { id: 'year', label: 'Academic year' }
    ];
    if (isAdmin) sections.push({ id: 'users', label: 'User management' });
    sections.push({ id: 'appearance', label: 'Dark / light mode' }, { id: 'logout', label: 'Logout' });
    if (!sections.some(function (item) { return item.id === section; })) section = 'profile';
    var content = document.getElementById('content');
    content.innerHTML = '<div class="settings-grid"><nav class="card settings-nav">' + sections.map(function (item) {
      return '<button type="button" class="btn ' + (item.id === section ? 'btn-primary' : 'btn-ghost') + '" data-section="' + item.id + '">' + item.label + '</button>';
    }).join('') + '</nav><div id="settings-panel"></div></div>';
    content.querySelectorAll('[data-section]').forEach(function (button) {
      button.addEventListener('click', function () { section = button.getAttribute('data-section'); render(); });
    });
    var panel = document.getElementById('settings-panel');
    if (section === 'profile') panel.innerHTML = profilePanel(isAdmin);
    if (section === 'year') panel.innerHTML = yearPanel(isAdmin);
    if (section === 'users') panel.innerHTML = usersPanel();
    if (section === 'appearance') panel.innerHTML = appearancePanel();
    if (section === 'logout') panel.innerHTML = '<section class="card"><h2 class="card-title">Log out</h2><p class="muted">You will return to the login page. Records stay in this browser.</p><div class="modal-actions"><button type="button" class="btn btn-danger" id="do-logout">Log out</button></div></section>';
    bind(panel, isAdmin);
  }

  function profilePanel(isAdmin) {
    var institute = Storage.load().institute;
    var disabled = isAdmin ? '' : ' disabled';
    return '<section class="card"><h2 class="card-title">Institute profile</h2><form id="profile-form" class="form-grid" style="margin-top:12px"><div class="field"><label for="name">Name</label><input id="name" value="' + App.esc(institute.name) + '"' + disabled + '><div class="field-error"></div></div><div class="field"><label for="tagline">Tagline</label><input id="tagline" value="' + App.esc(institute.tagline || '') + '"' + disabled + '><div class="field-error"></div></div><div class="field span-2"><label for="address">Address</label><input id="address" value="' + App.esc(institute.address) + '"' + disabled + '><div class="field-error"></div></div><div class="field"><label for="phone">Phone</label><input id="phone" value="' + App.esc(institute.phone) + '"' + disabled + '><div class="field-error"></div></div><div class="field"><label for="email">Email</label><input id="email" type="email" value="' + App.esc(institute.email) + '"' + disabled + '><div class="field-error"></div></div><div class="field"><label for="website">Website</label><input id="website" value="' + App.esc(institute.website || '') + '"' + disabled + '><div class="field-error"></div></div><div class="field"><label for="established">Established</label><input id="established" value="' + App.esc(institute.established || '') + '"' + disabled + '><div class="field-error"></div></div>' +
      (isAdmin ? '<div class="span-2 modal-actions"><button class="btn btn-primary" type="submit">Save profile</button></div>' : '<p class="span-2 muted">Only an admin can edit the institute profile.</p>') + '</form></section>';
  }

  function yearPanel(isAdmin) {
    var data = Storage.load();
    return '<section class="card"><h2 class="card-title">Academic year</h2><p class="muted">Current year is used as the default on new students and batches.</p><form id="year-form" class="stack" style="margin-top:12px"><div class="field"><label for="current-year">Current academic year</label><select id="current-year"' + (isAdmin ? '' : ' disabled') + '>' + data.academicYears.map(function (year) { return '<option' + (year === data.currentAcademicYear ? ' selected' : '') + '>' + App.esc(year) + '</option>'; }).join('') + '</select><div class="field-error"></div></div>' +
      (isAdmin ? '<div class="field"><label for="new-year">Add a year</label><input id="new-year" placeholder="2027-28"><div class="field-error"></div><p class="help">Use YYYY-YY, for example 2027-28.</p></div><div class="modal-actions"><button class="btn btn-secondary" type="button" id="add-year">Add year</button><button class="btn btn-primary" type="submit">Save current year</button></div>' : '<p class="muted">Only an admin can change the academic year.</p>') + '</form></section>';
  }

  function usersPanel() {
    var users = Storage.load().users.slice().sort(function (a, b) { return a.name < b.name ? -1 : 1; });
    return '<section class="card"><div class="toolbar"><div><h2 class="card-title">User management</h2><p class="muted">Passwords are stored in this browser only. This is not real authentication.</p></div><button type="button" class="btn btn-primary" id="add-user">Add user</button></div><div class="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th></th></tr></thead><tbody>' + users.map(function (account) {
      return '<tr><td><div class="person"><strong>' + App.esc(account.name) + '</strong><span>' + App.esc(account.username) + '</span></div></td><td>' + App.esc(account.email) + '</td><td>' + App.esc(Auth.ROLE_LABELS[account.role] || account.role) + '</td><td>' + App.badge(account.status) + '</td><td class="actions"><button type="button" class="btn btn-secondary btn-sm" data-edit-user="' + App.esc(account.id) + '">Edit</button><button type="button" class="btn btn-danger btn-sm" data-delete-user="' + App.esc(account.id) + '">Delete</button></td></tr>';
    }).join('') + '</tbody></table></div></section>';
  }

  function appearancePanel() {
    var dark = App.theme() === 'dark';
    return '<section class="card"><h2 class="card-title">Appearance</h2><p class="muted">The choice is saved in this browser.</p><div class="row" style="margin-top:12px"><button type="button" class="btn ' + (dark ? 'btn-ghost' : 'btn-primary') + '" id="theme-light">Light</button><button type="button" class="btn ' + (dark ? 'btn-primary' : 'btn-ghost') + '" id="theme-dark">Dark</button></div></section>';
  }

  function bind(panel, isAdmin) {
    var profile = panel.querySelector('#profile-form');
    if (profile && isAdmin) profile.addEventListener('submit', function (event) {
      event.preventDefault();
      var ok = App.requireValue(panel.querySelector('#name'), 'Name') & App.requireValue(panel.querySelector('#address'), 'Address') & App.requireValue(panel.querySelector('#phone'), 'Phone');
      var email = panel.querySelector('#email');
      if (!App.validEmail(email.value)) { App.setFieldError(email, 'Enter a valid email.'); ok = false; } else App.setFieldError(email, '');
      if (!ok) { App.toast('Check the highlighted fields.', 'error'); return; }
      Storage.update(function (data) {
        data.institute.name = panel.querySelector('#name').value.trim();
        data.institute.tagline = panel.querySelector('#tagline').value.trim();
        data.institute.address = panel.querySelector('#address').value.trim();
        data.institute.phone = panel.querySelector('#phone').value.trim();
        data.institute.email = email.value.trim();
        data.institute.website = panel.querySelector('#website').value.trim();
        data.institute.established = panel.querySelector('#established').value.trim();
      });
      document.querySelector('.brand-name').textContent = Storage.load().institute.name;
      App.toast('Institute profile saved.', 'success');
    });
    var yearForm = panel.querySelector('#year-form');
    if (yearForm && isAdmin) {
      yearForm.addEventListener('submit', function (event) {
        event.preventDefault();
        var year = panel.querySelector('#current-year').value;
        Storage.update(function (data) { data.currentAcademicYear = year; });
        document.getElementById('sidebar-year').textContent = year;
        App.toast('Academic year set to ' + year + '.', 'success');
      });
      panel.querySelector('#add-year').addEventListener('click', function () {
        var input = panel.querySelector('#new-year');
        var value = input.value.trim();
        var match = value.match(/^(\d{4})-(\d{2})$/);
        if (!match || Number(match[2]) !== (Number(match[1]) + 1) % 100) {
          App.setFieldError(input, 'Use a year like 2027-28.');
          return;
        }
        App.setFieldError(input, '');
        if (Storage.load().academicYears.indexOf(value) !== -1) { App.toast('That year is already in the list.', 'error'); return; }
        Storage.update(function (data) { data.academicYears.push(value); data.academicYears.sort(); });
        App.toast('Academic year added.', 'success');
        render();
      });
    }
    var addUser = panel.querySelector('#add-user');
    if (addUser) addUser.addEventListener('click', function () { userForm(null); });
    panel.querySelectorAll('[data-edit-user]').forEach(function (button) {
      button.addEventListener('click', function () { userForm(Storage.byId(Storage.load().users, button.getAttribute('data-edit-user'))); });
    });
    panel.querySelectorAll('[data-delete-user]').forEach(function (button) {
      button.addEventListener('click', function () { deleteUser(button.getAttribute('data-delete-user')); });
    });
    var light = panel.querySelector('#theme-light');
    if (light) {
      light.addEventListener('click', function () { App.setTheme('light'); render(); });
      panel.querySelector('#theme-dark').addEventListener('click', function () { App.setTheme('dark'); render(); });
    }
    var logout = panel.querySelector('#do-logout');
    if (logout) logout.addEventListener('click', function () { Auth.logout(); });
  }

  function linkFields(account) {
    var data = Storage.load();
    var role = account ? account.role : 'teacher';
    var teacher = '<div class="field" data-link="teacher"><label for="teacherId">Linked teacher</label><select id="teacherId">' + App.optionsHtml(data.teachers, account ? account.teacherId : '', function (item) { return item.id; }, function (item) { return item.name; }, 'Select a teacher') + '</select><div class="field-error"></div></div>';
    var student = '<div class="field" data-link="student"><label for="studentId">Linked student</label><select id="studentId">' + App.optionsHtml(data.students, account ? account.studentId : '', function (item) { return item.id; }, function (item) { return item.name; }, 'Select a student') + '</select><div class="field-error"></div></div>';
    var parent = '<div class="field" data-link="parent"><span class="section-label">Linked children</span><div class="check-grid">' + data.students.map(function (item) {
      var checked = account && (account.studentIds || []).indexOf(item.id) !== -1;
      return '<label><input type="checkbox" name="child" value="' + App.esc(item.id) + '"' + (checked ? ' checked' : '') + '> ' + App.esc(item.name) + '</label>';
    }).join('') + '</div><div class="field-error" id="child-error"></div></div>';
    return teacher + student + parent;
  }

  function userForm(account) {
    App.openModal({
      title: account ? 'Edit user' : 'Add user',
      wide: true,
      html: '<form id="user-form" class="form-grid"><div class="field"><label for="name">Name</label><input id="name" value="' + App.esc(account ? account.name : '') + '" required><div class="field-error"></div></div><div class="field"><label for="username">Username</label><input id="username" value="' + App.esc(account ? account.username : '') + '" required><div class="field-error"></div></div><div class="field"><label for="email">Email</label><input id="email" type="email" value="' + App.esc(account ? account.email : '') + '" required><div class="field-error"></div></div><div class="field"><label for="password">Password</label><input id="password" type="text" value="" placeholder="' + (account ? 'Leave blank to keep the current password' : 'At least 6 characters') + '"><div class="field-error"></div></div><div class="field"><label for="role">Role</label><select id="role">' + ['admin', 'teacher', 'accountant', 'student', 'parent'].map(function (role) { return '<option value="' + role + '"' + (account && account.role === role ? ' selected' : '') + '>' + Auth.ROLE_LABELS[role] + '</option>'; }).join('') + '</select><div class="field-error"></div></div><div class="field"><label for="status">Status</label><select id="status"><option' + (!account || account.status === 'Active' ? ' selected' : '') + '>Active</option><option' + (account && account.status === 'Inactive' ? ' selected' : '') + '>Inactive</option></select><div class="field-error"></div></div><div class="span-2" id="links">' + linkFields(account) + '</div><div class="span-2 modal-actions"><button type="button" class="btn btn-ghost" id="cancel-user">Cancel</button><button class="btn btn-primary" type="submit">Save user</button></div></form>',
      onMount: function (root) {
        function syncLinks() {
          var role = root.querySelector('#role').value;
          root.querySelectorAll('[data-link]').forEach(function (block) {
            block.hidden = block.getAttribute('data-link') !== role || role === 'admin' || role === 'accountant';
          });
        }
        root.querySelector('#role').addEventListener('change', syncLinks);
        syncLinks();
        root.querySelector('#cancel-user').addEventListener('click', App.closeModal);
        root.querySelector('#user-form').addEventListener('submit', function (event) {
          event.preventDefault();
          var ok = true;
          ['name', 'username', 'email'].forEach(function (id) {
            if (!App.requireValue(root.querySelector('#' + id), root.querySelector('label[for="' + id + '"]').textContent)) ok = false;
          });
          var email = root.querySelector('#email');
          if (email.value && !App.validEmail(email.value)) { App.setFieldError(email, 'Enter a valid email.'); ok = false; }
          var password = root.querySelector('#password').value;
          if (!account && password.length < 6) { App.setFieldError(root.querySelector('#password'), 'Use at least 6 characters.'); ok = false; }
          if (account && password && password.length < 6) { App.setFieldError(root.querySelector('#password'), 'Use at least 6 characters.'); ok = false; }
          var role = root.querySelector('#role').value;
          var teacherId = root.querySelector('#teacherId').value;
          var studentId = root.querySelector('#studentId').value;
          var childIds = Array.prototype.map.call(root.querySelectorAll('input[name="child"]:checked'), function (box) { return box.value; });
          if (role === 'teacher' && !teacherId) { App.setFieldError(root.querySelector('#teacherId'), 'Link a teacher record.'); ok = false; }
          if (role === 'student' && !studentId) { App.setFieldError(root.querySelector('#studentId'), 'Link a student record.'); ok = false; }
          if (role === 'parent' && !childIds.length) { root.querySelector('#child-error').textContent = 'Link at least one child.'; ok = false; }
          else if (root.querySelector('#child-error')) root.querySelector('#child-error').textContent = '';
          var username = root.querySelector('#username').value.trim().toLowerCase();
          Storage.load().users.forEach(function (other) {
            if (account && other.id === account.id) return;
            if (other.username.toLowerCase() === username) { App.setFieldError(root.querySelector('#username'), 'Username is already used.'); ok = false; }
            if (other.email.toLowerCase() === email.value.trim().toLowerCase()) { App.setFieldError(email, 'Email is already used.'); ok = false; }
          });
          var activeAdmins = Storage.load().users.filter(function (other) {
            return other.role === 'admin' && other.status === 'Active' && (!account || other.id !== account.id);
          }).length;
          var nextStatus = root.querySelector('#status').value;
          if (account && account.role === 'admin' && account.status === 'Active' && (role !== 'admin' || nextStatus !== 'Active') && activeAdmins === 0) {
            App.toast('Keep at least one active admin.', 'error');
            return;
          }
          if (!ok) { App.toast('Check the highlighted fields.', 'error'); return; }
          var record = {
            id: account ? account.id : Storage.uid('usr'),
            instituteId: Storage.INSTITUTE_ID,
            name: root.querySelector('#name').value.trim(),
            username: root.querySelector('#username').value.trim(),
            email: email.value.trim(),
            password: password || (account ? account.password : ''),
            role: role,
            status: nextStatus,
            teacherId: role === 'teacher' ? teacherId : '',
            studentId: role === 'student' ? studentId : '',
            studentIds: role === 'parent' ? childIds : []
          };
          Storage.update(function (data) {
            var index = data.users.findIndex(function (item) { return item.id === record.id; });
            if (index === -1) data.users.push(record);
            else data.users[index] = record;
          });
          App.closeModal();
          App.toast('User saved.', 'success');
          render();
        });
      }
    });
  }

  function deleteUser(id) {
    var account = Storage.byId(Storage.load().users, id);
    if (!account) return;
    if (account.id === user.id) { App.toast('You cannot delete the account you are using.', 'error'); return; }
    var admins = Storage.load().users.filter(function (item) { return item.role === 'admin' && item.status === 'Active' && item.id !== id; });
    if (account.role === 'admin' && account.status === 'Active' && !admins.length) { App.toast('Keep at least one active admin.', 'error'); return; }
    App.confirmDialog({ title: 'Delete user', message: 'Delete the login for ' + account.name + '?', confirmText: 'Delete', danger: true }).then(function (yes) {
      if (!yes) return;
      Storage.update(function (data) { data.users = data.users.filter(function (item) { return item.id !== id; }); });
      App.toast('User deleted.', 'success');
      render();
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (document.body.dataset.page !== 'settings') return;
    user = Auth.guard(['admin', 'teacher', 'accountant', 'student', 'parent']);
    if (!user) return;
    App.renderShell({ active: 'settings', title: 'Settings', subtitle: 'Institute, academic year, users, and appearance' });
    render();
  });
})();
