(function () {
  if (window.ShopERP.applyShopName) {
    window.ShopERP.applyShopName();
  }

  const form = document.getElementById('login-form');
  const errorBox = document.getElementById('login-error');
  const toggle = document.getElementById('toggle-password');
  const password = document.getElementById('password');

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
