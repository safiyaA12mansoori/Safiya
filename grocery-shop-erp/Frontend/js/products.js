(function () {
  const root = (window.ShopERP = window.ShopERP || {});
  const categories = ['Staples', 'Pulses', 'Oil', 'Dairy', 'Beverages', 'Snacks', 'Spices', 'Household', 'Spreads'];
  const units = ['kg', 'g', 'L', 'ml', 'pack', 'piece'];
  let records = [];
  let formBound = false;

  function canManage() {
    return root.state.permissions.includes('products.manage');
  }

  function fillSelect(select, options, selected) {
    select.innerHTML = options
      .map((option) => `<option value="${root.escapeHtml(option)}">${root.escapeHtml(option)}</option>`)
      .join('');
    if (selected && options.includes(selected)) {
      select.value = selected;
    }
  }

  function filtered() {
    const query = document.getElementById('product-search').value.trim().toLowerCase();
    const category = document.getElementById('product-category-filter').value;
    return records.filter((product) => {
      const matchesCategory = !category || product.category === category;
      const haystack = `${product.sku} ${product.name} ${product.category}`.toLowerCase();
      return matchesCategory && (!query || haystack.includes(query));
    });
  }

  function render() {
    const tbody = document.getElementById('product-rows');
    const status = document.getElementById('product-status');
    if (!tbody || !status || !document.getElementById('product-search')) {
      return;
    }
    const visible = filtered();
    const manage = canManage();
    document.getElementById('product-actions-heading').hidden = !manage;
    if (!visible.length) {
      status.textContent = records.length ? 'No products match this search.' : 'No products in the shop yet.';
      tbody.innerHTML = `<tr><td colspan="${manage ? 7 : 6}" class="quiet p-4">Nothing to show.</td></tr>`;
      return;
    }
    status.textContent = `${visible.length} of ${records.length} products in the shop. Prices are in INR.`;
    tbody.innerHTML = visible
      .map((product) => {
        const statusClass = product.active ? 'status-on' : 'status-off';
        const statusLabel = product.active ? 'On shelf' : 'Hidden';
        const actions = manage
          ? `<td class="text-nowrap"><button class="btn btn-sm btn-outline-secondary" type="button" data-action="edit" data-id="${root.escapeHtml(product.id)}">Edit</button></td>`
          : '';
        return `<tr>
          <td>${root.escapeHtml(product.sku)}</td>
          <td>${root.escapeHtml(product.name)}</td>
          <td>${root.escapeHtml(product.category)}</td>
          <td>${root.escapeHtml(product.packSize)}</td>
          <td>${root.escapeHtml(root.formatInr(product.pricePaise))}</td>
          <td><span class="status-pill ${statusClass}">${statusLabel}</span></td>
          ${actions}
        </tr>`;
      })
      .join('');
  }

  function showFormError(message) {
    const box = document.getElementById('product-form-error');
    box.hidden = !message;
    box.textContent = message || '';
  }

  function openModal(product) {
    const form = document.getElementById('product-form');
    form.reset();
    showFormError('');
    document.getElementById('product-id').value = product ? product.id : '';
    document.getElementById('product-modal-title').textContent = product ? 'Edit product' : 'Add product';
    document.getElementById('product-save').textContent = product ? 'Save changes' : 'Save product';
    fillSelect(document.getElementById('product-category'), categories, product ? product.category : 'Staples');
    fillSelect(document.getElementById('product-unit'), units, product ? product.unit : 'kg');
    if (product) {
      document.getElementById('product-name').value = product.name;
      document.getElementById('product-pack').value = product.packSize;
      document.getElementById('product-price').value = (product.pricePaise / 100).toFixed(2);
    }
    window.bootstrap.Modal.getOrCreateInstance(document.getElementById('product-modal')).show();
  }

  async function loadProducts() {
    const status = document.getElementById('product-status');
    status.textContent = 'Loading products…';
    document.getElementById('product-rows').innerHTML = '<tr><td colspan="7" class="p-4"><span class="spinner-border spinner-border-sm" aria-hidden="true"></span> Loading products…</td></tr>';
    try {
      const data = await root.api('/api/products');
      if (!document.getElementById('product-rows')) {
        return;
      }
      records = data.products || [];
      render();
    } catch (error) {
      status.textContent = error.message;
      document.getElementById('product-rows').innerHTML = '<tr><td colspan="7" class="p-4"><button class="btn btn-outline-secondary btn-sm" type="button" id="retry-products">Try again</button></td></tr>';
      document.getElementById('retry-products').addEventListener('click', loadProducts);
      root.toast(error.message, 'error');
    }
  }

  async function onSubmit(event) {
    event.preventDefault();
    const button = document.getElementById('product-save');
    const id = document.getElementById('product-id').value;
    const body = {
      name: document.getElementById('product-name').value,
      category: document.getElementById('product-category').value,
      unit: document.getElementById('product-unit').value,
      packSize: document.getElementById('product-pack').value,
      priceRupees: document.getElementById('product-price').value,
    };
    showFormError('');
    root.setBusy(button, true, 'Saving…');
    try {
      if (id) {
        await root.api(`/api/products/${id}`, { method: 'PATCH', body });
        root.toast('Product updated.', 'success');
      } else {
        await root.api('/api/products', { method: 'POST', body });
        root.toast('Product added.', 'success');
      }
      window.bootstrap.Modal.getInstance(document.getElementById('product-modal')).hide();
      await loadProducts();
    } catch (error) {
      showFormError(error.message);
      root.toast(error.message, 'error');
    } finally {
      root.setBusy(button, false);
    }
  }

  root.initProductsPage = function initProductsPage() {
    const filter = document.getElementById('product-category-filter');
    filter.innerHTML = '<option value="">All categories</option>' + categories
      .map((category) => `<option value="${root.escapeHtml(category)}">${root.escapeHtml(category)}</option>`)
      .join('');
    document.getElementById('add-product').hidden = !canManage();
    document.getElementById('product-search').addEventListener('input', render);
    filter.addEventListener('change', render);
    document.getElementById('add-product').addEventListener('click', () => openModal(null));
    document.getElementById('product-rows').addEventListener('click', (event) => {
      const button = event.target.closest('button[data-action="edit"]');
      if (!button) {
        return;
      }
      const product = records.find((item) => item.id === button.dataset.id);
      if (product) {
        openModal(product);
      }
    });
    if (!formBound) {
      document.getElementById('product-form').addEventListener('submit', onSubmit);
      formBound = true;
    }
    loadProducts();
  };
})();
