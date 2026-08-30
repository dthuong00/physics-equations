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

const TAU = Math.PI * 2;
const DEG = 180 / Math.PI;

/* Geometric units: c = 1, lengths in "sim units", mass expressed through rs = 2GM/c².
   worldR is the scene's outer radius - per scenario, so the solar system can be big. */
let worldR = 14;
const SIM_SPEED = 12;
const STEP = .02;
const TRAIL_GAP = .12;
const TRAIL_MAX = 900;
const MAX_MATTER = 6;
const BUCHDAHL = 8 / 9;

const SCENARIOS = {
  sun: {
    rs: .12, starR: 2.6, body: 0xf2b13e, title: "Sun-like star",
    note: "A calm star - though not to scale: the Sun's real rs/R is 4×10⁻⁶, so its warp is exaggerated here by a factor of ~10⁵ or you would see nothing at all. Notice the grid stays nearly straight while planets loop right around: a body at v ≈ 0.1 c bends ~100× more than a taut string, because a slow orbit is almost entirely curved TIME - space curvature is the small correction. That is why gravity kept its secret for two centuries, until Mercury's spare 43″ per century gave it away."
  },
  neutron: {
    rs: .85, starR: 2.05, body: 0xb9c3ee, title: "Neutron star",
    note: "Drawn at honest proportions - a neutron star really is this compact (rs/R ≈ 0.4, no exaggeration). Time at the surface runs about 25% slow, and the ISCO pokes out above the surface. Now nudge the mass slider up: past Buchdahl's limit (rs = 8/9 R) no pressure in physics can win, and the star must collapse in front of you."
  },
  bh: {
    rs: 1.2, starR: 0, body: 0x101014, title: "Black hole",
    note: "All curvature, no surface. The lattice ends at the horizon, where the local clock rate reaches zero. Try a slow launch and watch Einstein swallow a particle that Newton's ghost happily keeps in orbit; fire light and watch beams inside b ≈ 2.6 rs wrap around the photon sphere or vanish."
  },
  solar: {
    rs: .12, starR: .55, body: 0xf2b13e, title: "Solar system",
    note: "The four inner planets at their TRUE relative spacing and eccentricities - every distance, speed and period ratio you see is the real one: Mercury laps the Sun 4.1 times per Earth year, exactly as in the sky. (Jupiter would orbit 5× farther out than Mars and Saturn 9.5×, off this map; the Sun's warp is still exaggerated ~10⁵× so precession takes seconds, not centuries.) Every ellipse creeps - real Mars ~1.4″ per century, Mercury 43″, the field equations' first triumph. The scoreboard tracks Mercury live. And the mass slider still works: past Buchdahl's limit the Sun collapses into a black hole."
  }
};

/* The four inner planets at TRUE relative spacing (1 AU = 6.6 sim units) and true
   eccentricities, so every distance, speed and period ratio matches the real sky.
   Jupiter (5.2 AU) and Saturn (9.5 AU) would fall far outside this view. */
const PLANETS = [
  { name: "Mercury", a: 2.55, e: .206, size: .13, color: 0x9d968f },
  { name: "Venus", a: 4.77, e: .007, size: .2, color: 0xd8b46b },
  { name: "Earth", a: 6.6, e: .017, size: .21, color: 0x4a7fd4 },
  { name: "Mars", a: 10.06, e: .093, size: .16, color: 0xc96a4a }
];

let scenario = "bh";
let rs = SCENARIOS.bh.rs;
let starR = SCENARIOS.bh.starR;
let ghostOn = true;
let active = false;
let bodies = [];
let relics = [];
let lastLaunch = null;
let lastBend = null;
let flashUntil = 0;
let frameCount = 0;

const M = () => rs / 2;
const surfaceRadius = () => (starR > 0 ? starR : rs);
const isBlackHole = () => starR <= 0;

const wellCanvas = byId("wellCanvas");
const potentialCanvas = byId("potentialCanvas");
const verdictBox = byId("verdict");
const verdictHead = byId("verdictHead");
const verdictDetail = byId("verdictDetail");

const fmt = (value, digits = 2) => Number(value).toFixed(digits);
const fmtDeg = (value) => (Math.abs(value) < 1 ? fmt(value, 2) : fmt(value, 1)) + "°";

/* ---------- geometry of curved space ---------- */

/* Rate of proper time vs far away: exterior Schwarzschild, interior uniform-density star. */
function clockRate(r) {
  if (isBlackHole() || r >= starR) return Math.sqrt(Math.max(0, 1 - rs / Math.max(r, rs)));
  const x = Math.sqrt(1 - rs / starR);
  const y = Math.sqrt(1 - rs * r * r / starR ** 3);
  return 1.5 * x - .5 * y;
}

const COL_FAR = new THREE.Color("#9fb2cf");
const COL_MID = new THREE.Color("#d95d39");
const COL_DEEP = new THREE.Color("#7a1c12");
const tmpColor = new THREE.Color();

function rateColor(rate, target) {
  const t = 1 - Math.max(0, Math.min(1, rate));
  if (t < .45) target.copy(COL_FAR).lerp(COL_MID, t / .45);
  else target.copy(COL_MID).lerp(COL_DEEP, (t - .45) / .55);
  return target;
}

/* ---------- geodesics ----------
   Equatorial Schwarzschild in (r, φ), affine/proper-time parameter:
     r'' = −κM/r² + L²/r³ − 3ML²/r⁴     κ = 1 matter, 0 light
   Newton (matter or light, he never knew the difference):
     r'' = −M/r² + L²/r³                                        */

function accel(kind, r, L2) {
  const m = M();
  let a = L2 / (r * r * r);
  if (kind !== "photon") a -= m / (r * r);
  if (kind !== "newton") a -= 3 * m * L2 / (r * r * r * r);
  return a;
}

function stepBody(body, h) {
  const L2 = body.L * body.L;
  body.pr += accel(body.kind, body.r, L2) * h / 2;
  body.r += body.pr * h;
  if (body.r <= 0.05) return;
  body.phi += body.L / (body.r * body.r) * h;
  body.pr += accel(body.kind, body.r, L2) * h / 2;
  if (body.kind === "gr") {
    body.tau += h;
    body.t += h * body.E / Math.max(1e-6, 1 - rs / body.r);
  }
}

