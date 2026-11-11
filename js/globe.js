// The Atlas globe: points on a sphere, agents in orbit, and arcs of light for work being delivered.
// Used by the home hero and the Atlas film (js/atlas-film.js). Globe(canvas, slot, host) draws into canvas, sized from
// slot, animating while host is on screen; zoom(g) grows it (0..1) for the launch.
window.Globe = (globe, slot, host) => {
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const gx = globe.getContext('2d');
  const tone = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  // The globe keeps its own colours: violet, blue and cyan bands, with amber, green and pink sparks
  const hues = ['#7c3aed', '#06b6d4', '#f59e0b', '#ec4899', '#10b981'], bands = ['#7c3aed', '#6366f1', '#3b82f6', '#06b6d4'];
  const small = matchMedia('(max-width: 620px)').matches;
  // Canvas fill costs scale with pixels, so very dense screens are capped
  const dpr = Math.min(devicePixelRatio || 1, small ? 1.5 : 2), N = small ? 600 : 1400;
  // Round dots, stamped from small sprites because thousands of arc() calls a frame are far slower
  const sprites = {}, sprite = c => {
    if (sprites[c]) return sprites[c];
    const k = sprites[c] = document.createElement('canvas'), x = k.getContext('2d');
    k.width = k.height = 24; x.fillStyle = c; x.arc(12, 12, 11, 0, 6.283); x.fill();
    return k;
  };
  // Even spread of points over the sphere (golden-angle spiral); a few sparkle in the accent colours
  const pts = Array.from({ length: N }, (_, i) => {
    const y = 1 - (i + 0.5) / N * 2, r = Math.sqrt(1 - y * y), t = i * 2.399963;
    return { p: [Math.cos(t) * r, y, Math.sin(t) * r], s: sprite(i % 11 === 0 ? hues[2 + (i % 3)] : bands[Math.min(3, Math.floor((1 - y) / 2 * 4))]) };
  });
  const orbits = hues.slice(0, 4).map((c, i) => ({ c, tilt: 0.45 + i * 0.5, spin: i * 1.4, speed: 0.00032 + i * 0.00009, r: 1.2 + i * 0.08 }));
  const arcs = [], rings = [];
  let W = 0, H = 0, R = 0, R0 = 0, cx = 0, cy = 0, cy0 = 0, grown = 0, yaw = 0, mx = 0, my = 0, tx = 0, ty = 0, last = 0, spawn = 0, live = false;
  const zoom = g => { grown = g; R = R0 * (1 + g * 1.5); cy = cy0 + g * H * 0.14; };
  const fit = () => {
    const b = globe.getBoundingClientRect(), s = slot.getBoundingClientRect();
    // phones fire resize as the address bar slides; resizing a canvas wipes it, so only when its size really changed
    const w = Math.round(b.width * dpr), h = Math.round(b.height * dpr);
    if (w !== W || h !== H) { W = globe.width = w; H = globe.height = h; }
    R0 = s.width * dpr * 0.33; cx = (s.left + s.width / 2 - b.left) * dpr; cy0 = (s.top + s.height / 2 - b.top) * dpr;
    zoom(grown);
  };
  const turn = ([x, y, z], a, b) => {
    const X = x * Math.cos(a) + z * Math.sin(a), Z = -x * Math.sin(a) + z * Math.cos(a);
    return [X, y * Math.cos(b) - Z * Math.sin(b), y * Math.sin(b) + Z * Math.cos(b)];
  };
  const proj = ([x, y, z]) => { const f = 3.4 / (3.4 - z); return [cx + x * R * f, cy + y * R * f, z]; };
  const unit = () => { const u = Math.random() * 2 - 1, t = Math.random() * 6.283, r = Math.sqrt(1 - u * u); return [Math.cos(t) * r, u, Math.sin(t) * r]; };
  // A point along the great circle from a to b, lifted off the surface in the middle
  const along = (a, b, w, t) => {
    const k1 = Math.sin((1 - t) * w) / Math.sin(w), k2 = Math.sin(t * w) / Math.sin(w), h = 1 + 0.32 * Math.sin(Math.PI * t);
    return [0, 1, 2].map(i => (a[i] * k1 + b[i] * k2) * h);
  };
  const glowDot = (x, y, rad, c, a) => {
    const g = gx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, c); g.addColorStop(1, 'transparent');
    gx.globalAlpha = a; gx.fillStyle = g; gx.beginPath(); gx.arc(x, y, rad, 0, 6.283); gx.fill();
  };
  const draw = (now, a, b, dt) => {
    gx.clearRect(0, 0, W, H);
    for (const o of orbits) {
      const at = th => proj(turn(turn([o.r * Math.cos(th), o.r * Math.sin(th) * Math.sin(o.tilt), o.r * Math.sin(th) * Math.cos(o.tilt)], o.spin, 0), a, b));
      gx.strokeStyle = o.c; gx.lineWidth = dpr; gx.beginPath();
      for (let k = 0; k <= 140; k++) { const [x, y] = at(k / 140 * 6.283); k ? gx.lineTo(x, y) : gx.moveTo(x, y); }
      gx.globalAlpha = 0.18; gx.stroke();
      const [x, y, z] = at(now * o.speed);
      glowDot(x, y, 16 * dpr, o.c, 0.35 + 0.35 * (z + 1) / 2);
      gx.globalAlpha = 1; gx.fillStyle = o.c; gx.beginPath(); gx.arc(x, y, 3.2 * dpr, 0, 6.283); gx.fill();
    }
    for (const q of pts) {
      const [x, y, z] = proj(turn(q.p, a, b)), d = (z + 1) / 2;
      gx.globalAlpha = 0.1 + 0.85 * d * d;
      const s = (1.3 + 2.2 * d) * dpr * (1 + grown * 0.7); gx.drawImage(q.s, x - s / 2, y - s / 2, s, s);
    }
    spawn += dt;
    if (spawn > 650 && arcs.length < 6) {
      spawn = 0; let p, q; do { p = unit(); q = unit(); } while (p[0] * q[0] + p[1] * q[1] + p[2] * q[2] > 0.5);
      arcs.push({ p, q, w: Math.acos(p[0] * q[0] + p[1] * q[1] + p[2] * q[2]), t: 0, c: hues[Math.floor(Math.random() * hues.length)], v: 0.00045 + Math.random() * 0.0003 });
    }
    gx.lineWidth = 2 * dpr; gx.lineCap = 'round';
    for (let i = arcs.length - 1; i >= 0; i--) {
      const A = arcs[i]; A.t = Math.min(1, A.t + dt * A.v);
      gx.strokeStyle = A.c;
      for (let k = 0; k < 18; k++) {
        const t0 = Math.max(0, A.t - 0.4 + k * 0.4 / 18), t1 = Math.max(0, A.t - 0.4 + (k + 1) * 0.4 / 18);
        const [x0, y0] = proj(turn(along(A.p, A.q, A.w, t0), a, b)), [x1, y1, z1] = proj(turn(along(A.p, A.q, A.w, t1), a, b));
        gx.globalAlpha = (k / 18) * (0.35 + 0.65 * (z1 + 1) / 2); gx.beginPath(); gx.moveTo(x0, y0); gx.lineTo(x1, y1); gx.stroke();
      }
      const [hx, hy] = proj(turn(along(A.p, A.q, A.w, A.t), a, b));
      glowDot(hx, hy, 10 * dpr, A.c, 0.9);
      if (A.t >= 1) { rings.push({ p: A.q, k: 0, c: A.c }); arcs.splice(i, 1); }
    }
    for (let i = rings.length - 1; i >= 0; i--) {
      const g = rings[i]; g.k += dt / 900;
      const [x, y, z] = proj(turn(g.p, a, b));
      if (z > -0.1) { gx.globalAlpha = (1 - g.k) * 0.8; gx.strokeStyle = g.c; gx.lineWidth = 1.5 * dpr; gx.beginPath(); gx.arc(x, y, (3 + 22 * g.k) * dpr, 0, 6.283); gx.stroke(); }
      if (g.k >= 1) rings.splice(i, 1);
    }
    gx.globalAlpha = 1;
  };
  const loop = now => {
    if (!live) return;
    requestAnimationFrame(loop);
    // 30 frames a second is plenty for something this slow, and halves the drawing
    if (now - last < 32) return;
    const dt = last ? Math.min(50, now - last) : 16; last = now;
    yaw += dt * 0.00011; tx += (mx - tx) * 0.05; ty += (my - ty) * 0.05;
    draw(now, yaw + tx * 0.9, 0.42 + ty * 0.4, dt);
  };
  fit();
  if (still) draw(0, 0.6, 0.42, 0);
  else {
    new IntersectionObserver(([e]) => { live = e.isIntersecting && !document.hidden; if (live) { last = 0; requestAnimationFrame(loop); } }).observe(host);
    host.addEventListener('pointermove', e => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; }, { passive: true });
  }
  addEventListener('resize', () => { fit(); if (still) draw(0, 0.6, 0.42, 0); });
  return { zoom };
};
