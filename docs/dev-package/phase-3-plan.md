# Phase 3 plan: answer screen, Fine-tune and share links

Status: **decisions made Nov 4, 2026 (Q1 to Q9); Phase 3a in progress** on branch `phase-3-answer-screen`. Mockups: `docs/dev-package/phase-3-mockups.html` (9 frames, real engine numbers, built with the real components; pieces not built yet are marked in the page).

## Goal
Replace the old single page with the Option B answer screen. It has:
- one plain verdict sentence and a basis line with Edit;
- three option cards plus "Keep your car";
- "What would change this";
- four panels: Why this result, Fine-tune, Table and Share;
- share links that restore a scenario;
- a not-advice footer with the dates the data was checked.

The old layout is then removed, with no feature lost. Sources: `04-phases.md` Phase 3 and `02-ux-spec.md` (Answer, Why, Fine-tune, Table, Share, verdict rules).

## Decisions (owner, Nov 4, 2026, answered in structured questions)

| # | Decision | Owner's choice |
| --- | --- | --- |
| Q1 | How to retire the old page | **Rebuild everything in the new design** (chosen over the recommended hybrid; about 7 to 8 days, more risk of regressions, so every old check is ported before anything is deleted) |
| Q2 | Share links on the artifact host | **Encoded `#s-` name in letters and digits**, checked on the real host; fall back to a text summary if the host rejects it |
| Q3 | Pixel check of the old page | **Retire it** when the old page is deleted |
| Q4 | Launch audience (decision 2) | **California first**; footer says "California rules and prices" |
| Q5 | Analyst until Phase 4 | **Keep it, in a panel** ("Ask the analyst", restyled), hidden when AI is unavailable |
| Q6 | Themes | Ledger and Night only (Phase 1 decision A) |
| Q7 | Footer date | **Both dates**: "Prices and rates as of Nov 1, 2026; default cars checked Nov 4, 2026." |
| Q8 | Verdict wording | **Natural names**: "It is close. Keeping your gas sedan and the Chevy Bolt (loan) are within 2 points." |
| Q9 | Delivery | **Two PRs**: Phase 3a then Phase 3b |

## The answer screen (spec copy unless marked *proposed*)
- **Heading:** the verdict sentence from a pure `verdict.ts`, following the five spec rules. With today's defaults the top two are 1.9 points apart, so rules 2 and 4 both apply; Q8 picks the near-tie wording: "It is close. Keeping your gas sedan and the Chevy Bolt (loan) are within 2 points." Unit-tested for every rule.
- **Basis line:** "Sell, then buy · 7,500 miles a year · 8 years, in today's dollars" with Edit, which goes to the step that holds the value.
- **Cards:** the top three options by score, plus "Keep your car" when it is not already among them (spec). With today's defaults keep is first, so there are three cards. Tags in words: "Highest overall score", "Lowest carbon", "Lowest cost", each given to the option that earns it; one card can carry two (keep is both highest and cheapest today), and a card with none shows none. score out of 100, cost over 8 years, carbon in tonnes and People score.
- **"What would change this":** break-even gas price, using the spec's three forms (finite, none below $40, already cheaper), plus one what-if line when the winner flips. Hidden when there is no keep option.
- **Buttons:** Why this result, Fine-tune, Table, Share. Each opens a bottom sheet on phones; on 1024 px and up, the answer uses two columns and the sheets open as side panels.
- **Footer (always visible):** "Estimates for comparison, not financial or tax advice. California rules and prices. Prices and rates as of Nov 1, 2026; default cars checked Nov 4, 2026." with a Sources link.

