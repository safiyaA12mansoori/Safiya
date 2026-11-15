(function () {
  const form = document.getElementById("attempt-form");
  if (!form) return;
  const panels = Array.from(form.querySelectorAll(".q-panel"));
  const palette = document.getElementById("palette");
  const timer = document.getElementById("timer");
  let index = 0;
  function paint() {
    panels.forEach(function (panel, i) {
      panel.classList.toggle("active", i === index);
    });
    palette?.querySelectorAll("button").forEach(function (button, i) {
      const panel = panels[i];
      const answered = !!panel.querySelector("input[type=radio]:checked");
      const review = !!panel.querySelector("input[type=checkbox]:checked");
      button.classList.toggle("current", i === index);
      button.classList.toggle("answered", answered);
      button.classList.toggle("review", review);
    });
  }
  panels.forEach(function (panel, i) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = String(i + 1);
    button.addEventListener("click", function () { index = i; paint(); });
    palette?.appendChild(button);
  });
  document.getElementById("prev-q")?.addEventListener("click", function () {
    index = Math.max(0, index - 1); paint();
  });
  document.getElementById("next-q")?.addEventListener("click", function () {
    index = Math.min(panels.length - 1, index + 1); paint();
  });
  paint();
  let left = parseInt(timer?.dataset.seconds || "0", 10);
  function tick() {
    if (!timer) return;
    const m = Math.floor(Math.max(left, 0) / 60);
    const s = Math.max(left, 0) % 60;
    timer.textContent = String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
    if (left <= 0) {
      const action = document.getElementById("exam-action");
      if (action) action.value = "submit";
      form.dataset.confirmed = "1";
      form.submit();
      return;
    }
    left -= 1;
    setTimeout(tick, 1000);
  }
  tick();
  const csrf = document.querySelector("meta[name=csrf-token]")?.content;
  form.addEventListener("change", function (event) {
    const box = event.target.closest(".q-panel");
    if (!box || !form.dataset.saveUrl) return;
    const radio = box.querySelector("input[type=radio]:checked");
    const review = box.querySelector("input[type=checkbox]");
    fetch(form.dataset.saveUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRFToken": csrf },
      body: JSON.stringify({ key: box.dataset.key, option: radio ? radio.value : "", review: !!(review && review.checked) }),
    }).then(function (response) {
      const note = document.getElementById("save-state");
      if (note) note.textContent = response.ok ? "Saved" : "Could not save";
    }).catch(function () {
      const note = document.getElementById("save-state");
      if (note) note.textContent = "Saved on this device; submit still sends every answer";
    });
    paint();
  });
})();