/* ---------- three.js scene ---------- */

let renderer = null;
let scene, camera;
let yaw = .65, pitch = .52, radius = 26;
const camTarget = new THREE.Vector3(0, 0, 0);
const panRight = new THREE.Vector3();
const panUp = new THREE.Vector3();
let cageGroup = null;
let photonRing = null, iscoRing = null, horizonRing = null;
let starMesh, bhMesh, collapsar = null;
let clocks = [];
let ringLabels = {};

const grBodyGeo = new THREE.SphereGeometry(.17, 18, 12);
const grBodyMat = new THREE.MeshBasicMaterial({ color: VIOLET });
const newtonBodyMat = new THREE.MeshBasicMaterial({ color: BLUE, transparent: true, opacity: .75 });
const photonGeo = new THREE.SphereGeometry(.09, 12, 8);
const photonMat = new THREE.MeshBasicMaterial({ color: ORANGE });
const grTrailMat = new THREE.LineBasicMaterial({ color: 0x4340b8, transparent: true, opacity: 1 });
const newtonTrailMat = new THREE.LineDashedMaterial({ color: BLUE, transparent: true, opacity: .95, dashSize: .3, gapSize: .18 });
const photonTrailMat = new THREE.LineBasicMaterial({ color: ORANGE, transparent: true, opacity: 1 });

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

function disposeObject(root) {
  if (!root) return;
  root.traverse((node) => {
    if (node.geometry) node.geometry.dispose();
    if (node.material && node.material.dispose) node.material.dispose();
  });
  scene.remove(root);
}

function circlePoints(r, y, segments = 96) {
  const pts = [];
  for (let i = 0; i <= segments; i += 1) {
    const a = i / segments * TAU;
    pts.push(new THREE.Vector3(r * Math.cos(a), y, r * Math.sin(a)));
  }
  return pts;
}

/* Each dashed line is a taut string: a geodesic of the spatial metric, the
   straightest possible line through curved space. Its acceleration comes from
   (dr/ds)² = (1 − rs/r)(1 − h²/r²) with h = r²·dφ/ds conserved. Far from the
   mass a string is ruler-straight; passing at distance b it must bend by ≈ rs/b,
   and a string aimed inside the horizon simply ends on it - there is no
   straight line through. */
function stringAccel(r, h2) {
  const m = M();
  return m / (r * r) + h2 / (r * r * r) - 3 * m * h2 / (r * r * r * r);
}

function traceString(start, dir) {
  const surf = Math.max(surfaceRadius() * 1.01, rs * 1.02);
  const eR = start.clone().normalize();
  let r = start.length();
  const radial = dir.dot(eR);
  const eT = dir.clone().addScaledVector(eR, -radial);
  const tangential = eT.length();
  if (tangential > 1e-6) eT.divideScalar(tangential);
  const h = r * tangential;
  const h2 = h * h;
  let pr = radial;
  let phi = 0;
  let hitBody = false;
  const ds = worldR * .0086;
  const pts = [start.clone()];
  for (let i = 0; i < 240; i += 1) {
    pr += stringAccel(r, h2) * ds / 2;
    r += pr * ds;
    phi += h / (r * r) * ds;
    pr += stringAccel(r, h2) * ds / 2;
    if (r <= surf || (r < surf + .06 && Math.abs(pr) < .02)) {
      hitBody = true;
      break;
    }
    if (r > worldR * 1.5) break;
    pts.push(eR.clone().multiplyScalar(r * Math.cos(phi)).addScaledVector(eT, r * Math.sin(phi)));
  }
  return { pts, hitBody };
}

function stringPoint(eR, eT, r, phi) {
  return new THREE.Vector3().copy(eR).multiplyScalar(r * Math.cos(phi)).addScaledVector(eT, r * Math.sin(phi));
}

/* A passing string's closest approach is its turning point (r = h = b). Integrating
   outward from there and mirroring gives the two halves exactly symmetric. */
function traceSymmetric(eR, eT, b) {
  const h2 = b * b;
  const ds = worldR * .0086;
  let r = b, pr = 0, phi = 0;
  const arc = [];
  for (let i = 0; i < 150 && r < worldR * 1.55; i += 1) {
    pr += stringAccel(r, h2) * ds / 2;
    r += pr * ds;
    phi += b / (r * r) * ds;
    pr += stringAccel(r, h2) * ds / 2;
    arc.push([r, phi]);
  }
  const pts = [];
  for (let i = arc.length - 1; i >= 0; i -= 1) pts.push(stringPoint(eR, eT, arc[i][0], -arc[i][1]));
  pts.push(stringPoint(eR, eT, b, 0));
  for (const [rr, pp] of arc) pts.push(stringPoint(eR, eT, rr, pp));
  return pts;
}

