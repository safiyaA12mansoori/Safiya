function productMatchesCategory(product, categoryId) {
  if (!categoryId) return true;
  if (product.category === categoryId) return true;
  return (product.also || []).includes(categoryId);
}

function emptyShopMessage(categoryId, subId, query) {
  const help = UI.waLink("Hello AromaLuxe, I am looking for a gift and could not find it in the catalogue. Please help.");
  const sub = typeof getSub === "function" ? getSub(categoryId, subId) : null;
  const category = getCategory(categoryId);
  let text = "Nothing in the catalogue matches that search. Try another word, or send a WhatsApp enquiry and AromaLuxe will help you find a gift.";
  if (!query && sub) {
    text = "Photos for " + sub.name + " are on the way. You can still enquire, and AromaLuxe will tell you what can be made.";
  } else if (!query && category) {
    text = "Photos for " + category.name + " are on the way. You can still enquire, and AromaLuxe will tell you what can be made.";
  }
  return `<div class="empty"><p>${UI.esc(text)}</p><p><a class="btn btn-fill" target="_blank" rel="noopener" href="${UI.esc(help)}">WhatsApp enquiry</a></p></div>`;
}

function renderProductGrid(mount, items, emptyHtml) {
  if (!items.length) {
    mount.innerHTML = emptyHtml;
    return;
  }
  mount.innerHTML = items.map((product) => UI.productCard(product)).join("");
}

function initBestsellers() {
  const mount = document.querySelector("[data-bestsellers]");
  if (!mount) return;
  renderProductGrid(mount, PRODUCTS.filter((item) => item.bestseller), "");
}

function initShop() {
  const grid = document.querySelector("[data-shop-grid]");
  if (!grid) return;
  const fixed = grid.getAttribute("data-category") || "";
  const params = new URLSearchParams(window.location.search);
  const searchInput = document.querySelector("[data-shop-search]");
  const categorySelect = document.querySelector("[data-shop-category]");
  const count = document.querySelector("[data-shop-count]");
  const subRow = document.querySelector("[data-sub-row]");
  let sub = params.get("sub") || "";

  if (searchInput && params.get("q")) searchInput.value = params.get("q");
  if (categorySelect) {
    const initial = fixed || params.get("cat") || "";
    if ([...categorySelect.options].some((option) => option.value === initial)) {
      categorySelect.value = initial;
    }
  }

  function currentCategory() {
    if (fixed) return fixed;
    if (categorySelect) return categorySelect.value;
    return params.get("cat") || "";
  }

  function renderSubs() {
    if (!subRow) return;
    const category = getCategory(currentCategory());
    const subs = category && category.subs ? category.subs : [];
    if (!subs.length) {
      subRow.innerHTML = "";
      return;
    }
    const allLabel = category ? "All " + category.short.toLowerCase() : "All";
    subRow.innerHTML = `<button type="button" class="chip ${sub ? "" : "is-on"}" data-sub="" aria-pressed="${sub ? "false" : "true"}">${UI.esc(allLabel)}</button>` +
      subs.map((item) => `<button type="button" class="chip ${sub === item.id ? "is-on" : ""}" data-sub="${UI.esc(item.id)}" aria-pressed="${sub === item.id ? "true" : "false"}">${UI.esc(item.name)}</button>`).join("");
  }

  function syncUrl() {
    const url = new URL(window.location.href);
    const categoryId = currentCategory();
    if (!fixed) {
      if (categoryId) url.searchParams.set("cat", categoryId);
      else url.searchParams.delete("cat");
    }
    if (sub) url.searchParams.set("sub", sub);
    else url.searchParams.delete("sub");
    if (searchInput && searchInput.value.trim()) url.searchParams.set("q", searchInput.value.trim());
    else url.searchParams.delete("q");
    window.history.replaceState({}, "", url);
  }

  function apply() {
    const query = (searchInput ? searchInput.value : params.get("q") || "").trim().toLowerCase();
    const categoryId = currentCategory();
    const category = getCategory(categoryId);
    if (sub && category && !(category.subs || []).some((item) => item.id === sub)) sub = "";
    renderSubs();
    const items = PRODUCTS.filter((product) => {
      if (!productMatchesCategory(product, categoryId)) return false;
      if (sub && product.sub !== sub) return false;
      if (!query) return true;
      const productCategory = getCategory(product.category);
      const subName = getSub(product.category, product.sub);
      const haystack = [
        product.name,
        product.description,
        product.details,
        productCategory ? productCategory.name : "",
        subName ? subName.name : "",
        ...(product.tags || [])
      ].join(" ").toLowerCase();
      return haystack.includes(query);
    });
    renderProductGrid(grid, items, emptyShopMessage(categoryId, sub, query));
    if (count) {
      const label = items.length === 1 ? "1 product" : items.length + " products";
      count.textContent = label;
    }
  }

  if (searchInput) searchInput.addEventListener("input", apply);
  if (categorySelect && !fixed) {
    categorySelect.addEventListener("change", () => {
      sub = "";
      syncUrl();
      apply();
    });
  }
  if (subRow) {
    subRow.addEventListener("click", (event) => {
      const button = event.target.closest("[data-sub]");
      if (!button) return;
      sub = button.getAttribute("data-sub") || "";
      syncUrl();
      apply();
    });
  }

  apply();
}
