# Phase 3b plan: rebuild the rest, then delete the old page

Status: **built** (Nov 6 to 8, 2026) on branch `phase-3b`, PR #6. D1 and D2 decided by the owner Nov 6, 2026; plan approved the same day. Results at the end. Builds on `phase-3-plan.md` (decisions Q1 to Q9, approved Nov 4) and the approved Phase 3 mockups. New mockups for the one open design question: `phase-3b-mockups.html`.

## Goal
Finish Phase 3 in `04-phases.md`: "old layout removed; no feature lost". After 3b:
- every panel is in the new design;
- the old page (`#details`, "All the details") is gone;
- its three browser suites are ported check for check;
- `src/style.css` and the old renderers are deleted.

## What is left (from the 3a state)
| Panel or piece | Today | 3b |
| --- | --- | --- |
| Why this result | sends you to the old page | sheet: Planet, People, Profit tabs (mockups 2a to 2c), editable People ratings and criteria weights, cost and carbon bars, "Does the winner hold up?", Sourced/Assumed labels, sources ("All 74 sources" behind a disclosure), "what this does not model" |
| Fine-tune, All assumptions | old page | confirm box (first-time EV buyer, Clean Cars 4 All, loan-interest deduction, filing, income, tax rate), key drivers, **each car's numbers (decision D1 below)**, emissions, other, manufacturing-emissions mode, edited marks, reset one or all, add lease, rename your own cars |
| Fine-tune, Scoring and appearance | old page | method, scale, weighting with custom sliders, combine pillars, financing shown, theme (mockup 3b) |
| Table | old page | sheet: every option, sortable, "Copy as spreadsheet text", in its own scroll box (mockup 4) |
| Analyst answer | old styles (`an-*` in `style.css`) | moved to `ds-` styles so `style.css` can go; Phase 4 still rebuilds it |
| Desktop | sheets open as a bottom panel | at 1024 px and up, panels open beside the answer (mockup D; was in the approved Phase 3 plan) |

## Decisions (owner, Nov 6, 2026: D1 = A, D2 = beside the answer)
| # | Question | Options | Recommendation |
| --- | --- | --- | --- |
| D1 | How each car's numbers (old grid: up to 17 inputs × 5 cars) appear in Fine-tune | **A** one car at a time (pick a car, then full-size fields); **B** keep the grid in a sideways-scrolling box; **C** one input at a time with every car under it | **A**: full-size 44 px fields with their Source labels and ranges, no sideways scrolling, one renderer for phone and desktop. Comparing cars stays in Table. |
| D2 | Panels on desktop | beside the answer (mockup D) or the same bottom panel as phones | **Beside**: you see the answer change while you edit. About half a day. |

**Already decided, carried out in 3b:** the third theme, Field guide, is dropped with the old page and a saved "field" choice falls back to Ledger (Phase 1 decision A, `phase-1-plan.md`).

## Small fixes folded in
- The keep card on the answer screen reads "Keep My gas sedan"; it should read "Keep your gas sedan", using the verdict's wording rule (`carPhrase`). Only the card changes; `optionName` (used by the analyst prompt and the table) stays as is. Found in the 3b mockups.
- The old `#details` address and old bookmarks redirect to `#answer`.

## Tests written first
**Unit (vitest):**
- **Field lists:** the per-car field list for D1, covering order, groups, EV vs gas fields, lease missing → "Add a lease", and owned/custom cars renamable.
- **Ratings and weights:** the pillar summaries for Why; criteria-weight and rating edits mapped to the edit ids already used by share links.
- **Table:** table sort and TSV are covered in their new home.
- **Routing:** `#details` redirects to `#answer`.
- **Wording and themes:** the keep-card name; `freshState` theme fallback for "field".

**Browser:**
- **Port ledger:** `docs/dev-package/phase-3b-port-ledger.md` lists all 155 old checks (`qa.cjs` 79, `qa-path.cjs` 43, `qa-analyst.cjs` 33). Each one maps to its new check in `qa-answer.cjs` / `qa-ai.cjs`, or is marked retired with a reason. Examples of retired checks: "path panel sits between analyst and design bar" and "results default to cards" describe the old layout only. A suite at the end fails if any ledger row has neither a new check nor a reason.
- **Every panel:** opens and closes, focus moves in and returns, Escape works, edits update the answer live and are announced.
- **Every screen and panel:** axe WCAG 2.1 AA and 44 px checks at 390 and 1280 px, in Ledger and Night. Also no overflow, wide tables keyboard-scrollable, and no console errors.
- **Last step:** when the old page is deleted, `qa.cjs`, `qa-path.cjs`, `qa-analyst.cjs` and `qa-visual.cjs` are removed in the same commit as the ledger turns fully green.

