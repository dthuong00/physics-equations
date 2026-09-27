/* Slide 03: the two ways water pushes water. Left pane: a box squeezed by pressure from both
   sides. Right pane: layers of water sliding past each other. Both feed live numbers into the
   cards and the equation. */
(function () {
  "use strict";
  const slide = document.querySelector('[data-simulator="push"]');
  if (!slide) return;
  const t = (key, english, vars) => {
    if (window.I18N) return window.I18N.t(key, english, vars);
    return vars ? english.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? vars[name] : m)) : english;
  };
  const $ = (id) => document.getElementById(id);
  const reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- the physics, kept simple and honest ---- */
  const P0 = 100;                       // kPa in the middle of the pressure pane
  const BOX_M = 0.17;                   // the box is 17 cm wide
  const LAYER_M = 0.01;                 // layers 1 cm apart
  const NEIGHBOURS = [0.2, 0.4, null, 0.8, 1.0];   // m/s, the middle one is the reader's
  const AVG = (NEIGHBOURS[1] + NEIGHBOURS[3]) / 2;
  const MU = { air: 0.000018, water: 0.001, honey: 5 };
  const GRAVITY = 9800;

  const state = { tilt: 2, speed: 0.9, mu: "water", time: 0, active: false, looping: false, last: 0, key: "" };

  const pressurePush = () => -state.tilt * 1000;                            // N per m3 = -dp/dx
  const dragPush = () => MU[state.mu] * (NEIGHBOURS[1] + NEIGHBOURS[3] - 2 * state.speed) / (LAYER_M * LAYER_M);

  /* ---- canvas ---- */
  const W = 760, H = 300;
  const C = {
    ink: "#1b1d20", muted: "#65676d", soft: "#92949a", line: "#dedfe3", wash: "#f5f5f3",
    blue: "#315a9f", bluePale: "#eaf1ff", orange: "#d95d39", orangePale: "#fff0e9",
    violet: "#5552b9", violetPale: "#eeeeff", green: "#21805a", paper: "#fff",
  };
  const canvas = $("pushCanvas"), ctx = canvas.getContext("2d");
  let scale = 1;
  const ts = () => Math.max(1, Math.min(2, 1 / scale));
  const font = (size, weight) => `${weight || 500} ${size * ts()}px Inter, ui-sans-serif, -apple-system, "Segoe UI", sans-serif`;
  const num = (value, digits) => value.toFixed(digits).replace(".", t("js.push.decimal", "."));
  const big = (value) => {
    const v = Math.abs(value);
    const text = v >= 100 ? Math.round(v).toLocaleString("en-US").replace(/,/g, " ") : v >= 10 ? num(v, 0) : v >= 1 ? num(v, 1) : num(v, 2);
    return text;
  };

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

  function label(text, x, y, color, size, weight, align, halo) {
    ctx.font = font(size, weight); ctx.textAlign = align || "left"; ctx.textBaseline = "alphabetic";
    if (halo) { ctx.save(); ctx.lineJoin = "round"; ctx.lineWidth = 3 * ts(); ctx.strokeStyle = C.paper; ctx.strokeText(text, x, y); ctx.restore(); }
    ctx.fillStyle = color; ctx.fillText(text, x, y);
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

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* ---- left pane: pressure ---- */
  const PL = { x: 0, w: 372, cx: 186, cy: 158, box: 64 };

  function drawPressure() {
    const tilt = state.tilt;
    // the pressure field as shading: darker where the squeeze is harder
    const grad = ctx.createLinearGradient(PL.x + 20, 0, PL.x + PL.w - 20, 0);
    const lo = "rgba(85,82,185,0.04)", hi = "rgba(85,82,185,0.28)";
    grad.addColorStop(0, tilt > 0 ? lo : hi); grad.addColorStop(1, tilt > 0 ? hi : lo);
    if (tilt === 0) { grad.addColorStop(0, "rgba(85,82,185,0.14)"); grad.addColorStop(1, "rgba(85,82,185,0.14)"); }
    ctx.fillStyle = grad; roundRect(PL.x + 20, 50, PL.w - 40, 216, 10); ctx.fill();
    label(t("js.push.pressureTitle", "pressure"), PL.x + 26, 42, C.violet, 10, 850, "left");
    label(t("js.push.high", "high"), tilt > 0 ? PL.x + PL.w - 26 : PL.x + 26, 68, C.violet, 9.5, 700, tilt > 0 ? "right" : "left");
    label(t("js.push.low", "low"), tilt > 0 ? PL.x + 26 : PL.x + PL.w - 26, 68, C.violet, 9.5, 700, tilt > 0 ? "left" : "right");
    if (tilt === 0) label(t("js.push.evenNote", "the same on both sides"), PL.cx, 68, C.violet, 9.5, 700, "center", true);

    // the box
    const b = PL.box, x0 = PL.cx - b / 2, y0 = PL.cy - b / 2;
    ctx.fillStyle = C.orangePale; ctx.strokeStyle = C.orange; ctx.lineWidth = 1.6;
    roundRect(x0, y0, b, b, 4); ctx.fill(); ctx.stroke();

    // arrows on the two faces: their length is the pressure on that face
    const lenL = Math.max(4, 26 - 6 * tilt), lenR = Math.max(4, 26 + 6 * tilt);
    for (const dy of [-20, 0, 20]) {
      arrow(x0 - 8 - lenL, PL.cy + dy, x0 - 8, PL.cy + dy, C.violet, 2.2, 5);
      arrow(x0 + b + 8 + lenR, PL.cy + dy, x0 + b + 8, PL.cy + dy, C.violet, 2.2, 5);
    }
    // the top and bottom faces are squeezed equally: they cancel
    for (const dx of [-20, 0, 20]) {
      arrow(PL.cx + dx, y0 - 8 - 20, PL.cx + dx, y0 - 8, "rgba(85,82,185,.35)", 1.6, 4);
      arrow(PL.cx + dx, y0 + b + 8 + 20, PL.cx + dx, y0 + b + 8, "rgba(85,82,185,.35)", 1.6, 4);
    }
    const pL = P0 - tilt * BOX_M / 2, pR = P0 + tilt * BOX_M / 2;
    label(t("js.push.kpa", "{p} kPa", { p: num(pL, 2) }), x0 - 8 - 26 - 4, PL.cy - 30, C.violet, 9.5, 700, "right", true);
    label(t("js.push.kpa", "{p} kPa", { p: num(pR, 2) }), x0 + b + 8 + 26 + 4, PL.cy - 30, C.violet, 9.5, 700, "left", true);

    // the net push: only the difference
    const net = pressurePush();
    const y = y0 + b + 46;
    if (Math.abs(net) > 0) {
      const len = 16 + 9 * Math.abs(tilt), dir = net > 0 ? 1 : -1;
      const wob = reducedMotion ? 0 : 2 * Math.sin(3 * state.time);
      arrow(PL.cx - dir * len / 2 + wob, y, PL.cx + dir * len / 2 + wob, y, C.ink, 3, 7);
      label(t("js.push.netPush", "net push: {n} N on each m³, toward the low side", { n: big(net) }), PL.cx, y + 20, C.ink, 10, 800, "center", true);
    } else {
      label(t("js.push.noPush", "no net push: squeezed equally, it goes nowhere"), PL.cx, y + 6, C.soft, 10, 800, "center", true);
    }
  }

  /* ---- right pane: friction between sliding layers ---- */
  const FR = { x: 400, w: 340, top: 62, h: 30, gap: 4 };

  function drawFriction() {
    label(t("js.push.frictionTitle", "friction"), FR.x + 6, 42, C.blue, 10, 850, "left");
    label(t("js.push.frictionNote", "each layer slides at its own speed"), FR.x + FR.w, 42, C.muted, 9.5, 650, "right");
    const speeds = NEIGHBOURS.map((v) => (v === null ? state.speed : v));
    const drag = dragPush();
    speeds.forEach((v, i) => {
      const y = FR.top + i * (FR.h + FR.gap), mine = i === 2;
      ctx.fillStyle = mine ? C.orangePale : C.bluePale; ctx.strokeStyle = mine ? C.orange : "#b6cbe8"; ctx.lineWidth = mine ? 1.6 : 1;
      roundRect(FR.x, y, FR.w - 70, FR.h, 3); ctx.fill(); ctx.stroke();
      // the water itself: marks that really move at the layer's speed
      ctx.save(); ctx.beginPath(); ctx.rect(FR.x + 1, y + 1, FR.w - 72, FR.h - 2); ctx.clip();
      ctx.strokeStyle = mine ? "rgba(217,93,57,.45)" : "rgba(49,90,159,.35)"; ctx.lineWidth = 1.5;
      const period = 34, shift = ((state.time * v * 80) % period + period) % period;
      for (let x = FR.x - period + shift; x < FR.x + FR.w; x += period) {
        ctx.beginPath(); ctx.moveTo(x, y + FR.h / 2 - 5); ctx.lineTo(x + 3, y + FR.h / 2 + 5); ctx.stroke();
      }
      ctx.restore();
      arrow(FR.x + 10, y + FR.h / 2, FR.x + 10 + 90 * v, y + FR.h / 2, mine ? C.orange : C.blue, 2.2, 5);
      label(t("js.push.ms", "{u} m/s", { u: num(v, 1) }), FR.x + 16 + 90 * v, y + FR.h / 2 + 3.5, mine ? C.orange : C.blue, 9.5, 700, "left", true);
    });
    // the drag on the middle layer
    const y = FR.top + 2 * (FR.h + FR.gap) + FR.h / 2, xr = FR.x + FR.w - 62;
    const size = Math.min(1, Math.log10(1 + Math.abs(drag)) / 4.5);
    if (Math.abs(state.speed - AVG) < 1e-9) {
      label(t("js.push.noDrag", "no drag"), xr + 4, y + 3.5, C.soft, 9.5, 800, "left");
    } else {
      const dir = drag > 0 ? 1 : -1, len = 14 + 40 * size;
      arrow(xr + 30 - dir * len / 2, y, xr + 30 + dir * len / 2, y, C.blue, 2 + 3 * size, 6 + 3 * size);
      label(dir > 0 ? t("js.push.pulledOn", "pulled on") : t("js.push.heldBack", "held back"), xr + 30, y + 22, C.blue, 9.5, 800, "center", true);
    }
    label(t("js.push.avg", "neighbours' average: {u} m/s", { u: num(AVG, 1) }), FR.x + 6, FR.top + 5 * (FR.h + FR.gap) + 14, C.muted, 9.5, 650, "left");
    label(t("js.push.muTag", "μ = {mu} ({name})", { mu: String(MU[state.mu]).replace(".", t("js.push.decimal", ".")), name: fluidName() }), FR.x + FR.w, FR.top + 5 * (FR.h + FR.gap) + 14, C.blue, 9.5, 700, "right");
  }

  const fluidName = () => ({ air: t("js.push.air", "air"), water: t("js.push.water", "water"), honey: t("js.push.honey", "honey") }[state.mu]);

  function draw() {
    ctx.clearRect(0, 0, W, H);
    drawPressure();
    drawFriction();
  }

  function frame(now) {
    if (!state.active) { state.looping = false; return; }
    const dt = Math.min(0.05, Math.max(0, (now - state.last) / 1000));
    state.last = now;
    if (!reducedMotion) state.time += dt;
    draw();
    requestAnimationFrame(frame);
  }

  /* ---- cards and equation ---- */
  function updateCards(force) {
    const key = `${state.tilt}|${state.speed}|${state.mu}`;
    if (!force && key === state.key) return;
    state.key = key;
    const net = pressurePush(), drag = dragPush();
    const pL = P0 - state.tilt * BOX_M / 2, pR = P0 + state.tilt * BOX_M / 2;
    $("wPress").querySelector("b").textContent = net === 0
      ? t("js.push.pressBigNone", "Push: none. Squeezed equally from both sides, the box goes nowhere.")
      : t("js.push.pressBig", "Push: {n} N toward the {side}, the low side.", { n: big(net), side: net > 0 ? t("js.push.right", "right") : t("js.push.left", "left") });
    $("wPress").querySelector("span").textContent = t("js.push.pressSmall", "Left face {l} kPa, right face {r} kPa. Only the difference pushes.", { l: num(pL, 2), r: num(pR, 2) });
    $("tiltOut").textContent = state.tilt === 0
      ? t("js.push.tiltFlat", "the same everywhere")
      : t("js.push.tiltOut", "rises {g} kPa per metre to the {side}", { g: num(Math.abs(state.tilt), 1), side: state.tilt > 0 ? t("js.push.right", "right") : t("js.push.left", "left") });
    $("wDrag").querySelector("b").textContent = Math.abs(state.speed - AVG) < 1e-9
      ? t("js.push.dragBigNone", "Drag: none. Moving with its neighbours, nothing rubs.")
      : t("js.push.dragBig", "Drag: {d} N, {dir}.", { d: big(drag), dir: drag > 0 ? t("js.push.pullingOn", "pulling the layer forward") : t("js.push.holdingBack", "pulling the layer back") });
    $("wDrag").querySelector("span").textContent = t("js.push.dragSmall", "The layer moves at {u} m/s; its neighbours average {a} m/s. In {name}, μ = {mu}.", { u: num(state.speed, 1), a: num(AVG, 1), name: fluidName(), mu: String(MU[state.mu]).replace(".", t("js.push.decimal", ".")) });
    $("speedOut").textContent = t("js.push.ms", "{u} m/s", { u: num(state.speed, 1) });
    $("nPress").textContent = t("js.push.perM3", "{n} N per m³", { n: (net < 0 ? "−" : "") + big(net) });
    $("nDrag").textContent = t("js.push.perM3", "{n} N per m³", { n: (drag < 0 ? "−" : "") + big(drag) });
    $("nGrav").textContent = t("js.push.perM3", "{n} N per m³", { n: big(GRAVITY) });
    $("nMass").textContent = t("js.push.mass", "{m} kg × the gain in speed", { m: big(1000) });
    for (const button of slide.querySelectorAll(".mu-toggle button")) button.classList.toggle("on", button.dataset.mu === state.mu);
    if (!state.active) draw();
  }

  $("tiltSlider").addEventListener("input", (e) => { state.tilt = parseFloat(e.target.value); updateCards(); });
  $("speedSlider").addEventListener("input", (e) => { state.speed = Math.round(parseFloat(e.target.value) * 10) / 10; updateCards(); });
  for (const button of slide.querySelectorAll(".mu-toggle button")) {
    button.addEventListener("click", () => { state.mu = button.dataset.mu; updateCards(); });
  }

  function activate() {
    state.active = true;
    state.last = performance.now();
    resize();
    updateCards(true);
    if (!state.looping) { state.looping = true; requestAnimationFrame(frame); }
  }

  window.addEventListener("resize", () => { if (state.active) resize(); });
  window.addEventListener("i18n:change", () => { updateCards(true); if (state.active) draw(); });
  window.addEventListener("lesson:slide", (event) => {
    const active = event.detail.simulator === "push";
    if (active && !state.active) activate();
    else if (!active) state.active = false;
  });

  updateCards(true);
  if (slide.classList.contains("on")) activate();
}());
