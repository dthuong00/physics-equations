import * as THREE from "three";

const byId = (id) => document.getElementById(id);

const ORANGE = "#d95d39";
const BLUE = "#315a9f";
const GREEN = "#21805a";
const VIOLET = "#5552b9";
const INK = "#1b1d20";
const MUTED = "#65676d";
const SOFT = "#92949a";
const LINE = "#dedfe3";

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

/* SI constants. Inside the scene Earth's radius is the unit of length, masses are in
   Earth masses and accelerations in g, so every tidal quantity is a pure ratio and the
   SI values only come back for the readouts. */
const G_SI = 6.674e-11;
const M_EARTH = 5.972e24;
const R_EARTH = 6.371e6;
const G0 = G_SI * M_EARTH / R_EARTH ** 2;
const MU_MOON = 7.342e22 / M_EARTH;
const MU_SUN = 1.989e30 / M_EARTH;
const D_MOON_AVG_KM = 384400;
const D_SUN = 1.496e11 / R_EARTH;
const MOON_R = .2727;

const SIDEREAL_DAY = 23.9345;                 // hours
const MOON_RATE = 360 / (27.3217 * 24);       // degrees per hour, sidereal
const SUN_RATE = 360 / (365.256 * 24);
const EARTH_RATE = 360 / SIDEREAL_DAY;
const LUNAR_DAY = 24.84;

const EXAG = 2e6;
const LIM = .5;
const RATE = 6;                               // simulated hours per wall-clock second
const HIST_DT = .1;
const WINDOW = 72;
const HIST_N = Math.ceil(WINDOW / HIST_DT) + 40;

const MOON_SHOW = 3.3;
const SUN_SHOW = 6;
const HOME = { yawOff: .35, pitch: .3, radius: 9.5 };

const SCENARIOS = {
  average: {
    d: 384400, phase: 30, lat: 40, decl: 0, sun: true, moon: true, title: "Average Moon",
    note: "The real Moon at its mean distance, a little past new. Two bulges, locked to the Moon; the grid - the solid Earth - turns under them once a day, so your pin crosses a bulge twice. Check the gauge: highs about 12 h 25 min apart, and the Sun's dashed curve slowly sliding against the Moon's as the phase advances through the month."
  },
  perigee: {
    d: 356500, phase: 0, lat: 45, decl: 0, sun: true, moon: true, title: "Perigee spring tide",
    note: "New Moon at perigee, 356,500 km. The Moon is only 7% closer, but the tide goes as 1∕d³, so it is 24% higher - and the Sun's bulge stacks on top. These are the 'king tides' that flood coastal streets a few times a year: the Sun–Moon line-up and the closest approach both have to land in the same week."
  },
  neap: {
    d: 384400, phase: 90, lat: 40, decl: 0, sun: true, moon: true, title: "Neap tide",
    note: "First-quarter Moon: Sun and Moon at right angles. The Sun's high now sits on the Moon's low and the two tides partly cancel, leaving about 0.54 − 0.25 of the ideal range. Watch the gauge: the black combined curve is lower than the blue Moon-only curve at every high."
  },
  tilted: {
    d: 384400, phase: 0, lat: 50, decl: 28, sun: true, moon: true, title: "Tilted Moon",
    note: "The Moon at its maximum 28° north of the equator, seen from 50° N. One bulge now passes nearly overhead while the other passes far to your south, so the two daily highs are unequal - the diurnal inequality. Push your latitude higher and one of them almost vanishes, leaving a single tide a day, as parts of the Gulf of Mexico get."
  },
  close: {
    d: 192200, phase: 0, lat: 40, decl: 0, sun: true, moon: true, title: "Moon at half distance",
    note: "A what-if. The Moon's pull on Earth quadruples, but the tide - the difference in pull across Earth - grows eightfold, and the arrows show it. The young Moon really was about this close four billion years ago; tides then ran tens of metres and the day was only six hours long."
  },
  sunOnly: {
    d: 384400, phase: 0, lat: 40, decl: 0, sun: true, moon: false, title: "No Moon",
    note: "Switch the Moon off and the sea still breathes: the Sun alone raises a 25 cm equilibrium tide, two highs a day exactly 12 h apart because the Sun barely moves against the stars in a day. This is the only tide a moonless world gets."
  }
};

const state = { key: "average", dKm: 384400, phase: 30, lat: 40, decl: 0, sunOn: true, moonOn: true };

let t = 0;
let am0 = 0;
let as0 = 0;
let lon0 = 0;
let active = false;
let paused = false;
let slow = false;
let showArrows = true;
let trueScale = false;
let frameCount = 0;

/* ---------- formatting ---------- */

const SUP = { "-": "⁻", 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };

function sci(v, d = 2) {
  if (!Number.isFinite(v) || v === 0) return "0";
  const e = Math.floor(Math.log10(Math.abs(v)));
  const m = v / 10 ** e;
  return `${m.toFixed(d)}×10${String(e).split("").map((c) => SUP[c]).join("")}`;
}

const fmtKm = (km) => `${Math.round(km).toLocaleString("en-US")} km`;
const fmtM = (m) => `${m.toFixed(2)} m`;

