(function () {
  const root = (window.ShopERP = window.ShopERP || {});

  function toast(message, type) {
    const stack = document.getElementById('toasts');
    if (!stack) {
      return;
    }
    const item = document.createElement('div');
    item.className = `toast-item ${type === 'error' ? 'toast-error' : 'toast-success'}`;
    item.textContent = message;
    stack.appendChild(item);
    window.setTimeout(() => {
      item.remove();
    }, 4200);
  }

  function confirmAction({ title, message, confirmLabel, danger }) {
    const modalElement = document.getElementById('confirm-modal');
    const modal = window.bootstrap.Modal.getOrCreateInstance(modalElement);
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-message').textContent = message;
    const accept = document.getElementById('confirm-accept');
    accept.textContent = confirmLabel || 'Confirm';
    accept.className = danger === false ? 'btn btn-primary' : 'btn btn-danger';
    return new Promise((resolve) => {
      let settled = false;
      const finish = (value) => {
        if (settled) {
          return;
        }
        settled = true;
        resolve(value);
      };
      accept.onclick = () => {
        finish(true);
        modal.hide();
      };
      modalElement.addEventListener('hidden.bs.modal', () => finish(false), { once: true });
      modal.show();
    });
  }

  root.toast = toast;
  root.confirmAction = confirmAction;
})();
