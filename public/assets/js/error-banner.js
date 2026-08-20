// --- on-screen error reporter (separate block so it runs even if the main script fails) ---
  (function () {
    function show(msg) {
      try {
        var el = document.getElementById('errBanner');
        if (!el) {
          el = document.createElement('div');
          el.id = 'errBanner';
          el.style.cssText = 'position:fixed;left:0;right:0;bottom:0;background:#b00020;color:#fff;font:12px/1.5 monospace;padding:8px 12px;z-index:99999;white-space:pre-wrap;direction:ltr;text-align:left;';
          document.body.appendChild(el);
        }
        el.textContent = 'JS Error: ' + msg;
      } catch (e) { }
    }
    window.addEventListener('error', function (ev) {
      show((ev && ev.message) + '  [line ' + (ev && ev.lineno) + ']');
    });
    window.addEventListener('unhandledrejection', function (ev) {
      var r = ev && ev.reason;
      show('Promise Error: ' + (r && r.message ? r.message : String(r)));
    });
  })();
