/* Cookie settings: on the first visit a bitten cookie floats bottom-left with the panel open above it. Once the visitor
   chooses, the cookie is eaten (it goes away for good); the footer's Cookie settings link reopens the panel later.
   Google Analytics 4 loads only after the visitor allows it. Set GA_ID to the property's Measurement ID to switch it on;
   until then the choice is still recorded, so analytics starts only for visitors who already allowed it.
   Any element with data-cookie-settings (the footer and policy-page links) opens the panel. */
(function () {
  var GA_ID = ''; // e.g. 'G-XXXXXXXXXX'
  var KEY = 'sspart-analytics-consent';
  var loaded = false;

  function saved() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function save(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }

  function load() {
    if (!GA_ID) return;
    window['ga-disable-' + GA_ID] = false;
    if (loaded) return;
    loaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { dataLayer.push(arguments); };
    gtag('js', new Date());
    gtag('config', GA_ID, { anonymize_ip: true });
    var s = document.createElement('script'); s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID; document.head.appendChild(s);
    // key events: enquiry and demo clicks, email and phone links
    document.addEventListener('click', function (e) {
      if (window['ga-disable-' + GA_ID]) return;
      var a = e.target.closest('a,button'); if (!a) return;
      var h = a.getAttribute('href') || '', t = (a.textContent || '').trim();
      if (h.indexOf('mailto:') === 0) gtag('event', 'contact_email');
      else if (h.indexOf('tel:') === 0) gtag('event', 'contact_phone');
      else if (/demo|enquiry|talk to us|get in touch/i.test(t)) gtag('event', 'generate_lead', { label: t.slice(0, 60) });
    });
    document.addEventListener('submit', function () { if (!window['ga-disable-' + GA_ID]) gtag('event', 'form_submit'); });
  }

  function forget() { // withdrawing consent: stop GA and delete its cookies on this host and its parent domain
    if (GA_ID) window['ga-disable-' + GA_ID] = true;
    var host = location.hostname, parts = host.split('.'), doms = ['', host, '.' + host];
    if (parts.length > 2) doms.push('.' + parts.slice(-2).join('.'));
    document.cookie.split(';').forEach(function (c) {
      var n = c.split('=')[0].trim(); if (!/^_ga/.test(n)) return;
      doms.forEach(function (d) { document.cookie = n + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/' + (d ? '; domain=' + d : ''); });
    });
  }

  if (saved() === 'yes') load();

  // the bite is a row of shark teeth, after the SSPART mark
  var COOKIE = '<svg viewBox="0 0 48 48" aria-hidden="true"><defs><mask id="cc-bite">' +
    '<rect width="48" height="48" fill="#fff"/>' +
    '<path d="M48,0 L23.0,2.2 L28.1,4.4 L23.5,7.5 L28.9,8.4 L25.1,12.4 L30.6,12.1 L27.9,16.9 L33.2,15.2 L31.7,20.5 L36.4,17.7 L36.3,23.2 L40.2,19.3 L41.3,24.7 L44.2,20.0 L46.5,24.9 L48,48Z" fill="#000"/>' +
    '</mask></defs><g mask="url(#cc-bite)"><circle cx="24" cy="24" r="20" fill="currentColor"/>' +
    '<g fill="#fff" opacity=".88"><rect x="12" y="14" width="5" height="4" rx="1.6" transform="rotate(-18 14.5 16)"/>' +
    '<rect x="21" y="23" width="5.5" height="4" rx="1.6" transform="rotate(24 23.7 25)"/><rect x="11" y="28" width="4.5" height="3.6" rx="1.5"/>' +
    '<rect x="29" y="31" width="5" height="4" rx="1.6" transform="rotate(-30 31.5 33)"/><rect x="19" y="35" width="4" height="3.4" rx="1.4"/>' +
    '<circle cx="23" cy="13" r="1.5"/><circle cx="34" cy="25" r="1.4"/></g></g></svg>';

  var root = document.createElement('div');
  root.className = 'cc';
  root.innerHTML =
    '<section class="cc-panel" id="cc-panel" role="dialog" aria-labelledby="cc-title" aria-describedby="cc-lede" hidden>' +
      '<h2 id="cc-title">Cookie settings <span class="cc-hand">your call</span></h2>' +
      '<p id="cc-lede">This site sets no cookies until you allow them. You can change your mind here at any time.</p>' +
      '<dl class="cc-rows">' +
        '<div><dt>Essential</dt><dd>Remembers the choice you make here, in your browser, not in a cookie.</dd><dd class="cc-state is-on">Always on</dd></div>' +
        '<div><dt>Analytics</dt><dd>Google Analytics counts visits so we can see which pages help. Sets <code>_ga</code> cookies for up to 14 months.</dd><dd class="cc-state" data-analytics></dd></div>' +
      '</dl>' +
      '<div class="cc-actions"><button type="button" class="btn" data-c="no">Essential only</button>' +
      '<button type="button" class="btn btn-solid" data-c="yes">Allow analytics</button></div>' +
      '<a class="cc-policy" href="cookies.html">Read the cookies policy</a>' +
    '</section>' +
    '<button type="button" class="cc-cookie" aria-controls="cc-panel" aria-expanded="false" aria-label="Cookie settings">' + COOKIE + '</button>';

  var panel = root.querySelector('.cc-panel'), cookie = root.querySelector('.cc-cookie'), state = root.querySelector('[data-analytics]');
  var hideTimer, opener = null;
  var still = function () { return matchMedia('(prefers-reduced-motion: reduce)').matches; };

  function render() {
    var v = saved();
    state.textContent = v === 'yes' ? 'Allowed' : v === 'no' ? 'Off' : 'Off until you allow it';
    state.classList.toggle('is-on', v === 'yes');
  }
  function open(focus) {
    clearTimeout(hideTimer); render(); panel.hidden = false;
    requestAnimationFrame(function () { root.classList.add('is-open'); });
    cookie.setAttribute('aria-expanded', 'true');
    if (focus) panel.querySelector('[data-c="yes"]').focus({ preventScroll: true });
  }
  function close() {
    if (panel.hidden) return;
    root.classList.remove('is-open'); cookie.setAttribute('aria-expanded', 'false');
    hideTimer = setTimeout(function () { panel.hidden = true; }, still() ? 0 : 220);
    var back = opener && document.contains(opener) ? opener : cookie.hidden ? null : cookie;
    opener = null; if (back) back.focus({ preventScroll: true });
  }
  function eat() { // a choice was made: the cookie is eaten and stays gone; the footer link takes over
    if (cookie.hidden) return;
    root.classList.add('is-chosen');
    setTimeout(function () { cookie.hidden = true; }, still() ? 0 : 420);
  }

  panel.addEventListener('click', function (e) {
    var c = e.target.closest('[data-c]'); if (!c) return;
    var v = c.getAttribute('data-c'); save(v);
    if (v === 'yes') load(); else forget();
    render(); close(); eat();
  });
  cookie.addEventListener('click', function () { panel.hidden ? open(true) : close(); });
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-cookie-settings]');
    if (t) { e.preventDefault(); opener = t; open(true); return; }
    if (!panel.hidden && saved() && !root.contains(e.target)) close(); // the first-visit prompt stays until answered
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !panel.hidden) close();
  });

  if (saved()) { cookie.hidden = true; root.classList.add('is-chosen'); }
  document.body.appendChild(root);
  if (!saved()) open(false); // first visit: ask, without stealing focus
})();
