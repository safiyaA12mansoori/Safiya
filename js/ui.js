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

  function motif(name) {
    const photos = {
      jar: "assets/photos/candle.jpg",
      pillar: "assets/photos/candle.jpg",
      flower: "assets/photos/bouquet.jpg",
      bouquet: "assets/photos/bouquet.jpg",
      laddu: "assets/photos/chocolate.jpg",
      decorative: "assets/photos/candle.jpg",
      hamper: "assets/photos/hamper.jpg",
      box: "assets/photos/hamper.jpg",
      ribbon: "assets/photos/bouquet.jpg",
      chocolate: "assets/photos/chocolate.jpg",
      rose: "assets/photos/bouquet.jpg",
      perfume: "assets/photos/perfume.jpg",
      jewellery: "assets/photos/jewellery.jpg",
      diya: "assets/photos/diya.jpg",
      tray: "assets/photos/diya.jpg",
      dryfruit: "assets/photos/hamper.jpg",
      sweet: "assets/photos/chocolate.jpg"
    };
    const src = photos[name] || photos.jar;
    return `<img class="motif-photo" src="${src}" alt="">`;
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
