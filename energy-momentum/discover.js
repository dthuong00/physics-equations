(function () {
"use strict";

/* Finding a particle you cannot see, by weighing its debris.
   Every event is generated honestly: a parent of mass M is given a random momentum,
   decays isotropically in its own rest frame, and the two daughters are boosted into
   the lab. The "detector" then only ever reports smeared energies and directions -
   and the invariant mass is rebuilt from those, exactly as an experiment does it. */

const MUTED = "#65676d";
const SOFT = "#92949a";
const LINE = "#dedfe3";
const ORANGE = "#d95d39";
const VIOLET = "#5552b9";

const BINS = 64;

const PARENTS = {
  jpsi: {
    label: "J/ψ", channel: "J/ψ → e⁺e⁻", M: 3.0969, md: 0.000511,
    lo: 2.4, hi: 3.8, res: 0.02, bkg: 0.45, daughter: "electron",
    note: "1974, found twice in the same month at SLAC and Brookhaven. It was so narrow and so obvious that the discovery reorganised particle physics in a weekend - the “November Revolution”. Its debris is an electron and a positron.",
  },
  z: {
    label: "Z boson", channel: "Z → μ⁺μ⁻", M: 91.188, md: 0.10566,
    lo: 60, hi: 120, res: 0.025, bkg: 0.35, daughter: "muon",
    note: "1983, at CERN. The carrier of the weak neutral force, ninety-seven times heavier than a proton and gone in 10⁻²⁵ seconds. All anyone ever sees is a pair of muons whose invariant mass keeps landing on the same number.",
  },
  higgs: {
    label: "Higgs boson", channel: "H → γγ", M: 125.25, md: 0,
    lo: 100, hi: 150, res: 0.015, bkg: 0.95, daughter: "photon",
    note: "2012, at the LHC. Two photons - massless, both of them - whose energies and opening angle keep reconstructing 125 GeV. This channel is drowning in background: only a few percent of the pairs here are really Higgs decays, which is why it took a hundred trillion collisions to gather the photon pairs in a histogram like this one.",
  },
};

const state = { key: "higgs", res: 0.015, bkg: 0.95, rate: 40, running: true };
const hist = { sig: new Array(BINS).fill(0), bkg: new Array(BINS).fill(0), total: 0 };
let recent = [];
let spill = 0;
let yMax = 6;

const byId = (id) => document.getElementById(id);
const histCanvas = byId("histCanvas");
const eventCanvas = byId("eventCanvas");
const resSlider = byId("discRes");
const bkgSlider = byId("discBkg");
const rateSlider = byId("discRate");

const parent = () => PARENTS[state.key];

/* ---------- event generation ---------- */

function gauss() {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function isotropic() {
  const z = 2 * Math.random() - 1;
  const phi = 2 * Math.PI * Math.random();
  const r = Math.sqrt(1 - z * z);
  return [r * Math.cos(phi), r * Math.sin(phi), z];
}

function boost(vec, v) {
  const v2 = v[0] * v[0] + v[1] * v[1] + v[2] * v[2];
  if (v2 < 1e-18) return { E: vec.E, p: vec.p.slice() };
  const g = 1 / Math.sqrt(1 - v2);
  const vp = v[0] * vec.p[0] + v[1] * vec.p[1] + v[2] * vec.p[2];
  const k = (g - 1) * vp / v2 + g * vec.E;
  return { E: g * (vec.E + vp), p: vec.p.map((c, i) => c + k * v[i]) };
}

function invMass(a, b) {
  const E = a.E + b.E;
  const p = [0, 1, 2].map((i) => a.p[i] + b.p[i]);
  return Math.sqrt(Math.max(0, E * E - p[0] * p[0] - p[1] * p[1] - p[2] * p[2]));
}

/* a parent of mass M, given some momentum, splitting into two daughters of mass md */
function decay(M, md) {
  const pStar = Math.sqrt(Math.max(0, M * M / 4 - md * md));
  const n = isotropic();
  const dir = isotropic();
  const P = -Math.log(1 - Math.random() * 0.98) * 0.42 * M;
  const v = dir.map((c) => c * P / Math.hypot(M, P));
  return [1, -1].map((sign) => boost({
    E: Math.hypot(md, pStar),
    p: n.map((c) => sign * c * pStar),
  }, v));
}

/* what the detector actually reports: smeared energy, slightly smeared direction */
function measure(track, md) {
  const E = Math.max(md + 1e-6, track.E * (1 + state.res * gauss()));
  const jitter = track.p.map((c) => c + 0.004 * gauss() * track.E);
  const norm = Math.hypot(jitter[0], jitter[1], jitter[2]) || 1;
  const mag = Math.sqrt(Math.max(0, E * E - md * md));
  return { E, p: jitter.map((c) => c * mag / norm) };
}

function fire() {
  const spec = parent();
  const signal = Math.random() >= state.bkg;
  const md = signal ? spec.md : 0;
  /* background is a smooth falling spectrum of uncorrelated pairs that happen to line up */
  const M = signal ? spec.M : spec.lo + (spec.hi - spec.lo) * -Math.log(1 - Math.random() * 0.9) / 2.3;
  const pair = decay(M, md).map((track) => measure(track, md));
  const m = invMass(pair[0], pair[1]);
  const bin = Math.floor((m - spec.lo) / (spec.hi - spec.lo) * BINS);

  hist.total += 1;
  if (bin >= 0 && bin < BINS) (signal ? hist.sig : hist.bkg)[bin] += 1;
  recent.unshift({ m, signal, tracks: pair, age: 0 });
  recent = recent.slice(0, 6);
}

function reset() {
  hist.sig.fill(0);
  hist.bkg.fill(0);
  hist.total = 0;
  recent = [];
  yMax = 6;
}

/* ---------- what the experimenter can work out ---------- */

function analyse() {
  const spec = parent();
  const width = spec.hi - spec.lo;
  const binW = width / BINS;
  /* two daughters of similar energy smear the mass by roughly the energy resolution over √2 */
  const sigmaM = Math.max(spec.M * state.res / Math.SQRT2, binW);
  const peakLo = Math.max(0, Math.floor((spec.M - 2.5 * sigmaM - spec.lo) / binW));
  const peakHi = Math.min(BINS - 1, Math.ceil((spec.M + 2.5 * sigmaM - spec.lo) / binW));

  let inPeak = 0;
  let side = 0;
  let sideBins = 0;
  for (let i = 0; i < BINS; i += 1) {
    const count = hist.sig[i] + hist.bkg[i];
    if (i >= peakLo && i <= peakHi) inPeak += count;
    else {
      side += count;
      sideBins += 1;
    }
  }
  const perBin = sideBins > 0 ? side / sideBins : 0;
  const peakBins = peakHi - peakLo + 1;
  const under = perBin * peakBins;
  const excess = inPeak - under;

  /* the centre is taken from the excess alone - the flat background under the peak
     would otherwise drag it toward the middle of the window */
  let massSum = 0;
  let massWeight = 0;
  for (let i = peakLo; i <= peakHi; i += 1) {
    const over = Math.max(0, hist.sig[i] + hist.bkg[i] - perBin);
    massSum += over * (spec.lo + (i + 0.5) * binW);
    massWeight += over;
  }
  const measured = massWeight > 0 ? massSum / massWeight : 0;
  const sigma = excess / Math.sqrt(Math.max(under, 1));
  return { sigmaM, peakLo, peakHi, inPeak, under, excess, sigma, measured, binW };
}

/* ---------- readouts ---------- */

function setCell(id, text) {
  byId(id).textContent = text;
}

function refresh(stats) {
  const spec = parent();
  setCell("discTotal", hist.total.toLocaleString());
  setCell("discPeak", Math.round(stats.inPeak).toLocaleString());
  setCell("discUnder", Math.round(stats.under).toLocaleString());
  setCell("discExcess", Math.round(stats.excess).toLocaleString());
  setCell("discSigma", stats.excess > 0 ? stats.sigma.toFixed(1) + "σ" : "-");

  const err = stats.excess > 4 ? stats.sigmaM / Math.sqrt(stats.excess) : 0;
  const decimals = err > 0 ? Math.min(4, Math.max(1, Math.ceil(-Math.log10(err)) + 1)) : 2;
  setCell("discMass", stats.excess > 4
    ? stats.measured.toFixed(decimals) + " ± " + err.toFixed(decimals) + " GeV"
    : "not yet");

  const verdict = byId("discVerdict");
  const head = byId("discVerdictHead");
  const detail = byId("discVerdictDetail");
  if (hist.total < 30) {
    verdict.className = "verdict waiting";
    head.textContent = "Collecting collisions…";
    detail.textContent = "Every event dumps one number into the histogram: the invariant mass rebuilt from two measured tracks. Random combinations land anywhere. Keep going.";
  } else if (stats.sigma < 2) {
    verdict.className = "verdict waiting";
    head.textContent = "No peak - just background.";
    detail.textContent = "So far this is a smooth falling spectrum, exactly what uncorrelated pairs of " + spec.daughter + "s produce. A real particle would refuse to spread out.";
  } else if (stats.sigma < 3) {
    verdict.className = "verdict newton";
    head.textContent = "Something is piling up.";
    detail.textContent = "A " + stats.sigma.toFixed(1) + "σ bump. Physics calls this nothing at all - fluctuations this big turn up by luck several times a year. Take more data.";
  } else if (stats.sigma < 5) {
    verdict.className = "verdict";
    head.textContent = stats.sigma.toFixed(1) + "σ - evidence.";
    detail.textContent = "Real enough to publish as evidence, not yet enough to claim. The excess sits at " + stats.measured.toFixed(1) + " GeV and refuses to move as data accumulates.";
  } else {
    verdict.className = "verdict rest";
    head.textContent = "Discovery - " + Math.min(stats.sigma, 99).toFixed(1) + "σ.";
    detail.textContent = "Above five sigma the community calls it a particle. You never saw it: it was gone in 10⁻²² seconds. You weighed its debris with E² − (pc)², and the answer kept coming back the same.";
  }

  setCell("discResValue", (state.res * 100).toFixed(1) + "%");
  setCell("discBkgValue", Math.round(state.bkg * 100) + "%");
  setCell("discRateValue", state.running ? Math.round(state.rate) + "/s" : "paused");
}

/* ---------- canvas ---------- */

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

function drawHistogram(stats) {
  const { ctx, w, h } = fit(histCanvas);
  if (!ctx) return;
  ctx.clearRect(0, 0, w, h);
  const spec = parent();
  const padL = 52;
  const padR = 20;
  const padT = 30;
  const padB = 46;
  if (w - padL - padR < 80 || h - padT - padB < 80) return;

  let peak = 1;
  for (let i = 0; i < BINS; i += 1) peak = Math.max(peak, hist.sig[i] + hist.bkg[i]);
  yMax += (peak * 1.18 - yMax) * 0.08;
  yMax = Math.max(yMax, peak * 1.02, 6);

  const plotW = w - padL - padR;
  const plotH = h - padT - padB;
  const X = (m) => padL + (m - spec.lo) / (spec.hi - spec.lo) * plotW;
  const Y = (n) => padT + plotH - n / yMax * plotH;
  const binW = plotW / BINS;

  ctx.fillStyle = "#fcfcfb";
  ctx.fillRect(X(spec.lo + stats.peakLo * stats.binW), padT, (stats.peakHi - stats.peakLo + 1) * binW, plotH);

  ctx.strokeStyle = "#f0f0ef";
  ctx.lineWidth = 1;
  const gridStep = Math.max(1, Math.pow(10, Math.floor(Math.log10(yMax / 4))) * Math.ceil(yMax / 4 / Math.pow(10, Math.floor(Math.log10(yMax / 4)))));
  for (let n = gridStep; n < yMax; n += gridStep) {
    ctx.beginPath();
    ctx.moveTo(padL, Y(n));
    ctx.lineTo(w - padR, Y(n));
    ctx.stroke();
    label(ctx, String(n), padL - 7, Y(n) + 3, SOFT, "650 9px Inter, sans-serif", "right");
  }

  for (let i = 0; i < BINS; i += 1) {
    const x = padL + i * binW;
    const b = hist.bkg[i];
    const s = hist.sig[i];
    if (b > 0) {
      ctx.fillStyle = "#dcdde1";
      ctx.fillRect(x, Y(b), Math.max(1, binW - 0.6), plotH - (Y(b) - padT));
    }
    if (s > 0) {
      ctx.fillStyle = "rgba(217,93,57,.82)";
      ctx.fillRect(x, Y(b + s), Math.max(1, binW - 0.6), Y(b) - Y(b + s));
    }
  }

  ctx.strokeStyle = SOFT;
  ctx.lineWidth = 1.1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(X(spec.M), padT);
  ctx.lineTo(X(spec.M), padT + plotH);
  ctx.stroke();
  ctx.setLineDash([]);
  label(ctx, "true mass, " + spec.M + " GeV", X(spec.M), padT - 10, SOFT, "650 9.5px Inter, sans-serif");

  ctx.strokeStyle = LINE;
  ctx.beginPath();
  ctx.moveTo(padL, padT + plotH);
  ctx.lineTo(w - padR, padT + plotH);
  ctx.stroke();

  const ticks = 5;
  for (let i = 0; i <= ticks; i += 1) {
    const m = spec.lo + (spec.hi - spec.lo) * i / ticks;
    ctx.strokeStyle = LINE;
    ctx.beginPath();
    ctx.moveTo(X(m), padT + plotH);
    ctx.lineTo(X(m), padT + plotH + 5);
    ctx.stroke();
    label(ctx, m.toFixed(spec.hi - spec.lo < 5 ? 1 : 0), X(m), padT + plotH + 17, SOFT, "650 9.5px Inter, sans-serif");
  }
  label(ctx, "reconstructed invariant mass √(E² − (pc)²)  ·  GeV", padL + plotW / 2, h - 10, MUTED, "700 10.5px Inter, sans-serif");
  ctx.save();
  ctx.translate(14, padT + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  label(ctx, "events per bin", 0, 0, MUTED, "700 10.5px Inter, sans-serif");
  ctx.restore();

  label(ctx, hist.total.toLocaleString() + " collisions", w - padR, padT - 10, MUTED, "750 10.5px Inter, sans-serif", "right");
}

function drawEvent() {
  const { ctx, w, h } = fit(eventCanvas);
  if (!ctx) return;
  ctx.clearRect(0, 0, w, h);
  const cx = w / 2;
  const cy = h / 2;
  const R = Math.min(w, h) / 2 - 12;

  ctx.strokeStyle = "#efefee";
  ctx.lineWidth = 1;
  for (const r of [R, R * 0.72, R * 0.44]) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  const spec = parent();
  recent.forEach((event, i) => {
    const alpha = i === 0 ? 1 : Math.max(0, 0.34 - i * 0.055);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = event.signal ? ORANGE : "#b9bac0";
    ctx.lineWidth = i === 0 ? 2.4 : 1.4;
    event.tracks.forEach((track) => {
      const nx = track.p[0];
      const ny = track.p[1];
      const norm = Math.hypot(nx, ny) || 1;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + nx / norm * R, cy + ny / norm * R);
      ctx.stroke();
      if (i === 0) {
        label(ctx, track.E.toFixed(1), cx + nx / norm * (R - 20), cy + ny / norm * (R - 20) - 6,
          ORANGE, "750 9.5px Inter, sans-serif");
      }
    });
    ctx.globalAlpha = 1;
  });

  ctx.fillStyle = VIOLET;
  ctx.beginPath();
  ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
  ctx.fill();

  if (recent[0]) {
    label(ctx, "√(E² − (pc)²) = " + recent[0].m.toFixed(2) + " GeV", cx, h - 6,
      recent[0].signal ? ORANGE : MUTED, "750 10.5px Inter, sans-serif");
  }
  label(ctx, "two " + spec.daughter + "s, energies in GeV", cx, 12, SOFT, "650 9px Inter, sans-serif");
}

/* ---------- controls ---------- */

function setParent(key) {
  state.key = key;
  const spec = PARENTS[key];
  state.res = spec.res;
  state.bkg = spec.bkg;
  resSlider.value = spec.res;
  bkgSlider.value = spec.bkg;
  document.querySelectorAll("#discTabs .scenario").forEach((tab) => {
    tab.classList.toggle("on", tab.dataset.parent === key);
  });
  byId("discTitle").textContent = spec.channel;
  byId("discNote").textContent = spec.note;
  byId("discChannel").textContent = spec.channel;
  reset();
  refresh(analyse());
}

document.querySelectorAll("#discTabs .scenario").forEach((tab) => {
  tab.addEventListener("click", () => setParent(tab.dataset.parent));
});

resSlider.addEventListener("input", () => {
  state.res = Number(resSlider.value);
  reset();
});

bkgSlider.addEventListener("input", () => {
  state.bkg = Number(bkgSlider.value);
  reset();
});

rateSlider.addEventListener("input", () => {
  state.rate = Number(rateSlider.value);
});

byId("discOneBtn").addEventListener("click", () => {
  fire();
  refresh(analyse());
});

byId("discRunBtn").addEventListener("click", () => {
  for (let i = 0; i < 500; i += 1) fire();
  refresh(analyse());
});

byId("discPauseBtn").addEventListener("click", () => {
  state.running = !state.running;
  byId("discPauseBtn").textContent = state.running ? "Pause" : "Resume";
});

byId("discResetBtn").addEventListener("click", () => {
  reset();
  refresh(analyse());
});

/* ---------- loop ---------- */

let raf = 0;
let last = 0;
let frames = 0;
let active = false;

function frame(now) {
  raf = requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000 || 0);
  last = now;

  if (state.running) {
    spill += dt * state.rate;
    const count = Math.min(400, Math.floor(spill));
    spill -= count;
    for (let i = 0; i < count; i += 1) fire();
  }

  const stats = analyse();
  drawHistogram(stats);
  if (frames % 2 === 0) drawEvent();
  if (frames % 6 === 0) refresh(stats);
  frames += 1;
}

function setActive(on) {
  if (on === active) return;
  active = on;
  if (active) {
    last = performance.now();
    spill = 0;
    raf = requestAnimationFrame(frame);
  } else {
    cancelAnimationFrame(raf);
  }
}

window.addEventListener("lesson:slide", (event) => setActive(event.detail.simulator === "discover"));

setParent("higgs");
setActive(document.querySelector(".slide.on")?.dataset.simulator === "discover");
}());