## The panels
- **Why this result:** Planet, People and Profit summary in the new design. Then, re-themed as they are today: the per-pillar tables (editable People ratings and criteria weights), the cost and carbon bars, "Does the winner hold up?", Sourced/Assumed labels, the sources list and "what this does not model".
- **Fine-tune:**
  - **Top drivers (new design):** miles per year, gas price, what it would sell for (or trade-in offer), first-time EV buyer (only when an EV is chosen), trade-in discount (only on the trade path).
  - **All assumptions (re-themed as is):** the confirm box, key drivers, the cars grid with edit marks, reset, collapse and expand, add lease, rename, emissions, and other.
  - **Scoring and appearance:** method, scale, weighting with custom sliders, combine pillars, financing shown, theme.
  - **Live updates:** edits update the answer behind the panel, announced politely ("Answer updated").
- **Table:** the existing sortable table with "Copy as spreadsheet text", in its own scroll container.
- **Share:** "Copy link" and a plain list of exactly what the link holds. Nothing leaves the browser.

## No feature lost (checked off in the browser suite)
Every action and input of the old page has a new home:

| Feature | Home |
| --- | --- |
| path, car preset, cars | steps (Phase 2) and Edit |
| custom cars (add, rename, remove, add lease) | Step 3 and Fine-tune |
| scoring method, scale, combine, preset, custom weights, financing view, theme | Fine-tune, Scoring and appearance |
| cards and table views, sort, copy, show all | answer cards (top 3 plus keep) and the Table panel, which lists every option |
| per-pillar tabs, ratings, criteria weights, embodied mode, bars, sensitivity, sources, limitations | Why this result |
| assumptions with edit marks, reset one or all, collapse and expand | Fine-tune, All assumptions |
| analyst | Ask the analyst (Q5) |

## What the mockups showed (real engine numbers, default scenario)
- Break-even: gas would have to pass **$15.29 a gallon** before the Chevy Bolt (loan) costs less than keeping the sedan; the tool assumes $5.50 (sourced, California average). The what-if line that flips the winner: "If your sedan were scrapped instead of driven by a new owner, the Chevy Bolt (loan) would score highest."
- The first card ends at 319 px on a 390 x 844 phone; the four panel buttons sit right at the fold. Acceptable for the spec's "first card within one screen"; Phase 5 usability testing will tell.
- "Cash at start" is negative for every new car (money back from selling the sedan and rebates). The Profit tab explains the sign in one line.
- 74 sources: the Why panel shows the ones behind this answer and keeps the full list behind "All 74 sources".
- Single-choice settings (Yes/No, method, scale, weighting, financing, theme) are radio buttons styled like chips, for screen readers.

## Share link format
- `Scenario` gains `edits` (field id to value; only fields that differ from their default) and `settings` (mode, scale, aggregation, preset or custom weights, view).
- Encoding:
  - Compact JSON, then base32 (letters and digits), prefixed with `s-` and a version.
  - Decoding validates through `normalizeScenario`: unknown ids are dropped, values are clamped, and anything over 2 KB is rejected.
  - A tampered link shows the defaults plus one line: "That link could not be read in full; some values were left out."
- Opening a link lands on the answer with the scenario applied. The steps are not marked as visited, so Back from the answer goes to Step 3.

## Tests (written first)
- **Unit:**
  - every verdict branch (keep wins, replace wins, top is cheapest, near-tie, no current car);
  - break-even sentences (finite, none, already cheaper);
  - card tag assignment;
  - share round trip, plus clamp, unknown ids, size cap, tampered input and the version prefix;
  - the scenario extension (edits and settings round trip);
  - basis line and Edit targets;
  - footer dates.
- **Browser (`qa-answer.cjs`, replacing `qa.cjs`, `qa-path.cjs` and `qa-analyst.cjs` check for check, rewritten for the new screen):**
  - the first card is visible within one phone screen of the heading;
  - Fine-tune edits update the answer live;
  - every panel opens and closes, with focus and Escape working;
  - a share link restores the scenario;
  - every "no feature lost" row is exercised;
  - axe and 44 px checks on the answer and every panel, at 390 and 1280 px, in both themes;
  - no overflow, including the wide tables inside their containers, which also fixes the old `scrollable-region-focusable` finding;
  - no console errors.
