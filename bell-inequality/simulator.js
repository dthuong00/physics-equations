import * as THREE from "three";

const byId = (id) => document.getElementById(id);

const VIOLET = "#5552b9";
const ORANGE = "#d95d39";
const GREEN = "#21805a";
const BLUE = "#315a9f";
const INK = "#1b1d20";
const MUTED = "#65676d";
const SOFT = "#92949a";
const HAIR = "#e6e5e0";
const GREEN_RGB = "33, 128, 90";
const ORANGE_RGB = "217, 93, 57";
const VIOLET_RGB = "85, 82, 185";

const RAD = Math.PI / 180;
const TSIRELSON = 2 * Math.SQRT2;

const ANALYZER_X = 7;
const DETECTOR_DX = 2.5;
const DETECTOR_Y = 1.3;
const SOURCE_GAP = .7;
const T_ANALYZER = .62;
const T_DETECTOR = .34;
/* One animated pair every ~1.5 s regardless of the statistical rate - any faster
   and the flights overlap into visual noise; the silent pairs still count. */
const VISUAL_INTERVAL = 1.5;

const angles = { a: 0, a2: 45, b: 22.5, b2: 67.5 };
const OPTIMAL = { a: 0, a2: 45, b: 22.5, b2: 67.5 };

const MODE_NOTES = {
  quantum: {
    title: "Entangled pairs",
    note: "The quantum view: each pair is one shared state Φ⁺ = (|HH⟩ + |VV⟩)/√2 - neither photon has a polarization of its own until one is measured, which is why they fly as fuzzy glows. Quantum mechanics predicts E = cos 2Δ, and at the Bell angles S settles at 2√2 ≈ 2.83."
  },
  local: {
    title: "Einstein's pairs",
    note: "Einstein's glove picture made concrete: each pair leaves the source with the same pre-written polarization λ (the blue stick), and each analyzer simply reports +1 when λ lies within 45° of its axis. This is the strongest local-realist recipe - its correlations flatten from a cosine into straight lines, and S can reach 2 but never pass it."
  }
};

let mode = "quantum";
let running = true;
let active = false;
let pairRate = 50;
let carry = 0;
let visualClock = 0;
let frameCount = 0;

const combos = [
  { key: "AB", alice: "a", bob: "b", sign: 1 },
  { key: "AB2", alice: "a", bob: "b2", sign: -1 },
  { key: "A2B", alice: "a2", bob: "b", sign: 1 },
  { key: "A2B2", alice: "a2", bob: "b2", sign: 1 }
];
for (const combo of combos) {
  combo.n = 0;
  combo.sum = 0;
  combo.dCell = byId("d" + combo.key);
  combo.nCell = byId("n" + combo.key);
  combo.eCell = byId("e" + combo.key);
}
const comboMap = { a: { b: combos[0], b2: combos[1] }, a2: { b: combos[2], b2: combos[3] } };

const meterCanvas = byId("meterCanvas");
const corrCanvas = byId("correlationCanvas");
const benchCanvas = byId("benchCanvas");
const bench2d = byId("benchCanvas2d");
const verdictBox = byId("verdict");
const verdictHead = byId("verdictHead");
const verdictDetail = byId("verdictDetail");

const fmtAngle = (value) => String(Math.round(value * 10) / 10);
const fmtSigned = (value) => (value < 0 ? "−" : "+") + Math.abs(value).toFixed(3);
const foldDelta = (a, b) => Math.abs(a - b) % 180;

/* ---------- physics ---------- */

function within45(axis, lambda) {
  let d = Math.abs(axis - lambda) % Math.PI;
  if (d > Math.PI / 2) d = Math.PI - d;
  return d < Math.PI / 4;
}

