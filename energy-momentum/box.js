(function () {
"use strict";

/* Mass from confined energy.
   Every constituent is tracked in the box's own rest frame, where the mirrors are at
   rest and a bounce simply flips the sign of p'. The lab picture is then built by
   Lorentz-transforming each *event* - which is why the two bounces of a pair land at
   different lab times, and why momentum is briefly parked in the walls. */

const INK = "#1b1d20";
const MUTED = "#65676d";
const SOFT = "#92949a";
const LINE = "#dedfe3";
const BLUE = "#315a9f";
const GREEN = "#21805a";
const ORANGE = "#d95d39";

const L = 1;            // proper length of the box (c = 1, so also its light-crossing time)
const LOOP = 1.4;       // scene period for the wall-free scenarios, set so the flight stays on screen

const SCENARIOS = {
  photon: {
    label: "One photon", walls: false, scales: true,
    head: "Massless - and no chase can change that.",
    build: (e0) => [{ name: "photon", m: 0, p: e0, x0: 0.5 }],
    note: "A lone photon has E = pc, so E squared minus (pc) squared is zero. Chase it as hard as you like: the energy reddens, the invariant stays nailed to zero, and it still leaves at c.",
  },
  pair: {
    label: "Two photons", walls: false, scales: true,
    head: "Two massless things, one massive system.",
    build: (e0) => [
      { name: "photon", m: 0, p: e0, x0: 0.5 },
      { name: "photon", m: 0, p: -e0, x0: 0.5 },
    ],
    note: "Back to back, the momenta cancel while the energies add. The pair as a whole has E = 2E₀ and p = 0, so its invariant mass is 2E₀ - mass, built out of two things that have none.",
  },
  box: {
    label: "Mirror box", walls: true, scales: true,
    head: "You could put this box on a scale.",
    build: (e0) => [
      { name: "photon", m: 0, p: e0, x0: 0.5 },
      { name: "photon", m: 0, p: -e0, x0: 0.5 },
    ],
    note: "Trap the same pair between mirrors and the mass stops being bookkeeping: the box is harder to push and heavier to weigh, while containing nothing but light. Slow the clock right down and watch the walls hold the momentum between the two staggered bounces.",
  },
  proton: {
    label: "Proton", walls: true, scales: false,
    head: "Almost all of it is motion.",
    build: () => [
      { name: "up quark", m: 2.2, p: 169.1, x0: 0.24 },
      { name: "up quark", m: 2.2, p: -169.1, x0: 0.62 },
      { name: "down quark", m: 4.7, p: 300, x0: 0.78 },
      { name: "gluon field", m: 0, p: -300, x0: 0.13 },
    ],
    note: "Three quarks rattling around inside a box a femtometre wide, plus the gluon field that keeps them there. Add up the quark rest masses and you get 9 MeV. The proton weighs 938. The other 99% is exactly this: energy with nowhere to go.",
  },
};

const state = { key: "box", e0: 1, u: 0, rate: 1 };
let parts = [];
let clock = 0;
let flash = [];

const byId = (id) => document.getElementById(id);
const canvas = byId("boxCanvas");
const e0Slider = byId("boxEnergy");
const uSlider = byId("boxSpeed");
const rateSlider = byId("boxRate");

/* ---------- formatting ---------- */

const SUP = { 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };

function sig(x, digits) {
  return Number(x.toPrecision(digits || 3)).toString().replace("-", "−");
}

function fmtE(mev) {
  const a = Math.abs(mev);
  if (a < 1e-9) return "0";
  if (a < 1e-3) return sig(mev * 1e6) + " eV";
  if (a < 1) return sig(mev * 1e3) + " keV";
  if (a < 1e3) return sig(mev) + " MeV";
  if (a < 1e6) return sig(mev / 1e3) + " GeV";
  return sig(mev / 1e6) + " TeV";
}

function fmtKg(mev) {
  if (mev <= 0) return "0 kg";
  const kg = mev * 1.782661921e-30;
  const exp = Math.floor(Math.log10(kg));
  const digits = [...String(Math.abs(exp))].map((d) => SUP[d]).join("");
  return (kg / Math.pow(10, exp)).toFixed(1) + "×10⁻" + digits + " kg";
}

function fmtBeta(u) {
  const a = Math.abs(u);
  const sign = u < 0 ? "−" : "";
  if (1 - a < 5e-5) return sign + "0.99999… c";
  return sign + a.toFixed(4) + " c";
}

/* ---------- kinematics ---------- */

function gamma() {
  return 1 / Math.sqrt(1 - state.u * state.u);
}

/* fold an ever-growing path length into a bouncing position, with the current direction */
function fold(q) {
  const span = 2 * L;
  const s = ((q % span) + span) % span;
  return s < L ? { x: s - L / 2, dir: 1 } : { x: 1.5 * L - s, dir: -1 };
}

/* where a constituent is, and which way it is going, at box-frame time t */
function atProperTime(part, t) {
  const beta = part.p / Math.hypot(part.m, part.p);
  if (!SCENARIOS[state.key].walls) return { x: (part.x0 - 0.5) * L + beta * t, dir: Math.sign(beta) || 1 };
  const q0 = part.p >= 0 ? part.x0 * L : (2 - part.x0) * L;
  return fold(q0 + Math.abs(beta) * t);
}

/* invert t_lab = gamma (t' + u x'(t')) - monotonic, so a short bisection is exact enough */
function properTimeAt(part, tLab) {
  const g = gamma();
  const beta = part.p / Math.hypot(part.m, part.p);
  if (!SCENARIOS[state.key].walls) {
    return (tLab / g - state.u * (part.x0 - 0.5) * L) / (1 + state.u * beta);
  }
  const mid = tLab / g;
  let lo = mid - Math.abs(state.u) * L;
  let hi = mid + Math.abs(state.u) * L;
  for (let i = 0; i < 34; i += 1) {
    const t = (lo + hi) / 2;
    if (g * (t + state.u * atProperTime(part, t).x) < tLab) lo = t;
    else hi = t;
  }
  return (lo + hi) / 2;
}

/* the lab-frame snapshot every panel reads from */
function snapshot() {
  const g = gamma();
  const tLab = SCENARIOS[state.key].walls ? clock : clock % LOOP;
  const seen = parts.map((part) => {
    const t = properTimeAt(part, tLab);
    const here = atProperTime(part, t);
    const mag = Math.abs(part.p);
    const rest = Math.hypot(part.m, mag);
    const p = here.dir * mag;
    return {
      part,
      dir: here.dir,
      xLab: g * (here.x + state.u * t) - state.u * tLab,
      E: g * (rest + state.u * p),
      pc: g * (p + state.u * rest),
      shift: (rest + state.u * p) / rest,
    };
  });

  const sumE = seen.reduce((acc, s) => acc + s.E, 0);
  const sumP = seen.reduce((acc, s) => acc + s.pc, 0);
  const restE = parts.reduce((acc, part) => acc + Math.hypot(part.m, part.p), 0);
  const restP = SCENARIOS[state.key].walls ? 0 : parts.reduce((acc, part) => acc + part.p, 0);
  const sys = { E: g * (restE + state.u * restP), pc: g * (restP + state.u * restE) };
  return { seen, sumE, sumP, sys, tLab, M: Math.sqrt(Math.max(0, restE * restE - restP * restP)) };
}

/* ---------- panels ---------- */

/* "photon" twice reads as one thing counted twice, so number the duplicates */
function partLabel(part) {
  const twins = parts.filter((other) => other.name === part.name);
  if (twins.length < 2) return part.name;
  return part.name + " " + (twins.indexOf(part) + 1);
}

function rebuildRows() {
  const body = byId("boxRows");
  body.innerHTML = "";
  parts.forEach((part, i) => {
    const row = document.createElement("tr");
    const name = document.createElement("th");
    name.textContent = partLabel(part);
    row.appendChild(name);
    for (const id of ["bE" + i, "bP" + i]) {
      const cell = document.createElement("td");
      cell.id = id;
      cell.textContent = "-";
      row.appendChild(cell);
    }
    body.appendChild(row);
  });
  byId("wallRow").hidden = !SCENARIOS[state.key].walls;
  byId("wallNote").hidden = !SCENARIOS[state.key].walls;
}

function refresh(snap) {
  snap.seen.forEach((s, i) => {
    byId("bE" + i).textContent = fmtE(s.E);
    byId("bP" + i).textContent = fmtE(s.pc);
  });
  byId("boxSumE").textContent = fmtE(snap.sumE);
  byId("boxSumP").textContent = fmtE(snap.sumP);
  byId("boxWallE").textContent = fmtE(snap.sys.E - snap.sumE);
  byId("boxWallP").textContent = fmtE(snap.sys.pc - snap.sumP);
  byId("wallRow").classList.toggle("live", Math.abs(snap.sys.pc - snap.sumP) > Math.abs(snap.sys.E) * 0.02);
  byId("boxInv").textContent = fmtE(snap.M);
  byId("boxFrame").textContent = Math.abs(state.u) < 0.005 ? "at rest" : "moving at " + fmtBeta(state.u);

  const restSum = parts.reduce((acc, part) => acc + part.m, 0);
  const share = snap.M > 0 ? restSum / snap.M : 0;
  byId("budgetParts").style.width = (share > 0 ? Math.max(share * 100, 1.4) : 0) + "%";
  byId("budgetMotion").style.width = (1 - share) * 100 + "%";
  byId("budgetPartsValue").textContent = fmtE(restSum);
  byId("budgetMotionValue").textContent = fmtE(snap.M - restSum);
  byId("budgetShare").textContent = snap.M > 0
    ? sig((1 - share) * 100, 4) + "% of this system's mass is motion, not matter."
    : "No rest frame, no mass - there is nothing here to weigh.";
  byId("boxWeight").textContent = snap.M > 0 ? fmtKg(snap.M) : "weightless";

  const scenario = SCENARIOS[state.key];
  byId("boxVerdict").className = snap.M > 0 ? "verdict rest" : "verdict";
  byId("boxVerdictHead").textContent = scenario.head;
  byId("boxVerdictDetail").textContent = scenario.note;

  byId("boxEnergyValue").textContent = scenario.scales ? fmtE(state.e0) : "set by QCD";
  byId("boxSpeedValue").textContent = Math.abs(state.u) < 0.005 ? "0 · at rest" : fmtBeta(state.u);
  byId("boxRateValue").textContent = state.rate === 0 ? "frozen" : state.rate.toFixed(2) + "×";
}

/* ---------- canvas ---------- */

function fit() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = canvas.clientWidth | 0;
  const height = canvas.clientHeight | 0;
  if (!width || !height) return { ctx: null, w: 0, h: 0 };
  const pw = Math.round(width * dpr);
  const ph = Math.round(height * dpr);
  if (canvas.width !== pw || canvas.height !== ph) {
    canvas.width = pw;
    canvas.height = ph;
  }
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w: width, h: height };
}

