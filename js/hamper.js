const HAMPER_STORAGE_KEY = "aromaluxe-hamper";

function evaluateHamper(input) {
  const blocks = [];
  if (input.box && input.box.quoteOnly) blocks.push("The selected box is quoted by AromaLuxe.");
  (input.lines || []).forEach((line) => {
    if (line.product.quoteOnly || line.unit == null) {
      blocks.push(line.product.name + " is quoted by AromaLuxe.");
    }
  });
  if (input.needsConfirm) blocks.push("Custom details need confirmation.");
  if (input.photoName) blocks.push("A reference photo needs the studio to look at it.");
  const quote = blocks.length > 0;
  let total = null;
  if (!quote && input.box && input.box.price != null) {
    total = input.box.price;
    (input.lines || []).forEach((line) => {
      total += line.unit * line.qty;
    });
  }
  return { quote, total, blocks };
}

function hamperMessage(input, evaluation) {
  const lines = [
    evaluation.quote
      ? "Hello AromaLuxe, I would like to request a custom quote for a hamper."
      : "Hello AromaLuxe, I would like to enquire about a custom hamper.",
    ""
  ];
  lines.push(input.box ? "Gift box: " + input.box.name : "Gift box: not chosen yet");
  if (input.box) {
    lines.push(input.box.quoteOnly || input.box.price == null
      ? "Box price: on request"
      : "Box catalogue price: " + UI.rs(input.box.price));
  }
  lines.push(input.pack ? "Packaging: " + input.pack.name : "Packaging: not chosen yet");
  lines.push("Budget guide: " + (input.budget ? input.budget.name : "Not sure yet"));
  lines.push("Recipient: " + (input.recipient || "—"));
  lines.push("");
  lines.push("Selections:");
  if (!input.lines.length) {
    lines.push("- None yet");
  } else {
    input.lines.forEach((line) => {
      const cost = line.unit == null ? "price on request" : UI.rs(line.unit * line.qty) + " indicative";
      lines.push("- " + line.product.name + " × " + line.qty + " — " + cost);
    });
  }
  lines.push("");
  if (evaluation.quote) {
    lines.push("Please quote this hamper. A total is not shown because something still needs confirmation.");
    evaluation.blocks.forEach((reason) => lines.push("- " + reason));
  } else if (evaluation.total != null) {
    lines.push("Indicative catalogue total: " + UI.rs(evaluation.total) + ".");
    lines.push("This is not a payment and not a confirmed invoice.");
  }
  if (input.budget && input.budget.max && evaluation.total != null && evaluation.total > input.budget.max) {
    lines.push("This selection is above my budget guide. Please suggest a smaller combination if you can.");
  }
  if (input.note) {
    lines.push("");
    lines.push("Message for the card:");
    lines.push(input.note);
  }
  if (input.photoName) {
    lines.push("");
    lines.push("Reference photo: I have one ready to send in this chat (" + input.photoName + "). It was not uploaded to the website.");
  }
  lines.push("");
  lines.push(AROMALUXE.deliveryNote);
  lines.push("— Sent from the AromaLuxe hamper page");
  return lines.join("\n");
}

function readHamperStorage() {
  try {
    return JSON.parse(window.sessionStorage.getItem(HAMPER_STORAGE_KEY) || "{}");
  } catch (error) {
    return {};
  }
}