function fmtHM(hours) {
  const total = Math.round(hours * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h ? `${h} h ${String(m).padStart(2, "0")} min` : `${m} min`;
}

function fmtClock(hours) {
  const day = Math.floor(hours / 24) + 1;
  const h = Math.floor(hours % 24);
  const m = Math.floor((hours * 60) % 60);
  return `day ${day} · ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function phaseName(deg) {
  const p = ((deg % 360) + 360) % 360;
  if (p < 22.5 || p >= 337.5) return "new Moon";
  if (p < 67.5) return "waxing crescent";
  if (p < 112.5) return "first quarter";
  if (p < 157.5) return "waxing gibbous";
  if (p < 202.5) return "full Moon";
  if (p < 247.5) return "waning gibbous";
  if (p < 292.5) return "last quarter";
  return "waning crescent";
}

/* ---------- physics ---------- */

const moon = { mu: MU_MOON, d: 60, dx: 1, dy: 0, dz: 0, on: true };
const sun = { mu: MU_SUN, d: D_SUN, dx: 1, dy: 0, dz: 0, on: true };
const bodies = [moon, sun];

const alphaMoon = (time) => am0 + MOON_RATE * time;
const alphaSun = (time) => as0 + SUN_RATE * time;
const earthAngle = (time) => EARTH_RATE * time;

function setDir(body, aDeg, dDeg) {
  const a = aDeg * DEG;
  const dl = dDeg * DEG;
  body.dx = Math.cos(dl) * Math.cos(a);
  body.dy = Math.sin(dl);
  body.dz = -Math.cos(dl) * Math.sin(a);
}

function placeBodies(time) {
  moon.d = state.dKm * 1e3 / R_EARTH;
  moon.on = state.moonOn;
  sun.on = state.sunOn;
  setDir(moon, alphaMoon(time), state.decl);
  setDir(sun, alphaSun(time), 0);
}

/* Exact differential pull and tidal potential of one body at a surface point p (unit
   vector). Acceleration comes back in g, height as the equilibrium tide in Earth radii:
   the surface on which the body's tidal potential and Earth's gravity balance. */
const out = { h: 0, ax: 0, ay: 0, az: 0 };

function tideAt(px, py, pz) {
  out.h = 0;
  out.ax = 0;
  out.ay = 0;
  out.az = 0;
  for (const b of bodies) {
    if (!b.on) continue;
    const qx = b.d * b.dx - px;
    const qy = b.d * b.dy - py;
    const qz = b.d * b.dz - pz;
    const q2 = qx * qx + qy * qy + qz * qz;
    const ql = Math.sqrt(q2);
    const q3 = q2 * ql;
    const inv2 = 1 / (b.d * b.d);
    out.ax += b.mu * (qx / q3 - b.dx * inv2);
    out.ay += b.mu * (qy / q3 - b.dy * inv2);
    out.az += b.mu * (qz / q3 - b.dz * inv2);
    out.h += b.mu * (1 / ql - 1 / b.d - (px * b.dx + py * b.dy + pz * b.dz) * inv2);
  }
  return out;
}

function heightOf(body, px, py, pz) {
  const qx = body.d * body.dx - px;
  const qy = body.d * body.dy - py;
  const qz = body.d * body.dz - pz;
  const ql = Math.sqrt(qx * qx + qy * qy + qz * qz);
  return body.mu * (1 / ql - 1 / body.d - (px * body.dx + py * body.dy + pz * body.dz) / (body.d * body.d));
}

const ampOf = (body) => body.mu / body.d ** 3;
const ampRef = () => (moon.on ? ampOf(moon) : 0) + (sun.on ? ampOf(sun) : 0);
const A_MOON_AVG = MU_MOON / (D_MOON_AVG_KM * 1e3 / R_EARTH) ** 3;

const obs = { x: 1, y: 0, z: 0 };

function observerAt(time) {
  const lon = (lon0 + earthAngle(time)) * DEG;
  const lat = state.lat * DEG;
  obs.x = Math.cos(lat) * Math.cos(lon);
  obs.y = Math.sin(lat);
  obs.z = -Math.cos(lat) * Math.sin(lon);
  return obs;
}

const softClamp = (v) => LIM * Math.tanh(v / LIM);

/* ---------- tide-gauge history ---------- */

const histT = new Float64Array(HIST_N);
const histAll = new Float32Array(HIST_N);
const histMoon = new Float32Array(HIST_N);
const histSun = new Float32Array(HIST_N);
let histHead = 0;
let histFill = 0;
let nextSample = 0;
const highs = [];

const histIndex = (k) => ((histHead - histFill + k) % HIST_N + HIST_N) % HIST_N;

function sample(ts) {
  placeBodies(ts);
  const p = observerAt(ts);
  const hm = state.moonOn ? heightOf(moon, p.x, p.y, p.z) * R_EARTH : 0;
  const hs = state.sunOn ? heightOf(sun, p.x, p.y, p.z) * R_EARTH : 0;
  histT[histHead] = ts;
  histMoon[histHead] = hm;
  histSun[histHead] = hs;
  histAll[histHead] = hm + hs;
  histHead = (histHead + 1) % HIST_N;
  histFill = Math.min(HIST_N, histFill + 1);
  if (histFill >= 3) {
    const i2 = histIndex(histFill - 1), i1 = histIndex(histFill - 2), i0 = histIndex(histFill - 3);
    if (histAll[i1] > histAll[i0] && histAll[i1] >= histAll[i2]) {
      highs.push({ t: histT[i1], h: histAll[i1] });
      if (highs.length > 12) highs.shift();
    }
  }
}

function advance(dt) {
  t += dt;
  while (nextSample <= t) {
    sample(nextSample);
    nextSample += HIST_DT;
  }
}

function resetRun() {
  t = 0;
  as0 = 0;
  am0 = state.phase;
  lon0 = am0;
  histHead = 0;
  histFill = 0;
  highs.length = 0;
  nextSample = -WINDOW;
  advance(0);
  nextHigh = null;
}

function setPhase(phase) {
  state.phase = phase;
  am0 = alphaSun(t) + phase - MOON_RATE * t;
}

const currentPhase = () => ((alphaMoon(t) - alphaSun(t)) % 360 + 360) % 360;

let nextHigh = null;

function predictNextHigh() {
  const step = 1 / 12;
  const h = (ts) => {
    placeBodies(ts);
    const p = observerAt(ts);
    return tideAt(p.x, p.y, p.z).h;
  };
  let prev = h(t);
  let cur = h(t + step);
  for (let k = 2; k < 26 * 12; k += 1) {
    const next = h(t + k * step);
    if (cur > prev && cur >= next) {
      nextHigh = t + (k - 1) * step;
      placeBodies(t);
      return;
    }
    prev = cur;
    cur = next;
  }
  nextHigh = null;
  placeBodies(t);
}

function rangeLastDay() {
  let lo = Infinity, hi = -Infinity;
  for (let k = histFill - 1; k >= 0; k -= 1) {
    const i = histIndex(k);
    if (histT[i] < t - LUNAR_DAY) break;
    lo = Math.min(lo, histAll[i]);
    hi = Math.max(hi, histAll[i]);
  }
  return hi > lo ? hi - lo : 0;
}

/* ---------- scene ---------- */

const tideCanvas = byId("tideCanvas");
const gaugeCanvas = byId("gaugeCanvas");

const SPACE = 0x070b16;
const C_LOW = new THREE.Color("#1d3f8f");
const C_MID = new THREE.Color("#6b8fc9");
const C_HIGH = new THREE.Color("#f4b264");
const ARROW_OUT = "#ff8f5e";
const ARROW_IN = "#5fa8ff";

let renderer = null;
let scene = null;
let camera = null;
let yaw = HOME.yawOff, pitch = HOME.pitch, radius = HOME.radius;
let yawT = yaw, pitchT = pitch, radiusT = radius;
const camTarget = new THREE.Vector3(0, 0, 0);
const camTargetT = new THREE.Vector3(0, 0, 0);

let ocean = null, oceanBase = null, oceanPos = null, oceanH = null, oceanMat = null;
let moonMesh = null, moonLine = null, moonOrbit = null, sunCore = null, sunHalo = null, sunLine = null, sunLight = null;
let pin = null, pinHalo = null, pinPole = null;
let labelMoon = null, labelSun = null, labelYou = null;
const arrows = [];
const labels = [];

const tmpVec = new THREE.Vector3();
const tmpQuat = new THREE.Quaternion();
const Y_AXIS = new THREE.Vector3(0, 1, 0);

function makeGlowTexture(inner = .3) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d");
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(inner, "rgba(255,255,255,.55)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

function makeMoonTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#a9a9b3";
  ctx.fillRect(0, 0, 512, 256);
  let seed = 7;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < 900; i += 1) {
    const r = 2 + rnd() ** 2.5 * 22;
    const x = rnd() * 512, y = rnd() * 256;
    const shade = 120 + rnd() * 70;
    ctx.fillStyle = `rgba(${shade},${shade},${shade + 8},${.25 + rnd() * .45})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = `rgba(215,215,225,${.15 + rnd() * .25})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  for (let i = 0; i < 6; i += 1) {
    ctx.fillStyle = "rgba(70,72,86,.35)";
    ctx.beginPath();
    ctx.ellipse(rnd() * 512, rnd() * 256, 40 + rnd() * 70, 25 + rnd() * 40, rnd() * 3, 0, TAU);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeLabel(height) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, depthTest: false }));
  sprite.scale.set(height * 4, height, 1);
  labels.push({ sprite, height });
  return {
    sprite,
    set(text, color, size = 40) {
      ctx.clearRect(0, 0, 512, 128);
      ctx.font = `800 ${size}px Inter, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0,0,0,.85)";
      ctx.shadowBlur = 10;
      ctx.fillStyle = color;
      ctx.fillText(text.toUpperCase().split("").join(" "), 256, 66);
      texture.needsUpdate = true;
    }
  };
}

