# 04 — TEST ENGINE SPEC ("intelligent random")

All engine code lives in `practice/js/engine/` and must be **pure functions with no DOM access**, so it is unit-testable in Node.

## 1. Inputs / output
```
generateTest({ sections:[{key,count}], mode:'random'|'smart', seed?:string, history, bank }) -> Test
Test = { code, createdAt, config, items:[ {qid, groupId, section, topic, difficulty, type,
          prompt, options?, answerIndex?, hint, rationale, rubricMax?} ] }
```
`options`/`answerIndex` in the Test are the **shuffled** version for this test.

## 2. Seeded randomness (reproducible tests)
- PRNG: `mulberry32` seeded from a string hash (see prototype for working code).
- Test code = 6 chars from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no 0/O/1/I).
- **Same code + same bank version + same config ⇒ identical test.** Store `bankVersion` in the Test; warn if it differs on re-creation.

## 3. Pool and availability
- Pool for a section = distinct `groupId`s of that section. `available(section) = pool size`.
- Requested count is clamped to `available`. UI shows "Max 10 for Biology" with the reason.
- A test never contains two members of one group.

## 4. Selection algorithm (per section)
1. Bucket groups by `topic`.
2. Inside each topic, order groups: **unseen first** (no member id in `history.seenIds`), then seen; shuffle each part with the PRNG.
3. **Round-robin across topics** (topic order shuffled) until `count` reached → even topic coverage.
4. For MCQ sections with mixed difficulty (Cognitive: Easy / Moderate) target ratio 40 % Easy / 60 % Moderate when both exist; fill from the other if one runs out.
5. Shuffle the chosen groups for final order. Optionally keep section blocks together (setting: "Group by section" default ON, sections ordered Physics, Chemistry, Biology, Cognitive, Reflection).
6. For each chosen group pick a **variant**: prefer a variant whose id is not in `seenIds`; else random.

## 5. Option shuffling
- Fisher–Yates with the PRNG; recompute `answerIndex`.
- Ensure the correct answer's final position is distributed: across a test of ≥ 8 MCQs no letter may hold > 40 % of correct answers (reshuffle offending questions with a new sub-seed, max 5 tries).
- Never shuffle a question whose options reference each other (flag `pin`; currently none).

## 6. "Smart" mode (history-aware)
Uses per-topic stats from `history` (attempts, correct).
- `mastery(topic) = (correct + 1) / (attempts + 2)` (Laplace smoothing; unknown topic = 0.5).
- Topic weight `w = 1.5 − mastery` (range 0.5–1.5).
- Replace plain round-robin with **weighted round-robin**: each topic gets quota ∝ `w`, min 1 if the topic has questions. Unseen-first rule still applies inside the topic.
- Show on the setup page: "Smart mode will focus more on: <weak topics>" (or "Take one test first" if no history).

## 7. Scoring (`scoring.js`)
- MCQ: correct `+pos`, wrong `neg`, skipped 0. Schemes: NEET (4, −1) and Simple (1, 0).
- Open/scenario: **never added to the score.** Student self-rates against the rubric (0..`rubricMax`); stored but shown separately as "Reflection self-check".
- Results per section and per topic: attempted, correct, wrong, skipped, accuracy = correct / (all MCQ in that bucket).
- Time per question stored in ms (sum of focus time).

## 8. Phase 2 — parametric generators (this is what makes combinations truly unlimited)
Implement in `engine/generators/` a registry of templates, each: `{id, section, topic, difficulty, make(rng) -> {prompt, correct, distractors[3], rationale, hint}}`.
Templates derivable from the bank (copy wording style exactly):
1. Net force `F = m·a` (m 2–20 kg, a 1–10 m/s²)
2. `v = u + a·t`
3. Momentum `p = m·v`
4. Ohm's law `V = I·R`
5. Potential energy `m·g·h` with g = 10
6. "A quantity is calculated as a × b" (units inherited)
7. Further templates for kinematics / work-energy / waves as owner-approved
Rules: integer answers only; distractors = plausible errors (sum instead of product, off-by-one factor, wrong operation), all distinct and ≠ correct; generated question gets id `GEN-<template>-<seed>`; flagged `generated:true` in results.
Setting "Include generated questions" (default ON for Physics only). Unit test: 10 000 generated questions → correct answer recomputed independently and matches, distractors distinct.
Chemistry (mole concept, pH from [H⁺]) templates may be added only after owner approves formulae.

## 9. Anti-repeat memory
`history.seenIds` (ids shown in the last 20 tests, capped at 600 ids). "Reset seen history" button in History.

## 10. Unit tests (`tools/test-engine.mjs`, run with `node`)
- same seed ⇒ identical test; different seed ⇒ different order/option order (≥ 95 % of 200 random seeds differ).
- no duplicate `groupId` in a test; count = min(requested, available).
- answer letter distribution rule from §5.
- topic coverage: with count ≥ #topics, every topic present.
- smart mode picks weak topics more often (statistical test over 500 seeds).
- scoring edge cases: all skipped, all wrong with neg marking, mixed.
