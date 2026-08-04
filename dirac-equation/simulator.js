(function () {
  "use strict";
  const canvas = document.getElementById("diracCanvas");
  const context = canvas.getContext("2d");
  const momentumInput = document.getElementById("momentum");
  const massInput = document.getElementById("mass");
  const barrierInput = document.getElementById("barrier");
  const speedInput = document.getElementById("simSpeed");
  const playButton = document.getElementById("simPlay");
  const N = 512;
  const LENGTH = 80;
  const DX = LENGTH / N;
  const DT = .006;
  const START_X = -16;
  const xs = new Float64Array(N);
  const ks = new Float64Array(N);
  const upperR = new Float64Array(N);
  const upperI = new Float64Array(N);
  const lowerR = new Float64Array(N);
  const lowerI = new Float64Array(N);
  const potential = new Float64Array(N);
  const absorb = new Float64Array(N);
  const scenes = {
    free: { momentum: 2, mass: 1, barrier: 0, title: "Free positive-energy packet", note: "Its group velocity is p/E, always below c for nonzero mass. The light-cone edges show the causal speed limit." },
    zitter: { momentum: 1.2, mass: 1, barrier: 0, title: "Zitterbewegung", note: "A deliberately non-energy-eigenstate spinor mixes positive and negative energies. Their interference makes ⟨x⟩ tremble rapidly." },
    klein: { momentum: 2, mass: 1, barrier: 5.5, title: "Klein barrier", note: "A strong barrier couples the incident particle sector to negative-energy states inside it, allowing transmission where a non-relativistic barrier would strongly suppress it." },
    massless: { momentum: 2, mass: 0, barrier: 0, title: "Massless packet", note: "With m = 0 the selected chiral packet travels at exactly c. Its density follows the right edge of the light cone." }
  };
  let sceneName = "free";
  let paused = false;
  let visible = false;
  let time = 0;
  let norm = 1;
  let meanX = START_X;
  let meanVelocity = 0;
  let transmission = 0;
  let densityReference = 1;
  let width = 0;
  let height = 0;

  for (let i = 0; i < N; i += 1) {
    xs[i] = -LENGTH / 2 + i * DX;
    const frequency = i < N / 2 ? i : i - N;
    ks[i] = 2 * Math.PI * frequency / LENGTH;
    const edge = Math.min(i, N - 1 - i) / (N * .1);
    absorb[i] = edge < 1 ? Math.pow(Math.sin(edge * Math.PI / 2), .08) : 1;
  }

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
    if (inverse) {
      for (let i = 0; i < size; i += 1) { real[i] /= size; imaginary[i] /= size; }
    }
  }

  function rotate(real, imaginary, phase) {
    const cosine = Math.cos(phase);
    const sine = Math.sin(phase);
    return [real * cosine - imaginary * sine, real * sine + imaginary * cosine];
  }

  function buildPotential() {
    const strength = Number(barrierInput.value);
    for (let i = 0; i < N; i += 1) potential[i] = xs[i] >= 0 && xs[i] <= 5 ? strength : 0;
  }

  function reset() {
    const momentum = Number(momentumInput.value);
    const mass = Number(massInput.value);
    const energy = Math.sqrt(momentum * momentum + mass * mass);
    const lowerRatio = energy + mass > 1e-9 ? momentum / (energy + mass) : 1;
    const zitter = sceneName === "zitter";
    let total = 0;
    for (let i = 0; i < N; i += 1) {
      const distance = (xs[i] - START_X) / 2.2;
      const envelope = Math.exp(-.5 * distance * distance);
      const phase = momentum * xs[i];
      upperR[i] = envelope * Math.cos(phase);
      upperI[i] = envelope * Math.sin(phase);
      const ratio = zitter ? 0 : lowerRatio;
      lowerR[i] = ratio * upperR[i];
      lowerI[i] = ratio * upperI[i];
      total += upperR[i] ** 2 + upperI[i] ** 2 + lowerR[i] ** 2 + lowerI[i] ** 2;
    }
    const scale = 1 / Math.sqrt(total * DX);
    for (let i = 0; i < N; i += 1) {
      upperR[i] *= scale; upperI[i] *= scale; lowerR[i] *= scale; lowerI[i] *= scale;
    }
    buildPotential();
    time = 0;
    measure();
    densityReference = maximumDensity();
    updateReadout();
    draw();
  }

  function localHalfStep() {
    const mass = Number(massInput.value);
    for (let i = 0; i < N; i += 1) {
      let rotated = rotate(upperR[i], upperI[i], -(potential[i] + mass) * DT / 2);
      upperR[i] = rotated[0]; upperI[i] = rotated[1];
      rotated = rotate(lowerR[i], lowerI[i], -(potential[i] - mass) * DT / 2);
      lowerR[i] = rotated[0]; lowerI[i] = rotated[1];
    }
  }

  function momentumStep() {
    fft(upperR, upperI, false);
    fft(lowerR, lowerI, false);
    for (let i = 0; i < N; i += 1) {
      const cosine = Math.cos(ks[i] * DT);
      const sine = Math.sin(ks[i] * DT);
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

  function step() {
    localHalfStep();
    momentumStep();
    localHalfStep();
    for (let i = 0; i < N; i += 1) {
      upperR[i] *= absorb[i]; upperI[i] *= absorb[i]; lowerR[i] *= absorb[i]; lowerI[i] *= absorb[i];
    }
    time += DT;
  }

  function maximumDensity() {
    let maximum = 0;
    for (let i = 0; i < N; i += 1) {
      maximum = Math.max(maximum, upperR[i] ** 2 + upperI[i] ** 2 + lowerR[i] ** 2 + lowerI[i] ** 2);
    }
    return maximum;
  }

  function measure() {
    let total = 0;
    let position = 0;
    let current = 0;
    let right = 0;
    for (let i = 0; i < N; i += 1) {
      const density = upperR[i] ** 2 + upperI[i] ** 2 + lowerR[i] ** 2 + lowerI[i] ** 2;
      total += density;
      position += xs[i] * density;
      current += 2 * (upperR[i] * lowerR[i] + upperI[i] * lowerI[i]);
      if (xs[i] > 5) right += density;
    }
    norm = total * DX;
    meanX = total > 0 ? position / total : 0;
    meanVelocity = total > 0 ? current / total : 0;
    transmission = total > 0 ? right / total : 0;
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;
    if (Math.abs(width - rect.width) < 1 && Math.abs(height - rect.height) < 1) return true;
    const pixelRatio = window.devicePixelRatio || 1;
    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    return true;
  }

  function screenX(position) {
    return 18 + (position + LENGTH / 2) / LENGTH * (width - 36);
  }

  function drawCurve(real, color, center, scale, dashed) {
    context.beginPath();
    for (let i = 0; i < N; i += 2) {
      const x = screenX(xs[i]);
      const y = center - real[i] * scale;
      if (i === 0) context.moveTo(x, y); else context.lineTo(x, y);
    }
    context.strokeStyle = color;
    context.lineWidth = 1.25;
    context.setLineDash(dashed ? [4, 3] : []);
    context.stroke();
    context.setLineDash([]);
  }

  function draw() {
    if (!resize()) return;
    context.clearRect(0, 0, width, height);
    const baseline = height - 38;
    const componentCenter = height * .28;
    context.fillStyle = "#fff";
    context.fillRect(0, 0, width, height);
    context.strokeStyle = "#e2e1dc";
    context.lineWidth = 1;
    context.beginPath(); context.moveTo(18, baseline); context.lineTo(width - 18, baseline); context.moveTo(18, componentCenter); context.lineTo(width - 18, componentCenter); context.stroke();

    if (Number(barrierInput.value) > 0) {
      const left = screenX(0);
      const right = screenX(5);
      context.fillStyle = "rgba(217,93,57,.12)";
      context.fillRect(left, 15, right - left, baseline - 15);
      context.strokeStyle = "#d95d39";
      context.strokeRect(left, 15, right - left, baseline - 15);
      context.fillStyle = "#d95d39";
      context.font = "700 9px Inter, sans-serif";
      context.fillText(`V₀ ${Number(barrierInput.value).toFixed(1)}`, left + 5, 31);
    }

    const coneLeft = screenX(START_X - time);
    const coneRight = screenX(START_X + time);
    context.strokeStyle = "rgba(33,128,90,.65)";
    context.lineWidth = 1.5;
    context.setLineDash([5, 5]);
    [coneLeft, coneRight].forEach((x) => { if (x > 18 && x < width - 18) { context.beginPath(); context.moveTo(x, 45); context.lineTo(x, baseline); context.stroke(); } });
    context.setLineDash([]);

    const currentMaximum = maximumDensity();
    densityReference = Math.max(densityReference, currentMaximum);
    const densityScale = (baseline - componentCenter - 18) / Math.max(densityReference, .01);
    context.beginPath();
    context.moveTo(screenX(xs[0]), baseline);
    for (let i = 0; i < N; i += 2) {
      const density = upperR[i] ** 2 + upperI[i] ** 2 + lowerR[i] ** 2 + lowerI[i] ** 2;
      context.lineTo(screenX(xs[i]), baseline - density * densityScale);
    }
    context.lineTo(screenX(xs[N - 1]), baseline);
    context.closePath();
    context.fillStyle = "rgba(85,82,185,.23)";
    context.fill();
    context.strokeStyle = "#5552b9";
    context.lineWidth = 1.7;
    context.stroke();

    const amplitudeScale = height * .18 / Math.max(Math.sqrt(densityReference), .01);
    drawCurve(upperR, "#315a9f", componentCenter, amplitudeScale, false);
    drawCurve(lowerR, "#d95d39", componentCenter, amplitudeScale, true);
    context.fillStyle = "#92949a";
    context.font = "9px Inter, sans-serif";
    context.textAlign = "center";
    [-30, -20, -10, 0, 10, 20, 30].forEach((value) => context.fillText(String(value), screenX(value), baseline + 14));
    context.textAlign = "left";
    context.fillText("spinor components · Re ψ", 20, componentCenter - height * .2);
    context.fillText("probability density", 20, baseline - (baseline - componentCenter) + 12);
  }

  function updateReadout() {
    document.getElementById("timeValue").textContent = time.toFixed(2);
    document.getElementById("positionValue").textContent = meanX.toFixed(2);
    document.getElementById("velocityValue").textContent = meanVelocity.toFixed(3);
    document.getElementById("normValue").textContent = norm.toFixed(3);
    document.getElementById("transmissionValue").textContent = Number(barrierInput.value) > 0 ? `${(transmission * 100).toFixed(1)}%` : "—";
    document.getElementById("momentumValue").textContent = Number(momentumInput.value).toFixed(1);
    document.getElementById("massValue").textContent = Number(massInput.value).toFixed(1);
    document.getElementById("barrierValue").textContent = Number(barrierInput.value).toFixed(1);
    document.getElementById("speedValue").textContent = `${Number(speedInput.value).toFixed(1)}×`;
  }

  function selectScene(name) {
    sceneName = name;
    const scene = scenes[name];
    momentumInput.value = scene.momentum;
    massInput.value = scene.mass;
    barrierInput.value = scene.barrier;
    document.querySelectorAll(".scenario").forEach((button) => button.classList.toggle("on", button.dataset.scene === name));
    document.getElementById("sceneTitle").textContent = scene.title;
    document.getElementById("sceneNote").textContent = scene.note;
    reset();
  }

  function frame() {
    requestAnimationFrame(frame);
    const simulatorSlide = document.querySelector("[data-simulator]");
    visible = simulatorSlide.classList.contains("on");
    if (!visible) return;
    if (!paused) {
      const steps = Math.max(1, Math.round(7 * Number(speedInput.value)));
      for (let i = 0; i < steps; i += 1) step();
      measure();
      updateReadout();
    }
    draw();
  }

  document.querySelectorAll(".scenario").forEach((button) => button.addEventListener("click", () => selectScene(button.dataset.scene)));
  [momentumInput, massInput, barrierInput].forEach((input) => input.addEventListener("input", reset));
  speedInput.addEventListener("input", updateReadout);
  playButton.addEventListener("click", () => { paused = !paused; playButton.textContent = paused ? "Run" : "Pause"; });
  document.getElementById("simReset").addEventListener("click", reset);
  window.addEventListener("resize", draw);
  selectScene("free");
  requestAnimationFrame(frame);
}());
