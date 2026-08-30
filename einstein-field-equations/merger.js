import * as THREE from "three";

const byId = (id) => document.getElementById(id);

const VIOLET = "#5552b9";
const ORANGE = "#d95d39";
const GREEN = "#21805a";
const INK = "#1b1d20";
const SOFT = "#92949a";

const TAU = Math.PI * 2;

/* Geometric units throughout: G = c = 1 and the binary's total mass M = 1, so every
   length and time below is in units of M. Real seconds, kilometres, hertz and watts
   come back out through M☉ = 4.9255 µs = 1.4766 km. */
const MSUN_S = 4.925490947e-6;
const MSUN_KM = 1.4766250615;
const MPC_KM = 3.085677581e19;
const MPC_MLY = 3.26156;
const L_UNIT = 3.6283e52;   // c⁵/G in watts - the natural unit of luminosity
const L_STARS = 7e47;       // every star in the observable universe, added up
const ARM_M = 4000;         // one LIGO arm

/* The inspiral runs on the leading-order quadrupole equations, which are honest until
   the horizons are a few M apart and then overshoot. A_MERGE is where the plunge takes
   over (chosen so the peak wave frequency lands where numerical relativity puts it) and
   the taper rolls the amplitude over to the measured peak power instead of the
   formula's - the same job the phenomenological waveform families do. */
const A_MERGE = 2.6;
const TAPER_A = 3.55;
const TAPER_N = 2.83;

const T_INSPIRAL = 1140;    // drawn length of the inspiral, in units of M (≈8 orbits)
const T_TAIL = 220;
const PRE_TRACE = 340;      // pre-history the chirp panel opens with
const RATE = 55;            // units of M per second of wall clock

const R_SHEET = 96;
const NR = 104;
const NA = 144;
const WAVE_GAIN = 28;
const WELL_DEPTH = 10;
const WELL_SOFT = 3.4;
const DET_Y = 34;
const DET_R = 16;
const DET_N = 30;
const HOME = { yaw: .7, pitch: .66, radius: 285, ty: -12 };

const HIST_DT = .2;
const HIST_N = Math.ceil((R_SHEET + T_TAIL) / HIST_DT);
const TRACE_DT = .8;
const TRACE_N = Math.ceil((PRE_TRACE + T_INSPIRAL + T_TAIL) / TRACE_DT) + 8;

const BANDS = [
  { name: "pulsar timing", lo: 1e-9, hi: 1e-6 },
  { name: "LISA", lo: 1e-4, hi: .1 },
  { name: "LIGO–Virgo", lo: 20, hi: 2000 }
];

const SCENES = {
  gw150914: {
    m: 65, ratio: 36 / 29, dist: 410, title: "GW150914",
    note: "The first gravitational wave ever recorded - 36 and 29 solar masses, 1.3 billion light-years away, detected 14 September 2015 four days after LIGO switched on. Everything you see is set by those numbers: watch the strain row reach about 10⁻²¹, and the arm row reach a few thousandths of a proton. That is what a century of engineering was for."
  },
  twins: {
    m: 60, ratio: 1, dist: 400, title: "Equal twins",
    note: "Two identical holes: the loudest possible merger for a given total mass, because the wave feeds on the mass ratio through η = m₁m₂/M² and η is largest when the masses match. Equal twins also radiate the cleanest signal - a pure two-armed spiral with nothing lopsided about it, and no recoil kick at the end."
  },
  lopsided: {
    m: 38, ratio: 5, dist: 740, title: "Lopsided 5 : 1",
    note: "A heavyweight with a small companion, like GW190412 (30 + 8 M☉). Small η means feeble waves, so the little hole has to make many more turns before it falls in - the inspiral is quieter and longer. Real lopsided pairs also radiate at harmonics of the orbit, not just twice it, which is how their mass ratio gives itself away."
  },
  monsters: {
    m: 2e6, ratio: 1.5, dist: 3000, title: "Supermassive",
    note: "A million solar masses each, the kind of pair that forms when two galaxies merge. The film is exactly the same - the equations only know M, so scaling the mass just rescales the clock. But the numbers are unrecognisable: hours instead of a fifth of a second, millihertz instead of hundreds of hertz, and a strain 10,000× larger. Far below LIGO's band; this is what LISA is being built to hear."
  }
};

const state = { key: "gw150914", mTot: 65, ratio: 36 / 29, dist: 410 };
const cfg = {};
const run = {};

let active = false;
let paused = false;
let slow = false;
let amplifyR = true;
let showRing = true;
let autoOrbit = false;
let frameCount = 0;
let flashUntil = 0;

/* ---------- formatting ---------- */

const SUP = { "-": "⁻", 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };
const fmt = (v, d = 2) => Number(v).toFixed(d);

function sci(v, d = 2) {
  if (!Number.isFinite(v) || v === 0) return "0";
  const e = Math.floor(Math.log10(Math.abs(v)));
  const m = v / 10 ** e;
  return `${m.toFixed(d)}×10${String(e).split("").map((c) => SUP[c]).join("")}`;
}

function num(v, unit = "") {
  const a = Math.abs(v);
  if (a === 0) return `0${unit}`;
  if (a >= 1e5 || a < 1e-3) return sci(v) + unit;
  const d = a >= 100 ? 0 : a >= 10 ? 1 : 2;
  return v.toFixed(d).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + unit;
}

function fmtMass(m) {
  const body = m >= 1e5 ? sci(m, 1) : m >= 10 ? Math.round(m).toLocaleString("en-US") : num(m);
  return `${body} M☉`;
}

function fmtTime(s) {
  const a = Math.abs(s);
  if (a < 1e-3) return `${(s * 1e6).toFixed(0)} µs`;
  if (a < 1) return `${(s * 1e3).toFixed(a < .01 ? 1 : 0)} ms`;
  if (a < 90) return `${s.toFixed(a < 10 ? 2 : 1)} s`;
  if (a < 5400) return `${(s / 60).toFixed(1)} min`;
  if (a < 1.73e5) return `${(s / 3600).toFixed(1)} h`;
  if (a < 3.15e7) return `${(s / 86400).toFixed(1)} days`;
  return `${(s / 3.156e7).toFixed(1)} yr`;
}

function fmtLen(km) {
  if (km < 1) return `${(km * 1000).toFixed(0)} m`;
  if (km < 1e6) return `${num(km)} km`;
  return `${num(km / 1.496e8)} AU`;
}

/* ---------- unit bridges ---------- */