- The step suite keeps its checks; `qa-visual.cjs` is retired (Q3).

## Delivery and commit plan (verify green before each)
**Phase 3a (this PR, about 3 to 4 days): the new answer screen.** The old page stays reachable behind the panels, so nothing is lost in between.
1. `verdict.ts` with tests: the sentence (all rules, natural names), "what would change", card tags.
2. Scenario extension (edits, settings) and `share.ts` with tests.
3. Answer screen in the new design on `#answer`: verdict, basis line with Edit, cards, what would change, footer with both dates; the panel buttons open sheets; the old page's content is reachable from them until 3b.
4. Fine-tune sheet, top drivers (new design), live updates announced.
5. Share sheet and `#s-` links in the router; preview artifact for the host check.
6. `qa-answer.cjs` for everything above; docs.

**Phase 3b (next PR, about 4 days): rebuild the rest, then delete the old page.**
7. Why this result rebuilt: pillar summaries, ratings and criteria weights editor, bars, sensitivity, sources, limitations.
8. Fine-tune rebuilt in full: All assumptions (confirm box, key drivers, cars grid with edit marks, reset one or all, add lease, rename, emissions, other) and Scoring and appearance.
9. Table rebuilt: sortable, copy as spreadsheet text, every option.
10. Ask the analyst panel (restyled), Q5.
11. Old suites ported check for check into `qa-answer.cjs`; every row of the feature table exercised; then the old page, legacy panels and page-level CSS are deleted and `qa-visual.cjs` is retired.
12. Size baseline (floating), docs, plan results.

## Risks
| Risk | Mitigation |
| --- | --- |
| A feature silently lost when the old page goes | feature table above, each row exercised in `qa-answer.cjs` before commit 8 |
| Losing old-suite coverage during the rewrite | old suites keep running against the old page until commit 8; each check is ported, not dropped; counts reported |
| Long hash rejected by the host | Q2 fallback; host check on the preview |
| Re-themed old tables fail contrast or 44 px | axe and 44 px checks run inside every panel; fix the CSS mapping, not the tests |
| Size | old page CSS and code are removed in commit 8; measured before and after |

## Estimate
About 7 to 8 days in two PRs (3a about 3 to 4, 3b about 4). `04-phases.md` says 1.5. The difference: rebuilding every table and control (Q1), four panels, share links, and porting about 165 old-page checks so that no feature is lost.

## Phase 3a results (Nov 4, 2026)

| Check | Phase 2 | Phase 3a |
| --- | --- | --- |
| Unit tests | 350 | 390 |
| Browser checks | 415 | 485 (new `qa-answer.cjs`: 70) |
| axe WCAG 2.1 A/AA on the answer screen, Fine-tune and Share (390 and 1280 px, Ledger and Night) | n/a | 0 violations |
| Controls under 44 px on the new screens | n/a | 0 |
| Old page (now `#details`) vs the Phase 0 baseline | identical | still byte-identical |
| `dist/index.html` | 185,141 bytes | 207,569 bytes (+21.9 KB; the old page is still in the bundle) |

**What shipped in 3a:** the answer screen (verdict with natural names, basis line with Edit, cards with tags in words, real break-even and what-if lines, footer with California and both dates), Fine-tune top drivers with live updates and announcements, Share with `#s1-` links, and "All the details" (`#details`, the old page) for everything 3b still has to rebuild.

**Deviations from the plan**
- The old page moved to its own route, `#details` ("All the details"), instead of living inside the panels. Why, Table, All assumptions, Scoring and appearance, and Sources open the matching part of it until 3b.
- On the answer screen, Edit replaces "Change my answers" (it goes to Step 2 once a path is chosen, Step 1 otherwise).
- The Settings line in Share is in plain words, not setting ids.

**To check on the real artifact page (owner):** open the preview, change a number in Fine-tune, open Share, copy the link and open it in a new tab. It should show the same answer. If the copied link does not work there but the page's own address does, the address is the way to share on claude.ai.
