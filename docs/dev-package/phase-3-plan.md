# Phase 3 plan: answer screen, Fine-tune and share links

Status: **waiting for owner approval** (Nov 4, 2026). Nothing in `src/` has changed. Mockups: `docs/dev-package/phase-3-mockups.html` (9 frames, real engine numbers, built with the real components; pieces not built yet are marked in the page).

## Goal
Replace the old single page with the Option B answer screen. It has:
- one plain verdict sentence and a basis line with Edit;
- three option cards plus "Keep your car";
- "What would change this";
- four panels: Why this result, Fine-tune, Table and Share;
- share links that restore a scenario;
- a not-advice footer with the dates the data was checked.

The old layout is then removed, with no feature lost. Sources: `04-phases.md` Phase 3 and `02-ux-spec.md` (Answer, Why, Fine-tune, Table, Share, verdict rules).

## Decisions for you (recommended option first)

| # | Question | Options | Recommendation and why |
| --- | --- | --- | --- |
| Q1 | How to retire the old page | (A) Move the old renderers into the new panels as they are, re-themed with the new colors. (B) Rebuild everything with the new components. (C) Hybrid: rebuild what a newcomer sees (answer, cards, verdict, the 5 top drivers, Share, the Why summary); move the deep expert content (the full assumptions grid, People ratings editor, full results table, sensitivity table) into the panels as is, re-themed. | **(C).** The newcomer path gets the approved design; the expert tables keep their current behavior and the checks that cover it, at low risk. Rebuild them later if usability testing says so. (A) leaves the first screen looking old; (B) roughly doubles the phase. |
| Q2 | Share links on the artifact host, which allows only a plain `#name` | (a) `#s-` followed by the scenario in letters and digits only (base32), checked on the real host like Back; (b) no restorable link on the host, copy a text summary instead | **(a).** It works on both the artifact and the future website. If the host rejects it, fall back to (b) for the artifact only. The link holds numbers only, never typed names. It is capped at 2 KB. |
| Q3 | The pixel check that guards the old page | retire it in Phase 3 / re-baseline it on the new answer screen | **Retire it.** The page it protects is being replaced on purpose. A new pixel guard is worth adding only before a refactor-only phase. |
| Q4 | Decision 2: launch audience (needed for footer and incentive copy) | California only / US-wide with a generic mode | **California first.** The incentives and the trade-in tax rule are sourced for California; the footer says "California rules and prices". |
| Q5 | The analyst until Phase 4 | (a) a "Ask the analyst" button on the answer that opens today's analyst panel inside a panel; (b) hide it until Phase 4 | **(a).** Nothing is lost in between; Phase 4 rebuilds it. Hidden when the AI is unavailable, as today. |
| Q6 | Themes | Ledger and Night only (Field guide retired, as decided in Phase 1, decision A) | **As decided.** A saved "field" choice falls back to Ledger. |
| Q8 | Verdict wording when keeping your car is first and the top two are within 2 points (spec rules 2 and 4 both apply), and how to name your car in a sentence | (a) the near-tie rule wins, with natural names: "It is close. Keeping your gas sedan and the Chevy Bolt (loan) are within 2 points." ("My gas sedan" reads as "your gas sedan"; a name you typed reads as "your Old Civic"); (b) the spec's literal template: "It is close. Keep My gas sedan and Chevy Bolt (loan) are within 2 points." | **(a).** Same rule, readable sentence. Unit-tested for every preset name and a typed name. |
| Q7 | "Data checked" date in the footer | one date / two dates | **Two dates, honestly:** "Prices and rates as of Nov 1, 2026; default cars checked Nov 4, 2026." |

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

## Commit plan (verify green before each)
1. `verdict.ts` with tests: the sentence, "what would change", card tags.
2. Scenario extension and `share.ts` with tests.
3. Answer screen (new design) behind `#answer`, with the old page still reachable for the old suites; `qa-answer.cjs` begins.
4. Why this result panel: re-themed old content, summary, focus and Escape.
5. Fine-tune panel: top drivers, All assumptions, Scoring and appearance, live updates.
6. Table and Share panels; share links in the router.
7. Ask the analyst panel (Q5).
8. Old page removed: template, legacy panels, page-level CSS. Old suites retired once `qa-answer.cjs` covers every row of the feature table. `qa-visual.cjs` retired.
9. Size baseline (floating, in its own commit), docs, plan results, preview artifact for you to test share links on the host.

## Risks
| Risk | Mitigation |
| --- | --- |
| A feature silently lost when the old page goes | feature table above, each row exercised in `qa-answer.cjs` before commit 8 |
| Losing old-suite coverage during the rewrite | old suites keep running against the old page until commit 8; each check is ported, not dropped; counts reported |
| Long hash rejected by the host | Q2 fallback; host check on the preview |
| Re-themed old tables fail contrast or 44 px | axe and 44 px checks run inside every panel; fix the CSS mapping, not the tests |
| Size | old page CSS and code are removed in commit 8; measured before and after |

## Estimate
About 4 days. `04-phases.md` says 1.5. The difference is real: four panels, share links, and porting about 165 old-page checks so that no feature is lost.