function buildStars() {
  const make = (count, size, alpha) => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      const u = Math.random() * 2 - 1, a = Math.random() * TAU, r = Math.sqrt(1 - u * u);
      pos[i * 3] = 380 * r * Math.cos(a);
      pos[i * 3 + 1] = 380 * u;
      pos[i * 3 + 2] = 380 * r * Math.sin(a);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    scene.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xc7d0e8, size, sizeAttenuation: false, transparent: true, opacity: alpha, depthWrite: false })));
  };
  make(1400, 1.3, .55);
  make(260, 2.4, .85);
}

const OCEAN_VERT = `
attribute vec3 aBase;
attribute float aH;
varying vec3 vN;
varying vec3 vBase;
varying vec3 vWorld;
varying float vH;
void main() {
  vN = normalize(mat3(modelMatrix) * normal);
  vBase = aBase;
  vH = aH;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const OCEAN_FRAG = `
precision highp float;
uniform vec3 uSun;
uniform vec3 uLow;
uniform vec3 uMid;
uniform vec3 uHigh;
uniform float uRot;
uniform float uGrid;
varying vec3 vN;
varying vec3 vBase;
varying vec3 vWorld;
varying float vH;
const float PI = 3.14159265;

float lineAt(float v, float w) {
  float d = 0.5 - abs(fract(v) - 0.5);
  return 1.0 - smoothstep(0.0, 1.5 * w + 1e-4, d);
}

