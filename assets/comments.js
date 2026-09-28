// Reader questions via giscus (GitHub Discussions, category "Q&A").
// One discussion per slide, keyed by lesson folder + slide number. Loaded lazily on first open.
(function () {
  var REPO = 'dthuong00/physics-equations';
  var REPO_ID = 'R_kgDOTq8f0Q';
  var CATEGORY = 'Q&A';
  var CATEGORY_ID = 'DIC_kwDOTq8f0c4DGboo';

  var LABELS = {
    en: { open: 'Questions?', title: 'Questions about slide {n}', hint: 'Sign in with GitHub to post. stored as a GitHub Discussion.', close: 'Close' },
    vi: { open: 'Có câu hỏi?', title: 'Câu hỏi về slide {n}', hint: 'Đăng nhập GitHub để gửi.lưu trong GitHub Discussions.', close: 'Đóng' }
  };

  var css = '\
.qa-open{position:fixed;right:18px;bottom:calc(var(--nav-height,64px) + 14px);z-index:30;border:1px solid var(--ink,#1b1d20);border-radius:999px;background:var(--ink,#1b1d20);color:#fff;padding:9px 15px;font:inherit;font-size:12px;font-weight:750;cursor:pointer;box-shadow:0 10px 26px rgba(0,0,0,.18)}\
.qa-open:hover{transform:translateY(-1px)}\
.qa-panel{position:fixed;inset:0;z-index:40;display:none}\
.qa-panel.on{display:block}\
.qa-panel .qa-backdrop{position:absolute;inset:0;background:rgba(20,22,26,.42)}\
.qa-panel .qa-sheet{position:absolute;top:0;right:0;bottom:0;width:min(560px,100%);display:flex;flex-direction:column;background:var(--paper,#fff);box-shadow:-18px 0 46px rgba(0,0,0,.18);animation:qa-in .22s ease both}\
@keyframes qa-in{from{transform:translateX(30px);opacity:0}}\
.qa-head{display:flex;align-items:flex-start;gap:12px;padding:18px 20px 12px;border-bottom:1px solid var(--line,#dedfe3)}\
.qa-head h2{margin:0;font-size:17px;line-height:1.2;letter-spacing:-.02em}\
.qa-head p{margin:5px 0 0;color:var(--muted,#65676d);font-size:12px;line-height:1.5}\
.qa-close{margin-left:auto;border:1px solid var(--line,#dedfe3);border-radius:8px;background:#fff;padding:6px 10px;font:inherit;font-size:11px;font-weight:750;cursor:pointer}\
.qa-body{flex:1;overflow:auto;padding:12px 20px 30px}\
@media (max-width:760px){.qa-open{right:12px;bottom:calc(var(--nav-height,64px) + 10px);padding:8px 12px}}';

  function lang() {
    var l = (document.documentElement.lang || 'en').slice(0, 2);
    return LABELS[l] ? l : 'en';
  }

  // Lesson folder, e.g. "navier-stokes"; falls back to the full path for pages outside a folder.
  function lessonKey() {
    var parts = location.pathname.split('/').filter(Boolean);
    if (parts.length && /\.html?$/i.test(parts[parts.length - 1])) parts.pop();
    return parts[parts.length - 1] || location.pathname;
  }

  // Current slide: 1-based index of the ".slide.on" section, with the URL hash as a fallback.
  function currentSlide() {
    var slides = Array.prototype.slice.call(document.querySelectorAll('.slide'));
    var on = document.querySelector('.slide.on');
    var n = on ? slides.indexOf(on) + 1 : Number.parseInt(location.hash.slice(1), 10);
    if (!(n > 0)) n = 1;
    return { n: n, title: on && on.dataset.title ? on.dataset.title : '' };
  }

  function mount() {
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    var open = document.createElement('button');
    open.className = 'qa-open';
    open.type = 'button';

    var panel = document.createElement('div');
    panel.className = 'qa-panel';
    panel.innerHTML =
      '<div class="qa-backdrop"></div>' +
      '<aside class="qa-sheet" role="dialog" aria-modal="true">' +
        '<div class="qa-head"><div><h2></h2><p></p></div><button class="qa-close" type="button"></button></div>' +
        '<div class="qa-body"></div>' +
      '</aside>';

    document.body.appendChild(open);
    document.body.appendChild(panel);

    var body = panel.querySelector('.qa-body');
    var loadedKey = null;

    function relabel() {
      var t = LABELS[lang()];
      var slide = currentSlide();
      open.textContent = t.open;
      panel.querySelector('h2').textContent = t.title.replace('{n}', slide.n) + (slide.title ? ' · ' + slide.title : '');
      panel.querySelector('p').textContent = t.hint;
      panel.querySelector('.qa-close').textContent = t.close;
    }

    function loadGiscus() {
      var l = lang();
      var slide = currentSlide();
      var term = lessonKey() + ' · slide ' + slide.n;
      var key = l + '|' + term;
      if (loadedKey === key) return;
      loadedKey = key;
      body.innerHTML = '';
      var s = document.createElement('script');
      s.src = 'https://giscus.app/client.js';
      s.async = true;
      s.crossOrigin = 'anonymous';
      var attrs = {
        'data-repo': REPO, 'data-repo-id': REPO_ID,
        'data-category': CATEGORY, 'data-category-id': CATEGORY_ID,
        'data-mapping': 'specific', 'data-term': term, 'data-strict': '1',
        'data-reactions-enabled': '1', 'data-emit-metadata': '0',
        'data-input-position': 'top', 'data-theme': 'light',
        'data-lang': l, 'data-loading': 'lazy'
      };
      Object.keys(attrs).forEach(function (k) { s.setAttribute(k, attrs[k]); });
      body.appendChild(s);
    }

    function show() { relabel(); loadGiscus(); panel.classList.add('on'); }
    function hide() { panel.classList.remove('on'); }

    open.addEventListener('click', show);
    panel.querySelector('.qa-close').addEventListener('click', hide);
    panel.querySelector('.qa-backdrop').addEventListener('click', hide);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && panel.classList.contains('on')) hide(); });

    // Keep the button label in sync when the lesson switches language.
    new MutationObserver(relabel).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    relabel();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
