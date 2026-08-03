(function () {
  "use strict";
  const canvas = document.getElementById("worldCanvas");
  const ctx = canvas.getContext("2d");
  const forceInput = document.getElementById("worldForce");
  const massInput = document.getElementById("worldMass");
  const extraInput = document.getElementById("worldExtra");
  const playButton = document.getElementById("worldPlay");
  const G = 9.81;
  const configs = {
    rocket: { force: [11000, 26000, 500, 18000], mass: [650, 1500, 25, 1000], extra: [2, 35, 1, 18], forceLabel: "Thrust", massLabel: "Wet mass", extraLabel: "Fuel burn", equation: "Fnet = thrust(fuel) − (dry mass + fuel mass)g − drag", title: "Finite-fuel rocket", note: "At zero fuel, thrust stops. During descent, this model assumes aerodynamic stability rotates the unpowered rocket nose-first into the airflow.", action: "Launch" },
    ball: { force: [100, 1200, 25, 650], mass: [.3, .7, .01, .43], extra: [10, 65, 1, 32], forceLabel: "Kick force", massLabel: "Ball mass", extraLabel: "Launch angle", equation: "impulse = F Δt, then Fnet = mg + drag", title: "Projectile with air resistance", note: "The kick acts for 12 ms. Its impulse sets launch speed; after contact, gravity and quadratic air drag curve the flight.", action: "Kick" },
    elevator: { force: [5000, 16000, 250, 9500], mass: [500, 1200, 25, 800], extra: [.5, 4, .1, 2], forceLabel: "Cable tension", massLabel: "Total mass", extraLabel: "Powered time", equation: "Fnet = tension − mg", title: "Elevator under cable tension", note: "While the motor pulls, tension and weight set the acceleration. After the powered interval, tension matches weight and the cabin coasts.", action: "Run elevator" }
  };
  let mode = "rocket";
  let running = false;
  let started = false;
  let last = performance.now();
  let width = 0;
  let height = 0;
  let state;

  function configureRange(input, values) {
    [input.min, input.max, input.step, input.value] = values;
  }

  function reset() {
    running = false;
    started = false;
    const initialMass = Number(massInput.value);
    state = { t: 0, x: 0, y: mode === "ball" ? .22 : 0, vx: 0, vy: 0, ax: 0, ay: 0, net: 0, mass: initialMass, dryMass: initialMass * .55, fuel: initialMass * .45, thrust: 0, angle: 0, angularVelocity: 0, trail: [] };
    playButton.textContent = configs[mode].action;
    updateOutputs();
    draw();
  }

  function setMode(nextMode) {
    mode = nextMode;
    const config = configs[mode];
    document.querySelectorAll(".world-tab").forEach((tab) => tab.classList.toggle("on", tab.dataset.worldMode === mode));
    configureRange(forceInput, config.force);
    configureRange(massInput, config.mass);
    configureRange(extraInput, config.extra);
    document.getElementById("worldForceLabel").textContent = config.forceLabel;
    document.getElementById("worldMassLabel").textContent = config.massLabel;
    document.getElementById("worldExtraLabel").textContent = config.extraLabel;
    document.getElementById("worldEquation").textContent = config.equation;
    document.getElementById("worldTitle").textContent = config.title;
    document.getElementById("worldNote").textContent = config.note;
    reset();
  }

  function start() {
    if (!started) {
      reset();
      started = true;
      if (mode === "ball") {
        const impulse = Number(forceInput.value) * .012;
        const speed = impulse / Number(massInput.value);
        const angle = Number(extraInput.value) * Math.PI / 180;
        state.vx = speed * Math.cos(angle);
        state.vy = speed * Math.sin(angle);
      }
    }
    running = !running;
    playButton.textContent = running ? "Pause" : "Continue";
  }

  function step(dt) {
    const force = Number(forceInput.value);
    const initialMass = Number(massInput.value);
    if (mode === "rocket") {
      const burn = Number(extraInput.value);
      const fuelBefore = state.fuel;
      state.fuel = Math.max(0, state.fuel - burn * dt);
      if (fuelBefore > 0 && state.fuel === 0) playButton.textContent = "Pause · fuel empty";
      state.mass = state.dryMass + state.fuel;
      state.thrust = state.fuel > 0 ? force : 0;
      const density = 1.225 * Math.exp(-state.y / 8500);
      const drag = .5 * density * .7 * .75 * state.vy * Math.abs(state.vy);
      state.net = state.thrust - state.mass * G - drag;
      state.ay = state.net / state.mass;
      state.vy += state.ay * dt;
      state.y = Math.max(0, state.y + state.vy * dt);
      if (state.fuel === 0 && state.vy < -1) {
        const targetAngle = Math.PI;
        const angleError = targetAngle - state.angle;
        const dynamicPressure = .5 * density * state.vy * state.vy;
        const alignment = Math.min(2.8, .55 + dynamicPressure / 900);
        const angularAcceleration = alignment * angleError - 1.8 * state.angularVelocity;
        state.angularVelocity += angularAcceleration * dt;
        state.angle = Math.min(Math.PI, state.angle + state.angularVelocity * dt);
      }
      if (state.y === 0 && state.vy < 0) { state.vy = 0; state.ay = 0; state.net = 0; if (state.fuel === 0) { running = false; playButton.textContent = "Out of fuel"; } }
    } else if (mode === "ball") {
      const speed = Math.hypot(state.vx, state.vy);
      const dragScale = .5 * 1.225 * .47 * .038 * speed;
      const dragX = -dragScale * state.vx;
      const dragY = -dragScale * state.vy;
      state.ax = dragX / state.mass;
      state.ay = dragY / state.mass - G;
      state.net = state.mass * Math.hypot(state.ax, state.ay);
      state.vx += state.ax * dt;
      state.vy += state.ay * dt;
      state.x += state.vx * dt;
      state.y += state.vy * dt;
      if (state.y <= .22 && state.vy < 0) {
        state.y = .22;
        state.vy *= -.62;
        state.vx *= .82;
        if (Math.abs(state.vy) < .35) { state.vy = 0; running = false; }
      }
    } else {
      state.mass = initialMass;
      const tension = state.t < Number(extraInput.value) ? force : state.mass * G;
      state.net = tension - state.mass * G;
      state.ay = state.net / state.mass;
      state.vy += state.ay * dt;
      state.y = Math.max(0, state.y + state.vy * dt);
      if (state.y === 0 && state.vy < 0) { state.vy = 0; state.ay = 0; state.net = 0; }
    }
    state.t += dt;
    if (state.trail.length === 0 || state.t - state.trail[state.trail.length - 1].t > .12) {
      state.trail.push({ x: state.x, y: state.y, t: state.t });
      if (state.trail.length > 90) state.trail.shift();
    }
  }

  function vector(x, y, dx, dy, color, label) {
    const length = Math.hypot(dx, dy);
    if (length < 3) return;
    const ux = dx / length;
    const uy = dy / length;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + dx, y + dy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + dx, y + dy); ctx.lineTo(x + dx - ux * 11 + uy * 6, y + dy - uy * 11 - ux * 6); ctx.lineTo(x + dx - ux * 11 - uy * 6, y + dy - uy * 11 + ux * 6); ctx.closePath(); ctx.fill();
    ctx.font = "700 10px Inter, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(label, x + dx + 7, y + dy + 3);
  }

  function grid(ground, scale, unit) {
    ctx.strokeStyle = "#e4e1d9";
    ctx.fillStyle = "#8e8b82";
    ctx.font = "9px Inter, sans-serif";
    ctx.textAlign = "right";
    for (let value = 0; value * scale < height - 45; value += unit) {
      const y = ground - value * scale;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
      ctx.fillText(`${value} m`, width - 8, y - 4);
    }
  }

  function drawRocket() {
    const ground = height - 32;
    const viewTop = Math.max(80, state.y * 1.25);
    const scale = (height - 70) / viewTop;
    grid(ground, scale, Math.max(20, Math.ceil(viewTop / 5 / 10) * 10));
    const x = width * .48;
    const y = ground - state.y * scale;
    ctx.fillStyle = "#d8d0ba"; ctx.fillRect(0, ground, width, 32);
    const initialFuel = state.dryMass / .55 * .45;
    const fuelFraction = initialFuel > 0 ? state.fuel / initialFuel : 0;
    ctx.strokeStyle = "#315a9f"; ctx.lineWidth = 1.5; ctx.strokeRect(22, 70, 18, Math.max(80, height - 145));
    const gaugeHeight = Math.max(80, height - 145);
    ctx.fillStyle = "#d95d39"; ctx.fillRect(23, 71 + (gaugeHeight - 2) * (1 - fuelFraction), 16, (gaugeHeight - 2) * fuelFraction);
    ctx.fillStyle = "#68665f"; ctx.font = "700 9px Inter, sans-serif"; ctx.textAlign = "left"; ctx.fillText("FUEL", 17, 61); ctx.fillText(`${state.fuel.toFixed(0)} kg`, 47, 82);
    ctx.save(); ctx.translate(x, y); ctx.rotate(state.angle);
    ctx.fillStyle = "#315a9f"; ctx.beginPath(); ctx.moveTo(0, -38); ctx.quadraticCurveTo(25, -19, 18, 20); ctx.lineTo(-18, 20); ctx.quadraticCurveTo(-25, -19, 0, -38); ctx.fill();
    ctx.fillStyle = "#dce8ff"; ctx.beginPath(); ctx.arc(0, -14, 7, 0, Math.PI * 2); ctx.fill();
    if (running && state.thrust > 0) { ctx.fillStyle = "#d95d39"; ctx.beginPath(); ctx.moveTo(-9, 20); ctx.lineTo(0, 48 + Math.random() * 12); ctx.lineTo(9, 20); ctx.fill(); }
    ctx.restore();
    const thrust = state.thrust;
    const weight = state.mass * G;
    vector(x + 24, y, 0, -Math.min(100, thrust / 180), "#d95d39", `thrust ${(thrust / 1000).toFixed(1)} kN`);
    vector(x - 24, y, 0, Math.min(90, weight / 180), "#315a9f", `weight ${(weight / 1000).toFixed(1)} kN`);
  }

  function drawBall() {
    const ground = height - 34;
    const range = Math.max(35, state.x * 1.2);
    const scaleX = (width - 80) / range;
    const scaleY = Math.min(22, (height - 70) / Math.max(10, ...state.trail.map((point) => point.y)));
    grid(ground, scaleY, 5);
    ctx.fillStyle = "#d8d0ba"; ctx.fillRect(0, ground, width, 34);
    ctx.strokeStyle = "rgba(33,128,90,.35)"; ctx.lineWidth = 2; ctx.beginPath();
    state.trail.forEach((point, index) => { const x = 36 + point.x * scaleX; const y = ground - point.y * scaleY; if (index) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.stroke();
    const x = 36 + state.x * scaleX;
    const y = ground - state.y * scaleY;
    ctx.fillStyle = "#315a9f"; ctx.beginPath(); ctx.arc(x, y, 13, 0, Math.PI * 2); ctx.fill();
    vector(x, y, state.ax * 5, -state.ay * 5, "#21805a", "acceleration");
    vector(x - 17, y, 0, Math.min(70, state.mass * G * 10), "#315a9f", `weight ${(state.mass * G).toFixed(1)} N`);
  }

  function drawElevator() {
    const ground = height - 28;
    const scale = Math.min(22, (height - 80) / Math.max(12, state.y * 1.25));
    grid(ground, scale, 5);
    ctx.fillStyle = "#dedbd2"; ctx.fillRect(width * .28, 0, 3, height); ctx.fillRect(width * .72, 0, 3, height);
    const x = width * .5;
    const y = ground - state.y * scale;
    ctx.strokeStyle = "#1c1c1a"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, y - 28); ctx.stroke();
    ctx.fillStyle = "#eaf1ff"; ctx.strokeStyle = "#315a9f"; ctx.lineWidth = 3; ctx.fillRect(x - 48, y - 28, 96, 56); ctx.strokeRect(x - 48, y - 28, 96, 56);
    const tension = state.t < Number(extraInput.value) ? Number(forceInput.value) : state.mass * G;
    vector(x + 58, y, 0, -Math.min(100, tension / 120), "#d95d39", `tension ${(tension / 1000).toFixed(1)} kN`);
    vector(x - 58, y, 0, Math.min(90, state.mass * G / 120), "#315a9f", `weight ${(state.mass * G / 1000).toFixed(1)} kN`);
  }

  function ensureSize() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;
    if (Math.abs(width - rect.width) < 1 && Math.abs(height - rect.height) < 1) return true;
    const dpr = window.devicePixelRatio || 1;
    width = rect.width; height = rect.height;
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return true;
  }

  function draw() {
    if (!ensureSize()) return;
    ctx.clearRect(0, 0, width, height);
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, mode === "rocket" ? "#dce9ff" : "#f7f9fa");
    gradient.addColorStop(1, "#fff");
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height);
    if (mode === "rocket") drawRocket();
    else if (mode === "ball") drawBall();
    else drawElevator();
  }

  function updateOutputs() {
    const force = Number(forceInput.value);
    const mass = Number(massInput.value);
    const extra = Number(extraInput.value);
    document.getElementById("worldForceOut").textContent = mode === "ball" ? `${force.toFixed(0)} N` : `${(force / 1000).toFixed(1)} kN`;
    document.getElementById("worldMassOut").textContent = mode === "ball" ? `${mass.toFixed(2)} kg` : `${mass.toFixed(0)} kg`;
    document.getElementById("worldExtraOut").textContent = mode === "rocket" ? `${extra.toFixed(0)} kg/s` : mode === "ball" ? `${extra.toFixed(0)}°` : `${extra.toFixed(1)} s`;
    document.getElementById("worldTime").textContent = `${state.t.toFixed(2)} s`;
    document.getElementById("worldPosition").textContent = mode === "ball" ? `${state.x.toFixed(1)} m, ${state.y.toFixed(1)} m` : `${state.y.toFixed(1)} m`;
    document.getElementById("worldVelocity").textContent = mode === "ball" ? `${Math.hypot(state.vx, state.vy).toFixed(1)} m/s` : `${state.vy.toFixed(1)} m/s`;
    document.getElementById("worldAcceleration").textContent = `${(mode === "ball" ? Math.hypot(state.ax, state.ay) : state.ay).toFixed(2)} m/s²`;
    document.getElementById("worldNet").textContent = Math.abs(state.net) >= 1000 ? `${(state.net / 1000).toFixed(2)} kN` : `${state.net.toFixed(1)} N`;
    document.getElementById("worldFuel").textContent = mode === "rocket" ? `${state.fuel.toFixed(1)} kg · ${(state.fuel * G / 1000).toFixed(2)} kN` : "Not applicable";
  }

  function frame(now) {
    const dt = Math.min(.025, (now - last) / 1000);
    last = now;
    if (running) {
      for (let i = 0; i < 3; i += 1) step(dt / 3);
      updateOutputs();
    }
    draw();
    requestAnimationFrame(frame);
  }

  document.querySelectorAll(".world-tab").forEach((tab) => tab.addEventListener("click", () => setMode(tab.dataset.worldMode)));
  [forceInput, massInput, extraInput].forEach((input) => input.addEventListener("input", reset));
  playButton.addEventListener("click", start);
  document.getElementById("worldReset").addEventListener("click", reset);
  window.addEventListener("resize", draw);
  setMode("rocket");
  requestAnimationFrame(frame);
}());