function label(ctx, text, x, y, color, font, align) {
  ctx.font = font || "700 11px Inter, sans-serif";
  ctx.fillStyle = color;
  ctx.textAlign = align || "center";
  ctx.fillText(text, x, y);
}

/* red where the chase redshifts it, blue where it blueshifts */
function shiftColor(shift) {
  const t = Math.max(-1, Math.min(1, (shift - 1) * 1.6));
  const ends = t < 0 ? [[85, 82, 185], [187, 58, 36]] : [[85, 82, 185], [42, 95, 174]];
  const k = Math.abs(t);
  const mix = ends[0].map((c, i) => Math.round(c + (ends[1][i] - c) * k));
  return "rgb(" + mix[0] + "," + mix[1] + "," + mix[2] + ")";
}

function arrowHead(ctx, x, y, dir, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x + dir * 7, y);
  ctx.lineTo(x, y - 4.5);
  ctx.lineTo(x, y + 4.5);
  ctx.fill();
}

function drawScene(ctx, w, sceneH, snap) {
  const scenario = SCENARIOS[state.key];
  const g = gamma();
  const cx = w / 2;
  const span = Math.min(w - 150, 520);
  /* with no walls there is nothing to keep the flight on screen, so zoom out until a
     whole loop fits */
  const px = scenario.walls ? span / L : Math.min(span / L, (w / 2 - 50) / (LOOP * (1 + Math.abs(state.u))));
  const boxW = span / g;
  const boxTop = 64;
  const boxH = Math.max(72, Math.min(sceneH - 150, 30 + parts.length * 32));
  const boxBottom = boxTop + boxH;

  if (Math.abs(state.u) > 0.004) {
    const dir = Math.sign(state.u);
    const arrowY = boxTop - 30;
    ctx.strokeStyle = SOFT;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(cx - dir * 46, arrowY);
    ctx.lineTo(cx + dir * 46, arrowY);
    ctx.stroke();
    arrowHead(ctx, cx + dir * 46, arrowY, dir, SOFT);
    label(ctx, "the whole system is moving at " + fmtBeta(state.u), cx, arrowY - 12, MUTED, "650 10px Inter, sans-serif");
  }

  if (scenario.walls) {
    ctx.fillStyle = "#fbfbfa";
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.rect(cx - boxW / 2, boxTop, boxW, boxH);
    ctx.fill();
    ctx.stroke();

    for (const side of [-1, 1]) {
      const wx = cx + side * boxW / 2;
      const hit = flash.find((f) => f.side === side);
      const heat = hit ? Math.max(0, 1 - (snap.tLab - hit.t) / 0.22) : 0;
      ctx.strokeStyle = heat > 0 ? ORANGE : INK;
      ctx.globalAlpha = heat > 0 ? 0.45 + heat * 0.55 : 0.75;
      ctx.lineWidth = 5 + heat * 4;
      ctx.beginPath();
      ctx.moveTo(wx, boxTop);
      ctx.lineTo(wx, boxBottom);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    const shape = g > 1.005 ? "squashed to " + (100 / g).toFixed(0) + "% of its own length" : "one unit of proper length";
    label(ctx, "perfect mirrors · " + shape, cx, boxBottom + 21, SOFT, "650 10px Inter, sans-serif");
  } else {
    for (let i = 0; i < parts.length; i += 1) {
      const y = boxTop + boxH * (i + 0.5) / parts.length;
      ctx.strokeStyle = LINE;
      ctx.setLineDash([4, 5]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - span / 2 - 40, y);
      ctx.lineTo(cx + span / 2 + 40, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(217,93,57,.2)";
      ctx.beginPath();
      ctx.arc(cx, y, 16 * Math.max(0, 1 - snap.tLab / 0.35), 0, Math.PI * 2);
      ctx.fill();
    }
    label(ctx, "no walls - released from the centre, over and over", cx, boxBottom + 21, SOFT, "650 10px Inter, sans-serif");
  }

  const refP = g * (1 + Math.abs(state.u)) * Math.max(...parts.map((part) => Math.hypot(part.m, part.p)));
  snap.seen.forEach((s, i) => {
    const y = boxTop + boxH * (i + 0.5) / parts.length;
    const x = cx + s.xLab * px;
    if (x < -60 || x > w + 60) return;
    const color = shiftColor(s.shift);
    const dir = Math.sign(s.pc) || 1;
    const arrow = Math.max(9, Math.abs(s.pc) / refP * 52);

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.18;
    ctx.beginPath();
    ctx.moveTo(x - dir * 26, y);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + dir * arrow, y);
    ctx.stroke();
    arrowHead(ctx, x + dir * arrow, y, dir, color);

    ctx.fillStyle = color;
    ctx.globalAlpha = 0.2;
    ctx.beginPath();
    ctx.arc(x, y, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();

    label(ctx, fmtE(s.E), x, y - 15, color, "750 10.5px Inter, sans-serif");
    label(ctx, partLabel(s.part), cx - span / 2 - 14, y + 4, MUTED, "650 10px Inter, sans-serif", "right");
  });

  const held = Math.abs(snap.sys.pc - snap.sumP);
  if (scenario.walls && held > Math.abs(snap.sys.E) * 0.02) {
    label(ctx, "the mirrors are holding " + fmtE(held) + " of momentum right now", cx, boxTop - 10, ORANGE, "750 10px Inter, sans-serif");
  }

  const rulerY = boxBottom + 40;
  const rulerL = cx - span / 2 - 30;
  const rulerR = cx + span / 2 + 30;
  ctx.strokeStyle = "#eceded";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(rulerL, rulerY);
  ctx.lineTo(rulerR, rulerY);
  ctx.stroke();
  const step = px / 4;
  const drift = ((-state.u * snap.tLab * px) % step + step) % step;
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1;
  for (let x = rulerL + drift; x < rulerR; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, rulerY);
    ctx.lineTo(x, rulerY + 6);
    ctx.stroke();
  }
  const rulerNote = Math.abs(state.u) < 0.004 ? "lab ruler - nothing is moving" : "lab ruler - sliding past underneath";
  label(ctx, rulerNote, cx, rulerY + 20, SOFT, "650 9.5px Inter, sans-serif");
}

function drawTriangle(ctx, w, top, h, snap) {
  const padL = 96;
  const padR = 34;
  const availW = w - padL - padR;
  const availH = h - 76;
  if (availW < 80 || availH < 44) return;

  const p = Math.abs(snap.sys.pc);
  const scale = Math.min(availW / Math.max(p, 1e-9), availH / Math.max(snap.M, 1e-9));
  const legW = Math.min(p * scale, availW);
  const x0 = padL + (availW - legW) / 2;
  const y0 = top + 34 + availH;
  const bx = x0 + legW;
  const by = y0 - Math.min(snap.M * scale, availH);

  ctx.lineCap = "round";
  ctx.strokeStyle = BLUE;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(bx, y0);
  ctx.stroke();

  ctx.strokeStyle = ORANGE;
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(bx, by);
  ctx.stroke();

  /* drawn last so it stays visible when the triangle collapses onto it at Σp = 0 */
  ctx.strokeStyle = GREEN;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(bx, y0);
  ctx.lineTo(bx, by);
  ctx.stroke();

  label(ctx, "Σpc = " + fmtE(snap.sys.pc), (x0 + bx) / 2, y0 + 20, BLUE);
  label(ctx, "M = " + fmtE(snap.M), bx + 10, (y0 + by) / 2 + 4, GREEN, undefined, "left");
  if (legW > 40) {
    ctx.save();
    ctx.translate((x0 + bx) / 2, (y0 + by) / 2);
    ctx.rotate(-Math.atan2(y0 - by, bx - x0));
    label(ctx, "ΣE = " + fmtE(snap.sys.E), 0, -9, ORANGE);
    ctx.restore();
  } else {
    label(ctx, "ΣE = " + fmtE(snap.sys.E), x0 - 10, (y0 + by) / 2 - 8, ORANGE, undefined, "right");
  }
  label(ctx, "the system's own triangle", 24, top + 26, MUTED, "650 10px Inter, sans-serif", "left");
  label(ctx, "the green leg never moves", 24, top + 43, GREEN, "750 10px Inter, sans-serif", "left");
}

function draw(snap) {
  const { ctx, w, h } = fit();
  if (!ctx) return;
  ctx.clearRect(0, 0, w, h);
  const split = h * 0.66;
  drawScene(ctx, w, split, snap);
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, split);
  ctx.lineTo(w, split);
  ctx.stroke();
  drawTriangle(ctx, w, split, h - split, snap);
}

