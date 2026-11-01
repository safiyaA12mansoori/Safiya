function initChrome() {
  const year = document.querySelector("#year");
  if (year) year.textContent = String(new Date().getFullYear());
  const page = document.body.dataset.page || "";
  document.querySelectorAll("[data-nav]").forEach((link) => {
    const on = link.dataset.nav === page;
    link.classList.toggle("is-current", on);
    if (on) link.setAttribute("aria-current", "page");
  });
  const toggle = document.querySelector(".nav-toggle");
  const menu = document.getElementById("site-nav");
  if (toggle && menu) {
    toggle.addEventListener("click", () => {
      const open = menu.classList.toggle("show");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    menu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        if (!window.matchMedia("(max-width: 1199px)").matches) return;
        menu.classList.remove("show");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initChrome();
  if (typeof initBestsellers === "function") initBestsellers();
  if (typeof initShop === "function") initShop();
  if (typeof initProduct === "function") initProduct();
  if (typeof initHamper === "function") initHamper();
  if (typeof initForms === "function") initForms();
});
