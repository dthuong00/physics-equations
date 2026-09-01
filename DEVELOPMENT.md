# Development

The site is static - no build step. GitHub Pages serves the repository as-is.

## Writing a lesson: question first

**Every lesson in this repo is question-driven. A reader must be holding the question
before the answer arrives.** An answer that lands before the question does not read as an
insight - it reads as a fact to memorise, and it slides off. The same sentence lands as
"of course" once the reader has spent ten seconds wanting it.

So no slide may open by stating its result. It opens by making the reader want it.

### The shape of a slide

1. **Ask.** The title carries the question, or the opening line poses it in one sentence.
   Ask it in the reader's own language - the words they would use before knowing any of
   the physics.
2. **Make it bite.** Say why the obvious answer fails, or why two things the reader
   already believes cannot both be true. This is the part that is usually skipped, and it
   is the part that does the work: a question with no tension is not a question.
3. **Answer it.** Now the physics, the notation, the arithmetic - and only the piece that
   this question needs.
4. **Hand over the next question.** Close by pointing at what the answer just left
   unexplained. That is the next slide's opening question, so the deck never needs a
   "next, we will discuss" bridge.

### Rules

- **Titles are claims or questions, never topic labels.** `Two successful theories
  disagree on energy`, `A box of light has weight`, `Find a particle you can never see` -
  each one is an itch. `The Dirac equation`, `Invariant mass`, `Applications` are labels;
  they tell the reader a subject is about to happen and nothing more.
- **The deck opens on a question that needs no physics to feel.** Slide 1 has to be
  answerable-sounding to somebody who has never seen the equation. If understanding the
  first question requires the lesson, the lesson has no way in.
- **Never introduce notation before the reader has asked for it.** A symbol is an answer
  to "what do I call this thing I now need to talk about". Define every ingredient before
  it is used, and put the analogy before the formalism.
- **Answer the objection a student would actually raise.** If a step invites "but hang on
  -", write that objection down in the reader's voice and answer it. Unanswered, it
  blocks everything after it.
- **Simulators are questions too.** The intro states what you are about to find out and
  what to do to find it; the verdict card answers it in words as the numbers move. A
  simulator that only exposes controls is a toy, not a slide - the reader must know what
  they are looking for before they touch a slider.
- **The closing slide answers the question the title asked.** State plainly what the
  reader now knows that they did not at slide 1.

### Checking a deck

Read only the titles, in order. They should read as a chain of questions and claims that
pulls forward on its own. Then read the last line of each slide against the first line of
the next: if the join needs a connective you had to invent, the earlier slide has not
handed over a question and one of the two needs rewriting.

## Running locally

```sh
npm start
```

then open <http://localhost:8000/>. Any static server works (`python -m http.server`, VS Code Live Server).

## Dependencies

The dependency is managed through npm and vendored into `assets/` so GitHub Pages can serve it directly. `assets/three.module.js` must stay committed - Pages never runs npm. To upgrade it, bump the version in `package.json`, then:

```sh
npm install
npm run vendor
```

## Translations

English lives in the source files and is always the fallback. A language pack is an
overlay: `assets/i18n.js` walks the page, hashes each English string into a key, and
swaps in the translation for the chosen language. Nothing in the markup has to be
annotated, and editing the English can never leave a stale translation behind - the key
stops matching and the page falls back to the new English until it is retranslated.

`energy-momentum` is translated into Vietnamese. To add a language to a lesson:

1. Include the runtime in `<head>`:

   ```html
   <link rel="stylesheet" href="../assets/i18n.css">
   <script src="../assets/i18n.js" data-langs="en:English,vi:Tiếng Việt" data-dir="./i18n"></script>
   ```

   `data-langs` is `code:Label` pairs; the first is the default. The switcher is injected
   into the deck's bottom nav, and the choice is remembered in `localStorage` and can be
   forced with `?lang=vi`.

2. Generate the key list:

   ```sh
   python tools/i18n.py energy-momentum --lang vi
   ```

   That writes `energy-momentum/i18n/vi.js` with every string on the page, each preceded
   by the English it replaces as a comment. Fill in the values. Re-run it after editing
   the English to add new keys and list ones that no longer match; `--check` reports
   without writing.

3. Strings built in JavaScript go through `I18N.t()` with an explicit key, so the tool can
   find them:

   ```js
   const t = (key, english, vars) => (window.I18N ? window.I18N.t(key, english, vars) : english);
   label(ctx, t("js.box.atRest", "at rest"), x, y);
   detail.textContent = t("js.disc.hint.detail", "A {sigma}σ bump.", { sigma: value });
   ```

   The English stays at the call site as the fallback, so a missing pack changes nothing.

Two rules keep it working:

- **Anything a simulator rewrites needs `data-i18n-skip`** - verdict cards, live readouts,
  toggle button labels. Otherwise the translator captures whatever it happened to say on
  load and restores that snapshot on every language change. Elements holding only numbers,
  `<output>`, and `.scoreboard td` are skipped automatically.
- **Simulators should listen for `i18n:change`** and re-render whatever they only write on
  demand. Canvas text redraws itself every frame, so it needs nothing.

## Recording videos / GIFs

`tools/record.py` captures any lesson as `.webm` (and optionally `.gif`) into `recordings/`. It needs Python with Playwright (`pip install playwright && python -m playwright install chromium`); ffmpeg comes from `npm install` (ffmpeg-static).

```sh
# Bell simulator, cropped to the 3D bench, with a GIF
npm run record -- "bell-inequality/#8" --crop .bench-panel --gif

# same but switched to the 2D view first
npm run record -- "bell-inequality/#8" --click "#view2d" --crop .bench-panel --gif

# any other lesson or slide
npm run record -- "dirac-equation/#8" --crop .lab-grid --gif --seconds 20
npm run record -- "schrodinger-equation/#6" --gif --seconds 10

# newton rocket launch (click starts the sim before capture)
npm run record -- "newton-2nd-law/#4" --click "#worldPlay" --crop .world-lab --seconds 12 --gif
```

Useful flags: `--seconds` (length), `--click <selector>` (setup interactions, repeatable), `--crop <selector>` (capture one element instead of the full page), `--fps` / `--gif-width` (GIF quality), `--out` (output basename). Run `python tools/record.py --help` for everything.

The README gallery GIFs live in `assets/media/` (committed, unlike `recordings/`). To regenerate one, add `--fps 10 --gif-width 720 --out assets/media/<lesson-name>` to the matching command above and delete the leftover `.webm`.
