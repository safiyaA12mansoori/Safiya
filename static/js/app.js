(function () {
  const root = document.documentElement;
  const saved = localStorage.getItem("campus-theme") || "light";
  root.dataset.theme = saved;
  root.dataset.bsTheme = saved;
  if (localStorage.getItem("campus-sidebar") === "collapsed") {
    document.body.classList.add("sidebar-collapsed");
  }
  document.getElementById("theme-toggle")?.addEventListener("click", function () {
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    root.dataset.bsTheme = next;
    localStorage.setItem("campus-theme", next);
    window.dispatchEvent(new Event("themechange"));
  });
  document.getElementById("sidebar-toggle")?.addEventListener("click", function () {
    if (window.innerWidth < 992) {
      document.getElementById("sidebar")?.classList.toggle("show");
      return;
    }
    document.body.classList.toggle("sidebar-collapsed");
    localStorage.setItem("campus-sidebar", document.body.classList.contains("sidebar-collapsed") ? "collapsed" : "open");
  });
  document.querySelectorAll(".toast").forEach(function (node) {
    new bootstrap.Toast(node, { delay: 4000 }).show();
  });
  const modalEl = document.getElementById("confirmModal");
  if (modalEl) {
    const modal = new bootstrap.Modal(modalEl);
    let pending = null;
    document.addEventListener("submit", function (event) {
      const form = event.target;
      const trigger = event.submitter;
      const message = trigger?.dataset.confirm || form.dataset.confirm;
      if (!message || form.dataset.confirmed === "1") return;
      event.preventDefault();
      pending = { form: form, submitter: trigger };
      modalEl.querySelector(".confirm-text").textContent = message;
      modal.show();
    });
    document.getElementById("confirmYes")?.addEventListener("click", function () {
      if (!pending) return;
      pending.form.dataset.confirmed = "1";
      if (pending.submitter) pending.form.requestSubmit(pending.submitter);
      else pending.form.submit();
    });
  }
  document.querySelectorAll("[data-chart]").forEach(drawChart);
  window.addEventListener("themechange", function () {
    document.querySelectorAll("[data-chart]").forEach(drawChart);
  });
  function drawChart(node) {
    if (typeof Chart === "undefined") return;
    const payload = JSON.parse(node.dataset.chart);
    node.parentElement?.classList.add("chart-ready");
    if (node._chart) node._chart.destroy();
    const color = getComputedStyle(document.body).color;
    node._chart = new Chart(node, {
      type: payload.type || "bar",
      data: { labels: payload.labels || [], datasets: payload.datasets || [] },
      options: {
        responsive: true,
        plugins: { legend: { labels: { color: color } } },
        scales: payload.type === "doughnut" ? {} : {
          x: { ticks: { color: color }, grid: { display: false } },
          y: { ticks: { color: color }, beginAtZero: true },
        },
      },
    });
  }
  const token = document.querySelector("meta[name=csrf-token]")?.content;
  if (token) {
    fetch("/api/notifications/", { headers: { "X-Requested-With": "XMLHttpRequest" } })
      .then(function (response) { return response.ok ? response.json() : null; })
      .then(function (data) {
        const badge = document.getElementById("unread-badge");
        if (!data || !badge) return;
        badge.textContent = data.unread;
        badge.style.display = data.unread ? "inline-block" : "none";
      })
      .catch(function () {});
  }
})();
