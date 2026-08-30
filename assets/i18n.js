(function () {
"use strict";

/* Translation layer shared by every lesson.

   English lives in the source files and is always the fallback. A language pack is an
   overlay keyed by a hash of the English string it replaces, so no markup has to be
   annotated: adopting this in a new lesson is one <script> tag. It also means an edit
   to the English can never silently leave a stale translation behind - the key stops
   matching and the page falls back to the new English until someone retranslates it.

   Strings that live in JavaScript (simulator verdicts, canvas labels) use explicit
   readable keys instead, passed through I18N.t(key, english, vars). */

const DEFAULT = "en";
const STORE = "physics-equations:lang";

const script = document.currentScript;
const dir = (script && script.dataset.dir) || "./i18n";
const LANGS = ((script && script.dataset.langs) || "en:English").split(",").map((entry) => {
  const [code, label] = entry.split(":");
  return { code: code.trim(), label: (label || code).trim() };
});

/* elements whose text is maths, a number, or written by a simulator every frame */
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "CANVAS", "SVG", "OUTPUT", "INPUT", "TEXTAREA"]);
const SKIP_MATCH = ".eq-line,.limit-formula,.formula,.step,.counter,.dots,#toc,.i18n-switch,.scoreboard td,.hero-equation > i,.hero-equation > b,.hero-equation > span:not(.hero-tail),[data-i18n-skip]";
const ATTRS = ["data-title", "aria-label", "title"];

const dicts = { en: {} };
let units = null;
let current = DEFAULT;

/* FNV-1a, so the generator and the page can agree on a key without shipping a hasher */
function hash(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

const norm = (text) => text.replace(/\s+/g, " ").trim();
const hasWords = (text) => /[\p{L}]/u.test(text);

/* A node is a translation unit when it holds text of its own. We stop there rather
   than descending, so "a <b>bold</b> word" stays one sentence for the translator. */
function collect(node, found) {
  for (const el of node.children) {
    if (SKIP_TAGS.has(el.tagName) || el.matches(SKIP_MATCH)) continue;

    for (const name of ATTRS) {
      const value = el.getAttribute(name);
      if (value && hasWords(value)) {
        found.push({ el, attr: name, key: "a:" + hash(norm(value)), source: value });
      }
    }

    const own = [...el.childNodes].some((child) => child.nodeType === 3 && hasWords(child.nodeValue));
    if (own) {
      const source = el.innerHTML;
      found.push({ el, key: (el.dataset.i18n || "t:" + hash(norm(source))), source });
    } else {
      collect(el, found);
    }
  }
}

function scan() {
  if (units) return units;
  const found = [];
  collect(document.body, found);
  const meta = document.querySelector('meta[name="description"]');
  if (meta) found.push({ el: meta, attr: "content", key: "a:" + hash(norm(meta.content)), source: meta.content });
  if (document.title) {
    found.push({ el: document.querySelector("title"), key: "t:" + hash(norm(document.title)), source: document.title });
  }
  units = found;
  return units;
}

function apply() {
  const dict = dicts[current] || {};
  for (const unit of scan()) {
    const value = current === DEFAULT ? unit.source : (dict[unit.key] || unit.source);
    if (unit.attr) {
      if (unit.el.getAttribute(unit.attr) !== value) unit.el.setAttribute(unit.attr, value);
    } else if (unit.el.innerHTML !== value) {
      unit.el.innerHTML = value;
    }
  }
  document.documentElement.lang = current;
  document.documentElement.removeAttribute("data-i18n-pending");
  for (const button of document.querySelectorAll(".i18n-switch button")) {
    button.classList.toggle("on", button.dataset.lang === current);
    button.setAttribute("aria-pressed", String(button.dataset.lang === current));
  }
  window.dispatchEvent(new CustomEvent("i18n:change", { detail: { lang: current } }));
}

function load(lang, done) {
  if (lang === DEFAULT || dicts[lang]) return done();
  const tag = document.createElement("script");
  tag.src = dir + "/" + lang + ".js";
  tag.onload = done;
  tag.onerror = () => {
    dicts[lang] = {};
    done();
  };
  document.head.appendChild(tag);
}

function set(lang, remember) {
  if (!LANGS.some((entry) => entry.code === lang)) lang = DEFAULT;
  current = lang;
  if (remember !== false) {
    try {
      localStorage.setItem(STORE, lang);
    } catch (error) {
      /* private browsing: the choice just will not survive the tab */
    }
  }
  load(lang, apply);
}

function preferred() {
  const asked = new URLSearchParams(location.search).get("lang");
  if (asked) return asked;
  try {
    const saved = localStorage.getItem(STORE);
    if (saved) return saved;
  } catch (error) {
    /* ignore */
  }
  for (const tag of navigator.languages || [navigator.language || ""]) {
    const match = LANGS.find((entry) => tag.toLowerCase().startsWith(entry.code));
    if (match) return match.code;
  }
  return DEFAULT;
}

function buildSwitch() {
  if (LANGS.length < 2 || document.querySelector(".i18n-switch")) return;
  const box = document.createElement("div");
  box.className = "i18n-switch";
  box.setAttribute("role", "group");
  box.setAttribute("aria-label", "Language");
  for (const entry of LANGS) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.lang = entry.code;
    button.title = entry.label;
    button.textContent = entry.code.toUpperCase();
    button.addEventListener("click", () => set(entry.code));
    box.appendChild(button);
  }
  const nav = document.querySelector(".nav");
  const counter = nav && nav.querySelector(".counter");
  if (counter) nav.insertBefore(box, counter);
  else (nav || document.body).appendChild(box);
}

window.I18N = {
  DEFAULT,
  languages: LANGS,
  get lang() {
    return current;
  },
  register(lang, dict) {
    dicts[lang] = Object.assign(dicts[lang] || {}, dict);
  },
  set,
  /* string lookup for text built in JavaScript; english is both the fallback and the
     value shown in the default language, so call sites stay readable */
  t(key, english, vars) {
    const dict = dicts[current] || {};
    let text = (current !== DEFAULT && dict[key]) || english || "";
    if (vars) {
      text = text.replace(/\{(\w+)\}/g, (whole, name) => (name in vars ? vars[name] : whole));
    }
    return text;
  },
  /* used by tools/i18n.py to dump every translatable string a page contains */
  scan() {
    units = null;
    return scan().map((unit) => ({ key: unit.key, source: unit.source, attr: unit.attr || "" }));
  },
};

function start() {
  buildSwitch();
  set(preferred(), false);
}

const first = preferred();
if (first !== DEFAULT) document.documentElement.setAttribute("data-i18n-pending", "");
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
else start();
}());
