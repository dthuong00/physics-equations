#!/usr/bin/env python3
"""Capture any page in this repo as a high-resolution .png (and optionally an A4 .pdf).

Examples:
  # A4 summary sheet at 3x (about 2400 px wide), plus a vector PDF
  python tools/capture.py navier-stokes/summary.html --crop .sheet --print --pdf

  # square thumbnail rendered at 2x
  python tools/capture.py navier-stokes/thumbnail.html --width 1080 --height 1080 --scale 2 --out assets/media/navier-stokes

  # one slide of a lesson, cropped to an element, after a click
  python tools/capture.py "navier-stokes/#8" --click "button[data-mode=free]" --crop "#blowCanvas" --wait 3000

Outputs land in recordings/ (gitignored) unless --out points elsewhere.

Requires:  pip install playwright  &&  python -m playwright install chromium
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from record import ROOT, start_server  # noqa: E402


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("path", help="page path incl. optional slide hash, e.g. navier-stokes/summary.html")
    parser.add_argument("--width", type=int, default=1440, help="viewport width in CSS px (default 1440)")
    parser.add_argument("--height", type=int, default=900, help="viewport height in CSS px (default 900)")
    parser.add_argument("--scale", type=float, default=3, help="device pixels per CSS px (default 3)")
    parser.add_argument("--crop", help="CSS selector of the element to capture, e.g. .sheet")
    parser.add_argument("--click", action="append", default=[],
                        help="CSS selector to click before capturing (repeatable)")
    parser.add_argument("--wait", type=int, default=1000, help="ms to wait before capturing (default 1000)")
    parser.add_argument("--print", dest="print_media", action="store_true",
                        help="emulate print media, so @media print rules apply (hides toolbars etc.)")
    parser.add_argument("--pdf", action="store_true", help="also write an A4 .pdf of the whole page")
    parser.add_argument("--out", help="output basename (default recordings/<derived-from-path>)")
    args = parser.parse_args()

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        sys.exit("playwright is missing - run: pip install playwright && python -m playwright install chromium")

    slug = args.path.strip("/").replace("/", "-").replace("#", "slide").replace(".html", "").strip("-") or "index"
    out_base = Path(args.out) if args.out else ROOT / "recordings" / slug
    out_base.parent.mkdir(parents=True, exist_ok=True)

    server, port = start_server()
    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context(viewport={"width": args.width, "height": args.height},
                                      device_scale_factor=args.scale)
        page = context.new_page()
        page.goto(f"http://127.0.0.1:{port}/{args.path}", wait_until="networkidle")
        for selector in args.click:
            page.click(selector)
            page.wait_for_timeout(300)
        if args.print_media:
            page.emulate_media(media="print")
        page.wait_for_timeout(args.wait)

        png = out_base.with_suffix(".png")
        if args.crop:
            target = page.locator(args.crop).first
            if not target.bounding_box():
                sys.exit(f"crop selector {args.crop!r} not found or not visible")
            target.screenshot(path=str(png))
        else:
            page.screenshot(path=str(png), full_page=True)
        print(f"wrote {png.relative_to(ROOT) if png.is_relative_to(ROOT) else png} ({png.stat().st_size // 1024} KB)")

        if args.pdf:
            pdf = out_base.with_suffix(".pdf")
            page.emulate_media(media="print")
            page.pdf(path=str(pdf), format="A4", prefer_css_page_size=True, print_background=True)
            print(f"wrote {pdf.relative_to(ROOT) if pdf.is_relative_to(ROOT) else pdf} ({pdf.stat().st_size // 1024} KB)")

        browser.close()
    server.shutdown()


if __name__ == "__main__":
    main()
