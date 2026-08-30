#!/usr/bin/env python3
"""Record any lesson page in this repo as .webm video (and optionally .gif).

Examples:
  python tools/record.py bell-inequality/#7 --crop .bench-panel --gif
  python tools/record.py bell-inequality/#7 --click "#view2d" --crop .bench-panel --gif
  python tools/record.py bell-inequality/#7 --click "button[data-mode=local]" --seconds 15
  python tools/record.py dirac-equation/#7 --crop .lab-grid --seconds 20
  python tools/record.py schrodinger-equation/#6 --seconds 10 --gif
  python tools/record.py newton-2nd-law/ --seconds 8

Outputs land in recordings/ (gitignored).

Requires:  pip install playwright  &&  python -m playwright install chromium
ffmpeg:    uses the system ffmpeg if on PATH, otherwise Playwright's bundled one.
"""

import argparse
import glob
import os
import shutil
import subprocess
import sys
import tempfile
import threading
import time
from functools import partial
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def find_ffmpeg():
    """Return (path, is_full_build). Playwright's bundled ffmpeg can only write
    webm - no gif muxer, no palette filters - so it counts as a limited build."""
    exe = shutil.which("ffmpeg")
    if exe:
        return exe, True
    suffix = ".exe" if os.name == "nt" else ""
    static = ROOT / "node_modules" / "ffmpeg-static" / ("ffmpeg" + suffix)
    if static.is_file():
        return str(static), True
    candidates = []
    local = os.environ.get("LOCALAPPDATA")
    if local:
        candidates += glob.glob(str(Path(local) / "ms-playwright" / "ffmpeg-*" / "ffmpeg*"))
    candidates += glob.glob(str(Path.home() / ".cache" / "ms-playwright" / "ffmpeg-*" / "ffmpeg*"))
    candidates += glob.glob(str(Path.home() / "Library" / "Caches" / "ms-playwright" / "ffmpeg-*" / "ffmpeg*"))
    for candidate in sorted(candidates):
        path = Path(candidate)
        if path.is_file() and path.suffix != ".txt":
            return str(path), False
    return None, False


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def start_server():
    server = HTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=str(ROOT)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server, server.server_address[1]


def run_ffmpeg(ffmpeg, args):
    result = subprocess.run([ffmpeg, "-y", "-hide_banner", "-loglevel", "error", *args],
                            capture_output=True, text=True)
    if result.returncode != 0:
        sys.exit(f"ffmpeg failed:\n{result.stderr[-2000:]}")


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("path", help="lesson path incl. optional slide hash, e.g. bell-inequality/#7")
    parser.add_argument("--seconds", type=float, default=12, help="recording length (default 12)")
    parser.add_argument("--settle", type=float, default=1.0, help="warm-up seconds trimmed from the start")
    parser.add_argument("--width", type=int, default=1440)
    parser.add_argument("--height", type=int, default=900)
    parser.add_argument("--crop", help="CSS selector of the element to crop the video to, e.g. .bench-panel")
    parser.add_argument("--click", action="append", default=[],
                        help="CSS selector to click before recording (repeatable)")
    parser.add_argument("--gif", action="store_true", help="also produce a .gif")
    parser.add_argument("--fps", type=int, default=12, help="gif frame rate (default 12)")
    parser.add_argument("--gif-width", type=int, default=960, help="gif width in px (default 960)")
    parser.add_argument("--out", help="output basename (default recordings/<derived-from-path>)")
    args = parser.parse_args()

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        sys.exit("playwright is not installed:  pip install playwright  &&  python -m playwright install chromium")

    ffmpeg, full_build = find_ffmpeg()
    if not ffmpeg:
        sys.exit("no ffmpeg found - run `npm install`, or install ffmpeg on your PATH")
    if args.gif and not full_build:
        sys.exit("gif output needs a full ffmpeg - run `npm install` (provides ffmpeg-static) "
                 "or put ffmpeg on your PATH")

    slug = args.path.strip("/").replace("/", "-").replace("#", "slide").strip("-") or "index"
    out_base = Path(args.out) if args.out else ROOT / "recordings" / slug
    out_base.parent.mkdir(parents=True, exist_ok=True)

    server, port = start_server()
    crop_box = None
    with tempfile.TemporaryDirectory() as tmp:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            size = {"width": args.width, "height": args.height}
            context = browser.new_context(viewport=size, record_video_dir=tmp, record_video_size=size)
            page = context.new_page()
            started = time.monotonic()
            page.goto(f"http://127.0.0.1:{port}/{args.path}", wait_until="networkidle")
            for selector in args.click:
                page.click(selector)
                page.wait_for_timeout(300)
            if args.crop:
                crop_box = page.locator(args.crop).first.bounding_box()
                if not crop_box:
                    sys.exit(f"crop selector {args.crop!r} not found or not visible")
            page.wait_for_timeout(int(args.settle * 1000))
            skip = time.monotonic() - started
            page.wait_for_timeout(int(args.seconds * 1000))
            video = page.video
            context.close()
            raw = video.path()
            browser.close()
        server.shutdown()

        filters = []
        if crop_box:
            w = int(crop_box["width"]) // 2 * 2
            h = int(crop_box["height"]) // 2 * 2
            x = max(0, int(crop_box["x"]))
            y = max(0, int(crop_box["y"]))
            filters.append(f"crop={w}:{h}:{x}:{y}")

        webm = str(out_base) + ".webm"
        run_ffmpeg(ffmpeg, ["-ss", f"{skip:.2f}", "-i", raw, "-t", f"{args.seconds:.2f}",
                            *(["-vf", ",".join(filters)] if filters else []),
                            "-c:v", "libvpx", "-qmin", "4", "-qmax", "24", "-b:v", "6M", "-an", webm])
        print(f"wrote {webm} ({Path(webm).stat().st_size // 1024} KB)")

        if args.gif:
            gif = str(out_base) + ".gif"
            gif_filters = ",".join(filters + [
                f"fps={args.fps}",
                f"scale={args.gif_width}:-1:flags=lanczos",
                "split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse"
            ])
            run_ffmpeg(ffmpeg, ["-ss", f"{skip:.2f}", "-i", raw, "-t", f"{args.seconds:.2f}",
                                "-vf", gif_filters, gif])
            print(f"wrote {gif} ({Path(gif).stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
