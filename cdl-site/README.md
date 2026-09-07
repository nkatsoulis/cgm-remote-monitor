# cdl.wichitafallsequipment.com

Texas CDL knowledge-test practice site. Static HTML, CSS and vanilla JavaScript — no build step, no
framework, no backend, no dependencies. Drop the folder on any static host and it runs.

## What's here

```
cdl-site/
├── index.html                 landing page: test cards, "which tests do I need", exam info
├── test.html                  the quiz engine page (?t=<section-id>&mode=study|exam)
├── CNAME                      cdl.wichitafallsequipment.com (GitHub Pages custom domain)
├── robots.txt, sitemap.xml
├── assets/css/styles.css      all styling, light + dark, responsive
├── assets/js/routing.js       URL-scheme seam (real URLs vs. hash routes)
├── assets/js/home.js          renders the test cards and saved best scores
├── assets/js/quiz.js          the quiz engine
├── build-standalone.js        builds dist/index.html, the whole site as one file
├── dist/index.html            generated — do not edit by hand
├── assets/img/favicon.svg
└── data/
    ├── sections.js            the nine sections: question counts, pass marks, descriptions
    └── questions-*.js         one question bank per section
```

## The nine sections

| Section | ID | Questions drawn | To pass | In the bank |
|---|---|---|---|---|
| General Knowledge | `general-knowledge` | 50 | 40 | 67 |
| Air Brakes | `air-brakes` | 25 | 20 | 38 |
| Combination Vehicles | `combination` | 20 | 16 | 30 |
| Doubles & Triples (T) | `doubles-triples` | 20 | 16 | 24 |
| Tank Vehicles (N) | `tanker` | 20 | 16 | 24 |
| Hazardous Materials (H) | `hazmat` | 30 | 24 | 36 |
| Passenger Transport (P) | `passenger` | 20 | 16 | 26 |
| School Bus (S) | `school-bus` | 20 | 16 | 26 |
| Pre-Trip Inspection | `pre-trip` | 20 | 16 | 24 |

295 questions total. Every section is scored against Texas's 80% passing requirement.

## Behavior

- **Study mode** grades each question the moment it's answered and shows the explanation.
- **Exam mode** gives no feedback until the end, then a pass/fail plus a review of everything missed.
- Each attempt draws a fresh randomized subset from the bank, so repeat attempts aren't identical.
- Best score per section is kept in `localStorage` (key `wfe-cdl-best`) and shown on the home page.
  Blocked or cleared storage degrades silently — the tests still work.
- Keyboard: `A`–`D` or `1`–`4` to answer, `Enter` to advance.

## Editing questions

Each bank is a plain array. Add an entry and it's live — nothing to rebuild:

```js
{
  q: "Question text?",
  a: ["Option A", "Option B", "Option C", "Option D"],  // always exactly four
  c: 2,                                                  // index of the correct option
  e: "Why that answer is correct."
}
```

Adding a whole new section: add an entry to `data/sections.js`, create
`data/questions-<id>.js` that pushes onto `window.CDL_BANK['<id>']`, and add the `<script>` tag to
both `index.html` and `test.html`.

Options are deliberately never "all of the above" / "none of the above", so answer order stays
meaningful and the banks can be extended safely.

## Single-file build

`node build-standalone.js` regenerates `dist/index.html`: the entire site — CSS, all nine question
banks, the quiz engine — inlined into one self-contained HTML file with no external requests.

It is not a second copy of the app. It pulls the same CSS, the same data files, the same
`home.js` and `quiz.js`, and the same page markup out of `index.html` and `test.html`. The only
difference is the URL scheme, which both sides get from `assets/js/routing.js`: the multi-page site
uses `test.html?t=<id>&mode=<mode>`, and the single file overrides that seam with hash routes
(`#/t/<id>/<mode>`). Change a question or a style and re-run the build; the two stay in sync.

Use it for a host that only accepts one file, for sharing a preview, or for offline study — it
works from a `file://` URL.

Re-run the build after any change to `assets/` or `data/`.

## Local preview

```bash
cd cdl-site && python3 -m http.server 8811
# http://localhost:8811/
```

## Deploying to cdl.wichitafallsequipment.com

The `CNAME` file is already set. Any of these work:

**GitHub Pages** — publish this directory as the Pages source (or push its contents to a
`gh-pages` branch), then add a DNS `CNAME` record for `cdl` pointing at
`<org>.github.io.` and enable "Enforce HTTPS".

**Cloudflare Pages / Netlify** — connect the repo, set the build command to none and the
publish/output directory to `cdl-site`, then add `cdl.wichitafallsequipment.com` as a custom domain.

**Any web server** — copy the directory to the docroot for the subdomain. It's all static files;
no server-side runtime is needed. If the host only takes a single file, upload `dist/index.html`.

DNS in every case: a `CNAME` record for the `cdl` host pointing at the hosting provider's target.

## Content and legal

Every question is original, written from the **Texas Commercial Motor Vehicle Drivers Handbook**
(Texas DPS) and the federal motor carrier safety regulations — the material the real exam is built
from. No question text was copied from any commercial practice-test site. The section lineup matches
the knowledge exams Texas actually administers.

The site states plainly, on both pages, that it is an independent study aid not affiliated with or
endorsed by Texas DPS, and that these are not the questions used on the state exam. Keep that
disclaimer in place.
