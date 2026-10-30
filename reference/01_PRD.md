# 01 — PRODUCT REQUIREMENTS

## 1. Goal
Students open the SSSGK site → click **Practice Test** → get a freshly generated test from the question bank → finish it → see a detailed analysis. Management requirement (from the sir's message): *"questions must appear randomly; the engine should be intelligent and use multiple combinations."*

## 2. Users
Students preparing for NEET-style exams (mostly mobile). No account. No data leaves their device.

## 3. Entry points on the landing page
- Hero button **Practice Test ✦**
- Section `#practice` ("Practice Lab") with button **Start practice test →**
- Nav link **Practice Test** and footer link **Practice Test**
All open `/practice/`.

## 4. User flow
`Landing → Practice home → Setup → Test → Submit → Result → Review answers → (Retake / New test / History)`

## 5. Screens and requirements

### 5.1 Practice home (`#/`)
- Title, one-paragraph explanation, draft-bank notice.
- Big preset cards: **Quick 10**, **Subject drill** (pick subject), **Mini mock** (Physics+Chemistry+Biology), **Cognitive skills**, **Reflection check-in** (unscored), **Custom**.
- Preset availability is computed from the bank (see `04` §3 — never offer a size the pool cannot fill without repeats).
- "Resume test" banner if an unfinished test exists in storage.
- "My history" link.

### 5.2 Setup (`#/setup`)
- Sections (checkboxes) with number of *unique* questions available in each.
- Questions per section (dropdown incl. "Max available").
- Time limit (0 = untimed; show a recommended value = 1.2 min/question).
- Marking scheme: NEET (+4/−1) or Simple (+1/0).
- Mode: **Random** or **Smart** (weights weaker topics from history — see `04` §6).
- Optional **test code** to recreate an exact test; otherwise generated.
- Start button; summary of what will be generated.

### 5.3 Test (`#/test`)
- Sticky top bar: section name, timer (turns amber at 10 % left, red at 5 %), question counter, Submit.
- Question card: topic tag, difficulty tag, question text, 4 options (large tap targets ≥ 48 px).
- Actions: Previous, Next, **Clear response**, **Mark for review**, **Bookmark**, **Show hint** (hint use is recorded; hint-used questions flagged in result).
- Question palette (drawer on mobile, side panel on desktop): answered / unanswered / marked / current.
- Keyboard: `A–D` or `1–4` select, `N`/`P` next/prev, `M` mark, `Enter` next.
- Autosave to storage after every action; refresh must not lose the test.
- Per-question time spent is recorded.
- Reflection (open-response) questions: textarea, autosave, clearly labelled "not scored".
- Submit shows summary dialog (answered / unanswered / marked).
- Auto-submit at time-out.

### 5.4 Result (`#/result/<attemptId>`)
- Score / max, accuracy %, correct / wrong / skipped, time taken, avg time per question.
- Section-wise table + bar chart (pure CSS/SVG, no library).
- Topic-wise accuracy, with **"Topics to revise"** (accuracy < 60 %).
- Time analysis: fastest / slowest questions; questions where hint was used.
- Buttons: Review answers, Retake same test (same code), New test, Print / Save as PDF (`window.print()` with a print stylesheet).
- Test code displayed + copy button.

### 5.5 Review (`#/review/<attemptId>`)
- Filter: All / Wrong / Skipped / Marked / Bookmarked.
- Each item: question, options (correct = green, user's wrong = red), rationale, topic.
- Reflection items: user's text + rubric for self-check.

### 5.6 History (`#/history`)
- Last 50 attempts: date, preset, score, accuracy.
- Trend per section (small sparkline) and topic mastery table (all-time).
- Export history as JSON file, import JSON file (since there is no server, this is how a student moves devices).
- Clear history (with confirm).

## 6. Non-functional
| Area | Requirement |
|---|---|
| Performance | First load < 1.5 s on 4G; `questions.json` < 700 KB (gzip is automatic on Vercel). |
| Offline | Works after first load (simple service worker caching app files + data). |
| Accessibility | WCAG AA contrast, full keyboard use, `aria-live` timer announcements only at milestones, focus management between screens. |
| Browsers | Last 2 versions Chrome, Safari (iOS 15+), Firefox, Edge. |
| Privacy | Nothing is sent anywhere. Show one line: "Your answers stay on this device." |
| Language | English UI. Strings in one file (`js/strings.js`) so Hindi can be added later. |

## 7. Out of scope today
Accounts, leaderboards, teacher dashboard, payments, database, AI-generated questions, proctoring.
