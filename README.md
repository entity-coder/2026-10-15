# SGPA Calc — Semester Result Calculator

A clean single-page web app that calculates your SGPA from subjects, credits,
and grades/marks — plus a **target planner** that tells you what average grade
you need in your remaining subjects to hit a target SGPA.

No frameworks, no build step, works fully offline. Just open `index.html`,
or serve it with GitHub Pages.

## Features

- **Live SGPA calculation** — add subjects (name + credits + marks or grade
  letter) and the SGPA updates instantly: Σ(credits × grade point) ÷ Σ(credits)
- **Two input modes** — enter marks (0–100) or grade letters directly
  (O / A+ / A / B+ / B / C / P / F)
- **Grade-scale presets** — two common Indian 10-point scales (pass at 40 or
  pass at 35); the full marks→grade table is viewable in the app, since
  universities differ
- **Per-subject grade-point badges** — color-coded (green pass, red fail) so
  problem subjects stand out
- **Target SGPA planner** — enter a target SGPA and your remaining credits;
  it computes the average grade point you need, maps it to a grade letter,
  tells you when the target is mathematically impossible, or confirms you're
  already on track
- **Persistence** — your subjects, settings, and planner inputs are saved in
  `localStorage` and restored on reload
- **Mobile-friendly** — responsive layout for phones

No AI is used in this project — SGPA math must be deterministic and offline.

## How to run

Open `index.html` in any modern browser. That's it.

For GitHub Pages: Settings → Pages → deploy from the `main` branch, and the
app is live at `https://<user>.github.io/<repo>/`.

## Files

| File | What it does |
|---|---|
| `index.html` | Page structure: controls, subject list, result card, planner |
| `styles.css` | All styling — mobile-first, no frameworks |
| `app.js` | Grade scales, SGPA math, planner, `localStorage` persistence |

## Grade scale assumptions

Two presets of the standard Indian 10-point scale are built in (viewable via
"View scale" in the app):

| Grade | Points | Marks (pass-40 preset) | Marks (pass-35 preset) |
|---|---|---|---|
| O | 10 | 90–100 | 90–100 |
| A+ | 9 | 80–89 | 80–89 |
| A | 8 | 70–79 | 70–79 |
| B+ | 7 | 60–69 | 60–69 |
| B | 6 | 50–59 | 50–59 |
| C | 5 | 45–49 | 40–49 |
| P | 4 | 40–44 | 35–39 |
| F | 0 | below 40 | below 35 |

These are *assumptions*, not any university's official table — always check
your own university's scale. If yours differs, the constants live in one
place (`SCALES` at the top of `app.js`).

## Interview notes

**What it is:** A single-page, dependency-free web app that computes semester
SGPA from subject credits and grades/marks, with a what-if planner for target
grades. Persisted locally in the browser.

**Why these decisions:**
- *No framework, no build step:* the app is a handful of DOM operations —
  a framework would add tooling weight with zero payoff, and a static page
  deploys to GitHub Pages for free.
- *SGPA math in plain functions (`totals`, `gradePointFor`):* arithmetic is
  the whole product, so it had to be trivially testable — I verified the
  scale boundaries (e.g. 89.9 → A+, 40 → P on the pass-40 preset) and the
  weighted sum with a Node harness before shipping.
- *Grade scales as a data table (`SCALES`), not hardcoded if/else:* the
  bands differ per university, so one data structure drives marks→grade,
  grade→points, and the planner's grade-letter mapping. Adding a new
  university's scale is a one-object change.
- *Global input mode (marks vs grades) instead of per-row:* switching resets
  row values, because marks and grade letters aren't comparable — mixing them
  would invite wrong results. Losing the values on switch is a deliberate
  safety trade over convenience.
- *`localStorage` instead of a backend:* students' result data is private and
  the app must work offline; there's no account or sharing requirement, so a
  backend would be cost with no benefit.
- *No AI integration:* deliberate. Grading math must be exact, auditable, and
  offline — an LLM adds latency, cost, and the risk of arithmetic hallucination
  for nothing gained.

**Trade-offs / limitations:**
- Grade scale presets are approximations of "standard" 10-point scales — they
  may not match the user's university (documented in the app and README).
- Data lives only in the browser — no sync across devices; clearing browser
  data wipes the saved entries.
- The planner assumes remaining subjects behave like the current scale;
  it computes an average, not a per-subject plan (e.g. "get A in two subjects,
  B+ in the rest").

**How I'd extend it:**
- Editable/custom grade scales so users can enter their university's exact table
- CGPA mode across multiple semesters (each semester as a weighted block)
- A per-subject planner ("to hit 7.5 with these completed subjects, here's
  the minimum grade for each remaining one") instead of just an average
- Export results as a shareable image/PDF for study groups
- Optional backlog mode that highlights how a failed subject drags the SGPA
