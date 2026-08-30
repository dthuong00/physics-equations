(function () {
"use strict";

/* The mass shell: E over the whole momentum plane, E = √(px² + py² + m²).
   One knob - the mass - takes the surface continuously from a light cone to a bowl,
   and the bowl's vertex sits at exactly E = mc². Everything a particle of that mass
   is allowed to be lives on this surface, and nowhere else. */

const SOFT = "#92949a";
const GREEN = "#21805a";
const ORANGE = "#d95d39";
const VIOLET = "#5552b9";

const NR = 13;          // rings of the wireframe
const NA = 36;          // spokes
const PMAX = 2.6;       // momentum drawn out to here, in the same energy units

const state = { m: 1, p: 1.2, phi: 0.6, yaw: -0.7, pitch: 0.58, spin: true };
const target = { m: 1, p: 1.2 };
const disp = { m: 1, p: 1.2 };

const byId = (id) => document.getElementById(id);
const canvas = byId("shellCanvas");
const mSlider = byId("shellMass");
const pSlider = byId("shellMom");
const phiSlider = byId("shellDir");

/* ---------- projection ---------- */

let view = { x0: 0, y0: 0, sp: 60, se: 60 };

function project(px, py, E) {
  const cy = Math.cos(state.yaw);
  const sy = Math.sin(state.yaw);
  const u = px * cy - py * sy;
  const v = px * sy + py * cy;
  return {
    x: view.x0 + u * view.sp,
    y: view.y0 - E * view.se * Math.cos(state.pitch) + v * view.sp * Math.sin(state.pitch),
    depth: v,
  };
}

function shellE(r) {
  return Math.hypot(r, disp.m);
}

/* green and pale where it moves slowly, orange and solid out where it is nearly
   light-like - so the eye can read the speed straight off the surface */
function faceColor(r, alpha) {
  const beta = r / shellE(r);
  const from = [33, 128, 90];
  const to = [217, 93, 57];
  const mix = from.map((c, i) => Math.round(c + (to[i] - c) * beta * beta));
  return "rgba(" + mix[0] + "," + mix[1] + "," + mix[2] + "," + alpha * (0.45 + 0.55 * beta) + ")";
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

function drawGround(ctx) {
  ctx.strokeStyle = "#ececeb";
  ctx.lineWidth = 1;
  for (let i = 1; i <= 3; i += 1) {
    const r = PMAX * i / 3;
    ctx.beginPath();
    for (let a = 0; a <= NA; a += 1) {
      const th = a / NA * Math.PI * 2;
      const pt = project(r * Math.cos(th), r * Math.sin(th), 0);
      if (a === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    }
    ctx.stroke();
  }
  for (let a = 0; a < 8; a += 1) {
    const th = a / 8 * Math.PI * 2;
    const inner = project(0, 0, 0);
    const outer = project(PMAX * Math.cos(th), PMAX * Math.sin(th), 0);
    ctx.beginPath();
    ctx.moveTo(inner.x, inner.y);
    ctx.lineTo(outer.x, outer.y);
    ctx.stroke();
  }
  const edge = project(PMAX, 0, 0);
  const edgeX = Math.max(70, Math.min(view.x0 * 2 - 70, edge.x));
  label(ctx, "momentum plane · pc", edgeX, edge.y + 16, SOFT, "650 9.5px Inter, sans-serif");
}

/* kept deliberately sparse: the rim ring plus the two generators in the drawn slice,
   which is all it takes to read "the bowl is wrapped around this" without a thicket */
function drawCone(ctx) {
  ctx.strokeStyle = ORANGE;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 1.2;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  for (let a = 0; a <= NA; a += 1) {
    const th = a / NA * Math.PI * 2;
    const pt = project(PMAX * Math.cos(th), PMAX * Math.sin(th), PMAX);
    if (a === 0) ctx.moveTo(pt.x, pt.y);
    else ctx.lineTo(pt.x, pt.y);
  }
  ctx.stroke();
  const tip = project(0, 0, 0);
  for (const side of [-1, 1]) {
    const rim = project(side * PMAX, 0, PMAX);
    ctx.beginPath();
    ctx.moveTo(tip.x, tip.y);
    ctx.lineTo(rim.x, rim.y);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
  const anchor = project(-PMAX * 0.6, 0, PMAX * 0.6);
  label(ctx, "light cone · E = pc", anchor.x - 6, anchor.y + 15, ORANGE, "700 10px Inter, sans-serif", "right");
}

function drawShell(ctx) {
  const quads = [];
  for (let i = 0; i < NR; i += 1) {
    const r0 = PMAX * Math.pow(i / NR, 1.25);
    const r1 = PMAX * Math.pow((i + 1) / NR, 1.25);
    for (let a = 0; a < NA; a += 1) {
      const t0 = a / NA * Math.PI * 2;
      const t1 = (a + 1) / NA * Math.PI * 2;
      const corners = [
        [r0 * Math.cos(t0), r0 * Math.sin(t0), shellE(r0)],
        [r1 * Math.cos(t0), r1 * Math.sin(t0), shellE(r1)],
        [r1 * Math.cos(t1), r1 * Math.sin(t1), shellE(r1)],
        [r0 * Math.cos(t1), r0 * Math.sin(t1), shellE(r0)],
      ].map((c) => project(c[0], c[1], c[2]));
      quads.push({ corners, depth: corners.reduce((acc, c) => acc + c.depth, 0) / 4, r: (r0 + r1) / 2 });
    }
  }
  quads.sort((a, b) => a.depth - b.depth);

  ctx.lineWidth = 0.7;
  for (const quad of quads) {
    ctx.beginPath();
    ctx.moveTo(quad.corners[0].x, quad.corners[0].y);
    for (let i = 1; i < 4; i += 1) ctx.lineTo(quad.corners[i].x, quad.corners[i].y);
    ctx.closePath();
    ctx.fillStyle = faceColor(quad.r, 0.3);
    ctx.fill();
    ctx.strokeStyle = faceColor(quad.r, 0.6);
    ctx.stroke();
  }
}

/* the py = 0 cut: the same hyperbola the earlier slides drew in the plane */
function drawSlice(ctx) {
  ctx.strokeStyle = GREEN;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  for (let i = -60; i <= 60; i += 1) {
    const px = i / 60 * PMAX;
    const pt = project(px, 0, shellE(Math.abs(px)));
    if (i === -60) ctx.moveTo(pt.x, pt.y);
    else ctx.lineTo(pt.x, pt.y);
  }
  ctx.stroke();
  const end = project(PMAX, 0, shellE(PMAX));
  label(ctx, "the slice through py = 0 - your hyperbola", end.x, end.y - 10, GREEN, "700 10px Inter, sans-serif", "right");
}

function drawVertex(ctx) {
  const base = project(0, 0, 0);
  const tip = project(0, 0, disp.m);
  if (disp.m > 0.01) {
    ctx.strokeStyle = GREEN;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(base.x, base.y);
    ctx.lineTo(tip.x, tip.y);
    ctx.stroke();
    label(ctx, "E = mc²", tip.x - 10, (tip.y + base.y) / 2, GREEN, "750 11px Inter, sans-serif", "right");
  }
  ctx.fillStyle = disp.m > 0.01 ? GREEN : ORANGE;
  ctx.beginPath();
  ctx.arc(tip.x, tip.y, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawState(ctx) {
  const px = disp.p * Math.cos(state.phi);
  const py = disp.p * Math.sin(state.phi);
  const E = shellE(disp.p);
  const dot = project(px, py, E);
  const foot = project(px, py, 0);

  ctx.strokeStyle = VIOLET;
  ctx.globalAlpha = 0.4;
  ctx.setLineDash([3, 3]);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(foot.x, foot.y);
  ctx.lineTo(dot.x, dot.y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  ctx.fillStyle = "rgba(85,82,185,.22)";
  ctx.beginPath();
  ctx.arc(dot.x, dot.y, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = VIOLET;
  ctx.beginPath();
  ctx.arc(dot.x, dot.y, 5, 0, Math.PI * 2);
  ctx.fill();
  label(ctx, "your particle", dot.x, dot.y - 17, VIOLET, "750 10px Inter, sans-serif");
}

function draw() {
  const { ctx, w, h } = fit();
  if (!ctx) return;
  ctx.clearRect(0, 0, w, h);
  view.x0 = w / 2;
  view.y0 = h * 0.82;
  view.sp = Math.min(w * 0.32, h * 0.34) / PMAX * 1.5;
  view.se = Math.min(h * 0.62 / Math.max(shellE(PMAX), 1e-6), view.sp * 1.15);

  drawGround(ctx);
  drawCone(ctx);
  drawShell(ctx);
  drawSlice(ctx);
  drawVertex(ctx);
  drawState(ctx);

  label(ctx, "drag to turn it over", 14, h - 10, SOFT, "650 9.5px Inter, sans-serif", "left");
}

/* ---------- readouts ---------- */

function refresh() {
  const E = Math.hypot(state.p, state.m);
  const beta = state.p / E;
  byId("shellMassValue").textContent = state.m === 0 ? "0 · massless" : state.m.toFixed(2);
  byId("shellMomValue").textContent = state.p.toFixed(2);
  byId("shellDirValue").textContent = Math.round(state.phi * 180 / Math.PI) + "°";
  byId("shellE").textContent = E.toFixed(3);
  byId("shellP").textContent = state.p.toFixed(3);
  byId("shellM").textContent = state.m.toFixed(3);
  byId("shellBeta").textContent = beta.toFixed(4) + " c";
  byId("shellGamma").textContent = state.m > 0 ? (E / state.m).toFixed(3) : "∞";

  const verdict = byId("shellVerdict");
  const head = byId("shellVerdictHead");
  const detail = byId("shellVerdictDetail");
  if (state.m < 0.02) {
    verdict.className = "verdict";
    head.textContent = "A cone. No vertex, no rest.";
    detail.textContent = "With the mass gone the bowl has closed onto the light cone: the surface touches E = 0 at a single point and every part of it has slope 1. There is no lowest energy to sit at, which is another way of saying a massless particle can never be at rest.";
  } else if (beta > 0.95) {
    verdict.className = "verdict";
    head.textContent = "Out on the rim, hugging the cone.";
    detail.textContent = "Far from the axis the bowl becomes indistinguishable from the cone - that is the ultra-relativistic limit, E ≈ pc. The mass is still there, it is just an ever smaller share of the height.";
  } else if (beta < 0.2) {
    verdict.className = "verdict rest";
    head.textContent = "Down in the bowl - Newton's country.";
    detail.textContent = "Near the vertex the surface is a parabola, E ≈ mc² + p²∕2m. That parabola is Newtonian kinetic energy, sitting on a pedestal of height mc². Slide further out and the bowl bends away from it.";
  } else {
    verdict.className = "verdict newton";
    head.textContent = "On the shoulder of the bowl.";
    detail.textContent = "Between the vertex and the rim: γ = " + (E / state.m).toFixed(2) + ". This is the region where neither Newton's parabola nor the light cone is a good enough description, and you need the full surface.";
  }
}

/* ---------- controls ---------- */

mSlider.addEventListener("input", () => {
  state.m = Number(mSlider.value);
  target.m = state.m;
  refresh();
});

pSlider.addEventListener("input", () => {
  state.p = Number(pSlider.value);
  target.p = state.p;
  refresh();
});

phiSlider.addEventListener("input", () => {
  state.phi = Number(phiSlider.value);
  refresh();
});

byId("shellLightBtn").addEventListener("click", () => {
  mSlider.value = 0;
  state.m = 0;
  target.m = 0;
  refresh();
});

byId("shellRestBtn").addEventListener("click", () => {
  pSlider.value = 0;
  state.p = 0;
  target.p = 0;
  refresh();
});

byId("shellSpinBtn").addEventListener("click", () => {
  state.spin = !state.spin;
  byId("shellSpinBtn").textContent = state.spin ? "Stop turning" : "Turn it";
});

byId("shellResetBtn").addEventListener("click", () => {
  mSlider.value = 1;
  pSlider.value = 1.2;
  phiSlider.value = 0.6;
  state.m = 1;
  state.p = 1.2;
  state.phi = 0.6;
  target.m = 1;
  target.p = 1.2;
  state.yaw = -0.7;
  state.pitch = 0.58;
  refresh();
});

let drag = null;
canvas.addEventListener("pointerdown", (event) => {
  drag = { x: event.clientX, y: event.clientY };
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener("pointermove", (event) => {
  if (!drag) return;
  state.yaw += (event.clientX - drag.x) * 0.008;
  state.pitch = Math.max(0.12, Math.min(1.25, state.pitch + (event.clientY - drag.y) * 0.005));
  drag = { x: event.clientX, y: event.clientY };
});
for (const type of ["pointerup", "pointercancel", "pointerleave"]) {
  canvas.addEventListener(type, () => { drag = null; });
}

/* ---------- loop ---------- */

let raf = 0;
let last = 0;
let active = false;

function frame(now) {
  raf = requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000 || 0);
  last = now;

  const ease = 1 - Math.pow(0.004, dt);
  for (const key of ["m", "p"]) {
    disp[key] += (target[key] - disp[key]) * ease;
    if (Math.abs(target[key] - disp[key]) < 1e-4) disp[key] = target[key];
  }
  if (state.spin && !drag) state.yaw += dt * 0.16;

  draw();
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

window.addEventListener("lesson:slide", (event) => setActive(event.detail.simulator === "shell"));

refresh();
setActive(document.querySelector(".slide.on")?.dataset.simulator === "shell");
}());
