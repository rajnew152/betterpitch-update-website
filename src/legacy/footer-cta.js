import worldMask from "../assets/world-mask.png";
/* =============================================================================
   footer-cta.js — the visual in the CTA card revealed at the end of the
   "Ready when you are…" section (js/next.js opens the card with a circular
   clip): a particle globe in the hero sphere's style (js/particle-sphere.js) —
   a see-through cloud of glowing dots in the logo gradient around a soft
   magenta core, over the flickering grid — with the continents gathered from
   brighter, denser dots (where the hero has its "AI" mark) and glowing city
   markers linked by arcs: Better Pitch connecting the world. Only its upper
   half shows (the card's bottom edge cuts it). It only draws while on screen.

   Pointer, exactly as the hero sphere (js/particle-sphere.js, same numbers):
   parallax  the globe tilts up to 6° towards the pointer, anywhere on the page
   hover     over the globe it brightens (halo +45%, dots +25%), spins 60% faster,
             the gradient flows round, and a lens pushes the dots under the
             pointer aside and lights them up
   click     a burst knocks the dots near the click apart (with a little swirl
             and drift) and they settle back; the spin gets a kick and the land
             flashes

   Land comes from a 256 × 128 equirectangular mask (assets/world-mask.png, the
   same map the old cobe globe used), so the markers sit on the same spots.

   The links are drawn on a 2D canvas over the globe with the same projection
   (radius 0.8 of the half-canvas, rotated by phi / theta) so they stay glued to
   the surface: each one traces its great circle with a glowing head, ripples
   where it lands, then retracts, staggered so a few are always in flight. They
   hug the surface, fade towards the limb and are clipped to the globe's disc.
   ============================================================================= */
