(function(){
"use strict";
const $ = function(id){ return document.getElementById(id); };

/* ============================================================
   DECK NAVIGATION
   ============================================================ */
const slides = Array.prototype.slice.call(document.querySelectorAll('.slide'));
const dots = $('dots'), toc = $('toc');
let idx = 0;

slides.forEach(function(s, i){
  const d = document.createElement('button');
  d.className = 'dot';
  d.type = 'button';
  d.title = (i+1) + '. ' + s.dataset.title;
  d.setAttribute('aria-label', 'Go to slide ' + (i+1) + ': ' + s.dataset.title);
  d.addEventListener('click', function(){ go(i); });
  dots.appendChild(d);

  if(i > 0 && toc){
    const b = document.createElement('button');
    b.type = 'button';
    b.innerHTML = '<i>' + String(i).padStart(2,'0') + '</i>' + s.dataset.title;
    b.addEventListener('click', function(){ go(i); });
    toc.appendChild(b);
  }
});
$('tot').textContent = slides.length;

/* the simulator only runs while its slide is on screen */
let onShow = null, onHide = null;
window.__registerSim = function(show, hide){ onShow = show; onHide = hide; };

function go(n){
  n = Math.max(0, Math.min(slides.length - 1, n));
  const leaving = slides[idx];
  if(leaving && leaving.dataset.sim && n !== idx && onHide) onHide();
  idx = n;
  slides.forEach(function(s, i){
    s.classList.toggle('on', i === n);
    s.scrollTop = 0;
  });
  Array.prototype.forEach.call(dots.children, function(d, i){ d.classList.toggle('on', i === n); });
  $('cur').textContent = n + 1;
  $('ctitle').textContent = slides[n].dataset.title;
  $('pbar').style.width = ((n) / (slides.length - 1) * 100) + '%';
  $('prev').disabled = n === 0;
  $('next').disabled = n === slides.length - 1;
  if(slides[n].dataset.sim && onShow) onShow();
  if(history.replaceState) history.replaceState(null, '', '#' + (n + 1));
}

$('prev').addEventListener('click', function(){ go(idx - 1); });
$('next').addEventListener('click', function(){ go(idx + 1); });

document.addEventListener('keydown', function(e){
  const tag = (e.target.tagName || '').toLowerCase();
  if(tag === 'input' || tag === 'select' || tag === 'textarea') return;
  if(e.key === ' ' && tag === 'button') return;   // let space activate the focused button
  if(e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' '){ e.preventDefault(); go(idx + 1); }
  else if(e.key === 'ArrowLeft' || e.key === 'PageUp'){ e.preventDefault(); go(idx - 1); }
  else if(e.key === 'Home'){ e.preventDefault(); go(0); }
  else if(e.key === 'End'){ e.preventDefault(); go(slides.length - 1); }
});

/* touch swipe */
let tx = 0, ty = 0;
document.addEventListener('touchstart', function(e){
  tx = e.changedTouches[0].clientX; ty = e.changedTouches[0].clientY;
}, {passive:true});
document.addEventListener('touchend', function(e){
  const dxs = e.changedTouches[0].clientX - tx, dys = e.changedTouches[0].clientY - ty;
  if(Math.abs(dxs) > 70 && Math.abs(dxs) > Math.abs(dys) * 1.6) go(idx + (dxs < 0 ? 1 : -1));
}, {passive:true});

/* ============================================================
   FFT (iterative radix-2)
   ============================================================ */
function fft(re, im, inverse){
  const n = re.length;
  for(let i=1, j=0; i<n; i++){
    let bit = n >> 1;
    for(; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if(i < j){
      let t = re[i]; re[i] = re[j]; re[j] = t;
      t = im[i]; im[i] = im[j]; im[j] = t;
    }
  }
  for(let len = 2; len <= n; len <<= 1){
    const ang = (inverse ? 2 : -2) * Math.PI / len;
    const wr = Math.cos(ang), wi = Math.sin(ang);
    const half = len >> 1;
    for(let i = 0; i < n; i += len){
      let cr = 1, ci = 0;
      for(let k = 0; k < half; k++){
        const a = i + k, b = a + half;
        const vr = re[b]*cr - im[b]*ci;
        const vi = re[b]*ci + im[b]*cr;
        re[b] = re[a] - vr; im[b] = im[a] - vi;
        re[a] = re[a] + vr; im[a] = im[a] + vi;
        const nr = cr*wr - ci*wi; ci = cr*wi + ci*wr; cr = nr;
      }
    }
  }
  if(inverse){ for(let i=0;i<n;i++){ re[i] /= n; im[i] /= n; } }
}

/* ============================================================
   GRID
   ============================================================ */
const N = 1024, L = 60, dx = L / N;
const xs = new Float64Array(N), ks = new Float64Array(N);
for(let i=0;i<N;i++){
  xs[i] = -L/2 + i*dx;
  const j = i < N/2 ? i : i - N;
  ks[i] = 2*Math.PI*j/L;
}
const pr = new Float64Array(N), pi = new Float64Array(N);
const V  = new Float64Array(N), absorb = new Float64Array(N);
const kr = new Float64Array(N), ki = new Float64Array(N);
const dt = 0.004;

/* absorbing mask on the outer 12% of each edge */
(function(){
  const w = Math.floor(N * 0.12);
  for(let i=0;i<N;i++) absorb[i] = 1;
  for(let i=0;i<w;i++){
    const s = Math.pow(Math.cos(Math.PI/2 * (w-i)/w), 0.12);
    absorb[i] = s; absorb[N-1-i] = s;
  }
})();

/* ============================================================
   SIMULATOR
   ============================================================ */
const cv = $('wave'), ctx = cv.getContext('2d');
const selPot = $('pot'), inK0 = $('k0'), inSig = $('sig'), inV0 = $('v0'), inSpd = $('spd');
const btnPlay = $('play'), btnReset = $('reset');

const HINTS = {
  free:    'Free particle: the packet drifts and spreads. Narrow σ spreads fastest.',
  harm:    'Harmonic well: kinetic and potential trade places, total stays flat.',
  barrier: 'Barrier: part reflects, part tunnels through. Try k₀ ≈ 2.5, strength ≈ 1.',
  step:    'Step: give it momentum first (k₀ ≈ 2). Even with enough energy to pass, part reflects.',
  box:     'Square well: the packet rattles between the walls and interferes with itself.'
};

let userPaused = false, visible = false, t = 0, scaleLo = 0, scaleHi = 1;
const isRunning = function(){ return visible && !userPaused; };

function buildPotential(){
  const kind = selPot.value, s = parseFloat(inV0.value);
  for(let i=0;i<N;i++){
    const x = xs[i];
    let v = 0;
    if(kind === 'harm')         v = 0.5 * (0.35*s) * (0.35*s) * x * x;
    else if(kind === 'barrier') v = (x > 0 && x < 1.0) ? 4*s : 0;
    else if(kind === 'step')    v = x > 0 ? 2*s : 0;
    else if(kind === 'box')     v = Math.abs(x) < 6 ? 0 : 12*s;
    V[i] = v;
  }
}

function initPacket(){
  const kind = selPot.value;
  const sig = parseFloat(inSig.value), k0 = parseFloat(inK0.value);
  let x0 = -9;
  if(kind === 'harm') x0 = -8;
  else if(kind === 'box') x0 = -3;
  else if(kind === 'free') x0 = k0 > 0.05 ? -12 : 0;

  let norm = 0;
  for(let i=0;i<N;i++){
    const d = (xs[i]-x0)/sig;
    const a = Math.exp(-0.5*d*d);
    pr[i] = a*Math.cos(k0*xs[i]);
    pi[i] = a*Math.sin(k0*xs[i]);
    norm += pr[i]*pr[i] + pi[i]*pi[i];
  }
  norm = Math.sqrt(norm*dx);
  for(let i=0;i<N;i++){ pr[i] /= norm; pi[i] /= norm; }
  t = 0;
}

function halfPotential(){
  for(let i=0;i<N;i++){
    const a = -V[i]*dt*0.5, c = Math.cos(a), s = Math.sin(a);
    const r = pr[i], m = pi[i];
    pr[i] = r*c - m*s; pi[i] = r*s + m*c;
  }
}
function step(){
  halfPotential();
  fft(pr, pi, false);
  for(let i=0;i<N;i++){
    const a = -0.5*ks[i]*ks[i]*dt, c = Math.cos(a), s = Math.sin(a);
    const r = pr[i], m = pi[i];
    pr[i] = r*c - m*s; pi[i] = r*s + m*c;
  }
  fft(pr, pi, true);
  halfPotential();
  for(let i=0;i<N;i++){ pr[i] *= absorb[i]; pi[i] *= absorb[i]; }
  t += dt;
}

let expT = 0, expV = 0, expE = 0, expX = 0, normLeft = 1, norm0 = 1;
let dRef = 0;   // vertical scale for |Ψ|², fixed at reset and allowed only to grow
let shownT = 0, shownV = 0, shownE = 0, shownX = 0;   // last readings backed by a real wave
function measure(){
  let n = 0, v = 0, x = 0;
  for(let i=0;i<N;i++){
    const d = pr[i]*pr[i] + pi[i]*pi[i];
    n += d; v += V[i]*d; x += xs[i]*d;
  }
  normLeft = n*dx;
  expV = n > 0 ? v/n : 0;
  expX = n > 0 ? x/n : 0;

  kr.set(pr); ki.set(pi);
  fft(kr, ki, false);
  let nk = 0, tk = 0;
  for(let i=0;i<N;i++){
    const d = kr[i]*kr[i] + ki[i]*ki[i];
    nk += d; tk += 0.5*ks[i]*ks[i]*d;
  }
  expT = nk > 0 ? tk/nk : 0;
  expE = expT + expV;
}

function setBar(el, zero, val){
  const span = scaleHi - scaleLo;
  const z = (0 - scaleLo) / span;
  const p = (val - scaleLo) / span;
  zero.style.left = (z*100) + '%';
  const lo = Math.min(z, p), hi = Math.max(z, p);
  el.style.left  = (Math.max(0, lo)*100) + '%';
  el.style.width = (Math.max(0, Math.min(1, hi) - Math.max(0, lo))*100) + '%';
}
function updateBars(){
  const keep = normLeft/norm0;
  /* Below ~1% there is nothing left but numerical dust, and every average is a
     ratio - so it still returns a perfectly finite, perfectly meaningless number.
     Freeze the display at the last reading that was backed by a real wave. */
  const spent = keep < 0.01;
  if(!spent){ shownT = expT; shownV = expV; shownE = expE; shownX = expX; }

  setBar($('bT'), $('z2'), shownT);
  setBar($('bV'), $('z3'), shownV);
  setBar($('bE'), $('z1'), shownE);
  $('vT').textContent = shownT.toFixed(3);
  $('vV').textContent = shownV.toFixed(3);
  $('vE').textContent = shownE.toFixed(3);
  $('tval').textContent = t.toFixed(2);
  $('xval').textContent = shownX.toFixed(2);
  $('nval').textContent = spent ? '~0%' : (keep < 0.995 ? (100*keep).toFixed(1) : '100') + '%';
  $('barwrap').classList.toggle('spent', spent);

  const leak = $('leak');
  if(spent){
    leak.textContent = '· the particle has left the window - these are the last readings backed by a real wave. Press Reset.';
    leak.style.display = '';
  } else if(keep < 0.995){
    leak.textContent = '· some of the wave has left the window - ⟨E⟩ is now the average over what is still on screen, not the true total';
    leak.style.display = '';
  } else {
    leak.style.display = 'none';
  }
}

/* ---------------- drawing ---------------- */
let W = 0, H = 0;
function resize(){
  const dpr = window.devicePixelRatio || 1;
  W = cv.clientWidth; H = cv.clientHeight;
  if(W < 2 || H < 2) return false;          // hidden slide - nothing to size yet
  cv.width = Math.round(W*dpr); cv.height = Math.round(H*dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return true;
}
window.addEventListener('resize', function(){ if(resize()) draw(); });

const PAD = 14, VIEW = 26;
function px(x){ return PAD + (x + VIEW)/(2*VIEW) * (W - 2*PAD); }

function draw(){
  if(W < 2 || H < 2) return;
  ctx.clearRect(0,0,W,H);
  const base = H - 28;
  const mid  = base - (base-22)*0.42;

  let maxD = 1e-9;
  for(let i=0;i<N;i++){
    const d = pr[i]*pr[i] + pi[i]*pi[i];
    if(d > maxD) maxD = d;
  }
  /* the |Ψ|² scale may grow (interference spikes) but never shrink - otherwise a
     spreading packet is silently re-normalised to full height and looks unchanged */
  if(maxD > dRef) dRef = maxD;
  const dScale = (base - 24) / Math.max(dRef, 0.05);

  /* scale the potential to the energy, not to its own maximum - tall walls
     simply clip at the ceiling instead of flattening everything else */
  const vRef = Math.max(expE*2.2, 0.5);
  const vScale = (base - 24) / vRef;

  ctx.strokeStyle = '#e8e6df'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(PAD, base+0.5); ctx.lineTo(W-PAD, base+0.5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(PAD, mid+0.5);  ctx.lineTo(W-PAD, mid+0.5);  ctx.stroke();

  /* potential */
  ctx.beginPath();
  ctx.moveTo(px(-VIEW), base);
  for(let i=0;i<N;i++){
    if(xs[i] < -VIEW || xs[i] > VIEW) continue;
    ctx.lineTo(px(xs[i]), base - Math.min(V[i]*vScale, base-6));
  }
  ctx.lineTo(px(VIEW), base);
  ctx.closePath();
  ctx.fillStyle = 'rgba(217,118,47,0.10)'; ctx.fill();
  ctx.strokeStyle = '#d9762f'; ctx.lineWidth = 1.6; ctx.stroke();

  /* total energy level */
  const ey = base - Math.max(0, Math.min(expE*vScale, base-6));
  ctx.setLineDash([5,4]);
  ctx.strokeStyle = '#2e9c66'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(PAD, ey); ctx.lineTo(W-PAD, ey); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#2e9c66'; ctx.font = '600 11px -apple-system,Segoe UI,sans-serif';
  ctx.fillText('⟨E⟩', W-PAD-24, ey-5);

  /* Re / Im */
  const aMax = Math.sqrt(dRef);
  const aScale = (base - mid) / Math.max(aMax, 0.05) * 0.85;
  function curve(arr, color, dash){
    ctx.beginPath();
    let started = false;
    for(let i=0;i<N;i++){
      if(xs[i] < -VIEW || xs[i] > VIEW) continue;
      const X = px(xs[i]), Y = mid - arr[i]*aScale;
      if(!started){ ctx.moveTo(X,Y); started = true; } else ctx.lineTo(X,Y);
    }
    ctx.setLineDash(dash);
    ctx.strokeStyle = color; ctx.lineWidth = 1.3; ctx.stroke();
    ctx.setLineDash([]);
  }
  curve(pi, 'rgba(91,91,214,0.42)', [4,3]);
  curve(pr, 'rgba(91,91,214,0.85)', []);

  /* |Ψ|² */
  ctx.beginPath();
  ctx.moveTo(px(-VIEW), base);
  for(let i=0;i<N;i++){
    if(xs[i] < -VIEW || xs[i] > VIEW) continue;
    const d = pr[i]*pr[i] + pi[i]*pi[i];
    ctx.lineTo(px(xs[i]), base - d*dScale);
  }
  ctx.lineTo(px(VIEW), base);
  ctx.closePath();
  ctx.fillStyle = 'rgba(91,91,214,0.26)'; ctx.fill();
  ctx.strokeStyle = '#3b3b9e'; ctx.lineWidth = 1.8; ctx.stroke();

  ctx.fillStyle = '#8a887f'; ctx.font = '11px -apple-system,Segoe UI,sans-serif';
  ctx.fillText('x', W-PAD-8, base+15);
  ctx.fillText('0', px(0)-3, base+15);
}

/* ---------------- loop ---------------- */
let raf = 0;
function frame(){
  raf = requestAnimationFrame(frame);
  if(!isRunning()) return;
  const steps = Math.max(1, Math.round(6 * parseFloat(inSpd.value)));
  for(let s=0;s<steps;s++) step();
  measure();
  updateBars();
  draw();
}

function reset(){
  buildPotential();
  initPacket();
  measure();
  norm0 = normLeft || 1;
  shownT = expT; shownV = expV; shownE = expE; shownX = expX;
  dRef = 0;
  for(let i=0;i<N;i++){
    const d = pr[i]*pr[i] + pi[i]*pi[i];
    if(d > dRef) dRef = d;
  }
  const lo = Math.min(0, expV, expE);
  const hi = Math.max(0.4, expE, expT, expV) * 1.55;
  scaleLo = lo * 1.4 - 0.05;
  scaleHi = hi;
  $('hint').textContent = '· ' + HINTS[selPot.value];
  updateBars();
  draw();
}

selPot.addEventListener('change', reset);
[inK0, inSig, inV0].forEach(function(el){ el.addEventListener('input', reset); });
inK0.addEventListener('input',  function(){ $('k0v').textContent  = parseFloat(inK0.value).toFixed(1); });
inSig.addEventListener('input', function(){ $('sigv').textContent = parseFloat(inSig.value).toFixed(2); });
inV0.addEventListener('input',  function(){ $('v0v').textContent  = parseFloat(inV0.value).toFixed(2); });
inSpd.addEventListener('input', function(){ $('spdv').textContent = parseFloat(inSpd.value).toFixed(1) + '×'; });
btnPlay.addEventListener('click', function(){
  userPaused = !userPaused;
  btnPlay.textContent = userPaused ? 'Play' : 'Pause';
});
btnReset.addEventListener('click', reset);

window.__registerSim(
  function show(){ visible = true; if(resize()) draw(); },   // canvas has no size until its slide is displayed
  function hide(){ visible = false; }
);

reset();
frame();

/* ============================================================
   PHASOR  e^{-iEt/ħ}
   ============================================================ */
(function(){
  const c = $('phasor');
  if(!c) return;
  const g = c.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const S = 104;
  c.width = S*dpr; c.height = S*dpr;
  c.style.width = S+'px'; c.style.height = S+'px';
  g.setTransform(dpr,0,0,dpr,0,0);
  const cx = S/2, cy = S/2, R = S/2 - 16;
  let a = 0;
  (function spin(){
    requestAnimationFrame(spin);
    a += 0.028;
    g.clearRect(0,0,S,S);
    g.strokeStyle = '#e3e1da'; g.lineWidth = 1;
    g.beginPath(); g.arc(cx, cy, R, 0, 2*Math.PI); g.stroke();
    g.beginPath(); g.moveTo(cx-R-6, cy); g.lineTo(cx+R+6, cy);
    g.moveTo(cx, cy-R-6); g.lineTo(cx, cy+R+6); g.stroke();
    const ex = cx + R*Math.cos(-a), ey = cy + R*Math.sin(-a);
    g.strokeStyle = 'rgba(91,91,214,0.30)'; g.setLineDash([3,3]);
    g.beginPath(); g.moveTo(ex, ey); g.lineTo(ex, cy); g.stroke();
    g.setLineDash([]);
    g.strokeStyle = '#3b3b9e'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(cx, cy); g.lineTo(ex, ey); g.stroke();
    g.fillStyle = '#3b3b9e';
    g.beginPath(); g.arc(ex, ey, 3.4, 0, 2*Math.PI); g.fill();
    g.fillStyle = '#8a887f'; g.font = '9px -apple-system,Segoe UI,sans-serif';
    g.fillText('Re', S-18, cy-4); g.fillText('Im', cx+4, 10);
  })();
})();

/* start on the slide named in the URL hash, else the title slide */
const start = parseInt((location.hash || '').replace('#',''), 10);
go(isNaN(start) ? 0 : start - 1);

})();
