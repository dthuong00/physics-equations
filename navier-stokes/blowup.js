/* Slide 07: a 3D drawing of the blow-up mechanism. A tube of swirling water is pulled along
   its axis by an outside push; it thins, spins faster, and the picture repeats at ever smaller
   scale. This is a sketch of the mechanism with an assumed result, not a computation of the
   equation. */
import * as THREE from "three";

const slide = document.querySelector('[data-simulator="blowup"]');
if (slide) {
  const t = (key, english, vars) => {
    if (window.I18N) return window.I18N.t(key, english, vars);
    return vars ? english.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? vars[name] : m)) : english;
  };
  const $ = (id) => document.getElementById(id);
  const reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- the assumed result ----
     push:    radius r = r0 (1 - t/T)^(1/2)  -> 0 at t = T, spin w = w0 (r0/r)^2 -> infinity
     no push: the tube thins until friction catches up, then smears out again           */
  const T = 8;                 // seconds to the blow-up in the push case
  const R0 = 1, W0 = 1;
  const state = { mode: "push", time: 0, active: false, looping: false, last: 0, follow: false, key: "" };

  function tube(time) {
    if (state.mode === "push") {
      const f = Math.max(0.012, 1 - time / T);
      const r = R0 * Math.sqrt(f);
      return { r, w: W0 * (R0 / r) ** 2, len: 2.2 / Math.sqrt(f) ** 0.5, energy: 1, blow: time >= T };
    }
    // no push: r falls to about a third, then friction wins and the tube widens and slows
    const dip = Math.exp(-time / 3), back = 1 - Math.exp(-Math.max(0, time - 3) / 2.5);
    const r = R0 * (1 - 0.65 * dip * (1 - back * 0.9) - 0.05) + 0.35 * back;
    const w = W0 * (R0 / r) ** 2 * Math.exp(-Math.max(0, time - 3) / 2);
    return { r, w, len: 2.2 + 0.6 * (1 - dip), energy: Math.exp(-time / 6), blow: false };
  }

  /* ---- three.js scene ---- */
  const canvas = $("blowCanvas");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setClearColor(0x070b16, 1);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1.9, 0.01, 100);
  camera.position.set(0, 2.0, 6.2);
  camera.lookAt(0, 0, 0);

  const N = 2200;
  const seeds = new Float32Array(N * 3);   // angle, z fraction (-0.5..0.5), radial jitter
  for (let i = 0; i < N; i += 1) {
    seeds[i * 3] = Math.random() * Math.PI * 2;
    seeds[i * 3 + 1] = Math.random() - 0.5;
    seeds[i * 3 + 2] = Math.random() < 0.8 ? 0.9 + Math.random() * 0.12 : Math.sqrt(Math.random()) * 0.9;
  }
  const positions = new Float32Array(N * 3);
  const colors = new Float32Array(N * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const points = new THREE.Points(geometry, new THREE.PointsMaterial({ size: 0.07, vertexColors: true, transparent: true, opacity: 0.95, sizeAttenuation: true }));
  scene.add(points);

  // helical streaks on the tube surface: the swirl you can actually see turning
  const HELICES = 10, SEG = 120;
  const helices = Array.from({ length: HELICES }, (_, k) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(SEG * 3), 3));
    const line = new THREE.Line(g, new THREE.LineBasicMaterial({ color: k % 2 ? 0xff8f4a : 0x4f8cff, transparent: true, opacity: 0.85 }));
    scene.add(line);
    return { line, phase: k * Math.PI * 2 / HELICES };
  });

  // the axis the tube is stretched along, and the two push arrows
  const axis = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, -3), new THREE.Vector3(0, 0, 3)]), new THREE.LineBasicMaterial({ color: 0x3a4460 }));
  scene.add(axis);
  const arrowMat = new THREE.MeshBasicMaterial({ color: 0xd95d39 });
  const arrows = [1, -1].map((dir) => {
    const g = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 10), arrowMat);
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.25, 12), arrowMat);
    shaft.position.y = 0.35; head.position.y = 0.82;
    g.add(shaft); g.add(head);
    g.rotation.x = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    scene.add(g);
    return { g, dir };
  });
  const grid = new THREE.GridHelper(8, 16, 0x1c2438, 0x141a2c);
  grid.position.y = -1.6;
  scene.add(grid);

  const hot = new THREE.Color(0xff8f4a), cool = new THREE.Color(0x4f8cff), pale = new THREE.Color(0xd8dce6);

  function layout(time) {
    const { r, w, len } = tube(time);
    const zoom = state.follow ? Math.max(r / R0, 0.012) : 1;       // follow the zoom: keep the tube the same size on screen
    const rr = r / zoom, ll = Math.min(len / zoom, 7);
    const spinPhase = Math.min(w, 60) * time * 0.5;
    for (let i = 0; i < N; i += 1) {
      const a = seeds[i * 3] + spinPhase * (1 + 0.2 * seeds[i * 3 + 2]);
      const zf = seeds[i * 3 + 1];
      const rad = rr * seeds[i * 3 + 2];
      positions[i * 3] = rad * Math.cos(a);
      positions[i * 3 + 1] = rad * Math.sin(a);
      positions[i * 3 + 2] = zf * ll;
      const heat = Math.min(1, Math.log10(w / W0 + 1) / 3);
      const c = cool.clone().lerp(hot, heat).lerp(pale, 0.15 * (1 - seeds[i * 3 + 2]));
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
    const twist = 2.5 + 2 * Math.min(4, Math.log10(w / W0 + 1));
    for (const { line, phase } of helices) {
      const arr = line.geometry.attributes.position.array;
      for (let j = 0; j < SEG; j += 1) {
        const zf = j / (SEG - 1) - 0.5, a = phase + spinPhase + zf * twist * Math.PI * 2;
        arr[j * 3] = rr * Math.cos(a); arr[j * 3 + 1] = rr * Math.sin(a); arr[j * 3 + 2] = zf * ll;
      }
      line.geometry.attributes.position.needsUpdate = true;
      line.material.opacity = 0.5 + 0.45 * Math.min(1, w / W0 / 20);
    }
    points.material.size = 0.02 + 0.03 * Math.min(1, rr);
    for (const { g, dir } of arrows) {
      g.visible = state.mode === "push";
      g.position.z = dir * (ll / 2 + 0.15);
    }
    scene.rotation.y = 0.9 + (reducedMotion ? 0 : time * 0.08);
  }

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight || w * 400 / 760;
    if (!w) return;
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    draw();
  }

  function draw() { layout(state.time); renderer.render(scene, camera); }

  /* ---- readouts ---- */
  const fmt = (v) => (v >= 1e6 ? "10" + sup(Math.round(Math.log10(v))) : v >= 1000 ? Math.round(v).toLocaleString("en-US").replace(/,/g, " ") : v >= 10 ? v.toFixed(0) : v.toFixed(1));
  const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
  const sup = (n) => String(n).split("").map((d) => SUP[+d]).join("");
  function updateCards(force) {
    const { r, w, energy, blow } = tube(state.time);
    const key = `${state.mode}|${state.time.toFixed(1)}|${blow}`;
    if (!force && key === state.key) return;
    state.key = key;
    $("bwWidth").textContent = t("js.blow.width", "{f} × the start", { f: (r / R0 < 0.01 ? (r / R0).toExponential(0) : (r / R0).toFixed(2)) });
    $("bwSpin").textContent = t("js.blow.spin", "{f} × the start", { f: fmt(w / W0) });
    $("bwEnergy").textContent = t("js.blow.energy", "{p} %", { p: Math.round(energy * 100) });
    $("bwTime").textContent = state.mode === "push" ? t("js.blow.timePush", "{s} s of {T} s", { s: Math.min(T, state.time).toFixed(1), T }) : t("js.blow.timeFree", "{s} s", { s: state.time.toFixed(1) });
    const card = $("bwVerdict");
    if (state.mode === "push") {
      card.className = "verdict" + (blow ? " wild" : "");
      card.querySelector("b").textContent = blow ? t("js.blow.vBlow", "Blow-up: width zero, spin infinite, energy still limited") : t("js.blow.vPush", "The push stretches the tube; thinner means faster spin");
      card.querySelector("span").textContent = blow ? t("js.blow.vBlowD", "This is what the proof says the equation can do when a smooth push is allowed. Real water would have shrunk to molecules long before.") : t("js.blow.vPushD", "Angular momentum is kept, so spin grows as 1 ∕ width². Each thinner, faster tube stretches harder still, and the picture repeats at a smaller scale.");
    } else {
      card.className = "verdict calm";
      card.querySelector("b").textContent = t("js.blow.vFree", "No push: friction catches up and the tube smears out");
      card.querySelector("span").textContent = t("js.blow.vFreeD", "The tube thins for a while, but with nothing feeding it, friction wins and the spin dies away. Whether this always happens in 3D is the open question.");
    }
  }

  function frame(now) {
    if (!state.active) { state.looping = false; return; }
    const dt = Math.min(0.05, Math.max(0, (now - state.last) / 1000));
    state.last = now;
    state.time += dt;
    if (state.mode === "push" && state.time > T + 2) state.time = 0;
    if (state.mode !== "push" && state.time > 14) state.time = 0;
    draw();
    updateCards();
    requestAnimationFrame(frame);
  }

  function setMode(mode) {
    state.mode = mode; state.time = 0;
    for (const b of slide.querySelectorAll(".bw-mode button")) b.classList.toggle("on", b.dataset.mode === mode);
    updateCards(true);
    if (!state.active) draw();
  }
  for (const b of slide.querySelectorAll(".bw-mode button")) b.addEventListener("click", () => setMode(b.dataset.mode));
  $("bwFollow").classList.remove("on");
  $("bwFollow").textContent = t("js.blow.followOff", "camera fixed");
  $("bwFollow").addEventListener("click", () => {
    state.follow = !state.follow;
    $("bwFollow").classList.toggle("on", state.follow);
    $("bwFollow").textContent = state.follow ? t("js.blow.followOn", "camera follows the zoom") : t("js.blow.followOff", "camera fixed");
  });
  $("bwRestart").addEventListener("click", () => { state.time = 0; updateCards(true); });

  function activate() {
    state.active = true;
    state.last = performance.now();
    resize();
    updateCards(true);
    if (!state.looping) { state.looping = true; requestAnimationFrame(frame); }
  }
  window.addEventListener("resize", () => { if (state.active) resize(); });
  window.addEventListener("i18n:change", () => {
    updateCards(true);
    $("bwFollow").textContent = state.follow ? t("js.blow.followOn", "camera follows the zoom") : t("js.blow.followOff", "camera fixed");
  });
  window.addEventListener("lesson:slide", (event) => {
    const active = event.detail.simulator === "blowup";
    if (active && !state.active) activate();
    else if (!active) state.active = false;
  });
  setMode("push");
  if (slide.classList.contains("on")) activate();
}