function buildWarpGrid() {
  const pos = [], col = [];
  const polyline = (pts) => {
    for (let i = 2; i < pts.length; i += 2) {
      const p = pts[i - 2], q = pts[i];
      pos.push(p.x, p.y, p.z, q.x, q.y, q.z);
      rateColor(clockRate(p.length()), tmpColor);
      col.push(tmpColor.r, tmpColor.g, tmpColor.b);
      rateColor(clockRate(q.length()), tmpColor);
      col.push(tmpColor.r, tmpColor.g, tmpColor.b);
    }
  };
  const ext = worldR * .8;
  const offsets = [];
  for (let k = -4; k <= 4; k += 1) offsets.push(k * ext / 4);
  const axes = [
    [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)],
    [new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 1)],
    [new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0)]
  ];
  const start = new THREE.Vector3();
  const offsetVec = new THREE.Vector3();
  for (const [dir, e1, e2] of axes) {
    for (const a of offsets) {
      for (const bOff of offsets) {
        offsetVec.copy(e1).multiplyScalar(a).addScaledVector(e2, bOff);
        const b = offsetVec.length();
        if (b > Math.max(surfaceRadius() * 1.05, rs * 1.06) + .05) {
          /* Passing string: grow it outward from its periapsis in both directions,
             so the bend is symmetric about closest approach. */
          polyline(traceSymmetric(offsetVec.clone().divideScalar(b), dir, b));
        } else {
          /* No straight line passes this close: each half ends on the body. */
          start.copy(dir).multiplyScalar(-ext).add(offsetVec);
          polyline(traceString(start, dir).pts);
          start.copy(dir).multiplyScalar(ext).add(offsetVec);
          polyline(traceString(start, dir.clone().negate()).pts);
        }
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  const lines = new THREE.LineSegments(geo, new THREE.LineDashedMaterial({
    vertexColors: true, transparent: true, opacity: .38, dashSize: worldR * .011, gapSize: worldR * .009, depthWrite: false
  }));
  lines.computeLineDistances();
  lines.renderOrder = -1;
  cageGroup = new THREE.Group();
  cageGroup.add(lines);
  scene.add(cageGroup);
}

function buildMarkers() {
  disposeObject(photonRing);
  disposeObject(iscoRing);
  disposeObject(horizonRing);
  photonRing = iscoRing = horizonRing = null;

  const surf = surfaceRadius();
  const mk = (r, material) => {
    const geo = new THREE.BufferGeometry().setFromPoints(circlePoints(r, .04));
    const ring = new THREE.Line(geo, material);
    ring.computeLineDistances();
    scene.add(ring);
    return ring;
  };
  const labAngle = 2.35;
  const place = (label, r, lift) => {
    label.sprite.position.set(r * Math.cos(labAngle), lift, r * Math.sin(labAngle));
  };

  if (1.5 * rs > surf + .05) {
    photonRing = mk(1.5 * rs, new THREE.LineDashedMaterial({ color: ORANGE, dashSize: .22, gapSize: .16, transparent: true, opacity: .9 }));
    place(ringLabels.photon, 1.5 * rs, .42);
  }
  ringLabels.photon.sprite.visible = Boolean(photonRing);

  if (3 * rs > surf + .05) {
    iscoRing = mk(3 * rs, new THREE.LineDashedMaterial({ color: GREEN, dashSize: .3, gapSize: .2, transparent: true, opacity: .9 }));
    place(ringLabels.isco, 3 * rs, .42);
  }
  ringLabels.isco.sprite.visible = Boolean(iscoRing);

  if (isBlackHole()) {
    horizonRing = mk(rs, new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: .85 }));
    place(ringLabels.horizon, rs, .42);
  }
  ringLabels.horizon.sprite.visible = isBlackHole();
}

function buildCentralBody() {
  const sc = SCENARIOS[scenario];
  if (isBlackHole()) {
    starMesh.visible = false;
    bhMesh.visible = true;
    bhMesh.scale.setScalar(rs * .99);
    bhMesh.position.y = 0;
  } else {
    bhMesh.visible = false;
    starMesh.visible = true;
    starMesh.material.color.set(sc.body);
    starMesh.material.emissive.set(sc.body);
    starMesh.scale.setScalar(starR);
    starMesh.position.y = 0;
  }
}

function layoutClocks() {
  const surf = surfaceRadius();
  const r1 = surf * 1.18 + .3;
  const r3 = worldR * .88;
  const r2 = Math.sqrt(r1 * r3);
  [r1, r2, r3].forEach((r, i) => {
    const clock = clocks[i];
    clock.r = r;
    const a = clock.angle;
    clock.group.position.set(r * Math.cos(a), .05, r * Math.sin(a));
    clock.group.visible = r > surf + .15;
    clock.label.set(`time ×${fmt(clockRate(r), 2)}`, INK, 750, 46);
  });
}

function initScene() {
  try {
    renderer = new THREE.WebGLRenderer({ canvas: wellCanvas, antialias: true });
  } catch (error) {
    renderer = null;
    return;
  }
  renderer.setClearColor(0xffffff);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(42, 16 / 9, .1, 600);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xd8d8e2, 1.1));
  const sun = new THREE.DirectionalLight(0xffffff, 1.4);
  sun.position.set(6, 12, 7);
  scene.add(sun);

  starMesh = new THREE.Mesh(
    new THREE.SphereGeometry(1, 40, 28),
    new THREE.MeshStandardMaterial({ color: 0xf2b13e, emissive: 0xf2b13e, emissiveIntensity: .38, roughness: .45 })
  );
  bhMesh = new THREE.Mesh(
    new THREE.SphereGeometry(1, 40, 28),
    new THREE.MeshBasicMaterial({ color: 0x0c0c10 })
  );
  scene.add(starMesh, bhMesh);

  ringLabels = { photon: makeLabel(.5), isco: makeLabel(.5), horizon: makeLabel(.5) };
  ringLabels.photon.set("photon sphere · 1.5 rs", ORANGE, 750, 40);
  ringLabels.isco.set("ISCO · 3 rs", GREEN, 750, 40);
  ringLabels.horizon.set("horizon · rs", INK, 750, 40);
  scene.add(ringLabels.photon.sprite, ringLabels.isco.sprite, ringLabels.horizon.sprite);

  for (let i = 0; i < 3; i += 1) {
    const group = new THREE.Group();
    const face = new THREE.Mesh(
      new THREE.CircleGeometry(.46, 28),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .92, side: THREE.DoubleSide, depthWrite: false })
    );
    face.rotation.x = -Math.PI / 2;
    const rim = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(circlePoints(.46, .01, 40)),
      new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: .7 })
    );
    const hand = new THREE.Group();
    const needle = new THREE.Mesh(new THREE.BoxGeometry(.05, .02, .4), new THREE.MeshBasicMaterial({ color: ORANGE }));
    needle.position.z = .18;
    hand.add(needle);
    hand.position.y = .03;
    const label = makeLabel(.55);
    label.sprite.position.y = .78;
    group.add(face, rim, hand, label.sprite);
    scene.add(group);
    clocks.push({ group, hand, label, r: 5, angle: 1.85 + i * .5 });
  }

  scene.userData.glowMat = new THREE.SpriteMaterial({
    map: makeGlowTexture(), color: 0xe8804f, transparent: true, opacity: .85, depthWrite: false
  });

  buildLauncher();

  wellCanvas.addEventListener("contextmenu", (event) => event.preventDefault());
  wellCanvas.addEventListener("pointerdown", (event) => {
    wellCanvas.setPointerCapture(event.pointerId);
    wellCanvas.dataset.x = event.clientX;
    wellCanvas.dataset.y = event.clientY;
    gizmoMode = null;
    if (event.button === 0 && !event.shiftKey) {
      setRayFromEvent(event);
      const hits = raycaster.intersectObjects([tipHandle, emitterHandle], false);
      if (hits.length) {
        gizmoMode = hits[0].object === tipHandle ? "aim" : "move";
        camera.getWorldDirection(camForward);
        dragPlane.setFromNormalAndCoplanarPoint(
          camForward,
          gizmoMode === "move" ? launcher.pos : tipHandle.getWorldPosition(hitPoint)
        );
        return;
      }
    }
    wellCanvas.dataset.dragging = "1";
  });
  wellCanvas.addEventListener("pointermove", (event) => {
    if (gizmoMode) {
      setRayFromEvent(event);
      if (raycaster.ray.intersectPlane(dragPlane, hitPoint)) {
        if (gizmoMode === "move") {
          launcher.pos.copy(hitPoint);
          clampLauncher();
        } else {
          hitPoint.sub(launcher.pos);
          if (hitPoint.lengthSq() > 1e-6) launcher.dir.copy(hitPoint.normalize());
          updateLauncher();
        }
        drawPotential();
      }
      return;
    }
    if (wellCanvas.dataset.dragging !== "1") return;
    const dx = event.clientX - Number(wellCanvas.dataset.x);
    const dy = event.clientY - Number(wellCanvas.dataset.y);
    if ((event.buttons & 2) || event.shiftKey) {
      yaw -= dx * .005;
      pitch = Math.min(1.4, Math.max(-1.4, pitch + dy * .005));
    } else {
      const k = radius * .0012;
      panRight.setFromMatrixColumn(camera.matrix, 0);
      panUp.setFromMatrixColumn(camera.matrix, 1);
      camTarget.addScaledVector(panRight, -dx * k).addScaledVector(panUp, dy * k);
      if (camTarget.length() > 20) camTarget.setLength(20);
    }
    wellCanvas.dataset.x = event.clientX;
    wellCanvas.dataset.y = event.clientY;
  });
  wellCanvas.addEventListener("pointerup", () => {
    gizmoMode = null;
    wellCanvas.dataset.dragging = "0";
  });
  wellCanvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    radius = Math.min(worldR * 3, Math.max(2.5, radius * (1 + event.deltaY * .001)));
  }, { passive: false });
}

