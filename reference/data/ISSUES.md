# Question Bank Issues & Audit Report (Draft v0.1)

**Source File:** `reference/data/ACE_NEET_1000_Question_Bank.xlsx` / `reference/questions.json`  
**Processed Target:** `practice/data/questions.json`  
**Total Rows:** 1000  
**Unique Question Groups (`groupId`):** 279 (249 MCQ + 30 open/reflective)  
**Date:** 2026-10-30  
**Reported by:** Agent A (Engine & Data)

---

## 1. Summary of Known Problems (from 03_QUESTION_BANK_SPEC.md §3)

### 1.1 High Group Repetition Across Bank
- **Problem:** Only 279 truly distinct prompts exist across the 1000 rows. The remaining 721 rows are either exact duplicate rows, option-reordered rows, or numeric variations.
- **Engine Mitigation:** All question selection must bucket by `groupId`. At most ONE question from any `groupId` is ever included in a single test.
- **Content Owner Action:** Add genuinely new questions covering different concepts and subtopics to reach 1000 distinct items.

### 1.2 Biology: Severe Skew and Minimal Diversity
- **Problem:** 216 rows in Biology represent only **10 distinct questions** (`G086` through `G095`). Even worse, **all 216 rows have `answerIndex = 0` (Option A)**. Within each group, all options across variants are byte-for-byte identical.
- **Engine Mitigation:** Engine enforces `groupId` de-duplication, mandatory Fisher–Yates option shuffling, and clamps Biology selection to maximum 10 questions.
- **Content Owner Action:** Urgently author at least 80–100 new Biology questions with varied answer positions and diverse topics before attempting full NEET-length mocks.

### 1.3 Chemistry: Answer-Key Skew
- **Problem:** 134 out of 216 Chemistry rows (62.0%) have Option A (`answerIndex: 0`) as the correct answer.
- **Engine Mitigation:** Mandatory Fisher–Yates option shuffling per question. Tests with ≥ 8 MCQs enforce a maximum 40% cap for any single answer letter.
- **Content Owner Action:** Randomise answer positions in source spreadsheet.

### 1.4 Difficulty Calibration (School-Level vs. NEET)
- **Problem:** All 650 science questions (Physics, Chemistry, Biology) are labelled `Easy/Moderate` and represent introductory school-level recall or single-step formula evaluations. They are not calibrated to competitive NEET standard.
- **Engine Mitigation:** UI labels tests as "NEET-style practice" rather than "NEET difficulty".
- **Content Owner Action:** Introduce multi-step application, assertion-reason, and statement-based questions calibrated to actual NEET difficulty.

### 1.5 Physics Prompts are Heavily Templated
- **Problem:** ≈15 patterns account for the vast majority of Physics questions (e.g., $F=ma$, $v=u+at$, $p=mv$, $V=IR$, $PE=mgh$, $a \times b$). Repeated rows simply swap values into these equations.
- **Engine Mitigation:** Implemented parametric generators in `practice/js/engine/generators/` to create infinite clean numeric variations on demand with guaranteed integer results and distinct distractors.
- **Content Owner Action:** Author conceptual, graphical, and non-formulaic Physics questions.

### 1.6 Full NEET Mock Cannot Be Formed Without Repeats
- **Problem:** A standard NEET exam requires 45 Physics + 45 Chemistry + 90 Biology questions (180 questions). With only 10 unique Biology questions in the bank, no standard NEET mock can be constructed without repeating groups.
- **Engine Mitigation:** Preset and setup availability calculations clamp section sizes to unique group counts and display descriptive notices (e.g., "Max 10 for Biology").

---

## 2. Additional Audit Findings

### 2.1 Exact Row Duplicates (Prompt + Options)
- **Problem:** 74 distinct question configurations appear as exact duplicates across 568 rows. For example, in Biology `G086` ("Which organelle is known as the powerhouse of the cell?"), all 22 rows have identical prompt and options `['Mitochondrion', 'Golgi apparatus', 'Lysosome', 'Nucleolus']`.
- **Suggestion:** Remove duplicate rows and replace with distinct conceptual questions.

### 2.2 Topic Scarcity in Biology
- **Problem:** 4 of the 7 Biology topics have only 1 unique question group:
  - `Plant physiology`: only 1 group (`G090`)
  - `Ecology`: only 1 group (`G093`)
  - `Evolution`: only 1 group (`G094`)
  - `Molecular biology`: only 1 group (`G095`)
- **Suggestion:** Expand each topic to at least 15–20 distinct question groups.

