(function () {
"use strict";

const t = (key, english, vars) => (window.I18N ? window.I18N.t(key, english, vars) : english);

/* Finding a particle you cannot see, by weighing its debris.
   Every event is generated honestly: a parent of mass M is given a random momentum,
   decays isotropically in its own rest frame, and the two daughters are boosted into
   the lab. The "detector" then only ever reports smeared energies and directions -
   and the invariant mass is rebuilt from those, exactly as an experiment does it. */

const MUTED = "#65676d";
const SOFT = "#92949a";
const LINE = "#dedfe3";
const ORANGE = "#d95d39";
const INK = "#1b1d20";
const VIOLET = "#5552b9";

const BINS = 64;

const PARENTS = {
  jpsi: {
    label: "J/ψ", channel: "J/ψ → e⁺e⁻", M: 3.0969, md: 0.000511,
    lo: 2.4, hi: 3.8, res: 0.02, bkg: 0.45, daughter: () => t("js.disc.jpsi.daughter", "electron"),
    note: () => t("js.disc.jpsi.note", "A charm quark bound to its own antiquark, 3.3 proton masses, gone in 10⁻²⁰ s. Found twice in one month of 1974 - at SLAC and at Brookhaven, and neither group would give up its own letter, so it kept both. It was the first hard evidence that the charm quark exists, and it reorganised particle physics in a weekend: the “November Revolution”. Its debris here is an electron and a positron - charged, so a magnet bends them and the curvature gives p."),
  },
  z: {
    label: "Z boson", channel: "Z → μ⁺μ⁻", M: 91.188, md: 0.10566,
    lo: 60, hi: 120, res: 0.025, bkg: 0.35, daughter: () => t("js.disc.z.daughter", "muon"),
    note: () => t("js.disc.z.note", "The heavy, electrically neutral carrier of the weak force - the force behind radioactive beta decay. Where the photon that carries electromagnetism is massless, the Z weighs ninety-seven protons and is gone in 10⁻²⁵ s, which is exactly why the weak force is weak and reaches nowhere. Found at CERN in 1983. Its debris is a pair of muons - heavy cousins of the electron, charged, so again the magnet does the measuring."),
  },
  higgs: {
    label: "Higgs boson", channel: "H → γγ", M: 125.25, md: 0,
    lo: 100, hi: 150, res: 0.015, bkg: 0.95, daughter: () => t("js.disc.higgs.daughter", "photon"),
    note: () => t("js.disc.higgs.note", "A ripple in the Higgs field - the field that gives every other elementary particle its mass. It weighs 133 protons, and it was the last missing piece of the Standard Model until the LHC found it in 2012. Its debris here is two photons - massless and uncharged, so nothing bends them and a dense block has to stop them to read E. Only a few percent of the pairs in this window are really Higgs decays, which is why it took a hundred trillion collisions."),
  },
};

const state = { key: "jpsi", res: 0.02, bkg: 0.45, rate: 40, running: true };
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
  recent = recent.slice(0, 4);
}

function reset() {
  hist.sig.fill(0);
  hist.bkg.fill(0);
  hist.total = 0;
  recent = [];
  yMax = 6;
}

/* ---------- what the experimenter can work out ---------- */

/* The background falls steeply across the window, so averaging the sidebands would
   overestimate what sits under a peak on the right of it - badly enough to make the
   excess come out negative. Fit the sidebands with a falling exponential instead and
   read the fit underneath the peak, which is what an experiment actually does. */
function fitBackground(spec, binW, peakLo, peakHi) {
  let n = 0;
  let sx = 0;
  let sy = 0;
  let sxx = 0;
  let sxy = 0;
  let flat = 0;
  for (let i = 0; i < BINS; i += 1) {
    if (i >= peakLo && i <= peakHi) continue;
    const count = hist.sig[i] + hist.bkg[i];
    flat += count;
    if (count < 1) continue;
    const x = spec.lo + (i + 0.5) * binW;
    const y = Math.log(count);
    n += 1;
    sx += x;
    sy += y;
    sxx += x * x;
    sxy += x * y;
  }
  const sideBins = BINS - (peakHi - peakLo + 1);
  const average = sideBins > 0 ? flat / sideBins : 0;
  const denom = n * sxx - sx * sx;
  if (n < 8 || Math.abs(denom) < 1e-9) return () => average;
  const slope = (n * sxy - sx * sy) / denom;
  const intercept = (sy - slope * sx) / n;
  if (!Number.isFinite(slope) || !Number.isFinite(intercept)) return () => average;
  return (mass) => Math.exp(intercept + slope * mass);
}

function analyse() {
  const spec = parent();
  const binW = (spec.hi - spec.lo) / BINS;
  /* two daughters of similar energy smear the mass by roughly the energy resolution over √2 */
  const sigmaM = Math.max(spec.M * state.res / Math.SQRT2, binW);
  const peakLo = Math.max(0, Math.floor((spec.M - 2.5 * sigmaM - spec.lo) / binW));
  const peakHi = Math.min(BINS - 1, Math.ceil((spec.M + 2.5 * sigmaM - spec.lo) / binW));
  const model = fitBackground(spec, binW, peakLo, peakHi);

  let inPeak = 0;
  let under = 0;
  for (let i = peakLo; i <= peakHi; i += 1) {
    inPeak += hist.sig[i] + hist.bkg[i];
    under += Math.max(0, model(spec.lo + (i + 0.5) * binW));
  }

  /* The centre comes from the background-subtracted core of the peak only. Taking the
     whole window would weight the wings, where the subtraction is all noise and the
     falling background makes that noise much bigger on the left than on the right -
     enough to drag the answer most of a GeV below the true mass. */
  let massSum = 0;
  let massWeight = 0;
  const coreLo = Math.max(0, Math.floor((spec.M - 1.5 * sigmaM - spec.lo) / binW));
  const coreHi = Math.min(BINS - 1, Math.ceil((spec.M + 1.5 * sigmaM - spec.lo) / binW));
  for (let i = coreLo; i <= coreHi; i += 1) {
    const centre = spec.lo + (i + 0.5) * binW;
    const over = hist.sig[i] + hist.bkg[i] - Math.max(0, model(centre));
    massSum += over * centre;
    massWeight += over;
  }
  const excess = inPeak - under;
  const measured = massWeight > 0 ? massSum / massWeight : 0;
  const sigma = excess / Math.sqrt(Math.max(under, 1));
  return { sigmaM, peakLo, peakHi, inPeak, under, excess, sigma, measured, binW, model };
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
  setCell("discSigma", hist.total < 20 ? "-" : Math.max(0, stats.sigma).toFixed(1) + "σ");
  setCell("discTruth", spec.M + " GeV");
  setCell("discSigmaCalc", hist.total < 20 ? "-" : t("js.disc.sigmaCalc", "{excess} ÷ √{under} = {sigma}", {
    excess: Math.round(stats.excess).toLocaleString(),
    under: Math.round(stats.under).toLocaleString(),
    sigma: Math.max(0, stats.sigma).toFixed(1),
  }));

  const err = stats.excess > 4 ? stats.sigmaM / Math.sqrt(stats.excess) : 0;
  const decimals = err > 0 ? Math.min(4, Math.max(1, Math.ceil(-Math.log10(err)) + 1)) : 2;
  setCell("discMass", stats.excess > 4
    ? stats.measured.toFixed(decimals) + " ± " + err.toFixed(decimals) + " GeV"
    : t("js.disc.notYet", "not yet"));

  const verdict = byId("discVerdict");
  const head = byId("discVerdictHead");
  const detail = byId("discVerdictDetail");
  if (hist.total < 30) {
    verdict.className = "verdict waiting";
    head.textContent = t("js.disc.early.head", "Collecting collisions…");
    detail.textContent = t("js.disc.early.detail", "Each collision drops one number into the chart: the mass rebuilt from its two tracks. Random combinations land anywhere. Keep going.");
  } else if (stats.sigma < 2) {
    verdict.className = "verdict waiting";
    head.textContent = t("js.disc.none.head", "No peak - just background.");
    detail.textContent = t("js.disc.none.detail", "{inPeak} pairs landed in the window and the fitted background explains about {under} of them on its own - a leftover well inside the usual wobble. This is still just the smooth slope that uncorrelated {daughter} pairs make.", { inPeak: Math.round(stats.inPeak).toLocaleString(), under: Math.round(stats.under).toLocaleString(), daughter: spec.daughter() });
  } else if (stats.sigma < 3) {
    verdict.className = "verdict newton";
    head.textContent = t("js.disc.hint.head", "Something is piling up.");
    detail.textContent = t("js.disc.hint.detail", "{inPeak} pairs in the window against {under} expected from background - an excess of {excess}, which is {sigma}σ. Physics calls this nothing: wobbles this big turn up by luck several times a year. Take more data.", { inPeak: Math.round(stats.inPeak).toLocaleString(), under: Math.round(stats.under).toLocaleString(), excess: Math.round(stats.excess).toLocaleString(), sigma: stats.sigma.toFixed(1) });
  } else if (stats.sigma < 5) {
    verdict.className = "verdict";
    head.textContent = t("js.disc.evidence.head", "{sigma}σ - evidence.", { sigma: stats.sigma.toFixed(1) });
    detail.textContent = t("js.disc.evidence.detail", "{excess} pairs more than the background can account for. Real enough to publish as evidence, not yet enough to claim - and the excess sits at {mass} GeV and refuses to move as data accumulates.", { excess: Math.round(stats.excess).toLocaleString(), mass: stats.measured.toFixed(1) });
  } else {
    verdict.className = "verdict rest";
    head.textContent = t("js.disc.found.head", "Discovery - {sigma}σ.", { sigma: stats.sigma.toFixed(1) });
    detail.textContent = t("js.disc.found.detail", "{excess} pairs above what background explains, at {mass} GeV. Beyond five sigma the community calls it a particle. You never saw it - it was gone in 10⁻²² seconds. You weighed its debris with √(E² − (pc)²), and the answer kept coming back the same.", { excess: Math.round(stats.excess).toLocaleString(), mass: stats.measured.toFixed(2) });
  }

  setCell("discResValue", (state.res * 100).toFixed(1) + "%");
  setCell("discBkgValue", Math.round(state.bkg * 100) + "%");
  setCell("discRateValue", state.running ? Math.round(state.rate) + "/s" : t("js.disc.paused", "paused"));
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

  /* the curve the experimenter fits to the sidebands - the bump is whatever rises above it */
  if (hist.total > 40) {
    ctx.strokeStyle = "#6b6d73";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    for (let i = 0; i <= BINS; i += 1) {
      const m = spec.lo + (i + 0.5) * stats.binW;
      const y = Y(Math.max(0, stats.model(m)));
      if (i === 0) ctx.moveTo(X(m), y);
      else ctx.lineTo(X(m), y);
    }
    ctx.stroke();
  }

  ctx.strokeStyle = SOFT;
  ctx.lineWidth = 1.1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(X(spec.M), padT);
  ctx.lineTo(X(spec.M), padT + plotH);
  ctx.stroke();
  ctx.setLineDash([]);
  label(ctx, t("js.disc.trueMass", "true mass, {m} GeV", { m: spec.M }), X(spec.M), padT - 10, SOFT, "650 9.5px Inter, sans-serif");

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
  label(ctx, t("js.disc.xAxis", "the mass each pair computes to,  √(E² − (pc)²)  ·  GeV"), padL + plotW / 2, h - 10, MUTED, "700 10.5px Inter, sans-serif");
  ctx.save();
  ctx.translate(14, padT + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  label(ctx, t("js.disc.yAxis", "how many pairs landed in this slice"), 0, 0, MUTED, "700 10.5px Inter, sans-serif");
  ctx.restore();

  label(ctx, t("js.disc.collisions", "{n} collisions", { n: hist.total.toLocaleString() }), w - padR, padT - 10, MUTED, "750 10.5px Inter, sans-serif", "right");
}

/* One event, with the arithmetic on show: two energies and the angle between them are
   everything the detector reports, and they are enough to weigh the parent. */
function drawEvent() {
  const { ctx, w, h } = fit(eventCanvas);
  if (!ctx) return;
  ctx.clearRect(0, 0, w, h);
  const textH = 56;
  const cx = w / 2;
  const cy = (h - textH) / 2 + 6;
  const R = Math.min(w / 2, (h - textH) / 2) - 14;
  if (R < 30) return;

  ctx.strokeStyle = "#efefee";
  ctx.lineWidth = 1;
  for (const r of [R, R * 0.72, R * 0.44]) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  const spec = parent();
  recent.forEach((event, i) => {
    ctx.globalAlpha = i === 0 ? 1 : Math.max(0, 0.3 - i * 0.05);
    ctx.strokeStyle = event.signal ? ORANGE : "#b9bac0";
    ctx.lineWidth = i === 0 ? 2.4 : 1.4;
    event.tracks.forEach((track) => {
      const norm = Math.hypot(track.p[0], track.p[1]) || 1;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + track.p[0] / norm * R, cy + track.p[1] / norm * R);
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
  });

  const event = recent[0];
  if (event) {
    const [a, b] = event.tracks;
    for (let i = 0; i < 2; i += 1) {
      const track = event.tracks[i];
      const norm = Math.hypot(track.p[0], track.p[1]) || 1;
      label(ctx, track.E.toFixed(1), cx + track.p[0] / norm * (R - 18), cy + track.p[1] / norm * (R - 18) - 6,
        event.signal ? ORANGE : MUTED, "750 10px Inter, sans-serif");
    }
    const dot = a.p[0] * b.p[0] + a.p[1] * b.p[1] + a.p[2] * b.p[2];
    const opening = Math.acos(Math.max(-1, Math.min(1, dot / (Math.hypot(...a.p) * Math.hypot(...b.p)))));
    label(ctx, t("js.disc.measured", "measured: {e1} GeV, {e2} GeV, {deg}° apart", {
      e1: a.E.toFixed(1), e2: b.E.toFixed(1), deg: Math.round(opening * 180 / Math.PI),
    }), cx, h - 38, MUTED, "650 10px Inter, sans-serif");
    label(ctx, t("js.disc.eventMass", "√(E² − (pc)²) = {m} GeV", { m: event.m.toFixed(2) }),
      cx, h - 21, event.signal ? ORANGE : INK, "800 12px Inter, sans-serif");
    label(ctx, event.signal
      ? t("js.disc.realPair", "same parent - so it lands on the mass, every time")
      : t("js.disc.fakePair", "unrelated pair - this number means nothing, and lands anywhere"),
      cx, h - 6, event.signal ? ORANGE : SOFT, "650 9.5px Inter, sans-serif");
  }

  ctx.fillStyle = VIOLET;
  ctx.beginPath();
  ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
  ctx.fill();
  label(ctx, t("js.disc.tracks", "two {daughter}s, energies in GeV", { daughter: spec.daughter() }),
    cx, 12, SOFT, "650 9px Inter, sans-serif");
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
  byId("discNote").textContent = spec.note();
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
  byId("discPauseBtn").textContent = state.running ? t("js.disc.pause", "Pause") : t("js.disc.resume", "Resume");
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
window.addEventListener("i18n:change", () => {
  byId("discNote").textContent = parent().note();
  byId("discPauseBtn").textContent = state.running ? t("js.disc.pause", "Pause") : t("js.disc.resume", "Resume");
  refresh(analyse());
});

setParent("jpsi");
setActive(document.querySelector(".slide.on")?.dataset.simulator === "discover");
}());