function resize() {
  if (!renderer) return;
  const width = wellCanvas.clientWidth;
  const height = wellCanvas.clientHeight;
  if (!width || !height) return;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function updateCamera() {
  camera.position.set(
    camTarget.x + radius * Math.cos(pitch) * Math.sin(yaw),
    camTarget.y + radius * Math.sin(pitch),
    camTarget.z + radius * Math.cos(pitch) * Math.cos(yaw)
  );
  camera.lookAt(camTarget);
}

/* ---------- bodies ---------- */

/* ---------- launcher ----------
   A draggable emitter: drag the green body anywhere, drag the arrow tip to aim.
   Everything fired starts at its position, heading along its arrow. Dragging moves
   the grabbed handle in the plane parallel to the screen - orbit the camera to
   reach any point and any direction in 3D. */

const launcher = { pos: new THREE.Vector3(7.5, 0, 0), dir: new THREE.Vector3(0, 0, -1) };
const TIP_DIST = 2.6;
let launcherGroup = null, launcherArrow = null, emitterHandle = null, tipHandle = null;
let gizmoMode = null;

const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const dragPlane = new THREE.Plane();
const camForward = new THREE.Vector3();
const hitPoint = new THREE.Vector3();

function setRayFromEvent(event) {
  const rect = wellCanvas.getBoundingClientRect();
  ndc.set(
    (event.clientX - rect.left) / rect.width * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1
  );
  raycaster.setFromCamera(ndc, camera);
}

function buildLauncher() {
  launcherGroup = new THREE.Group();
  emitterHandle = new THREE.Mesh(
    new THREE.SphereGeometry(.3, 20, 14),
    new THREE.MeshBasicMaterial({ color: GREEN })
  );
  launcherArrow = new THREE.ArrowHelper(launcher.dir, new THREE.Vector3(), TIP_DIST, 0x21805a, .68, .3);
  tipHandle = new THREE.Mesh(
    new THREE.SphereGeometry(.42, 14, 10),
    new THREE.MeshBasicMaterial({ color: GREEN, transparent: true, opacity: .3 })
  );
  const label = makeLabel(.6);
  label.set("launcher · drag me, aim with the tip", GREEN, 750, 34);
  label.sprite.position.y = 1;
  launcherGroup.add(emitterHandle, launcherArrow, tipHandle, label.sprite);
  scene.add(launcherGroup);
  updateLauncher();
}

function updateLauncher() {
  launcherGroup.position.copy(launcher.pos);
  launcherArrow.setDirection(launcher.dir);
  tipHandle.position.copy(launcher.dir).multiplyScalar(TIP_DIST);
}

function clampLauncher() {
  const minR = Math.max(surfaceRadius() * 1.05 + .25, rs * 1.15, 1);
  const len = launcher.pos.length();
  if (len < minR) launcher.pos.setLength(minR);
  else if (len > worldR * .94) launcher.pos.setLength(worldR * .94);
  if (launcherGroup) updateLauncher();
}

/* Orbit-plane basis for the launcher's position and aim: eR radial, eT in-plane
   tangent (every free fall stays in the plane spanned by position and velocity). */
function aimBasis() {
  const eR = launcher.pos.clone().normalize();
  const radial = launcher.dir.dot(eR);
  const eT = launcher.dir.clone().addScaledVector(eR, -radial);
  if (eT.lengthSq() < 1e-8) {
    eT.set(0, 1, 0).addScaledVector(eR, -eR.y);
    if (eT.lengthSq() < 1e-8) eT.set(1, 0, 0);
  }
  eT.normalize();
  const n = new THREE.Vector3().crossVectors(eR, eT).normalize();
  return { eR, eT, n, radial, tangential: launcher.dir.dot(eT), r0: launcher.pos.length() };
}

function matterState() {
  const a = aimBasis();
  const f = Number(byId("speedSlider").value);
  const V = Math.min(.95, f * Math.sqrt(M() / a.r0));
  const L = a.r0 * V * a.tangential;
  const pr = V * a.radial;
  const E2 = pr * pr + (1 - rs / a.r0) * (1 + L * L / (a.r0 * a.r0));
  return { ...a, L, pr, E2 };
}

function bodyPosition(body, target) {
  return target.copy(body.u).multiplyScalar(body.r * Math.cos(body.phi))
    .addScaledVector(body.v, body.r * Math.sin(body.phi))
    .addScaledVector(body.n, .05);
}

const tmpVec = new THREE.Vector3();

function makeBodyVisual(body) {
  if (!renderer) return;
  if (body.planet) {
    body.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(body.planet.size, 20, 14),
      new THREE.MeshStandardMaterial({ color: body.planet.color, roughness: .7 })
    );
    const tag = makeLabel(.48);
    tag.set(body.planet.name, MUTED, 750, 42);
    tag.sprite.position.y = body.planet.size + .5;
    body.mesh.add(tag.sprite);
  } else if (body.kind === "photon") {
    body.mesh = new THREE.Mesh(photonGeo, photonMat);
    const glow = new THREE.Sprite(scene.userData.glowMat);
    glow.scale.set(.9, .9, 1);
    body.mesh.add(glow);
  } else {
    body.mesh = new THREE.Mesh(grBodyGeo, body.kind === "gr" ? grBodyMat : newtonBodyMat);
  }
  const mat = body.planet
    ? new THREE.LineBasicMaterial({ color: body.planet.color, transparent: true, opacity: .6 })
    : body.kind === "gr" ? grTrailMat : body.kind === "newton" ? newtonTrailMat : photonTrailMat;
  body.trailLine = new THREE.Line(new THREE.BufferGeometry(), mat);
  body.trailLine.frustumCulled = false;
  scene.add(body.mesh, body.trailLine);
  bodyPosition(body, body.mesh.position);
}

