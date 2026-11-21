/*
 * Email button helper.
 *
 * A plain mailto: link only works if the visitor's computer has a default
 * email app set up. Many desktop visitors use Gmail or Outlook in the browser
 * instead, so clicking the button does nothing for them.
 *
 * On desktop, this intercepts clicks on mailto: links and offers a choice:
 * Gmail, Outlook, the default email app, or copying the address. The subject
 * and pre-written questions are carried over to every option.
 * On phones and tablets mailto: works reliably, so links are left alone.
 */
(function () {
  if (!window.HTMLDialogElement) return; // very old browsers: keep plain mailto

  function parseMailto(href) {
    var rest = href.replace(/^mailto:/i, '');
    var q = rest.indexOf('?');
    var to = decodeURIComponent(q === -1 ? rest : rest.slice(0, q));
    var params = { subject: '', body: '' };
    if (q !== -1) {
      rest.slice(q + 1).split('&').forEach(function (pair) {
        var i = pair.indexOf('=');
        if (i === -1) return;
        var key = pair.slice(0, i).toLowerCase();
        try { params[key] = decodeURIComponent(pair.slice(i + 1)); } catch (e) { params[key] = pair.slice(i + 1); }
      });
    }
    return { to: to, subject: params.subject || '', body: params.body || '' };
  }

  function qs(obj) {
    return Object.keys(obj).map(function (k) {
      return k + '=' + encodeURIComponent(obj[k]);
    }).join('&');
  }

  var css =
    '.hl-mail{border:none;padding:0;border-radius:18px;max-width:min(420px,calc(100vw - 32px));width:100%;' +
    "font-family:'Google Sans',system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:#050D0A;" +
    'box-shadow:0 24px 60px rgba(5,13,10,.22)}' +
    '.hl-mail::backdrop{background:rgba(5,13,10,.45)}' +
    '.hl-mail-inner{padding:26px 24px 22px}' +
    '.hl-mail h2{margin:0;font-size:20px;font-weight:500;line-height:1.3}' +
    '.hl-mail p{margin:8px 0 0;font-size:15px;line-height:1.5;color:#5A6560}' +
    '.hl-mail-list{margin:20px 0 0;display:grid;gap:8px}' +
    '.hl-mail-opt{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:50px;padding:0 18px;' +
    'border:1px solid #DDE3DF;border-radius:999px;background:#FFFFFF;color:#050D0A;font:inherit;font-size:16px;' +
    'font-weight:500;text-decoration:none;cursor:pointer;text-align:left;width:100%;box-sizing:border-box}' +
    '.hl-mail-opt:hover{border-color:#00B67A;background:#F3FBF8;color:#050D0A}' +
    '.hl-mail-opt small{font-size:13px;font-weight:400;color:#5A6560}' +
    '.hl-mail-close{margin-top:16px;background:none;border:none;padding:8px 0;font:inherit;font-size:15px;color:#5A6560;cursor:pointer}' +
    '.hl-mail-close:hover{color:#050D0A}';

  var dialog, copyBtn, copyNote, current;

  function build() {
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    dialog = document.createElement('dialog');
    dialog.className = 'hl-mail';
    dialog.setAttribute('aria-labelledby', 'hl-mail-title');
    dialog.innerHTML =
      '<div class="hl-mail-inner">' +
      '<h2 id="hl-mail-title">How would you like to send it?</h2>' +
      '<p>The subject and questions are already filled in.</p>' +
      '<div class="hl-mail-list">' +
      '<a class="hl-mail-opt" data-mail="gmail" target="_blank" rel="noopener">Gmail</a>' +
      '<a class="hl-mail-opt" data-mail="outlook-work" target="_blank" rel="noopener">Outlook <small>work or school</small></a>' +
      '<a class="hl-mail-opt" data-mail="outlook-personal" target="_blank" rel="noopener">Outlook.com <small>Hotmail, Live</small></a>' +
      '<a class="hl-mail-opt" data-mail="app">Email app on this computer</a>' +
      '<button type="button" class="hl-mail-opt" data-mail="copy">Copy email address <small data-copy-note></small></button>' +
      '</div>' +
      '<button type="button" class="hl-mail-close">Cancel</button>' +
      '</div>';
    document.body.appendChild(dialog);

    copyBtn = dialog.querySelector('[data-mail="copy"]');
    copyNote = dialog.querySelector('[data-copy-note]');

    dialog.querySelector('.hl-mail-close').addEventListener('click', function () { dialog.close(); });
    // Click on the backdrop closes the dialog.
    dialog.addEventListener('click', function (e) { if (e.target === dialog) dialog.close(); });
    // Close after choosing a provider (the new tab / app takes over).
    Array.prototype.forEach.call(dialog.querySelectorAll('a.hl-mail-opt'), function (a) {
      a.addEventListener('click', function () { setTimeout(function () { dialog.close(); }, 0); });
    });
    copyBtn.addEventListener('click', function () { copy(current.to); });
  }

  function copy(text) {
    function done() { copyNote.textContent = 'Copied'; }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, fallback);
    } else {
      fallback();
    }
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      dialog.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { copyNote.textContent = text; }
      dialog.removeChild(ta);
    }
  }

  function open(href) {
    if (!dialog) build();
    current = parseMailto(href);
    var m = current;
    dialog.querySelector('[data-mail="gmail"]').href =
      'https://mail.google.com/mail/?' + qs({ view: 'cm', fs: '1', to: m.to, su: m.subject, body: m.body });
    dialog.querySelector('[data-mail="outlook-work"]').href =
      'https://outlook.office.com/mail/deeplink/compose?' + qs({ to: m.to, subject: m.subject, body: m.body });
    dialog.querySelector('[data-mail="outlook-personal"]').href =
      'https://outlook.live.com/mail/0/deeplink/compose?' + qs({ to: m.to, subject: m.subject, body: m.body });
    dialog.querySelector('[data-mail="app"]').href = href;
    copyNote.textContent = m.to;
    dialog.showModal();
  }

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href^="mailto:"]');
    if (!a || a.closest('.hl-mail')) return;
    // Phones and tablets handle mailto: well; only step in on desktop.
    if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return;
    e.preventDefault();
    open(a.href);
  });
})();
