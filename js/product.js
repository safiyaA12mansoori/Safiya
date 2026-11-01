function renderProductDetail(product) {
  const category = getCategory(product.category);
  const stock = UI.stockMeta(product.stock);
  const selections = UI.defaultSelections(product);
  const variantFields = (product.variants || []).map((group) => {
    const options = group.options.map((option, index) => {
      const extra = option.add > 0 ? ` <span class="fine-print">indicative + ${UI.inr(option.add)}</span>` : "";
      return `<label class="choice"><input type="radio" name="${UI.esc(group.label)}" value="${UI.esc(option.name)}" ${index === 0 ? "checked" : ""}> <span>${UI.esc(option.name)}${extra}</span></label>`;
    }).join("");
    return `<fieldset class="group-block"><legend class="kicker">${UI.esc(group.label)}</legend><div class="choice-grid">${options}</div></fieldset>`;
  }).join("");

  return `<nav aria-label="Breadcrumb"><ol class="breadcrumb"><li><a href="index.html">Home</a></li><li>/</li><li><a href="shop.html">Shop</a></li><li>/</li><li>${UI.esc(product.name)}</li></ol></nav>
    <div class="detail-layout">
      <div class="detail-visual">
        ${UI.motif(product.motif, product.accent)}
      </div>
      <div>
        <p class="kicker">${UI.esc(category ? category.name : "")}</p>
        <h1>${UI.esc(product.name)}</h1>
        <div id="detail-price">${UI.priceBlock(product)}</div>
        <p class="pill ${stock.cls}">${UI.esc(stock.text)}</p>
        ${stock.note ? `<p class="fine-print">${UI.esc(stock.note)}</p>` : ""}
        <p>${UI.esc(product.description)}</p>
        <p>${UI.esc(product.details)}</p>
        <p class="fine-print">${UI.esc(product.unit)}. ${UI.esc(AROMALUXE.deliveryNote)}</p>
        <p><strong>Customization:</strong> ${product.customizable ? "Yes. What can be changed is confirmed by AromaLuxe, not assumed here." : "This listing is offered as described. Ask if you need a change."}</p>
        ${variantFields}
        <div class="field" style="max-width: 8rem">
          <label for="enquiry-qty">Quantity to mention</label>
          <input id="enquiry-qty" type="number" min="1" max="20" value="1" inputmode="numeric">
        </div>
        <div class="link-row">
          <a class="btn btn-fill" id="detail-wa" target="_blank" rel="noopener" href="#">WhatsApp enquiry</a>
          <a class="btn btn-line" id="detail-mail" href="#">Email enquiry</a>
        </div>
        <p class="fine-print">The amount is a catalogue label. Opening WhatsApp or email does not place a paid order or reserve stock.</p>
      </div>
    </div>
    <div class="section" style="padding-bottom:0">
      <h2>More in this collection</h2>
      <div class="product-grid" id="related-grid"></div>
    </div>`;
}

function bindProductEnquiry(root, product) {
  const qtyInput = root.querySelector("#enquiry-qty");
  const wa = root.querySelector("#detail-wa");
  const mail = root.querySelector("#detail-mail");
  const price = root.querySelector("#detail-price");

  function readSelections() {
    const selections = {};
    (product.variants || []).forEach((group) => {
      const chosen = root.querySelector(`input[name="${CSS.escape(group.label)}"]:checked`);
      if (chosen) selections[group.label] = chosen.value;
    });
    return selections;
  }

  function refresh() {
    const selections = readSelections();
    const qty = Math.min(20, Math.max(1, Number(qtyInput.value) || 1));
    qtyInput.value = String(qty);
    const unit = UI.unitPrice(product, selections);
    if (unit == null) {
      price.innerHTML = UI.priceBlock(product);
    } else {
      const was = product.compareAt && product.compareAt > product.price && qty === 1 && unit === product.price
        ? `<span class="price-was">${UI.inr(product.compareAt)}</span>`
        : "";
      price.innerHTML = `<p class="price-note">Catalogue price for this enquiry</p><p class="price">${was}${UI.inr(unit)} <span class="fine-print">each</span></p><p class="fine-print">Indicative total for ${qty}: ${UI.inr(unit * qty)}. Not a charge.</p>`;
    }
    const message = UI.enquiryMessage(product, { qty, selections });
    wa.href = UI.waLink(message);
    mail.href = UI.mailLink("Enquiry: " + product.name, message);
  }

  root.addEventListener("change", refresh);
  root.addEventListener("input", refresh);
  refresh();
}

function initProduct() {
  const root = document.querySelector("#product-root");
  if (!root) return;
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id") || (window.location.hash || "").replace("#", "");

  if (!id) {
    document.title = "Shop All Products | AromaLuxe";
    root.innerHTML = `<p class="kicker">Catalogue</p><h1>Shop All Products</h1><p class="lead">Choose a gift to view its details. Every price is a label for your enquiry.</p><div class="product-grid" data-all></div>`;
    root.querySelector("[data-all]").innerHTML = PRODUCTS.map((product) => UI.productCard(product)).join("");
    return;
  }

  const product = getProduct(id);
  if (!product) {
    root.innerHTML = `<div class="empty"><h1>That product is not in the catalogue</h1><p>It may have been renamed. Browse the shop, or ask AromaLuxe on WhatsApp.</p><p><a class="btn btn-fill" href="shop.html">Back to the shop</a></p></div>`;
    return;
  }

  document.title = product.name + " | AromaLuxe";
  const meta = document.querySelector('meta[name="description"]');
  if (meta) meta.setAttribute("content", product.description);
  root.innerHTML = renderProductDetail(product);
  bindProductEnquiry(root, product);

  const related = PRODUCTS.filter((item) => item.category === product.category && item.id !== product.id).slice(0, 3);
  const relatedGrid = root.querySelector("#related-grid");
  if (relatedGrid) {
    relatedGrid.innerHTML = related.length
      ? related.map((item) => UI.productCard(item)).join("")
      : "<p>More pieces in this collection will be added by AromaLuxe.</p>";
  }
}
