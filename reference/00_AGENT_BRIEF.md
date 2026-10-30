# 00 — AGENT BRIEF (read this first)

**Project:** SSSGK Practice Test Application — deployed at https://sssgk.vercel.app/
**Deadline:** today. **Budget for infra:** zero — no database, no server, no login.
**Stack decision (final):** static site, vanilla JavaScript (ES modules), no build step, deployed on Vercel as-is.

## What exists right now
| Item | Location | Status |
|---|---|---|
| Company landing page | `/index.html` | Done. Now has a "Practice Lab" section (`#practice`), a hero button and nav/footer links, all pointing to `test.html`. |
| Basic prototype of the test | `reference/prototype_test.html` + `prototype_questions.js` | Working but BASIC. Use it only as a behaviour reference. **Do not ship it as the final product.** |
| Question bank (source) | `reference/data/ACE_NEET_1000_Question_Bank.xlsx` | 1000 rows, draft v0.1 |
| Question bank (normalised) | `reference/data/questions.json` | Same 1000 rows, with `groupId` added. Use this one in the app. |

## What must be built
A proper, polished practice-test web app at `/practice/` that the landing page opens. Full requirements: `01_PRD.md`.

## Reading order
1. `01_PRD.md` — what to build, screens, user flows
2. `02_DESIGN_SYSTEM.md` — colours, type, components (must match the landing page)
3. `03_QUESTION_BANK_SPEC.md` — data schema + **known data problems**
4. `04_TEST_ENGINE_SPEC.md` — random / "intelligent" selection algorithm
5. `05_ARCHITECTURE.md` — folder structure, modules, storage, deploy config
6. `06_TASKS_AND_AGENT_SPLIT.md` — who does what, acceptance criteria
7. `07_QA_AND_DEPLOY.md` — test checklist and go-live steps

## Hard rules for every agent
1. No database, no backend, no external API, no CDN dependency. Everything is files in the folder.
2. Do **not** edit `/index.html` except the 4 links listed in `06` (Task L1). It contains 4.9 MB of embedded logos — never reformat or re-save it through a tool that rewrites base64.
3. Do **not** change question content or answer keys. Content errors go into `reference/data/ISSUES.md` for the human owner.
4. Keep the visual identity of the landing page (navy + gold). See `02`.
5. Every question must show the draft/practice-only notice (see `03` §5).
6. Mobile first: most users will be on phones (India, 360–414 px wide).
7. Work in the folder structure from `05`. Do not rename or move reference files.

## Ready-to-paste prompts
Each agent gets one prompt from `06_TASKS_AND_AGENT_SPLIT.md`. They all begin with: *"Read `reference/00_AGENT_BRIEF.md` and every file it lists, then do Task <ID>."*