function samplePair() {
  const aliceKey = Math.random() < .5 ? "a" : "a2";
  const bobKey = Math.random() < .5 ? "b" : "b2";
  const alpha = angles[aliceKey] * RAD;
  const beta = angles[bobKey] * RAD;
  let A, B, lambda = null;
  if (mode === "quantum") {
    /* Φ⁺ sampling: Alice's result is a fair coin; her measurement collapses
       Bob's photon onto her axis (A = +1) or its perpendicular, and Bob then
       obeys Malus' law against that collapsed polarization. */
    A = Math.random() < .5 ? 1 : -1;
    const collapsed = A === 1 ? alpha : alpha + Math.PI / 2;
    B = Math.random() < Math.cos(beta - collapsed) ** 2 ? 1 : -1;
  } else {
    lambda = Math.random() * Math.PI;
    A = within45(alpha, lambda) ? 1 : -1;
    B = within45(beta, lambda) ? 1 : -1;
  }
  return { aliceKey, bobKey, A, B, lambda };
}

function record(pair) {
  const combo = comboMap[pair.aliceKey][pair.bobKey];
  combo.n += 1;
  combo.sum += pair.A * pair.B;
}

function results() {
  let S = 0;
  let variance = 0;
  let total = 0;
  let min = Infinity;
  for (const combo of combos) {
    const E = combo.n ? combo.sum / combo.n : 0;
    S += combo.sign * E;
    variance += combo.n > 1 ? Math.max(1e-9, 1 - E * E) / combo.n : 1;
    total += combo.n;
    min = Math.min(min, combo.n);
  }
  return { S, sigma: Math.sqrt(variance), total, min };
}

function resetStats() {
  for (const combo of combos) {
    combo.n = 0;
    combo.sum = 0;
    combo.dCell.textContent = fmtAngle(foldDelta(angles[combo.alice], angles[combo.bob])) + "°";
  }
  refreshPanels();
}

/* ---------- bench state (shared by the 3D and 2D views) ---------- */

function makeStation(name) {
  return { name, key: null, target: 0, angle: 0, label: "", flashPlus: 0, flashMinus: 0, visual: null };
}
const aliceSt = makeStation("ALICE");
const bobSt = makeStation("BOB");

function setSetting(station, key) {
  station.key = key;
  station.target = angles[key] * RAD;
  const pretty = key.endsWith("2") ? key[0] + "′" : key;
  station.label = `${pretty} = ${fmtAngle(angles[key])}°`;
  if (station.visual) station.visual.settingTag.set(station.label, VIOLET, 750, 58);
}

function hitStation(station, outcome) {
  if (outcome > 0) station.flashPlus = 1.3;
  else station.flashMinus = 1.3;
}

function updateStation(station, dt) {
  station.angle += (station.target - station.angle) * Math.min(1, dt * 9);
  station.flashPlus = Math.max(0, station.flashPlus - dt * 2);
  station.flashMinus = Math.max(0, station.flashMinus - dt * 2);
  if (station.visual) {
    station.visual.dial.rotation.x = station.angle;
    station.visual.dets[1].emissiveIntensity = station.flashPlus;
    station.visual.dets[-1].emissiveIntensity = station.flashMinus;
  }
}

let flights = [];
let pulse = 0;

function spawnFlight(pair) {
  setSetting(aliceSt, pair.aliceKey);
  setSetting(bobSt, pair.bobKey);
  const parts = [-1, 1].map((side) => {
    const isAlice = side < 0;
    const outcome = isAlice ? pair.A : pair.B;
    const axis = angles[isAlice ? pair.aliceKey : pair.bobKey] * RAD;
    return {
      side,
      outcome,
      measuredAngle: outcome === 1 ? axis : axis + Math.PI / 2,
      x: side * SOURCE_GAP,
      y: 0,
      visual: renderer ? makePhoton(mode, pair.lambda) : null
    };
  });
  flights.push({ t: 0, measuredMode: mode, lambda: pair.lambda, measured: false, done: false, parts });
  pulse = 1;
}

