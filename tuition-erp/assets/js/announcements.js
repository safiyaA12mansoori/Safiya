/**
 * Announcements for the institute.
 * Admin creates them. Other roles see the ones meant for them.
 */
(function () {
  var AUDIENCES = ['All', 'Teachers', 'Students', 'Parents'];
  var audienceFilter = '';

  function canWrite(user) { return user && user.role === 'admin'; }

  function rows(user) {
    var list = canWrite(user) ? Storage.load().announcements.slice() : Storage.announcementsFor(user);
    if (canWrite(user) && audienceFilter) list = list.filter(function (item) { return item.audience === audienceFilter; });
    return list.sort(function (a, b) {
      if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
      return a.date < b.date ? 1 : -1;
    });
  }

  function paint(user) {
    var list = rows(user);
    var write = canWrite(user);
    document.getElementById('announcement-list').innerHTML = list.length
      ? '<div class="table-wrap"><table><thead><tr><th>Title</th><th class="hide-sm">Date</th><th>Audience</th><th>Pin</th>' + (write ? '<th></th>' : '') + '</tr></thead><tbody>' + list.map(function (item) {
        return '<tr><td><div class="person"><strong>' + App.esc(item.title) + '</strong><span>' + App.esc(item.message) + '</span></div></td><td class="hide-sm">' + App.esc(Storage.formatDate(item.date)) + '</td><td>' + App.esc(item.audience) + '</td><td>' + (item.pinned ? App.badge('Pinned') : '—') + '</td>' + (write ? '<td class="actions"><button type="button" class="btn btn-secondary btn-sm" data-action="edit" data-id="' + App.esc(item.id) + '">Edit</button><button type="button" class="btn btn-danger btn-sm" data-action="delete" data-id="' + App.esc(item.id) + '">Delete</button></td>' : '') + '</tr>';
      }).join('') + '</tbody></table></div>'
      : App.empty('No announcements for you yet.');
  }

  function openForm(item) {
    var value = item || { title: '', message: '', date: Storage.today(), audience: 'All', pinned: false };
    App.openModal({
      title: item ? 'Edit announcement' : 'New announcement',
      html: '<form id="announcement-form" class="stack" novalidate><div class="field"><label for="title">Title</label><input id="title" value="' + App.esc(value.title) + '" required><div class="field-error"></div></div><div class="field"><label for="message">Message</label><textarea id="message" required>' + App.esc(value.message) + '</textarea><div class="field-error"></div></div><div class="form-grid"><div class="field"><label for="date">Date</label><input id="date" type="date" value="' + App.esc(value.date) + '" required><div class="field-error"></div></div><div class="field"><label for="audience">Audience</label><select id="audience">' + AUDIENCES.map(function (audience) { return '<option' + (audience === value.audience ? ' selected' : '') + '>' + audience + '</option>'; }).join('') + '</select><div class="field-error"></div></div></div><div class="check-grid"><label><input id="pinned" type="checkbox"' + (value.pinned ? ' checked' : '') + '> Pin this announcement</label></div><div class="modal-actions"><button type="button" class="btn btn-ghost" id="cancel-announcement">Cancel</button><button class="btn btn-primary" type="submit">Save announcement</button></div></form>',
      onMount: function (root) {
        root.querySelector('#cancel-announcement').addEventListener('click', App.closeModal);
        root.querySelector('#announcement-form').addEventListener('submit', function (event) {
          event.preventDefault();
          var title = root.querySelector('#title');
          var message = root.querySelector('#message');
          var date = root.querySelector('#date');
          var ok = App.requireValue(title, 'Title') && App.requireValue(message, 'Message') && App.requireValue(date, 'Date');
          if (!ok) { App.toast('Check the highlighted fields.', 'error'); return; }
          var record = {
            id: item ? item.id : Storage.uid('ann'),
            instituteId: Storage.INSTITUTE_ID,
            title: title.value.trim(),
            message: message.value.trim(),
            date: date.value,
            audience: root.querySelector('#audience').value,
            pinned: root.querySelector('#pinned').checked
          };
          Storage.update(function (data) {
            var index = data.announcements.findIndex(function (entry) { return entry.id === record.id; });
            if (index === -1) data.announcements.push(record);
            else data.announcements[index] = record;
          });
          App.closeModal();
          App.toast(item ? 'Announcement updated.' : 'Announcement published.', 'success');
          paint(Auth.currentUser());
        });
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (document.body.dataset.page !== 'announcements') return;
    var user = Auth.guard(['admin', 'teacher', 'accountant', 'student', 'parent']);
    if (!user) return;
    var write = canWrite(user);
    var content = App.renderShell({
      active: 'announcements',
      title: 'Announcements',
      subtitle: write ? 'Publish a note for staff, students, or parents' : 'Notes shared with you'
    });
    content.innerHTML = '<section class="card"><div class="toolbar"><div class="filters">' + (write ? '<select id="f-audience"><option value="">All audiences</option>' + AUDIENCES.map(function (audience) { return '<option>' + audience + '</option>'; }).join('') + '</select>' : '<span class="muted">Showing announcements for your role</span>') + '</div>' + (write ? '<button type="button" class="btn btn-primary" id="add-announcement">New announcement</button>' : '') + '</div><div id="announcement-list"></div></section>';
    var filter = content.querySelector('#f-audience');
    if (filter) filter.addEventListener('change', function (event) { audienceFilter = event.target.value; paint(user); });
    var add = content.querySelector('#add-announcement');
    if (add) add.addEventListener('click', function () { openForm(null); });
    content.addEventListener('click', function (event) {
      if (!write) return;
      var button = event.target.closest('[data-action]');
      if (!button) return;
      var item = Storage.byId(Storage.load().announcements, button.getAttribute('data-id'));
      if (!item) return;
      if (button.getAttribute('data-action') === 'edit') openForm(item);
      if (button.getAttribute('data-action') === 'delete') {
        App.confirmDialog({ title: 'Delete announcement', message: 'Delete “' + item.title + '”?', confirmText: 'Delete', danger: true }).then(function (yes) {
          if (!yes) return;
          Storage.update(function (data) { data.announcements = data.announcements.filter(function (entry) { return entry.id !== item.id; }); });
          App.toast('Announcement deleted.', 'success');
          paint(user);
        });
      }
    });
    paint(user);
  });
})();
