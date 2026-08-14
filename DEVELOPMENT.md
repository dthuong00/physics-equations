# Development

The site is static — no build step. GitHub Pages serves the repository as-is.

## Running locally

```sh
npm start
```

then open <http://localhost:8000/>. Any static server works (`python -m http.server`, VS Code Live Server).

## Dependencies

The dependency is managed through npm and vendored into `assets/` so GitHub Pages can serve it directly. `assets/three.module.js` must stay committed — Pages never runs npm. To upgrade it, bump the version in `package.json`, then:

```sh
npm install
npm run vendor
```

## Recording videos / GIFs

`tools/record.py` captures any lesson as `.webm` (and optionally `.gif`) into `recordings/`. It needs Python with Playwright (`pip install playwright && python -m playwright install chromium`); ffmpeg comes from `npm install` (ffmpeg-static).

```sh
# Bell simulator, cropped to the 3D bench, with a GIF
npm run record -- "bell-inequality/#7" --crop .bench-panel --gif

# same but switched to the 2D view first
npm run record -- "bell-inequality/#7" --click "#view2d" --crop .bench-panel --gif

# any other lesson or slide
npm run record -- "dirac-equation/#8" --crop .lab-grid --seconds 20
npm run record -- "schrodinger-equation/#6" --gif
```

Useful flags: `--seconds` (length), `--click <selector>` (setup interactions, repeatable), `--crop <selector>` (capture one element instead of the full page), `--fps` / `--gif-width` (GIF quality), `--out` (output basename). Run `python tools/record.py --help` for everything.