void main() {
  vec3 n = normalize(vN);
  float t = clamp(vH, -1.0, 1.0);
  vec3 col = t >= 0.0 ? mix(uMid, uHigh, t) : mix(uMid, uLow, min(1.0, -t * 2.0));

  float lat = asin(clamp(vBase.y, -1.0, 1.0));
  float lon = atan(vBase.z, vBase.x) + uRot;
  float cl = max(cos(lat), 0.05);
  float wLon = (fwidth(vBase.x) + fwidth(vBase.z)) / cl / (PI / 6.0);
  float wLat = fwidth(lat) / (PI / 6.0);
  float mer = lineAt(lon / (PI / 6.0), wLon) * smoothstep(0.0, 0.3, cos(lat));
  float par = lineAt(lat / (PI / 6.0), wLat);
  float eq = 1.0 - smoothstep(0.0, 2.2 * fwidth(lat), abs(lat));
  float g = (max(mer, par) * 0.30 + eq * 0.28) * uGrid;
  col = mix(col, vec3(0.88, 0.92, 1.0), g);

  vec3 v = normalize(cameraPosition - vWorld);
  float ndl = dot(n, uSun);
  float shade = 0.40 + 0.72 * clamp(ndl, 0.0, 1.0);
  vec3 h = normalize(uSun + v);
  float spec = pow(max(dot(n, h), 0.0), 80.0) * 0.5 * smoothstep(-0.05, 0.25, ndl);
  float rim = pow(1.0 - max(dot(n, v), 0.0), 3.2);
  vec3 outc = col * shade + spec * vec3(1.0, 0.95, 0.85) + rim * vec3(0.38, 0.6, 1.0) * 0.8;
  gl_FragColor = vec4(outc, 1.0);
}`;

function buildOcean() {
  const geo = new THREE.SphereGeometry(1, 160, 100);
  oceanPos = geo.attributes.position;
  oceanBase = Float64Array.from(oceanPos.array);
  geo.setAttribute("aBase", new THREE.BufferAttribute(Float32Array.from(oceanPos.array), 3));
  oceanH = new THREE.BufferAttribute(new Float32Array(oceanPos.count), 1);
  geo.setAttribute("aH", oceanH);
  oceanMat = new THREE.ShaderMaterial({
    uniforms: {
      uSun: { value: new THREE.Vector3(1, 0, 0) },
      uLow: { value: C_LOW },
      uMid: { value: C_MID },
      uHigh: { value: C_HIGH },
      uRot: { value: 0 },
      uGrid: { value: 1 }
    },
    vertexShader: OCEAN_VERT,
    fragmentShader: OCEAN_FRAG
  });
  ocean = new THREE.Mesh(geo, oceanMat);
  scene.add(ocean);
}

function lineGeo(n = 2) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  return geo;
}

function makeArrow() {
  const group = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(.011, .011, 1, 8), new THREE.MeshBasicMaterial({ color: ARROW_OUT }));
  shaft.geometry.translate(0, .5, 0);
  const head = new THREE.Mesh(new THREE.ConeGeometry(.042, .13, 12), shaft.material);
  head.geometry.translate(0, .065, 0);
  group.add(shaft, head);
  group.userData = { shaft, head };
  return group;
}

function buildBodies() {
  moonMesh = new THREE.Mesh(
    new THREE.SphereGeometry(MOON_R, 48, 32),
    new THREE.MeshStandardMaterial({ map: makeMoonTexture(), roughness: .95, metalness: 0 })
  );
  scene.add(moonMesh);

  moonLine = new THREE.Line(lineGeo(), new THREE.LineDashedMaterial({ color: 0x9aa6c4, dashSize: .2, gapSize: .14, transparent: true, opacity: .55 }));
  sunLine = new THREE.Line(lineGeo(), new THREE.LineDashedMaterial({ color: 0xf4b264, dashSize: .2, gapSize: .14, transparent: true, opacity: .45 }));
  moonOrbit = new THREE.LineLoop(lineGeo(160), new THREE.LineBasicMaterial({ color: 0x9aa6c4, transparent: true, opacity: .22 }));
  scene.add(moonLine, sunLine, moonOrbit);

  const glow = makeGlowTexture();
  sunHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: 0xffb35c, transparent: true, opacity: .75, depthWrite: false, blending: THREE.AdditiveBlending }));
  sunCore = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeGlowTexture(.55), color: 0xfff1cf, transparent: true, depthWrite: false }));
  scene.add(sunHalo, sunCore);

  pin = new THREE.Mesh(new THREE.SphereGeometry(.035, 20, 12), new THREE.MeshBasicMaterial({ color: 0x7fe6a8 }));
  pinHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: 0x4fd88a, transparent: true, opacity: .8, depthWrite: false, blending: THREE.AdditiveBlending }));
  pinHalo.scale.set(.3, .3, 1);
  pinPole = new THREE.Line(lineGeo(), new THREE.LineBasicMaterial({ color: 0x7fe6a8, transparent: true, opacity: .9 }));
  scene.add(pin, pinHalo, pinPole);

  for (let i = 0; i < 40; i += 1) {
    const arrow = makeArrow();
    scene.add(arrow);
    arrows.push(arrow);
  }
  arrows.matOut = arrows[0].userData.shaft.material;
  arrows.matIn = new THREE.MeshBasicMaterial({ color: ARROW_IN });

  labelMoon = makeLabel(.24);
  labelSun = makeLabel(.24);
  labelYou = makeLabel(.19);
  labelSun.set("Sun", "#ffd58a");
  labelYou.set("you", "#8ff0b8", 36);
  scene.add(labelMoon.sprite, labelSun.sprite, labelYou.sprite);

  scene.add(new THREE.AmbientLight(0x8090b8, .35));
  sunLight = new THREE.DirectionalLight(0xfff2dc, 2.6);
  scene.add(sunLight);
}

function setLine(line, ax, ay, az, bx, by, bz) {
  const arr = line.geometry.attributes.position.array;
  arr[0] = ax; arr[1] = ay; arr[2] = az;
  arr[3] = bx; arr[4] = by; arr[5] = bz;
  line.geometry.attributes.position.needsUpdate = true;
  if (line.material.isLineDashedMaterial) line.computeLineDistances();
}

function updateOcean() {
  const ref = ampRef();
  const pos = oceanPos.array;
  const hs = oceanH.array;
  for (let i = 0, k = 0; i < pos.length; i += 3, k += 1) {
    const px = oceanBase[i], py = oceanBase[i + 1], pz = oceanBase[i + 2];
    const h = tideAt(px, py, pz).h;
    const r = 1 + softClamp(EXAG * h);
    pos[i] = px * r;
    pos[i + 1] = py * r;
    pos[i + 2] = pz * r;
    hs[k] = ref > 0 ? h / ref : 0;
  }
  oceanPos.needsUpdate = true;
  oceanH.needsUpdate = true;
  ocean.geometry.computeVertexNormals();
  oceanMat.uniforms.uRot.value = earthAngle(t) * DEG;
  oceanMat.uniforms.uSun.value.set(sun.dx, sun.dy, sun.dz);
}

function updateBodies() {
  const dm = trueScale ? moon.d : MOON_SHOW;
  const ds = trueScale ? Math.max(dm * 1.6, 80) : SUN_SHOW;

  moonMesh.visible = state.moonOn;
  moonLine.visible = state.moonOn;
  moonOrbit.visible = state.moonOn;
  labelMoon.sprite.visible = state.moonOn;
  moonMesh.position.set(moon.dx * dm, moon.dy * dm, moon.dz * dm);
  moonMesh.rotation.y = alphaMoon(t) * DEG;
  setLine(moonLine, moon.dx * 1.03, moon.dy * 1.03, moon.dz * 1.03, moon.dx * (dm - MOON_R), moon.dy * (dm - MOON_R), moon.dz * (dm - MOON_R));
  labelMoon.sprite.position.set(moon.dx * dm, moon.dy * dm + MOON_R + .3, moon.dz * dm);

  const orb = moonOrbit.geometry.attributes.position.array;
  const rc = dm * Math.cos(state.decl * DEG), yc = dm * Math.sin(state.decl * DEG);
  for (let k = 0; k < 160; k += 1) {
    const a = k / 160 * TAU;
    orb[k * 3] = rc * Math.cos(a);
    orb[k * 3 + 1] = yc;
    orb[k * 3 + 2] = rc * Math.sin(a);
  }
  moonOrbit.geometry.attributes.position.needsUpdate = true;

  sunHalo.visible = state.sunOn;
  sunCore.visible = state.sunOn;
  sunLine.visible = state.sunOn;
  labelSun.sprite.visible = state.sunOn;
  sunHalo.position.set(sun.dx * ds, sun.dy * ds, sun.dz * ds);
  sunCore.position.copy(sunHalo.position);
  setLine(sunLine, sun.dx * 1.03, sun.dy * 1.03, sun.dz * 1.03, sun.dx * ds, sun.dy * ds, sun.dz * ds);
  labelSun.sprite.position.set(sun.dx * ds, sun.dy * ds + 1.1, sun.dz * ds);
  sunLight.position.set(sun.dx * 10, sun.dy * 10, sun.dz * 10);

  if (trueScale) camTargetT.set(moon.dx, moon.dy, moon.dz).multiplyScalar(state.moonOn ? moon.d / 2 : 0);
  else camTargetT.set(moon.dx, 0, moon.dz).multiplyScalar(state.moonOn ? 1 : 0);

  const p = observerAt(t);
  const r = 1 + softClamp(EXAG * tideAt(p.x, p.y, p.z).h);
  pin.position.set(p.x * (r + .07), p.y * (r + .07), p.z * (r + .07));
  pinHalo.position.copy(pin.position);
  setLine(pinPole, p.x * r, p.y * r, p.z * r, p.x * (r + .07), p.y * (r + .07), p.z * (r + .07));
  labelYou.sprite.position.set(p.x * (r + .07), p.y * (r + .07) + .16, p.z * (r + .07));
}

function updateArrows() {
  const aRef = 2 * A_MOON_AVG;
  const ax0 = Math.cos(alphaMoon(t) * DEG), az0 = -Math.sin(alphaMoon(t) * DEG);
  let n = 0;
  const place = (px, py, pz) => {
    const arrow = arrows[n];
    n += 1;
    if (!showArrows) {
      arrow.visible = false;
      return;
    }
    const f = tideAt(px, py, pz);
    const mag = Math.hypot(f.ax, f.ay, f.az);
    const len = Math.min(1.5, .55 * mag / aRef);
    if (len < .03) {
      arrow.visible = false;
      return;
    }
    arrow.visible = true;
    const r = 1 + softClamp(EXAG * f.h) + .015;
    tmpVec.set(f.ax, f.ay, f.az).divideScalar(mag);
    const outward = f.ax * px + f.ay * py + f.az * pz >= 0;
    if (outward) arrow.position.set(px * r, py * r, pz * r);
    else arrow.position.set(px * r - tmpVec.x * len, py * r - tmpVec.y * len, pz * r - tmpVec.z * len);
    arrow.quaternion.setFromUnitVectors(Y_AXIS, tmpVec);
    const head = Math.min(.13, len * .4);
    const { shaft, head: headMesh } = arrow.userData;
    shaft.scale.y = Math.max(.001, len - head);
    headMesh.scale.set(head / .13, head / .13, head / .13);
    headMesh.position.y = len - head;
    const mat = outward ? arrows.matOut : arrows.matIn;
    shaft.material = mat;
    headMesh.material = mat;
  };
  for (let k = 0; k < 18; k += 1) {
    const a = k / 18 * TAU;
    place(Math.cos(a), 0, Math.sin(a));
  }
  for (let k = 1; k < 12; k += 1) {
    if (k === 6) continue;
    const b = k / 12 * TAU;
    place(Math.cos(b) * ax0, Math.sin(b), Math.cos(b) * az0);
  }
  while (n < arrows.length) arrows[n++].visible = false;
}

function initScene() {
  try {
    renderer = new THREE.WebGLRenderer({ canvas: tideCanvas, antialias: true });
  } catch (error) {
    renderer = null;
    return;
  }
  renderer.setClearColor(SPACE);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(40, 16 / 9, .05, 1000);

  buildStars();
  buildOcean();
  buildBodies();

  tideCanvas.addEventListener("contextmenu", (event) => event.preventDefault());
  tideCanvas.addEventListener("pointerdown", (event) => {
    tideCanvas.setPointerCapture(event.pointerId);
    tideCanvas.dataset.x = event.clientX;
    tideCanvas.dataset.y = event.clientY;
    tideCanvas.dataset.drag = "1";
  });
  tideCanvas.addEventListener("pointermove", (event) => {
    if (tideCanvas.dataset.drag !== "1") return;
    const dx = event.clientX - Number(tideCanvas.dataset.x);
    const dy = event.clientY - Number(tideCanvas.dataset.y);
    yawT -= dx * .005;
    pitchT = Math.min(1.52, Math.max(-1.52, pitchT + dy * .005));
    tideCanvas.dataset.x = event.clientX;
    tideCanvas.dataset.y = event.clientY;
    clearViewButtons();
  });
  tideCanvas.addEventListener("pointerup", () => { tideCanvas.dataset.drag = "0"; });
  tideCanvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    radiusT = Math.min(260, Math.max(2.3, radiusT * (1 + event.deltaY * .001)));
  }, { passive: false });
}

function resize() {
  if (!renderer) return;
  const width = tideCanvas.clientWidth;
  const height = tideCanvas.clientHeight;
  if (!width || !height) return;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function scaleLabels() {
  const k = Math.max(.35, radius / HOME.radius);
  for (const { sprite, height } of labels) sprite.scale.set(height * 4 * k, height * k, 1);
  const s = Math.max(1, radius / HOME.radius * .7);
  sunHalo.scale.set(3.2 * s, 3.2 * s, 1);
  sunCore.scale.set(.9 * s, .9 * s, 1);
  pinHalo.scale.set(.3 * k, .3 * k, 1);
}

function setView(y, p, r) {
  yawT = y;
  pitchT = p;
  if (r !== undefined) radiusT = r;
}

function updateCamera(dt) {
  const k = 1 - Math.exp(-dt * 7);
  yaw += (yawT - yaw) * k;
  pitch += (pitchT - pitch) * k;
  radius += (radiusT - radius) * k;
  camTarget.lerp(camTargetT, k);
  camera.position.set(
    camTarget.x + radius * Math.cos(pitch) * Math.sin(yaw),
    camTarget.y + radius * Math.sin(pitch),
    camTarget.z + radius * Math.cos(pitch) * Math.cos(yaw)
  );
  camera.lookAt(camTarget);
}

/* ---------- tide gauge ---------- */

let hoverX = -1;

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

function niceStep(span) {
  const raw = span / 4;
  const p = 10 ** Math.floor(Math.log10(raw));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= raw) return m * p;
  return 10 * p;
}

function drawGauge() {
  const { ctx, w, h } = fit(gaugeCanvas);
  if (!ctx) return;
  ctx.clearRect(0, 0, w, h);
  const L = 36, R = 10, T = 10, B = 20;
  const pw = w - L - R, ph = h - T - B;
  if (pw < 20 || ph < 20 || histFill < 2) return;

  const aTot = ((moon.on ? ampOf(moon) : 0) + (sun.on ? ampOf(sun) : 0)) * R_EARTH;
  const amp = Math.max(.02, aTot);
  const yMax = amp * 1.15;
  const yMin = -amp * .62 * 1.15;
  const t0 = t - WINDOW;
  const X = (time) => L + (time - t0) / WINDOW * pw;
  const Y = (m) => T + (yMax - m) / (yMax - yMin) * ph;

  ctx.font = "600 9px Inter, sans-serif";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 1;
  const step = niceStep(yMax - yMin);
  for (let v = Math.ceil(yMin / step) * step; v <= yMax; v += step) {
    const y = Y(v);
    ctx.strokeStyle = Math.abs(v) < 1e-9 ? "#c9c9cf" : LINE;
    ctx.beginPath();
    ctx.moveTo(L, y);
    ctx.lineTo(w - R, y);
    ctx.stroke();
    ctx.fillStyle = SOFT;
    ctx.textAlign = "right";
    ctx.fillText(`${v.toFixed(step < .1 ? 2 : 1)} m`, L - 4, y);
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (let back = 72; back >= 0; back -= 24) {
    const x = X(t - back);
    ctx.strokeStyle = LINE;
    ctx.beginPath();
    ctx.moveTo(x, T);
    ctx.lineTo(x, T + ph);
    ctx.stroke();
    ctx.fillStyle = SOFT;
    ctx.textAlign = back === 0 ? "right" : back === 72 ? "left" : "center";
    ctx.fillText(back === 0 ? "now" : `−${back} h`, x, T + ph + 5);
  }

  const trace = (arr, color, dash, width) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.setLineDash(dash);
    ctx.beginPath();
    let started = false;
    for (let k = 0; k < histFill; k += 1) {
      const i = histIndex(k);
      if (histT[i] < t0) continue;
      const x = X(histT[i]), y = Y(arr[i]);
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  };
  ctx.save();
  ctx.beginPath();
  ctx.rect(L, T - 2, pw, ph + 4);
  ctx.clip();
  if (moon.on && sun.on) {
    trace(histMoon, BLUE, [4, 3], 1.3);
    trace(histSun, ORANGE, [4, 3], 1.3);
  }
  ctx.beginPath();
  let filled = false;
  for (let k = 0; k < histFill; k += 1) {
    const i = histIndex(k);
    if (histT[i] < t0) continue;
    const x = X(histT[i]), y = Y(histAll[i]);
    if (!filled) {
      ctx.moveTo(x, Y(0));
      ctx.lineTo(x, y);
      filled = true;
    } else ctx.lineTo(x, y);
  }
  if (filled) {
    ctx.lineTo(X(t), Y(0));
    ctx.closePath();
    ctx.fillStyle = "rgba(27,29,32,.06)";
    ctx.fill();
  }
  trace(histAll, INK, [], 2);

  ctx.fillStyle = VIOLET;
  for (const hi of highs) {
    if (hi.t < t0) continue;
    ctx.beginPath();
    ctx.arc(X(hi.t), Y(hi.h), 3.2, 0, TAU);
    ctx.fill();
  }
  const recent = highs.filter((hi) => hi.t >= t0);
  if (recent.length >= 2) {
    const a = recent[recent.length - 2], b = recent[recent.length - 1];
    const y = Math.min(Y(a.h), Y(b.h)) - 9;
    ctx.strokeStyle = VIOLET;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(X(a.t), y + 4);
    ctx.lineTo(X(a.t), y);
    ctx.lineTo(X(b.t), y);
    ctx.lineTo(X(b.t), y + 4);
    ctx.stroke();
    ctx.fillStyle = VIOLET;
    ctx.font = "750 9px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(fmtHM(b.t - a.t), (X(a.t) + X(b.t)) / 2, y - 2);
  }
  ctx.restore();

  if (hoverX >= L && hoverX <= w - R) {
    const time = t0 + (hoverX - L) / pw * WINDOW;
    let best = -1, bestD = Infinity;
    for (let k = 0; k < histFill; k += 1) {
      const i = histIndex(k);
      const d = Math.abs(histT[i] - time);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    if (best >= 0) {
      const x = X(histT[best]);
      ctx.strokeStyle = "#b8b8c0";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(x, T);
      ctx.lineTo(x, T + ph);
      ctx.stroke();
      ctx.setLineDash([]);
      const dot = (v, color) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, Y(v), 3.5, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      };
      if (moon.on && sun.on) {
        dot(histMoon[best], BLUE);
        dot(histSun[best], ORANGE);
      }
      dot(histAll[best], INK);
      const lines = [`${fmtHM(t - histT[best])} ago`, `Moon + Sun  ${histAll[best].toFixed(2)} m`];
      if (moon.on && sun.on) lines.push(`Moon  ${histMoon[best].toFixed(2)} m`, `Sun  ${histSun[best].toFixed(2)} m`);
      ctx.font = "600 9.5px Inter, sans-serif";
      const bw = Math.max(...lines.map((s) => ctx.measureText(s).width)) + 14;
      const bh = lines.length * 13 + 8;
      const bx = x + 10 + bw > w - R ? x - 10 - bw : x + 10;
      const by = T + 4;
      ctx.fillStyle = "rgba(255,255,255,.96)";
      ctx.strokeStyle = LINE;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 5);
      ctx.fill();
      ctx.stroke();
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      lines.forEach((s, k) => {
        ctx.fillStyle = k === 0 ? MUTED : INK;
        ctx.fillText(s, bx + 7, by + 5 + k * 13);
      });
    }
  }
}

gaugeCanvas.addEventListener("pointermove", (event) => {
  const rect = gaugeCanvas.getBoundingClientRect();
  hoverX = event.clientX - rect.left;
});
gaugeCanvas.addEventListener("pointerleave", () => { hoverX = -1; });

/* ---------- panels ---------- */

function cell(id, text) {
  const el = byId(id);
  if (el.textContent !== text) el.textContent = text;
}

function refreshBoard() {
  const accG = state.moonOn ? 2 * ampOf(moon) : 0;
  const moonH = state.moonOn ? 1.5 * ampOf(moon) * R_EARTH : 0;
  const sunH = state.sunOn ? 1.5 * ampOf(sun) * R_EARTH : 0;
  cell("sbDist", state.moonOn ? fmtKm(state.dKm) : "no Moon");
  cell("sbAcc", state.moonOn ? `${sci(accG * G0)} m/s²` : "-");
  cell("sbAccG", state.moonOn ? sci(accG, 1) : "-");
  cell("sbMoonH", state.moonOn ? fmtM(moonH) : "-");
  cell("sbSunH", state.sunOn ? fmtM(sunH) : "Sun off");
  cell("sbRatio", state.moonOn && state.sunOn ? (sunH / moonH).toFixed(2) : "-");
  const range = rangeLastDay();
  cell("sbRange", range > 0 ? fmtM(range) : "-");
  cell("sbNext", nextHigh === null ? "-" : fmtHM(Math.max(0, nextHigh - t)));
  const gap = highs.length >= 2 ? highs[highs.length - 1].t - highs[highs.length - 2].t : 0;
  cell("sbGap", gap > 0 ? fmtHM(gap) : "-");
  cell("gapNote", gap > 0 ? fmtHM(gap) : "-");
  cell("clockTag", `${fmtClock(t)} · ${phaseName(currentPhase())}`);
}

function updateVerdict() {
  const box = byId("verdict");
  const phase = currentPhase();
  const c = Math.abs(Math.cos(phase * DEG));
  const moonH = 1.5 * ampOf(moon) * R_EARTH;
  const sunH = 1.5 * ampOf(sun) * R_EARTH;
  const range = rangeLastDay();
  const rangeText = range > 0 ? ` The sea under your pin has moved ${fmtM(range)} over the last lunar day.` : "";
  let cls = "", head = "", detail = "";

  if (!state.moonOn) {
    cls = "sun";
    head = "Solar tide only: two highs a day, 12 h apart";
    detail = `Without a Moon the Sun's two bulges still sweep past you, ${fmtM(sunH)} high to low on an ideal globe - and exactly twelve hours apart, because the Sun hardly moves against the stars in a day.${rangeText}`;
  } else if (!state.sunOn) {
    cls = "calm";
    head = "Lunar tide alone";
    detail = `Only the Moon is pulling: ${fmtM(moonH)} high to low, with highs 12 h 25 min apart - Earth needs 50 extra minutes a day to catch up with the moving Moon.${rangeText}`;
  } else if (c > .9) {
    const king = state.dKm < 365000 && state.dKm >= 340000;
    cls = "";
    head = king ? "Perigee spring tide - a king tide" : state.dKm < 340000 ? "Spring tide under a Moon far closer than ours" : "Spring tide: Sun and Moon pull together";
    detail = `${phaseName(phase)}: the two bulges lie along one line and stack, ${fmtM(moonH)} + ${fmtM(sunH)} on an ideal globe.${king ? ` The Moon is ${fmtKm(state.dKm)} away, closer than average, and 1∕d³ makes that count.` : ""}${rangeText}`;
  } else if (c < .42) {
    cls = "calm";
    head = "Neap tide: the Sun fights the Moon";
    detail = `${phaseName(phase)}: the Sun's high sits on the Moon's low, so the tides partly cancel - ${fmtM(moonH)} − ${fmtM(sunH)}. The black curve on the gauge runs below the Moon's own.${rangeText}`;
  } else {
    cls = "calm";
    head = "Between spring and neap";
    detail = `${phaseName(phase)}: the Sun's bulge is ${Math.round(phase % 180)}° off the Moon's, neither helping nor fighting outright. The tide is drifting ${phase % 180 < 90 ? "toward neap" : "toward spring"} as the month advances.${rangeText}`;
  }
  if (state.moonOn && Math.abs(state.decl) >= 10 && Math.abs(state.lat) >= 20) {
    detail += ` The Moon sits ${Math.abs(state.decl)}° ${state.decl > 0 ? "north" : "south"} of the equator, so your two daily highs are unequal.`;
  }
  if (state.moonOn && (state.dKm < 330000 || state.dKm > 430000)) {
    const factor = (D_MOON_AVG_KM / state.dKm) ** 3;
    detail += ` At ${fmtKm(state.dKm)} the Moon's tide is ${factor >= 1 ? factor.toFixed(1) : factor.toFixed(2)}× the average one.`;
  }
  box.className = `verdict ${cls}`.trim();
  cell("verdictHead", head);
  cell("verdictDetail", detail);
}

