/* Slide 04: weigh the carrying term against the friction term. Two bars, their ratio (the
   Reynolds number), a sketch of the flow behind a stone for that ratio, and a ruler of Re. */
(function () {
  "use strict";
  const slide = document.querySelector('[data-simulator="re"]');
  if (!slide) return;
  const t = (key, english, vars) => {
    if (window.I18N) return window.I18N.t(key, english, vars);
    return vars ? english.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? vars[name] : m)) : english;
  };
  const $ = (id) => document.getElementById(id);
  const reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const FLUIDS = { air: { rho: 1.2, mu: 0.000018 }, water: { rho: 1000, mu: 0.001 }, honey: { rho: 1400, mu: 5 } };
  const PRESETS = {
    bacteria: { fluid: "water", logU: -4.7, logL: -5.7 },
    honey: { fluid: "honey", logU: -1.3, logL: -2 },
    stick: { fluid: "water", logU: -2, logL: -2 },
    plane: { fluid: "air", logU: 2.4, logL: 0.7 },
    storm: { fluid: "air", logU: 1.5, logL: 5.7 },
  };
  const state = { preset: "stick", fluid: "water", logU: -2, logL: -2, time: 0, active: false, looping: false, last: 0, key: "" };
  const U = () => Math.pow(10, state.logU), L = () => Math.pow(10, state.logL);
  const carry = () => FLUIDS[state.fluid].rho * U() * U() / L();
  const fric = () => FLUIDS[state.fluid].mu * U() / (L() * L());
  const reynolds = () => carry() / fric();

  /* ---- number formatting ---- */
  const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
  const sup = (n) => (n < 0 ? "⁻" : "") + String(Math.abs(n)).split("").map((d) => SUP[+d]).join("");
  const dec = () => t("js.re.decimal", ".");
  const sci = (v) => {
    if (v === 0) return "0";
    const e = Math.floor(Math.log10(v)), m = v / Math.pow(10, e);
    if (e >= -2 && e <= 3) {
      const r = v >= 100 ? Math.round(v) : v >= 10 ? Math.round(v) : v >= 1 ? Math.round(v * 10) / 10 : Math.round(v * 1000) / 1000;
      return String(r).replace(".", dec());
    }
    const mm = Math.round(m * 10) / 10;
    return (mm === 1 ? "" : String(mm).replace(".", dec()) + " × ") + "10" + sup(e);
  };
  const unitU = (u) => (u >= 1 ? t("js.re.ms", "{v} m/s", { v: sci(u) }) : u >= 0.01 ? t("js.re.cms", "{v} cm/s", { v: sci(u * 100) }) : u >= 0.00001 ? t("js.re.mms", "{v} mm/s", { v: sci(u * 1000) }) : t("js.re.ums", "{v} µm/s", { v: sci(u * 1e6) }));
  const unitL = (l) => (l >= 1000 ? t("js.re.km", "{v} km", { v: sci(l / 1000) }) : l >= 1 ? t("js.re.m", "{v} m", { v: sci(l) }) : l >= 0.01 ? t("js.re.cm", "{v} cm", { v: sci(l * 100) }) : l >= 0.001 ? t("js.re.mm", "{v} mm", { v: sci(l * 1000) }) : t("js.re.um", "{v} µm", { v: sci(l * 1e6) }));

  const regime = (re) => (re < 1 ? "creep" : re < 40 ? "steady" : re < 2000 ? "street" : "turbulent");

  /* ---- canvas ---- */
  const W = 760, H = 300;
  const C = { ink: "#1b1d20", muted: "#65676d", soft: "#92949a", line: "#dedfe3", wash: "#f5f5f3", blue: "#315a9f", bluePale: "#eaf1ff", orange: "#d95d39", orangePale: "#fff0e9", violet: "#5552b9", green: "#21805a", paper: "#fff", stone: "#9aa0aa" };
  const canvas = $("reCanvas"), ctx = canvas.getContext("2d");
  let scale = 1;
  const ts = () => Math.max(1, Math.min(2, 1 / scale));
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
  function label(text, x, y, color, size, weight, align, halo) {
    ctx.font = font(size, weight); ctx.textAlign = align || "left"; ctx.textBaseline = "alphabetic";
    if (halo) { ctx.save(); ctx.lineJoin = "round"; ctx.lineWidth = 3 * ts(); ctx.strokeStyle = C.paper; ctx.strokeText(text, x, y); ctx.restore(); }
    ctx.fillStyle = color; ctx.fillText(text, x, y);
  }
  function roundRect(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* ---- left: the two bars on a log scale ---- */
  const BAR = { x: 24, w: 250, top: 58, h: 22, gap: 42, lo: -8, hi: 10 };
  const barLen = (v) => BAR.w * Math.max(0, Math.min(1, (Math.log10(Math.max(v, 1e-30)) - BAR.lo) / (BAR.hi - BAR.lo)));

  function drawBars() {
    const c = carry(), f = fric(), re = reynolds();
    label(t("js.re.reBig", "Re ≈ {re}", { re: sci(re) }), BAR.x, 36, C.ink, 20, 850, "left");
    label(t("js.re.ratio", "carrying ÷ friction"), BAR.x + BAR.w, 36, C.soft, 9.5, 650, "right");
    for (const e of [-6, -3, 0, 3, 6, 9]) {
      const x = BAR.x + barLen(Math.pow(10, e));
      ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, BAR.top - 6); ctx.lineTo(x, BAR.top + BAR.h + BAR.gap + BAR.h + 6); ctx.stroke();
      label("10" + sup(e), x, BAR.top + BAR.h + BAR.gap + BAR.h + 18, C.soft, 8.5, 650, "center");
    }
    const rows = [
      { v: c, color: C.orange, pale: C.orangePale, name: t("js.re.carry", "carrying ρU²∕L"), y: BAR.top },
      { v: f, color: C.blue, pale: C.bluePale, name: t("js.re.fric", "friction μU∕L²"), y: BAR.top + BAR.h + BAR.gap },
    ];
    for (const r of rows) {
      label(r.name, BAR.x, r.y - 6, r.color, 9.5, 800, "left");
      ctx.fillStyle = r.pale; roundRect(BAR.x, r.y, BAR.w, BAR.h, 5); ctx.fill();
      ctx.fillStyle = r.color; roundRect(BAR.x, r.y, Math.max(6, barLen(r.v)), BAR.h, 5); ctx.fill();
      const text = t("js.re.perM3", "{v} N per m³", { v: sci(r.v) }), len = Math.max(6, barLen(r.v));
      ctx.font = font(9.5, 750);
      if (len + 8 + ctx.measureText(text).width <= BAR.w + 14) label(text, BAR.x + len + 6, r.y + BAR.h / 2 + 3.5, r.color, 9.5, 750, "left", true);
      else label(text, BAR.x + len - 6, r.y + BAR.h / 2 + 3.5, C.paper, 9.5, 750, "right");
    }
    label(t("js.re.axisNote", "N on each cubic metre, each step ×1000"), BAR.x, BAR.top + BAR.h + BAR.gap + BAR.h + 32, C.soft, 8.5, 650, "left");
  }

  /* ---- right: two rulers, size and speed, so the reader sees how different the examples are ---- */
  const EX = [
    { key: "bacteria", logU: -4.7, logL: -5.7, logRe: -4.5, name: () => t("js.re.exBacteria", "bacteria") },
    { key: "honey", logU: -1.3, logL: -2, logRe: -0.85, name: () => t("js.re.exHoney", "honey from a spoon") },
    { key: "stick", logU: -2, logL: -2, logRe: 2, name: () => t("js.re.exStick", "stick in a stream") },
    { key: "plane", logU: 2.4, logL: 0.7, logRe: 7.7, name: () => t("js.re.exPlane", "passenger plane") },
    { key: "storm", logU: 1.5, logL: 5.7, logRe: 12, name: () => t("js.re.exStorm", "a storm") },
  ];
  const RX = 320, RW = 420;

  /* small drawings for the examples */
  function icon(key, x, y, color) {
    ctx.save(); ctx.translate(x, y); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 1.4; ctx.lineCap = "round"; ctx.lineJoin = "round";
    if (key === "bacteria") {
      ctx.beginPath(); ctx.ellipse(0, 0, 6, 3.2, -0.3, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(5, -2); ctx.quadraticCurveTo(9, -6, 12, -2); ctx.quadraticCurveTo(15, 2, 18, -2); ctx.stroke();
    } else if (key === "honey") {
      ctx.beginPath(); ctx.moveTo(-8, -8); ctx.quadraticCurveTo(0, -12, 8, -8); ctx.quadraticCurveTo(0, -3, -8, -8); ctx.fill();
      ctx.beginPath(); ctx.moveTo(0, -5); ctx.bezierCurveTo(-4, 0, -4, 4, 0, 7); ctx.bezierCurveTo(4, 4, 4, 0, 0, -5); ctx.fill();
    } else if (key === "stick") {
      ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(0, 7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-10, 4); ctx.quadraticCurveTo(-5, 0, 0, 4); ctx.quadraticCurveTo(5, 8, 10, 4); ctx.stroke();
    } else if (key === "plane") {
      ctx.beginPath(); ctx.moveTo(-12, 1); ctx.lineTo(10, -1); ctx.lineTo(13, 0); ctx.lineTo(10, 2); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-2, 0); ctx.lineTo(-7, -8); ctx.lineTo(-4, -8); ctx.lineTo(3, 0); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-2, 1); ctx.lineTo(-7, 8); ctx.lineTo(-4, 8); ctx.lineTo(3, 1); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-11, 0); ctx.lineTo(-14, -5); ctx.lineTo(-12, -5); ctx.lineTo(-8, 0); ctx.closePath(); ctx.fill();
    } else if (key === "storm") {
      ctx.lineWidth = 1.8;
      for (const a0 of [0, 2.1, 4.2]) {
        ctx.beginPath();
        for (let a = 0; a < 3.2; a += 0.2) { const rr = 2 + a * 3.2, px = rr * Math.cos(a + a0), py = rr * Math.sin(a + a0); a ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
        ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(0, 0, 1.8, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  function ruler(y, lo, hi, value, title, fmt, examples, colorFill, icons) {
    const X = (v) => RX + RW * (v - lo) / (hi - lo);
    if (title) label(title, RX, y - 36, C.muted, 9.5, 700, "left");
    if (colorFill) for (const [p, q, color] of colorFill) { ctx.fillStyle = color; ctx.fillRect(X(p), y - 7, X(q) - X(p), 14); }
    ctx.strokeStyle = C.soft; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(RX, y); ctx.lineTo(RX + RW, y); ctx.stroke();
    for (let e = Math.ceil(lo); e <= hi; e += (hi - lo > 12 ? 4 : 3)) { ctx.beginPath(); ctx.moveTo(X(e), y - 3); ctx.lineTo(X(e), y + 3); ctx.stroke(); label(fmt(e), X(e), y + 16, C.soft, 8.5, 650, "center"); }
    examples.forEach((ex, i) => {
      const x = X(ex.v);
      ctx.strokeStyle = C.muted; ctx.beginPath(); ctx.moveTo(x, y - 10); ctx.lineTo(x, y - 4); ctx.stroke();
      label(ex.name, x, y - 12 - (i % 2) * 10, C.muted, 8.5, 650, x < RX + 40 ? "left" : x > RX + RW - 50 ? "right" : "center", true);
      if (icons) icon(ex.key, Math.max(RX + 14, Math.min(RX + RW - 14, x)), y - 44, C.muted);
    });
    const v = Math.max(lo, Math.min(hi, value));
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.moveTo(X(v), y - 8); ctx.lineTo(X(v) - 6, y + 4); ctx.lineTo(X(v) + 6, y + 4); ctx.closePath(); ctx.fill();
  }
  const pow = (e) => "10" + sup(e);
  function drawScales() {
    label(t("js.re.scalesTitle", "very different sizes and speeds, one number places them all"), RX, 30, C.ink, 10, 800, "left");
    ruler(84, -6, 6, state.logL, t("js.re.sizeRuler", "size L (metres)"), pow, EX.map((e) => ({ v: e.logL, name: e.name(), key: e.key })));
    ruler(160, -5, 2.5, state.logU, t("js.re.speedRuler", "speed U (metres per second)"), pow, EX.map((e) => ({ v: e.logU, name: e.name(), key: e.key })));
  }

  /* ---- bottom: the ruler of Re ---- */
  const RU = { y: 262, lo: -6, hi: 12 };

  function drawRuler() {
    const bands = [[-6, 0, "rgba(49,90,159,.16)"], [0, 1.6, "rgba(85,82,185,.14)"], [1.6, 3.3, "rgba(217,93,57,.14)"], [3.3, 12, "rgba(217,93,57,.28)"]];
    ruler(RU.y, RU.lo, RU.hi, Math.log10(reynolds()), "", pow, EX.map((e) => ({ v: e.logRe, name: e.name(), key: e.key })), bands, true);
    const kind = regime(reynolds());
    const names = { creep: t("js.re.creep", "friction wins: smooth layers"), steady: t("js.re.steady", "two quiet swirls behind the object"), street: t("js.re.street", "a vortex street"), turbulent: t("js.re.turbulent", "turbulence") };
    label(t("js.re.reRuler", "Re = ρUL∕μ"), RX, RU.y + 36, C.muted, 9.5, 700, "left", true);
    label(t("js.re.you", "this case") + ": " + names[kind], RX + RW, RU.y + 36, C.ink, 9.5, 800, "right", true);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    drawBars(); drawScales(); drawRuler();
  }

  /* ---- cards and equation ---- */
  const VERDICT = () => ({
    creep: [t("js.re.vCreepTitle", "Re below 1 · friction wins"), t("js.re.vCreep", "Smooth and layered. Every swirl is wiped out faster than it can form.")],
    steady: [t("js.re.vSteadyTitle", "Re 1 to 40 · carrying starts to count"), t("js.re.vSteady", "Two quiet swirls sit behind the object and stay there.")],
    street: [t("js.re.vStreetTitle", "Re 40 to 2 000 · carrying and friction fight"), t("js.re.vStreet", "Swirls break off behind the object, first one side, then the other: a vortex street.")],
    turbulent: [t("js.re.vTurbTitle", "Re in the thousands and up · carrying wins"), t("js.re.vTurb", "Turbulence: swirls inside swirls, down to the size where friction wipes them out.")],
  });

  function updateCards(force) {
    const key = `${state.fluid}|${state.logU}|${state.logL}`;
    if (!force && key === state.key) return;
    state.key = key;
    const re = reynolds(), kind = regime(re), v = VERDICT()[kind];
    const card = $("wRe");
    card.querySelector("i").textContent = v[0];
    card.querySelector("b").textContent = v[1];
    card.querySelector("span").textContent = re >= 1
      ? t("js.re.ratioBig", "Carrying is {r} times friction.", { r: sci(re) })
      : t("js.re.ratioSmall", "Friction is {r} times carrying.", { r: sci(1 / re) });
    card.className = "verdict " + { creep: "calm", steady: "press", street: "", turbulent: "wild" }[kind];
    for (const b of slide.querySelectorAll(".re-presets button")) b.classList.toggle("on", b.dataset.preset === state.preset);
    for (const b of slide.querySelectorAll(".re-fluid button")) b.classList.toggle("on", b.dataset.fluid === state.fluid);
    draw();
  }

  for (const b of slide.querySelectorAll(".re-fluid button")) b.addEventListener("click", () => { state.fluid = b.dataset.fluid; updateCards(); });
  for (const b of slide.querySelectorAll(".re-presets button")) b.addEventListener("click", () => {
    const p = PRESETS[b.dataset.preset];
    state.preset = b.dataset.preset; state.fluid = p.fluid; state.logU = p.logU; state.logL = p.logL;
    updateCards();
  });

  function activate() {
    state.active = true;
    state.last = performance.now();
    resize();
    updateCards(true);
  }
  window.addEventListener("resize", () => { if (state.active) resize(); });
  window.addEventListener("i18n:change", () => { updateCards(true); if (state.active) draw(); });
  window.addEventListener("lesson:slide", (event) => {
    const active = event.detail.simulator === "re";
    if (active && !state.active) activate();
    else if (!active) state.active = false;
  });
  updateCards(true);
  if (slide.classList.contains("on")) activate();
}());
