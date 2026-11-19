/**
 * Apply the saved appearance before the page paints.
 * Reads tuitionErp.theme only. Light is the default. This file never writes.
 */
(function () {
  var mode = 'light';
  try {
    if (localStorage.getItem('tuitionErp.theme') === 'dark') mode = 'dark';
  } catch (err) {
    mode = 'light';
  }
  if (mode === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  else document.documentElement.removeAttribute('data-theme');
})();