function refreshPanels() {
  refreshBoard();
  updateVerdict();
}

/* ---------- controls ---------- */

function syncOutputs() {
  cell("distValue", fmtKm(state.dKm));
  cell("phaseValue", `${Math.round(state.phase)}° · ${phaseName(state.phase)}`);
  const lat = Math.abs(state.lat);
  cell("latValue", state.lat === 0 ? "equator" : `${lat}° ${state.lat > 0 ? "N" : "S"}`);
  cell("declValue", state.decl === 0 ? "0° · over the equator" : `${Math.abs(state.decl)}° ${state.decl > 0 ? "N" : "S"}`);
  byId("sunBtn").textContent = state.sunOn ? "☀ Sun on" : "☀ Sun off";
  byId("sunBtn").classList.toggle("on", state.sunOn);
  byId("distSlider").disabled = !state.moonOn;
  byId("declSlider").disabled = !state.moonOn;
  byId("exagTag").textContent = EXAG.toLocaleString("en-US");
  if (labelMoon) labelMoon.set("Moon", "#dfe4f2", 36);
}

function applyScene(key) {
  const s = SCENARIOS[key];
  state.key = key;
  state.dKm = s.d;
  state.lat = s.lat;
  state.decl = s.decl;
  state.sunOn = s.sun;
  state.moonOn = s.moon;
  byId("distSlider").value = s.d;
  byId("phaseSlider").value = s.phase;
  byId("latSlider").value = s.lat;
  byId("declSlider").value = s.decl;
  for (const button of document.querySelectorAll(".scenario")) button.classList.toggle("on", button.dataset.scenario === key);
  byId("modeTitle").textContent = s.title;
  byId("modeNote").textContent = s.note;
  state.phase = s.phase;
  resetRun();
  yaw = yawT = alphaMoon(t) * DEG + HOME.yawOff;
  pitch = pitchT = HOME.pitch;
  if (!trueScale) radius = radiusT = HOME.radius;
  clearViewButtons();
  byId("homeBtn").classList.add("on");
  syncOutputs();
  placeBodies(t);
  predictNextHigh();
  refreshPanels();
}

