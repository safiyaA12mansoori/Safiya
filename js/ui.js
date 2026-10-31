const UI = (() => {
  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[ch]));
  }

  function inr(amount) {
    if (amount === null || amount === undefined || Number.isNaN(Number(amount))) {
      return "Price on request";
    }
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(amount);
  }

  function rs(amount) {
    if (amount === null || amount === undefined || Number.isNaN(Number(amount))) {
      return "price on request";
    }
    return "Rs " + Number(amount).toLocaleString("en-IN");
  }

  function waLink(text) {
    return "https://wa.me/" + AROMALUXE.whatsapp + "?text=" + encodeURIComponent(text);
  }

  function mailLink(subject, body) {
    return "mailto:" + AROMALUXE.email + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
  }

  function motif(name, accent) {
    const wash = /^#[0-9A-Fa-f]{6}$/.test(accent || "") ? accent : "#D9A8B4";
    const parts = {
      jar: `<rect x="58" y="48" width="44" height="78" rx="8" fill="#FFF7EC" stroke="#493B36" stroke-width="2"/><rect x="63" y="82" width="34" height="38" rx="2" fill="${wash}"/><rect x="70" y="40" width="20" height="10" rx="2" fill="#641E32"/><path d="M80 40c7-18 0-28 0-28s-2 12-7 18c8 2 12 6 7 10z" fill="#C5A05A"/>`,
      pillar: `<rect x="46" y="58" width="18" height="78" rx="8" fill="#FFF7EC" stroke="#493B36"/><rect x="71" y="40" width="18" height="96" rx="8" fill="${wash}" stroke="#493B36"/><rect x="96" y="68" width="18" height="68" rx="8" fill="#FFF7EC" stroke="#493B36"/><path d="M80 40c5-14 0-22 0-22s-1 9-5 14c6 1 9 5 5 8z" fill="#C5A05A"/>`,
      flower: `<circle cx="80" cy="58" r="16" fill="${wash}"/><circle cx="62" cy="70" r="12" fill="#D9A8B4"/><circle cx="98" cy="70" r="12" fill="#C5A05A"/><circle cx="80" cy="74" r="7" fill="#641E32"/><rect x="76" y="88" width="8" height="42" fill="#493B36"/><path d="M80 130c-18 10-28 8-28 8s12-8 28-16c16 8 28 16 28 16s-10 2-28-8z" fill="#8A6A32"/>`,
      bouquet: `<path d="M80 150c-8-28-6-48-6-48" stroke="#493B36" stroke-width="2"/><path d="M74 110c-16-8-24-28-18-36" stroke="#8A6A32" stroke-width="2"/><path d="M86 108c16-6 26-24 18-34" stroke="#8A6A32" stroke-width="2"/><circle cx="74" cy="62" r="14" fill="${wash}"/><circle cx="98" cy="70" r="12" fill="#D9A8B4"/><circle cx="58" cy="78" r="11" fill="#C5A05A"/><path d="M62 128h36c8 16-4 28-18 28s-26-12-18-28z" fill="#641E32"/>`,
      laddu: `<circle cx="80" cy="58" r="18" fill="${wash}" stroke="#8A6A32"/><circle cx="58" cy="88" r="18" fill="#C5A05A" stroke="#8A6A32"/><circle cx="102" cy="90" r="18" fill="#D9A8B4" stroke="#8A6A32"/><circle cx="80" cy="112" r="18" fill="#FFF7EC" stroke="#8A6A32"/>`,
      decorative: `<path d="M80 36l18 28H62z" fill="#C5A05A"/><rect x="68" y="64" width="24" height="54" fill="${wash}" stroke="#641E32"/><path d="M56 118h48l-8 18H64z" fill="#641E32"/>`,
      hamper: `<path d="M48 78h64l-6 48H54z" fill="${wash}" stroke="#493B36"/><path d="M48 78c0-18 64-18 64 0" fill="none" stroke="#493B36" stroke-width="2"/><path d="M80 60c0-16 14-24 14-24s-2 14-14 18c12-4 16 6 14 6" fill="none" stroke="#C5A05A" stroke-width="2"/><rect x="46" y="96" width="68" height="8" fill="#641E32"/>`,
      box: `<rect x="46" y="70" width="68" height="52" rx="4" fill="${wash}" stroke="#493B36"/><rect x="46" y="70" width="68" height="14" fill="#641E32"/><path d="M80 70v52" stroke="#C5A05A" stroke-width="3"/><path d="M80 70c-12-16-28-8-22 2 8 2 14 0 22-2z" fill="#C5A05A"/><path d="M80 70c12-16 28-8 22 2-8 2-14 0-22-2z" fill="#D9A8B4"/>`,
      ribbon: `<path d="M80 78c-22-28-46-10-34 8 10 4 22-2 34-8z" fill="${wash}"/><path d="M80 78c22-28 46-10 34 8-10 4-22-2-34-8z" fill="#D9A8B4"/><circle cx="80" cy="80" r="8" fill="#641E32"/><path d="M72 86l-10 36h12l6-36" fill="#C5A05A"/><path d="M88 86l10 36H86l-6-36" fill="#641E32"/>`,
      chocolate: `<rect x="50" y="58" width="60" height="70" rx="6" fill="#493B36"/><rect x="56" y="70" width="48" height="46" fill="${wash}"/><path d="M56 86h48M56 102h48M72 70v46M88 70v46" stroke="#493B36" stroke-width="1.4"/>`,
      rose: `<circle cx="80" cy="70" r="20" fill="${wash}"/><circle cx="80" cy="70" r="10" fill="#641E32"/><path d="M80 90v42" stroke="#8A6A32" stroke-width="2"/><path d="M80 110c-16 8-18 16-10 16" fill="#D9A8B4"/>`,
      perfume: `<rect x="70" y="40" width="20" height="16" rx="3" fill="#641E32"/><path d="M64 62h32l8 62H56z" fill="${wash}" stroke="#493B36"/><rect x="64" y="78" width="32" height="10" fill="#C5A05A"/>`,
      jewellery: `<circle cx="62" cy="58" r="10" fill="none" stroke="#C5A05A" stroke-width="3"/><circle cx="98" cy="58" r="10" fill="none" stroke="#C5A05A" stroke-width="3"/><path d="M62 68c0 20 8 28 8 40" stroke="#641E32" stroke-width="2"/><path d="M98 68c0 20-8 28-8 40" stroke="#641E32" stroke-width="2"/><circle cx="70" cy="112" r="6" fill="${wash}"/><circle cx="90" cy="112" r="6" fill="${wash}"/>`,
      diya: `<path d="M42 104c10 22 66 22 76 0-18 10-58 10-76 0z" fill="${wash}" stroke="#493B36"/><path d="M80 96c8-20 2-36 2-36s-4 16-10 24c10 2 14 8 8 12z" fill="#C5A05A"/><ellipse cx="80" cy="108" rx="18" ry="5" fill="#641E32" opacity="0.35"/>`,
      tray: `<ellipse cx="80" cy="112" rx="46" ry="16" fill="#C5A05A"/><ellipse cx="80" cy="106" rx="40" ry="12" fill="${wash}" stroke="#493B36"/><rect x="70" y="70" width="16" height="28" rx="3" fill="#FFF7EC" stroke="#641E32"/>`,
      dryfruit: `<path d="M48 88h64l-8 40H56z" fill="${wash}" stroke="#493B36"/><circle cx="68" cy="78" r="8" fill="#C5A05A"/><circle cx="86" cy="74" r="7" fill="#641E32"/><circle cx="100" cy="84" r="6" fill="#D9A8B4"/>`,
      sweet: `<rect x="48" y="74" width="64" height="46" rx="8" fill="#FFF7EC" stroke="#493B36"/><circle cx="68" cy="96" r="10" fill="${wash}"/><circle cx="92" cy="96" r="10" fill="#C5A05A"/>`
    };
    return `<svg class="motif" viewBox="0 0 160 180" aria-hidden="true">${parts[name] || parts.jar}</svg>`;
  }

  function stockMeta(stock) {
    if (stock === "out") {
      return { text: "Out of stock", cls: "pill-out", note: "Ready pieces are unavailable. An enquiry asks about the next making. It does not reserve anything." };
    }
    if (stock === "low") {
      return { text: "Limited", cls: "pill-low", note: "Only a few are ready. Ask AromaLuxe to confirm availability." };
    }
    return { text: "Available to enquire", cls: "pill-in", note: "" };
  }

  function defaultSelections(product) {
    const selections = {};
    (product.variants || []).forEach((group) => {
      if (group.options && group.options[0]) selections[group.label] = group.options[0].name;
    });
    return selections;
  }

  function unitPrice(product, selections) {
    if (!product || product.quoteOnly || product.price == null) return null;
    let total = product.price;
    (product.variants || []).forEach((group) => {
      const chosen = selections ? selections[group.label] : null;
      const option = (group.options || []).find((item) => item.name === chosen);
      if (option && option.add) total += option.add;
    });
    return total;
  }

  function hasSizeStep(product) {
    return (product.variants || []).some((group) => (group.options || []).some((item) => item.add > 0));
  }

  function priceBlock(product) {
    if (product.quoteOnly || product.price == null) {
      return `<p class="price-note">Quoted by the studio</p><p class="price">Price on request</p>`;
    }
    const from = hasSizeStep(product) ? "From " : "";
    const was = product.compareAt && product.compareAt > product.price
      ? `<span class="price-was">${inr(product.compareAt)}</span>`
      : "";
    return `<p class="price-note">Catalogue price</p><p class="price">${was}${from}${inr(product.price)}</p>`;
  }

  function enquiryMessage(product, options) {
    const qty = Math.max(1, Number(options.qty) || 1);
    const selections = options.selections || defaultSelections(product);
    const category = getCategory(product.category);
    const unit = unitPrice(product, selections);
    const lines = [
      "Hello AromaLuxe, I would like to enquire about a gift.",
      "",
      "Product: " + product.name,
      "Category: " + (category ? category.name : product.category),
      "Quantity: " + qty
    ];
    Object.keys(selections).forEach((label) => {
      lines.push(label + ": " + selections[label]);
    });
    if (unit == null) {
      lines.push("Price: on request. Please share a quote.");
    } else {
      lines.push("Indicative catalogue price: " + rs(unit) + " each.");
      if (qty > 1) lines.push("Indicative catalogue total for this quantity: " + rs(unit * qty) + ".");
    }
    lines.push(product.customizable ? "Customization: yes, please confirm what is possible." : "Customization: not requested on this listing.");
    lines.push(AROMALUXE.deliveryNote);
    lines.push("This website does not take payment. Please confirm availability and the final amount.");
    lines.push("— Sent from the AromaLuxe website");
    return lines.join("\n");
  }

  function productCard(product) {
    const category = getCategory(product.category);
    const stock = stockMeta(product.stock);
    const message = enquiryMessage(product, { qty: 1, selections: defaultSelections(product) });
    const discount = product.compareAt && product.price != null && product.compareAt > product.price
      ? `<span class="discount-pill">Lower listed price</span>`
      : "";
    return `<article class="product-card">
      <a class="product-visual" href="product.html?id=${esc(product.id)}">
        <span class="illus-tag">Illustration</span>
        ${discount}
        ${motif(product.motif, product.accent)}
      </a>
      <div class="product-copy">
        <p class="kicker">${esc(category ? category.short : "")}</p>
        <h3><a href="product.html?id=${esc(product.id)}">${esc(product.name)}</a></h3>
        ${priceBlock(product)}
        <p class="pill ${stock.cls}">${esc(stock.text)}</p>
        <div class="card-actions">
          <a class="btn btn-fill" target="_blank" rel="noopener" href="${esc(waLink(message))}">WhatsApp enquiry</a>
          <a class="btn btn-line" href="product.html?id=${esc(product.id)}">View details</a>
        </div>
      </div>
    </article>`;
  }

  return {
    esc, inr, rs, waLink, mailLink, motif, stockMeta,
    defaultSelections, unitPrice, priceBlock, enquiryMessage, productCard
  };
})();
