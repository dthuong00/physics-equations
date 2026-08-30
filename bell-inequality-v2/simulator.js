(function () {
  "use strict";

  const RAD = Math.PI / 180;
  const SETTINGS = [
    { a: 0, b: 22.5, sign: +1 },
    { a: 0, b: 67.5, sign: -1 },
    { a: 45, b: 22.5, sign: +1 },
    { a: 45, b: 67.5, sign: +1 },
  ];
  const C = {
    violet: "#5552b9", orange: "#d95d39", blue: "#315a9f", green: "#21805a",
    ink: "#1b1d20", muted: "#65676d", soft: "#92949a", line: "#dedfe3", wash: "#f5f5f3",
  };
  const MODE_NOTES = {
    quantum: ["Quantum world", "No answer sheets on board. Alice's photon decides at random at her filter; the shared state then makes Bob's photon agree with probability cos²(α − β). Prediction: dots on the violet cosine, and S ≈ 2.83."],
    hidden: ["Einstein's world (hidden plan)", "Each pair leaves the source with a shared secret angle λ and a fixed rule: pass if the filter is within 45° of λ. Answers pre-exist and nothing travels between the labs - local realism, honestly simulated. Prediction: dots on the orange line, and S ≈ 2 at best."],
  };

  const $ = (id) => document.getElementById(id);
  const bench = $("benchCanvas"), chart = $("chartCanvas");
  if (!bench || !chart) return;
  const bctx = bench.getContext("2d"), cctx = chart.getContext("2d");

  let world = "quantum";
  let alpha = 0, beta = 22.5;
  let counts = { pp: 0, pm: 0, mp: 0, mm: 0 };
  let buckets = new Map();
  let stats = SETTINGS.map(() => ({ n: 0, sum: 0 }));
  let photons = [];
  let flashes = { A: null, B: null };
  let running = false, active = false, rafId = 0;
  let hover = null;

  const fold = (a, b) => { const d = Math.abs(a - b) % 180; return d > 90 ? 180 - d : d; };
  const quantumE = (t) => Math.cos(2 * t * RAD);
  const planE = (t) => 1 - t / 45;
  const fmtE = (e) => (e >= 0 ? "+" : "−") + Math.abs(e).toFixed(2);

  function measure() {
    if (world === "quantum") {
      const A = Math.random() < 0.5 ? 1 : -1;
      const c = Math.cos((alpha - beta) * RAD);
      return [A, Math.random() < c * c ? A : -A];
    }
    const lam = Math.random() * 180;
    return [
      Math.cos(2 * (alpha - lam) * RAD) >= 0 ? 1 : -1,
      Math.cos(2 * (beta - lam) * RAD) >= 0 ? 1 : -1,
    ];
  }

  function recordPairs(n, animate) {
    let pp = 0, pm = 0, mp = 0, mm = 0, last = null;
    for (let i = 0; i < n; i++) {
      const r = measure();
      if (r[0] > 0) { if (r[1] > 0) pp++; else pm++; } else { if (r[1] > 0) mp++; else mm++; }
      last = r;
    }
    counts.pp += pp; counts.pm += pm; counts.mp += mp; counts.mm += mm;
    const sum = pp + mm - pm - mp;
    const key = Math.round(fold(alpha, beta) * 2);
    const bk = buckets.get(key) || { n: 0, sum: 0 };
    bk.n += n; bk.sum += sum; buckets.set(key, bk);
    const si = SETTINGS.findIndex((s) => Math.abs(s.a - alpha) < 0.26 && Math.abs(s.b - beta) < 0.26);
    if (si >= 0) { stats[si].n += n; stats[si].sum += sum; }
    if (animate) spawn(n === 1 ? 1 : Math.min(n, 24), n === 1 ? last : null);
    refresh();
  }

  function spawn(count, exact) {
    for (let i = 0; i < count; i++) {
      const r = exact || measure(); // cosmetic draw only, not recorded
      photons.push({ t: -i * 0.09, A: r[0], B: r[1] });
    }
  }

  // ---------- bench ----------

  function fit(canvas, ctx) {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w, h };
  }

  function stepPhotons() {
    for (const p of photons) {
      const t0 = p.t;
      p.t += 0.03;
      if (t0 < 1 && p.t >= 1) {
        flashes.A = { res: p.A, ttl: 28, max: 28 };
        flashes.B = { res: p.B, ttl: 28, max: 28 };
      }
    }
    photons = photons.filter((p) => p.t < (p.A > 0 || p.B > 0 ? 1.45 : 1.03));
    for (const side of ["A", "B"]) {
      const f = flashes[side];
      if (f && --f.ttl <= 0) flashes[side] = null;
    }
  }

  function drawAnalyzer(x, cy, r, deg, name, readout) {
    bctx.save();
    bctx.translate(x, cy);
    bctx.fillStyle = "#fff"; bctx.strokeStyle = C.line; bctx.lineWidth = 1.5;
    bctx.beginPath(); bctx.arc(0, 0, r, 0, 7); bctx.fill(); bctx.stroke();
    bctx.rotate(deg * RAD);
    bctx.strokeStyle = "#d3d4d9"; bctx.lineWidth = 1.2;
    for (const f of [-0.66, -0.33, 0.33, 0.66]) {
      const half = Math.sqrt(1 - f * f) * (r - 3);
      bctx.beginPath(); bctx.moveTo(f * r, -half); bctx.lineTo(f * r, half); bctx.stroke();
    }
    bctx.strokeStyle = C.ink; bctx.lineWidth = 2.4; bctx.lineCap = "round";
    bctx.beginPath(); bctx.moveTo(0, -r + 3); bctx.lineTo(0, r - 3); bctx.stroke();
    bctx.restore();
    bctx.strokeStyle = C.soft; bctx.lineWidth = 1.5;
    bctx.beginPath(); bctx.moveTo(x, cy - r - 5); bctx.lineTo(x, cy - r + 1); bctx.stroke();
    bctx.fillStyle = C.ink; bctx.font = "700 11px Inter,sans-serif"; bctx.textAlign = "center";
    bctx.fillText(name, x, cy - r - 14);
    bctx.fillStyle = C.muted; bctx.font = "11px Inter,sans-serif";
    bctx.fillText(readout, x, cy + r + 18);
  }

  function drawBench() {
    const { w, h } = fit(bench, bctx);
    bctx.clearRect(0, 0, w, h);
    const cy = h * 0.47, cx = w / 2;
    const r = Math.min(32, h * 0.18);
    const ax = Math.max(w * 0.17, r + 46), bx = w - ax;
    const adx = ax - r - 30, bdx = bx + r + 30;

    bctx.strokeStyle = C.line; bctx.lineWidth = 1.5;
    bctx.beginPath(); bctx.moveTo(adx, cy); bctx.lineTo(bdx, cy); bctx.stroke();

    for (const dx of [adx, bdx]) {
      bctx.fillStyle = C.wash; bctx.strokeStyle = C.soft; bctx.lineWidth = 1.3;
      bctx.beginPath();
      bctx.roundRect ? bctx.roundRect(dx - 9, cy - 15, 18, 30, 4) : bctx.rect(dx - 9, cy - 15, 18, 30);
      bctx.fill(); bctx.stroke();
    }

    bctx.save();
    bctx.translate(cx, cy); bctx.rotate(Math.PI / 4);
    bctx.fillStyle = "#eeeeff"; bctx.strokeStyle = C.violet; bctx.lineWidth = 1.5;
    bctx.fillRect(-9, -9, 18, 18); bctx.strokeRect(-9, -9, 18, 18);
    bctx.restore();
    bctx.fillStyle = C.soft; bctx.font = "italic 10px Georgia,serif"; bctx.textAlign = "center";
    bctx.fillText("pair source", cx, cy + 27);
    bctx.fillText(world === "hidden" ? "every pair carries a secret plan λ" : "no plan on board - one shared state", cx, cy + 41);

    drawAnalyzer(ax, cy, r, alpha, "Alice", "α = " + alpha + "°");
    drawAnalyzer(bx, cy, r, beta, "Bob", "β = " + beta + "°");

    for (const p of photons) {
      if (p.t < 0) continue;
      const sides = [[-1, p.A, ax, adx], [1, p.B, bx, bdx]];
      for (const [dir, res, px, dx] of sides) {
        let x;
        if (p.t < 1) {
          x = cx + (px - dir * r - cx) * p.t;
        } else if (res > 0) {
          const start = px + dir * r;
          x = start + (dx - start) * ((p.t - 1) / 0.45);
        } else {
          continue;
        }
        bctx.fillStyle = p.t < 1 ? C.orange : C.green;
        bctx.beginPath(); bctx.arc(x, cy, 3.2, 0, 7); bctx.fill();
      }
    }

    for (const [side, px] of [["A", ax], ["B", bx]]) {
      const f = flashes[side];
      if (!f) continue;
      const fade = f.ttl / f.max;
      const color = f.res > 0 ? C.green : C.orange;
      bctx.globalAlpha = fade * 0.9;
      bctx.strokeStyle = color; bctx.lineWidth = 2.5;
      bctx.beginPath(); bctx.arc(px, cy, r + 4, 0, 7); bctx.stroke();
      bctx.fillStyle = color; bctx.font = "800 14px Inter,sans-serif"; bctx.textAlign = "center";
      bctx.fillText(f.res > 0 ? "+1" : "−1", px, cy - r - 26 - (1 - fade) * 10);
      bctx.globalAlpha = 1;
    }
  }

  // ---------- chart ----------

  function drawChart() {
    const { w, h } = fit(chart, cctx);
    cctx.clearRect(0, 0, w, h);
    const L = 40, R = 12, T = 12, B = 32;
    const pw = w - L - R, ph = h - T - B;
    const X = (t) => L + (t / 90) * pw;
    const Y = (e) => T + ((1 - e) / 2) * ph;

    cctx.strokeStyle = "#ececee"; cctx.lineWidth = 1;
    cctx.fillStyle = C.soft; cctx.font = "9.5px Inter,sans-serif";
    for (const e of [1, 0.5, 0, -0.5, -1]) {
      cctx.beginPath(); cctx.moveTo(L, Y(e)); cctx.lineTo(L + pw, Y(e)); cctx.stroke();
      cctx.textAlign = "right"; cctx.fillText((e > 0 ? "+" : "") + e, L - 5, Y(e) + 3);
    }
    for (const t of [0, 22.5, 45, 67.5, 90]) {
      cctx.beginPath(); cctx.moveTo(X(t), T); cctx.lineTo(X(t), T + ph); cctx.stroke();
      cctx.textAlign = "center"; cctx.fillText(t + "°", X(t), h - 16);
    }
    cctx.fillStyle = C.muted; cctx.font = "italic 10px Georgia,serif"; cctx.textAlign = "center";
    cctx.fillText("tilt between the filters, θ", L + pw / 2, h - 4);

    const now = fold(alpha, beta);
    cctx.strokeStyle = C.soft; cctx.setLineDash([3, 4]); cctx.lineWidth = 1.2;
    cctx.beginPath(); cctx.moveTo(X(now), T); cctx.lineTo(X(now), T + ph); cctx.stroke();
    cctx.setLineDash([]);

    cctx.strokeStyle = C.orange; cctx.lineWidth = 2.1; cctx.lineCap = "round";
    cctx.beginPath(); cctx.moveTo(X(0), Y(1)); cctx.lineTo(X(90), Y(-1)); cctx.stroke();

    cctx.strokeStyle = C.violet; cctx.lineWidth = 2.3; cctx.lineJoin = "round";
    cctx.beginPath();
    for (let t = 0; t <= 90; t += 1.5) {
      const x = X(t), y = Y(quantumE(t));
      t === 0 ? cctx.moveTo(x, y) : cctx.lineTo(x, y);
    }
    cctx.stroke();

    for (const [key, bk] of buckets) {
      const t = key / 2, e = bk.sum / bk.n;
      const rad = 3 + Math.min(3.5, Math.log10(bk.n + 1));
      cctx.fillStyle = C.blue; cctx.strokeStyle = "#fff"; cctx.lineWidth = 2;
      cctx.beginPath(); cctx.arc(X(t), Y(e), rad, 0, 7); cctx.fill(); cctx.stroke();
    }

    if (hover !== null) {
      const t = hover;
      cctx.strokeStyle = C.muted; cctx.lineWidth = 1;
      cctx.beginPath(); cctx.moveTo(X(t), T); cctx.lineTo(X(t), T + ph); cctx.stroke();
      const bk = buckets.get(Math.round(t * 2));
      const lines = [
        "θ = " + t.toFixed(1) + "°",
        "quantum  " + fmtE(quantumE(t)),
        "plan  " + fmtE(planE(t)),
      ];
      if (bk) lines.push("you  " + fmtE(bk.sum / bk.n) + "  (n " + bk.n.toLocaleString() + ")");
      cctx.font = "10px Inter,sans-serif";
      const bw = Math.max(...lines.map((s) => cctx.measureText(s).width)) + 16;
      const bh = lines.length * 14 + 10;
      let bx0 = X(t) + 10;
      if (bx0 + bw > w - 4) bx0 = X(t) - bw - 10;
      const by0 = T + 6;
      cctx.fillStyle = "rgba(255,255,255,.96)"; cctx.strokeStyle = C.line;
      cctx.beginPath();
      cctx.roundRect ? cctx.roundRect(bx0, by0, bw, bh, 6) : cctx.rect(bx0, by0, bw, bh);
      cctx.fill(); cctx.stroke();
      cctx.textAlign = "left";
      lines.forEach((s, i) => {
        cctx.fillStyle = i === 0 ? C.ink : [C.ink, C.violet, C.orange, C.blue][i];
        cctx.fillText(s, bx0 + 8, by0 + 17 + i * 14);
      });
    }
  }

  chart.addEventListener("mousemove", (e) => {
    const rect = chart.getBoundingClientRect();
    const L = 40, pw = chart.clientWidth - 40 - 12;
    const t = ((e.clientX - rect.left - L) / pw) * 90;
    hover = t >= 0 && t <= 90 ? Math.round(t * 2) / 2 : null;
    drawChart();
  });
  chart.addEventListener("mouseleave", () => { hover = null; drawChart(); });

  // ---------- scoreboard, verdict ----------

  function chsh() {
    let S = 0, varS = 0, complete = true;
    SETTINGS.forEach((s, i) => {
      const { n, sum } = stats[i];
      if (n < 50) { complete = false; return; }
      const E = sum / n;
      S += s.sign * E;
      varS += (1 - E * E) / n;
    });
    return complete ? { S, sigma: Math.sqrt(varS) } : null;
  }

  function refresh() {
    $("cPP").textContent = counts.pp.toLocaleString();
    $("cPM").textContent = counts.pm.toLocaleString();
    $("cMP").textContent = counts.mp.toLocaleString();
    $("cMM").textContent = counts.mm.toLocaleString();
    const n = counts.pp + counts.pm + counts.mp + counts.mm;
    $("eNow").textContent = n ? "E = " + fmtE((counts.pp + counts.mm - counts.pm - counts.mp) / n) : "E = -";
    $("eN").textContent = n.toLocaleString() + " pairs at α = " + alpha + "°, β = " + beta + "°";

    stats.forEach((s, i) => {
      $("e" + i).textContent = s.n ? fmtE(s.sum / s.n) : "-";
      $("n" + i).textContent = s.n.toLocaleString();
    });

    const r = chsh();
    const verdict = $("verdict"), head = $("verdictHead"), detail = $("verdictDetail");
    if (r) {
      $("sValue").textContent = "S = " + r.S.toFixed(2);
      $("sSigma").textContent = "± " + r.sigma.toFixed(2) + " (statistical)";
      const needle = $("sNeedle");
      needle.style.display = "block";
      needle.style.left = Math.max(0, Math.min(100, (r.S / 3) * 100)) + "%";
      if (r.S - 2 > 3 * r.sigma) {
        verdict.className = "verdict broken";
        head.textContent = "Ceiling broken: S = " + r.S.toFixed(2) + " > 2";
        detail.textContent = "This is " + ((r.S - 2) / r.sigma).toFixed(0) + " standard deviations above 2. No pre-written answer sheets - however clever - can produce these numbers. Local realism is out.";
      } else if (r.S > 2) {
        verdict.className = "verdict waiting";
        head.textContent = "S = " + r.S.toFixed(2) + " - above 2, but within noise";
        detail.textContent = "Not conclusive yet: the excess over 2 is smaller than 3 standard deviations. Fire more pairs at the four settings.";
      } else {
        verdict.className = "verdict classical";
        head.textContent = "S = " + r.S.toFixed(2) + " - at or under the ceiling";
        detail.textContent = "These correlations are exactly what pre-written answer sheets can do. Einstein's picture survives this data. (In the hidden-plan world it always will.)";
      }
    } else {
      $("sValue").textContent = "S = -";
      $("sSigma").textContent = "needs ≥ 50 pairs at each setting";
      $("sNeedle").style.display = "none";
      verdict.className = "verdict waiting";
      head.textContent = "The bench is ready";
      detail.textContent = "Fire pairs at any angles - or press “Run the CHSH test” to collect all four settings automatically.";
    }
    drawChart();
  }

  // ---------- controls ----------

  function setAngles(a, b) {
    alpha = a; beta = b;
    $("alphaSlider").value = a; $("betaSlider").value = b;
    $("alphaOut").textContent = "α = " + a + "°";
    $("betaOut").textContent = "β = " + b + "°";
    counts = { pp: 0, pm: 0, mp: 0, mm: 0 };
  }

  function resetData() {
    counts = { pp: 0, pm: 0, mp: 0, mm: 0 };
    buckets = new Map();
    stats = SETTINGS.map(() => ({ n: 0, sum: 0 }));
    photons = [];
    flashes = { A: null, B: null };
    refresh();
  }

  function burst(total, perTick = 120) {
    return new Promise((resolve) => {
      let left = total;
      (function step() {
        const n = Math.min(perTick, left);
        left -= n;
        recordPairs(n, false);
        if (Math.random() < 0.5) spawn(3);
        if (left > 0) setTimeout(step, 16); else resolve();
      })();
    });
  }

  async function runCHSH() {
    if (running) return;
    running = true;
    setDisabled(true);
    for (const s of SETTINGS) {
      setAngles(s.a, s.b);
      refresh();
      await burst(2500);
      await new Promise((r) => setTimeout(r, 250));
    }
    running = false;
    setDisabled(false);
  }

  function setDisabled(on) {
    for (const id of ["fire1Btn", "fire500Btn", "chshBtn", "resetBtn", "alphaSlider", "betaSlider"]) $(id).disabled = on;
  }

  $("fire1Btn").addEventListener("click", () => recordPairs(1, true));
  $("fire500Btn").addEventListener("click", () => { if (!running) burst(500); });
  $("chshBtn").addEventListener("click", runCHSH);
  $("resetBtn").addEventListener("click", () => { if (!running) resetData(); });

  for (const [id, apply] of [["alphaSlider", (v) => setAngles(v, beta)], ["betaSlider", (v) => setAngles(alpha, v)]]) {
    $(id).addEventListener("input", (e) => {
      if (running) return;
      apply(Number.parseFloat(e.target.value));
      refresh();
    });
  }

  document.querySelectorAll(".scoreboard tbody tr").forEach((row) => {
    row.title = "Set the filters to these angles";
    row.addEventListener("click", () => {
      if (running) return;
      const s = SETTINGS[Number(row.dataset.setting)];
      setAngles(s.a, s.b);
      refresh();
    });
  });

  document.querySelectorAll(".scenario").forEach((tab) => {
    tab.addEventListener("click", () => {
      if (running || tab.dataset.world === world) return;
      world = tab.dataset.world;
      document.querySelectorAll(".scenario").forEach((t) => t.classList.toggle("on", t === tab));
      $("modeTitle").textContent = MODE_NOTES[world][0];
      $("modeNote").textContent = MODE_NOTES[world][1];
      resetData();
      drawBench();
    });
  });

  // ---------- lifecycle ----------

  function tick() {
    if (!active) return;
    stepPhotons();
    drawBench();
    rafId = requestAnimationFrame(tick);
  }

  function setActive(on) {
    if (on && !active) {
      active = true;
      refresh();
      drawBench();
      rafId = requestAnimationFrame(tick);
    } else if (!on && active) {
      active = false;
      cancelAnimationFrame(rafId);
    }
  }

  window.addEventListener("lesson:slide", (e) => setActive(e.detail.simulator));

  const currentSlide = document.querySelector(".slide.on");
  setActive(Boolean(currentSlide && currentSlide.dataset.simulator));

  window.addEventListener("resize", () => {
    if (active) { refresh(); drawBench(); }
  });
}());