function rebuildHistory() {
  const keep = t;
  histHead = 0;
  histFill = 0;
  highs.length = 0;
  nextSample = keep - WINDOW;
  t = keep;
  advance(0);
  placeBodies(t);
  predictNextHigh();
  refreshPanels();
}

byId("distSlider").addEventListener("input", (event) => {
  state.dKm = Number(event.target.value);
  syncOutputs();
  rebuildHistory();
});
byId("phaseSlider").addEventListener("input", (event) => {
  setPhase(Number(event.target.value));
  syncOutputs();
  rebuildHistory();
});
byId("latSlider").addEventListener("input", (event) => {
  state.lat = Number(event.target.value);
  syncOutputs();
  rebuildHistory();
});
byId("declSlider").addEventListener("input", (event) => {
  state.decl = Number(event.target.value);
  syncOutputs();
  rebuildHistory();
});

for (const button of document.querySelectorAll(".scenario")) {
  button.addEventListener("click", () => applyScene(button.dataset.scenario));
}

byId("playBtn").addEventListener("click", () => {
  paused = !paused;
  byId("playBtn").textContent = paused ? "▶ Play" : "⏸ Pause";
});
byId("slowBtn").addEventListener("click", () => {
  slow = !slow;
  byId("slowBtn").classList.toggle("on", slow);
});
byId("sunBtn").addEventListener("click", () => {
  state.sunOn = !state.sunOn;
  if (!state.sunOn && !state.moonOn) state.moonOn = true;
  syncOutputs();
  rebuildHistory();
});
byId("resetBtn").addEventListener("click", () => {
  resetRun();
  placeBodies(t);
  predictNextHigh();
  refreshPanels();
});