(function () {
  "use strict";

  /* [lat, lng] */
  const CITIES = {
    mumbai: [19.08, 72.88], bengaluru: [12.97, 77.59], delhi: [28.61, 77.21],
    dubai: [25.2, 55.27], riyadh: [24.71, 46.68], london: [51.51, -0.13],
    frankfurt: [50.11, 8.68], paris: [48.86, 2.35], newYork: [40.71, -74.01],
    toronto: [43.65, -79.38], sanFrancisco: [37.77, -122.42], tokyo: [35.68, 139.69],
    singapore: [1.35, 103.82], sydney: [-33.87, 151.21], saoPaulo: [-23.55, -46.63],
    nairobi: [-1.29, 36.82], jakarta: [-6.2, 106.85],
  };
  const LINKS = [
    ["mumbai", "dubai"], ["london", "newYork"], ["delhi", "frankfurt"], ["newYork", "sanFrancisco"],
    ["mumbai", "london"], ["tokyo", "sanFrancisco"], ["dubai", "riyadh"], ["mumbai", "tokyo"],
    ["paris", "toronto"], ["bengaluru", "singapore"], ["dubai", "nairobi"], ["london", "saoPaulo"],
    ["singapore", "sydney"], ["delhi", "london"], ["bengaluru", "jakarta"], ["frankfurt", "newYork"],
  ];
  /* one link's life (s): trace in, hold, retract; a new one starts every STAGGER */
  const DRAW = 1.8, HOLD = 1.4, RETRACT = 1.3, STAGGER = 0.9;
  const LIFE = DRAW + HOLD + RETRACT;

  /* the particle globe: shell dots all over the (see-through) sphere, a few
     drifting outside it, and the land dots on the surface */
  const GLOBE = { shell: 3200, halo: 700, landSamples: 17000, seed: 7 };
  /* the hero sphere's interaction settings (js/particle-sphere.js CFG) */
  const HERO = {
    interaction: { strength: 6, smoothing: 0.08 },
    hover: { glow: 0.45, spin: 0.6, smoothing: 0.25 },
    ripple: { force: 0.6, reach: 0.4, recover: 0.3, swirl: 0.2, drift: 0.25, maxConcurrent: 3, spinKick: 0.8, markFlash: 0.4 },
  };
  const SPIN = 0.132;   // rad/s: the globe's own slow turn
  /* grad: the Better Pitch logo gradient left → right across the sphere (the hero
     sphere's stops). core: the white sparkles. night draws as added light on
     black; day draws rich dots on the pink footer */
  const THEMES = {
    night: {
      grad: [[0, "#FFA04A"], [0.4, "#FF5C7C"], [0.72, "#FF4FD2"], [1, "#C77DFF"]], core: "#FFF4FA",
      composite: "lighter", glow: "226, 50, 219", glowA: 0.34, shellA: 0.75, landA: 1,
      marker: "255, 150, 90", line: "255, 110, 160", head: "255, 236, 244", lglow: "247, 54, 121",
    },
    day: {
      grad: [[0, "#E4630F"], [0.4, "#E0194A"], [0.72, "#B8189A"], [1, "#7A2BE0"]], core: "#A3106A",
      composite: "source-over", glow: "247, 54, 121", glowA: 0.2, shellA: 0.7, landA: 1,
      marker: "232, 23, 63", line: "216, 27, 96", head: "255, 90, 44", lglow: "232, 23, 63",
    },
  };
  const themeName = () => (document.documentElement.classList.contains("light") ? "day" : "night");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* lat/lng → unit vector (the cobe convention the links were built on) */
  const toVec = ([lat, lng]) => {
    const la = lat * Math.PI / 180, ln = lng * Math.PI / 180 - Math.PI, c = Math.cos(la);
    return [-c * Math.cos(ln), Math.sin(la), c * Math.sin(ln)];
  };
  /* each link as a surface path of unit vectors (slerp), lifted a hair off the dots */
  const SAMPLES = 72;
  const PATHS = LINKS.map(([a, b]) => {
    const A = toVec(CITIES[a]), B = toVec(CITIES[b]);
    const w = Math.acos(Math.min(1, A[0] * B[0] + A[1] * B[1] + A[2] * B[2])), sw = Math.sin(w);
    const pts = [];
    for (let i = 0; i <= SAMPLES; i++) {
      const t = i / SAMPLES, ka = Math.sin((1 - t) * w) / sw, kb = Math.sin(t * w) / sw;
      const lift = 1 + 0.035 * Math.sin(Math.PI * t) * Math.min(1, w); // a low bow, never off the disc
      pts.push([(ka * A[0] + kb * B[0]) * lift, (ka * A[1] + kb * B[1]) * lift, (ka * A[2] + kb * B[2]) * lift]);
    }
    return pts;
  });
  const CITY_VECS = Object.values(CITIES).map(toVec);
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const clamp01 = (t) => Math.max(0, Math.min(1, t));

  function rng(seed) {
    let t = seed >>> 0;
    return () => {
      t = (t + 1831565813) >>> 0;
      let e = t;
      e = Math.imul(e ^ (e >>> 15), e | 1);
      e ^= e + Math.imul(e ^ (e >>> 7), e | 61);
      return ((e ^ (e >>> 14)) >>> 0) / 4294967296;
    };
  }
  const hexRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const gradAt = (grad, t) => {
    let i = 1;
    while (i < grad.length - 1 && t > grad[i][0]) i++;
    const [p0, c0] = grad[i - 1], [p1, c1] = grad[i];
    const k = clamp01((t - p0) / (p1 - p0)), a = hexRgb(c0), b = hexRgb(c1);
    return a.map((v, j) => Math.round(v + (b[j] - v) * k));
  };
  /* a glowing dot: bright core, soft halo (one per colour bucket, plus the sparkle) */
  const BUCKETS = 32;
  function dot([r, g, b]) {
    const cv = document.createElement("canvas");
    cv.width = cv.height = 32;
    const c = cv.getContext("2d"), gr = c.createRadialGradient(16, 16, 0, 16, 16, 16);
    gr.addColorStop(0, `rgba(${r},${g},${b},1)`);
    gr.addColorStop(0.2, `rgba(${r},${g},${b},0.9)`);
    gr.addColorStop(0.42, `rgba(${r},${g},${b},0.26)`);
    gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
    c.fillStyle = gr;
    c.fillRect(0, 0, 32, 32);
    return cv;
  }
  const spritesFor = (theme) => ({
    grad: Array.from({ length: BUCKETS }, (_, i) => dot(gradAt(theme.grad, i / (BUCKETS - 1)))),
    core: dot(hexRgb(theme.core)),
  });

  /* each dot's own random drift direction (the burst's scatter) */
  const drift = (rnd) => {
    const z = rnd() * 2 - 1, a = rnd() * Math.PI * 2, c = Math.sqrt(1 - z * z), m = 0.4 + rnd() * 0.6;
    return [c * Math.cos(a) * m, z * m, c * Math.sin(a) * m];
  };
  /* shell: uniform over the sphere, most on the surface, some drifting out */
  function shellPoints() {
    const rnd = rng(GLOBE.seed), out = [];
    for (let i = 0; i < GLOBE.shell + GLOBE.halo; i++) {
      const z = rnd() * 2 - 1, a = rnd() * Math.PI * 2, c = Math.sqrt(1 - z * z);
      const r = i < GLOBE.shell ? 1 + (rnd() - 0.5) * 0.05 : 1.03 + 0.17 * Math.pow(rnd(), 1.8);
      out.push({ v: [c * Math.cos(a) * r, z * r, c * Math.sin(a) * r], s: 0.5 + rnd() * 0.9, ph: rnd() * 6.283, tw: 0.4 + rnd() * 1.2, core: rnd() < 0.14, sd: rnd(), d: drift(rnd) });
    }
    return out;
  }
  /* land: an even spread of candidates over the sphere (Fibonacci), kept where the
     mask says land, each nudged a little so they read as particles, not a grid */
  function landPoints(img) {
    const W = img.naturalWidth, H = img.naturalHeight;
    const cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    const c = cv.getContext("2d", { willReadFrequently: true });
    c.drawImage(img, 0, 0);
    const data = c.getImageData(0, 0, W, H).data;
    const rnd = rng(GLOBE.seed + 3), n = GLOBE.landSamples, golden = Math.PI * (3 - Math.sqrt(5)), out = [];
    for (let i = 0; i < n; i++) {
      const y = 1 - (2 * (i + 0.5)) / n, ang = golden * i;
      const lat = Math.asin(y) * 180 / Math.PI;
      const lng = ((((ang * 180 / Math.PI) % 360) + 360) % 360) - 180;
      const jl = lat + (rnd() - 0.5) * 1.1, jg = lng + (rnd() - 0.5) * 1.1;
      const px = Math.min(W - 1, Math.max(0, Math.floor(((jg + 180) / 360) * W)));
      const py = Math.min(H - 1, Math.max(0, Math.floor(((90 - jl) / 180) * H)));
      if (data[(py * W + px) * 4] < 128) continue;
      const v = toVec([jl, jg]), r = 1.004 + rnd() * 0.01;
      out.push({ v: [v[0] * r, v[1] * r, v[2] * r], s: 0.6 + rnd() * 0.8, ph: rnd() * 6.283, tw: 0.5 + rnd(), core: rnd() < 0.22, sd: rnd(), d: drift(rnd) });
    }
    return out;
  }

  function init() {
    const card = document.getElementById("section-footer");
    const canvas = card && card.querySelector(".bp-cta__canvas");
    if (!canvas) return;
    const holder = canvas.parentElement;
    if (window.LiaParticleSphere) LiaParticleSphere.grid(holder.querySelector(".bp-sphere-grid"));
    canvas.classList.add("bp-cta__particles");
    const ctx = canvas.getContext("2d");
    const arcs = document.createElement("canvas");
    arcs.className = "bp-cta__canvas bp-cta__arcs";
    arcs.setAttribute("aria-hidden", "true");
    holder.appendChild(arcs);
    const actx = arcs.getContext("2d");

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let size = 0, raf = 0, visible = false, theme = THEMES[themeName()], sprites = spritesFor(theme);
    const shell = shellPoints();
    let land = [];
    const img = new Image();
    img.onload = () => { land = landPoints(img); play(); };
    img.src = worldMask;
    /* phi: the turn; theta: the tilt (the pointer parallax adds to both) */
    const THETA = 0.28, DEG = Math.PI / 180;
    let phi = -1.3, theta = THETA, clock = 0, last = 0;
    const par = { x: 0, y: 0, tx: 0, ty: 0 };
    /* hover: amount (smoothed), the lens at the pointer (canvas px, smoothed) and the
       gradient's angle (0 = the logo's left → right; hovering turns it round) */
    let hoverAmt = 0, hovering = false, gAng = 0, spinKick = 0, flash = 0;
    const hp = { x: 0, y: 0, tx: 0, ty: 0, set: false };
    const bursts = [];

    function build() {
      size = holder.offsetWidth;
      if (!size) return;
      canvas.width = canvas.height = arcs.width = arcs.height = Math.round(size * dpr);
      canvas.style.opacity = arcs.style.opacity = "1";
    }

    /* the one projection everything shares: rotate by phi (turn) and theta (tilt) */
    function projector(ph, S) {
      const half = S / 2, R = 0.8 * half;
      const cp = Math.cos(ph), sp = Math.sin(ph), ct = Math.cos(theta), st = Math.sin(theta);
      return (v) => {
        const x = cp * v[0] + sp * v[2];
        const y = sp * st * v[0] + ct * v[1] - cp * st * v[2];
        const z = -sp * ct * v[0] + st * v[1] + cp * ct * v[2];
        return [half + x * R, half - y * R, z, x, y];
      };
    }

    /* the globe: magenta core glow, then the shell (back half dimmer, seen through
       the sphere), then the land on the front, then the city markers */
    function drawGlobe(t, ph) {
      const S = canvas.width, half = S / 2, R = 0.8 * half, proj = projector(ph, S);
      const unit = Math.max(1, S / 900);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, S, S);
      /* the core glow: brighter on hover and in a click's flash */
      const gA = theme.glowA * (1 + HERO.hover.glow * hoverAmt) * (1 + flash);
      const g = ctx.createRadialGradient(half, half, 0, half, half, R * 1.05);
      g.addColorStop(0, `rgba(${theme.glow}, ${Math.min(1, gA)})`);
      g.addColorStop(0.45, `rgba(${theme.glow}, ${Math.min(1, gA * 0.45)})`);
      g.addColorStop(1, `rgba(${theme.glow}, 0)`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, S, S);
      ctx.globalCompositeOperation = theme.composite;
      /* colour along the gradient's direction (turned by hover), as on the hero */
      const gdx = Math.cos(gAng), gdy = Math.sin(gAng), gSpan = 1 / (2.1 * R);
      const colorOf = (p, sx, sy) => (p.core ? sprites.core
        : sprites.grad[Math.round(clamp01(0.5 + ((sx - half) * gdx + (sy - half) * gdy) * gSpan + (p.sd - 0.5) * 0.08) * (BUCKETS - 1))]);
      const tw = (p) => (reduceMotion ? 1 : 1 - 0.4 * (0.5 + 0.5 * Math.sin(t * p.tw + p.ph)));
      const bright = 1 + 0.25 * hoverAmt;

      /* bursts in progress (the hero's ripple): each pushes the dots near its
         impact outward, with a swirl round it and a little random drift */
      const rp = HERO.ripple, reachSq = rp.reach * rp.reach, cutoffSq = reachSq * 6;
      const live = bursts.filter((b) => b.age <= rp.recover * 8);
      const tmp = [0, 0, 0];
      const disp = (p) => {
        const v = p.v;
        let ox = 0, oy = 0, oz = 0;
        for (let k = 0; k < live.length; k++) {
          const b = live[k];
          const dx = v[0] - b.x, dy = v[1] - b.y, dz = v[2] - b.z, q = dx * dx + dy * dy + dz * dz;
          if (q > cutoffSq) continue;
          const kk = b.age / (rp.recover * (0.7 + p.sd * 0.6));
          if (kk > 7) continue;
          const f = rp.force * Math.exp(-q / reachSq * 1.2) * kk * Math.exp(1 - kk);
          if (f < 5e-4) continue;
          const inv = 1 / (Math.sqrt(q) || 1e-4);
          ox += dx * inv * f; oy += dy * inv * f; oz += dz * inv * f;
          const w = f * rp.swirl * inv;
          ox += (b.y * dz - b.z * dy) * w; oy += (b.z * dx - b.x * dz) * w; oz += (b.x * dy - b.y * dx) * w;
          ox += p.d[0] * f * rp.drift; oy += p.d[1] * f * rp.drift; oz += p.d[2] * f * rp.drift;
        }
        tmp[0] = v[0] + ox; tmp[1] = v[1] + oy; tmp[2] = v[2] + oz;
        return tmp;
      };
      /* the hover lens: dots under the pointer move aside and light up */
      const lens = hp.set ? hoverAmt : 0, lensR = R * 0.42, lensR2 = lensR * lensR, lensF = R * 0.17;
      const lensAt = (P) => {
        const dx = P[0] - hp.x, dy = P[1] - hp.y, q = dx * dx + dy * dy;
        if (q >= lensR2) return 1;
        const d = Math.sqrt(q) || 1e-3, f = 1 - d / lensR, push = f * f * lensF * lens;
        P[0] += (dx / d) * push; P[1] += (dy / d) * push;
        return 1 + 0.9 * f * lens;
      };

      for (let i = 0; i < shell.length; i++) {
        const p = shell[i], P = proj(live.length ? disp(p) : p.v), lg = lens > 0.01 ? lensAt(P) : 1;
        const sx = P[0], sy = P[1], z = P[2];
        /* back half shows through the sphere, fainter and smaller */
        const back = z < 0, depth = back ? 0.3 + 0.35 * (1 + z) : 0.75 + 0.25 * z;
        const a = theme.shellA * depth * tw(p) * bright * lg;
        if (a < 0.02) continue;
        const w = (6 + 5 * p.s) * unit * (back ? 0.8 : 1);
        ctx.globalAlpha = Math.min(1, a);
        ctx.drawImage(colorOf(p, sx, sy), sx - w / 2, sy - w / 2, w, w);
      }
      /* land: the hero's "AI" mark role, so it also flashes on a click */
      const landB = bright * (1 + flash * 0.8);
      for (let i = 0; i < land.length; i++) {
        const p = land[i], P = proj(live.length ? disp(p) : p.v);
        const z = P[2];
        if (z < -0.02) continue;                                    // land only on the near side
        const lg = lens > 0.01 ? lensAt(P) : 1, sx = P[0], sy = P[1];
        const a = theme.landA * clamp01((z + 0.02) / 0.3) * tw(p) * landB * lg;  // fades into the limb
        if (a < 0.02) continue;
        const w = (7 + 5 * p.s) * unit;
        ctx.globalAlpha = Math.min(1, a);
        ctx.drawImage(colorOf(p, sx, sy), sx - w / 2, sy - w / 2, w, w);
      }
      /* city markers: a pulsing glow with a bright centre */
      ctx.globalCompositeOperation = "source-over";
      CITY_VECS.forEach((v, i) => {
        const [sx, sy, z] = proj(v);
        const d = clamp01((z + 0.02) / 0.25);
        if (d <= 0) return;
        const pulse = reduceMotion ? 0.5 : 0.5 + 0.5 * Math.sin(t * 1.6 + i * 1.7);
        const r = (7 + 5 * pulse) * unit;
        const mg = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
        mg.addColorStop(0, `rgba(${theme.head}, ${d})`);
        mg.addColorStop(0.3, `rgba(${theme.marker}, ${0.9 * d})`);
        mg.addColorStop(1, `rgba(${theme.marker}, 0)`);
        ctx.globalAlpha = 1;
        ctx.fillStyle = mg;
        ctx.fillRect(sx - r, sy - r, r * 2, r * 2);
      });
      ctx.globalAlpha = 1;
    }

    /* the links, with the same projection as the globe */
    function drawArcs(t, ph) {
      const S = arcs.width, half = S / 2, R = 0.8 * half, proj = projector(ph, S);
      actx.clearRect(0, 0, S, S);
      actx.save();
      actx.beginPath();
      actx.arc(half, half, R * 0.995, 0, Math.PI * 2);
      actx.clip();
      actx.lineCap = "round";
      const cycle = LINKS.length * STAGGER;
      PATHS.forEach((pts, k) => {
        let age;
        if (reduceMotion) age = DRAW + HOLD * 0.5;
        else {
          age = ((t - k * STAGGER) % cycle + cycle) % cycle;
          if (age > LIFE) return;
        }
        const head = easeInOut(clamp01(age / DRAW));
        const tail = easeInOut(clamp01((age - DRAW - HOLD) / RETRACT));
        const i0 = Math.floor(tail * SAMPLES), i1 = Math.ceil(head * SAMPLES);
        if (i1 - i0 < 1) return;
        const P = pts.map(proj);
        /* the trail: brighter towards the head, faded by depth so it sinks behind the limb */
        for (let i = i0; i < i1; i++) {
          const a = P[i], b = P[i + 1];
          const depth = clamp01((Math.min(a[2], b[2]) + 0.05) / 0.35);
          if (depth <= 0) continue;
          const along = (i - i0) / Math.max(1, i1 - i0);
          const alpha = depth * (0.25 + 0.65 * along);
          actx.strokeStyle = `rgba(${theme.line}, ${alpha.toFixed(3)})`;
          actx.lineWidth = (1.1 + 0.9 * along) * dpr;
          actx.beginPath();
          actx.moveTo(a[0], a[1]);
          actx.lineTo(b[0], b[1]);
          actx.stroke();
        }
        /* the glowing head while it travels */
        if (head < 1 && !reduceMotion) {
          const h = P[i1], d = clamp01((h[2] + 0.05) / 0.35);
          if (d > 0) {
            const g = actx.createRadialGradient(h[0], h[1], 0, h[0], h[1], 9 * dpr);
            g.addColorStop(0, `rgba(${theme.head}, ${d})`);
            g.addColorStop(0.35, `rgba(${theme.lglow}, ${0.55 * d})`);
            g.addColorStop(1, `rgba(${theme.lglow}, 0)`);
            actx.fillStyle = g;
            actx.fillRect(h[0] - 9 * dpr, h[1] - 9 * dpr, 18 * dpr, 18 * dpr);
          }
        }
        /* a ripple where it lands */
        const landT = (age - DRAW) / 0.9;
        if (landT > 0 && landT < 1 && !reduceMotion) {
          const e = P[SAMPLES], d = clamp01((e[2] + 0.05) / 0.35);
          if (d > 0) {
            actx.strokeStyle = `rgba(${theme.line}, ${((1 - landT) * 0.8 * d).toFixed(3)})`;
            actx.lineWidth = 1.2 * dpr;
            actx.beginPath();
            actx.arc(e[0], e[1], (2 + 12 * easeInOut(landT)) * dpr, 0, Math.PI * 2);
            actx.stroke();
          }
        }
      });
      actx.restore();
    }

    function frame(now) {
      raf = 0;
      if (!size || !visible) { last = 0; return; }
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      clock += dt;
      /* the hero's smoothing: parallax, hover, lens, gradient turn, bursts, kick, flash */
      const ps = 1 - Math.exp(-dt / HERO.interaction.smoothing);
      par.x += (par.tx - par.x) * ps; par.y += (par.ty - par.y) * ps;
      hoverAmt += ((hovering ? 1 : 0) - hoverAmt) * (1 - Math.exp(-dt / HERO.hover.smoothing));
      const hs = 1 - Math.exp(-dt / 0.09);
      hp.x += (hp.tx - hp.x) * hs; hp.y += (hp.ty - hp.y) * hs;
      if (hoverAmt > 0.02) gAng += dt * 0.9 * hoverAmt;
      else { const home = Math.round(gAng / (Math.PI * 2)) * Math.PI * 2; gAng += (home - gAng) * (1 - Math.exp(-dt / 0.8)); }
      for (let i = bursts.length - 1; i >= 0; i--) { bursts[i].age += dt; if (bursts[i].age > HERO.ripple.recover * 9) bursts.splice(i, 1); }
      spinKick *= Math.exp(-dt / 0.45);
      flash *= Math.exp(-dt / 0.35);
      if (!reduceMotion) phi += (SPIN * (1 + HERO.hover.spin * hoverAmt) + spinKick) * dt;
      /* pointer parallax on top of the turn and the tilt */
      const ph = phi + par.x * HERO.interaction.strength * DEG;
      theta = THETA + par.y * HERO.interaction.strength * DEG;
      drawGlobe(clock, ph);
      drawArcs(clock, ph);
      if (!reduceMotion) raf = requestAnimationFrame(frame);
    }
    const play = () => { if (!raf && visible) raf = requestAnimationFrame(frame); };

    build();
    new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) play();
      else if (raf) { cancelAnimationFrame(raf); raf = 0; }
    }).observe(holder);
    new ResizeObserver(() => { if (holder.offsetWidth !== size) { build(); play(); } }).observe(holder);
    new MutationObserver(() => {
      const next = THEMES[themeName()];
      if (next === theme) return;
      theme = next;
      sprites = spritesFor(theme);
      play();
    }).observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    /* ---- pointer, as on the hero: parallax anywhere, hover + click on the globe ---- */
    /* the globe's disc: radius 0.8 of the half-canvas, round the canvas centre */
    const overGlobe = (e) => {
      const r = canvas.getBoundingClientRect();
      if (r.width < 1) return null;
      const u = ((e.clientX - r.left) / r.width - 0.5) / 0.4, v = ((e.clientY - r.top) / r.height - 0.5) / 0.4;
      return u * u + v * v <= 1 ? { u, v } : null;
    };
    const onMove = (e) => {
      const r = holder.getBoundingClientRect();
      par.tx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2)));
      par.ty = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2)));
      hovering = e.pointerType !== "touch" && visible && !!overGlobe(e);
      if (r.width > 0) {
        hp.tx = (e.clientX - r.left) * (canvas.width / r.width);
        hp.ty = (e.clientY - r.top) * (canvas.height / r.height);
        if (!hp.set) { hp.x = hp.tx; hp.y = hp.ty; hp.set = true; }
      }
    };
    /* a click on the globe: the burst's impact is the clicked point on the sphere,
       taken back through the current turn and tilt (the projection's transpose) */
    const onDown = (e) => {
      if (!visible) return;
      const hit = overGlobe(e);
      if (!hit) return;
      const x = hit.u, y = -hit.v, z = Math.sqrt(Math.max(0, 1 - x * x - y * y));
      const ph = phi + par.x * HERO.interaction.strength * DEG;
      const cp = Math.cos(ph), sp = Math.sin(ph), ct = Math.cos(theta), st = Math.sin(theta);
      bursts.push({
        x: cp * x + sp * st * y - sp * ct * z,
        y: ct * y + st * z,
        z: sp * x - cp * st * y + cp * ct * z,
        age: 0,
      });
      while (bursts.length > HERO.ripple.maxConcurrent) bursts.shift();
      spinKick += HERO.ripple.spinKick;
      flash = HERO.ripple.markFlash;
      play();
    };
    if (!reduceMotion) {
      window.addEventListener("pointermove", onMove, { passive: true });
      document.documentElement.addEventListener("pointerleave", () => { hovering = false; });
      window.addEventListener("pointerdown", onDown, { passive: true });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
