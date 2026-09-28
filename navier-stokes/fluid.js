/* Flow-past-a-stone lab: drives FluidSolver, draws swirl and dye, and reads the two
   competing terms of the equation off the running field. */
(function () {
  "use strict";
  const slide = document.querySelector('[data-simulator="fluid"]');
  if (!slide || typeof FluidSolver === "undefined") return;
  const t = (key, english, vars) => {
    if (window.I18N) return window.I18N.t(key, english, vars);
    return vars ? english.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? vars[name] : m)) : english;
  };
  const $ = (id) => document.getElementById(id);
  const setText = (id, text) => { const el = $(id); if (el) el.textContent = text; };

  const W = 192, H = 128;
  const STONE_X = 48;
  const SERIES = 600;
  const fluid = new FluidSolver(W, H);
  fluid.dyeLanes = [];
  for (let j = 6; j < H - 4; j += 6) fluid.dyeLanes.push(j);

  const canvas = $("flowCanvas"), ctx = canvas.getContext("2d");
  const probeCanvas = $("probeCanvas"), pctx = probeCanvas.getContext("2d");
  const off = document.createElement("canvas");
  off.width = W; off.height = H;
  const octx = off.getContext("2d");
  const image = octx.createImageData(W, H);
  const vort = new Float32Array(W * H);

  const scenarios = {
    honey: {
      U: 0.6, nu: 5, D: 16,
      title: () => t("js.fluid.mode.honey.title", "Honey"),
      note: () => t("js.fluid.mode.honey.note", "Re ≈ 2. Friction is far bigger than carrying, so every swirl is wiped out as soon as it forms. The flow closes up behind the stone as smoothly as it opened."),
    },
    water: {
      U: 1.0, nu: 0.12, D: 14,
      title: () => t("js.fluid.mode.water.title", "Water"),
      note: () => t("js.fluid.mode.water.note", "Re ≈ 120. Carrying now beats friction in most of the flow. Two swirls form behind the stone; then one grows, breaks away, and the other follows on the opposite side. Give it a second or two."),
    },
    fast: {
      U: 1.2, nu: 0.006, D: 14,
      title: () => t("js.fluid.mode.fast.title", "Fast stream"),
      note: () => t("js.fluid.mode.fast.note", "Re in the thousands. The swirls that break off no longer stay neat: they stretch, join and break apart. In a real 3D stream this is where turbulence begins."),
    },
    big: {
      U: 1.0, nu: 0.12, D: 28,
      title: () => t("js.fluid.mode.big.title", "Big stone"),
      note: () => t("js.fluid.mode.big.note", "Same water, same speed, a stone twice as wide - and Re doubles. The street forms sooner and its swirls are twice the size, but D∕(U·T) stays near 0.2. Only the ratio matters."),
    },
    wing: {
      U: 1.2, nu: 0.012, D: 48, wing: true,
      title: () => t("js.fluid.mode.wing.title", "Aircraft"),
      note: () => t("js.fluid.mode.wing.note", "An aircraft-shaped block seen from above, at the highest Re this grid can reach. The wake behind it swings from side to side, as it does behind the stone - and that is honest for a blunt shape at Re ≈ 5 000. A real aircraft flies at Re ≈ 10⁸, is thin and streamlined, and its air stays attached to the wings: seen from above it would leave only a narrow trail behind the wingtips and tail. No slider here gets you there."),
    },
    storm: {
      U: 0, nu: 0.004, D: 0, stir: true, storm: true,
      title: () => t("js.fluid.mode.storm.title", "A storm"),
      note: () => t("js.fluid.mode.storm.note", "A storm seen from above, growing. Warm sea keeps feeding the swirl at its centre; the carrying term winds the cloud bands into spiral arms and keeps the eye clear; friction takes energy away. While the feed beats the friction, the storm grows. Turn viscosity up and friction wins."),
    },
    stir: {
      U: 0, nu: 0.05, D: 0, stir: true,
      title: () => t("js.fluid.mode.stir.title", "Stir and let go"),
      note: () => t("js.fluid.mode.stir.note", "No flow in, no stone: three swirls set going in a closed box and left alone. Carrying only moves energy around; friction only takes it away. Turn viscosity up and the energy falls faster."),
    },
  };

  const state = {
    scenario: "water", U: 1, nu: 0.12, D: 14, stir: false,
    view: "both", playing: true, slow: false, frame: 0, steps: 0,
    series: new Float32Array(SERIES), seriesLength: 0, seriesHead: 0,
    energy0: 1, probe: 0, active: false, shedding: null,
  };

  /* ---------- setup ---------- */

  /* an aircraft seen from above: body, swept wings, tail, all in grid cells; L is the body length */
  function planeInside(x0, y0, L) {
    return (x, y) => {
      const px = (x - x0) / L, py = (y - y0) / L;           // 0..1 along the body, 0 on its centre line
      if (px < 0 || px > 1) return false;
      const body = 0.045 * Math.sqrt(Math.max(0, Math.sin(Math.PI * Math.min(1, px * 1.08))));
      if (Math.abs(py) <= body) return true;
      const ay = Math.abs(py);
      // wings: swept back from 0.38 to 0.62 of the body at the root, tips further back
      const wingLead = 0.38 + 0.9 * ay, wingTrail = 0.62 + 0.55 * ay;
      if (ay <= 0.36 && px >= wingLead && px <= wingTrail) return true;
      // tail
      const tailLead = 0.86 + 0.7 * ay, tailTrail = 0.99 + 0.2 * ay;
      return ay <= 0.12 && px >= tailLead && px <= tailTrail;
    };
  }

  function applyScenario(name) {
    const s = scenarios[name];
    state.scenario = name;
    state.U = s.U; state.nu = s.nu; state.D = s.D; state.stir = !!s.stir; state.wing = !!s.wing; state.storm = !!s.storm;
    $("viscSlider").value = Math.log10(s.nu).toFixed(2);
    slide.querySelectorAll(".u-row").forEach((row) => { row.hidden = state.stir; });
    $("sensorPanel").hidden = state.stir || state.wing;
    slide.querySelectorAll(".stone-only").forEach((el) => { el.hidden = state.stir || state.wing; });
    document.querySelectorAll(".scenario").forEach((b) => b.classList.toggle("on", b.dataset.scenario === name));
    applyScenarioLabels();
    reset();
  }

  function applyScenarioLabels() {
    const s = scenarios[state.scenario];
    $("benchTitle").textContent = state.storm ? t("js.fluid.bench.storm", "A storm, from above")
      : state.stir ? t("js.fluid.bench.box", "A closed box of water")
      : state.wing ? t("js.fluid.bench.plane", "Air past an aircraft")
      : t("js.fluid.bench.stone", "Flow past a stone");
    $("modeTitle").textContent = s.title();
    $("modeNote").textContent = s.note();
  }

  function reset() {
    fluid.inflow = state.stir ? 0 : state.U;
    fluid.nu = state.nu;
    if (state.wing) fluid.setObstacleShape(planeInside(STONE_X - 4, H / 2 + 0.3, state.D));
    else fluid.setObstacle(STONE_X, H / 2 + 0.3, state.stir ? 0 : state.D / 2);
    fluid.clear();
    if (state.storm) {
      const cx = 96, cy = 64;
      fluid.addVortex(cx, cy, 11, 3.0);
      fluid.addVortex(cx, cy, 28, 1.0);
      for (let arm = 0; arm < 3; arm += 1) {
        for (let k = 0; k < 22; k += 1) {
          const a = arm * 2.094 + k * 0.2, r = 7 + k * 1.4;
          fluid.addDyeBlob(cx + r * Math.cos(a), cy + r * Math.sin(a), 2.6 + k * 0.05, 0.9);
        }
      }
      state.energy0 = fluid.termSizes().energy;
    } else if (state.stir) {
      fluid.addVortex(62, 60, 15, 2.6);
      fluid.addVortex(104, 52, 15, 2.6);
      fluid.addVortex(140, 84, 12, -2.2);
      fluid.addDyeBlob(62, 60, 15, 1);
      fluid.addDyeBlob(104, 52, 15, 1);
      fluid.addDyeBlob(140, 84, 12, 1);
      state.energy0 = fluid.termSizes().energy;
    }
    state.probe = fluid.idx(Math.min(W - 3, Math.round(STONE_X + (state.wing ? state.D + 8 : 2 * Math.max(state.D, 8)))), H / 2 | 0);
    state.seriesLength = 0; state.seriesHead = 0; state.steps = 0; state.shedding = null;
    updateReadouts();
    render();
    updateNumbers();
  }

  function updateReadouts() {
    setText("sbU", t("js.fluid.speed", "{u} m/s", { u: state.U.toFixed(2) }));
    setText("sbD", t("js.fluid.sizeMm", "{d} mm", { d: state.D }));
    const mm2 = state.nu * 1000;
    $("viscValue").textContent = t("js.fluid.visc", "{v} mm²/s", { v: mm2 >= 100 ? mm2.toFixed(0) : mm2 >= 10 ? mm2.toFixed(1) : mm2.toPrecision(2) });
  }

  const reynolds = () => state.stir ? NaN : state.U * state.D / state.nu;

  /* ---------- time stepping ---------- */

  function stepOnce() {
    if (state.storm) {
      const energy = fluid.termSizes().energy;
      if (energy < 1.6 * state.energy0) fluid.addVortex(96, 64, 9, 0.045);   // the sea keeps paying in
      if (state.steps % 24 === 0) {                                          // and new cloud keeps forming on the arms
        for (let arm = 0; arm < 3; arm += 1) {
          const a = arm * 2.094 - state.steps * 0.012, r = 34;
          fluid.addDyeBlob(96 + r * Math.cos(a), 64 + r * Math.sin(a), 3, 0.7);
        }
      }
    }
    fluid.step();
    state.steps++;
    const v = fluid.v[state.probe];
    state.series[state.seriesHead] = v;
    state.seriesHead = (state.seriesHead + 1) % SERIES;
    if (state.seriesLength < SERIES) state.seriesLength++;
  }

  function frame() {
    if (!state.active) return;
    state.frame++;
    if (state.playing && (!state.slow || state.frame % 4 === 0)) {
      stepOnce();
      if (state.steps % 6 === 0) updateNumbers();
    }
    render();
    requestAnimationFrame(frame);
  }

  /* ---------- diagnostics ---------- */

  function seriesAt(i) { return state.series[(state.seriesHead - state.seriesLength + i + 2 * SERIES) % SERIES]; }

  function analyseShedding() {
    const n = state.seriesLength;
    if (n < 120) return null;
    let mean = 0;
    for (let i = 0; i < n; i++) mean += seriesAt(i);
    mean /= n;
    let amp = 0;
    const crossings = [];
    let prev = seriesAt(0) - mean;
    for (let i = 1; i < n; i++) {
      const cur = seriesAt(i) - mean;
      if (Math.abs(cur) > amp) amp = Math.abs(cur);
      if (prev < 0 && cur >= 0) crossings.push(i);
      prev = cur;
    }
    const scale = Math.max(state.U, 0.2);
    if (amp < 0.03 * scale || crossings.length < 3) return { amp, period: NaN };
    const recent = crossings.slice(-6);
    const period = (recent[recent.length - 1] - recent[0]) / (recent.length - 1);
    return { amp, period };
  }

  function fmt(x, digits) {
    if (!Number.isFinite(x)) return "-";
    if (Math.abs(x) >= 1000) return Math.round(x).toLocaleString("en-US");
    return x.toPrecision(digits || 3).replace(/\.?0+$/, "");
  }

  function updateNumbers() {
    const terms = fluid.termSizes();
    const re = reynolds();
    const shed = state.stir ? null : analyseShedding();
    state.shedding = shed;
    $("stepTag").textContent = t("js.fluid.time", "{s} s", { s: (state.steps / 1000).toFixed(2) });
    $("reTag").textContent = state.stir ? t("js.fluid.noInflow", "closed box") : t("js.fluid.reTag", "Re ≈ {re}", { re: fmt(re, 3) });
    setText("sbRe", fmt(re, 3));
    setText("sbInertia", fmt(terms.inertia, 3));
    setText("sbViscous", fmt(terms.viscous, 3));
    setText("sbRatio", terms.viscous > 0 ? fmt(terms.inertia / terms.viscous, 3) : "-");
    setText("sbVort", fmt(terms.maxVorticity, 3));
    const period = shed && Number.isFinite(shed.period) ? shed.period : NaN;
    setText("sbPeriod", Number.isFinite(period) ? t("js.fluid.steps", "{n} ms", { n: period.toFixed(0) }) : (state.stir ? "-" : t("js.fluid.steady", "steady")));
    setText("sbSt", Number.isFinite(period) ? (state.D / (state.U * period)).toFixed(2) : "-");
    setText("sbEnergy", state.stir ? `${(100 * terms.energy / state.energy0).toFixed(0)} %` : "-");
    updateVerdict(re, period, terms);
  }

  function updateVerdict(re, period, terms) {
    const box = $("verdict"), head = $("verdictHead"), detail = $("verdictDetail");
    box.className = "verdict";
    if (state.storm) {
      box.classList.add("decay");
      const pct = (100 * terms.energy / state.energy0).toFixed(0);
      if (Number(pct) >= 100) {
        head.textContent = t("js.fluid.v.storm.head", "The storm is growing: {pct} % of its starting energy", { pct });
        detail.textContent = t("js.fluid.v.storm.detail", "The centre is being fed faster than friction can drain it, so the swirl spreads and the cloud winds into arms. Turn viscosity up until friction wins.");
      } else {
        head.textContent = t("js.fluid.v.stormDying.head", "Friction is winning: the storm has {pct} % of its energy left", { pct });
        detail.textContent = t("js.fluid.v.stormDying.detail", "At this viscosity friction drains energy faster than the centre is fed. Lower the viscosity and the storm grows again.");
      }
      return;
    }
    if (state.stir) {
      box.classList.add("decay");
      const pct = (100 * terms.energy / state.energy0).toFixed(0);
      head.textContent = t("js.fluid.v.decay.head", "Friction is using up the energy: {pct} % left", { pct });
      detail.textContent = t("js.fluid.v.decay.detail", "The carrying term only moves swirl around - watch two swirls circle and join. Friction only takes it away. With nothing pushing, the total can only fall, and faster for a thicker fluid.");
      return;
    }
    if (re < 5) {
      box.classList.add("calm");
      head.textContent = t("js.fluid.v.honey.head", "Honey: friction wins completely");
      detail.textContent = t("js.fluid.v.honey.detail", "The flow closes up behind the stone as smoothly as it opened. Played backwards it would look the same, and no waiting will make it swing - the friction term is bigger than the carrying term almost everywhere.");
    } else if (re < 47) {
      box.classList.add("calm");
      head.textContent = t("js.fluid.v.pair.head", "Two swirls sit still behind the stone");
      detail.textContent = t("js.fluid.v.pair.detail", "The carrying term is strong enough to leave a pair of swirls behind the stone, but friction holds them in place. The sensor line stays flat. Below Re ≈ 47 this is as far as it goes.");
    } else if (!Number.isFinite(period)) {
      head.textContent = t("js.fluid.v.wait.head", "Waiting for the flow to choose");
      detail.textContent = t("js.fluid.v.wait.detail", "By the numbers the carrying term can win here, but the flow is still the same on top and bottom. A tiny error in the numbers is growing behind the stone. Watch the sensor line.");
    } else if (re < 400) {
      head.textContent = t("js.fluid.v.street.head", "Vortex street: the flow swings by itself");
      detail.textContent = t("js.fluid.v.street.detail", "Swirls break off from top and bottom in turn, one every {T} ms, with nothing shaking the stone.", { T: period.toFixed(0), st: (state.D / (state.U * period)).toFixed(2) });
    } else {
      box.classList.add("wild");
      head.textContent = t("js.fluid.v.wild.head", "Carrying wins: the flow turns messy");
      detail.textContent = t("js.fluid.v.wild.detail", "Friction can no longer smooth the small swirls away before new ones form. In three dimensions this is where turbulence would start. Here the grid decides how small the swirls can get.");
    }
  }

  /* ---------- drawing ---------- */

  function render() {
    fluid.vorticity(vort);
    const data = image.data;
    const showSwirl = state.view !== "dye", showDye = state.view !== "swirl";
    const wref = state.stir ? 0.18 : 0.32 * Math.max(state.U, 0.45);
    const { dye, solid } = fluid;
    for (let k = 0; k < W * H; k++) {
      let r = 7, g = 11, b = 22;
      if (solid[k]) { r = 185; g = 188; b = 198; }
      else {
        if (showSwirl) {
          const s = Math.max(-1, Math.min(1, vort[k] / wref));
          const a = Math.abs(s) ** 0.8;
          if (s > 0) { r += (255 - r) * a; g += (143 - g) * a; b += (74 - b) * a; }
          else { r += (79 - r) * a; g += (140 - g) * a; b += (255 - b) * a; }
        }
        if (showDye) {
          const a = Math.min(1, dye[k]) * 0.85;
          r += (216 - r) * a; g += (221 - g) * a; b += (233 - b) * a;
        }
      }
      const p = k * 4;
      data[p] = r; data[p + 1] = g; data[p + 2] = b; data[p + 3] = 255;
    }
    octx.putImageData(image, 0, 0);

    const cw = canvas.width, ch = canvas.height;
    if (!cw || !ch) return;
    const scale = Math.min(cw / W, ch / H);
    const dw = W * scale, dh = H * scale, ox = (cw - dw) / 2, oy = (ch - dh) / 2;
    ctx.fillStyle = "#070b16";
    ctx.fillRect(0, 0, cw, ch);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(off, ox, oy, dw, dh);

    if (fluid.obstacle) {
      const { cx, cy, radius } = fluid.obstacle;
      ctx.beginPath();
      ctx.arc(ox + cx * scale, oy + cy * scale, radius * scale, 0, Math.PI * 2);
      ctx.fillStyle = "#b9bcc6"; ctx.fill();
      ctx.lineWidth = Math.max(1, scale * 0.35); ctx.strokeStyle = "#e6e8ee"; ctx.stroke();
    }
    if (!state.stir) {
      const px = state.probe % W, py = (state.probe / W) | 0;
      ctx.beginPath();
      ctx.arc(ox + (px + 0.5) * scale, oy + (py + 0.5) * scale, Math.max(2.5, scale * 0.9), 0, Math.PI * 2);
      ctx.fillStyle = "#3ccf8a"; ctx.fill();
      ctx.lineWidth = 1.2; ctx.strokeStyle = "#0b2a1c"; ctx.stroke();
    }
    const dpr = window.devicePixelRatio || 1;
    ctx.font = `700 ${11 * dpr}px Inter, sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,.72)";
    ctx.textBaseline = "top";
    const label = state.storm
      ? t("js.fluid.label.storm", "a growing storm, from above")
      : state.stir
      ? t("js.fluid.label.stir", "closed box · no flow in")
      : t("js.fluid.label.flow", "flow → · Re ≈ {re}", { re: fmt(reynolds(), 3) });
    ctx.fillText(label, ox + 10 * dpr, oy + 8 * dpr);
    drawProbe();
  }

  function drawProbe() {
    const w = probeCanvas.width, h = probeCanvas.height;
    if (!w || !h) return;
    pctx.clearRect(0, 0, w, h);
    const dpr = window.devicePixelRatio || 1;
    const padL = 8 * dpr, padR = 8 * dpr, padT = 10 * dpr, padB = 16 * dpr;
    const iw = w - padL - padR, ih = h - padT - padB;
    let peak = 0.05 * Math.max(state.U, 0.3);
    for (let i = 0; i < state.seriesLength; i++) peak = Math.max(peak, Math.abs(seriesAt(i)));
    const y0 = padT + ih / 2;
    pctx.strokeStyle = "#dedfe3"; pctx.lineWidth = 1;
    pctx.beginPath(); pctx.moveTo(padL, y0); pctx.lineTo(padL + iw, y0); pctx.stroke();
    if (state.stir) {
      pctx.fillStyle = "#92949a"; pctx.font = `600 ${10 * dpr}px Inter, sans-serif`; pctx.textBaseline = "middle";
      pctx.fillText(t("js.fluid.probe.none", "no stone, so nothing to measure here - watch the energy row instead"), padL + 4 * dpr, y0);
      return;
    }
    if (state.seriesLength > 1) {
      pctx.strokeStyle = state.shedding && Number.isFinite(state.shedding.period) ? "#d95d39" : "#315a9f";
      pctx.lineWidth = 1.6 * dpr;
      pctx.beginPath();
      for (let i = 0; i < state.seriesLength; i++) {
        const x = padL + iw * (SERIES - state.seriesLength + i) / (SERIES - 1);
        const y = y0 - (seriesAt(i) / peak) * (ih / 2);
        if (i === 0) pctx.moveTo(x, y); else pctx.lineTo(x, y);
      }
      pctx.stroke();
    }
    pctx.fillStyle = "#92949a"; pctx.font = `600 ${9 * dpr}px Inter, sans-serif`; pctx.textBaseline = "alphabetic";
    pctx.fillText(`±${peak.toFixed(2)}`, padL, padT - 2 * dpr + 7 * dpr);
    pctx.textAlign = "right";
    pctx.fillText(t("js.fluid.probe.axis", "last {n} s →", { n: (SERIES / 1000).toFixed(1) }), w - padR, h - 4 * dpr);
    pctx.textAlign = "left";
  }

  /* ---------- sizing ---------- */

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width) {
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
    }
    const prect = probeCanvas.getBoundingClientRect();
    if (prect.width) {
      probeCanvas.width = Math.round(prect.width * dpr);
      probeCanvas.height = Math.round(prect.height * dpr);
    }
    render();
  }
  new ResizeObserver(resize).observe(canvas);
  new ResizeObserver(resize).observe(probeCanvas);
  window.addEventListener("resize", resize);

  /* ---------- controls ---------- */

  document.querySelectorAll(".scenario").forEach((b) => b.addEventListener("click", () => applyScenario(b.dataset.scenario)));

  $("viscSlider").addEventListener("input", (e) => {
    state.nu = 10 ** Number(e.target.value);
    fluid.nu = state.nu;
    updateReadouts();
  });

  const playBtn = $("playBtn");
  playBtn.addEventListener("click", () => {
    state.playing = !state.playing;
    playBtn.textContent = state.playing ? t("js.fluid.pause", "⏸ Pause") : t("js.fluid.play", "▶ Play");
  });
  const slowBtn = $("slowBtn");
  slowBtn.addEventListener("click", () => {
    state.slow = !state.slow;
    slowBtn.classList.toggle("on", state.slow);
  });
  $("resetBtn").addEventListener("click", reset);

  const bench = slide.querySelector(".flow-bench");
  $("fsBtn").addEventListener("click", () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (bench.requestFullscreen) bench.requestFullscreen();
  });
  document.addEventListener("fullscreenchange", () => setTimeout(resize, 50));

  window.addEventListener("i18n:change", () => {
    const s = scenarios[state.scenario];
    applyScenarioLabels();
    $("modeTitle").textContent = s.title();
    $("modeNote").textContent = s.note();
    playBtn.textContent = state.playing ? t("js.fluid.pause", "⏸ Pause") : t("js.fluid.play", "▶ Play");
    updateReadouts();
    updateNumbers();
  });

  window.addEventListener("lesson:slide", (event) => {
    const active = event.detail.simulator === "fluid";
    if (active && !state.active) {
      state.active = true;
      resize();
      requestAnimationFrame(frame);
    } else if (!active) {
      state.active = false;
    }
  });

  applyScenario("water");
  if (slide.classList.contains("on")) {
    state.active = true;
    resize();
    requestAnimationFrame(frame);
  }
}());
