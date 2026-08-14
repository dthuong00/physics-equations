(function () {
"use strict";

/* ---------- constants & state ---------- */

const INK = "#1b1d20";
const MUTED = "#65676d";
const SOFT = "#92949a";
const LINE = "#dedfe3";
const BLUE = "#315a9f";
const GREEN = "#21805a";
const ORANGE = "#d95d39";
const VIOLET = "#5552b9";

const PARTICLES = {
  electron: {
    label: "Electron", mc2: 0.511, pSlider: -0.3,
    note: "mc² = 0.511 MeV — so light that a few million volts already make it relativistic. Push pc past a couple of MeV and watch the triangle flatten.",
  },
  proton: {
    label: "Proton", mc2: 938.272, pSlider: 3,
    note: "mc² = 938 MeV: the same momentum that flattens an electron barely tilts a proton. The LHC pushes protons to pc ≈ 7 TeV, where γ ≈ 7000.",
  },
  photon: {
    label: "Photon", mc2: 0, pSlider: 0,
    note: "m = 0, so E = pc exactly — at every energy from radio waves to gamma rays. β = pc ∕ E = 1: it cannot slow down, and no boost can catch it.",
  },
  custom: {
    label: "Custom particle", mc2: 100, pSlider: 2,
    note: "Invent a particle: set its rest energy with the mass slider, then drive it. The same momentum means very different speeds for different masses.",
  },
};

const state = { key: "electron", mc2: 0.511, pc: Math.pow(10, -0.3), u: 0 };
const target = { p: 0, m: 0, pl: 0 };
const disp = { p: 0, m: 0, pl: 0 };
let posLight = 0.12;
let posPart = 0.12;

const byId = (id) => document.getElementById(id);
const triCanvas = byId("triCanvas");
const mapCanvas = byId("mapCanvas");
const pSlider = byId("pSlider");
const mSlider = byId("mSlider");
const boostSlider = byId("boostSlider");

/* ---------- physics ---------- */

function labEnergy() {
  return Math.hypot(state.pc, state.mc2);
}

function boosted() {
  const E = labEnergy();
  const g = 1 / Math.sqrt(1 - state.u * state.u);
  const pc = g * (state.pc - state.u * E);
  return { E: g * (E - state.u * state.pc), pc: Math.abs(pc) < E * 1e-12 ? 0 : pc };
}

/* kinetic energy via pc²/(E + mc²): equals E − mc² without cancellation */
function kinetic(E, pc) {
  return pc * pc / (E + state.mc2);
}

/* 1 − β computed stably for ultra-relativistic display */
function lightGap(E, pc) {
  return state.mc2 * state.mc2 / (E * (E + Math.abs(pc)));
}

/* ---------- formatting ---------- */

const SUP = { 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };

function sig(x) {
  return Number(x.toPrecision(3)).toString();
}

function fmtTiny(x) {
  const [mant, exp] = x.toExponential(1).split("e-");
  return `${mant}×10⁻${[...exp].map((d) => SUP[d] || d).join("")}`;
}

function fmtE(mev) {
  const a = Math.abs(mev);
  if (a < 1e-9) return "0";
  if (a < 1e-3) return `${sig(mev * 1e6)} eV`;
  if (a < 1) return `${sig(mev * 1e3)} keV`;
  if (a < 1e3) return `${sig(mev)} MeV`;
  if (a < 1e6) return `${sig(mev / 1e3)} GeV`;
  return `${sig(mev / 1e6)} TeV`;
}

function fmtBeta(beta) {
  const sign = beta < 0 ? "−" : "";
  const a = Math.abs(beta);
  if (a >= 1) return `${sign}c`;
  if (a < 1e-4) return `${sign}${fmtTiny(a || 1e-12)} c`;
  if (1 - a < 5e-5) return `${sign}(1 − ${fmtTiny(1 - a)}) c`;
  return `${sign}${a.toFixed(4)} c`;
}

function fmtGamma(g) {
  if (!Number.isFinite(g)) return "∞";
  if (g < 10) return g.toFixed(3);
  if (g < 1000) return g.toFixed(1);
  return sig(g);
}

/* ---------- readouts ---------- */

function setCell(id, text) {
  byId(id).textContent = text;
}

function updateReadouts() {
  const E = labEnergy();
  const b = boosted();
  const massless = state.mc2 === 0;

  setCell("labE", fmtE(E));
  setCell("obsE", fmtE(b.E));
  setCell("labP", fmtE(state.pc));
  setCell("obsP", fmtE(b.pc));
  setCell("labV", fmtBeta(state.pc / E));
  setCell("obsV", fmtBeta(b.pc / b.E));
  setCell("labG", massless ? "∞" : fmtGamma(E / state.mc2));
  setCell("obsG", massless ? "∞" : fmtGamma(b.E / state.mc2));
  setCell("labK", fmtE(kinetic(E, state.pc)));
  setCell("obsK", fmtE(kinetic(b.E, b.pc)));
  setCell("labI", fmtE(state.mc2));
  setCell("obsI", fmtE(state.mc2));

  byId("frameTag").textContent = Math.abs(state.u) < 0.005 ? "lab frame" : `observer at ${fmtBeta(state.u)}`;
  byId("pValue").textContent = fmtE(state.pc);
  byId("mValue").textContent = fmtE(state.mc2);
  byId("boostValue").textContent = Math.abs(state.u) < 0.005 ? "0 · lab" : fmtBeta(state.u);
}

function updateVerdict() {
  const verdict = byId("verdict");
  const head = byId("verdictHead");
  const detail = byId("verdictDetail");
  const E = labEnergy();
  const b = boosted();

  if (state.mc2 === 0) {
    verdict.className = "verdict";
    if (Math.abs(state.u) > 0.01) {
      const shifted = b.E < E;
      const factor = sig(shifted ? E / b.E : b.E / E);
      head.textContent = "Light: uncatchable.";
      detail.textContent = `You are moving at ${fmtBeta(state.u)} and it still recedes at exactly c. The chase changed only its energy: ${fmtE(E)} in the lab, ${fmtE(b.E)} for you — ${shifted ? "redshifted" : "blueshifted"} ${factor}×.`;
    } else {
      head.textContent = "E = pc: pure motion-energy.";
      detail.textContent = "No mass leg at all — the triangle is a flat line at every energy. Press “Chase it” and see what a 0.9999997 c pursuit accomplishes.";
    }
    return;
  }

  const gb = b.E / state.mc2;
  const beta = b.pc / b.E;
  const newtonErr = (b.E - state.mc2) / (2 * state.mc2);
  if (Math.abs(b.pc) < b.E * 1e-6) {
    verdict.className = "verdict rest";
    head.textContent = "Caught it — this is its rest frame.";
    detail.textContent = `The momentum leg is gone and only mass remains: E = mc² = ${fmtE(state.mc2)}. You are standing in the one frame where Einstein’s famous shortcut is the whole story.`;
  } else if (gb < 1.05) {
    verdict.className = "verdict newton";
    head.textContent = "Newton’s territory.";
    detail.textContent = `At ${fmtBeta(beta)}, relativity barely matters: Newton’s ½mv² overshoots by only ${sig(newtonErr * 100)}%. The triangle is nearly a vertical stick — motion is a rounding error on mass.`;
  } else if (gb < 8) {
    verdict.className = "verdict";
    head.textContent = "Fully relativistic.";
    detail.textContent = `γ = ${fmtGamma(gb)}: clocks aboard tick ${fmtGamma(gb)}× slower than yours, and Newton’s kinetic energy is already ${sig(newtonErr * 100)}% too big. Both legs of the triangle matter now.`;
  } else {
    verdict.className = "verdict";
    head.textContent = "Nearly light-like.";
    detail.textContent = `The mass leg is only ${sig(state.mc2 / b.E * 100)}% of the hypotenuse — energetically this particle is almost pure light. Yet its speed still misses c, by ${fmtTiny(lightGap(b.E, b.pc))} of c.`;
  }
}

function updateAll() {
  const b = boosted();
  target.p = b.pc;
  target.m = state.mc2;
  target.pl = state.pc;
  updateReadouts();
  updateVerdict();
}

/* ---------- canvas helpers ---------- */

function fit(canvas) {
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

/* ---------- energy triangle + race ---------- */

function drawTriangle() {
  const { ctx, w, h } = fit(triCanvas);
  if (!ctx) return;
  ctx.clearRect(0, 0, w, h);
  const splitY = h * 0.72;
  const Ed = Math.hypot(disp.p, disp.m);
  const betaD = Ed > 0 ? disp.p / Ed : 0;

  drawTriangleArea(ctx, w, splitY, Ed, betaD);
  drawRace(ctx, w, h, splitY, betaD);
}

function drawTriangleArea(ctx, w, splitY, Ed, betaD) {
  const padL = 96;
  const padR = 34;
  const padT = 58;
  const padB = 46;
  const availW = w - padL - padR;
  const availH = splitY - padT - padB;
  if (availW < 60 || availH < 60) return;

  const p = Math.abs(disp.p);
  const m = disp.m;
  const pl = Math.abs(disp.pl);
  const ghost = Math.abs(state.u) > 0.002;
  const scale = Math.min(availW / Math.max(p, 1e-12), availH / Math.max(m, 1e-12));
  const x0 = padL + (availW - Math.min(p * scale, availW)) / 2;
  const y0 = padT + availH;

  ctx.lineCap = "round";

  if (ghost) {
    const gx = Math.min(x0 + pl * scale, w + 80);
    const gy = y0 - m * scale;
    ctx.strokeStyle = SOFT;
    ctx.lineWidth = 1.6;
    ctx.setLineDash([5, 5]);
    ctx.globalAlpha = 0.65;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(gx, y0);
    ctx.lineTo(gx, gy);
    ctx.lineTo(x0, y0);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    label(ctx, "lab", Math.min(gx + 6, w - 28), gy + 4, SOFT, "650 10px Inter, sans-serif", "left");
  }

  const bx = x0 + p * scale;
  const by = y0 - m * scale;

  if (p * scale > 16 && m * scale > 16) {
    ctx.strokeStyle = SOFT;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(bx - 13, y0);
    ctx.lineTo(bx - 13, y0 - 13);
    ctx.lineTo(bx, y0 - 13);
    ctx.stroke();

    ctx.strokeStyle = ORANGE;
    ctx.lineWidth = 1.4;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.arc(bx, by, Math.min(30, m * scale * 0.55), Math.PI / 2, Math.atan2(m * scale, -p * scale));
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.strokeStyle = BLUE;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(bx, y0);
  ctx.stroke();

  ctx.strokeStyle = GREEN;
  ctx.beginPath();
  ctx.moveTo(bx, y0);
  ctx.lineTo(bx, by);
  ctx.stroke();

  ctx.strokeStyle = ORANGE;
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(bx, by);
  ctx.stroke();

  ctx.fillStyle = INK;
  for (const [vx, vy] of [[x0, y0], [bx, y0], [bx, by]]) {
    ctx.beginPath();
    ctx.arc(vx, vy, 3.4, 0, Math.PI * 2);
    ctx.fill();
  }

  label(ctx, `pc = ${fmtE(disp.p)}`, x0 + p * scale / 2, y0 + 22, BLUE);
  const mText = `mc² = ${fmtE(m)}`;
  if (m * scale <= 16) {
    label(ctx, mText, Math.min(bx, w - 10), y0 - 26, GREEN, undefined, "right");
  } else if (bx + 110 > w) {
    label(ctx, mText, bx - 10, y0 - m * scale / 2 + 4, GREEN, undefined, "right");
  } else {
    label(ctx, mText, bx + 10, y0 - m * scale / 2 + 4, GREEN, undefined, "left");
  }

  ctx.save();
  ctx.translate(x0 + p * scale / 2, (y0 + by) / 2);
  ctx.rotate(-Math.atan2(m * scale, p * scale));
  label(ctx, `E = ${fmtE(Ed)}`, 0, -10, ORANGE);
  ctx.restore();

  label(ctx, `v = ${fmtBeta(betaD)}`, 24, 30, INK, "800 16px Inter, sans-serif", "left");
  const gammaText = disp.m > 0 ? `γ = E ∕ mc² = ${fmtGamma(Ed / disp.m)}` : "γ = ∞ — no rest frame";
  label(ctx, gammaText, 24, 50, MUTED, "650 11px Inter, sans-serif", "left");
}

function drawRace(ctx, w, h, splitY, betaD) {
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, splitY);
  ctx.lineTo(w, splitY);
  ctx.stroke();

  const trackL = 170;
  const trackR = w - 36;
  const laneLight = splitY + (h - splitY) * 0.34;
  const lanePart = splitY + (h - splitY) * 0.72;
  if (trackR - trackL < 80) return;

  for (const y of [laneLight, lanePart]) {
    ctx.strokeStyle = "#eceded";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(trackL, y);
    ctx.lineTo(trackR, y);
    ctx.stroke();
  }

  label(ctx, "light — c", 24, laneLight + 4, ORANGE, "750 10px Inter, sans-serif", "left");
  const massless = state.mc2 === 0;
  const name = massless ? "your photon — c" : `this particle — ${fmtBeta(betaD)}`;
  label(ctx, name, 24, lanePart + 4, massless ? ORANGE : BLUE, "750 10px Inter, sans-serif", "left");

  const lx = trackL + posLight * (trackR - trackL);
  ctx.fillStyle = "rgba(217,93,57,.22)";
  ctx.beginPath();
  ctx.arc(lx, laneLight, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = ORANGE;
  ctx.beginPath();
  ctx.arc(lx, laneLight, 5, 0, Math.PI * 2);
  ctx.fill();

  const px = trackL + posPart * (trackR - trackL);
  ctx.fillStyle = state.mc2 === 0 ? ORANGE : BLUE;
  ctx.beginPath();
  ctx.arc(px, lanePart, 5, 0, Math.PI * 2);
  ctx.fill();
}

/* ---------- mass hyperbola map ---------- */

function drawMap() {
  const { ctx, w, h } = fit(mapCanvas);
  if (!ctx) return;
  ctx.clearRect(0, 0, w, h);
  const L = 40;
  const R = 12;
  const T = 12;
  const B = 22;
  if (w - L - R < 60 || h - T - B < 40) return;

  const m = disp.m;
  const pMax = Math.max(2.4 * m, 1.4 * Math.max(Math.abs(disp.p), Math.abs(disp.pl)), 1e-9);
  const eMax = Math.hypot(pMax, m) * 1.07;
  const X = (pc) => L + (pc + pMax) / (2 * pMax) * (w - L - R);
  const Y = (E) => h - B - E / eMax * (h - T - B);

  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(L, Y(0));
  ctx.lineTo(w - R, Y(0));
  ctx.stroke();
  ctx.setLineDash([3, 4]);
  ctx.beginPath();
  ctx.moveTo(X(0), T);
  ctx.lineTo(X(0), Y(0));
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.strokeStyle = ORANGE;
  ctx.lineWidth = 1.2;
  ctx.setLineDash([5, 4]);
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.moveTo(X(-pMax), Y(pMax));
  ctx.lineTo(X(0), Y(0));
  ctx.lineTo(X(pMax), Y(pMax));
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  ctx.save();
  ctx.beginPath();
  ctx.rect(L, T, w - L - R, h - T - B);
  ctx.clip();

  if (m > 0) {
    ctx.strokeStyle = BLUE;
    ctx.lineWidth = 1.2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    for (let i = -80; i <= 80; i += 1) {
      const pc = i / 80 * pMax;
      const y = Y(m + pc * pc / (2 * m));
      if (i === -80) ctx.moveTo(X(pc), y);
      else ctx.lineTo(X(pc), y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.strokeStyle = GREEN;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  for (let i = -80; i <= 80; i += 1) {
    const pc = i / 80 * pMax;
    const y = Y(Math.hypot(pc, m));
    if (i === -80) ctx.moveTo(X(pc), y);
    else ctx.lineTo(X(pc), y);
  }
  ctx.stroke();
  ctx.restore();

  if (m > 0) {
    label(ctx, "mc²", L - 4, Y(m) + 3, GREEN, "650 8.5px Inter, sans-serif", "right");
  }
  label(ctx, "pc", w - R, Y(0) + 14, SOFT, "650 9px Inter, sans-serif", "right");
  label(ctx, "E", L - 8, T + 8, SOFT, "650 9px Inter, sans-serif", "right");

  const ghost = Math.abs(state.u) > 0.002;
  if (ghost) {
    ctx.fillStyle = "white";
    ctx.strokeStyle = GREEN;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(X(disp.pl), Y(Math.hypot(disp.pl, m)), 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(85,82,185,.25)";
  ctx.beginPath();
  ctx.arc(X(disp.p), Y(Math.hypot(disp.p, m)), 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = VIOLET;
  ctx.beginPath();
  ctx.arc(X(disp.p), Y(Math.hypot(disp.p, m)), 4.5, 0, Math.PI * 2);
  ctx.fill();
}

/* ---------- controls ---------- */

function setParticle(key) {
  state.key = key;
  const def = PARTICLES[key];
  state.mc2 = key === "custom" ? Math.pow(10, Number(mSlider.value)) : def.mc2;
  pSlider.value = def.pSlider;
  state.pc = Math.pow(10, def.pSlider);
  boostSlider.value = 0;
  state.u = 0;
  mSlider.disabled = key !== "custom";
  document.querySelectorAll(".scenario").forEach((tab) => {
    tab.classList.toggle("on", tab.dataset.particle === key);
  });
  byId("modeTitle").textContent = def.label;
  byId("modeNote").textContent = def.note;
  updateAll();
  Object.assign(disp, target);
}

document.querySelectorAll(".scenario").forEach((tab) => {
  tab.addEventListener("click", () => setParticle(tab.dataset.particle));
});

pSlider.addEventListener("input", () => {
  state.pc = Math.pow(10, Number(pSlider.value));
  updateAll();
});

mSlider.addEventListener("input", () => {
  state.mc2 = Math.pow(10, Number(mSlider.value));
  updateAll();
});

boostSlider.addEventListener("input", () => {
  state.u = Math.tanh(Number(boostSlider.value));
  updateAll();
});

byId("chaseBtn").addEventListener("click", () => {
  if (state.mc2 === 0) {
    boostSlider.value = 8;
    state.u = Math.tanh(8);
  } else {
    const beta = state.pc / labEnergy();
    state.u = beta;
    boostSlider.value = Math.max(-8, Math.min(8, Math.atanh(beta)));
  }
  updateAll();
});

byId("labBtn").addEventListener("click", () => {
  boostSlider.value = 0;
  state.u = 0;
  updateAll();
});

byId("resetBtn").addEventListener("click", () => {
  if (state.key === "custom") mSlider.value = 2;
  setParticle(state.key);
});

/* ---------- main loop ---------- */

let raf = 0;
let last = 0;
let active = false;

function frame(now) {
  raf = requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000 || 0);
  last = now;

  const ease = 1 - Math.pow(0.002, dt);
  for (const key of ["p", "m", "pl"]) {
    disp[key] += (target[key] - disp[key]) * ease;
    if (Math.abs(target[key] - disp[key]) < Math.abs(target[key]) * 1e-4 + 1e-12) disp[key] = target[key];
  }

  const Ed = Math.hypot(disp.p, disp.m);
  const betaD = Ed > 0 ? disp.p / Ed : 0;
  posLight = (posLight + dt * 0.17) % 1;
  posPart = ((posPart + dt * 0.17 * betaD) % 1 + 1) % 1;

  drawTriangle();
  drawMap();
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

window.addEventListener("lesson:slide", (event) => setActive(Boolean(event.detail.simulator)));

setParticle("electron");
setActive(Boolean(document.querySelector(".slide.on")?.dataset.simulator));
}());
