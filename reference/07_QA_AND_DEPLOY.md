# 07 — QA CHECKLIST AND DEPLOY

## A. Automated
- [ ] `node tools/validate-data.mjs` → exit 0
- [ ] `node tools/test-engine.mjs` → all pass
- [ ] No console errors on any screen

## B. Functional (do on a real phone + desktop)
- [ ] Landing: all 4 Practice entry points open `/practice/`
- [ ] Quick 10 starts in < 1 s; 10 questions, no repeats
- [ ] Two consecutive tests differ in questions AND option order
- [ ] Same test code reproduces the identical test
- [ ] Biology request of 20 is clamped to 10 with explanation
- [ ] NEET marking: 3 correct, 1 wrong, 1 skipped = 11
- [ ] Refresh mid-test restores answers, marks, and remaining time
- [ ] Time-out auto-submits and shows result
- [ ] Reflection answers saved, never counted in score
- [ ] Smart mode shows weak topics after ≥ 1 attempt
- [ ] Review filters (Wrong/Skipped/Marked) correct
- [ ] Export → clear → import history works
- [ ] Print preview readable on A4
- [ ] Airplane mode after first visit works
- [ ] Keyboard-only run-through of a full test
- [ ] Draft notice visible on setup and result

## C. Visual
- [ ] 360 / 414 / 768 / 1280 px widths; no horizontal scroll
- [ ] Colours and buttons match landing page

## D. Deploy
1. Make sure `reference/`, `tools/` are in `.vercelignore`.
2. Preview: `npx vercel` → open preview URL → run section B.
3. Production: `npx vercel --prod` (or push to the connected Git branch).
4. Open https://sssgk.vercel.app/ → click Practice Test → run a full test.
5. Hard refresh once (Ctrl/Cmd+Shift+R) to make sure the new service worker takes over.

## E. Rollback
Vercel dashboard → Deployments → previous deployment → **Promote to Production**.
