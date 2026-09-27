/* Slide 02: a steady river, one leaf, two witnesses. Draws the river and the speed graph on
   one canvas in real time and writes the live numbers into the cards and the equation. */
(function () {
  "use strict";
  const slide = document.querySelector('[data-simulator="leaf"]');
  if (!slide) return;
  const t = (key, english, vars) => {
    if (window.I18N) return window.I18N.t(key, english, vars);
    return vars ? english.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? vars[name] : m)) : english;
  };
  const $ = (id) => document.getElementById(id);
  const reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- the river: 1 m/s at the wide mark, 3 m/s at the narrow mark 10 m downstream ---- */
  const U_WIDE = 1, U_NARROW = 3, RAMP = 10;
  const SLOPE = (U_NARROW - U_WIDE) / RAMP;
  const X_START = -3, X_END = 13.8;
  const speedAt = (x) => (x <= 0 ? U_WIDE : x >= RAMP ? U_NARROW : U_WIDE + SLOPE * x);
  const slopeAt = (x) => (x >= 0 && x < RAMP ? SLOPE : 0);
  /* where the straight stretch the leaf is on ends: the "next second" is only drawn that far */
  const stretchEnd = (x) => (x < 0 ? 0 : x < RAMP ? RAMP : X_END);

  /* ---- canvas geometry, in logical units on a 760 x 384 drawing ---- */
  const W = 760, H = 384;
  const X0 = 40, PX_PER_M = 42;
  const X = (x) => X0 + (x - X_START) * PX_PER_M;
  const RIVER_Y = 105, HALF_WIDE = 60;
  const halfWidth = (x) => HALF_WIDE * U_WIDE / speedAt(x);
  const Y = (u) => 356 - 36 * u;
  const C = {
    ink: "#1b1d20", muted: "#65676d", soft: "#92949a", line: "#dedfe3", wash: "#f5f5f3", grid: "#eceef2",
    blue: "#315a9f", bluePale: "#eaf1ff", orange: "#d95d39", green: "#21805a", leaf: "#7fbf7a",
    bank: "#c9c7bd", post: "#9aa0aa", paper: "#fff",
  };
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const num = (value, digits) => value.toFixed(digits).replace(".", t("js.leaf.decimal", "."));
  /* the numbers on screen: the speed rounded to 0.1 m/s, and the gain worked out from that
     rounded speed, so the arithmetic the reader sees always adds up */
  const shown = (x) => {
    const u = Math.round(speedAt(x) * 10) / 10, s = slopeAt(x);
    return { u, s, g: u * s };
  };

  const state = {
    x: X_START, playing: !reducedMotion, footprints: [], stamp: 0, bridge: 5,
    time: 0, active: false, looping: false, last: 0, cardsKey: "",
  };
  const drops = Array.from({ length: 70 }, () => ({
    x: X_START + Math.random() * (X_END - X_START), f: Math.random() * 1.8 - 0.9,
  }));

  const canvas = $("leafCanvas"), ctx = canvas.getContext("2d");
  let scale = 1;
  /* text keeps its designed size on small screens instead of shrinking with the drawing */
  const ts = () => clamp(1 / scale, 1, 2);
  const font = (size, weight) => `${weight || 500} ${size * ts()}px Inter, ui-sans-serif, -apple-system, "Segoe UI", sans-serif`;

  function resize() {
    const cssWidth = canvas.clientWidth;
    if (!cssWidth) return;
    const dpr = window.devicePixelRatio || 1;
    scale = cssWidth / W;
    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssWidth * H / W * dpr);
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
    draw();
  }

  /* ---- time ---- */

  function step(dt) {
    state.time += dt;
    for (const d of drops) {
      d.x += speedAt(d.x) * dt;
      if (d.x > X_END) { d.x -= X_END - X_START; d.f = Math.random() * 1.8 - 0.9; }
    }
    state.x += speedAt(state.x) * dt;
    if (state.x > X_END) {
      state.x = X_START;
      state.footprints = [];
      state.stamp = 0;
    }
    state.stamp += dt;
    if (state.stamp >= 1) {
      state.stamp -= 1;
      state.footprints.push(state.x);
      if (state.footprints.length > 5) state.footprints.shift();
    }
  }

  function frame(now) {
    if (!state.active) { state.looping = false; return; }
    const dt = Math.min(0.05, Math.max(0, (now - state.last) / 1000));
    state.last = now;
    if (state.playing) step(dt);
    draw();
    updateCards();
    requestAnimationFrame(frame);
  }

  /* ---- drawing helpers ---- */

  function line(x1, y1, x2, y2, color, width, dash) {
    ctx.save();
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = "round";
    ctx.setLineDash(dash || []);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.restore();
  }

  function arrow(x1, y1, x2, y2, color, width, head) {
    ctx.save();
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    const a = Math.atan2(y2 - y1, x2 - x1);
    ctx.beginPath();
    ctx.moveTo(x2 - head * Math.cos(a - 0.5), y2 - head * Math.sin(a - 0.5));
    ctx.lineTo(x2, y2);
    ctx.lineTo(x2 - head * Math.cos(a + 0.5), y2 - head * Math.sin(a + 0.5));
    ctx.stroke();
    ctx.restore();
  }

  function dot(x, y, r, fill, stroke) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); }
  }

  function leafShape(x, y, angle, fill, stroke, dashed, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.rotate(angle);
    ctx.setLineDash(dashed ? [3, 3] : []);
    ctx.beginPath(); ctx.ellipse(0, 0, 11, 5.5, 0, 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    ctx.strokeStyle = stroke; ctx.lineWidth = 1.4; ctx.stroke();
    if (fill) { ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.lineWidth = 1; ctx.stroke(); }
    ctx.restore();
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function textWidth(text, size, weight) { ctx.font = font(size, weight); return ctx.measureText(text).width; }
  function pillWidth(text) { return Math.ceil(textWidth(text, 10.5, 750)) + 14 * ts(); }
  function pillHeight() { return 16 * ts(); }

  function pill(x, y, text, fill, color) {
    const w = pillWidth(text), h = pillHeight();
    ctx.fillStyle = fill; roundRect(x, y, w, h, h / 2); ctx.fill();
    ctx.font = font(10.5, 750); ctx.fillStyle = color; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillText(text, x + 7 * ts(), y + h / 2 + 0.5);
    ctx.textBaseline = "alphabetic";
  }

  /* halo: a white outline so the text stays readable where it crosses a line */
  function label(text, x, y, color, size, weight, align, halo) {
    ctx.font = font(size, weight); ctx.textAlign = align || "left"; ctx.textBaseline = "alphabetic";
    if (halo) {
      ctx.save(); ctx.lineJoin = "round"; ctx.lineWidth = 3 * ts(); ctx.strokeStyle = C.paper;
      ctx.strokeText(text, x, y); ctx.restore();
    }
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }

  /* ---- the river band ---- */

  function drawRiver() {
    const N = 168;
    const xAt = (i) => X_START + (X_END - X_START) * i / N;
    ctx.beginPath();
    for (let i = 0; i <= N; i += 1) { const x = xAt(i); i ? ctx.lineTo(X(x), RIVER_Y - halfWidth(x)) : ctx.moveTo(X(x), RIVER_Y - halfWidth(x)); }
    for (let i = N; i >= 0; i -= 1) { const x = xAt(i); ctx.lineTo(X(x), RIVER_Y + halfWidth(x)); }
    ctx.closePath(); ctx.fillStyle = C.bluePale; ctx.fill();
    ctx.strokeStyle = C.bank; ctx.lineWidth = 2.2; ctx.lineJoin = "round"; ctx.lineCap = "round";
    for (const sign of [-1, 1]) {
      ctx.beginPath();
      for (let i = 0; i <= N; i += 1) { const x = xAt(i); i ? ctx.lineTo(X(x), RIVER_Y + sign * halfWidth(x)) : ctx.moveTo(X(x), RIVER_Y + sign * halfWidth(x)); }
      ctx.stroke();
    }

    // the two marks, through both pictures
    for (const x of [0, RAMP]) line(X(x), 40, X(x), Y(0), C.soft, 1, [3, 3]);

    // the speed map, frozen: these arrows are the same in every moment
    ctx.save(); ctx.globalAlpha = 0.7;
    for (const x of [-2, 0, 2, 4, 6, 8, 10, 12]) {
      const y = RIVER_Y - 0.5 * halfWidth(x), len = 10 * speedAt(x);
      arrow(X(x) - len / 2, y, X(x) + len / 2, y, C.blue, 1.8, 4);
    }
    ctx.restore();

    // water, moving at the local speed
    ctx.fillStyle = "rgba(49,90,159,.45)";
    for (const d of drops) { ctx.beginPath(); ctx.arc(X(d.x), RIVER_Y + d.f * halfWidth(d.x) * 0.92, 1.7, 0, Math.PI * 2); ctx.fill(); }

    // the bridge, the woman, and the one spot she watches
    const bx = X(state.bridge), ub = speedAt(state.bridge);
    line(bx, 22, bx, 172, C.post, 3);
    ctx.save(); ctx.setLineDash([3, 3]); dot(bx, RIVER_Y, 8, null, C.ink); ctx.restore();
    dot(bx, 18, 5.5, C.ink, null);
    const bridgeText = t("js.leaf.speed", "{u} m/s", { u: num(ub, 1) });
    pill(bx > W / 2 ? bx - 10 - pillWidth(bridgeText) : bx + 10, 4, bridgeText, C.ink, C.paper);
    line(bx, RIVER_Y + 9, bx, Y(ub) - 6, "rgba(27,29,32,.35)", 1, [2, 3]);

    // where the leaf was, one second apart
    state.footprints.forEach((fx, i) => leafShape(X(fx), RIVER_Y, -0.35, null, C.green, true, 0.25 + 0.55 * (i + 1) / state.footprints.length));

    // guide lines down to the graph, painted before the leaf so nothing runs through it
    const x = state.x, u = shown(x).u, ahead = x + u, inView = ahead <= X_END;
    line(X(x), RIVER_Y + 8, X(x), Y(speedAt(x)) - 6, C.soft, 1, [2, 3]);
    if (inView) line(X(ahead), RIVER_Y + 8, X(ahead), Y(speedAt(ahead)) - 6, "rgba(217,93,57,.45)", 1, [2, 3]);

    // one second ahead at this speed: the leaf moves u metres
    if (inView) {
      arrow(X(x) + 14, RIVER_Y, X(ahead) - 14, RIVER_Y, C.blue, 1.6, 4);
      leafShape(X(ahead), RIVER_Y, -0.35, null, C.orange, true, 0.75);
      if (scale >= 0.7 && X(ahead) + 34 < W) label(t("js.leaf.ahead", "in 1 s"), X(ahead) + 5, RIVER_Y + 19, C.orange, 9.5, 700, "left", true);
    }

    // the leaf and the boy running beside it
    leafShape(X(x), RIVER_Y, -0.35 + 0.25 * Math.sin(1.3 * state.time), C.leaf, C.green, false, 1);
    const boyY = RIVER_Y + halfWidth(x) + 11;
    dot(X(x), boyY, 5.5, C.orange, null);
    const leafText = t("js.leaf.speed", "{u} m/s", { u: num(u, 1) });
    pill(clamp(X(x) - pillWidth(leafText) / 2, 2, W - pillWidth(leafText) - 2), boyY + 9, leafText, C.orange, C.paper);

    if (scale >= 0.7) {
      label(t("js.leaf.steady", "nothing here changes with time"), 8, 13, C.muted, 9.5, 650, "left");
      label(t("js.leaf.footprints", "where the leaf was, one second apart"), W - 8, 13, C.muted, 9.5, 650, "right");
    }
  }

  /* ---- the speed graph: water speed against position, on the same x scale ---- */

  function drawGraph() {
    for (const u of [1, 2, 3]) {
      line(X0, Y(u), W - 12, Y(u), C.grid, 1);
      label(String(u), X0 - 6, Y(u) + 3, C.soft, 9.5, 650, "right");
    }
    line(X0, Y(0), W - 12, Y(0), C.line, 1);
    label("0", X0 - 6, Y(0) + 3, C.soft, 9.5, 650, "right");
    if (scale >= 0.55) label(t("js.leaf.axis", "water speed here (m/s)"), X0 + 4, 224, C.muted, 9.5, 650, "left");
    const wide = scale >= 0.55 ? t("js.leaf.wideMark", "wide mark · {u} m/s", { u: num(U_WIDE, 0) }) : t("js.leaf.speed", "{u} m/s", { u: num(U_WIDE, 0) });
    const narrow = scale >= 0.55 ? t("js.leaf.narrowMark", "narrow mark · {u} m/s", { u: num(U_NARROW, 0) }) : t("js.leaf.speed", "{u} m/s", { u: num(U_NARROW, 0) });
    label(wide, X(0), 373, C.soft, 9.5, 700, "center");
    label(narrow, X(RAMP), 373, C.soft, 9.5, 700, "center");

    // the big triangle: 2 m/s more over 10 m
    ctx.save(); ctx.setLineDash([4, 3]); ctx.strokeStyle = C.soft; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(X(0), Y(U_WIDE)); ctx.lineTo(X(RAMP), Y(U_WIDE)); ctx.lineTo(X(RAMP), Y(U_NARROW)); ctx.stroke();
    ctx.restore();
    if (scale >= 0.7) {
      label(t("js.leaf.slopeA", "+{du} m/s over {d} m", { du: num(U_NARROW - U_WIDE, 0), d: num(RAMP, 0) }), X(RAMP) - 8, Y(U_WIDE) + 13, C.ink, 10, 750, "right", true);
      label(t("js.leaf.slopeB", "= {s} m/s for every metre", { s: num(SLOPE, 2) }), X(RAMP) - 8, Y(U_WIDE) + 25, C.muted, 9.5, 650, "right", true);
    }

    // the speed line
    ctx.strokeStyle = C.blue; ctx.lineWidth = 3; ctx.lineJoin = "round"; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(X(X_START), Y(U_WIDE)); ctx.lineTo(X(0), Y(U_WIDE)); ctx.lineTo(X(RAMP), Y(U_NARROW)); ctx.lineTo(X(X_END), Y(U_NARROW));
    ctx.stroke();

    // the bridge's point: it never moves
    dot(X(state.bridge), Y(speedAt(state.bridge)), 4.5, C.ink, C.paper);

    // the leaf's point and its next second, drawn only along the straight stretch it is on
    const x = state.x, { u, g: gain } = shown(x), ahead = x + u;
    const end = Math.min(ahead, stretchEnd(x)), whole = end === ahead;
    const p0 = [X(x), Y(speedAt(x))], p1 = [X(end), Y(speedAt(x))], p2 = [X(end), Y(speedAt(end))];
    if (end > x) {
      if (gain > 0) {
        ctx.fillStyle = "rgba(217,93,57,.12)";
        ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.closePath(); ctx.fill();
      }
      arrow(p0[0], p0[1], p1[0], p1[1], C.blue, 2.5, 5);
      if (gain > 0) arrow(p1[0], p1[1], p2[0], p2[1], C.orange, 2.5, 5);
      dot(p2[0], p2[1], 4, C.paper, C.orange);
    }
    if (whole) {
      const runText = t("js.leaf.run", "{u} m in 1 s", { u: num(u, 1) });
      const riseText = t("js.leaf.rise", "+{g} m/s", { g: num(gain, 2) });
      const runMid = (p0[0] + p1[0]) / 2, rowY = p0[1] + 14 * ts();
      const runW = textWidth(runText, 10, 700), riseW = textWidth(riseText, 11, 800);
      label(runText, runMid, rowY, C.blue, 10, 700, "center", true);
      const beside = p1[0] + 10 > runMid + runW / 2 + 4 && p1[0] + 10 + riseW <= W - 4;
      ctx.save(); if (gain <= 0) ctx.globalAlpha = 0.6;
      if (beside) label(riseText, p1[0] + 10, rowY, C.orange, 11, 800, "left", true);
      else label(riseText, clamp(runMid, riseW / 2 + 4, W - riseW / 2 - 4), rowY + 13 * ts(), C.orange, 11, 800, "center", true);
      ctx.restore();
    }
    dot(p0[0], p0[1], 4.5, C.leaf, C.green);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    drawRiver();
    drawGraph();
  }

  /* ---- the cards and the equation ---- */

  function updateCards(force) {
    const { u, s, g } = shown(state.x), ub = speedAt(state.bridge);
    const U = num(u, 1), G = num(g, 2), UB = num(ub, 1), S = num(s, 2);
    const key = `${U}|${G}|${UB}|${S}|${state.bridge}`;
    if (!force && key === state.cardsKey) return;
    state.cardsKey = key;
    $("wBridge").querySelector("b").textContent = t("js.leaf.bridgeBig", "The water under me moves at {u} m/s. Change: {z} m/s per second.", { u: UB, z: num(0, 2) });
    $("wLeaf").querySelector("b").textContent = t("js.leaf.leafBig", "{u} m/s right now, and gaining {g} m/s every second.", { u: U, g: G });
    $("wLeaf").querySelector("span").textContent = s > 0
      ? t("js.leaf.leafSmall", "In one second it moves {u} m, and every metre the water is {s} m/s faster: {u} × {s} = {g} m/s gained per second.", { u: U, s: S, g: G })
      : t("js.leaf.leafFlat", "The water ahead is no faster here, so nothing is gained right now.");
    $("nU").textContent = t("js.leaf.speed", "{u} m/s", { u: U });
    $("nSlope").textContent = t("js.leaf.perMetre", "{s} m/s per metre", { s: S });
    $("nGain").textContent = t("js.leaf.perSecond", "{g} m/s per second", { g: G });
    $("chipLeaf").textContent = t("js.leaf.chipLeaf", "change from moving: +{g}", { g: G });
    $("bridgeOut").textContent = t("js.leaf.bridgeOut", "{x} m · {u} m/s", { x: num(state.bridge, 1), u: UB });
  }

  const slider = $("bridgeX");
  slider.addEventListener("input", () => {
    state.bridge = parseFloat(slider.value);
    updateCards(true);
    if (!state.active) draw();
  });

  const playBtn = $("leafPlay");
  const renderPlay = () => { playBtn.textContent = state.playing ? t("js.leaf.pause", "⏸ Pause") : t("js.leaf.play", "▶ Play"); };
  playBtn.addEventListener("click", () => { state.playing = !state.playing; renderPlay(); });

  function activate() {
    state.active = true;
    state.last = performance.now();
    resize();
    updateCards(true);
    if (!state.looping) { state.looping = true; requestAnimationFrame(frame); }
  }

  window.addEventListener("resize", () => { if (state.active) resize(); });
  window.addEventListener("i18n:change", () => { renderPlay(); updateCards(true); if (state.active) draw(); });
  window.addEventListener("lesson:slide", (event) => {
    const active = event.detail.simulator === "leaf";
    if (active && !state.active) activate();
    else if (!active) state.active = false;
  });

  renderPlay();
  updateCards(true);
  if (slide.classList.contains("on")) activate();
}());
