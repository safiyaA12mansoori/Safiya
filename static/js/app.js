(function () {
  const toggle = document.getElementById('nav-toggle');
  const panel = document.getElementById('nav-panel');
  const backdrop = document.getElementById('nav-backdrop');

  function setOpen(open) {
    if (!panel || !toggle) return;
    panel.classList.toggle('is-open', open);
    if (backdrop) backdrop.hidden = !open;
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  if (toggle && panel) {
    toggle.addEventListener('click', function () {
      setOpen(!panel.classList.contains('is-open'));
    });
  }
  if (backdrop) {
    backdrop.addEventListener('click', function () { setOpen(false); });
  }
  if (panel) {
    panel.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        if (window.matchMedia('(max-width: 991.98px)').matches) setOpen(false);
      });
    });
  }

  const year = document.getElementById('id_academic_year');
  const room = document.getElementById('id_classroom');
  if (year && room) {
    const options = Array.from(room.options);
    function syncRooms() {
      const selected = year.value;
      options.forEach(function (option) {
        if (!option.value) return;
        const match = !selected || option.getAttribute('data-year') === selected;
        option.hidden = !match;
        option.disabled = !match;
      });
      const current = room.selectedOptions[0];
      if (current && current.disabled) room.value = '';
    }
    year.addEventListener('change', syncRooms);
    syncRooms();
  }

  document.querySelectorAll('form').forEach(function (form) {
    form.addEventListener('submit', function (event) {
      if (!form.checkValidity()) {
        event.preventDefault();
        form.classList.add('was-validated');
      }
    });
  });
})();
