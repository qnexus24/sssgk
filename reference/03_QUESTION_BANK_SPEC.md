# 03 — QUESTION BANK SPEC

Source: `data/ACE_NEET_1000_Question_Bank.xlsx` (sheet "Question Bank", 1000 rows, version `0.1-review-draft`).
Normalised file for the app: `data/questions.json` (array of objects). **Load only this file.**

## 1. Schema (`questions.json`)
| Field | Type | Notes |
|---|---|---|
| `id` | string | e.g. `AN-0001` — unique, never changes |
| `groupId` | string | `G001…G279`. Rows with identical prompt text share a group = **same question, different variant**. A test may contain at most ONE member of a group. |
| `section` | string | Physics, Chemistry, Biology, Cognitive skills, Learning behaviours, Human values, Learner development |
| `topic` | string | 59 distinct values — used for stratification and analytics |
| `skill` | string | finer tag |
| `difficulty` | string | `Easy`, `Easy/Moderate`, `Moderate`, `Reflective` |
| `type` | string | `mcq`, `open_response`, `scenario_response` |
| `prompt` | string | question text (may contain `²`, `Ω`, `×` — keep UTF-8) |
| `options` | string[4] | MCQ only |
| `answerIndex` | 0–3 | MCQ only — index into `options` as stored (before shuffling) |
| `rationale` | string | explanation (MCQ) or scoring rubric (open) |
| `hint` | string | |
| `rubricMax` | 3 or 4 | open types only |
| `scored` | bool | false for open types |
| `status` | `draft` | |

## 2. Counts
| Section | Rows | **Unique questions (groups)** | Topics |
|---|---|---|---|
| Physics | 218 | **109** | 7 |
| Chemistry | 216 | **52** | 11 |
| Biology | 216 | **10** | 7 |
| Cognitive skills | 150 | **78** | 5 |
| Learning behaviours (open) | 80 | 10* | 10 |
| Human values (scenario) | 70 | 10* | 10 |
| Learner development (open) | 50 | 10* | 10 |
| **Total** | **1000** | **249 MCQ + 30 open = 279** | |
\*approx. — reflection groups total 30.

## 3. KNOWN DATA PROBLEMS (agents must design around these; owner will fix content)
1. **Only 279 truly distinct prompts in 1000 rows.** Repeated rows differ only in option order or in numbers substituted into a template (e.g. "A resistor of 4 Ω carries 2 A…").
2. **Biology: 216 rows but only 10 distinct questions, and `answerIndex` is always 0 (A).** A naïve random test would show the same biology question many times and the answer is always A. → de-duplicate by `groupId` and shuffle options (see `04`).
3. **Answer-key skew in Chemistry:** 134 of 216 are "A". → option shuffling is mandatory.
4. **Difficulty is school-level** ("Easy/Moderate"); it is not calibrated to NEET difficulty. Do not label the product "NEET difficulty" in the UI. Use "NEET-style practice".
5. **Physics prompts are templated** (≈15 patterns: F=ma, v=u+at, p=mv, V=IR, PE=mgh, "a × b", …). This makes **parametric generation** possible (see `04` §8) — the way to get genuinely unlimited combinations.
6. A full NEET mock (45 Phy + 45 Chem + 90 Bio) **cannot be generated without repeats** — Biology has 10 questions. The UI must refuse/cap sizes the pool can't fill and say why.

Agents: write any further data problems you find into `data/ISSUES.md` (id, problem, suggestion). Do not edit `questions.json` content.

## 4. Data integrity tests (must pass in CI/local script `tools/validate-data.mjs`)
- 1000 unique `id`s; every MCQ has exactly 4 non-empty, mutually distinct `options`; `answerIndex` ∈ 0..3.
- Every `groupId` has a single `section` and single `type`.
- No MCQ option text starts with "All/None of the above" or references another option letter (so shuffling is safe). Currently true for all 800.
- Open types have `rubricMax` ∈ {3,4}.

## 5. Mandatory notice
Show on setup screen and on every result page: *"Practice questions — draft v0.1, pending expert review. Not for high-stakes decisions."* Reflection items additionally: *"Not diagnostic. Reflects this response only, not a personality or ability label."*

## 6. Adding new questions later
Owner supplies a new xlsx in the same columns → run `tools/build-questions.mjs` (agent builds this: xlsx→json, assigns `groupId` by prompt, runs validation). No app code changes needed.
