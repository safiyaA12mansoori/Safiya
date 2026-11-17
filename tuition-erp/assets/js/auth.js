/**
 * Demo sign-in. Passwords sit in the browser store in plain text so the
 * sample accounts can be tried. This is not real authentication.
 */
(function () {
  var SESSION_KEY = 'tuitionErp.session';

  var ROLE_LABELS = {
    admin: 'Admin',
    teacher: 'Teacher',
    accountant: 'Accountant',
    student: 'Student',
    parent: 'Parent'
  };

  function inPages() {
    return /\/pages\//.test(location.pathname);
  }

  function loginHref() {
    return (inPages() ? '../' : '') + 'login.html';
  }

  function homeHref() {
    return (inPages() ? '../' : '') + 'index.html';
  }

  function readSession() {
    var raw = null;
    try {
      raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
    } catch (err) {
      return null;
    }
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (err) {
      return null;
    }
  }

  function currentUser() {
    var session = readSession();
    if (!session || !session.userId) return null;
    var data = Storage.load();
    return data.users.find(function (user) {
      return user.id === session.userId && user.status === 'Active';
    }) || null;
  }

  function login(identifier, password, remember) {
    var id = String(identifier || '').trim().toLowerCase();
    var data = Storage.load();
    var match = data.users.find(function (user) {
      return user.email.toLowerCase() === id || user.username.toLowerCase() === id;
    });
    if (!match || match.password !== password) {
      return { ok: false, message: 'Those credentials do not match a demo account.' };
    }
    if (match.status !== 'Active') {
      return { ok: false, message: 'This account is inactive. An admin can restore it from Settings.' };
    }
    var payload = JSON.stringify({ userId: match.id });
    try {
      sessionStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(SESSION_KEY);
      if (remember) localStorage.setItem(SESSION_KEY, payload);
      else sessionStorage.setItem(SESSION_KEY, payload);
    } catch (err) {
      return { ok: false, message: 'This browser blocked saving the session.' };
    }
    return { ok: true, user: match };
  }

  function logout() {
    try {
      sessionStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(SESSION_KEY);
    } catch (err) {
      /* ignore */
    }
    location.replace(loginHref());
  }

  function guard(roles) {
    var user = currentUser();
    if (!user) {
      location.replace(loginHref());
      return null;
    }
    if (roles && roles.indexOf(user.role) === -1) {
      App.forbidden(document.body.dataset.page || '');
      return null;
    }
    return user;
  }

  function mountLogin() {
    var error = document.getElementById('login-error');
    var form = document.getElementById('login-form');
    var accounts = document.getElementById('demo-accounts');
    var data = Storage.load();
    if (currentUser()) {
      location.replace(homeHref());
      return;
    }
    if (accounts) {
      accounts.innerHTML = data.users.filter(function (user) { return user.status === 'Active'; }).map(function (user) {
        return (
          '<article class="demo-card">' +
            '<div><strong>' + App.esc(ROLE_LABELS[user.role] || user.role) + '</strong><span>' + App.esc(user.email) + '</span></div>' +
            '<code>' + App.esc(user.password) + '</code>' +
            '<button type="button" class="btn btn-secondary btn-sm" data-fill="' + App.esc(user.id) + '">Use</button>' +
          '</article>'
        );
      }).join('');
      accounts.addEventListener('click', function (event) {
        var button = event.target.closest('[data-fill]');
        if (!button) return;
        var user = data.users.find(function (item) { return item.id === button.getAttribute('data-fill'); });
        if (!user) return;
        document.getElementById('identifier').value = user.email;
        document.getElementById('password').value = user.password;
        document.getElementById('password').focus();
      });
    }
    var toggle = document.getElementById('toggle-password');
    if (toggle) {
      toggle.addEventListener('click', function () {
        var input = document.getElementById('password');
        var show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        toggle.setAttribute('aria-pressed', show ? 'true' : 'false');
        toggle.textContent = show ? 'Hide' : 'Show';
      });
    }
    var forgot = document.getElementById('forgot-password');
    var forgotNote = document.getElementById('forgot-note');
    if (forgot && forgotNote) {
      forgot.addEventListener('click', function (event) {
        event.preventDefault();
        forgotNote.hidden = false;
      });
    }
    if (!form) return;
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      error.textContent = '';
      var identifier = document.getElementById('identifier').value;
      var password = document.getElementById('password').value;
      if (!identifier.trim() || !password) {
        error.textContent = 'Enter the email or username and the password.';
        return;
      }
      var result = login(identifier, password, document.getElementById('remember').checked);
      if (!result.ok) {
        error.textContent = result.message;
        return;
      }
      location.replace(homeHref());
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (document.body.dataset.page === 'login') mountLogin();
  });

  window.Auth = {
    ROLE_LABELS: ROLE_LABELS,
    currentUser: currentUser,
    login: login,
    logout: logout,
    guard: guard,
    loginHref: loginHref,
    homeHref: homeHref
  };
})();