/* ---------- controls ---------- */

function setScenario(key) {
  state.key = key;
  clock = 0;
  flash = [];
  dirs = [];
  parts = SCENARIOS[key].build(state.e0);
  e0Slider.disabled = !SCENARIOS[key].scales;
  document.querySelectorAll("#boxTabs .scenario").forEach((tab) => {
    tab.classList.toggle("on", tab.dataset.box === key);
  });
  rebuildRows();
  refresh(snapshot());
}

document.querySelectorAll("#boxTabs .scenario").forEach((tab) => {
  tab.addEventListener("click", () => setScenario(tab.dataset.box));
});

e0Slider.addEventListener("input", () => {
  state.e0 = Math.pow(10, Number(e0Slider.value));
  if (SCENARIOS[state.key].scales) parts = SCENARIOS[state.key].build(state.e0);
});

uSlider.addEventListener("input", () => {
  state.u = Math.tanh(Number(uSlider.value));
});

rateSlider.addEventListener("input", () => {
  state.rate = Number(rateSlider.value);
});

byId("boxBoostBtn").addEventListener("click", () => {
  uSlider.value = 0.62;
  state.u = Math.tanh(0.62);
});

byId("boxStopBtn").addEventListener("click", () => {
  uSlider.value = 0;
  state.u = 0;
});