const VIEWS = {
  homeBtn: () => ({ yaw: alphaMoon(t) * DEG + HOME.yawOff, pitch: HOME.pitch }),
  sideViewBtn: () => ({ yaw: alphaMoon(t) * DEG, pitch: .12 }),
  poleViewBtn: () => ({ yaw: yawT, pitch: 1.5 })
};

function clearViewButtons() {
  for (const id of Object.keys(VIEWS)) byId(id).classList.remove("on");
}

for (const [id, view] of Object.entries(VIEWS)) {
  byId(id).addEventListener("click", () => {
    const v = view();
    setView(v.yaw, v.pitch, trueScale ? undefined : HOME.radius);
    clearViewButtons();
    byId(id).classList.add("on");
  });
}

byId("arrowsBtn").addEventListener("click", () => {
  showArrows = !showArrows;
  byId("arrowsBtn").classList.toggle("on", showArrows);
});

byId("scaleBtn").addEventListener("click", () => {
  trueScale = !trueScale;
  byId("scaleBtn").classList.toggle("on", trueScale);
  radiusT = trueScale ? moon.d * 1.6 : HOME.radius;
});

byId("fsBtn").addEventListener("click", () => {
  if (document.fullscreenElement) document.exitFullscreen();
  else tideCanvas.closest(".tide-bench").requestFullscreen();
});

