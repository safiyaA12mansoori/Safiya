(function () {
  const root = (window.ShopERP = window.ShopERP || {});
  const storageKey = 'groceryShop.displayName';
  const fallback = 'Grocery Shop';

  function readStorage() {
    try {
      return sessionStorage.getItem(storageKey) || '';
    } catch {
      return '';
    }
  }

  function getShopName() {
    const saved = readStorage().trim().replace(/\s+/g, ' ');
    return saved ? saved.slice(0, 60) : fallback;
  }

  function setShopName(value) {
    const clean = String(value || '').trim().replace(/\s+/g, ' ');
    if (clean.length < 2 || clean.length > 60) {
      throw new Error('Shop name must be 2 to 60 characters.');
    }
    sessionStorage.setItem(storageKey, clean);
    return clean;
  }

  function applyShopName() {
    const name = getShopName();
    document.querySelectorAll('[data-shop-name]').forEach((element) => {
      element.textContent = name;
    });
    if (document.body.contains(document.getElementById('shell'))) {
      document.title = `${name} · ERP`;
    }
  }

  function formatWhen(iso) {
    if (!iso) {
      return '';
    }
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  }

  function formatNow() {
    const text = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date());
    return `${text} IST`;
  }

  root.getShopName = getShopName;
  root.setShopName = setShopName;
  root.applyShopName = applyShopName;
  function formatInr(paise) {
    const amount = Number(paise);
    if (!Number.isInteger(amount)) {
      return '';
    }
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount / 100);
  }

  root.formatWhen = formatWhen;
  root.formatNow = formatNow;
  root.formatInr = formatInr;
})();