const Ms = () => state.mTot * MSUN_S;
const Mkm = () => state.mTot * MSUN_KM;
const Dkm = () => state.dist * MPC_KM;
const hzOf = (omega) => omega / (TAU * Ms());
const strainOf = (amp) => amp * Mkm() / Dkm();

/* ---------- the binary ---------- */

const taper = (a) => 1 / (1 + (TAPER_A / a) ** TAPER_N);

/* Face-on quadrupole amplitude, in the combination r·h/M: 4η(MΩ)^(2/3) = 4η/a. */
const waveAmp = (a) => 4 * cfg.eta * Math.sqrt(taper(a)) / a;

/* Radiated power from the waveform itself, L = A²ω²/10, which reproduces the
   quadrupole result (32/5)η²/a⁵ during the inspiral and follows the taper after. */
const lumOf = (amp, omega) => amp * amp * omega * omega / 10;

function configure() {
  const R = state.ratio;
  cfg.m1 = R / (1 + R);
  cfg.m2 = 1 / (1 + R);
  cfg.eta = cfg.m1 * cfg.m2;
  cfg.a0 = (256 / 5 * cfg.eta * T_INSPIRAL + A_MERGE ** 4) ** .25;
  cfg.aPre = (cfg.a0 ** 4 + 256 / 5 * cfg.eta * PRE_TRACE) ** .25;
  cfg.omegaPeak = 2 * A_MERGE ** -1.5;
  cfg.ampPeak = waveAmp(A_MERGE);
  cfg.lumPeak = lumOf(cfg.ampPeak, cfg.omegaPeak);
  cfg.eRadFit = cfg.eta * (.057 + .54 * cfg.eta);
  const e = cfg.eta;
  cfg.jFit = 3.4339 * e - 3.7988 * e * e + 5.7733 * e ** 3 - 6.378 * e ** 4;
  cfg.orbits = (cfg.a0 ** 2.5 - A_MERGE ** 2.5) / (32 * cfg.eta) / TAU;
  cfg.tEnd = T_INSPIRAL + T_TAIL;
  cfg.stretch = 1 / (RATE * Ms());
  const fStart = hzOf(2 * cfg.a0 ** -1.5);
  cfg.pitch = 2 ** Math.max(-6, Math.min(24, Math.round(Math.log2(95 / fStart))));
  const fPeak = hzOf(cfg.omegaPeak);
  cfg.band = BANDS.find((b) => fPeak >= b.lo && fPeak <= b.hi)
    || BANDS.reduce((best, b) => {
      const d = Math.abs(Math.log10(fPeak) - Math.log10(Math.sqrt(b.lo * b.hi)));
      return !best || d < best.d ? { b, d } : best;
    }, null).b;
}

function resetRun() {
  run.t = 0;
  run.a = cfg.a0;
  run.psi = 0;
  run.omega = 2 * cfg.a0 ** -1.5;
  run.amp = waveAmp(cfg.a0);
  run.lum = lumOf(run.amp, run.omega);
  run.eRad = 0;
  run.phase = "inspiral";
  run.tMerge = 0;
  run.ampMerge = 0;
  run.tau = 1;
  run.omegaRing = 0;
  run.replayAt = 0;
  histFill = 0;
  histStep = 0;
  histA.fill(0);
  histP.fill(0);
  traceLen = 0;
  for (let tt = -PRE_TRACE; tt < 0; tt += TRACE_DT) {
    preState(tt);
    pushTrace(tt, sAmp * Math.cos(sPsi), 2 * sA ** -1.5);
  }
  flashUntil = 0;
  if (renderer) {
    trail1.length = 0;
    trail2.length = 0;
    updateTrail(trailLine1, trail1);
    updateTrail(trailLine2, trail2);
    frontRing.visible = false;
    flashSprite.visible = false;
    remnant.visible = false;
    holes.visible = true;
  }
}

/* ---------- source history ----------
   The sheet needs the source as it was at the retarded time t − r. Samples of the
   waveform phase and amplitude go into a ring buffer; anything older than the start of
   the run comes from the closed-form inspiral, which is exact for these equations:
     a(t) = (a₀⁴ − (256/5)ηt)^(1/4),  φ = (a₀^(5/2) − a^(5/2)) / 32η. */
const histA = new Float32Array(HIST_N);
const histP = new Float32Array(HIST_N);
let histStep = 0;
let histFill = 0;
let sAmp = 0, sPsi = 0, sA = 0;

function preState(tr) {
  sA = (cfg.a0 ** 4 - 256 / 5 * cfg.eta * tr) ** .25;
  sAmp = waveAmp(sA);
  sPsi = (cfg.a0 ** 2.5 - sA ** 2.5) / (16 * cfg.eta);
}

function pushHistory() {
  const step = Math.floor(run.t / HIST_DT);
  while (histStep < step) {
    histStep += 1;
    histA[histStep % HIST_N] = run.amp;
    histP[histStep % HIST_N] = run.psi;
    histFill += 1;
  }
}

function sampleWave(tr) {
  if (tr <= 0) {
    preState(tr);
    return;
  }
  const x = tr / HIST_DT;
  const i0 = Math.floor(x);
  if (i0 >= histStep) {
    sAmp = run.amp;
    sPsi = run.psi;
    return;
  }
  if (histStep - i0 > HIST_N - 2 || i0 >= histFill) {
    sAmp = 0;
    sPsi = 0;
    return;
  }
  const f = x - i0;
  const a0 = histA[i0 % HIST_N], a1 = histA[(i0 + 1) % HIST_N];
  const p0 = histP[i0 % HIST_N], p1 = histP[(i0 + 1) % HIST_N];
  sAmp = a0 + (a1 - a0) * f;
  sPsi = p0 + (p1 - p0) * f;
}

/* ---------- integration ---------- */

function stepPhysics(dt) {
  let left = dt;
  while (left > 1e-9) {
    if (run.phase === "inspiral") {
      const h = Math.min(left, Math.max(.02, .03 * run.a ** 1.5));
      const omegaOrb = run.a ** -1.5;
      run.omega = 2 * omegaOrb;
      run.psi += run.omega * h;
      run.a -= 64 / 5 * cfg.eta / run.a ** 3 * h;
      run.t += h;
      run.amp = waveAmp(Math.max(run.a, A_MERGE));
      run.lum = lumOf(run.amp, run.omega);
      run.eRad += run.lum * h;
      left -= h;
      if (run.a <= A_MERGE) startRingdown();
    } else {
      const h = Math.min(left, .35);
      const age = run.t - run.tMerge;
      run.omega += (run.omegaRing - run.omega) * Math.min(1, h / 4);
      run.psi += run.omega * h;
      run.t += h;
      run.amp = run.ampMerge * Math.exp(-age / run.tau);
      run.lum = lumOf(run.amp, run.omega);
      run.eRad += run.lum * h;
      left -= h;
    }
    pushHistory();
    if (run.t - traceLast >= TRACE_DT) pushTrace(run.t, run.amp * Math.cos(run.psi), run.omega);
  }
}

