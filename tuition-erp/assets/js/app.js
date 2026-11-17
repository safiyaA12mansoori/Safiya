/**
 * Shared layout, dialogs, and small helpers. Pages render their own content
 * into #content so the sidebar and header exist in one place.
 */
(function () {
  var THEME_KEY = 'tuitionErp.theme';
  var shellBuilt = false;
  var onDismiss = null;
  var keyHandler = null;

  var NAV = [
    { id: 'dashboard', label: 'Dashboard', page: 'index.html', icon: 'home', roles: ['admin', 'teacher', 'accountant', 'student', 'parent'] },
    { id: 'students', label: 'Students', page: 'students.html', icon: 'students', roles: ['admin', 'teacher', 'accountant'] },
    { id: 'teachers', label: 'Teachers', page: 'teachers.html', icon: 'teachers', roles: ['admin'] },
    { id: 'courses', label: 'Courses', page: 'courses.html', icon: 'courses', roles: ['admin', 'teacher'] },
    { id: 'batches', label: 'Batches', page: 'batches.html', icon: 'batches', roles: ['admin', 'teacher'] },
    { id: 'attendance', label: 'Attendance', page: 'attendance.html', icon: 'attendance', roles: ['admin', 'teacher'] },
    { id: 'fees', label: 'Fees', page: 'fees.html', icon: 'fees', roles: ['admin', 'accountant'] },
    { id: 'payments', label: 'Payments', page: 'payments.html', icon: 'payments', roles: ['admin', 'accountant'] },
    { id: 'examinations', label: 'Examinations', page: 'examinations.html', icon: 'exams', roles: ['admin', 'teacher'] },
    { id: 'results', label: 'Results', page: 'results.html', icon: 'results', roles: ['admin', 'teacher'] },
    { id: 'reports', label: 'Reports', page: 'reports.html', icon: 'reports', roles: ['admin', 'teacher', 'accountant'] },
    { id: 'student-portal', label: 'My Portal', page: 'student-portal.html', icon: 'portal', roles: ['student'] },
    { id: 'parents', label: 'My Children', page: 'parents.html', icon: 'portal', roles: ['parent'] },
    { id: 'settings', label: 'Settings', page: 'settings.html', icon: 'settings', roles: ['admin', 'teacher', 'accountant', 'student', 'parent'] }
  ];

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function inPages() {
    return /\/pages\//.test(location.pathname);
  }

  function pageHref(page) {
    var root = page === 'index.html' || page === 'login.html';
    if (root) return (inPages() ? '../' : '') + page;
    return (inPages() ? '' : 'pages/') + page;
  }

  function asset(path) {
    return (inPages() ? '../' : '') + path;
  }

  function money(value) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(Number(value) || 0);
  }

  function badge(text) {
    var key = String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return '<span class="badge badge-' + esc(key) + '">' + esc(text) + '</span>';
  }

  function icon(name) {
    var paths = {
      home: '<path d="M4 11.5 12 4l8 7.5"/><path d="M6 10.5V20h12v-9.5"/>',
      students: '<path d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/><path d="M16.5 10a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/><path d="M3 19c.6-2.4 2.5-4 5-4s4.4 1.6 5 4"/><path d="M14 15.2c1.5-.4 3-.1 4 .8.7.7 1.2 1.6 1.5 2.5"/>',
      teachers: '<path d="M12 4 3 8l9 4 9-4-9-4Z"/><path d="M7 10.5V16c1.6 1.4 3.3 2 5 2s3.4-.6 5-2v-5.5"/>',
      courses: '<path d="M5 5h10a2 2 0 0 1 2 2v12H7a2 2 0 0 0-2 2V5Z"/><path d="M17 8h2a2 2 0 0 1 2 2v9a2 2 0 0 0-2-2h-2"/>',
      batches: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/>',
      attendance: '<path d="M8 12.5 10.5 15 16 9"/><circle cx="12" cy="12" r="8"/>',
      fees: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18"/>',
      payments: '<circle cx="12" cy="12" r="8"/><path d="M12 8v8M9.5 9.5c.6-.8 1.8-1.2 3-1 .9.2 2 .8 2 2s-1.1 1.8-2.5 2-2.5.8-2.5 2 1.1 1.8 2.5 2c1.2.2 2.4-.2 3-1"/>',
      exams: '<path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
      results: '<path d="M5 19V5M5 19h14"/><path d="M8 15l3-4 2.5 2.5L18 8"/>',
      reports: '<path d="M5 20V4h10l4 4v12H5Z"/><path d="M15 4v4h4M8 12h8M8 16h6"/>',
      portal: '<circle cx="12" cy="8" r="3"/><path d="M5 19c1-3 3.2-4.5 7-4.5S18 16 19 19"/>',
      settings: '<circle cx="12" cy="12" r="3"/><path d="M12 3.5v2.2M12 18.3v2.2M4.9 6.4l1.6 1.6M17.5 16l1.6 1.6M3.5 12h2.2M18.3 12h2.2M4.9 17.6 6.5 16M17.5 8l1.6-1.6"/>',
      moon: '<path d="M16 14.5A6.5 6.5 0 0 1 9.5 8 6.5 6.5 0 1 0 16 14.5Z"/>',
      sun: '<circle cx="12" cy="12" r="3.5"/><path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6 18 18M18 6l-1.4 1.4M7.4 16.6 6 18"/>',
      menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
      logout: '<path d="M10 7V5H5v14h5v-2"/><path d="M10 12h9M16 9l3 3-3 3"/>',
      close: '<path d="M6 6l12 12M18 6 6 18"/>'
    };
    return '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (paths[name] || '') + '</svg>';
  }

  function theme() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function setTheme(next) {
    if (next === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
    try { localStorage.setItem(THEME_KEY, next); } catch (err) { /* ignore */ }
    var button = document.getElementById('theme-toggle');
    if (button) {
      var dark = next === 'dark';
      button.innerHTML = icon(dark ? 'sun' : 'moon');
      button.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
    }
    document.dispatchEvent(new CustomEvent('themechange', { detail: next }));
  }

  function ensureToast() {
    var root = document.getElementById('toast-root');
    if (root) return root;
    root = document.createElement('div');
    root.id = 'toast-root';
    root.className = 'toast-wrap';
    root.setAttribute('aria-live', 'polite');
    document.body.appendChild(root);
    return root;
  }

  function toast(message, type) {
    var root = ensureToast();
    var item = document.createElement('div');
    item.className = 'toast toast-' + (type || 'success');
    item.textContent = message;
    root.appendChild(item);
    setTimeout(function () {
      item.classList.add('out');
      setTimeout(function () { item.remove(); }, 180);
    }, 3200);
  }

  function closeModal() {
    var back = document.getElementById('modal-back');
    if (back) back.remove();
    document.body.classList.remove('modal-open');
    if (keyHandler) {
      document.removeEventListener('keydown', keyHandler);
      keyHandler = null;
    }
    onDismiss = null;
  }

  function openModal(options) {
    closeModal();
    onDismiss = options.onDismiss || null;
    var back = document.createElement('div');
    back.id = 'modal-back';
    back.className = 'modal-back';
    back.innerHTML =
      '<div class="modal' + (options.wide ? ' modal-wide' : '') + '" role="dialog" aria-modal="true" aria-labelledby="modal-title">' +
        '<header class="modal-head"><h2 id="modal-title">' + esc(options.title || '') + '</h2>' +
        '<button type="button" class="icon-btn" data-close aria-label="Close">' + icon('close') + '</button></header>' +
        '<div class="modal-body">' + (options.html || '') + '</div>' +
      '</div>';
    document.body.appendChild(back);
    document.body.classList.add('modal-open');
    function dismiss() {
      var callback = onDismiss;
      closeModal();
      if (callback) callback();
    }
    back.querySelector('[data-close]').addEventListener('click', dismiss);
    back.addEventListener('click', function (event) {
      if (event.target === back) dismiss();
    });
    keyHandler = function (event) {
      if (event.key === 'Escape') dismiss();
    };
    document.addEventListener('keydown', keyHandler);
    if (options.onMount) options.onMount(back);
    return back;
  }

  function confirmDialog(options) {
    return new Promise(function (resolve) {
      var settled = false;
      function finish(value) {
        if (settled) return;
        settled = true;
        closeModal();
        resolve(value);
      }
      var root = openModal({
        title: options.title || 'Please confirm',
        html:
          '<p class="confirm-copy">' + esc(options.message || '') + '</p>' +
          '<div class="modal-actions">' +
            '<button type="button" class="btn btn-ghost" id="confirm-no">' + esc(options.cancelText || 'Cancel') + '</button>' +
            '<button type="button" class="btn ' + (options.danger ? 'btn-danger' : 'btn-primary') + '" id="confirm-yes">' + esc(options.confirmText || 'Confirm') + '</button>' +
          '</div>',
        onDismiss: function () { finish(false); },
        onMount: function (modal) {
          modal.querySelector('#confirm-no').addEventListener('click', function () { finish(false); });
          modal.querySelector('#confirm-yes').addEventListener('click', function () { finish(true); });
          modal.querySelector(options.danger ? '#confirm-no' : '#confirm-yes').focus();
        }
      });
      return root;
    });
  }

  function renderShell(options) {
    var user = Auth.currentUser();
    var data = Storage.load();
    if (!shellBuilt) {
      document.getElementById('app').innerHTML =
        '<a class="skip-link" href="#content">Skip to content</a>' +
        '<div class="layout">' +
          '<div class="nav-backdrop" id="nav-backdrop"></div>' +
          '<aside class="sidebar" id="sidebar">' +
            '<div class="brand"><img src="' + esc(asset('assets/images/logo.svg')) + '" alt="" width="36" height="36"><div class="brand-copy"><strong class="brand-name"></strong><span>Tuition ERP</span></div></div>' +
            '<nav class="nav-list" id="nav-list" aria-label="Main"></nav>' +
            '<p class="sidebar-note">Demo data stays in this browser. Academic year <strong id="sidebar-year"></strong>.</p>' +
          '</aside>' +
          '<div class="main">' +
            '<header class="topbar">' +
              '<button type="button" class="icon-btn menu-btn" id="nav-toggle" aria-label="Open menu">' + icon('menu') + '</button>' +
              '<div class="page-heading"><h1 class="page-title" id="page-title"></h1><p class="page-sub" id="page-sub"></p></div>' +
              '<div class="top-actions">' +
                '<button type="button" class="icon-btn" id="theme-toggle"></button>' +
                '<div class="user-chip"><span class="user-name"></span><span class="user-role"></span></div>' +
                '<button type="button" class="icon-btn" id="logout-btn" aria-label="Log out">' + icon('logout') + '</button>' +
              '</div>' +
            '</header>' +
            '<div id="content" class="content" tabindex="-1"></div>' +
          '</div>' +
        '</div>';
      shellBuilt = true;
      document.getElementById('nav-toggle').addEventListener('click', function () {
        document.querySelector('.layout').classList.toggle('nav-open');
      });
      document.getElementById('nav-backdrop').addEventListener('click', function () {
        document.querySelector('.layout').classList.remove('nav-open');
      });
      document.getElementById('theme-toggle').addEventListener('click', function () {
        setTheme(theme() === 'dark' ? 'light' : 'dark');
      });
      document.getElementById('logout-btn').addEventListener('click', function () {
        Auth.logout();
      });
      setTheme(theme());
    }
    document.querySelector('.brand-name').textContent = data.institute.name;
    document.getElementById('sidebar-year').textContent = data.currentAcademicYear || '—';
    document.getElementById('page-title').textContent = options.title || '';
    document.getElementById('page-sub').textContent = options.subtitle || '';
    document.title = (options.title || 'Safiya') + ' · Safiya Tuition ERP';
    var links = NAV.filter(function (item) { return user && item.roles.indexOf(user.role) !== -1; });
    document.getElementById('nav-list').innerHTML = links.map(function (item) {
      var current = item.id === options.active;
      return '<a class="nav-link' + (current ? ' active' : '') + '" href="' + esc(pageHref(item.page)) + '"' +
        (current ? ' aria-current="page"' : '') + '>' + icon(item.icon) + '<span>' + esc(item.label) + '</span></a>';
    }).join('');
    document.getElementById('nav-list').querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        var layout = document.querySelector('.layout');
        if (layout) layout.classList.remove('nav-open');
      });
    });
    var chipName = document.querySelector('.user-name');
    var chipRole = document.querySelector('.user-role');
    if (user) {
      chipName.textContent = user.name;
      chipRole.textContent = Auth.ROLE_LABELS[user.role] || user.role;
    }
    return document.getElementById('content');
  }

  function forbidden(active) {
    var content = renderShell({
      active: active,
      title: 'Not allowed',
      subtitle: 'Your role cannot open this page.'
    });
    content.innerHTML =
      '<section class="card empty-card">' +
        '<h2>You do not have access</h2>' +
        '<p>This page is hidden for the signed-in role. Open a page from the sidebar. These checks only guide the demo — they are not real security.</p>' +
        '<a class="btn btn-primary" href="' + esc(pageHref('index.html')) + '">Back to dashboard</a>' +
      '</section>';
  }

  function empty(message) {
    return '<div class="empty">' + esc(message) + '</div>';
  }

  function pager(page, pages) {
    if (pages <= 1) return '';
    return '<div class="pager"><button type="button" data-page="' + (page - 1) + '"' + (page === 1 ? ' disabled' : '') + '>Previous</button><span>Page ' + page + ' of ' + pages + '</span><button type="button" data-page="' + (page + 1) + '"' + (page === pages ? ' disabled' : '') + '>Next</button></div>';
  }

  function setFieldError(input, message) {
    if (!input) return;
    var field = input.closest('.field') || input.parentElement;
    var slot = field ? field.querySelector('.field-error') : null;
    if (message) {
      input.classList.add('invalid');
      input.setAttribute('aria-invalid', 'true');
      if (slot) slot.textContent = message;
    } else {
      input.classList.remove('invalid');
      input.removeAttribute('aria-invalid');
      if (slot) slot.textContent = '';
    }
  }

  function validEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
  }

  function validMobile(value) {
    var digits = String(value || '').replace(/\D/g, '');
    return digits.length === 10 || (digits.length === 12 && digits.indexOf('91') === 0);
  }

  function requireValue(input, label) {
    if (!input || !String(input.value || '').trim()) {
      setFieldError(input, label + ' is required.');
      return false;
    }
    setFieldError(input, '');
    return true;
  }

  function downloadCsv(filename, rows) {
    var csv = rows.map(function (row) {
      return row.map(function (cell) {
        return '"' + String(cell == null ? '' : cell).replace(/"/g, '""') + '"';
      }).join(',');
    }).join('\r\n');
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast('CSV downloaded.', 'success');
  }

  function printDocument(options) {
    var institute = Storage.load().institute;
    var html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + esc(options.title) + '</title><style>' +
      'body{font-family:Segoe UI,sans-serif;color:#0f172a;margin:28px}h1{font-size:20px;margin:0}h2{font-size:16px;margin:14px 0 8px}' +
      '.muted{color:#64748b;font-size:12px}table{width:100%;border-collapse:collapse;margin-top:8px}th,td{border-bottom:1px solid #e2e8f0;text-align:left;padding:6px 8px;font-size:13px}' +
      'th{background:#f8fafc}.right{text-align:right}.head{display:flex;justify-content:space-between;gap:16px;border-bottom:2px solid #4f46e5;padding-bottom:10px}' +
      '</style></head><body><div class="head"><div><h1>' + esc(institute.name) + '</h1><div class="muted">' + esc(institute.address) + ' · ' + esc(institute.phone) + '</div></div>' +
      '<div class="muted">' + esc(options.subtitle || '') + '</div></div><h2>' + esc(options.title) + '</h2>' + options.html + '</body></html>';
    var frame = document.createElement('iframe');
    frame.setAttribute('title', 'Print preview');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    document.body.appendChild(frame);
    var doc = frame.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();
    setTimeout(function () {
      frame.contentWindow.focus();
      frame.contentWindow.print();
      setTimeout(function () { frame.remove(); }, 1200);
    }, 200);
  }

  function greeting(name) {
    var hour = new Date().getHours();
    var part = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    var first = String(name || '').trim().split(' ')[0] || 'there';
    return part + ', ' + first;
  }

  function optionsHtml(items, selected, valueOf, labelOf, placeholder) {
    var html = placeholder ? '<option value="">' + esc(placeholder) + '</option>' : '';
    return html + items.map(function (item) {
      var value = valueOf(item);
      return '<option value="' + esc(value) + '"' + (value === selected ? ' selected' : '') + '>' + esc(labelOf(item)) + '</option>';
    }).join('');
  }

  document.addEventListener('pageshow', function () {
    if (document.body.dataset.page === 'login') return;
    if (!Auth.currentUser()) location.replace(Auth.loginHref());
  });

  window.App = {
    NAV: NAV,
    esc: esc,
    money: money,
    badge: badge,
    icon: icon,
    pageHref: pageHref,
    asset: asset,
    theme: theme,
    setTheme: setTheme,
    toast: toast,
    openModal: openModal,
    closeModal: closeModal,
    confirmDialog: confirmDialog,
    renderShell: renderShell,
    forbidden: forbidden,
    empty: empty,
    pager: pager,
    setFieldError: setFieldError,
    validEmail: validEmail,
    validMobile: validMobile,
    requireValue: requireValue,
    downloadCsv: downloadCsv,
    printDocument: printDocument,
    greeting: greeting,
    optionsHtml: optionsHtml
  };
})();