function removeBodyVisual(body, keepTrail = false) {
  if (!body.mesh) return;
  if (body.planet) {
    body.mesh.traverse((node) => {
      if (node.geometry) node.geometry.dispose();
      if (node.material && node.material.dispose) node.material.dispose();
    });
  }
  scene.remove(body.mesh);
  if (keepTrail && body.trail.length > 1) {
    /* Leave the path behind, fading - a bent light ray is the whole point of firing it. */
    body.trailLine.material = body.trailLine.material.clone();
    relics.push({ line: body.trailLine, life: 1, base: body.trailLine.material.opacity });
  } else {
    scene.remove(body.trailLine);
    body.trailLine.geometry.dispose();
  }
  body.mesh = body.trailLine = null;
}

function clearRelics() {
  for (const relic of relics) {
    scene.remove(relic.line);
    relic.line.geometry.dispose();
    relic.line.material.dispose();
  }
  relics = [];
}

function pushTrail(body) {
  const p = bodyPosition(body, tmpVec);
  const last = body.trail[body.trail.length - 1];
  if (last && last.distanceTo(p) < TRAIL_GAP) return;
  body.trail.push(p.clone());
  /* Planets keep ~2 orbits of trail - enough to see the ellipse swing, not a smear. */
  const cap = body.kind === "photon" ? 300 : body.planet ? 330 : TRAIL_MAX;
  if (body.trail.length > cap) body.trail.shift();
  if (body.trailLine && body.trail.length > 1) {
    /* setFromPoints won't grow an existing buffer (r152+), so swap the geometry out. */
    body.trailLine.geometry.dispose();
    body.trailLine.geometry = new THREE.BufferGeometry().setFromPoints(body.trail);
    if (body.kind === "newton") body.trailLine.computeLineDistances();
  }
}

function launchMatter() {
  clampLauncher();
  const s = matterState();
  const gr = {
    kind: "gr", r: s.r0, pr: s.pr, phi: 0, L: s.L, E: Math.sqrt(s.E2), E2: s.E2,
    tau: 0, t: 0, lastPeriPhi: null, measuredAdv: null, trail: [], dead: null,
    u: s.eR, v: s.eT, n: s.n
  };
  makeBodyVisual(gr);
  bodies.push(gr);
  if (ghostOn) {
    const ghost = {
      kind: "newton", r: s.r0, pr: s.pr, phi: 0, L: s.L,
      trail: [], dead: null, partner: gr, u: s.eR, v: s.eT, n: s.n
    };
    makeBodyVisual(ghost);
    bodies.push(ghost);
  }
  lastLaunch = { L: s.L, E2: s.E2, r0: s.r0, gr };

  trimMatter();
  refreshPanels();
}

function trimMatter() {
  const matter = bodies.filter((b) => b.kind !== "photon" && !b.planet);
  while (matter.length > MAX_MATTER * (ghostOn ? 2 : 1)) {
    const old = matter.shift();
    removeBodyVisual(old);
    bodies = bodies.filter((b) => b !== old);
  }
}

function fireLight() {
  clampLauncher();
  const a = aimBasis();
  const Lp = a.r0 * a.tangential;
  const Ep = Math.sqrt(a.radial * a.radial + (1 - rs / a.r0) * Lp * Lp / (a.r0 * a.r0));
  const photon = {
    kind: "photon", r: a.r0, phi: 0, L: Lp, b: Ep > 1e-6 ? Math.abs(Lp) / Ep : 0,
    pr: a.radial, turn: 0, prevPsi: null, trail: [], dead: null,
    u: a.eR, v: a.eT, n: a.n
  };
  makeBodyVisual(photon);
  bodies.push(photon);
  if (ghostOn) {
    const ghost = {
      kind: "newton", isLight: true, r: a.r0, phi: 0, L: Lp, pr: a.radial,
      trail: [], dead: null, u: a.eR, v: a.eT, n: a.n
    };
    makeBodyVisual(ghost);
    bodies.push(ghost);
  }
}

/* Planets share the ecliptic plane (as the real ones nearly do) and start at
   perihelion with the Newtonian angular momentum for their true eccentricity. */