/* Kerr ringdown of the remnant: Berti's fits for the fundamental l = m = 2 mode. */
function startRingdown() {
  run.phase = "ringdown";
  run.tMerge = run.t;
  run.ampMerge = run.amp;
  run.mFinal = 1 - cfg.eRadFit;
  run.jFinal = cfg.jFit;
  const x = Math.max(1e-3, 1 - run.jFinal);
  run.omegaRing = (1.5251 - 1.1568 * x ** .1292) / run.mFinal;
  const q = .7 + 1.4187 * x ** -.499;
  run.tau = 2 * q / run.omegaRing;
  const stars = cfg.lumPeak * L_UNIT / L_STARS;
  flash("Merged",
    `${fmtMass(cfg.eRadFit * state.mTot)} just left the universe as waves. At the peak this pair radiated ${sci(cfg.lumPeak * L_UNIT)} watts - about ${num(stars)}× the light of every star in the observable universe, from an object you could fit inside a city. What is left is one black hole of ${fmtMass(run.mFinal * state.mTot)} spinning at ${fmt(run.jFinal)} of its maximum, and it is ringing.`, 7);
}

/* ---------- chirp trace ---------- */

const traceT = new Float32Array(TRACE_N);
const traceH = new Float32Array(TRACE_N);
const traceW = new Float32Array(TRACE_N);
let traceLen = 0;
let traceLast = -1e9;

function pushTrace(t, h, omega) {
  if (traceLen >= TRACE_N) return;
  traceT[traceLen] = t;
  traceH[traceLen] = h;
  traceW[traceLen] = omega;
  traceLen += 1;
  traceLast = t;
}

/* ---------- scene ---------- */

const gwCanvas = byId("gwCanvas");
const chirpCanvas = byId("chirpCanvas");

let renderer = null;
let scene = null;
let camera = null;
let yaw = HOME.yaw, pitch = HOME.pitch, radius = HOME.radius;
const camTarget = new THREE.Vector3(0, HOME.ty, 0);
const panRight = new THREE.Vector3();
const panUp = new THREE.Vector3();

let sheetMesh = null, sheetLines = null, rimLine = null;
let holes = null, hole1 = null, hole2 = null, remnant = null, spinRing = null;
let trailLine1 = null, trailLine2 = null, frontRing = null, flashSprite = null;
let detGroup = null, detDots = [], detLoop = null;
let labelRem = null, labelDet = null;

const trail1 = [];
const trail2 = [];

const rTab = new Float32Array(NR);
const cosT = new Float32Array(NA);
const sinT = new Float32Array(NA);
const cos2T = new Float32Array(NA);
const sin2T = new Float32Array(NA);
const zBuf = new Float32Array(NR * NA);
const sBuf = new Float32Array(NR * NA);
const wBuf = new Float32Array(NR * NA);
let posArr = null, colArr = null;

const LIGHT = [.36, .84, .4];
const C_PAPER = [.953, .949, .933];
const C_HOT = [.851, .365, .224];
const C_COLD = [.192, .353, .624];

function makeGlowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext("2d");
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(.3, "rgba(255,255,255,.5)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

const labels = [];

function makeLabel(height) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  sprite.scale.set(height * 4, height, 1);
  labels.push({ sprite, height });
  return {
    sprite,
    set(text, color, size = 44) {
      ctx.clearRect(0, 0, 512, 128);
      ctx.fillStyle = color;
      ctx.font = `750 ${size}px Inter, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, 256, 68);
      texture.needsUpdate = true;
    }
  };
}

function circlePoints(r, y, segments = 128) {
  const pts = [];
  for (let i = 0; i <= segments; i += 1) {
    const a = i / segments * TAU;
    pts.push(new THREE.Vector3(r * Math.cos(a), y, r * Math.sin(a)));
  }
  return pts;
}

function buildSheet() {
  for (let i = 0; i < NR; i += 1) rTab[i] = R_SHEET * ((i + .5) / NR) ** 1.4;
  for (let j = 0; j < NA; j += 1) {
    const a = j / NA * TAU;
    cosT[j] = Math.cos(a);
    sinT[j] = Math.sin(a);
    cos2T[j] = Math.cos(2 * a);
    sin2T[j] = Math.sin(2 * a);
  }

  const n = NR * NA;
  posArr = new Float32Array(n * 3);
  colArr = new Float32Array(n * 3);
  for (let i = 0; i < NR; i += 1) {
    for (let j = 0; j < NA; j += 1) {
      const k = (i * NA + j) * 3;
      posArr[k] = rTab[i] * cosT[j];
      posArr[k + 2] = rTab[i] * sinT[j];
    }
  }

  const posAttr = new THREE.BufferAttribute(posArr, 3);
  const colAttr = new THREE.BufferAttribute(colArr, 3);
  posAttr.setUsage(THREE.DynamicDrawUsage);
  colAttr.setUsage(THREE.DynamicDrawUsage);

  const tri = [];
  for (let i = 0; i < NR - 1; i += 1) {
    for (let j = 0; j < NA; j += 1) {
      const j2 = (j + 1) % NA;
      const a = i * NA + j, b = i * NA + j2, c = (i + 1) * NA + j, d = (i + 1) * NA + j2;
      tri.push(a, c, d, a, d, b);
    }
  }
  const meshGeo = new THREE.BufferGeometry();
  meshGeo.setAttribute("position", posAttr);
  meshGeo.setAttribute("color", colAttr);
  meshGeo.setIndex(tri);
  sheetMesh = new THREE.Mesh(meshGeo, new THREE.MeshBasicMaterial({
    vertexColors: true, side: THREE.DoubleSide,
    polygonOffset: true, polygonOffsetFactor: 1.4, polygonOffsetUnits: 1.4
  }));
  sheetMesh.frustumCulled = false;
  scene.add(sheetMesh);

  /* The lattice shares the mesh's vertex buffers - one update moves both. */
  const seg = [];
  for (let i = 0; i < NR; i += 4) {
    for (let j = 0; j < NA; j += 1) seg.push(i * NA + j, i * NA + (j + 1) % NA);
  }
  for (let j = 0; j < NA; j += 6) {
    for (let i = 0; i < NR - 1; i += 1) seg.push(i * NA + j, (i + 1) * NA + j);
  }
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute("position", posAttr);
  lineGeo.setIndex(seg);
  sheetLines = new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({
    color: 0x33343d, transparent: true, opacity: .2
  }));
  sheetLines.frustumCulled = false;
  scene.add(sheetLines);

  const rimGeo = new THREE.BufferGeometry();
  const rimIdx = [];
  for (let j = 0; j < NA; j += 1) rimIdx.push((NR - 1) * NA + j, (NR - 1) * NA + (j + 1) % NA);
  rimGeo.setAttribute("position", posAttr);
  rimGeo.setIndex(rimIdx);
  rimLine = new THREE.LineSegments(rimGeo, new THREE.LineBasicMaterial({ color: 0x2b2c33, transparent: true, opacity: .45 }));
  rimLine.frustumCulled = false;
  scene.add(rimLine);
}

let wSum = 0;

function wellAt(x, z) {
  const p1 = hole1.position, p2 = hole2.position;
  if (remnant.visible) {
    const d = (x * x + z * z) / (WELL_SOFT * WELL_SOFT);
    wSum = 1 / Math.sqrt(1 + d);
  } else {
    const dx1 = x - p1.x, dz1 = z - p1.z;
    const dx2 = x - p2.x, dz2 = z - p2.z;
    wSum = cfg.m1 / Math.sqrt(1 + (dx1 * dx1 + dz1 * dz1) / (WELL_SOFT * WELL_SOFT))
      + cfg.m2 / Math.sqrt(1 + (dx2 * dx2 + dz2 * dz2) / (WELL_SOFT * WELL_SOFT));
  }
  return -WELL_DEPTH * wSum;
}

function updateSheet() {
  const norm = Math.max(1e-4, cfg.ampPeak);
  for (let i = 0; i < NR; i += 1) {
    const r = rTab[i];
    sampleWave(run.t - r);
    const fall = amplifyR ? 1 : Math.min(1.6, .3 * R_SHEET / r);
    const ca = Math.cos(sPsi) * sAmp * fall;
    const sa = Math.sin(sPsi) * sAmp * fall;
    for (let j = 0; j < NA; j += 1) {
      const k = i * NA + j;
      const s = ca * cos2T[j] + sa * sin2T[j];
      sBuf[k] = s;
      zBuf[k] = wellAt(r * cosT[j], r * sinT[j]) + WAVE_GAIN * s;
      wBuf[k] = wSum;
    }
  }

  const dth = TAU / NA;
  for (let i = 0; i < NR; i += 1) {
    const im = i > 0 ? i - 1 : i;
    const ip = i < NR - 1 ? i + 1 : i;
    const dr = Math.max(1e-4, rTab[ip] - rTab[im]);
    const rr = Math.max(.3, rTab[i]);
    for (let j = 0; j < NA; j += 1) {
      const k = i * NA + j;
      const jm = (j + NA - 1) % NA;
      const jp = (j + 1) % NA;
      const gr = (zBuf[ip * NA + j] - zBuf[im * NA + j]) / dr;
      const gt = (zBuf[i * NA + jp] - zBuf[i * NA + jm]) / (2 * dth * rr);
      const nx = -gr * cosT[j] + gt * sinT[j];
      const nz = -gt * cosT[j] - gr * sinT[j];
      const inv = 1 / Math.sqrt(nx * nx + 1 + nz * nz);
      const lam = (nx * LIGHT[0] + LIGHT[1] + nz * LIGHT[2]) * inv;
      const shade = (.58 + .42 * Math.max(0, lam)) * (1 - .32 * Math.min(1, wBuf[k]));

      const s = sBuf[k] / norm;
      const t = Math.min(1, Math.abs(s)) ** .7 * .92;
      const hot = s > 0 ? C_HOT : C_COLD;
      posArr[k * 3 + 1] = zBuf[k];
      colArr[k * 3] = (C_PAPER[0] + (hot[0] - C_PAPER[0]) * t) * shade;
      colArr[k * 3 + 1] = (C_PAPER[1] + (hot[1] - C_PAPER[1]) * t) * shade;
      colArr[k * 3 + 2] = (C_PAPER[2] + (hot[2] - C_PAPER[2]) * t) * shade;
    }
  }
  sheetMesh.geometry.attributes.position.needsUpdate = true;
  sheetMesh.geometry.attributes.color.needsUpdate = true;
}

function buildBodies() {
  const glowMat = new THREE.SpriteMaterial({
    map: makeGlowTexture(), color: 0xd9812f, transparent: true, opacity: .8, depthWrite: false
  });
  const darkMat = new THREE.MeshBasicMaterial({ color: 0x0c0c11 });

  const mk = (m) => {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(1, 26, 18), darkMat);
    body.scale.setScalar(2 * m);
    const glow = new THREE.Sprite(glowMat);
    glow.scale.set(16 * m, 16 * m, 1);
    group.add(body, glow);
    return group;
  };

  hole1 = mk(cfg.m1);
  hole2 = mk(cfg.m2);
  holes = new THREE.Group();
  holes.add(hole1, hole2);
  scene.add(holes);

  labelRem = makeLabel(9);
  remnant = new THREE.Group();
  const rem = new THREE.Mesh(new THREE.SphereGeometry(1, 30, 20), darkMat);
  rem.name = "body";
  const remGlow = new THREE.Sprite(glowMat);
  remGlow.scale.set(20, 20, 1);
  spinRing = new THREE.Group();
  for (let i = 0; i < 3; i += 1) {
    const pts = [];
    for (let s = 0; s <= 12; s += 1) {
      const a = i * TAU / 3 + s / 12 * .7;
      pts.push(new THREE.Vector3(3.2 * Math.cos(a), .2, 3.2 * Math.sin(a)));
    }
    spinRing.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: 0x8a6bd8, transparent: true, opacity: .85 })
    ));
  }
  labelRem.sprite.position.y = 7;
  remnant.add(rem, remGlow, spinRing, labelRem.sprite);
  remnant.visible = false;
  scene.add(remnant);

  const trailMat = () => new THREE.LineBasicMaterial({ color: 0x5552b9, transparent: true, opacity: .55 });
  trailLine1 = new THREE.Line(new THREE.BufferGeometry(), trailMat());
  trailLine2 = new THREE.Line(new THREE.BufferGeometry(), trailMat());
  trailLine1.frustumCulled = false;
  trailLine2.frustumCulled = false;
  scene.add(trailLine1, trailLine2);

  /* A tube, lifted clear of the sheet and drawn over it: a hairline ring would be
     lost among the crests it is racing across. */
  frontRing = new THREE.Mesh(
    new THREE.TorusGeometry(1, .011, 6, 140),
    new THREE.MeshBasicMaterial({ color: ORANGE, transparent: true, opacity: .9, depthTest: false })
  );
  frontRing.rotation.x = -Math.PI / 2;
  frontRing.position.y = 11;
  frontRing.visible = false;
  scene.add(frontRing);

  flashSprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeGlowTexture(), color: 0xffe3c4, transparent: true, opacity: 0, depthWrite: false
  }));
  flashSprite.visible = false;
  scene.add(flashSprite);
}

function buildDetector() {
  detGroup = new THREE.Group();
  const dotGeo = new THREE.SphereGeometry(.8, 12, 8);
  const dotMat = new THREE.MeshBasicMaterial({ color: GREEN });
  detDots = [];
  for (let i = 0; i < DET_N; i += 1) {
    const dot = new THREE.Mesh(dotGeo, dotMat);
    detGroup.add(dot);
    detDots.push(dot);
  }
  detLoop = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(new Array(DET_N).fill(0).map(() => new THREE.Vector3())),
    new THREE.LineBasicMaterial({ color: GREEN, transparent: true, opacity: .5 })
  );
  detGroup.add(detLoop);
  labelDet = makeLabel(8);
  labelDet.set("free test masses", GREEN, 40);
  labelDet.sprite.position.set(0, DET_R + 4, 0);
  detGroup.add(labelDet.sprite);
  detGroup.position.y = DET_Y;
  scene.add(detGroup);
}

function updateDetector() {
  detGroup.visible = showRing;
  if (!showRing) return;
  sampleWave(run.t - DET_Y);
  const k = .45 / Math.max(1e-4, cfg.ampPeak);
  const hp = Math.min(1, sAmp * k) * Math.cos(sPsi);
  const hc = Math.min(1, sAmp * k) * Math.sin(sPsi);
  const pts = detLoop.geometry.attributes.position.array;
  for (let i = 0; i < DET_N; i += 1) {
    const a = i / DET_N * TAU;
    const x = DET_R * Math.cos(a), z = DET_R * Math.sin(a);
    const dx = x + .5 * (hp * x + hc * z);
    const dz = z + .5 * (hc * x - hp * z);
    detDots[i].position.set(dx, 0, dz);
    pts[i * 3] = dx;
    pts[i * 3 + 1] = 0;
    pts[i * 3 + 2] = dz;
  }
  detLoop.geometry.attributes.position.needsUpdate = true;
  detLoop.geometry.computeBoundingSphere();
}

function updateTrail(line, pts) {
  line.geometry.dispose();
  line.geometry = new THREE.BufferGeometry().setFromPoints(pts.length > 1 ? pts : [new THREE.Vector3(), new THREE.Vector3()]);
  line.visible = pts.length > 1;
}

function updateBodies(dt) {
  if (run.phase === "inspiral") {
    const phi = run.psi / 2;
    const r1 = run.a * cfg.m2;
    const r2 = run.a * cfg.m1;
    const c = Math.cos(phi), s = Math.sin(phi);
    hole1.position.set(r1 * c, 0, r1 * s);
    hole2.position.set(-r2 * c, 0, -r2 * s);
    hole1.position.y = wellAt(hole1.position.x, hole1.position.z) + 2.6 * cfg.m1;
    hole2.position.y = wellAt(hole2.position.x, hole2.position.z) + 2.6 * cfg.m2;
    if (pushPoint(trail1, hole1.position)) updateTrail(trailLine1, trail1);
    if (pushPoint(trail2, hole2.position)) updateTrail(trailLine2, trail2);
  } else if (!remnant.visible) {
    holes.visible = false;
    remnant.visible = true;
    remnant.getObjectByName("body").scale.setScalar(2 * run.mFinal);
    labelRem.set(`${fmtMass(run.mFinal * state.mTot)} · spin ${fmt(run.jFinal)}`, INK, 40);
    remnant.position.set(0, 0, 0);
    remnant.position.y = wellAt(0, 0) + 2.6 * run.mFinal;
    frontRing.visible = true;
    flashSprite.visible = true;
    flashSprite.material.opacity = .95;
    flashSprite.scale.set(8, 8, 1);
    flashSprite.position.copy(remnant.position);
  }

  if (remnant.visible) {
    spinRing.rotation.y -= dt * 2.2;
    const front = run.t - run.tMerge;
    if (front < R_SHEET * 1.08) {
      frontRing.scale.setScalar(Math.max(.01, front));
      frontRing.material.opacity = .85 * (1 - front / (R_SHEET * 1.08)) + .1;
    } else {
      frontRing.visible = false;
    }
    if (flashSprite.material.opacity > 0) {
      flashSprite.material.opacity = Math.max(0, flashSprite.material.opacity - dt * 1.6);
      flashSprite.scale.setScalar(flashSprite.scale.x + dt * 34);
      if (flashSprite.material.opacity <= 0) flashSprite.visible = false;
    }
  }
}

function pushPoint(list, p) {
  const last = list[list.length - 1];
  if (last && last.distanceTo(p) < .3) return false;
  list.push(p.clone());
  if (list.length > 900) list.shift();
  return true;
}

function initScene() {
  try {
    renderer = new THREE.WebGLRenderer({ canvas: gwCanvas, antialias: true });
  } catch (error) {
    renderer = null;
    return;
  }
  renderer.setClearColor(0xffffff);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(42, 16 / 9, .5, 2000);

  buildSheet();
  buildBodies();
  buildDetector();

  gwCanvas.addEventListener("contextmenu", (event) => event.preventDefault());
  gwCanvas.addEventListener("pointerdown", (event) => {
    gwCanvas.setPointerCapture(event.pointerId);
    gwCanvas.dataset.x = event.clientX;
    gwCanvas.dataset.y = event.clientY;
    gwCanvas.dataset.drag = "1";
  });
  gwCanvas.addEventListener("pointermove", (event) => {
    if (gwCanvas.dataset.drag !== "1") return;
    const dx = event.clientX - Number(gwCanvas.dataset.x);
    const dy = event.clientY - Number(gwCanvas.dataset.y);
    if ((event.buttons & 2) || event.shiftKey) {
      const k = radius * .0013;
      panRight.setFromMatrixColumn(camera.matrix, 0);
      panUp.setFromMatrixColumn(camera.matrix, 1);
      camTarget.addScaledVector(panRight, -dx * k).addScaledVector(panUp, dy * k);
      if (camTarget.length() > R_SHEET) camTarget.setLength(R_SHEET);
    } else {
      yaw -= dx * .005;
      pitch = Math.min(1.52, Math.max(-1.52, pitch + dy * .005));
    }
    gwCanvas.dataset.x = event.clientX;
    gwCanvas.dataset.y = event.clientY;
  });
  gwCanvas.addEventListener("pointerup", () => { gwCanvas.dataset.drag = "0"; });
  gwCanvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    radius = Math.min(R_SHEET * 6, Math.max(9, radius * (1 + event.deltaY * .001)));
  }, { passive: false });
}

function resize() {
  if (!renderer) return;
  const width = gwCanvas.clientWidth;
  const height = gwCanvas.clientHeight;
  if (!width || !height) return;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function scaleLabels() {
  const k = Math.max(.28, radius / HOME.radius);
  for (const { sprite, height } of labels) sprite.scale.set(height * 4 * k, height * k, 1);
}

function updateCamera() {
  camera.position.set(
    camTarget.x + radius * Math.cos(pitch) * Math.sin(yaw),
    camTarget.y + radius * Math.sin(pitch),
    camTarget.z + radius * Math.cos(pitch) * Math.cos(yaw)
  );
  camera.lookAt(camTarget);
}

/* ---------- panels ---------- */

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

function drawChirp() {
  const { ctx, w, h } = fit(chirpCanvas);
  if (!ctx) return;
  ctx.clearRect(0, 0, w, h);
  const L = 10, R = w - 8, T = 8, B = h - 15;
  const split = T + (B - T) * .56;
  ctx.font = "650 8.5px Inter, sans-serif";

  /* top - the strain rolling past, newest on the right */
  const win = 320;
  const t1 = run.t;
  const t0 = t1 - win;
  const mid = (T + split - 6) / 2 + 3;
  const half = (split - T - 14) / 2;
  const scale = half / Math.max(1e-6, cfg.ampPeak * 1.05);
  ctx.strokeStyle = "#e6e5e0";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(L, mid);
  ctx.lineTo(R, mid);
  ctx.stroke();

  ctx.strokeStyle = VIOLET;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  let started = false;
  for (let i = 0; i < traceLen; i += 1) {
    const t = traceT[i];
    if (t < t0) continue;
    const px = L + (R - L) * (t - t0) / win;
    const py = mid - traceH[i] * scale;
    if (!started) { ctx.moveTo(px, py); started = true; } else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.fillStyle = SOFT;
  ctx.textAlign = "left";
  ctx.fillText(`strain · last ${fmtTime(win * Ms())}`, L + 1, T + 8);
  ctx.textAlign = "right";
  ctx.fillStyle = VIOLET;
  ctx.fillText(`h = ${sci(strainOf(Math.abs(run.amp)))}`, R - 1, T + 8);

  /* bottom - the whole event's pitch, log scale */
  const T2 = split + 8;
  const x0 = -PRE_TRACE;
  const x1 = cfg.tEnd;
  const X = (t) => L + (R - L) * (t - x0) / (x1 - x0);
  const fLo = hzOf(2 * cfg.aPre ** -1.5) / 1.7;
  const fHi = hzOf(Math.max(cfg.omegaPeak, run.omegaRing || 0)) * 1.7;
  const Y = (f) => B - (B - T2) * (Math.log10(f / fLo) / Math.log10(fHi / fLo));

  const band = cfg.band;
  const bTop = Math.max(T2, Y(Math.min(fHi, band.hi)));
  const bBot = Math.min(B, Y(Math.max(fLo, band.lo)));
  if (bBot > bTop) {
    ctx.fillStyle = "rgba(85,82,185,.055)";
    ctx.fillRect(L, bTop, R - L, bBot - bTop);
    ctx.strokeStyle = "rgba(85,82,185,.35)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    for (const edge of [[band.lo, bBot], [band.hi, bTop]]) {
      if (edge[0] > fLo && edge[0] < fHi) {
        ctx.moveTo(L, edge[1]);
        ctx.lineTo(R, edge[1]);
      }
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(85,82,185,.8)";
    ctx.textAlign = "left";
    ctx.fillText(`${band.name} band`, L + 3, T2 + 8);
  }

  ctx.strokeStyle = ORANGE;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  started = false;
  for (let i = 0; i < traceLen; i += 1) {
    const f = hzOf(traceW[i]);
    const px = X(traceT[i]);
    const py = Math.max(T2 - 2, Math.min(B, Y(f)));
    if (!started) { ctx.moveTo(px, py); started = true; } else ctx.lineTo(px, py);
  }
  ctx.stroke();

  ctx.strokeStyle = "rgba(27,29,32,.45)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(X(run.t), T2 - 4);
  ctx.lineTo(X(run.t), B);
  ctx.stroke();

  ctx.fillStyle = ORANGE;
  ctx.textAlign = "right";
  ctx.fillText(`${num(hzOf(run.omega))} Hz`, R - 1, T2 + 8);
  ctx.fillStyle = SOFT;
  ctx.fillText(`0 → ${fmtTime(cfg.tEnd * Ms())}`, R - 1, B + 11);
  ctx.textAlign = "left";
  ctx.fillText("pitch, whole event →", L + 1, B + 11);
}

function cell(id, text) {
  byId(id).textContent = text;
}

function refreshBoard() {
  const kmPerM = Mkm();
  cell("sbSep", run.phase === "inspiral" ? `${fmt(run.a, 1)} M · ${fmtLen(run.a * kmPerM)}` : "merged");
  cell("sbSepM", `${A_MERGE} M · ${fmtLen(A_MERGE * kmPerM)}`);

  const v = run.phase === "inspiral" ? Math.sqrt(1 / run.a) : 0;
  cell("sbV", run.phase === "inspiral" ? `${fmt(v)} c` : "merged");
  cell("sbVM", `${fmt(Math.sqrt(1 / A_MERGE))} c`);

  cell("sbFreq", `${num(hzOf(run.omega))} Hz`);
  cell("sbFreqM", `${num(hzOf(cfg.omegaPeak))} Hz`);

  cell("sbDist", `${num(state.dist)} Mpc`);
  cell("sbStrain", sci(strainOf(run.amp)));
  cell("sbStrainM", sci(strainOf(cfg.ampPeak)));

  const arm = strainOf(run.amp) * ARM_M;
  cell("sbArm", `${sci(arm)} m`);
  cell("sbArmM", `${sci(strainOf(cfg.ampPeak) * ARM_M)} m`);

  cell("sbErad", fmtMass(run.eRad * state.mTot));
  cell("sbEradM", fmtMass(cfg.eRadFit * state.mTot));

  cell("sbPow", `${sci(run.lum * L_UNIT)} W`);
  cell("sbPowM", `${sci(cfg.lumPeak * L_UNIT)} W`);
  cell("sbStars", `${num(run.lum * L_UNIT / L_STARS)}×`);
  cell("sbStarsM", `${num(cfg.lumPeak * L_UNIT / L_STARS)}×`);

  if (run.phase === "inspiral") {
    const left = 5 / 256 * (run.a ** 4 - A_MERGE ** 4) / cfg.eta;
    const orbits = (run.a ** 2.5 - A_MERGE ** 2.5) / (32 * cfg.eta) / TAU;
    cell("sbTime", fmtTime(left * Ms()));
    cell("sbCycles", `${fmt(orbits, 1)} orbits left`);
  } else {
    cell("sbTime", `+${fmtTime((run.t - run.tMerge) * Ms())}`);
    cell("sbCycles", `ringing · τ = ${fmtTime(run.tau * Ms())}`);
  }
}

function flash(head, detail, seconds) {
  byId("gwVerdict").className = "verdict danger";
  byId("gwVerdictHead").textContent = head;
  byId("gwVerdictDetail").textContent = detail;
  flashUntil = performance.now() + seconds * 1000;
}

function updateVerdict() {
  if (performance.now() < flashUntil) return;
  const box = byId("gwVerdict");
  const head = byId("gwVerdictHead");
  const detail = byId("gwVerdictDetail");
  if (run.phase === "ringdown") {
    const age = run.t - run.tMerge;
    if (age > 6 * run.tau) {
      box.className = "verdict classical";
      head.textContent = "Silence - one Kerr black hole";
      detail.textContent = `Nothing left to radiate: a single black hole of ${fmtMass(run.mFinal * state.mTot)} spinning at ${fmt(run.jFinal)} of the maximum, with no memory of which two holes made it. The last crests are still crossing the sheet at the speed of light.`;
      return;
    }
    box.className = "verdict";
    head.textContent = "Ringdown - spacetime as a struck bell";
    detail.textContent = `The new horizon is the wrong shape, and it shakes it off in one tone: ${num(hzOf(run.omegaRing))} Hz, dying away with τ = ${fmtTime(run.tau * Ms())}. That frequency and that decay are fixed by just the mass and spin of the remnant - hear the note, and you have weighed a black hole.`;
    return;
  }
  const v = Math.sqrt(1 / run.a);
  const orbits = (run.a ** 2.5 - A_MERGE ** 2.5) / (32 * cfg.eta) / TAU;
  if (run.a < 6) {
    box.className = "verdict danger";
    head.textContent = "Plunge - inside the last stable orbit";
    detail.textContent = `At ${fmt(run.a, 1)} M apart there is no orbit left to hold: the two horizons are falling into each other at ${fmt(v)} c. The waves are now leaving faster than the orbit can adjust, and the leading-order formula is running out of validity - which is exactly where real physicists switch to a supercomputer.`;
    return;
  }
  box.className = v > .25 ? "verdict" : "verdict waiting";
  head.textContent = v > .25 ? "Closing fast - the chirp is climbing" : "Inspiral - the slow leak";
  detail.textContent = v > .25
    ? `${fmt(run.a, 1)} M apart, ${fmt(v)} c, ${fmt(orbits, 1)} orbits to go. Every turn radiates a little more, so every turn is tighter and quicker than the last: pitch and volume run away together. Watch the spiral arms on the sheet bunch up.`
    : `${fmt(run.a, 1)} M apart and ${fmt(orbits, 1)} orbits from the end. The waves are carrying off ${sci(run.lum * L_UNIT)} W - enormous by any human standard, trivial next to two black holes - so the orbit shrinks slowly, for now.`;
}

function refreshPanels() {
  refreshBoard();
  updateVerdict();
  drawChirp();
  const phase = run.phase === "inspiral" ? "inspiral" : "ringdown";
  const pace = cfg.stretch >= 1
    ? `${num(cfg.stretch)}× slower than real time`
    : `${num(1 / cfg.stretch)}× faster than real time`;
  byId("gwRegime").textContent = `${fmtMass(state.mTot)} total · ${fmtMass(cfg.m1 * state.mTot)} + ${fmtMass(cfg.m2 * state.mTot)} · ${phase} · ${pace}`;
}

/* ---------- sonification ---------- */

let actx = null, osc = null, gainNode = null;
let soundOn = false;

function ensureAudio() {
  if (actx) return;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return;
  actx = new Ctor();
  gainNode = actx.createGain();
  gainNode.gain.value = 0;
  gainNode.connect(actx.destination);
  osc = actx.createOscillator();
  osc.type = "sine";
  osc.frequency.value = 120;
  osc.connect(gainNode);
  osc.start();
}

function updateAudio() {
  if (!actx) return;
  const now = actx.currentTime;
  const on = soundOn && active && !paused;
  const f = Math.max(25, Math.min(5000, hzOf(run.omega) * cfg.pitch));
  osc.frequency.setTargetAtTime(f, now, .02);
  const level = on ? .2 * Math.min(1, (run.amp / cfg.ampPeak) ** .8) : 0;
  gainNode.gain.setTargetAtTime(level, now, .05);
}

function soundLabel() {
  byId("gwSoundBtn").textContent = soundOn ? "🔊 Sound on" : "🔊 Hear it";
  byId("gwSoundBtn").title = `pitch shifted ×${cfg.pitch.toLocaleString("en-US")} · played ${cfg.stretch >= 1 ? `${num(cfg.stretch)}× slower` : `${num(1 / cfg.stretch)}× faster`} than the real event`;
}

/* ---------- controls ---------- */

const massFromSlider = (t) => 10 ** (1 + t * 6);
const sliderFromMass = (m) => (Math.log10(m) - 1) / 6;
const distFromSlider = (t) => 10 ** (1 + t * Math.log10(600));
const sliderFromDist = (d) => Math.log10(d / 10) / Math.log10(600);

function applyConfig(replay) {
  configure();
  if (renderer) {
    hole1.children[0].scale.setScalar(2 * cfg.m1);
    hole2.children[0].scale.setScalar(2 * cfg.m2);
    hole1.children[1].scale.set(9 * cfg.m1, 9 * cfg.m1, 1);
    hole2.children[1].scale.set(9 * cfg.m2, 9 * cfg.m2, 1);
  }
  byId("bandName").textContent = cfg.band.name;
  byId("sbCycNote").textContent = `This run covers the last ${fmt(cfg.orbits, 1)} orbits - ${fmtTime(T_INSPIRAL * Ms())} of real time, played out over about ${fmt(cfg.tEnd / RATE, 0)} seconds.`;
  soundLabel();
  if (replay) resetRun();
  refreshPanels();
}

function applyScene(key) {
  const sc = SCENES[key];
  state.key = key;
  state.mTot = sc.m;
  state.ratio = sc.ratio;
  state.dist = sc.dist;
  byId("totalMass").value = sliderFromMass(sc.m);
  byId("ratio").value = sc.ratio;
  byId("distance").value = sliderFromDist(sc.dist);
  document.querySelectorAll(".gwtab").forEach((b) => b.classList.toggle("on", b.dataset.gw === key));
  byId("gwTitle").textContent = sc.title;
  byId("gwNote").textContent = sc.note;
  syncOutputs();
  applyConfig(true);
}

function syncOutputs() {
  byId("totalMassOut").textContent = fmtMass(state.mTot);
  byId("ratioOut").textContent = `${fmt(state.ratio)} : 1`;
  byId("distanceOut").textContent = `${num(state.dist)} Mpc · ${num(state.dist * MPC_MLY / 1000)} Gly`;
}

byId("totalMass").addEventListener("input", (event) => {
  state.mTot = massFromSlider(Number(event.target.value));
  syncOutputs();
  applyConfig(false);
});

byId("ratio").addEventListener("input", (event) => {
  state.ratio = Number(event.target.value);
  syncOutputs();
  applyConfig(true);
});

byId("distance").addEventListener("input", (event) => {
  state.dist = distFromSlider(Number(event.target.value));
  syncOutputs();
  applyConfig(false);
});

document.querySelectorAll(".gwtab").forEach((button) => {
  button.addEventListener("click", () => applyScene(button.dataset.gw));
});

byId("gwPlayBtn").addEventListener("click", () => {
  paused = !paused;
  byId("gwPlayBtn").textContent = paused ? "▶ Play" : "⏸ Pause";
});

byId("gwSlowBtn").addEventListener("click", () => {
  slow = !slow;
  byId("gwSlowBtn").classList.toggle("primary", slow);
  byId("gwSlowBtn").textContent = slow ? "1× speed" : "¼ speed";
});

byId("gwReplayBtn").addEventListener("click", () => {
  resetRun();
  refreshPanels();
});

byId("gwSoundBtn").addEventListener("click", () => {
  soundOn = !soundOn;
  if (soundOn) {
    ensureAudio();
    if (actx && actx.state === "suspended") actx.resume();
  }
  byId("gwSoundBtn").classList.toggle("primary", soundOn);
  soundLabel();
  updateAudio();
});

const views = {
  gwFaceBtn: { yaw: .7, pitch: 1.45, radius: 300, ty: 0 },
  gwEdgeBtn: { yaw: .7, pitch: .09, radius: 272, ty: -5 },
  gwCloseBtn: { yaw: .8, pitch: .5, radius: 30, ty: -4 }
};
Object.entries(views).forEach(([id, view]) => {
  byId(id).addEventListener("click", () => {
    yaw = view.yaw;
    pitch = view.pitch;
    radius = view.radius;
    camTarget.set(0, view.ty, 0);
    Object.keys(views).forEach((other) => byId(other).classList.toggle("on", other === id));
  });
});

byId("gwAmpBtn").addEventListener("click", () => {
  amplifyR = !amplifyR;
  byId("gwAmpBtn").classList.toggle("on", amplifyR);
  byId("gwAmpBtn").textContent = amplifyR ? "r·h" : "true 1/r";
});

byId("gwRingBtn").addEventListener("click", () => {
  showRing = !showRing;
  byId("gwRingBtn").classList.toggle("on", showRing);
});

byId("gwSpinBtn").addEventListener("click", () => {
  autoOrbit = !autoOrbit;
  byId("gwSpinBtn").classList.toggle("on", autoOrbit);
});

byId("gwFsBtn").addEventListener("click", () => {
  if (document.fullscreenElement) document.exitFullscreen();
  else byId("gwCanvas").closest(".gw-bench").requestFullscreen();
});

const gwBench = document.querySelector(".gw-bench");
const gwControls = document.querySelector(".gw-controls");
const gwControlsHome = gwControls.parentElement;
const gwControlsNext = gwControls.nextElementSibling;
document.addEventListener("fullscreenchange", () => {
  if (document.fullscreenElement === gwBench) gwBench.appendChild(gwControls);
  else if (gwControls.parentElement === gwBench) gwControlsHome.insertBefore(gwControls, gwControlsNext);
  resize();
});

/* ---------- main loop ---------- */

let raf = 0;
let last = 0;

function frame(now) {
  raf = requestAnimationFrame(frame);
  const dt = Math.min(.05, (now - last) / 1000);
  last = now;
  frameCount += 1;

  if (!paused) {
    if (run.replayAt) {
      if (now >= run.replayAt) resetRun();
    } else {
      stepPhysics(dt * RATE * (slow ? .25 : 1));
      if (run.phase === "ringdown" && run.t - run.tMerge > R_SHEET + 110) run.replayAt = now + 1800;
    }
  }

  if (autoOrbit) yaw += dt * .09;
  scaleLabels();
  updateBodies(paused ? 0 : dt);
  updateSheet();
  updateDetector();
  updateAudio();
  if (frameCount % 3 === 0) refreshPanels();
  updateCamera();
  renderer.render(scene, camera);
}

function setActive(on) {
  if (on === active) return;
  active = on;
  if (!renderer) return;
  if (active) {
    resize();
    last = performance.now();
    raf = requestAnimationFrame(frame);
    if (soundOn && actx && actx.state === "suspended") actx.resume();
  } else {
    cancelAnimationFrame(raf);
    updateAudio();
    if (actx && actx.state === "running") actx.suspend();
  }
}

window.addEventListener("lesson:slide", (event) => setActive(event.detail.simulator === "merger"));

initScene();
if (!renderer) {
  gwCanvas.hidden = true;
  byId("gwNo3d").hidden = false;
} else {
  new ResizeObserver(resize).observe(gwCanvas);
}
applyScene("gw150914");
setActive(document.querySelector(".slide.on")?.dataset.simulator === "merger");