byId("boxResetBtn").addEventListener("click", () => {
  uSlider.value = 0;
  state.u = 0;
  rateSlider.value = 1;
  state.rate = 1;
  setScenario(state.key);
});

/* ---------- loop ---------- */

let raf = 0;
let last = 0;
let frames = 0;
let active = false;
let dirs = [];

function frame(now) {
  raf = requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000 || 0);
  last = now;
  clock += dt * 0.55 * state.rate;

  const snap = snapshot();
  snap.seen.forEach((s, i) => {
    if (dirs[i] !== undefined && dirs[i] !== s.dir) flash.unshift({ side: -s.dir, t: snap.tLab });
    dirs[i] = s.dir;
  });
  flash = flash.filter((f) => snap.tLab - f.t < 0.25).slice(0, 4);

  draw(snap);
  if (frames % 3 === 0) refresh(snap);
  frames += 1;
}

function setActive(on) {
  if (on === active) return;
  active = on;
  if (active) {
    last = performance.now();
    raf = requestAnimationFrame(frame);
  } else {
    cancelAnimationFrame(raf);
  }
}

window.addEventListener("lesson:slide", (event) => setActive(event.detail.simulator === "box"));

setScenario("box");
setActive(document.querySelector(".slide.on")?.dataset.simulator === "box");
}());
