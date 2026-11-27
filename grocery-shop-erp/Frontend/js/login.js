(function () {
  if (window.ShopERP.applyShopName) {
    window.ShopERP.applyShopName();
  }

  const form = document.getElementById('login-form');
  const errorBox = document.getElementById('login-error');
  const toggle = document.getElementById('toggle-password');
  const password = document.getElementById('password');

  const sampleButton = document.getElementById('sample-login');
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
    sampleButton.hidden = false;
    document.getElementById('sample-note').hidden = false;
  }

  sampleButton.addEventListener('click', async () => {
    window.ShopERP.setBusy(sampleButton, true, 'Opening the sample shop…');
    errorBox.hidden = true;
    try {
      await window.ShopERP.api('/api/auth/sample-login', {
        method: 'POST',
        redirectOn401: false,
        body: {},
      });
      window.location.href = '/';
    } catch (error) {
      errorBox.hidden = false;
      errorBox.textContent = error.message;
      window.ShopERP.toast(error.message, 'error');
      window.ShopERP.setBusy(sampleButton, false);
    }
  });

  window.ShopERP.api('/api/auth/me', { redirectOn401: false })
    .then(() => {
      window.location.href = '/';
    })
    .catch(() => {});

  toggle.addEventListener('click', () => {
    const showing = password.type === 'text';
    password.type = showing ? 'password' : 'text';
    toggle.textContent = showing ? 'Show' : 'Hide';
    toggle.setAttribute('aria-pressed', String(!showing));
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorBox.hidden = true;
    const button = form.querySelector('button[type="submit"]');
    window.ShopERP.setBusy(button, true, 'Signing in…');
    try {
      await window.ShopERP.api('/api/auth/login', {
        method: 'POST',
        redirectOn401: false,
        body: {
          email: form.email.value,
          password: form.password.value,
        },
      });
      window.location.href = '/';
    } catch (error) {
      errorBox.hidden = false;
      errorBox.textContent = error.message;
      window.ShopERP.toast(error.message, 'error');
      window.ShopERP.setBusy(button, false);
    }
  });
})();
