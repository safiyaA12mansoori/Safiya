(function () {
  const root = (window.ShopERP = window.ShopERP || {});

  root.initSettingsPage = function initSettingsPage() {
    const form = document.getElementById('display-name-form');
    const input = document.getElementById('shop-name-input');
    const errorBox = document.getElementById('settings-error');
    input.value = root.getShopName();
    form.onsubmit = (event) => {
      event.preventDefault();
      errorBox.hidden = true;
      try {
        root.setShopName(input.value);
        root.applyShopName();
        input.value = root.getShopName();
        root.toast('Shop name updated for this browser session only. Nothing was written to the server.', 'success');
      } catch (error) {
        errorBox.hidden = false;
        errorBox.textContent = error.message;
        root.toast(error.message, 'error');
      }
    };
  };
})();
