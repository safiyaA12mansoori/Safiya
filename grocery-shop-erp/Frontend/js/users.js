(function () {
  const root = (window.ShopERP = window.ShopERP || {});
  const roles = ['Super Admin', 'Admin', 'Manager', 'Cashier', 'Inventory Staff', 'Accountant'];
  let records = [];
  let formBound = false;

  function roleOptions(actorRole) {
    return actorRole === 'Super Admin' ? roles : roles.filter((role) => role !== 'Super Admin');
  }

  function fillRoleSelect(select, actorRole, selected) {
    const options = roleOptions(actorRole);
    select.innerHTML = options
      .map((role) => `<option value="${root.escapeHtml(role)}">${root.escapeHtml(role)}</option>`)
      .join('');
    if (selected && options.includes(selected)) {
      select.value = selected;
    }
  }

  function filtered() {
    const query = document.getElementById('user-search').value.trim().toLowerCase();
    const role = document.getElementById('user-role-filter').value;
    return records.filter((user) => {
      const matchesRole = !role || user.role === role;
      const haystack = `${user.name} ${user.email} ${user.role}`.toLowerCase();
      return matchesRole && (!query || haystack.includes(query));
    });
  }

  function render() {
    const tbody = document.getElementById('user-rows');
    const status = document.getElementById('user-status');
    if (!tbody || !status || !document.getElementById('user-search')) {
      return;
    }
    const visible = filtered();
    const actor = root.state.user;
    if (!visible.length) {
      status.textContent = records.length ? 'No staff match this search.' : 'No users yet.';
      tbody.innerHTML = '<tr><td colspan="6" class="quiet p-4">Nothing to show.</td></tr>';
      return;
    }
    status.textContent = `${visible.length} staff shown. Times are India Standard Time.`;
    tbody.innerHTML = visible
      .map((user) => {
        const isSelf = user.id === actor.id;
        const canEdit = actor.role === 'Super Admin' || user.role !== 'Super Admin';
        const statusClass = user.active ? 'status-on' : 'status-off';
        const statusLabel = user.active ? 'Active' : 'Inactive';
        const actions = [];
        if (canEdit) {
          actions.push(`<button class="btn btn-sm btn-outline-secondary" type="button" data-action="edit" data-id="${root.escapeHtml(user.id)}">Edit</button>`);
        }
        if (canEdit && !isSelf) {
          const nextLabel = user.active ? 'Deactivate' : 'Activate';
          actions.push(`<button class="btn btn-sm btn-outline-secondary" type="button" data-action="status" data-id="${root.escapeHtml(user.id)}">${nextLabel}</button>`);
        }
        return `<tr>
          <td>${root.escapeHtml(user.name)}</td>
          <td>${root.escapeHtml(user.email)}</td>
          <td><span class="role-pill">${root.escapeHtml(user.role)}</span></td>
          <td><span class="status-pill ${statusClass}">${statusLabel}</span></td>
          <td>${root.escapeHtml(root.formatWhen(user.createdAt))}</td>
          <td class="text-nowrap">${actions.join(' ') || '—'}</td>
        </tr>`;
      })
      .join('');
  }

  function showFormError(message) {
    const box = document.getElementById('user-form-error');
    box.hidden = !message;
    box.textContent = message || '';
  }

  function openModal(mode, user) {
    const actor = root.state.user;
    const form = document.getElementById('user-form');
    form.reset();
    showFormError('');
    document.getElementById('user-id').value = user ? user.id : '';
    document.getElementById('user-modal-title').textContent = mode === 'edit' ? 'Edit user' : 'Add user';
    document.getElementById('user-save').textContent = mode === 'edit' ? 'Save changes' : 'Save user';
    const password = document.getElementById('user-password');
    const help = document.getElementById('user-password-help');
    const isSelf = user && user.id === actor.id;
    fillRoleSelect(document.getElementById('user-role'), actor.role, user ? user.role : 'Cashier');
    document.getElementById('user-role').disabled = Boolean(isSelf);
    password.required = mode !== 'edit';
    password.value = '';
    help.textContent = mode === 'edit'
      ? 'Leave blank to keep the current password. 8 to 72 characters, with a letter and a number.'
      : '8 to 72 characters, with a letter and a number.';
    document.getElementById('user-password-wrap').hidden = Boolean(isSelf);
    if (user) {
      document.getElementById('user-name').value = user.name;
      document.getElementById('user-email').value = user.email;
    }
    window.bootstrap.Modal.getOrCreateInstance(document.getElementById('user-modal')).show();
  }

  async function loadUsers() {
    const status = document.getElementById('user-status');
    status.textContent = 'Loading staff…';
    document.getElementById('user-rows').innerHTML = '<tr><td colspan="6" class="p-4"><span class="spinner-border spinner-border-sm" aria-hidden="true"></span> Loading staff…</td></tr>';
    try {
      const data = await root.api('/api/users');
      if (!document.getElementById('user-rows')) {
        return;
      }
      records = data.users || [];
      render();
    } catch (error) {
      status.textContent = error.message;
      document.getElementById('user-rows').innerHTML = `<tr><td colspan="6" class="p-4"><button class="btn btn-outline-secondary btn-sm" type="button" id="retry-users">Try again</button></td></tr>`;
      document.getElementById('retry-users').addEventListener('click', loadUsers);
      root.toast(error.message, 'error');
    }
  }

  async function onSubmit(event) {
    event.preventDefault();
    const button = document.getElementById('user-save');
    const id = document.getElementById('user-id').value;
    const body = {
      name: document.getElementById('user-name').value,
      email: document.getElementById('user-email').value,
      role: document.getElementById('user-role').value,
    };
    const password = document.getElementById('user-password').value;
    if (!document.getElementById('user-password-wrap').hidden && password) {
      body.password = password;
    }
    if (!id && !body.password) {
      showFormError('Password is required for a new user.');
      return;
    }
    showFormError('');
    root.setBusy(button, true, 'Saving…');
    try {
      if (id) {
        await root.api(`/api/users/${id}`, { method: 'PATCH', body });
        root.toast('User updated.', 'success');
      } else {
        await root.api('/api/users', { method: 'POST', body });
        root.toast('User added.', 'success');
      }
      window.bootstrap.Modal.getInstance(document.getElementById('user-modal')).hide();
      await loadUsers();
    } catch (error) {
      showFormError(error.message);
      root.toast(error.message, 'error');
    } finally {
      root.setBusy(button, false);
    }
  }

  async function onStatus(user) {
    const nextActive = !user.active;
    const confirmed = await root.confirmAction({
      title: nextActive ? 'Activate this account?' : 'Deactivate this account?',
      message: nextActive
        ? `${user.name} will be able to sign in again.`
        : `${user.name} will not be able to sign in until the account is activated again.`,
      confirmLabel: nextActive ? 'Activate' : 'Deactivate',
      danger: !nextActive,
    });
    if (!confirmed) {
      return;
    }
    try {
      await root.api(`/api/users/${user.id}/status`, {
        method: 'PATCH',
        body: { active: nextActive },
      });
      root.toast(nextActive ? 'Account activated.' : 'Account deactivated.', 'success');
      await loadUsers();
    } catch (error) {
      root.toast(error.message, 'error');
    }
  }

  root.initUsersPage = function initUsersPage() {
    const filter = document.getElementById('user-role-filter');
    filter.innerHTML = '<option value="">All roles</option>' + roles
      .map((role) => `<option value="${root.escapeHtml(role)}">${root.escapeHtml(role)}</option>`)
      .join('');
    document.getElementById('user-search').addEventListener('input', render);
    filter.addEventListener('change', render);
    document.getElementById('add-user').addEventListener('click', () => openModal('create'));
    document.getElementById('user-rows').addEventListener('click', (event) => {
      const button = event.target.closest('button[data-action]');
      if (!button) {
        return;
      }
      const user = records.find((item) => item.id === button.dataset.id);
      if (!user) {
        return;
      }
      if (button.dataset.action === 'edit') {
        openModal('edit', user);
      }
      if (button.dataset.action === 'status') {
        onStatus(user);
      }
    });
    if (!formBound) {
      document.getElementById('user-form').addEventListener('submit', onSubmit);
      formBound = true;
    }
    loadUsers();
  };
})();
