function productMatchesCategory(product, categoryId) {
  if (!categoryId) return true;
  if (product.category === categoryId) return true;
  return (product.also || []).includes(categoryId);
}

function renderProductGrid(mount, items) {
  if (!items.length) {
    const help = UI.waLink("Hello AromaLuxe, I am looking for a gift and could not find it in the catalogue. Please help.");
    mount.innerHTML = `<div class="empty"><p>Nothing in the catalogue matches that search. Try another word, or send a WhatsApp enquiry and AromaLuxe will help you find a gift.</p><p><a class="btn btn-fill" target="_blank" rel="noopener" href="${UI.esc(help)}">WhatsApp enquiry</a></p></div>`;
    return;
  }
  mount.innerHTML = items.map((product) => UI.productCard(product)).join("");
}

function initBestsellers() {
  const mount = document.querySelector("[data-bestsellers]");
  if (!mount) return;
  renderProductGrid(mount, PRODUCTS.filter((item) => item.bestseller));
}

function initShop() {
  const grid = document.querySelector("[data-shop-grid]");
  if (!grid) return;
  const fixed = grid.getAttribute("data-category") || "";
  const params = new URLSearchParams(window.location.search);
  const searchInput = document.querySelector("[data-shop-search]");
  const categorySelect = document.querySelector("[data-shop-category]");
  const count = document.querySelector("[data-shop-count]");
  const tagRow = document.querySelector("[data-tag-row]");
  let tag = "";

  if (searchInput && params.get("q")) searchInput.value = params.get("q");
  if (categorySelect) {
    const initial = fixed || params.get("cat") || "";
    categorySelect.value = initial;
  }

  function currentCategory() {
    if (fixed) return fixed;
    if (categorySelect) return categorySelect.value;
    return params.get("cat") || "";
  }

  function apply() {
    const query = (searchInput ? searchInput.value : params.get("q") || "").trim().toLowerCase();
    const categoryId = currentCategory();
    const items = PRODUCTS.filter((product) => {
      if (!productMatchesCategory(product, categoryId)) return false;
      if (tag && !(product.tags || []).includes(tag)) return false;
      if (!query) return true;
      const category = getCategory(product.category);
      const haystack = [
        product.name,
        product.description,
        product.details,
        category ? category.name : "",
        ...(product.tags || [])
      ].join(" ").toLowerCase();
      return haystack.includes(query);
    });
    renderProductGrid(grid, items);
    if (count) {
      const label = items.length === 1 ? "1 product" : items.length + " products";
      count.textContent = label;
    }
  }

  if (searchInput) {
    searchInput.addEventListener("input", apply);
  }
  if (categorySelect && !fixed) {
    categorySelect.addEventListener("change", () => {
      const url = new URL(window.location.href);
      if (categorySelect.value) url.searchParams.set("cat", categorySelect.value);
      else url.searchParams.delete("cat");
      if (searchInput && searchInput.value.trim()) url.searchParams.set("q", searchInput.value.trim());
      else url.searchParams.delete("q");
      window.history.replaceState({}, "", url);
      apply();
    });
  }
  if (tagRow) {
    tagRow.addEventListener("click", (event) => {
      const button = event.target.closest("[data-tag]");
      if (!button) return;
      tag = button.getAttribute("data-tag") || "";
      tagRow.querySelectorAll("[data-tag]").forEach((chip) => {
        const on = chip === button;
        chip.classList.toggle("is-on", on);
        chip.setAttribute("aria-pressed", on ? "true" : "false");
      });
      apply();
    });
  }

  apply();
}