function spawnPlanets() {
  const u = new THREE.Vector3(1, 0, 0);
  const v = new THREE.Vector3(0, 0, -1);
  const n = new THREE.Vector3(0, 1, 0);
  let mercury = null;
  for (const planet of PLANETS) {
    const L = Math.sqrt(M() * planet.a * (1 - planet.e * planet.e));
    const r0 = planet.a * (1 - planet.e);
    const E2 = (1 - rs / r0) * (1 + L * L / (r0 * r0));
    const body = {
      kind: "gr", planet, r: r0, pr: 0, phi: Math.random() * TAU,
      L, E: Math.sqrt(E2), E2, tau: 0, t: 0,
      lastPeriPhi: null, measuredAdv: null, trail: [], dead: null, u, v, n
    };
    makeBodyVisual(body);
    bodies.push(body);
    if (!mercury) mercury = body;
  }
  lastLaunch = { L: mercury.L, E2: mercury.E2, r0: mercury.r, gr: mercury };
  refreshPanels();
}

function clearBodies() {
  for (const body of bodies) removeBodyVisual(body);
  if (renderer) clearRelics();
  bodies = [];
  lastLaunch = null;
  lastBend = null;
  flashUntil = 0;
  refreshPanels();
}

function heading(body) {
  const vphi = body.L / body.r;
  const cos = Math.cos(body.phi);
  const sin = Math.sin(body.phi);
  return Math.atan2(body.pr * sin + vphi * cos, body.pr * cos - vphi * sin);
}

function handleEvents(body) {
  const surf = surfaceRadius();

  if (body.kind === "photon" || body.kind === "gr") {
    const captureR = isBlackHole() ? rs * 1.02 : surf;
    if (body.r <= captureR) {
      body.dead = isBlackHole() ? "captured" : "crashed";
      return;
    }
  } else if (body.r <= (starR > 0 ? surf : rs * .25)) {
    body.dead = "crashed";
    return;
  }

  if (body.r > worldR * 1.02) {
    body.dead = "escaped";
    if (body.kind === "photon") {
      lastBend = { b: body.b, measured: Math.abs(body.turn) * DEG };
    }
    return;
  }

  if (body.kind === "photon") {
    const psi = heading(body);
    if (body.prevPsi !== null) {
      let d = psi - body.prevPsi;
      if (d > Math.PI) d -= TAU;
      if (d < -Math.PI) d += TAU;
      body.turn += d;
    }
    body.prevPsi = psi;
  }

  if (body.kind === "gr" && body.prevPr < 0 && body.pr >= 0) {
    if (body.lastPeriPhi !== null) {
      body.measuredAdv = (Math.abs(body.phi - body.lastPeriPhi) - TAU) * DEG;
    }
    body.lastPeriPhi = body.phi;
  }
}

/* ---------- collapse ---------- */

function collapse() {
  if (isBlackHole()) return;
  collapsar = starMesh.clone();
  collapsar.material = starMesh.material.clone();
  collapsar.userData.life = 1;
  scene.add(collapsar);
  starR = 0;
  applyMass();
  flashVerdict("danger", "Collapse - Buchdahl's limit crossed",
    `A star squeezed inside 9/8 rs cannot be held up by any pressure: the field equations have no static answer left. A horizon forms at rs = ${fmt(rs)}. Re-pick the scenario for a fresh star - this one is not coming back.`, 9);
}

/* ---------- rail panels ---------- */

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

function referenceOrbit() {
  if (lastLaunch) return lastLaunch;
  const s = matterState();
  return { L: s.L, E2: s.E2, r0: s.r0, gr: null };
}

