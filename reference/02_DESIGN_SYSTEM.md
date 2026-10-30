# 02 — DESIGN SYSTEM (extracted from the live landing page)

The practice app must look like part of the same website.

## Colour tokens
```css
:root{
 --navy:#071d3c; --navy2:#0c3260;
 --gold:#d7a43b; --gold2:#f4d17b;
 --ink:#15243a;  --muted:#64748b;
 --paper:#f7f9fc; --line:#e3e9f1; --white:#fff;
 --shadow:0 22px 60px rgba(7,29,60,.12);
 /* additions for the app */
 --ok:#15803d; --ok-bg:#effaf2; --bad:#b91c1c; --bad-bg:#fdf1f1; --warn:#b45309; --warn-bg:#fff8e6; --info-bg:#eef4fc;
}
```
## Typography
Font stack: `Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` (system fonts only — no web-font download). Body 16 px / 1.6. Question text 18–20 px, weight 600. Kicker labels: 12 px, uppercase, letter-spacing .17em, gold-dark `#a77513`, weight 850.

## Components (match landing page)
- **Primary button** `.btn-gold`: gradient `135deg, --gold2 → --gold`, navy text, radius 9 px, weight 750, soft gold shadow, hover lifts 2 px.
- **Outline button** on dark: 1 px `rgba(255,255,255,.42)` border, white text.
- **Cards**: white, 1 px `--line` border, radius 16 px, `--shadow`.
- **Dark hero band**: `linear-gradient(120deg,#06172f,#0a2a51)` with a faint gold circle outline (see `.practice` section in `/index.html`).
- **Pills/tags**: radius 99 px, 12 px uppercase text.
- Container width `min(1160px, 100% - 40px)`; below 650 px use `100% - 28px`.
- Header: logo + "SSSGK EduTech Pvt. Ltd." wordmark, same as landing page; link back to `/`.

## Logo
Reuse the logo image already in `/index.html` (base64). **Extract it once** to `assets/logo.png` and reference it by file — never copy the base64 into other files.

## States
Option buttons: default (white, line border) → hover (gold border) → selected (navy2 border, `--info-bg`). Review: correct (`--ok`), wrong (`--bad`). Focus ring: 3 px `--gold` outline offset 2 px on every interactive element.

## Motion
Subtle only (≤ 200 ms). Respect `prefers-reduced-motion` (the landing page already does).

## Print stylesheet
Result page prints on A4: hide buttons/nav, show logo + title + score tables + review list, avoid page breaks inside a question.
