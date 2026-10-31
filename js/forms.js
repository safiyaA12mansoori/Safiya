function fieldValue(form, name) {
  const field = form.elements.namedItem(name);
  if (!field || typeof field.value !== "string") return "";
  return field.value.trim();
}

function contactMessage(form) {
  return [
    "Hello AromaLuxe, I have an enquiry from the website.",
    "",
    "Name: " + fieldValue(form, "name"),
    "Phone: " + (fieldValue(form, "phone") || "—"),
    "Email: " + (fieldValue(form, "email") || "—"),
    "",
    fieldValue(form, "message"),
    "",
    "— Sent from the contact page. This website does not store the message."
  ].join("\n");
}

function bulkMessage(form) {
  return [
    "Hello AromaLuxe, I would like to enquire about a bulk or reseller order.",
    "",
    "Name: " + fieldValue(form, "name"),
    "Business: " + (fieldValue(form, "business") || "—"),
    "Mobile: " + fieldValue(form, "phone"),
    "Email: " + (fieldValue(form, "email") || "—"),
    "City: " + fieldValue(form, "city"),
    "Type of business: " + fieldValue(form, "businessType"),
    "Products required: " + fieldValue(form, "products"),
    "Approximate quantity: " + fieldValue(form, "quantity"),
    "Budget: " + (fieldValue(form, "budget") || "To be discussed"),
    "",
    fieldValue(form, "message") || "No extra message.",
    "",
    "Please confirm whether special bulk pricing applies. This website does not calculate a discount or take payment.",
    "— Sent from the bulk orders page."
  ].join("\n");
}

function showEnquiryLinks(status, message, subject, quoteLabel) {
  status.hidden = false;
  status.replaceChildren();
  const note = document.createElement("p");
  note.textContent = "Your message is ready on this device. This website does not store it or send it for you.";
  const wa = document.createElement("a");
  wa.className = "btn btn-fill";
  wa.target = "_blank";
  wa.rel = "noopener";
  wa.href = UI.waLink(message);
  wa.textContent = quoteLabel || "Open WhatsApp";
  const mail = document.createElement("a");
  mail.className = "btn btn-line";
  mail.href = UI.mailLink(subject, message);
  mail.textContent = "Email aromaluxe993@gmail.com";
  status.append(note, wa, document.createTextNode(" "), mail);
  wa.click();
}

function initForms() {
  document.querySelectorAll("[data-enquiry-form]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const status = form.querySelector("[data-form-status]");
      if (!form.reportValidity()) return;
      const kind = form.getAttribute("data-enquiry-form");
      if (kind === "bulk") {
        showEnquiryLinks(status, bulkMessage(form), "Bulk order enquiry", "Send bulk enquiry on WhatsApp");
      } else {
        showEnquiryLinks(status, contactMessage(form), "Website enquiry", "Send enquiry on WhatsApp");
      }
    });
  });
}