## Commit plan (verify green before each; one PR, `phase-3b`)
1. Port ledger and the unit tests above (failing first where new).
2. Why this result sheet (+ browser checks ported from `qa.cjs` tabs, ratings, embodied, sources, sensitivity).
3. Fine-tune: All assumptions (D1) and Scoring and appearance (+ ported checks for edits, reset, collapse, add lease, rename, presets, path-specific rows, scoring modes, themes).
4. Table sheet (+ ported sort, copy, overflow checks).
5. Desktop side panels (D2).
6. Analyst answer styles moved to `ds-` classes (+ `qa-analyst.cjs` checks ported into `qa-ai.cjs`).
7. Delete the old page, the legacy panels, `style.css`, `#details` and the old suites; retire `qa-visual.cjs`; reset the size baseline (it should drop).
8. Docs: `CLAUDE.md` layout and qa, `03-architecture.md`, 3b results; republish the preview.

## Risks
| Risk | Mitigation |
| --- | --- |
| A feature silently lost | port ledger; the suite fails on any unmapped row; old suites keep running until commit 7 |
| Editing a car's numbers on a phone gets slower (D1 A) | Table compares cars; Phase 5 usability test checks it |
| Side panels change focus and inert rules | the sheet controller already handles focus and Escape; add checks at 1280 px |
| Bundle size | expected to fall when `style.css` and the old renderers go; measured at commit 7 |
| Engine changes | none planned; the engine, data and analyst stay untouched |

## Estimate
About 4.5 days: 4 in the Phase 3 plan plus half a day for the desktop side panels. `04-phases.md` budgeted 1.5 days for all of Phase 3; the difference is Q1 (rebuild everything) and porting 155 checks.

## Results (Nov 8, 2026)

| Check | Phase 3a (+ AI addendum) | Phase 3b |
| --- | --- | --- |
| Unit tests | 402 | 446 (old-page tests removed with the old page) |
| Browser checks | 572 (including the old page's 3 suites) | 666 in the 4 remaining suites, every one of the old suites' 155 checks ported (146) or retired with a reason (9); see `phase-3b-port-ledger.md` |
| axe WCAG 2.1 AA, 44 px, nothing cut off | answer, steps, Fine-tune top drivers, Share | every screen and every panel at 390 and 1280 px in Ledger and Night (the cut-off check is new in 3b) |
| Old page vs Phase 0 pixels | identical | retired with the old page (Q3) |
| `dist/index.html` | 213,319 bytes | 197,160 bytes (-7.6%), the new size baseline |

**What shipped (one commit per step):**
1. Port ledger and its guard; assumptions logic (sections, each car's field groups, add a lease, reset all); "Keep your gas sedan" on the cards.
2. Why this result: what the numbers rest on, real Planet/People/Profit tabs, rating and weight editors, bars, "Does the winner hold up?", every source, what the tool leaves out.
3. Fine-tune in full: All assumptions (D1), Scoring and appearance, Reset to default, Open/Close/Reset all, one refresh path that keeps every control in step.
4. Table: every option, sortable, "Copy as spreadsheet text".
5. Desktop: panels beside the answer (D2).
6. The analyst's answer in design-system styles; its suggested-settings line in plain words.
7. The last old checks ported; then the old page, its stylesheet, the Field theme and the old suites deleted; base styles kept in `base.css`; size baseline reset.

**Found and fixed while building**
- Sheet contents were wider than the sheet on phones (cut off on the right); fixed, and a cut-off check now runs in every audit.
- The edit count left out the top drivers; "Reset" did not redraw the field it focused.
- At 1024 px a fixed 440 px panel covered the cards' scores; the panel narrows to 40% of the screen.
- The analyst's list of editable values came from a registry only the old page filled: deleting the old page would have dropped every suggestion. It now comes from `analystFieldList(state)`, tested.
- The California trade-in tax fact lived only in the old page; it is now on Step 2 and in Fine-tune.

**Deviations from the plan**
- Step 7 was split in two commits (7a: last ports, 7b: deletion) so the deletion is easy to review.
- The bundle-size baseline was raised twice during the build (temporary, while both pages were in) and reset at the end.
