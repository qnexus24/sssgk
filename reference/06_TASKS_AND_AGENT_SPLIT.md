# 06 — TASKS AND AGENT SPLIT

Four agents can work in parallel because the contract between them is fixed in `04` (engine API) and `05` (modules/storage).

| Agent | Owns | Starts after |
|---|---|---|
| **A — Engine & Data** | `engine/*`, `tools/*`, `practice/data/` | immediately |
| **B — App shell & Test UI** | `practice/index.html`, router, store, home/setup/test/palette/timer screens, CSS tokens/base/components | immediately (use a stub `generateTest` until A ships) |
| **C — Results, Review, History, Print** | result/review/history screens, charts, print.css | after B's router+store exist (can start with mock data) |
| **D — Integration, QA, Deploy** | landing links, vercel config, service worker, final QA | after A+B+C |

---
## Task A1 — Data pipeline (Agent A)
Create `tools/build-questions.mjs` (xlsx → json; may use `xlsx` npm package in dev only) and `tools/validate-data.mjs` implementing the checks in `03` §4. Copy `reference/data/questions.json` → `practice/data/questions.json`. Output `reference/data/ISSUES.md`.
**Accept:** validate script exits 0; ISSUES.md lists the problems in `03` §3 plus any new ones.

## Task A2 — Engine core (Agent A)
Implement `prng.js, shuffle.js, selector.js, scoring.js, stats.js` exactly per `04` §1–7, §9. Export `generateTest`, `scoreTest`, `updateStats`, `availability`.
**Accept:** `node tools/test-engine.mjs` passes all tests in `04` §10; generating a 10-question-per-section test takes < 20 ms.

## Task A3 — Parametric generators (Agent A, after A2) — Phase 2
`04` §8, templates 1–6. **Accept:** 10 000-sample self-check passes; Setup screen toggle works.

## Task B1 — Shell, router, store, tokens (Agent B)
`practice/index.html`, `css/tokens.css base.css components.css`, `router.js`, `store.js`, `strings.js`, header/footer matching the landing page (`02`).
**Accept:** `#/`, `#/setup`, `#/test`, `#/result/x`, `#/history` route; storage wrapper survives disabled localStorage.

## Task B2 — Home + Setup (Agent B)
Screens `01` §5.1–5.2, calling `availability()` to clamp sizes and show reasons.
**Accept:** impossible sizes cannot be chosen; Biology max shows 10 with explanation; test code input recreates a test.

## Task B3 — Test screen (Agent B)
Screen `01` §5.3: timer (use `endsAt` timestamp, not a counter, so it survives refresh/sleep), palette, keyboard shortcuts, autosave, resume, auto-submit, hint, mark, bookmark, clear, per-question time.
**Accept:** refresh mid-test restores everything including remaining time; works at 360 px width; Lighthouse accessibility ≥ 95.

## Task C1 — Result + Review (Agent C)
`01` §5.4–5.5 with CSS/SVG charts and topic-revision list.
**Accept:** numbers match `scoreTest` output for 5 hand-checked scenarios.

## Task C2 — History + Export/Import + Print (Agent C)
`01` §5.6 and `css/print.css`.
**Accept:** export → clear → import restores history; A4 print preview looks clean.

## Task L1 — Landing links — ALREADY DONE by the owner (skip this task; do not edit `/index.html`)
Replace every `href="test.html"` with `href="practice/"` (exactly 4 places: hero button, `#practice` section button, nav link, footer link). Do it with a plain string replace on the file bytes; verify file size changes by < 20 bytes × 4 and the three base64 logos are intact (md5 of each data-URI unchanged).

## Task D1 — Service worker + vercel.json + .vercelignore (Agent D)
Per `05`. Cache-first for `practice/` static files, network-first for `questions.json` with cache fallback.
**Accept:** after one visit, practice app works in airplane mode.

## Task D2 — Full QA and deploy (Agent D)
Run `07_QA_AND_DEPLOY.md` end-to-end. `test.html` is not required. If absent, do nothing about it.

---
## Prompts to paste
**Agent A:** "Read `reference/00_AGENT_BRIEF.md` and every file it lists. You are Agent A (Engine & Data). Do tasks A1, A2, then A3 in order. Do not touch any UI files. Report which acceptance checks pass."
**Agent B:** "Read `reference/00_AGENT_BRIEF.md` and every file it lists. You are Agent B (Shell & Test UI). Do B1, B2, B3. Until Agent A delivers `engine/`, stub `generateTest` using `reference/prototype_test.html` logic. Do not edit `index.html` at the project root."
**Agent C:** "Read `reference/00_AGENT_BRIEF.md` and every file it lists. You are Agent C (Results/Review/History/Print). Do C1, C2 using mock attempt data until B's store exists."
**Agent D:** "Read `reference/00_AGENT_BRIEF.md` and every file it lists. You are Agent D (Integration/QA/Deploy). Wait until A, B, C report done, then do L1, D1, D2."
