# 05 — ARCHITECTURE

## Decisions
- **Static site, no build step.** Vanilla JS ES modules, plain CSS. Zero dependencies. Works by uploading the folder to Vercel.
- **Routing:** hash-based (`#/setup`, `#/test`, `#/result/<id>`) — no server rewrites needed.
- **Storage:** `localStorage` (keys below), wrapped in `try/catch` with in-memory fallback (private mode).
- **Data:** `practice/data/questions.json` fetched once, cached by the service worker.
- **No database, no API, no analytics, no cookies.**

## Final folder structure
```
/                          ← project root (deployed)
├─ index.html              ← landing page (exists; only link edits allowed — Task L1)
├─ assets/
│  └─ logo.png             ← extracted once from index.html
├─ practice/
│  ├─ index.html           ← app shell (header, <main id="app">, scripts)
│  ├─ manifest.webmanifest
│  ├─ sw.js                ← service worker (offline cache)
│  ├─ css/
│  │  ├─ tokens.css        ← variables from 02
│  │  ├─ base.css
│  │  ├─ components.css
│  │  ├─ screens.css
│  │  └─ print.css
│  ├─ js/
│  │  ├─ main.js           ← boot, router
│  │  ├─ router.js
│  │  ├─ store.js          ← storage wrapper + schema/versioning
│  │  ├─ strings.js
│  │  ├─ engine/
│  │  │  ├─ prng.js  selector.js  shuffle.js  scoring.js  stats.js
│  │  │  └─ generators/ (phase 2)
│  │  └─ ui/
│  │     ├─ home.js  setup.js  test.js  palette.js  timer.js
│  │     ├─ result.js  review.js  history.js  components.js
│  └─ data/
│     └─ questions.json    ← copy of reference/data/questions.json
├─ tools/
│  ├─ build-questions.mjs  validate-data.mjs  test-engine.mjs
├─ reference/              ← docs + source data (NOT deployed, see .vercelignore)
├─ vercel.json
└─ .vercelignore
```
`test.html` (prototype) stays in place until the new app passes QA, then is replaced by a redirect page to `/practice/`.

## Storage schema (all values JSON, prefix `sssgk.`)
| Key | Content |
|---|---|
| `sssgk.v` | schema version (start at `1`; write a migration function when it changes) |
| `sssgk.active` | the in-progress test: `{test, answers:{qid:idx|text}, marks[], bookmarks[], timeMs:{qid:ms}, hintUsed[], cur, startedAt, endsAt}` |
| `sssgk.attempts` | array of finished attempts (max 50): `{id, code, finishedAt, config, items(minimal), answers, score, max, bySection, byTopic}` |
| `sssgk.seen` | array of last ≤ 600 seen question ids |
| `sssgk.topicStats` | `{topic:{attempts,correct}}` for smart mode |
| `sssgk.prefs` | last-used setup values |

## Module contract
- `engine/*` — pure, no DOM, no storage. Takes data in, returns data out.
- `store.js` — the only module touching `localStorage`.
- `ui/*` — each exports `render(container, ctx)` and returns a `destroy()` for cleanup (timers, listeners).
- Escape all question/user text when inserting into the DOM (use `textContent`, never `innerHTML` with data).

## Vercel config (`vercel.json`)
```json
{
  "cleanUrls": true,
  "headers": [
    {"source":"/practice/data/(.*)","headers":[{"key":"Cache-Control","value":"public, max-age=3600, must-revalidate"}]},
    {"source":"/practice/(.*)\\.(js|css)","headers":[{"key":"Cache-Control","value":"public, max-age=300, must-revalidate"}]},
    {"source":"/(.*)","headers":[{"key":"X-Content-Type-Options","value":"nosniff"},{"key":"Referrer-Policy","value":"strict-origin-when-cross-origin"}]}
  ]
}
```
`.vercelignore`: `reference`, `tools`, `node_modules`.

## Versioning
`practice/data/questions.json` gets a top-level wrapper later: `{bankVersion, generatedAt, questions:[…]}`. Until then, bank version string = `0.1-review-draft` constant in `main.js`.
