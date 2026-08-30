(function () {
  "use strict";

  /* The grid runs far wider than the plotted window on purpose. A packet's tails
     reach the absorbing edges long before its centre does - by the time the race
     packet's mean is at x = 34 its 4σ edge is 30 units further on - so the sponge
     has to sit well past VIEW for a run to stay honest until the packet leaves
     the picture. DX is unchanged from the narrower grid it replaces; the step
     count per frame is halved to pay for the larger transform. */
  const N = 2048;
  const LENGTH = 192;
  const DX = LENGTH / N;
  const DT = .01;
  const STEPS_PER_FRAME = 4;
  const VIEW = 34;
  const PAD_LEFT = 44;
  const PAD_RIGHT = 16;
  const MOMENTUM_MAX = 5;
  const HISTORY_SAMPLE = .07;
  const HISTORY_LIMIT = 4200;
  const EDGE_LOOKBACK = 14;
  /* A finished run holds its last frame long enough to read, dips to white, and
     starts over. An instant cut between two busy frames reads as a glitch. */
  const HOLD_FRAMES = 110;
  const FADE_OUT = 38;
  const FADE_IN = 26;
  const SPEED_WINDOW = 22;

  const SOFT = "#92949a";
  const HAIR = "#e6e5e0";
  const VIOLET = "#5552b9";
  const ORANGE = "#d95d39";
  const GREEN = "#21805a";

  const xs = new Float64Array(N);
  const ks = new Float64Array(N);
  const absorb = new Float64Array(N);
  const potential = new Float64Array(N);
  const upperR = new Float64Array(N);
  const upperI = new Float64Array(N);
  const lowerR = new Float64Array(N);
  const lowerI = new Float64Array(N);
  const schR = new Float64Array(N);
  const schI = new Float64Array(N);
  const upperCos = new Float64Array(N);
  const upperSin = new Float64Array(N);
  const lowerCos = new Float64Array(N);
  const lowerSin = new Float64Array(N);
  const schPotentialCos = new Float64Array(N);
  const schPotentialSin = new Float64Array(N);
  const schKineticCos = new Float64Array(N);
  const schKineticSin = new Float64Array(N);
  const scratchR = new Float64Array(N);
  const scratchI = new Float64Array(N);
  const kickCos = new Float64Array(N);
  const kickSin = new Float64Array(N);

  for (let i = 0; i < N; i += 1) {
    xs[i] = -LENGTH / 2 + i * DX;
    const frequency = i < N / 2 ? i : i - N;
    ks[i] = 2 * Math.PI * frequency / LENGTH;
    kickCos[i] = Math.cos(ks[i] * DT);
    kickSin[i] = Math.sin(ks[i] * DT);
    absorb[i] = 1;
  }
  const taper = Math.round(N * .11);
  for (let i = 0; i < taper; i += 1) {
    const value = Math.pow(Math.sin(Math.PI / 2 * i / taper), .12);
    absorb[i] = value;
    absorb[N - 1 - i] = value;
  }
  let firstVisible = 0;
  let lastVisible = N - 1;
  while (xs[firstVisible] < -VIEW) firstVisible += 1;
  while (xs[lastVisible] > VIEW) lastVisible -= 1;

  const scenes = {
    race: {
      title: "Light-speed race",
      /* Ends while the packets are still clear of the absorbing edges: the sponge
         eats a spreading packet's leading edge first, and that edge carries its
         fastest momentum components, so ⟨v⟩ would start sagging off-screen. */
      duration: 25,
      momentum: 2.4, mass: 1, barrier: 0, width: 2.4, start: -26, wall: 0,
      shape: "free", branch: "positive", edge: null,
      note: "Both packets are released together, from the same place, with the same momentum. Schrödinger's speed is p/m, so its worldline leaves the light cone within a couple of ticks and it reaches the far wall long before light could. Dirac's speed is pc²/E, which presses against the cone without ever crossing it. The run restarts when the green packet runs out of room."
    },
    spread: {
      title: "Spreading outruns light too",
      /* Held at rest and pinched below σ₀ = ½: a Schrödinger packet spreads at
         1/(2σ₀) with no ceiling, so this one widens faster than light while
         going nowhere. Ends before the tails reach the absorbing edges, which
         would clip σ and understate exactly the effect on show. */
      duration: 21,
      momentum: 0, mass: 1, barrier: 0, width: .55, start: 0, wall: 0,
      shape: "free", branch: "positive", edge: null, focus: "width",
      note: "Neither packet is going anywhere - both averages sit at zero - yet look at the width bands below. A pinched packet is a wide mixture of momenta, and Schrödinger lets those momenta travel at p/m with no ceiling, so its edges push out through the light cone at better than c. Dirac gives every component a speed below c, so no matter how sharply you pinch it, its width stays inside the cone."
    },
    barrier: {
      title: "Tunnelling through a wall",
      duration: 22,
      momentum: 4, mass: 1, barrier: 5, width: 1.9, start: -12, wall: 3,
      shape: "barrier", branch: "positive", edge: 3,
      note: "At p = 4 the two energy curves have come badly apart: Schrödinger credits this packet with p²/2m = 8 and simply flies over a wall of height 5, while Dirac's honest √(p²c² + m²c⁴) − mc² = 3.1 leaves it stuck underneath, tunnelling. Over-estimating a fast particle's kinetic energy is not a small error - it changes what the particle is allowed to do. Wait for the violet packet; it arrives well after the green one."
    },
    klein: {
      title: "The Klein step",
      duration: 34,
      momentum: 1.2, mass: 1, barrier: 5.5, width: 2.6, start: -10, wall: 0,
      shape: "step", branch: "positive", edge: 1.5,
      note: "Raise the step past E + mc² and Dirac stops treating it as a wall: a large share of the packet crosses, and inside the step it is carried almost entirely by the lower pair ψ₃ ψ₄ - the negative-energy branch, which is to say antiparticles. Schrödinger simply reflects. This is the Klein paradox, and it is the Dirac equation asking to be replaced by a quantum field theory."
    },
    zitter: {
      title: "Zitterbewegung",
      duration: 60,
      momentum: 0, mass: 1.6, barrier: 0, width: 3.2, start: 0, wall: 0,
      shape: "free", branch: "mixed", edge: null,
      note: "Start the packet as an equal mixture of the two energy branches and it trembles: the instantaneous Dirac speed swings between +c and −c at frequency 2mc²/ℏ while the average position barely moves at all. Schrödinger has one branch and nothing to interfere with, so it just sits there and spreads. Nudge the mass to change the trembling rate."
    }
  };

  /* Once this much probability has been eaten by the window edges, the mean is
     tracking whichever lump happens to be left rather than the packet. */
  const LIVE_NORM = .35;
  const dirac = { norm: 1, mean: 0, sigma: 0, speed: 0, lowerShare: 0, transmitted: 0, live: true };
  const schrodinger = { norm: 1, mean: 0, sigma: 0, speed: 0, transmitted: 0, live: true };
  const history = [];

  let sceneName = "race";
  let paused = false;
  let holdFrames = 0;
  let fadeInFrames = 0;
  let visible = false;
  let time = 0;
  let packetStart = 0;
  let coneOffset = 0;
  let densityReference = 1;
  let speedReference = 1.3;
  let edgeCeiling = 0;
  let escapedRightDirac = 0;
  let escapedRightSch = 0;
  let dispersionPending = true;

  const momentumInput = document.getElementById("momentum");
  const massInput = document.getElementById("mass");
  const barrierInput = document.getElementById("barrier");
  const speedInput = document.getElementById("simSpeed");
  const playButton = document.getElementById("simPlay");
  const verdict = document.getElementById("verdict");

  const readouts = {};
  ["timeValue", "momentumValue", "massValue", "barrierValue", "speedValue", "verdictHead", "verdictDetail",
    "diracPosition", "schPosition", "diracSpeed", "schSpeed", "diracWidth", "schWidth", "diracNorm", "schNorm",
    "diracTransmitted", "schTransmitted", "diracParts", "speedLabel", "sceneTitle", "sceneNote"]
    .forEach((id) => { readouts[id] = document.getElementById(id); });

  function momentumValue() { return Number(momentumInput.value); }
  function massValue() { return Number(massInput.value); }
  function barrierValue() { return Number(barrierInput.value); }

  function makeSurface(id) {
    const canvas = document.getElementById(id);
    const surface = { canvas, context: canvas.getContext("2d"), width: 0, height: 0 };
    surface.sync = function () {
      const rect = canvas.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) return false;
      if (Math.abs(surface.width - rect.width) > .5 || Math.abs(surface.height - rect.height) > .5) {
        const ratio = window.devicePixelRatio || 1;
        surface.width = rect.width;
        surface.height = rect.height;
        canvas.width = Math.round(rect.width * ratio);
        canvas.height = Math.round(rect.height * ratio);
        surface.context.setTransform(ratio, 0, 0, ratio, 0, 0);
      }
      return true;
    };
    return surface;
  }

  const wave = makeSurface("waveCanvas");
  const spacetime = makeSurface("spacetimeCanvas");
  const dispersion = makeSurface("dispersionCanvas");
  const speedTrace = makeSurface("speedCanvas");

  /* ---------------------------------------------------------------- solver */

  function fft(real, imaginary, inverse) {
    const size = real.length;
    for (let i = 1, j = 0; i < size; i += 1) {
      let bit = size >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) {
        let swap = real[i]; real[i] = real[j]; real[j] = swap;
        swap = imaginary[i]; imaginary[i] = imaginary[j]; imaginary[j] = swap;
      }
    }
    for (let length = 2; length <= size; length <<= 1) {
      const angle = (inverse ? 2 : -2) * Math.PI / length;
      const stepR = Math.cos(angle);
      const stepI = Math.sin(angle);
      const half = length >> 1;
      for (let start = 0; start < size; start += length) {
        let phaseR = 1;
        let phaseI = 0;
        for (let offset = 0; offset < half; offset += 1) {
          const a = start + offset;
          const b = a + half;
          const valueR = real[b] * phaseR - imaginary[b] * phaseI;
          const valueI = real[b] * phaseI + imaginary[b] * phaseR;
          real[b] = real[a] - valueR;
          imaginary[b] = imaginary[a] - valueI;
          real[a] += valueR;
          imaginary[a] += valueI;
          const nextR = phaseR * stepR - phaseI * stepI;
          phaseI = phaseR * stepI + phaseI * stepR;
          phaseR = nextR;
        }
      }
    }
    if (inverse) for (let i = 0; i < size; i += 1) { real[i] /= size; imaginary[i] /= size; }
  }

  function buildPotential() {
    const strength = barrierValue();
    const scene = scenes[sceneName];
    for (let i = 0; i < N; i += 1) {
      if (scene.shape === "barrier") potential[i] = xs[i] >= 0 && xs[i] <= scene.wall ? strength : 0;
      else if (scene.shape === "step") potential[i] = xs[i] >= 0 ? strength : 0;
      else potential[i] = 0;
    }
  }

  /* Every propagator factor is constant between resets, so the sines and cosines
     are tabulated once instead of once per grid point per frame. */
  function prepareOperators() {
    const mass = massValue();
    for (let i = 0; i < N; i += 1) {
      const upperPhase = -(potential[i] + mass) * DT / 2;
      upperCos[i] = Math.cos(upperPhase);
      upperSin[i] = Math.sin(upperPhase);
      const lowerPhase = -(potential[i] - mass) * DT / 2;
      lowerCos[i] = Math.cos(lowerPhase);
      lowerSin[i] = Math.sin(lowerPhase);
      const schPhase = -potential[i] * DT / 2;
      schPotentialCos[i] = Math.cos(schPhase);
      schPotentialSin[i] = Math.sin(schPhase);
      const kineticPhase = -ks[i] * ks[i] * DT / (2 * mass);
      schKineticCos[i] = Math.cos(kineticPhase);
      schKineticSin[i] = Math.sin(kineticPhase);
    }
  }

  function diracLocalHalfStep() {
    for (let i = 0; i < N; i += 1) {
      const uR = upperR[i];
      upperR[i] = uR * upperCos[i] - upperI[i] * upperSin[i];
      upperI[i] = uR * upperSin[i] + upperI[i] * upperCos[i];
      const lR = lowerR[i];
      lowerR[i] = lR * lowerCos[i] - lowerI[i] * lowerSin[i];
      lowerI[i] = lR * lowerSin[i] + lowerI[i] * lowerCos[i];
    }
  }

  /* exp(−i k σx dt): the momentum term is the only thing that mixes the two
     spinor components, and that mixing is where the speed limit comes from. */
  function diracMomentumStep() {
    fft(upperR, upperI, false);
    fft(lowerR, lowerI, false);
    for (let i = 0; i < N; i += 1) {
      const cosine = kickCos[i];
      const sine = kickSin[i];
      const uR = upperR[i];
      const uI = upperI[i];
      const lR = lowerR[i];
      const lI = lowerI[i];
      upperR[i] = cosine * uR + sine * lI;
      upperI[i] = cosine * uI - sine * lR;
      lowerR[i] = cosine * lR + sine * uI;
      lowerI[i] = cosine * lI - sine * uR;
    }
    fft(upperR, upperI, true);
    fft(lowerR, lowerI, true);
  }

  function schrodingerPotentialHalfStep() {
    for (let i = 0; i < N; i += 1) {
      const real = schR[i];
      schR[i] = real * schPotentialCos[i] - schI[i] * schPotentialSin[i];
      schI[i] = real * schPotentialSin[i] + schI[i] * schPotentialCos[i];
    }
  }

  function schrodingerStep() {
    schrodingerPotentialHalfStep();
    fft(schR, schI, false);
    for (let i = 0; i < N; i += 1) {
      const real = schR[i];
      schR[i] = real * schKineticCos[i] - schI[i] * schKineticSin[i];
      schI[i] = real * schKineticSin[i] + schI[i] * schKineticCos[i];
    }
    fft(schR, schI, true);
    schrodingerPotentialHalfStep();
  }

  /* The window edges soak up whatever reaches them; the loss is booked so that
     "transmitted" keeps counting probability after it has left the picture. */
  function absorbEdges() {
    for (let i = 0; i < N; i += 1) {
      const factor = absorb[i];
      if (factor === 1) continue;
      const kept = factor * factor;
      const diracBefore = upperR[i] ** 2 + upperI[i] ** 2 + lowerR[i] ** 2 + lowerI[i] ** 2;
      const schBefore = schR[i] ** 2 + schI[i] ** 2;
      upperR[i] *= factor; upperI[i] *= factor;
      lowerR[i] *= factor; lowerI[i] *= factor;
      schR[i] *= factor; schI[i] *= factor;
      if (xs[i] > 0) {
        escapedRightDirac += diracBefore * (1 - kept) * DX;
        escapedRightSch += schBefore * (1 - kept) * DX;
      }
    }
  }

  function step() {
    diracLocalHalfStep();
    diracMomentumStep();
    diracLocalHalfStep();
    schrodingerStep();
    absorbEdges();
    time += DT;
  }

  /* Ehrenfest: d⟨x⟩/dt = ⟨p⟩/m even with a potential, and ⟨p⟩ is exact in the
     same momentum basis the propagator uses. */
  function schrodingerSpeed() {
    const mass = massValue();
    scratchR.set(schR);
    scratchI.set(schI);
    fft(scratchR, scratchI, false);
    let total = 0;
    let momentum = 0;
    for (let i = 0; i < N; i += 1) {
      const weight = scratchR[i] ** 2 + scratchI[i] ** 2;
      total += weight;
      momentum += ks[i] * weight;
    }
    return total > 0 ? momentum / (total * mass) : 0;
  }

  function measure() {
    const edge = scenes[sceneName].edge;
    let diracTotal = 0;
    let diracPosition = 0;
    let diracSquare = 0;
    let diracCurrent = 0;
    let diracLower = 0;
    let diracBeyond = 0;
    let schTotal = 0;
    let schPosition = 0;
    let schSquare = 0;
    let schBeyond = 0;
    for (let i = 0; i < N; i += 1) {
      const lowerDensity = lowerR[i] ** 2 + lowerI[i] ** 2;
      const density = upperR[i] ** 2 + upperI[i] ** 2 + lowerDensity;
      diracTotal += density;
      diracPosition += xs[i] * density;
      diracSquare += xs[i] * xs[i] * density;
      diracLower += lowerDensity;
      diracCurrent += 2 * (upperR[i] * lowerR[i] + upperI[i] * lowerI[i]);
      const schDensity = schR[i] ** 2 + schI[i] ** 2;
      schTotal += schDensity;
      schPosition += xs[i] * schDensity;
      schSquare += xs[i] * xs[i] * schDensity;
      if (edge !== null && xs[i] > edge) { diracBeyond += density; schBeyond += schDensity; }
    }
    /* Every average here is a ratio, so it stays perfectly finite and perfectly
       meaningless once the packet has left the window. Below LIVE_NORM the last
       readings backed by a real wave are held instead. */
    dirac.norm = diracTotal * DX;
    dirac.transmitted = diracBeyond * DX + escapedRightDirac;
    dirac.live = dirac.norm >= LIVE_NORM;
    if (dirac.live) {
      dirac.mean = diracPosition / diracTotal;
      dirac.sigma = Math.sqrt(Math.max(0, diracSquare / diracTotal - dirac.mean ** 2));
      dirac.speed = diracCurrent / diracTotal;
      dirac.lowerShare = diracLower / diracTotal;
    }
    schrodinger.norm = schTotal * DX;
    schrodinger.transmitted = schBeyond * DX + escapedRightSch;
    schrodinger.live = schrodinger.norm >= LIVE_NORM;
    if (schrodinger.live) {
      schrodinger.mean = schPosition / schTotal;
      schrodinger.sigma = Math.sqrt(Math.max(0, schSquare / schTotal - schrodinger.mean ** 2));
      schrodinger.speed = schrodingerSpeed();
    }
  }

  function peakDensity() {
    let peak = 0;
    for (let i = firstVisible; i <= lastVisible; i += 1) {
      const density = upperR[i] ** 2 + upperI[i] ** 2 + lowerR[i] ** 2 + lowerI[i] ** 2;
      const schDensity = schR[i] ** 2 + schI[i] ** 2;
      if (density > peak) peak = density;
      if (schDensity > peak) peak = schDensity;
    }
    return peak;
  }

  /* How fast the packet's σ edge is travelling. Differenced over about a second
     of history rather than frame to frame, which would be mostly noise; before
     that much history exists, the average since release is the best estimate. */
  function edgeSpeed(sigma, key) {
    const earlier = history[history.length - EDGE_LOOKBACK];
    if (earlier && time - earlier.time > .2) return (sigma - earlier[key]) / (time - earlier.time);
    return time > .2 ? (sigma - coneOffset) / time : 0;
  }

  function recordHistory() {
    const last = history[history.length - 1];
    if (last && time - last.time < HISTORY_SAMPLE) return;
    history.push({
      time,
      diracLive: dirac.live, diracMean: dirac.mean, diracSigma: dirac.sigma, diracSpeed: dirac.speed,
      diracEdge: edgeSpeed(dirac.sigma, "diracSigma"), schEdge: edgeSpeed(schrodinger.sigma, "schSigma"),
      schLive: schrodinger.live, schMean: schrodinger.mean, schSigma: schrodinger.sigma, schSpeed: schrodinger.speed
    });
    if (history.length > HISTORY_LIMIT) history.splice(0, history.length - HISTORY_LIMIT);
  }

  function reset() {
    const scene = scenes[sceneName];
    const momentum = momentumValue();
    const mass = massValue();
    const energy = Math.sqrt(momentum * momentum + mass * mass);
    const ratio = scene.branch === "mixed" ? 1 : momentum / (energy + mass);
    packetStart = scene.start;
    coneOffset = scene.width / Math.SQRT2;
    let diracTotal = 0;
    let schTotal = 0;
    for (let i = 0; i < N; i += 1) {
      const distance = (xs[i] - packetStart) / scene.width;
      const envelope = Math.exp(-.5 * distance * distance);
      const phase = momentum * xs[i];
      const real = envelope * Math.cos(phase);
      const imaginary = envelope * Math.sin(phase);
      upperR[i] = real;
      upperI[i] = imaginary;
      lowerR[i] = ratio * real;
      lowerI[i] = ratio * imaginary;
      schR[i] = real;
      schI[i] = imaginary;
      diracTotal += (1 + ratio * ratio) * envelope * envelope;
      schTotal += envelope * envelope;
    }
    const diracScale = 1 / Math.sqrt(diracTotal * DX);
    const schScale = 1 / Math.sqrt(schTotal * DX);
    for (let i = 0; i < N; i += 1) {
      upperR[i] *= diracScale; upperI[i] *= diracScale;
      lowerR[i] *= diracScale; lowerI[i] *= diracScale;
      schR[i] *= schScale; schI[i] *= schScale;
    }
    buildPotential();
    prepareOperators();
    time = 0;
    holdFrames = 0;
    escapedRightDirac = 0;
    escapedRightSch = 0;
    history.length = 0;
    measure();
    densityReference = Math.max(peakDensity(), 1e-3);
    /* Headroom for whichever speed that scene's panel is plotting: p/m for a
       drifting packet, the asymptotic 1/2σ₀ for a spreading one. */
    const fastest = scene.focus === "width" ? 1 / (Math.SQRT2 * scene.width) : Math.abs(momentum / mass);
    speedReference = Math.min(4, Math.max(1.35, fastest * 1.3));
    /* σ grows as √(σ₀² + (σ_p t)²), so dσ/dt starts at zero and saturates at
       σ_p = 1/2σ₀. Worth drawing, or the climb looks like drift. */
    edgeCeiling = scene.focus === "width" ? fastest : 0;
    recordHistory();
    updateReadout();
    drawDispersion();
    drawWave();
    drawSpacetime();
    drawSpeed();
  }

  /* Each scene runs for as long as it has something worth trusting, then holds
     its last frame rather than snapping back to the start - that frame is the
     one with the settled numbers and the fully drawn worldlines. The norm test
     is only a guard for slider settings that empty the window early, at which
     point every average is reporting on a leftover fragment. */
  function exhausted() {
    if (time < 4) return false;
    return time > scenes[sceneName].duration || (dirac.norm < .25 && schrodinger.norm < .25);
  }

  /* ---------------------------------------------------------------- drawing */

  /* Dips the live panels to white across a restart. The dispersion panel is
     static theory and is left alone, so it never blinks. */
  function veil(context, width, height) {
    let alpha = 0;
    if (holdFrames > 0) alpha = holdFrames < FADE_OUT ? 1 - holdFrames / FADE_OUT : 0;
    else if (fadeInFrames > 0) alpha = fadeInFrames / FADE_IN;
    if (alpha <= 0) return;
    context.fillStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
    context.fillRect(0, 0, width, height);
  }

  function plotX(width, x) {
    return PAD_LEFT + (x + VIEW) / (2 * VIEW) * (width - PAD_LEFT - PAD_RIGHT);
  }

  /* The cone opens from the starting packet's own 1σ extent rather than from a
     mathematical point, so it can be compared with the σ bands honestly. */
  function coneEdge(direction, at) {
    return packetStart + direction * (coneOffset + at);
  }

  function diracDensity(i) {
    return upperR[i] ** 2 + upperI[i] ** 2 + lowerR[i] ** 2 + lowerI[i] ** 2;
  }

  function upperDensity(i) {
    return upperR[i] ** 2 + upperI[i] ** 2;
  }

  function schDensity(i) {
    return schR[i] ** 2 + schI[i] ** 2;
  }

  function tracePath(context, width, base, scale, valueAt) {
    context.beginPath();
    for (let i = firstVisible; i <= lastVisible; i += 2) {
      const x = plotX(width, xs[i]);
      const y = base - valueAt(i) * scale;
      if (i === firstVisible) context.moveTo(x, y); else context.lineTo(x, y);
    }
  }

  function fillBetween(context, width, base, scale, low, high) {
    context.beginPath();
    for (let i = firstVisible; i <= lastVisible; i += 2) context.lineTo(plotX(width, xs[i]), base - high(i) * scale);
    for (let i = lastVisible - (lastVisible - firstVisible) % 2; i >= firstVisible; i -= 2) {
      context.lineTo(plotX(width, xs[i]), base - low(i) * scale);
    }
    context.closePath();
  }

  function zero() { return 0; }

  /* Opaque rather than translucent: the band sits on top of the light-cone
     shading, and two overlapping washes read as three different regions. */
  function drawPotentialBand(context, width, top, bottom, withLabel) {
    const scene = scenes[sceneName];
    const shape = scene.shape;
    if (shape === "free" || barrierValue() <= 0) return;
    const left = plotX(width, 0);
    const right = shape === "step" ? width - PAD_RIGHT : plotX(width, scene.wall);
    context.fillStyle = "#eeeef0";
    context.fillRect(left, top, right - left, bottom - top);
    context.strokeStyle = "rgba(146,148,154,.85)";
    context.lineWidth = 1;
    context.setLineDash([3, 3]);
    context.beginPath();
    context.moveTo(left + .5, top);
    context.lineTo(left + .5, bottom);
    if (shape === "barrier") { context.moveTo(right - .5, top); context.lineTo(right - .5, bottom); }
    context.stroke();
    context.setLineDash([]);
    if (!withLabel) return;
    context.fillStyle = SOFT;
    context.font = "700 9px Inter, sans-serif";
    context.textAlign = "left";
    context.fillText(`${shape === "step" ? "step" : "barrier"} V = ${barrierValue().toFixed(1)}`, left + 5, top + 12);
  }

  function drawWave() {
    if (!wave.sync()) return;
    const context = wave.context;
    const width = wave.width;
    const height = wave.height;
    const top = 16;
    const bottom = 10;
    const gap = 26;
    const lane = (height - top - bottom - gap) / 2;
    const diracBase = top + lane;
    const schBase = diracBase + gap + lane;
    /* Jumps up at once for interference spikes, eases down over about a second.
       A pinched packet loses 30× of its peak as it spreads, and a scale pinned
       at the starting peak would leave the rest of the run invisible. Both lanes
       always share this one scale, so the comparison stays exact. */
    densityReference = Math.max(peakDensity(), densityReference * .985);
    const scale = (lane - 6) / densityReference;

    context.clearRect(0, 0, width, height);
    context.fillStyle = "#fff";
    context.fillRect(0, 0, width, height);

    const coneLeft = plotX(width, coneEdge(-1, time));
    const coneRight = plotX(width, coneEdge(1, time));
    const plotRight = width - PAD_RIGHT;
    const reachLeft = Math.max(PAD_LEFT, coneLeft);
    const reachRight = Math.min(plotRight, coneRight);
    if (reachRight > reachLeft) {
      context.fillStyle = "rgba(85,82,185,.045)";
      context.fillRect(reachLeft, 0, reachRight - reachLeft, height);
    }

    drawPotentialBand(context, width, 4, height - bottom, true);

    context.strokeStyle = HAIR;
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(PAD_LEFT, diracBase + .5);
    context.lineTo(plotRight, diracBase + .5);
    context.moveTo(PAD_LEFT, schBase + .5);
    context.lineTo(plotRight, schBase + .5);
    context.stroke();

    context.strokeStyle = "rgba(120,122,128,.65)";
    context.lineWidth = 1.4;
    context.setLineDash([5, 5]);
    context.beginPath();
    [coneLeft, coneRight].forEach((x) => {
      if (x <= PAD_LEFT + 1 || x >= plotRight - 1) return;
      context.moveTo(x, 4);
      context.lineTo(x, height - bottom);
    });
    context.stroke();
    context.setLineDash([]);
    if (coneRight > PAD_LEFT + 30 && coneRight < plotRight - 4) {
      context.fillStyle = "rgba(120,122,128,.95)";
      context.font = "700 8px Inter, sans-serif";
      context.textAlign = "right";
      context.fillText("light", coneRight - 4, height - bottom - 3);
    }

    fillBetween(context, width, diracBase, scale, zero, upperDensity);
    context.fillStyle = "rgba(49,90,159,.30)";
    context.fill();
    fillBetween(context, width, diracBase, scale, upperDensity, diracDensity);
    context.fillStyle = "rgba(217,93,57,.38)";
    context.fill();
    tracePath(context, width, diracBase, scale, diracDensity);
    context.strokeStyle = VIOLET;
    context.lineWidth = 1.8;
    context.stroke();

    fillBetween(context, width, schBase, scale, zero, schDensity);
    context.fillStyle = "rgba(33,128,90,.16)";
    context.fill();
    tracePath(context, width, schBase, scale, schDensity);
    context.strokeStyle = GREEN;
    context.lineWidth = 1.8;
    context.stroke();

    [[dirac, diracBase, VIOLET], [schrodinger, schBase, GREEN]].forEach(([solution, base, color]) => {
      if (!solution.live) return;
      const x = plotX(width, solution.mean);
      if (x < PAD_LEFT || x > plotRight) return;
      context.fillStyle = color;
      context.beginPath();
      context.moveTo(x, base - 4);
      context.lineTo(x - 4, base + 4);
      context.lineTo(x + 4, base + 4);
      context.closePath();
      context.fill();
    });

    context.font = "800 8px Inter, sans-serif";
    context.textAlign = "left";
    context.fillStyle = VIOLET;
    context.fillText("DIRAC  ψ†ψ", PAD_LEFT, top + 8);
    context.fillStyle = GREEN;
    context.fillText("SCHRÖDINGER  |ψ|²", PAD_LEFT, diracBase + gap + 8);
    veil(context, width, height);
  }

  function drawSpacetime() {
    if (!spacetime.sync()) return;
    const context = spacetime.context;
    const width = spacetime.width;
    const height = spacetime.height;
    const top = 12;
    const bottom = 24;
    const plotRight = width - PAD_RIGHT;
    const perUnit = (plotRight - PAD_LEFT) / (2 * VIEW);
    const span = (height - top - bottom) / perUnit;
    const latest = Math.max(span, time);
    const earliest = latest - span;
    const yFor = (value) => top + (latest - value) * perUnit;

    context.clearRect(0, 0, width, height);
    context.fillStyle = "#fff";
    context.fillRect(0, 0, width, height);

    context.save();
    context.beginPath();
    context.rect(PAD_LEFT, top, plotRight - PAD_LEFT, height - top - bottom);
    context.clip();

    drawPotentialBand(context, width, top, height - bottom, false);

    context.fillStyle = "rgba(85,82,185,.06)";
    context.beginPath();
    context.moveTo(plotX(width, coneEdge(-1, earliest)), yFor(earliest));
    context.lineTo(plotX(width, coneEdge(1, earliest)), yFor(earliest));
    context.lineTo(plotX(width, coneEdge(1, latest)), yFor(latest));
    context.lineTo(plotX(width, coneEdge(-1, latest)), yFor(latest));
    context.closePath();
    context.fill();

    context.strokeStyle = "rgba(120,122,128,.7)";
    context.lineWidth = 1.4;
    context.setLineDash([5, 5]);
    context.beginPath();
    [-1, 1].forEach((direction) => {
      context.moveTo(plotX(width, coneEdge(direction, earliest)), yFor(earliest));
      context.lineTo(plotX(width, coneEdge(direction, latest)), yFor(latest));
    });
    context.stroke();
    context.setLineDash([]);

    const inView = history.filter((sample) => sample.time >= earliest - HISTORY_SAMPLE);
    const series = [
      { live: "schLive", mean: "schMean", sigma: "schSigma", colour: GREEN, band: "rgba(33,128,90,.15)", dash: [6, 4] },
      { live: "diracLive", mean: "diracMean", sigma: "diracSigma", colour: VIOLET, band: "rgba(85,82,185,.15)", dash: [] }
    ];
    series.forEach((entry) => {
      const samples = inView.filter((sample) => sample[entry.live]);
      if (samples.length < 2) return;
      context.beginPath();
      samples.forEach((sample) => context.lineTo(plotX(width, sample[entry.mean] + sample[entry.sigma]), yFor(sample.time)));
      for (let i = samples.length - 1; i >= 0; i -= 1) {
        context.lineTo(plotX(width, samples[i][entry.mean] - samples[i][entry.sigma]), yFor(samples[i].time));
      }
      context.closePath();
      context.fillStyle = entry.band;
      context.fill();

      context.beginPath();
      samples.forEach((sample, index) => {
        const x = plotX(width, sample[entry.mean]);
        const y = yFor(sample.time);
        if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
      });
      context.setLineDash(entry.dash);
      context.strokeStyle = entry.colour;
      context.lineWidth = 2;
      context.stroke();
      context.setLineDash([]);

      const tip = samples[samples.length - 1];
      context.fillStyle = entry.colour;
      context.beginPath();
      context.arc(plotX(width, tip[entry.mean]), yFor(tip.time), 3.2, 0, 2 * Math.PI);
      context.fill();
    });
    context.restore();

    context.strokeStyle = HAIR;
    context.lineWidth = 1;
    context.strokeRect(PAD_LEFT + .5, top + .5, plotRight - PAD_LEFT - 1, height - top - bottom - 1);

    context.fillStyle = SOFT;
    context.font = "9px Inter, sans-serif";
    context.textAlign = "center";
    for (let value = -30; value <= 30; value += 10) {
      const x = plotX(width, value);
      context.fillText(String(value), x, height - bottom + 13);
    }
    context.fillText("x", plotRight - 4, height - bottom + 13);
    context.textAlign = "right";
    const tickStep = span > 26 ? 10 : 5;
    for (let value = Math.ceil(earliest / tickStep) * tickStep; value <= latest; value += tickStep) {
      const y = yFor(value);
      if (y < top + 6 || y > height - bottom - 2) continue;
      context.fillText(value.toFixed(0), PAD_LEFT - 6, y + 3);
      context.strokeStyle = HAIR;
      context.beginPath();
      context.moveTo(PAD_LEFT - 3, y + .5);
      context.lineTo(PAD_LEFT, y + .5);
      context.stroke();
    }
    context.textAlign = "left";
    context.fillStyle = SOFT;
    context.font = "700 8px Inter, sans-serif";
    context.fillText("t ↑", 6, top + 8);
    veil(context, width, height);
  }

  function drawDispersion() {
    if (!dispersion.sync()) { dispersionPending = true; return; }
    dispersionPending = false;
    const context = dispersion.context;
    const width = dispersion.width;
    const height = dispersion.height;
    const left = 30;
    const right = width - 10;
    const top = 12;
    const bottom = height - 20;
    const mass = massValue();
    const momentum = momentumValue();
    const energyMax = Math.max(Math.sqrt(MOMENTUM_MAX ** 2 + mass * mass) * 1.55, mass * 2.4);
    const xFor = (value) => left + value / MOMENTUM_MAX * (right - left);
    const yFor = (value) => bottom - Math.min(value, energyMax) / energyMax * (bottom - top);

    context.clearRect(0, 0, width, height);
    context.fillStyle = "#fff";
    context.fillRect(0, 0, width, height);
    context.strokeStyle = HAIR;
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(left + .5, top);
    context.lineTo(left + .5, bottom + .5);
    context.lineTo(right, bottom + .5);
    context.stroke();

    context.strokeStyle = "rgba(146,148,154,.55)";
    context.setLineDash([2, 3]);
    context.beginPath();
    context.moveTo(left, yFor(0));
    context.lineTo(xFor(MOMENTUM_MAX), yFor(MOMENTUM_MAX));
    context.moveTo(left, yFor(mass));
    context.lineTo(right, yFor(mass));
    context.stroke();
    context.setLineDash([]);

    const curve = (energyOf, colour, dash) => {
      context.beginPath();
      let started = false;
      for (let p = 0; p <= MOMENTUM_MAX + 1e-9; p += MOMENTUM_MAX / 160) {
        const energy = energyOf(p);
        if (energy > energyMax) {
          if (started) break;
          continue;
        }
        const x = xFor(p);
        const y = yFor(energy);
        if (!started) { context.moveTo(x, y); started = true; } else context.lineTo(x, y);
      }
      context.setLineDash(dash);
      context.strokeStyle = colour;
      context.lineWidth = 2;
      context.stroke();
      context.setLineDash([]);
    };
    const diracEnergy = (p) => Math.sqrt(p * p + mass * mass);
    const schEnergy = (p) => mass + p * p / (2 * mass);
    curve(schEnergy, GREEN, [6, 4]);
    curve(diracEnergy, VIOLET, []);

    context.strokeStyle = "rgba(146,148,154,.8)";
    context.setLineDash([3, 3]);
    context.beginPath();
    context.moveTo(xFor(momentum), top);
    context.lineTo(xFor(momentum), bottom);
    context.stroke();
    context.setLineDash([]);
    [[diracEnergy(momentum), VIOLET], [schEnergy(momentum), GREEN]].forEach(([energy, colour]) => {
      if (energy > energyMax) return;
      context.fillStyle = colour;
      context.beginPath();
      context.arc(xFor(momentum), yFor(energy), 3.4, 0, 2 * Math.PI);
      context.fill();
    });

    context.font = "8px Inter, sans-serif";
    context.fillStyle = SOFT;
    context.textAlign = "left";
    context.fillText("E = pc", xFor(MOMENTUM_MAX) - 42, yFor(MOMENTUM_MAX) + 12);
    context.fillText("mc²", left + 4, yFor(mass) - 4);
    context.textAlign = "center";
    context.fillText("p", right - 2, bottom + 13);
    const massTick = xFor(Math.min(mass, MOMENTUM_MAX));
    context.strokeStyle = ORANGE;
    context.lineWidth = 1.6;
    context.beginPath();
    context.moveTo(massTick, bottom - 3);
    context.lineTo(massTick, bottom + 4);
    context.stroke();
    context.fillStyle = ORANGE;
    context.font = "700 8px Inter, sans-serif";
    context.fillText("p = mc", massTick, bottom + 14);
    context.textAlign = "left";
    context.fillStyle = VIOLET;
    context.fillText("Dirac", xFor(MOMENTUM_MAX * .62), yFor(diracEnergy(MOMENTUM_MAX * .62)) - 6);
    context.fillStyle = GREEN;
    const labelMomentum = MOMENTUM_MAX * .42;
    context.fillText("Schrödinger", xFor(labelMomentum) - 26, yFor(Math.min(schEnergy(labelMomentum), energyMax)) - 6);
  }

  function drawSpeed() {
    if (!speedTrace.sync()) return;
    const context = speedTrace.context;
    const width = speedTrace.width;
    const height = speedTrace.height;
    const left = 30;
    const right = width - 10;
    const top = 10;
    const bottom = height - 18;
    const latest = Math.max(SPEED_WINDOW, time);
    const earliest = latest - SPEED_WINDOW;
    /* A spreading edge only ever moves outward, so that scene gets the whole
       panel for the positive half instead of half of it. */
    const floor = scenes[sceneName].focus === "width" ? 0 : -speedReference;
    const xFor = (value) => left + (value - earliest) / SPEED_WINDOW * (right - left);
    const yFor = (value) => top + (speedReference - value) / (speedReference - floor) * (bottom - top);

    context.clearRect(0, 0, width, height);
    context.fillStyle = "#fff";
    context.fillRect(0, 0, width, height);
    context.fillStyle = "rgba(85,82,185,.05)";
    context.fillRect(left, yFor(1), right - left, yFor(Math.max(floor, -1)) - yFor(1));

    context.strokeStyle = HAIR;
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(left, yFor(0) + .5);
    context.lineTo(right, yFor(0) + .5);
    context.stroke();
    context.strokeStyle = ORANGE;
    context.setLineDash([4, 3]);
    context.beginPath();
    [1, -1].filter((value) => value > floor).forEach((value) => {
      context.moveTo(left, yFor(value) + .5);
      context.lineTo(right, yFor(value) + .5);
    });
    context.stroke();
    if (edgeCeiling > 0 && edgeCeiling < speedReference) {
      context.strokeStyle = GREEN;
      context.beginPath();
      context.moveTo(left, yFor(edgeCeiling) + .5);
      context.lineTo(right, yFor(edgeCeiling) + .5);
      context.stroke();
      context.fillStyle = GREEN;
      context.font = "700 8px Inter, sans-serif";
      context.textAlign = "right";
      context.fillText(`1/2σ₀ = ${edgeCeiling.toFixed(2)}`, right - 3, yFor(edgeCeiling) - 4);
    }
    context.setLineDash([]);

    context.save();
    context.beginPath();
    context.rect(left, top, right - left, bottom - top);
    context.clip();
    const inView = history.filter((sample) => sample.time >= earliest - HISTORY_SAMPLE);
    const clamp = (value) => Math.max(floor, Math.min(speedReference, value));
    const plotted = floor === 0 ? ["schEdge", "diracEdge"] : ["schSpeed", "diracSpeed"];
    [["schLive", plotted[0], GREEN, [6, 4]], ["diracLive", plotted[1], VIOLET, []]].forEach(([liveKey, key, colour, dash]) => {
      const samples = inView.filter((sample) => sample[liveKey]);
      if (!samples.length) return;
      context.beginPath();
      samples.forEach((sample, index) => {
        const x = xFor(sample.time);
        const y = yFor(clamp(sample[key]));
        if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
      });
      context.setLineDash(dash);
      context.strokeStyle = colour;
      context.lineWidth = 1.9;
      context.stroke();
      context.setLineDash([]);
      const tip = samples[samples.length - 1];
      context.fillStyle = colour;
      context.beginPath();
      context.arc(xFor(tip.time), yFor(clamp(tip[key])), 3.2, 0, 2 * Math.PI);
      context.fill();
    });
    context.restore();

    context.font = "8px Inter, sans-serif";
    context.fillStyle = ORANGE;
    context.textAlign = "right";
    context.fillText("+c", left - 4, yFor(1) + 3);
    if (floor < -1) context.fillText("−c", left - 4, yFor(-1) + 3);
    context.fillStyle = SOFT;
    context.fillText("0", left - 4, yFor(0) + 3);
    context.textAlign = "left";
    context.fillText(`t ${earliest.toFixed(0)} → ${latest.toFixed(0)}`, left + 3, bottom + 12);
    veil(context, width, height);
  }

  /* ---------------------------------------------------------------- readout */

  /* Keeps a rounded-away negative from printing as "-0.00". */
  function fixed(value, digits) {
    return (Math.abs(value) < .5 * 10 ** -digits ? 0 : value).toFixed(digits);
  }

  function percentage(value) {
    if (value >= .995) return "100%";
    if (value < .001) return "0%";
    return `${(value * 100).toFixed(1)}%`;
  }

  function describeVerdict() {
    const diracSpeed = Math.abs(dirac.speed);
    const schSpeed = Math.abs(schrodinger.speed);
    const wall = scenes[sceneName].edge !== null;
    if (wall && Math.max(dirac.transmitted, schrodinger.transmitted) > .02) {
      const ahead = dirac.transmitted > schrodinger.transmitted;
      /* Whichever solution failed to get through is now running backwards, and
         ⟨v⟩ averages over the whole wave, so its sign is the clearest report of
         which theory hit a wall. */
      const turned = [dirac.speed < -.05 && "Dirac", schrodinger.speed < -.05 && "Schrödinger"].filter(Boolean);
      const bounce = turned.length
        ? ` ${turned.join(" and ")} now ${turned.length > 1 ? "read" : "reads"} a negative ⟨v⟩: that is the bounce, with most of the wave heading back the way it came.`
        : "";
      return {
        tone: ahead ? "ok" : "bad",
        head: `Through the wall: Dirac ${percentage(dirac.transmitted)}, Schrödinger ${percentage(schrodinger.transmitted)}`,
        detail: ahead
          ? `The relativistic equation lets far more through, because the second energy branch gives the wave somewhere to go inside the wall. Its lower pair ψ₃ ψ₄ now carries ${Math.round(dirac.lowerShare * 100)}% of the probability, up from a few per cent on the way in.${bounce}`
          : `Schrödinger gets far more through, because p²/2m credits this packet with more kinetic energy than it really has and it passes clean over the top. Dirac has to tunnel, and mostly fails.${bounce}`
      };
    }
    if (!schrodinger.live) {
      return {
        tone: "bad",
        head: `Schrödinger has run off the picture`,
        detail: `Only ${percentage(schrodinger.norm)} of it is left in the window, so the italic figures below are held at the last reading backed by a real wave - ${schrodinger.speed.toFixed(2)} c. Dirac is still here, at ${diracSpeed.toFixed(2)} c with ${percentage(dirac.norm)} of its probability on screen.`
      };
    }
    if (scenes[sceneName].branch === "mixed") {
      return {
        tone: "trembling",
        head: `Dirac trembles at ${dirac.speed.toFixed(2)} c`,
        detail: `The instantaneous Dirac speed is swinging between +c and −c at frequency 2mc²/ℏ, yet the packet stays put: ⟨x⟩ has moved ${(dirac.mean - packetStart).toFixed(2)}. Schrödinger sits at ${schrodinger.speed.toFixed(2)} c because it has no second branch to interfere with.`
      };
    }
    /* A packet at rest has no interesting mean speed; what moves is its edge. */
    if (scenes[sceneName].focus === "width" && time > .5) {
      const light = coneOffset + time;
      const edgeSpeed = (value) => (value - coneOffset) / time;
      return {
        tone: schrodinger.sigma > light ? "bad" : "ok",
        head: `Schrödinger's edge is spreading at ${edgeSpeed(schrodinger.sigma).toFixed(2)} c`,
        detail: `Both averages are pinned at zero, yet Schrödinger's σ edge has reached ${schrodinger.sigma.toFixed(2)} while light has only reached ${light.toFixed(2)}. The rate climbs from zero and settles on 1/2σ₀ = ${edgeCeiling.toFixed(2)} c; pinch the packet harder and that ceiling rises without limit, because nothing in p²/2m caps it. Dirac's edge is doing ${edgeSpeed(dirac.sigma).toFixed(2)} c and stays inside the cone, because every component it carries moves at pc²/E < c.`
      };
    }
    if (schSpeed > 1.005) {
      return {
        tone: "bad",
        head: `Schrödinger is doing ${schSpeed.toFixed(2)} c`,
        detail: `Nothing carrying mass may reach 1.00 c, so the green solution has left physics behind - its worldline is outside the cone. Dirac holds at ${diracSpeed.toFixed(2)} c, which is exactly pc²/E.`
      };
    }
    return {
      tone: "ok",
      head: `Both stay under c`,
      detail: `Dirac ${diracSpeed.toFixed(2)} c against Schrödinger ${schSpeed.toFixed(2)} c. Below p = mc the two energy rules almost coincide, which is why the older equation survived so long. Raise the momentum and the agreement fails.`
    };
  }

  function updateReadout() {
    readouts.timeValue.textContent = holdFrames > 0 ? `${time.toFixed(2)} · restarting` : time.toFixed(2);
    readouts.momentumValue.textContent = momentumValue().toFixed(1);
    readouts.massValue.textContent = massValue().toFixed(1);
    readouts.barrierValue.textContent = barrierValue().toFixed(1);
    readouts.speedValue.textContent = `${Number(speedInput.value).toFixed(1)}×`;

    readouts.diracPosition.textContent = fixed(dirac.mean, 2);
    readouts.schPosition.textContent = fixed(schrodinger.mean, 2);
    readouts.diracSpeed.textContent = fixed(dirac.speed, 3);
    readouts.schSpeed.textContent = fixed(schrodinger.speed, 3);
    readouts.schSpeed.classList.toggle("over", schrodinger.live && Math.abs(schrodinger.speed) > 1.005);
    readouts.diracSpeed.classList.toggle("over", dirac.live && Math.abs(dirac.speed) > 1.005);
    readouts.diracWidth.textContent = dirac.sigma.toFixed(2);
    readouts.schWidth.textContent = schrodinger.sigma.toFixed(2);
    readouts.diracNorm.textContent = percentage(dirac.norm);
    readouts.schNorm.textContent = percentage(schrodinger.norm);
    ["diracPosition", "diracSpeed", "diracWidth", "diracParts"].forEach((id) => readouts[id].classList.toggle("stale", !dirac.live));
    ["schPosition", "schSpeed", "schWidth"].forEach((id) => readouts[id].classList.toggle("stale", !schrodinger.live));
    const hasWall = scenes[sceneName].edge !== null;
    readouts.diracTransmitted.textContent = hasWall ? percentage(dirac.transmitted) : "-";
    readouts.schTransmitted.textContent = hasWall ? percentage(schrodinger.transmitted) : "-";
    readouts.diracParts.textContent = `${Math.round((1 - dirac.lowerShare) * 100)}% / ${Math.round(dirac.lowerShare * 100)}%`;

    const description = describeVerdict();
    verdict.className = `verdict ${description.tone}`;
    readouts.verdictHead.textContent = description.head;
    readouts.verdictDetail.textContent = description.detail;
  }

  function selectScene(name) {
    sceneName = name;
    const scene = scenes[name];
    momentumInput.value = scene.momentum;
    massInput.value = scene.mass;
    barrierInput.value = scene.barrier;
    barrierInput.disabled = scene.shape === "free";
    document.querySelectorAll(".scenario").forEach((button) => button.classList.toggle("on", button.dataset.scene === name));
    readouts.speedLabel.textContent = scene.focus === "width"
      ? "edge speed dσ/dt · in units of c"
      : "average speed ⟨v⟩ · in units of c";
    readouts.sceneTitle.textContent = scene.title;
    readouts.sceneNote.textContent = scene.note;
    reset();
  }

  function frame() {
    requestAnimationFrame(frame);
    if (!visible) return;
    if (!paused) {
      if (holdFrames > 0) {
        holdFrames -= 1;
        if (holdFrames === 0) { reset(); fadeInFrames = FADE_IN; }
      } else {
        if (fadeInFrames > 0) fadeInFrames -= 1;
        const steps = Math.max(1, Math.round(STEPS_PER_FRAME * Number(speedInput.value)));
        for (let i = 0; i < steps; i += 1) step();
        measure();
        recordHistory();
        if (exhausted()) holdFrames = HOLD_FRAMES;
        updateReadout();
      }
    }
    drawWave();
    drawSpacetime();
    drawSpeed();
    if (dispersionPending) drawDispersion();
  }

  document.querySelectorAll(".scenario").forEach((button) => {
    button.addEventListener("click", () => selectScene(button.dataset.scene));
  });
  [momentumInput, massInput, barrierInput].forEach((input) => input.addEventListener("input", reset));
  speedInput.addEventListener("input", updateReadout);
  playButton.addEventListener("click", () => {
    paused = !paused;
    playButton.textContent = paused ? "Run" : "Pause";
  });
  document.getElementById("simReset").addEventListener("click", reset);
  window.addEventListener("resize", () => {
    drawWave();
    drawSpacetime();
    drawDispersion();
    drawSpeed();
  });
  window.addEventListener("lesson:slide", (event) => {
    visible = event.detail.simulator;
    if (visible) reset();
  });

  visible = document.querySelector("[data-simulator]").classList.contains("on");
  selectScene("race");
  requestAnimationFrame(frame);
}());