function updateFlight(flight, dt) {
  flight.t += dt;
  if (!flight.measured && flight.t >= T_ANALYZER) {
    flight.measured = true;
    for (const part of flight.parts) {
      if (part.visual && flight.measuredMode === "quantum") {
        part.visual.stick.visible = true;
        part.visual.stick.rotation.x = part.measuredAngle;
        part.visual.glow.scale.set(1.1, 1.1, 1);
      }
    }
  }
  for (const part of flight.parts) {
    if (flight.t <= T_ANALYZER) {
      const u = flight.t / T_ANALYZER;
      part.x = part.side * (SOURCE_GAP + u * (ANALYZER_X - SOURCE_GAP));
      part.y = 0;
    } else {
      const v = Math.min(1, (flight.t - T_ANALYZER) / T_DETECTOR);
      const eased = v * v * (3 - 2 * v);
      part.x = part.side * (ANALYZER_X + v * DETECTOR_DX);
      part.y = part.outcome * DETECTOR_Y * eased;
    }
    if (part.visual) part.visual.group.position.set(part.x, part.y, 0);
  }
  if (!flight.done && flight.t >= T_ANALYZER + T_DETECTOR) {
    flight.done = true;
    for (const part of flight.parts) {
      hitStation(part.side < 0 ? aliceSt : bobSt, part.outcome);
      if (part.visual) scene.remove(part.visual.group);
    }
  }
}

/* ---------- 3D bench ---------- */

let renderer = null;
let scene, camera, source;
let yaw = -.12, pitch = .38, radius = 23;

const coreGeo = new THREE.SphereGeometry(.15, 20, 14);
const coreMat = new THREE.MeshBasicMaterial({ color: VIOLET });
const stickGeo = new THREE.CylinderGeometry(.03, .03, .9, 10);
const hiddenStickMat = new THREE.MeshBasicMaterial({ color: BLUE });
const measuredStickMat = new THREE.MeshBasicMaterial({ color: VIOLET });

function makeGlowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext("2d");
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(.35, "rgba(255,255,255,.45)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

function makeLabel(height) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  sprite.scale.set(height * 4, height, 1);
  return {
    sprite,
    set(text, color, weight, size) {
      ctx.clearRect(0, 0, 512, 128);
      ctx.fillStyle = color;
      ctx.font = `${weight} ${size}px Inter, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, 256, 68);
      texture.needsUpdate = true;
    }
  };
}

function buildStationVisual(side, station) {
  const root = new THREE.Group();
  root.position.set(side * ANALYZER_X, 0, 0);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.2, .09, 16, 64),
    new THREE.MeshStandardMaterial({ color: 0x2c2e33, roughness: .5, metalness: .15 })
  );
  ring.rotation.y = Math.PI / 2;
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(1.12, 48),
    new THREE.MeshBasicMaterial({ color: 0xe4e3f8, transparent: true, opacity: .5, side: THREE.DoubleSide, depthWrite: false })
  );
  disc.rotation.y = Math.PI / 2;
  const dial = new THREE.Group();
  dial.add(new THREE.Mesh(new THREE.BoxGeometry(.07, 2.15, .1), new THREE.MeshBasicMaterial({ color: VIOLET })));
  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(.06, .09, .75, 10),
    new THREE.MeshStandardMaterial({ color: 0xb9b8b2, roughness: .6 })
  );
  post.position.y = -1.63;
  root.add(ring, disc, dial, post);

  const dets = {};
  for (const s of [1, -1]) {
    const mat = new THREE.MeshStandardMaterial({
      color: 0x35373d,
      roughness: .45,
      emissive: new THREE.Color(s > 0 ? GREEN : ORANGE),
      emissiveIntensity: 0
    });
    const box = new THREE.Mesh(new THREE.BoxGeometry(.8, .72, .72), mat);
    box.position.set(side * DETECTOR_DX, s * DETECTOR_Y, 0);
    const tag = makeLabel(.42);
    tag.set(s > 0 ? "+1" : "−1", s > 0 ? GREEN : ORANGE, 800, 64);
    tag.sprite.position.set(side * DETECTOR_DX, s * (DETECTOR_Y + .82), 0);
    root.add(box, tag.sprite);
    dets[s] = mat;
  }

  const nameTag = makeLabel(.58);
  nameTag.set(station.name, MUTED, 800, 52);
  nameTag.sprite.position.set(0, 2.85, 0);
  const settingTag = makeLabel(.72);
  settingTag.sprite.position.set(0, 2.05, 0);
  root.add(nameTag.sprite, settingTag.sprite);
  scene.add(root);

  station.visual = { dial, dets, settingTag };
  if (station.key) setSetting(station, station.key);
}

function addBeam(x1, x2) {
  const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x1, 0, 0), new THREE.Vector3(x2, 0, 0)]);
  const line = new THREE.Line(geo, new THREE.LineDashedMaterial({ color: VIOLET, transparent: true, opacity: .3, dashSize: .28, gapSize: .22 }));
  line.computeLineDistances();
  scene.add(line);
}

function initScene() {
  try {
    renderer = new THREE.WebGLRenderer({ canvas: benchCanvas, antialias: true });
  } catch (error) {
    renderer = null;
    return;
  }
  renderer.setClearColor(0xffffff);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(42, 16 / 9, .1, 100);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xd8d8e2, 1.1));
  const sun = new THREE.DirectionalLight(0xffffff, 1.5);
  sun.position.set(5, 10, 6);
  scene.add(sun);

  const table = new THREE.Mesh(
    new THREE.BoxGeometry(21.5, .36, 6.5),
    new THREE.MeshStandardMaterial({ color: 0xf1f0ec, roughness: .95 })
  );
  table.position.y = -2.18;
  const grid = new THREE.GridHelper(24, 24, 0xe0dfda, 0xedece7);
  grid.scale.z = .27;
  grid.position.y = -1.99;
  scene.add(table, grid);

  source = new THREE.Mesh(
    new THREE.OctahedronGeometry(.42),
    new THREE.MeshStandardMaterial({ color: VIOLET, emissive: new THREE.Color(VIOLET), emissiveIntensity: .45, roughness: .3 })
  );
  const srcLabel = makeLabel(.5);
  srcLabel.set("pair source", SOFT, 700, 44);
  srcLabel.sprite.position.set(0, -1.15, 0);
  scene.add(source, srcLabel.sprite);

  addBeam(SOURCE_GAP, ANALYZER_X - .2);
  addBeam(-SOURCE_GAP, -(ANALYZER_X - .2));

  buildStationVisual(-1, aliceSt);
  buildStationVisual(1, bobSt);

  const glowTexture = makeGlowTexture();
  scene.userData.glowMat = new THREE.SpriteMaterial({
    map: glowTexture,
    color: 0x8380e8,
    transparent: true,
    opacity: .9,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  benchCanvas.addEventListener("pointerdown", (event) => {
    benchCanvas.setPointerCapture(event.pointerId);
    benchCanvas.dataset.dragging = "1";
    benchCanvas.dataset.x = event.clientX;
    benchCanvas.dataset.y = event.clientY;
  });
  benchCanvas.addEventListener("pointermove", (event) => {
    if (benchCanvas.dataset.dragging !== "1") return;
    yaw -= (event.clientX - Number(benchCanvas.dataset.x)) * .005;
    pitch = Math.min(1.25, Math.max(.08, pitch + (event.clientY - Number(benchCanvas.dataset.y)) * .005));
    benchCanvas.dataset.x = event.clientX;
    benchCanvas.dataset.y = event.clientY;
  });
  benchCanvas.addEventListener("pointerup", () => { benchCanvas.dataset.dragging = "0"; });
  benchCanvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    radius = Math.min(28, Math.max(10, radius * (1 + event.deltaY * .001)));
  }, { passive: false });
}

function resize() {
  if (!renderer) return;
  const width = benchCanvas.clientWidth;
  const height = benchCanvas.clientHeight;
  if (!width || !height) return;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function updateCamera() {
  camera.position.set(
    radius * Math.cos(pitch) * Math.sin(yaw),
    radius * Math.sin(pitch),
    radius * Math.cos(pitch) * Math.cos(yaw)
  );
  camera.lookAt(0, 0, 0);
}

function makePhoton(flightMode, lambda) {
  const group = new THREE.Group();
  const core = new THREE.Mesh(coreGeo, coreMat);
  const glow = new THREE.Sprite(scene.userData.glowMat);
  const stick = new THREE.Mesh(stickGeo, flightMode === "local" ? hiddenStickMat : measuredStickMat);
  if (flightMode === "local") {
    stick.rotation.x = lambda;
    glow.scale.set(1.1, 1.1, 1);
  } else {
    stick.visible = false;
    glow.scale.set(1.9, 1.9, 1);
  }
  group.add(core, glow, stick);
  scene.add(group);
  return { group, glow, stick };
}

/* ---------- 2D bench ---------- */

function drawStation2d(ctx, station, side, X, cy, r, detY) {
  const cx = X(side * ANALYZER_X);

  ctx.strokeStyle = "rgba(146,148,154,.45)";
  ctx.lineWidth = 1.2;
  for (const o of [1, -1]) {
    ctx.beginPath();
    ctx.moveTo(cx + side * r, cy);
    ctx.lineTo(X(side * (ANALYZER_X + DETECTOR_DX)) - side * 20, cy - o * detY);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(228,227,248,.8)";
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  const dx = Math.sin(station.angle) * r * .82;
  const dy = Math.cos(station.angle) * r * .82;
  ctx.strokeStyle = VIOLET;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx - dx, cy + dy);
  ctx.lineTo(cx + dx, cy - dy);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.fillStyle = VIOLET;
  ctx.font = "700 12px Inter, sans-serif";
  ctx.fillText(station.label, cx, cy - r - 12);
  ctx.fillStyle = SOFT;
  ctx.font = "750 10px Inter, sans-serif";
  ctx.fillText(station.name, cx, cy + r + 20);

  for (const o of [1, -1]) {
    const bx = X(side * (ANALYZER_X + DETECTOR_DX));
    const by = cy - o * detY;
    const flash = Math.min(1, o > 0 ? station.flashPlus : station.flashMinus);
    const rgb = o > 0 ? GREEN_RGB : ORANGE_RGB;
    ctx.fillStyle = `rgba(${rgb}, ${(.07 + .55 * flash).toFixed(3)})`;
    ctx.strokeStyle = o > 0 ? GREEN : ORANGE;
    ctx.lineWidth = 2;
    ctx.fillRect(bx - 17, by - 14, 34, 28);
    ctx.strokeRect(bx - 17, by - 14, 34, 28);
    ctx.fillStyle = o > 0 ? GREEN : ORANGE;
    ctx.font = "800 11px Inter, sans-serif";
    ctx.fillText(o > 0 ? "+1" : "−1", bx, by + 4);
  }
}

function drawBench2d() {
  const { ctx, w, h } = fit(bench2d);
  if (!ctx) return;
  ctx.clearRect(0, 0, w, h);
  const cy = h * .52;
  const scale = (w - 50) / (2 * (ANALYZER_X + DETECTOR_DX) + 1.5);
  const X = (wx) => w / 2 + wx * scale;
  const detY = Math.min(h * .3, 120);
  const r = Math.min(h * .17, 46);

  ctx.strokeStyle = `rgba(${VIOLET_RGB}, .4)`;
  ctx.lineWidth = 1.6;
  ctx.setLineDash([7, 6]);
  for (const side of [1, -1]) {
    ctx.beginPath();
    ctx.moveTo(X(side * SOURCE_GAP), cy);
    ctx.lineTo(X(side * ANALYZER_X) - side * r, cy);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  drawStation2d(ctx, aliceSt, -1, X, cy, r, detY);
  drawStation2d(ctx, bobSt, 1, X, cy, r, detY);

  const srcR = 13 * (1 + pulse * .35);
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = VIOLET;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(X(0), cy, srcR, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = VIOLET;
  ctx.textAlign = "center";
  ctx.font = "italic 12px Georgia, serif";
  ctx.fillText("Φ⁺", X(0), cy + 4);
  ctx.fillStyle = SOFT;
  ctx.font = "italic 10px Georgia, serif";
  ctx.fillText("pair source", X(0), cy + 32);

  for (const flight of flights) {
    for (const part of flight.parts) {
      const px = X(part.x);
      const py = cy - part.y / DETECTOR_Y * detY;
      const fuzzy = flight.measuredMode === "quantum" && !flight.measured;
      const glowR = fuzzy ? 16 : 9;
      const grad = ctx.createRadialGradient(px, py, 0, px, py, glowR);
      grad.addColorStop(0, `rgba(${VIOLET_RGB}, .8)`);
      grad.addColorStop(1, `rgba(${VIOLET_RGB}, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(px, py, glowR, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = VIOLET;
      ctx.beginPath();
      ctx.arc(px, py, 3.5, 0, Math.PI * 2);
      ctx.fill();

      let stickAngle = null;
      let stickColor = BLUE;
      if (flight.measuredMode === "local") stickAngle = flight.lambda;
      else if (flight.measured) {
        stickAngle = part.measuredAngle;
        stickColor = VIOLET;
      }
      if (stickAngle !== null) {
        const sx = Math.sin(stickAngle) * 11;
        const sy = Math.cos(stickAngle) * 11;
        ctx.strokeStyle = stickColor;
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(px - sx, py + sy);
        ctx.lineTo(px + sx, py - sy);
        ctx.stroke();
      }
    }
  }
}

/* ---------- 2D charts ---------- */

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

function drawMeter(res) {
  const { ctx, w, h } = fit(meterCanvas);
  if (!ctx) return;
  ctx.clearRect(0, 0, w, h);
  const L = 14;
  const R = w - 14;
  const y = h * .38;
  const X = (value) => L + (R - L) * Math.min(3, value) / 3;

  ctx.fillStyle = "#f1f0ed";
  ctx.fillRect(L, y - 6, R - L, 12);
  ctx.fillStyle = "#eeeeff";
  ctx.fillRect(X(2), y - 6, X(TSIRELSON) - X(2), 12);

  const value = Math.abs(res.S);
  if (res.total > 0 && value > .01) {
    ctx.fillStyle = value > 2 ? VIOLET : GREEN;
    ctx.fillRect(L, y - 6, X(value) - L, 12);
    const lo = X(Math.max(0, value - res.sigma));
    const hi = X(value + res.sigma);
    ctx.fillStyle = "rgba(27,29,32,.22)";
    ctx.fillRect(lo, y - 9, Math.max(1.5, hi - lo), 18);
  }

  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(X(2), y - 13);
  ctx.lineTo(X(2), y + 13);
  ctx.stroke();
  ctx.strokeStyle = VIOLET;
  ctx.beginPath();
  ctx.moveTo(X(TSIRELSON), y - 13);
  ctx.lineTo(X(TSIRELSON), y + 13);
  ctx.stroke();

  ctx.font = "700 9px Inter, sans-serif";
  ctx.fillStyle = SOFT;
  ctx.textAlign = "left";
  ctx.fillText("0", L, y + 28);
  ctx.textAlign = "right";
  ctx.fillStyle = INK;
  ctx.fillText("2 · classical limit", X(2) - 4, y + 28);
  ctx.textAlign = "left";
  ctx.fillStyle = VIOLET;
  ctx.fillText("2√2 · quantum max", X(TSIRELSON) - 62, y - 18);
}

function drawCorrelation() {
  const { ctx, w, h } = fit(corrCanvas);
  if (!ctx) return;
  ctx.clearRect(0, 0, w, h);
  const L = 30;
  const R = w - 10;
  const T = 10;
  const B = h - 20;
  const X = (delta) => L + (R - L) * delta / 180;
  const Y = (value) => T + (B - T) * (1 - value) / 2;

  ctx.strokeStyle = HAIR;
  ctx.lineWidth = 1;
  ctx.font = "650 8.5px Inter, sans-serif";
  ctx.fillStyle = SOFT;
  ctx.textAlign = "right";
  for (const value of [1, 0, -1]) {
    ctx.beginPath();
    ctx.moveTo(L, Y(value));
    ctx.lineTo(R, Y(value));
    ctx.stroke();
    ctx.fillText(value > 0 ? "+1" : value < 0 ? "−1" : "0", L - 4, Y(value) + 3);
  }
  ctx.textAlign = "center";
  for (const delta of [0, 45, 90, 135, 180]) {
    ctx.fillText(delta + "°", X(delta), B + 12);
  }

  const activeQuantum = mode === "quantum";
  ctx.lineWidth = activeQuantum ? 1.3 : 2.2;
  ctx.strokeStyle = BLUE;
  ctx.globalAlpha = activeQuantum ? .55 : 1;
  ctx.beginPath();
  ctx.moveTo(X(0), Y(1));
  ctx.lineTo(X(90), Y(-1));
  ctx.lineTo(X(180), Y(1));
  ctx.stroke();

  ctx.lineWidth = activeQuantum ? 2.2 : 1.3;
  ctx.strokeStyle = VIOLET;
  ctx.globalAlpha = activeQuantum ? 1 : .55;
  ctx.beginPath();
  for (let i = 0; i <= 90; i += 1) {
    const delta = i * 2;
    const px = X(delta);
    const py = Y(Math.cos(2 * delta * RAD));
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;

  for (const combo of combos) {
    if (combo.n < 30) continue;
    const E = combo.sum / combo.n;
    const sigma = Math.sqrt(Math.max(1e-9, 1 - E * E) / combo.n);
    const px = X(foldDelta(angles[combo.alice], angles[combo.bob]));
    ctx.strokeStyle = GREEN;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(px, Y(E - sigma));
    ctx.lineTo(px, Y(E + sigma));
    ctx.stroke();
    ctx.fillStyle = GREEN;
    ctx.beginPath();
    ctx.arc(px, Y(E), 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

/* ---------- readouts ---------- */

function updateVerdict(res) {
  const absS = Math.abs(res.S);
  const excess = absS - 2;
  const kSigma = res.sigma > 0 ? excess / res.sigma : 0;
  let cls = "verdict";
  let head;
  let detail;
  if (res.total < 300 || res.min < 20) {
    cls += " waiting";
    head = "Collecting pairs…";
    detail = `S = ${res.total ? fmtSigned(res.S) : "-"} ± ${res.total ? res.sigma.toFixed(2) : "-"} so far. A verdict needs a few hundred pairs at every setting combination.`;
  } else if (excess > 0 && kSigma >= 4) {
    head = "Bell's inequality is violated";
    detail = `S = ${fmtSigned(res.S)} ± ${res.sigma.toFixed(3)} - that is ${kSigma.toFixed(1)}σ beyond the classical bound of 2. No local hidden-variable story survives these correlations.`;
  } else if (excess > 0) {
    cls += " waiting";
    head = "Past 2 - gathering significance";
    detail = `S = ${fmtSigned(res.S)} ± ${res.sigma.toFixed(3)} is only ${kSigma.toFixed(1)}σ above the bound. Let it run, or raise the pair rate.`;
  } else if (mode === "local") {
    cls += " classical";
    head = "Stuck at the classical bound";
    detail = `Pre-written answers top out at S = 2, and this run sits at ${fmtSigned(res.S)} ± ${res.sigma.toFixed(3)}. The missing 0.83 is exactly what entanglement buys.`;
  } else {
    cls += " classical";
    head = "No violation at these settings";
    detail = `S = ${fmtSigned(res.S)} ± ${res.sigma.toFixed(3)}. Entangled pairs only beat 2 for the right angle pattern - try “Bell angles”.`;
  }
  verdictBox.className = cls;
  verdictHead.textContent = head;
  verdictDetail.textContent = detail;
}

function refreshPanels() {
  const res = results();
  for (const combo of combos) {
    combo.nCell.textContent = combo.n.toLocaleString("en-US");
    combo.eCell.textContent = combo.n ? fmtSigned(combo.sum / combo.n) : "-";
  }
  byId("nTotal").textContent = res.total.toLocaleString("en-US");
  byId("pairsSeen").textContent = res.total.toLocaleString("en-US");
  byId("sCell").textContent = res.total ? fmtSigned(res.S) : "-";
  byId("sValue").textContent = res.total ? `${fmtSigned(res.S)} ± ${res.sigma.toFixed(3)}` : "-";
  updateVerdict(res);
  drawMeter(res);
  drawCorrelation();
}

/* ---------- controls ---------- */

const angleSliders = [["angA", "a"], ["angA2", "a2"], ["angB", "b"], ["angB2", "b2"]];

function onAnglesChanged() {
  resetStats();
  if (aliceSt.key) setSetting(aliceSt, aliceSt.key);
  if (bobSt.key) setSetting(bobSt, bobSt.key);
}

for (const [id, key] of angleSliders) {
  byId(id).addEventListener("input", () => {
    angles[key] = Number(byId(id).value);
    byId(id + "Value").textContent = fmtAngle(angles[key]) + "°";
    onAnglesChanged();
  });
}

byId("pairRate").addEventListener("input", () => {
  pairRate = Math.round(10 ** Number(byId("pairRate").value));
  byId("pairRateValue").textContent = `${pairRate} /s`;
});

byId("simOptimal").addEventListener("click", () => {
  for (const [id, key] of angleSliders) {
    angles[key] = OPTIMAL[key];
    byId(id).value = OPTIMAL[key];
    byId(id + "Value").textContent = fmtAngle(OPTIMAL[key]) + "°";
  }
  onAnglesChanged();
});

byId("simPlay").addEventListener("click", () => {
  running = !running;
  byId("simPlay").textContent = running ? "Pause" : "Resume";
});

byId("simReset").addEventListener("click", resetStats);

function applyMode() {
  document.querySelectorAll(".scenario").forEach((button) => {
    button.classList.toggle("on", button.dataset.mode === mode);
  });
  byId("modeTitle").textContent = MODE_NOTES[mode].title;
  byId("modeNote").textContent = MODE_NOTES[mode].note;
  resetStats();
}

document.querySelectorAll(".scenario").forEach((button) => {
  button.addEventListener("click", () => {
    if (button.dataset.mode === mode) return;
    mode = button.dataset.mode;
    applyMode();
  });
});

/* ---------- view toggle ---------- */

let view = "3d";

function applyView() {
  const use3d = view === "3d" && renderer;
  benchCanvas.style.display = use3d ? "block" : "none";
  bench2d.style.display = use3d ? "none" : "block";
  byId("benchHint").textContent = use3d ? "drag to orbit · scroll to zoom · " : "";
  byId("view3d").classList.toggle("on", use3d);
  byId("view2d").classList.toggle("on", !use3d);
  if (use3d) resize();
}

byId("view3d").addEventListener("click", () => { view = "3d"; applyView(); });
byId("view2d").addEventListener("click", () => { view = "2d"; applyView(); });

/* ---------- main loop ---------- */

let raf = 0;
let last = 0;

function frame(now) {
  raf = requestAnimationFrame(frame);
  const dt = Math.min(.05, (now - last) / 1000);
  last = now;
  frameCount += 1;

  if (running) {
    visualClock -= dt;
    carry += pairRate * dt;
    let count = Math.min(20000, Math.floor(carry));
    carry -= count;
    let visualPair = null;
    while (count-- > 0) {
      const pair = samplePair();
      record(pair);
      if (!visualPair && visualClock <= 0 && flights.length < 5) visualPair = pair;
    }
    if (visualPair) {
      spawnFlight(visualPair);
      visualClock = VISUAL_INTERVAL;
    }
    for (const flight of flights) updateFlight(flight, dt);
    flights = flights.filter((flight) => !flight.done);
    pulse = Math.max(0, pulse - dt * 2.4);
    if (source) source.scale.setScalar(1 + pulse * .5);
    updateStation(aliceSt, dt);
    updateStation(bobSt, dt);
  }

  if (frameCount % 3 === 0) refreshPanels();
  if (view === "3d" && renderer) {
    updateCamera();
    renderer.render(scene, camera);
  } else {
    drawBench2d();
  }
}

function setActive(on) {
  if (on === active) return;
  active = on;
  if (active) {
    resize();
    last = performance.now();
    raf = requestAnimationFrame(frame);
  } else {
    cancelAnimationFrame(raf);
  }
}

window.addEventListener("lesson:slide", (event) => setActive(Boolean(event.detail.simulator)));

initScene();
if (!renderer) {
  view = "2d";
  byId("view3d").disabled = true;
}
setSetting(aliceSt, "a");
setSetting(bobSt, "b");
new ResizeObserver(resize).observe(benchCanvas);
applyView();
applyMode();
setActive(Boolean(document.querySelector(".slide.on")?.dataset.simulator));
