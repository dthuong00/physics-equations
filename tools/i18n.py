#!/usr/bin/env python3
"""Generate and refresh a lesson's language packs.

The page itself decides what is translatable: assets/i18n.js walks the DOM and hashes
each English string into a key. This script loads the lesson in a real browser, asks it
for that list, adds any strings the simulators pass through I18N.t(), and merges the
result into <lesson>/i18n/<lang>.js - keeping every translation that is still needed,
listing the ones that are new, and warning about ones the English no longer contains.

    python tools/i18n.py energy-momentum --lang vi
    python tools/i18n.py energy-momentum --lang vi --check

Needs Playwright (pip install playwright && python -m playwright install chromium).
"""

import argparse
import asyncio
import functools
import http.server
import json
import pathlib
import re
import socketserver
import textwrap
import threading

ROOT = pathlib.Path(__file__).resolve().parent.parent

# t("js.some.key", "English text", { ... })  - as written in the simulator sources
JS_CALL = re.compile(r"""\bt\(\s*"(js\.[\w.]+)"\s*,\s*"((?:[^"\\]|\\.)*)"\s*[,)]""")
# entries in an existing pack, so hand-written translations survive a refresh
PACK_ENTRY = re.compile(r"""^\s*"((?:[ta]:[0-9a-f]{8})|js\.[\w.]+)"\s*:\s*"((?:[^"\\]|\\.)*)"\s*,?\s*$""", re.M)


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def serve(directory):
    handler = functools.partial(QuietHandler, directory=str(directory))
    socketserver.TCPServer.allow_reuse_address = True
    server = socketserver.TCPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server, server.server_address[1]


def js_string(text):
    return json.dumps(text, ensure_ascii=False)


def read_pack(path):
    if not path.exists():
        return {}
    body = path.read_text(encoding="utf-8")
    return {key: json.loads('"%s"' % raw) for key, raw in PACK_ENTRY.findall(body)}


async def scan_page(lesson, port):
    from playwright.async_api import async_playwright

    async with async_playwright() as pw:
        browser = await pw.chromium.launch()
        page = await browser.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        await page.goto(f"http://127.0.0.1:{port}/{lesson}/?lang=en")
        await page.wait_for_timeout(900)
        if not await page.evaluate("Boolean(window.I18N)"):
            raise SystemExit(
                f"{lesson}/index.html does not load assets/i18n.js - add it before running this."
            )
        units = await page.evaluate("window.I18N.scan()")
        titles = await page.evaluate(
            "[...document.querySelectorAll('.slide')].map(s => s.dataset.title)"
        )
        await browser.close()
        if errors:
            print("page errors while scanning:\n  " + "\n  ".join(errors))
        return units, titles


def collect_js(lesson_dir):
    found = {}
    for path in sorted(lesson_dir.glob("*.js")):
        for key, raw in JS_CALL.findall(path.read_text(encoding="utf-8")):
            found[key] = json.loads('"%s"' % raw)
    return found


def group_of(source, titles):
    """Best-effort section label, purely so the generated file reads in page order."""
    for title in titles:
        if title and title in source:
            return title
    return None


def write_pack(path, lang, entries, existing):
    lines = [
        "/* %s language pack - generated key list, translations are hand written." % lang,
        "   Refresh after editing the English with:",
        "       python tools/i18n.py %s --lang %s" % (path.parent.parent.name, lang),
        "   Keys are a hash of the English they replace, so an untranslated or outdated",
        "   entry simply falls back to English rather than showing something stale. */",
        'I18N.register("%s", {' % lang,
        "",
    ]
    section = object()
    for key, source, group in entries:
        if group != section:
            section = group
            lines.append("  /* ---- %s ---- */" % (group or "page"))
        flat = re.sub(r"\s+", " ", source).strip()
        for chunk in textwrap.wrap(flat, 96) or [""]:
            lines.append("  // " + chunk)
        lines.append("  %s: %s," % (js_string(key), js_string(existing.get(key, ""))))
        lines.append("")
    lines.append("});")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("lesson", help="lesson directory, e.g. energy-momentum")
    parser.add_argument("--lang", required=True, help="language code, e.g. vi")
    parser.add_argument("--check", action="store_true", help="report only, write nothing")
    args = parser.parse_args()

    lesson_dir = ROOT / args.lesson
    if not (lesson_dir / "index.html").exists():
        raise SystemExit(f"no such lesson: {args.lesson}")

    server, port = serve(ROOT)
    try:
        units, titles = asyncio.run(scan_page(args.lesson, port))
    finally:
        server.shutdown()

    entries = []
    seen = set()
    for unit in units:
        if unit["key"] in seen:
            continue
        seen.add(unit["key"])
        entries.append((unit["key"], unit["source"], group_of(unit["source"], titles)))

    for key, english in collect_js(lesson_dir).items():
        if key not in seen:
            seen.add(key)
            entries.append((key, english, "simulators"))

    path = lesson_dir / "i18n" / f"{args.lang}.js"
    existing = read_pack(path)
    translated = [key for key, *_ in entries if existing.get(key)]
    missing = [(key, src) for key, src, _ in entries if not existing.get(key)]
    stale = sorted(set(existing) - seen)

    print(f"{args.lesson} -> {args.lang}")
    print(f"  {len(entries)} strings on the page and in the simulators")
    print(f"  {len(translated)} translated, {len(missing)} still English")
    if stale:
        print(f"  {len(stale)} entries no longer match any English - the source text changed:")
        for key in stale[:12]:
            print(f"    {key}  {js_string(existing[key])[:70]}")
    if missing and args.check:
        print("  untranslated:")
        for key, src in missing[:12]:
            print("    %s  %s" % (key, re.sub(r"\s+", " ", src)[:70]))

    if args.check:
        return
    write_pack(path, args.lang, entries, existing)
    print(f"  wrote {path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