function writeHamperStorage(state) {
  try {
    window.sessionStorage.setItem(HAMPER_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    /* Private browsing can block storage. The page still prepares the enquiry. */
  }
}

function initHamper() {
  const form = document.querySelector("#hamper-form");
  if (!form) return;
  const boxMount = document.querySelector("#box-options");
  const budgetMount = document.querySelector("#budget-options");
  const packMount = document.querySelector("#pack-options");
  const groupMounts = {
    style: document.querySelector("#hamper-style"),
    sweets: document.querySelector("#hamper-sweets"),
    candles: document.querySelector("#hamper-candles")
  };
  const summary = document.querySelector("#hamper-summary");
  const preview = document.querySelector("#hamper-preview");
  const status = document.querySelector("#hamper-status");
  const submit = document.querySelector("#hamper-submit");
  const photo = document.querySelector("#hamper-photo");
  const photoPreview = document.querySelector("#hamper-photo-preview");
  const saved = readHamperStorage();
  let photoUrl = "";

  boxMount.innerHTML = HAMPER_BOXES.map((box) => `
    <label class="choice">
      <input type="radio" name="box" value="${UI.esc(box.id)}" ${saved.box === box.id ? "checked" : ""}>
      <span><strong>${UI.esc(box.name)}</strong><br>${UI.esc(box.detail)}<br>${box.quoteOnly ? "Price on request" : UI.inr(box.price) + " catalogue price"}</span>
    </label>`).join("");

  budgetMount.innerHTML = BUDGETS.map((budget, index) => `
    <label class="choice">
      <input type="radio" name="budget" value="${UI.esc(budget.id)}" ${(saved.budget || "unsure") === budget.id || (!saved.budget && index === 0) ? "checked" : ""}>
      <span>${UI.esc(budget.name)}</span>
    </label>`).join("");

  if (packMount) {
    packMount.innerHTML = PACKAGING.map((pack) => `
      <label class="choice">
        <input type="radio" name="pack" value="${UI.esc(pack.id)}" ${saved.pack === pack.id ? "checked" : ""}>
        <span><strong>${UI.esc(pack.name)}</strong><br>${UI.esc(pack.detail)}</span>
      </label>`).join("");
  }

  function hamperItems(groupId) {
    const addons = (typeof CUSTOM_ADDONS === "undefined" ? [] : CUSTOM_ADDONS).filter((item) => item.group === groupId);
    const products = PRODUCTS.filter((product) => product.hamperGroup === groupId);
    return addons.concat(products);
  }

  function groupHtml(group) {
    const items = hamperItems(group.id);
    if (!items.length) return "";
    const rows = items.map((product) => {
      const qty = saved.qty && saved.qty[product.id] ? saved.qty[product.id] : 0;
      const label = product.quoteOnly || product.price == null ? "Price on request" : UI.inr(product.price);
      return `<div class="line-row">
        ${UI.motif(product)}
        <label>${UI.esc(product.name)}<br><span class="fine-print">${label}</span>
          <span class="visually-hidden">Quantity</span></label>
        <input class="line-price" aria-label="Quantity for ${UI.esc(product.name)}" data-qty="${UI.esc(product.id)}" type="number" min="0" max="12" value="${UI.esc(qty)}">
      </div>`;
    }).join("");
    return `<section class="group-block"><h3>${UI.esc(group.name)}</h3><p class="fine-print">${UI.esc(group.copy)}</p>${rows}</section>`;
  }

  const mountFor = { fragrance: "style", jewellery: "style", chocolates: "sweets", candles: "candles" };
  Object.keys(groupMounts).forEach((key) => {
    if (!groupMounts[key]) return;
    groupMounts[key].innerHTML = HAMPER_GROUPS.filter((group) => mountFor[group.id] === key).map(groupHtml).join("");
  });

  const recipient = form.elements.recipient;
  const note = form.elements.note;
  const needsConfirm = form.elements.needsConfirm;
  if (saved.recipient) recipient.value = saved.recipient;
  if (saved.note) note.value = saved.note;
  if (saved.needsConfirm) needsConfirm.checked = true;

  function currentPhotoName() {
    const file = photo.files && photo.files[0];
    return file ? file.name : "";
  }

  function collect() {
    const boxId = (form.elements.box.value || "");
    const budgetId = (form.elements.budget.value || "unsure");
    const packId = form.elements.pack ? form.elements.pack.value : "";
    const box = HAMPER_BOXES.find((item) => item.id === boxId) || null;
    const pack = (typeof PACKAGING === "undefined" ? [] : PACKAGING).find((item) => item.id === packId) || null;
    const budget = BUDGETS.find((item) => item.id === budgetId) || BUDGETS[0];
    const lines = [];
    const qtyMap = {};
    form.querySelectorAll("[data-qty]").forEach((input) => {
      let qty = Number(input.value);
      if (!Number.isFinite(qty) || qty < 0) qty = 0;
      if (qty > 12) qty = 12;
      input.value = String(qty);
      if (!qty) return;
      const product = findCatalogueItem(input.getAttribute("data-qty"));
      if (!product) return;
      qtyMap[product.id] = qty;
      lines.push({ product, qty, unit: UI.unitPrice(product, UI.defaultSelections(product)) });
    });
    return {
      box,
      pack,
      budget,
      lines,
      qtyMap,
      recipient: recipient.value.trim(),
      note: note.value.trim(),
      needsConfirm: needsConfirm.checked,
      photoName: currentPhotoName()
    };
  }

  function render() {
    const input = collect();
    writeHamperStorage({
      box: input.box ? input.box.id : "",
      pack: input.pack ? input.pack.id : "",
      budget: input.budget ? input.budget.id : "unsure",
      qty: input.qtyMap,
      recipient: input.recipient,
      note: input.note,
      needsConfirm: input.needsConfirm
    });
    const evaluation = evaluateHamper(input);
    const message = hamperMessage(input, evaluation);
    const bits = [];
    if (!input.box) bits.push("<p>Choose a gift box to start.</p>");
    else bits.push(`<p><strong>Box.</strong> ${UI.esc(input.box.name)}</p>`);
    if (input.pack) bits.push(`<p><strong>Packaging.</strong> ${UI.esc(input.pack.name)}</p>`);
    if (!input.lines.length) bits.push("<p>Add at least one product.</p>");
    else {
      bits.push("<ul>" + input.lines.map((line) => `<li>${UI.esc(line.product.name)} × ${line.qty}</li>`).join("") + "</ul>");
    }
    if (evaluation.quote) {
      bits.push(`<p class="total">Amount confirmed by AromaLuxe</p><p class="fine-print">${evaluation.blocks.map(UI.esc).join(" ")}</p>`);
      submit.textContent = "Submit on WhatsApp";
    } else if (evaluation.total != null) {
      bits.push(`<p class="price-note">Indicative total</p><p class="total">${UI.inr(evaluation.total)}</p><p class="fine-print">A catalogue total to discuss on WhatsApp. It is not a charge.</p>`);
      submit.textContent = "Submit on WhatsApp";
      if (input.budget && input.budget.max && evaluation.total > input.budget.max) {
        bits.push("<p>This is above your budget guide. Lower a quantity, or ask the studio for another combination.</p>");
      }
    }
    summary.innerHTML = bits.join("");
    preview.textContent = message;
    return { input, evaluation, message };
  }

  form.addEventListener("input", render);
  form.addEventListener("change", render);

  photo.addEventListener("change", () => {
    const file = photo.files && photo.files[0];
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    photoUrl = "";
    if (!file || !file.type.startsWith("image/")) {
      photo.value = "";
      photoPreview.hidden = true;
      if (file) status.textContent = "Please choose an image file. It stays on this device.";
      render();
      return;
    }
    photoUrl = URL.createObjectURL(file);
    photoPreview.src = photoUrl;
    photoPreview.hidden = false;
    render();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const result = render();
    const errors = [];
    if (!result.input.box) errors.push("Choose a gift box.");
    if (!result.input.pack) errors.push("Choose packaging.");
    if (!result.input.lines.length) errors.push("Add at least one product.");
    if (result.input.recipient.length < 2) errors.push("Add the recipient’s name.");
    status.hidden = false;
    status.replaceChildren();
    if (errors.length) {
      const list = document.createElement("ul");
      errors.forEach((error) => {
        const item = document.createElement("li");
        item.textContent = error;
        list.appendChild(item);
      });
      status.append("The enquiry is not ready yet.", list);
      return;
    }
    const wa = document.createElement("a");
    wa.className = "btn btn-fill";
    wa.target = "_blank";
    wa.rel = "noopener";
    wa.href = UI.waLink(result.message);
    wa.textContent = "Submit on WhatsApp";
    const mail = document.createElement("a");
    mail.className = "btn btn-line";
    mail.href = UI.mailLink(result.evaluation.quote ? "Custom hamper quote" : "Custom hamper enquiry", result.message);
    mail.textContent = "Email this instead";
    const note = document.createElement("p");
    note.textContent = "Nothing is stored on a server and nothing is charged. Send the message yourself. If you chose a reference photo, attach it inside the WhatsApp chat.";
    status.append(note, wa, document.createTextNode(" "), mail);
    wa.click();
  });

  document.querySelector("#hamper-clear").addEventListener("click", () => {
    form.querySelectorAll("[data-qty]").forEach((input) => { input.value = "0"; });
    form.querySelectorAll('input[name="box"]').forEach((input) => { input.checked = false; });
    form.querySelectorAll('input[name="pack"]').forEach((input) => { input.checked = false; });
    const unsure = form.querySelector('input[name="budget"][value="unsure"]');
    if (unsure) unsure.checked = true;
    recipient.value = "";
    note.value = "";
    needsConfirm.checked = false;
    photo.value = "";
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    photoUrl = "";
    photoPreview.hidden = true;
    try { window.sessionStorage.removeItem(HAMPER_STORAGE_KEY); } catch (error) { /* ignore */ }
    status.hidden = true;
    render();
  });

  render();
}
