/* Page behaviour that is not animation: the cue builder and the "Copy email address" button.
   Everything here works without GSAP. When the motion layer is running it exposes
   window.RetuneMotion.swapText, which this file uses to ease text changes in. */

/* Cue builder: "After I ___, I'll ___." Runs only in the browser; nothing is stored or sent. */
(function () {
  'use strict';
  [['cue-a', 'cue-a-out'], ['cue-b', 'cue-b-out']].forEach(function (pair) {
    var out = document.getElementById(pair[1]);
    var inputs = document.querySelectorAll('input[name="' + pair[0] + '"]');
    if (!out || !inputs.length) return;
    Array.prototype.forEach.call(inputs, function (input) {
      input.addEventListener('change', function () {
        if (!input.checked || out.textContent === input.value) return;
        var m = window.RetuneMotion;
        if (m && typeof m.swapText === 'function') m.swapText(out, input.value);
        else out.textContent = input.value;
      });
    });
  });
})();

/* Copy email address (unchanged logic from the live site). */
(function () {
  'use strict';
  var btn = document.getElementById('copy-btn');
  var out = document.getElementById('copied');
  var addr = document.getElementById('addr');
  if (!btn || !out || !addr) return;

  function selectAddr() {
    try {
      var r = document.createRange();
      r.selectNodeContents(addr);
      var s = window.getSelection();
      s.removeAllRanges();
      s.addRange(r);
    } catch (e) { /* selection is best-effort */ }
  }

  btn.addEventListener('click', function () {
    var text = addr.textContent.trim();
    var fallback = function () { selectAddr(); out.textContent = 'Selected. Copy it from your menu.'; };
    try {
      navigator.clipboard.writeText(text).then(function () { out.textContent = 'Copied: ' + text; }, fallback);
    } catch (e) { fallback(); }
  });
})();

/* Pilot form: one tap sends one sign-up. On a slow phone connection the page can take a few seconds
   to move to "thanks", and every extra tap of "Ask to join" sent the form again (doubles and triples
   seen 17-24 Nov 2026). The first valid submit goes through as normal; later taps are ignored.
   Coming back with the Back button restores the button so the form can be sent again on purpose. */
(function () {
  'use strict';
  var form = document.querySelector('form[name="pilot"]');
  if (!form) return;
  var btn = form.querySelector('button[type="submit"]');
  var label = btn ? btn.textContent : '';
  var sending = false;
  form.addEventListener('submit', function (e) {
    if (sending) { e.preventDefault(); return; }
    sending = true;
    if (btn) { btn.setAttribute('aria-disabled', 'true'); btn.textContent = 'Sending…'; }
  });
  window.addEventListener('pageshow', function (e) {
    if (!e.persisted) return;
    sending = false;
    if (btn) { btn.removeAttribute('aria-disabled'); btn.textContent = label; }
  });
})();
