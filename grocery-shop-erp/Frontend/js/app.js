(function () {
  const root = (window.ShopERP = window.ShopERP || {});
  const state = { user: null, permissions: [] };
  root.state = state;
  let navToken = 0;
  let shellBound = false;

  function routeName() {
    const hash = window.location.hash;
    if (hash === '#/users') {
      return 'users';
    }
    if (hash === '#/settings') {
      return 'settings';
    }
    if (hash === '#/products') {
      return 'products';
    }
    if (hash === '#/dashboard' || hash === '' || hash === '#' || hash === '#/') {
      return 'dashboard';
    }
    return 'unknown';
  }

  function setSidebar(open) {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('backdrop');
    const toggle = document.getElementById('menu-toggle');
    sidebar.classList.toggle('is-open', open);
    backdrop.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
  }

  async function loadFragment(url) {
    const view = document.getElementById('view');
    view.setAttribute('aria-busy', 'true');
    view.innerHTML = '<div class="page-loading"><span class="spinner-border spinner-border-sm" aria-hidden="true"></span> Loading…</div>';
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('That page could not be loaded.');
    }
    view.innerHTML = await response.text();
    view.setAttribute('aria-busy', 'false');
  }

  function markRoute(name) {
    document.querySelectorAll('[data-route]').forEach((element) => {
      const active = element.getAttribute('data-route') === name;
      element.classList.toggle('active', active);
      if (active) {
        element.setAttribute('aria-current', 'page');
      } else {
        element.removeAttribute('aria-current');
      }
    });
  }

  async function navigate() {
    const token = ++navToken;
    setSidebar(false);
    const name = routeName();
    markRoute(name);
    const view = document.getElementById('view');
    try {
      if (name === 'dashboard') {
        await loadFragment('/pages/dashboard.html');
      } else if (name === 'settings') {
        await loadFragment('/pages/settings.html');
        if (token !== navToken) {
          return;
        }
        root.initSettingsPage();
      } else if (name === 'users') {
        if (!state.permissions.includes('users.manage')) {
          view.innerHTML = '<section class="panel"><h1 class="h4">Users</h1><p class="mb-0">Your role cannot manage staff accounts.</p></section>';
          return;
        }
        await loadFragment('/pages/users.html');
        if (token !== navToken) {
          return;
        }
        root.initUsersPage();
      } else if (name === 'products') {
        if (!state.permissions.includes('products.view')) {
          view.innerHTML = '<section class="panel"><h1 class="h4">Products</h1><p class="mb-0">Your role cannot view the product list.</p></section>';
          return;
        }
        await loadFragment('/pages/products.html');
        if (token !== navToken) {
          return;
        }
        root.initProductsPage();
      } else {
        view.innerHTML = '<section class="panel"><h1 class="h4">Not in this phase</h1><p class="mb-0">That screen is not part of Phase 1.</p></section>';
      }
    } catch (error) {
      if (token !== navToken) {
        return;
      }
      view.innerHTML = '<section class="panel"><p class="mb-0">The page could not be loaded.</p></section>';
      root.toast(error.message, 'error');
    }
  }

  function showFormError(message) {
    const box = document.getElementById('password-error');
    box.hidden = !message;
    box.textContent = message || '';
  }

  function bindShell() {
    if (shellBound) {
      return;
    }
    shellBound = true;
    document.getElementById('menu-toggle').addEventListener('click', () => {
      const sidebar = document.getElementById('sidebar');
      setSidebar(!sidebar.classList.contains('is-open'));
    });
    document.getElementById('backdrop').addEventListener('click', () => setSidebar(false));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        setSidebar(false);
      }
    });
    document.getElementById('sidebar').addEventListener('click', (event) => {
      if (event.target.closest('a')) {
        setSidebar(false);
      }
    });
    document.getElementById('logout-button').addEventListener('click', async () => {
      try {
        await root.api('/api/auth/logout', { method: 'POST', redirectOn401: false });
      } catch {
        // The cookie is cleared when the session is still valid. Either way, leave the app.
      }
      window.location.href = '/login.html';
    });
    document.getElementById('open-password').addEventListener('click', () => {
      document.getElementById('password-form').reset();
      showFormError('');
      window.bootstrap.Modal.getOrCreateInstance(document.getElementById('password-modal')).show();
    });
    document.getElementById('password-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const button = form.querySelector('button[type="submit"]');
      const next = document.getElementById('new-password').value;
      const confirm = document.getElementById('confirm-password').value;
      if (next !== confirm) {
        showFormError('New password and confirmation do not match.');
        return;
      }
      showFormError('');
      root.setBusy(button, true, 'Updating…');
      try {
        await root.api('/api/auth/change-password', {
          method: 'POST',
          body: {
            currentPassword: document.getElementById('current-password').value,
            newPassword: next,
          },
        });
        window.bootstrap.Modal.getInstance(document.getElementById('password-modal')).hide();
        root.toast('Password changed.', 'success');
      } catch (error) {
        showFormError(error.message);
        root.toast(error.message, 'error');
      } finally {
        root.setBusy(button, false);
      }
    });
    window.addEventListener('hashchange', navigate);
  }

  function tick() {
    document.getElementById('clock').textContent = root.formatNow();
  }

  async function boot() {
    try {
      const me = await root.api('/api/auth/me');
      state.user = me.user;
      state.permissions = me.permissions || [];
      document.getElementById('boot').classList.add('d-none');
      document.getElementById('shell').classList.remove('d-none');
      document.getElementById('current-user-name').textContent = me.user.name;
      document.getElementById('current-user-role').textContent = me.user.role;
      document.querySelectorAll('[data-permission]').forEach((element) => {
        element.hidden = !state.permissions.includes(element.getAttribute('data-permission'));
      });
      root.applyShopName();
      tick();
      window.setInterval(tick, 30000);
      bindShell();
      if (!window.location.hash) {
        window.location.hash = '#/dashboard';
      } else {
        navigate();
      }
    } catch (error) {
      if (error.status === 401) {
        return;
      }
      document.getElementById('boot').textContent = error.message || 'The app could not start.';
    }
  }

  boot();
})();