### 2.3 Single Difficulty Label in All Sciences
- **Problem:** Physics (218 rows), Chemistry (216 rows), and Biology (216 rows) each have only one difficulty value: `Easy/Moderate`. There is no `Easy`, `Moderate`, or `Hard` stratification available for science sections.
- **Suggestion:** Label questions as `Easy`, `Moderate`, or `Hard` to enable adaptive or difficulty-targeted practice.

### 2.4 Cognitive Skills Has Balanced Difficulty
- **Note:** Cognitive skills (150 rows, 78 unique groups) has 60 `Easy` (40%) and 90 `Moderate` (60%). This cleanly matches the 40/60 target ratio specified in `04_TEST_ENGINE_SPEC.md` §4.

### 2.5 Inconsistent Topic Assignment Across Variants of the Same Group
- **Problem:** 54 question groups have rows assigned to conflicting topics. For instance, in group `G242` ("A quantity is calculated as 8 × 3..."), variant `AN-0718` is labelled `Waves` while variant `AN-0783` is labelled `Units and dimensions`. Similarly in Chemistry, groups `G206`, `G207`, `G210`, etc. have variants split between `Mole concept` and `Solutions`.
- **Engine Safeguard:** The engine anchors each group to its designated topic queue and strictly filters variants matching that topic during selection.
- **Suggestion:** Standardise topic labels in the master spreadsheet so all rows sharing a `groupId` have identical `topic` values.

---

## 3. Specific Item Issues & Recommendations

| ID Range | Section | Group(s) | Problem Description | Recommended Action |
|---|---|---|---|---|
| `AN-0219` to `AN-0434` | Biology | `G086`–`G095` | All 216 rows have `answerIndex = 0` (Option A). Only 10 distinct questions exist across 216 rows. | Expand unique question bank to ≥ 100 questions. Vary option order in master sheet. |
| `AN-0219` to `AN-0240` | Biology | `G086` | 22 identical rows: "Which organelle is known as the powerhouse of the cell?". | Replace duplicate rows with other cell biology organelles (ribosomes, chloroplasts, ER, peroxisomes). |
| `AN-0283` to `AN-0301` | Biology | `G090` | Only 1 question group for entire "Plant physiology" topic ("What is the primary site of photosynthesis in plants?"). | Add questions on transpiration, C3/C4 pathways, plant hormones (auxin, gibberellin), mineral nutrition. |
| `AN-0348` to `AN-0370` | Biology | `G093` | Only 1 question group for entire "Ecology" topic ("In a food chain, what role do primary producers play?"). | Add questions on energy pyramids, biogeochemical cycles, ecological succession, biodiversity conservation. |
| `AN-0371` to `AN-0390` | Biology | `G094` | Only 1 question group for entire "Evolution" topic ("What process describes how populations change over generations?"). | Add questions on homologous vs. analogous organs, Hardy-Weinberg principle, natural selection types. |
| `AN-0391` to `AN-0412` | Biology | `G095` | Only 1 question group for entire "Molecular biology" topic ("Which molecule stores genetic information in most living organisms?"). | Add questions on transcription, translation, DNA replication, lac operon, genetic code. |
| `AN-0109` to `AN-0218` | Chemistry | Multiple | 134 out of 216 questions (62%) have answerIndex = 0 (Option A). | Rebalance master answer keys so each option A, B, C, D accounts for ≈ 25%. |
| `AN-0001` to `AN-0108` | Physics | `G001`–`G015` | Highly templated numeric variations of $F=ma$, $v=u+at$, $V=IR$, $p=mv$. | Supplement with conceptual questions, graphical questions, and multi-step derivations. |
| `AN-0451` to `AN-0650` | Reflective Sections | `G174`–`G203` | Open questions have `scored: false`, requiring self-evaluation against a 3-point or 4-point rubric. | Clear UI guidance that these are reflective and self-rated. |

---

## 4. Engine Safeguards in Place

The test engine (`practice/js/engine/`) guarantees that despite the above data anomalies:
1. **Zero Repeated Questions:** Deduplication by `groupId` prevents duplicate questions.
2. **Fair Answer Distribution:** Fisher–Yates option shuffling and a letter-frequency redistribution pass ensure Option A is not overrepresented to test takers.
3. **Availability Guardrails:** Availability queries clamp maximum questions per section to unique group count and provide explicit notices.
4. **Parametric Expansion:** Phase 2 parametric generator generates infinite validated Physics variations.
