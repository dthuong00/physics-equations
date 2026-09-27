/*
 * A small incompressible Navier–Stokes solver on a regular grid.
 *
 * Every step is one of the terms of the equation, applied in turn:
 *   1. advect      -  (u·∇)u   the fluid carries its own velocity along
 *   2. diffuse     -  ν∇²u     viscosity smooths velocity toward the neighbours' average
 *   3. project     -  −∇p      pressure is chosen so that ∇·u = 0 afterwards
 * (Stam's "stable fluids" splitting, with MacCormack advection so the numerical
 *  viscosity stays small enough for a vortex street to form, and a multigrid
 *  Poisson solve so the pressure is actually converged at large scales.)
 *
 * Works both in the browser (window.FluidSolver) and in Node (module.exports)
 * so the physics can be checked without a canvas.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.FluidSolver = factory();
}(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  class FluidSolver {
    constructor(width, height) {
      this.w = width;
      this.h = height;
      const n = width * height;
      this.u = new Float32Array(n);
      this.v = new Float32Array(n);
      this.u0 = new Float32Array(n);
      this.v0 = new Float32Array(n);
      this.tmp = new Float32Array(n);
      this.p = new Float32Array(n);
      this.div = new Float32Array(n);
      this.dye = new Float32Array(n);
      this.dye0 = new Float32Array(n);
      this.solid = new Uint8Array(n);
      this.inflow = 1;          // cells per step at the left edge; 0 = closed box
      this.nu = 0.1;            // kinematic viscosity, cells² per step
      this.dt = 1;
      this.dyeLanes = [];       // rows where dye is fed in at the inlet
      this.vCycles = 2;
      this.time = 0;
      this.levels = this.buildLevels();
    }

    idx(i, j) { return i + j * this.w; }

    clear() {
      this.u.fill(0); this.v.fill(0); this.p.fill(0); this.dye.fill(0);
      this.time = 0;
      if (this.inflow) this.u.fill(this.inflow);
      this.applySolid();
    }

    setObstacle(cx, cy, radius) {
      const { w, h, solid } = this;
      solid.fill(0);
      this.obstacle = radius > 0 ? { cx, cy, radius } : null;
      if (radius > 0) {
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
          const dx = i + 0.5 - cx, dy = j + 0.5 - cy;
          if (dx * dx + dy * dy <= radius * radius) solid[i + j * w] = 1;
        }
      }
      this.coarsenSolids();
    }

    /* Any solid shape: inside(x, y) says whether a cell centre is inside it. */
    setObstacleShape(inside) {
      const { w, h, solid } = this;
      solid.fill(0);
      this.obstacle = null;
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (inside(i + 0.5, j + 0.5)) solid[i + j * w] = 1;
      this.coarsenSolids();
    }

    /* A swirl for the "stir and let go" scenario: a smooth vortex of the given strength. */
    addVortex(cx, cy, radius, strength) {
      const { w, h, u, v } = this;
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const dx = i + 0.5 - cx, dy = j + 0.5 - cy;
        const r2 = (dx * dx + dy * dy) / (radius * radius);
        const g = strength * Math.exp(-r2);
        const k = i + j * w;
        u[k] += -dy * g / radius;
        v[k] += dx * g / radius;
      }
    }

    addDyeBlob(cx, cy, radius, amount) {
      const { w, h, dye } = this;
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const dx = i + 0.5 - cx, dy = j + 0.5 - cy;
        const r2 = (dx * dx + dy * dy) / (radius * radius);
        if (r2 < 1) dye[i + j * w] = Math.min(1, dye[i + j * w] + amount * (1 - r2));
      }
    }

    /* ---------- one time step ---------- */

    step() {
      const { u, v, u0, v0, dye, dye0, dt } = this;
      this.boundary(u, v);
      this.advectMacCormack(u0, u, u, v, dt);
      this.advectMacCormack(v0, v, u, v, dt);
      u.set(u0); v.set(v0);
      this.applySolid();
      this.boundary(u, v);
      if (this.nu > 0) {
        const a = this.nu * dt;
        const iters = Math.min(14, Math.max(3, Math.round(3 + 3 * a)));
        this.diffuse(u, u0, a, iters);
        this.diffuse(v, v0, a, iters);
        this.applySolid();
        this.boundary(u, v);
      }
      this.project();
      this.applySolid();
      this.boundary(u, v);

      this.feedDye();
      this.advectMacCormack(dye0, dye, u, v, dt);
      dye.set(dye0);
      this.time += dt;
    }

    /* Inflow on the left, free outflow on the right, slip walls top and bottom.
       With no inflow the box is closed. */
    boundary(u, v) {
      const { w, h, inflow } = this;
      for (let j = 0; j < h; j++) {
        const l = j * w, r = l + w - 1;
        if (inflow) {
          u[l] = inflow; v[l] = 0;
          u[r] = u[r - 1]; v[r] = v[r - 1];
        } else {
          u[l] = 0; v[l] = v[l + 1];
          u[r] = 0; v[r] = v[r - 1];
        }
      }
      for (let i = 0; i < w; i++) {
        const t = i, b = i + (h - 1) * w;
        v[t] = 0; u[t] = u[t + w];
        v[b] = 0; u[b] = u[b - w];
      }
    }

    applySolid() {
      const { u, v, solid, dye } = this;
      for (let k = 0; k < solid.length; k++) if (solid[k]) { u[k] = 0; v[k] = 0; dye[k] = 0; }
    }

    feedDye() {
      const { w, dye, inflow } = this;
      if (!inflow) return;
      for (const j of this.dyeLanes) { dye[j * w] = 1; dye[j * w + 1] = 1; }
    }

    /* ---------- advection ---------- */

    bilerp(field, x, y) {
      const { w, h } = this;
      x = x < 0 ? 0 : (x > w - 1.001 ? w - 1.001 : x);
      y = y < 0 ? 0 : (y > h - 1.001 ? h - 1.001 : y);
      const i = x | 0, j = y | 0, fx = x - i, fy = y - j;
      const k = i + j * w;
      return (field[k] * (1 - fx) + field[k + 1] * fx) * (1 - fy) + (field[k + w] * (1 - fx) + field[k + w + 1] * fx) * fy;
    }

    advect(dst, src, u, v, dt) {
      const { w, h } = this;
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const k = i + j * w;
        dst[k] = this.bilerp(src, i - dt * u[k], j - dt * v[k]);
      }
    }

    /* MacCormack: advect forward, advect back, correct by half the error, then clamp
       to the values found around the back-traced point so nothing new is invented. */
    advectMacCormack(dst, src, u, v, dt) {
      const { w, h, tmp } = this;
      this.advect(tmp, src, u, v, dt);          // φ¹ = A(φ)
      this.advect(dst, tmp, u, v, -dt);         // φ² = A⁻¹(φ¹)
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const k = i + j * w;
        let value = tmp[k] + 0.5 * (src[k] - dst[k]);
        let x = i - dt * u[k], y = j - dt * v[k];
        x = x < 0 ? 0 : (x > w - 1.001 ? w - 1.001 : x);
        y = y < 0 ? 0 : (y > h - 1.001 ? h - 1.001 : y);
        const bi = x | 0, bj = y | 0, bk = bi + bj * w;
        const a = src[bk], b = src[bk + 1], c = src[bk + w], d = src[bk + w + 1];
        const lo = Math.min(a, b, c, d), hi = Math.max(a, b, c, d);
        if (value < lo || value > hi) {
          const fx = x - bi, fy = y - bj;
          value = (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
        }
        dst[k] = value;
      }
    }

    /* ---------- viscosity ---------- */

    /* Implicit diffusion: x = (x₀ + a·Σ neighbours) / (1 + 4a), Gauss–Seidel. Solid
       neighbours count as zero velocity (no-slip walls). */
    diffuse(x, x0, a, iters) {
      const { w, h, solid } = this;
      x0.set(x);
      const inv = 1 / (1 + 4 * a);
      for (let iter = 0; iter < iters; iter++) {
        for (let j = 1; j < h - 1; j++) for (let i = 1; i < w - 1; i++) {
          const k = i + j * w;
          if (solid[k]) continue;
          const l = solid[k - 1] ? 0 : x[k - 1], r = solid[k + 1] ? 0 : x[k + 1];
          const t = solid[k - w] ? 0 : x[k - w], b = solid[k + w] ? 0 : x[k + w];
          x[k] = (x0[k] + a * (l + r + t + b)) * inv;
        }
      }
    }

    /* ---------- pressure ---------- */

    /* Pressure projection: find p with ∇²p = ∇·u, then u ← u − ∇p. Solid cells act as
       walls (no pressure jump across them); the right edge is an open outlet (p = 0). */
    project() {
      const { w, h, u, v, p, div, solid } = this;
      div.fill(0);
      for (let j = 1; j < h - 1; j++) for (let i = 1; i < w - 1; i++) {
        const k = i + j * w;
        div[k] = solid[k] ? 0 : 0.5 * (u[k + 1] - u[k - 1] + v[k + w] - v[k - w]);
      }
      this.solvePoisson();
      for (let j = 1; j < h - 1; j++) for (let i = 1; i < w - 1; i++) {
        const k = i + j * w;
        if (solid[k]) continue;
        const l = solid[k - 1] ? p[k] : p[k - 1], r = solid[k + 1] ? p[k] : p[k + 1];
        const t = solid[k - w] ? p[k] : p[k - w], b = solid[k + w] ? p[k] : p[k + w];
        u[k] -= 0.5 * (r - l);
        v[k] -= 0.5 * (b - t);
      }
    }

    /* Geometric multigrid for  Σ(neighbours) − n·p = rhs  with Neumann walls (a missing
       or solid neighbour simply drops out of the sum) and, when there is an inflow, p = 0
       beyond the right edge so the outlet is open. Cell-centred coarsening by 2. */
    buildLevels() {
      const levels = [];
      let w = this.w, h = this.h;
      while (true) {
        const n = w * h;
        levels.push({
          w, h,
          p: levels.length ? new Float32Array(n) : this.p,
          rhs: levels.length ? new Float32Array(n) : this.div,
          res: new Float32Array(n),
          solid: levels.length ? new Uint8Array(n) : this.solid,
        });
        if (w % 2 || h % 2 || w <= 8 || h <= 4) break;
        w /= 2; h /= 2;
      }
      return levels;
    }

    coarsenSolids() {
      const { levels } = this;
      for (let l = 1; l < levels.length; l++) {
        const fine = levels[l - 1], coarse = levels[l];
        for (let j = 0; j < coarse.h; j++) for (let i = 0; i < coarse.w; i++) {
          const f = 2 * i + 2 * j * fine.w;
          coarse.solid[i + j * coarse.w] =
            fine.solid[f] & fine.solid[f + 1] & fine.solid[f + fine.w] & fine.solid[f + fine.w + 1];
        }
      }
    }

    /* One Gauss–Seidel sweep of  Σ nb − n·p = rhs  on a level. */
    smooth(level, sweeps) {
      const { w, h, p, rhs, solid } = level;
      const open = this.inflow > 0;
      for (let s = 0; s < sweeps; s++) {
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
          const k = i + j * w;
          if (solid[k]) continue;
          let sum = 0, n = 0;
          if (i > 0 && !solid[k - 1]) { sum += p[k - 1]; n++; }
          if (i < w - 1) { if (!solid[k + 1]) { sum += p[k + 1]; n++; } } else if (open) n++;
          if (j > 0 && !solid[k - w]) { sum += p[k - w]; n++; }
          if (j < h - 1 && !solid[k + w]) { sum += p[k + w]; n++; }
          if (n) p[k] = (sum - rhs[k]) / n;
        }
      }
    }

    residual(level) {
      const { w, h, p, rhs, res, solid } = level;
      const open = this.inflow > 0;
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const k = i + j * w;
        if (solid[k]) { res[k] = 0; continue; }
        let sum = 0, n = 0;
        if (i > 0 && !solid[k - 1]) { sum += p[k - 1]; n++; }
        if (i < w - 1) { if (!solid[k + 1]) { sum += p[k + 1]; n++; } } else if (open) n++;
        if (j > 0 && !solid[k - w]) { sum += p[k - w]; n++; }
        if (j < h - 1 && !solid[k + w]) { sum += p[k + w]; n++; }
        res[k] = rhs[k] - (sum - n * p[k]);
      }
    }

    vcycle(l) {
      const { levels } = this;
      const level = levels[l];
      if (l === levels.length - 1) { this.smooth(level, 40); return; }
      this.smooth(level, 3);
      this.residual(level);
      const coarse = levels[l + 1];
      /* Restrict: average the four children; the coarse Laplacian has spacing 2, so
         the right-hand side scales by 4 to keep ∇²e = r in the same units. */
      for (let j = 0; j < coarse.h; j++) for (let i = 0; i < coarse.w; i++) {
        const f = 2 * i + 2 * j * level.w;
        coarse.rhs[i + j * coarse.w] = level.res[f] + level.res[f + 1] + level.res[f + level.w] + level.res[f + level.w + 1];
        coarse.p[i + j * coarse.w] = 0;
      }
      this.vcycle(l + 1);
      /* Prolong: inject the coarse correction into its four children. */
      for (let j = 0; j < coarse.h; j++) for (let i = 0; i < coarse.w; i++) {
        const e = coarse.p[i + j * coarse.w];
        const f = 2 * i + 2 * j * level.w;
        level.p[f] += e; level.p[f + 1] += e; level.p[f + level.w] += e; level.p[f + level.w + 1] += e;
      }
      this.smooth(level, 3);
    }

    solvePoisson() {
      /* Warm start from last step's pressure - the field changes little between steps. */
      for (let c = 0; c < this.vCycles; c++) this.vcycle(0);
    }

    /* ---------- diagnostics ---------- */

    vorticity(out) {
      const { w, h, u, v } = this;
      out = out || new Float32Array(w * h);
      for (let j = 1; j < h - 1; j++) for (let i = 1; i < w - 1; i++) {
        const k = i + j * w;
        out[k] = 0.5 * (v[k + 1] - v[k - 1]) - 0.5 * (u[k + w] - u[k - w]);
      }
      return out;
    }

    /* RMS size of the two competing terms of the equation over the fluid cells:
       inertia |(u·∇)u| and viscosity |ν∇²u|. Their ratio is what Re estimates. */
    termSizes() {
      const { w, h, u, v, solid, nu } = this;
      let inertia = 0, viscous = 0, count = 0, energy = 0, maxVort = 0, divergence = 0;
      for (let j = 1; j < h - 1; j++) for (let i = 1; i < w - 1; i++) {
        const k = i + j * w;
        if (solid[k]) continue;
        const ux = 0.5 * (u[k + 1] - u[k - 1]), uy = 0.5 * (u[k + w] - u[k - w]);
        const vx = 0.5 * (v[k + 1] - v[k - 1]), vy = 0.5 * (v[k + w] - v[k - w]);
        const ax = u[k] * ux + v[k] * uy, ay = u[k] * vx + v[k] * vy;
        const lu = u[k + 1] + u[k - 1] + u[k + w] + u[k - w] - 4 * u[k];
        const lv = v[k + 1] + v[k - 1] + v[k + w] + v[k - w] - 4 * v[k];
        inertia += ax * ax + ay * ay;
        viscous += nu * nu * (lu * lu + lv * lv);
        energy += 0.5 * (u[k] * u[k] + v[k] * v[k]);
        divergence += Math.abs(ux + vy);
        const vort = Math.abs(vx - uy);
        if (vort > maxVort) maxVort = vort;
        count++;
      }
      return {
        inertia: Math.sqrt(inertia / count),
        viscous: Math.sqrt(viscous / count),
        energy,
        maxVorticity: maxVort,
        meanDivergence: divergence / count,
      };
    }
  }

  return FluidSolver;
}));
