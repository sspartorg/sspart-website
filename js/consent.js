/* Google Analytics 4, loaded only after the visitor accepts. Set GA_ID to the property's Measurement ID to switch it on. */
(function () {
  var GA_ID = ''; // e.g. 'G-XXXXXXXXXX'; empty keeps analytics and the banner off
  if (!GA_ID) return;
  var KEY = 'sspart-analytics-consent';
  function load() {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { dataLayer.push(arguments); };
    gtag('js', new Date());
    gtag('config', GA_ID, { anonymize_ip: true });
    var s = document.createElement('script'); s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID; document.head.appendChild(s);
    // key events: enquiry and demo clicks, email and phone links
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a,button'); if (!a) return;
      var h = a.getAttribute('href') || '', t = (a.textContent || '').trim();
      if (h.indexOf('mailto:') === 0) gtag('event', 'contact_email');
      else if (h.indexOf('tel:') === 0) gtag('event', 'contact_phone');
      else if (/demo|enquiry|talk to us|get in touch/i.test(t)) gtag('event', 'generate_lead', { label: t.slice(0, 60) });
    });
    document.addEventListener('submit', function () { gtag('event', 'form_submit'); });
  }
  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) {}
  if (saved === 'yes') return load();
  if (saved === 'no') return;
  var bar = document.createElement('div');
  bar.setAttribute('role', 'dialog'); bar.setAttribute('aria-label', 'Analytics consent');
  bar.style.cssText = 'position:fixed;left:16px;right:16px;bottom:16px;z-index:9999;max-width:560px;margin:0 auto;background:#fff;color:#0b1026;border:1px solid #e3e6f0;border-radius:12px;box-shadow:0 8px 30px rgba(2,18,85,.18);padding:16px 18px;font:14px/1.5 Overpass,Arial,sans-serif';
  bar.innerHTML = 'We would like to use Google Analytics to see which pages help visitors. It sets cookies only if you accept. <a href="cookies.html" style="color:#021255">Cookies policy</a>' +
    '<div style="margin-top:10px;display:flex;gap:8px;justify-content:flex-end"><button data-c="no" style="padding:8px 14px;border-radius:8px;border:1px solid #e3e6f0;background:#fff;color:#0b1026;cursor:pointer">Decline</button>' +
    '<button data-c="yes" style="padding:8px 14px;border-radius:8px;border:0;background:#021255;color:#fff;cursor:pointer">Accept</button></div>';
  bar.addEventListener('click', function (e) {
    var c = e.target.getAttribute('data-c'); if (!c) return;
    try { localStorage.setItem(KEY, c); } catch (err) {}
    bar.remove(); if (c === 'yes') load();
  });
  document.body.appendChild(bar);
})();