const bench = document.querySelector(".tide-bench");
const controls = document.querySelector(".tide-controls");
const controlsHome = controls.parentElement;
const controlsNext = controls.nextElementSibling;
document.addEventListener("fullscreenchange", () => {
  if (document.fullscreenElement === bench) bench.appendChild(controls);
  else if (controls.parentElement === bench) controlsHome.insertBefore(controls, controlsNext);
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

  if (!paused) advance(dt * RATE * (slow ? .25 : 1));
  placeBodies(t);

  if (frameCount % 20 === 0) predictNextHigh();
  scaleLabels();
  updateOcean();
  updateBodies();
  updateArrows();
  if (frameCount % 3 === 0) {
    refreshPanels();
    drawGauge();
  }
  updateCamera(dt);
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
  } else {
    cancelAnimationFrame(raf);
  }
}

window.addEventListener("lesson:slide", (event) => setActive(event.detail.simulator === "tides"));

initScene();
if (!renderer) {
  tideCanvas.hidden = true;
  byId("no3d").hidden = false;
} else {
  new ResizeObserver(resize).observe(tideCanvas);
  new ResizeObserver(drawGauge).observe(gaugeCanvas);
}
applyScene("average");
setActive(document.querySelector(".slide.on")?.dataset.simulator === "tides");