function drawPotential() {
  const { ctx, w, h } = fit(potentialCanvas);
  if (!ctx) return;
  ctx.clearRect(0, 0, w, h);
  const ref = referenceOrbit();
  const L2 = ref.L * ref.L;
  const rLo = Math.max(rs * .55, .1);
  /* Zoom the r-axis onto the tracked orbit - in a 70-unit solar system the
     interesting potential structure sits within a few units of the Sun. */
  const xMax = Math.min(worldR, Math.max(ref.r0 * 2.4, rs * 10, 4));
  const Lm = 8, Rm = w - 8, Tm = 10, Bm = h - 16;
  const X = (r) => Lm + (Rm - Lm) * (r - rLo) / (xMax - rLo);

  const wGR = (r) => (1 - rs / r) * (1 + L2 / (r * r));
  const wN = (r) => 1 - rs / r + L2 / (r * r);

  /* Autoscale from the vacuum region only - inside a star the vacuum formula is meaningless. */
  const sLo = Math.max(rs * 1.001, surfaceRadius() * .999, rLo);
  let yMin = Infinity, yMax = -Infinity;
  for (let i = 0; i <= 160; i += 1) {
    const r = sLo + (xMax - sLo) * i / 160;
    const v = wGR(r);
    yMin = Math.min(yMin, v);
    yMax = Math.max(yMax, v);
  }
  yMax = Math.max(yMax, ref.E2) + .03;
  yMin -= .03;
  const Y = (v) => Tm + (Bm - Tm) * (1 - (v - yMin) / (yMax - yMin));

  ctx.fillStyle = "#f3f2ef";
  ctx.fillRect(Lm, Tm, Math.max(0, X(surfaceRadius()) - Lm), Bm - Tm);

  const curve = (fn, color, dashed) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = dashed ? 1.4 : 2.2;
    ctx.setLineDash(dashed ? [5, 4] : []);
    ctx.beginPath();
    let started = false;
    for (let i = 0; i <= 220; i += 1) {
      const r = rLo + (xMax - rLo) * i / 220;
      if (r <= rs * 1.001 && fn === wGR) continue;
      const v = fn(r);
      if (v > yMax + .2 || v < yMin - .2) { started = false; continue; }
      const px = X(r), py = Y(v);
      if (!started) { ctx.moveTo(px, py); started = true; }
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  };
  curve(wN, BLUE, true);
  curve(wGR, VIOLET, false);

  ctx.font = "650 8.5px Inter, sans-serif";
  for (const [r, tag, color] of [[1.5 * rs, "1.5rs", ORANGE], [3 * rs, "3rs", GREEN]]) {
    if (r <= surfaceRadius() || r >= xMax) continue;
    ctx.strokeStyle = color;
    ctx.globalAlpha = .55;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(X(r), Tm);
    ctx.lineTo(X(r), Bm);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.fillText(tag, X(r), Bm + 10);
  }

  ctx.strokeStyle = ORANGE;
  ctx.setLineDash([2, 3]);
  ctx.beginPath();
  ctx.moveTo(Lm, Y(ref.E2));
  ctx.lineTo(Rm, Y(ref.E2));
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = ORANGE;
  ctx.textAlign = "left";
  ctx.fillText("E²", Lm + 2, Y(ref.E2) - 4);

  const marker = ref.gr && !ref.gr.dead ? ref.gr.r : ref.r0;
  if (marker > rs && marker < xMax) {
    ctx.fillStyle = VIOLET;
    ctx.beginPath();
    ctx.arc(X(marker), Y(wGR(marker)), 4, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }

  ctx.fillStyle = SOFT;
  ctx.textAlign = "right";
  ctx.fillText("r →", Rm, Bm + 10);
}

function flashVerdict(cls, head, detail, seconds) {
  verdictBox.className = `verdict ${cls}`;
  verdictHead.textContent = head;
  verdictDetail.textContent = detail;
  flashUntil = performance.now() + seconds * 1000;
}

function baseVerdict() {
  if (performance.now() < flashUntil) return;
  const gr = lastLaunch && lastLaunch.gr && !lastLaunch.gr.dead ? lastLaunch.gr : null;
  if (!gr) {
    verdictBox.className = "verdict waiting";
    verdictHead.textContent = "Spacetime is ready";
    verdictDetail.textContent = "Launch matter or fire light - then read the geometry's answer off the lattice.";
    return;
  }
  if (gr.measuredAdv !== null) {
    const theory = 6 * Math.PI * M() * M() / (gr.L * gr.L) * DEG;
    verdictBox.className = "verdict";
    verdictHead.textContent = gr.planet
      ? `${gr.planet.name}'s orbit is a rosette, not an ellipse`
      : "The orbit is a rosette, not an ellipse";
    verdictDetail.textContent = gr.planet
      ? `Perihelion advances ${fmtDeg(Math.max(0, gr.measuredAdv))} per orbit here (weak-field formula: ${fmtDeg(theory)}). The real Mercury creeps just 43 arcseconds per century - yet explaining that leftover was the field equations' first triumph, in November 1915.`
      : `Perihelion advances ${fmtDeg(Math.max(0, gr.measuredAdv))} per orbit (weak-field formula says ${fmtDeg(theory)}). ${ghostOn ? "Newton's ghost, launched identically, closes its ellipse and repeats - the gap between the two curves is pure general relativity." : "Mercury does exactly this, by 43 arcseconds per century."}`;
    return;
  }
  if (gr.r < 3 * rs && gr.pr < 0) {
    verdictBox.className = "verdict danger";
    verdictHead.textContent = "Inside the ISCO - no stable orbit down here";
    verdictDetail.textContent = "Einstein's potential has no floor left: the pit near the mass swallows the centrifugal barrier and the particle spirals in. Newton's potential always has a floor - his ghost doesn't understand what the fuss is about.";
    return;
  }
  verdictBox.className = "verdict waiting";
  verdictHead.textContent = "First orbit in progress…";
  verdictDetail.textContent = "Watching for the perihelion to come around twice - that measures the precession live.";
}

function refreshPanels() {
  const ref = lastLaunch;
  const theoryAdv = ref ? 6 * Math.PI * M() * M() / (ref.L * ref.L) * DEG : null;
  byId("periTheory").textContent = ref ? fmtDeg(theoryAdv) : "-";
  const gr = ref && ref.gr;
  byId("periMeas").textContent = gr && gr.measuredAdv !== null ? fmtDeg(Math.max(0, gr.measuredAdv)) : "-";

  byId("bendB").textContent = lastBend ? `b = ${fmt(lastBend.b, 1)}` : "b = -";
  byId("bendTheory").textContent = lastBend ? fmtDeg(2 * rs / lastBend.b * DEG) : "-";
  byId("bendMeas").textContent = lastBend ? fmtDeg(lastBend.measured) : "-";

  byId("clockTheory").textContent = ref ? `×${fmt(Math.sqrt(Math.max(0, 1 - rs / ref.r0)), 3)}` : "-";
  byId("clockMeas").textContent = gr && !gr.dead && gr.t > 5 ? `×${fmt(gr.tau / gr.t, 3)}` : "-";

  byId("rsCell").textContent = fmt(rs);
  byId("psCell").textContent = fmt(1.5 * rs);
  byId("iscoCell").textContent = fmt(3 * rs);
  byId("landmarks").textContent = `rs = ${fmt(rs)} · photon sphere ${fmt(1.5 * rs)} · ISCO ${fmt(3 * rs)} (sim units)`;

  baseVerdict();
  drawPotential();
}

/* ---------- state changes ---------- */

function applyMass() {
  if (!renderer) { refreshPanels(); return; }
  disposeObject(cageGroup);
  cageGroup = null;
  buildWarpGrid();
  buildMarkers();
  buildCentralBody();
  layoutClocks();
  clampLauncher();
  const sc = SCENARIOS[scenario];
  byId("regimeTag").textContent = isBlackHole()
    ? `${sc.starR > 0 ? "collapsed star - now a" : ""} black hole · rs = ${fmt(rs)}`.trim()
    : `${sc.title.toLowerCase()} · rs/R = ${fmt(rs / starR)}`;
  refreshPanels();
}

let homeRadius = 26;

function applyScenario(key) {
  scenario = key;
  const sc = SCENARIOS[key];
  rs = sc.rs;
  starR = sc.starR;
  worldR = sc.world || 14;
  homeRadius = sc.view || 26;
  camTarget.set(0, 0, 0);
  radius = homeRadius;
  document.querySelectorAll(".scenario").forEach((button) => {
    button.classList.toggle("on", button.dataset.scenario === key);
  });
  byId("massSlider").value = rs;
  byId("massValue").textContent = `rₛ = ${fmt(rs)}`;
  byId("modeTitle").textContent = sc.title;
  byId("modeNote").textContent = sc.note;
  clearBodies();
  applyMass();
  if (key === "solar") spawnPlanets();
  else launchMatter();
}

byId("massSlider").addEventListener("input", () => {
  rs = Number(byId("massSlider").value);
  byId("massValue").textContent = `rₛ = ${fmt(rs)}`;
  if (starR > 0 && rs > BUCHDAHL * starR) collapse();
  else applyMass();
});

byId("speedSlider").addEventListener("input", () => {
  byId("speedValue").textContent = `${fmt(Number(byId("speedSlider").value))} × circular`;
  drawPotential();
});

byId("launchBtn").addEventListener("click", launchMatter);
byId("lightBtn").addEventListener("click", fireLight);
byId("clearBtn").addEventListener("click", () => {
  clearBodies();
  if (scenario === "solar") spawnPlanets();
});

byId("fsBtn").addEventListener("click", () => {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.querySelector(".bench-panel").requestFullscreen();
});

/* Bring the launch controls along into fullscreen, and put them back after. */
const benchPanel = document.querySelector(".bench-panel");
const simControls = document.querySelector(".sim-controls");
const controlsHome = simControls.parentElement;
const controlsNext = simControls.nextElementSibling;
document.addEventListener("fullscreenchange", () => {
  if (document.fullscreenElement === benchPanel) benchPanel.appendChild(simControls);
  else controlsHome.insertBefore(simControls, controlsNext);
  resize();
});

byId("homeBtn").addEventListener("click", () => {
  camTarget.set(0, 0, 0);
  yaw = .65;
  pitch = .52;
  radius = homeRadius;
});

byId("ghostBtn").addEventListener("click", () => {
  ghostOn = !ghostOn;
  byId("ghostBtn").classList.toggle("on", ghostOn);
  if (!ghostOn) {
    for (const body of bodies.filter((b) => b.kind === "newton")) removeBodyVisual(body);
    bodies = bodies.filter((b) => b.kind !== "newton");
  } else {
    for (const gr of bodies.filter((b) => b.kind === "gr" && !b.dead)) {
      const ghost = {
        kind: "newton", r: gr.r, pr: gr.pr, phi: gr.phi, L: gr.L,
        trail: [], dead: null, partner: gr, u: gr.u, v: gr.v, n: gr.n
      };
      makeBodyVisual(ghost);
      bodies.push(ghost);
    }
  }
});

document.querySelectorAll(".scenario").forEach((button) => {
  button.addEventListener("click", () => applyScenario(button.dataset.scenario));
});

/* ---------- main loop ---------- */

let raf = 0;
let last = 0;

function frame(now) {
  raf = requestAnimationFrame(frame);
  const dt = Math.min(.05, (now - last) / 1000);
  last = now;
  frameCount += 1;
  const simDt = dt * SIM_SPEED;

  const steps = Math.max(1, Math.ceil(simDt / STEP));
  const h = simDt / steps;
  for (const body of bodies) {
    for (let i = 0; i < steps && !body.dead; i += 1) {
      body.prevPr = body.pr;
      stepBody(body, h);
      handleEvents(body);
    }
    if (!body.dead) {
      bodyPosition(body, body.mesh.position);
      pushTrail(body);
    }
  }
  const dead = bodies.filter((b) => b.dead);
  for (const body of dead) {
    if (body.kind === "gr") {
      if (body.dead === "captured") {
        flashVerdict("danger", "Swallowed", `Inside rs every future points inward - the particle is gone. ${ghostOn ? "Newton's ghost sails on: his gravity has no point of no return, which is exactly what a horizon changes." : "Give the next launch more speed, or start farther out."}`, 6);
      } else if (body.dead === "crashed") {
        flashVerdict("classical", "Crashed into the star", "Orbit intersected the surface - matter with too little sideways speed just falls. Try a faster launch.", 5);
      } else if (body.dead === "escaped") {
        flashVerdict("classical", "Out of view", body.E2 >= 1
          ? "That launch was unbound - total energy above the rim of the potential. Slow it down to stay in orbit."
          : "Still bound, but its far turning point lies beyond the drawn region. Slow the launch a little to keep the whole orbit in view.", 5);
      }
    }
    removeBodyVisual(body, true);
  }
  if (dead.length) bodies = bodies.filter((b) => !b.dead);

  for (const relic of relics) {
    relic.life -= dt / 9;
    relic.line.material.opacity = relic.base * Math.max(0, relic.life);
  }
  const gone = relics.filter((r) => r.life <= 0);
  for (const relic of gone) {
    scene.remove(relic.line);
    relic.line.geometry.dispose();
    relic.line.material.dispose();
  }
  if (gone.length) relics = relics.filter((r) => r.life > 0);

  for (const clock of clocks) {
    if (clock.group.visible) clock.hand.rotation.y -= clockRate(clock.r) * dt * 2.4;
  }

  if (starMesh.visible) {
    const pulse = 1 + Math.sin(now * .0016) * .012;
    starMesh.scale.setScalar(starR * pulse);
  }
  if (collapsar) {
    collapsar.userData.life -= dt * 1.4;
    if (collapsar.userData.life <= 0) {
      /* Geometry is shared with starMesh - only the cloned material is ours to dispose. */
      collapsar.material.dispose();
      scene.remove(collapsar);
      collapsar = null;
    } else {
      const life = collapsar.userData.life;
      collapsar.scale.setScalar(Math.max(.01, collapsar.scale.x * (1 - dt * 2.6)));
      collapsar.material.emissiveIntensity = life;
      collapsar.material.opacity = life;
      collapsar.material.transparent = true;
    }
  }

  if (frameCount % 4 === 0) refreshPanels();
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
  } else {
    cancelAnimationFrame(raf);
  }
}

window.addEventListener("lesson:slide", (event) => setActive(event.detail.simulator === "well"));

initScene();
if (!renderer) {
  wellCanvas.hidden = true;
  byId("no3d").hidden = false;
} else {
  new ResizeObserver(resize).observe(wellCanvas);
}
applyScenario("bh");
setActive(document.querySelector(".slide.on")?.dataset.simulator === "well");
