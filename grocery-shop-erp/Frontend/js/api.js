(function () {
  const root = (window.ShopERP = window.ShopERP || {});

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[character]));
  }

  async function api(path, options = {}) {
    const headers = { Accept: 'application/json' };
    const request = {
      method: options.method || 'GET',
      credentials: 'same-origin',
      headers,
    };
    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      request.body = JSON.stringify(options.body);
    }
    const response = await fetch(path, request);
    const text = await response.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { error: 'Unexpected response from the server' };
      }
    }
    if (response.status === 401 && options.redirectOn401 !== false) {
      window.location.href = '/login.html';
    }
    if (!response.ok) {
      const error = new Error((data && data.error) || 'Request failed');
      error.status = response.status;
      throw error;
    }
    return data;
  }

  function setBusy(button, busy, label) {
    if (!button) {
      return;
    }
    if (busy) {
      if (!button.dataset.idleLabel) {
        button.dataset.idleLabel = button.textContent;
      }
      button.disabled = true;
      button.textContent = label;
      return;
    }
    button.disabled = false;
    button.textContent = button.dataset.idleLabel || button.textContent;
    delete button.dataset.idleLabel;
  }

  root.escapeHtml = escapeHtml;
  root.api = api;
  root.setBusy = setBusy;
})();
