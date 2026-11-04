# Phase 2 plan: guided steps 1 to 3

Status: **approved Nov 4, 2026, with all eleven recommendations (P1 to P11)**; being built on branch `phase-2-guided-steps`.

**How this plan was made:**
- Four read-only researchers mapped the spec, the state code, the test impact and the default cars.
- Four critics then attacked the first draft from four angles: spec fidelity, tests and regression, accessibility and copy, and architecture.
- A fact-checker verified the default-car data on the web.
- A mockup builder drew the screens with the real Phase 1 components: `docs/dev-package/phase-2-mockups.html`.

This version fixes 2 blockers and about 25 major findings from that review.

Owner decisions already in force:
- **4:** plain TypeScript.
- **7:** the default current car is the older gas sedan, labeled placeholder; the Lexus stays as an example.
- **8:** one EV, one hybrid and one gas car.
- **9:** "Car limit on mobile: 4".
- **Nov 4:** "add commas" to money fields.

## Decisions for you (recommended option first)

| # | Question | Options | Recommendation and why |
| --- | --- | --- | --- |
| P1 | Default cars to compare | (a) Chevy Bolt, Toyota Camry Hybrid, Toyota Corolla; (b) Chevy Equinox EV instead of the Bolt | **(a)**, with the data fixes in P2. It is the sedan-class trio and the cheapest of each kind. Keeping your car narrowly wins (61.6 vs Bolt 59.6). Any trio with the Tesla flips the answer to "buy the Tesla" (64.7), mostly because of a Bay Area-only "built locally" People rating. The Bolt is a limited run, expected to end around mid-2027 ([InsideEVs](https://insideevs.com/news/785214/2027-chevrolet-bolt-limited-run/)). |
| P2 | Fix the default cars' data first (`data.ts`, so each fix gets a failing test first and is flagged to you) | fix now / ship as is | **Fix now, as one separate commit before the defaults go live.** (1) The Corolla price source links to a Camry listing that now returns 404. Use $24,620, the MY2027 LE with destination ([Carscoops](https://www.carscoops.com/2026/08/2027-toyota-corolla/)). Point the 35 mpg at [fueleconomy.gov](https://www.fueleconomy.gov/feg/PowerSearch.do?action=noform&path=1&year1=2027&year2=2027&make=Toyota&baseModel=Corolla&srchtyp=ymm&pageno=1&rowLimit=50). (2) The Bolt now has an EPA rating of 28 kWh/100 mi and 262 mi range ([fueleconomy.gov](https://www.fueleconomy.gov/feg/PowerSearch.do?action=noform&path=1&year1=2027&year2=2027&make=Chevrolet&baseModel=Bolt&srchtyp=ymm&pageno=1&rowLimit=50)); the app assumes 29. (3) The Bolt lease ($477/mo) expires today, Nov 4, 2026 ([AutoFinder](https://autofinder.com/deals/lease/chevrolet/bolt/2027)); mark it "dated offer, check current terms". (4) Label the Camry Hybrid as MY2026; the MY2027 is arriving at $29,700 before destination ([AutoGuide](https://www.autoguide.com/auto/2027-toyota-camry-arrives-this-fall-with-up-to-51-mpg-44640241)). Toyota's and Chevrolet's own sites blocked automated reads, so prices rest on auto press and dealer pages. |
| P3 | Car limit scope | (a) 4 at every width, everywhere; (b) 4 on phones, 8 on desktop | **(a).** A width-based limit changes your selection when you rotate a phone. Trade-off: desktop users can no longer compare 5 to 8 cars, and the old page's "Show all" button becomes nearly unused. |
| P4 | Trade-in path, Step 2 money field | (a) "Trade-in offer", as the spec says: you type the dealer's offer; the private value is worked out as offer ÷ (1 − 15%) and the discount stays; (b) keep the private value and show the derived offer | **(a).** It matches the spec and lets you type the quote you actually have. The line underneath reads "Placeholder: dealers usually offer about 15% less than a private buyer." A unit test proves the round trip is exact. |
| P5 | Miles per year control | (a) the spec's slider with a readout ("7,500 miles a year"), 1,000 to 25,000 in steps of 500; (b) slider plus a typed field; (c) raise the maximum to the spec's 30,000 | **(a).** One control, simplest for keyboard and screen readers. The data caps miles at 25,000; raising it is a `data.ts` change (failing test first). Your earlier mockup showed (b); the review found two controls for one value confusing. |
| P6 | "Skip to answer" before you pick a path | (a) assume "Sell my car, then buy" and say so on the answer; (b) disable Skip until a path is picked | **(a).** "Defaults everywhere" is a spec principle. The answer shows the line "We assumed you sell your car yourself." |
| P7 | No cars chosen on Step 3 | disable Show my answer and Skip with a reason / allow keep-only answers | **Disable both**, with the visible reason "Pick at least one car to compare." On the just-buy path there would otherwise be nothing to compare. |
| P8 | "Not sure: describe it in a sentence" on Step 1 before Phase 4 | (a) hide it until Phase 4's analyst sheet; (b) show it and jump to the old analyst box | **(a).** The spec allows hiding it. In Phase 2 it would land on the old page, which already shows an answer for a path you did not pick. |
| P9 | Step 2 on the "Just buy" path (the spec gives no copy) | heading "Your driving", sub "Miles change fuel and charging costs.", miles only, still "Step 2 of 3" | **As written**; *proposed* copy. |
| P10 | The old answer page's top line names the Lexus test case | (a) show neutral text unless the Lexus example is chosen; (b) leave it until Phase 3 | **(a).** About 5 lines of code, and the pixel check stays exact because the Lexus text is unchanged. Neutral line (*proposed*): "Compare keeping your current car with buying another, by its effect on the planet, on people and on your wallet." |
| P11 | Kickoff prompt order: write the failing tests *before* showing the plan | (a) write them right after your approval, as tests-first commits; (b) pause now and attach them uncommitted | **(a).** CLAUDE.md requires a green `npm run verify` before every commit. Tests still come before the code they cover. |

## Screens
Spec copy unless marked *proposed*; see the mockups.

**Step 1, "What are you deciding?"** Sub: "Pick the closest one. You can change it later."
- Three option buttons. One tap chooses and moves to Step 2. Nothing is preselected on a fresh load.
  - Sell my car, then buy / Sell it yourself and put the money toward the next car
  - Trade my car in / A dealer takes it off the price
  - Just buy / No car to sell, or I am keeping mine
- The analyst option is hidden until Phase 4 (P8).
- Footer: Back (disabled) and Skip to answer.

**Step 2, "Your car and your driving".** Sub: "Start from a preset. Values marked as placeholders are not sourced."
- "Car you have now": chips for Older gas sedan (chosen by default), Older gas SUV, Older hybrid, Lexus LX 470 (example), and Something else.
  - Something else opens Car name, Fuel economy (mpg), Repair cost per mile and Insurance per year (*proposed* labels), starting from the sedan's values.
  - Its value is the shared field below, so it is never asked twice.
- "What it would sell for", or "Trade-in offer" on the trade path (P4): a money field with commas.
- "Miles per year": a slider with a readout (P5).
- **Every value shows its status as text:**
  - "Placeholder" when it is assumed;
  - "Source: {name}" as a link, opening in a new tab, when it is sourced (the Lexus example);
  - "Your number" once you type your own.
- Note: "Not sure of a number? Leave it. Placeholders are marked and you can change them from the answer screen."
- Primary: Continue to cars. Secondary: Back, Skip to answer.
- On the just-buy path: P9.

**Step 3, "Which cars should we compare?"** Sub: "{n} of up to 4 chosen. Each is compared on a loan and, where known, a lease."
- Real checkboxes, one fieldset per group (Electric, Hybrid, Gas, Your own), with the group name as the legend. Each row shows the name, the price and "Loan only" where there is no lease.
- One status line that is always on the page (`role="status"`). At 4 cars it reads "4 of 4 chosen. Pick up to 4. Uncheck one first." and the unchecked boxes are disabled. At 0 it reads "No cars chosen. Pick at least one car to compare." (P7).
- "+ Add my own car" opens a real form:
  - Car name; Type (a radio group: Electric, Hybrid or Gas); Price; then Fuel economy (mpg) or "Electricity used per 100 miles (kWh)".
  - Add car is a secondary button and Enter also adds; Cancel closes the form.
  - At 4 cars, "+ Add my own car" is disabled with the same reason.
  - Your own cars have a Remove button with an accessible name such as "Remove My EV 1".
- Primary: Show my answer. Secondary: Back, Skip to answer.

**Arriving at the answer** (the old page in Phase 2):
- Focus moves to the verdict heading and it scrolls into view.
- A 44 px "Change my answers" link above the page returns to the last step.
- The page title changes per screen, for example "Step 2 of 3: Your car and your driving" and "Your answer". Titles never include car names or anything you type.

## Behavior rules (pure functions, unit-tested)
- **Routes:** `#step-1`, `#step-2`, `#step-3`, `#answer` and `#style-guide`. No hash means Step 1. A test checks that no route name matches an element id.
- **Path chosen:** a new `pathChosen` flag, false on a fresh load. Step 1 shows a pressed option only once a path is chosen.
- **Back:**
  - Each app navigation tags its history entry. In-app Back calls `history.back()` only when the previous entry is the step it wants; otherwise it replaces the entry.
  - Deep links to `#step-2` or `#step-3` before a path is chosen are replaced with Step 1.
  - `#answer` on a reload shows the defaults (nothing is stored).
- **Focus:**
  - It never moves on the first load.
  - On a screen change it goes to the new heading, which also reads "Step N of 3".
  - Changes within a screen update in place, so focus stays on the control you used.
- **Car limit:** one function, `canAddCar`, used by the steps, the old picker and the analyst's add actions (P3).
- **Number text:** state changes only on a valid parse. Continue and Skip use the last valid value.

| Typed | Result |
| --- | --- |
| `7000`, `7,000`, `$7,000` | 7000; shows "7,000" after you leave the field |
| `7,000.50` (where the step allows cents) | 7000.5 |
| empty | keeps the last valid value, no error |
| `7k`, `abc`, `1.2.3`, `7,00` | invalid: "Enter an amount from $1,000 to $150,000, like 9,000." with `aria-invalid` |
| `-500`, `999999` | out of range: clamped on leaving the field, with the hint "Changed to $1,000, the lowest allowed." |

The caret is never moved while you type.

## Architecture
- **`app/state.ts`:** adds `freshState()`. The singleton is `freshState()`, so there is no behavior change.
- **`app/fields.ts`:** adds versions that take a state argument (`readFieldIn`, `writeFieldIn`, `defaultOfIn`); today's exports wrap them. The row-to-field map moves here from `ui/answer/fineTune.ts`.
- **`app/mutations.ts`:** `setPath`, `applyCarPreset`, `togglePick` (returns the refusal reason), `addCustomCar` and `removeCustomCar`. The steps, the old page's events and the analyst sheet all call these, so there is one implementation of each rule. Path ids and labels move here from a ui module.
- **`app/scenario.ts`:**
  - `Scenario` (`v: 1`, path, carPreset including `'custom'`, carOverrides, miles, selected catalog ids, customCars without free-text names), `PUBLIC_DEFAULTS` and `LEGACY_SCENARIO`.
  - `applyScenario(state, s)` (mutates in place), `scenarioFrom(state)`, and validation: unknown ids rejected, values clamped to field ranges, at most 4 cars, custom ids renumbered custom1..n.
  - Phase 2 maps only what the steps set; Fine-tune edits and settings come with Phase 3's share links.
  - The new public defaults live here, not in `data.ts`, so the engine's 97 tests are untouched.
- **`app/steps.ts`:** the state machine (`choosePath`, `next`, `back`, `skip`, `canShowAnswer`), route parse and format, the back and redirect decision, and page titles.
- **`app/numberText.ts`:** parse and format as specified above.
- **UI:**
  - The steps render in `<main id="steps" class="ds-app" hidden>`, which gets the ds base styles.
  - Step controls use their own action names (`st-*`), and checkboxes react to `change`.
  - Today's `ui/steps/decision.ts` and `cars.ts` move to `ui/legacy/`.
  - `refresh.ts` gains `steps`.
  - `document.querySelector('main')` becomes id lookups.
- **New components:**
  - `dsCheckRow`: a label row at least 52 px tall, with a styled native checkbox (44 px hit area, visible box and tick, focus ring).
  - `dsSlider`: a range input at least 44 px tall, with `aria-valuetext` and an `<output>` readout.
  - `dsField` text mode: commas, error state, `aria-invalid`.
  - `dsStepFooter`: gains Skip disabled with a reason.
  - `dsStatusLabel`: Placeholder, Source or Your number.
  - The style guide shows all of them.

## Tests
Written first, and green before each commit.
- **Unit:**
  - `freshState()`.
  - `applyScenario(freshState(), LEGACY_SCENARIO)` deep-equals today's initial state; this proves the QA hook reproduces the old page.
  - `PUBLIC_DEFAULTS` is valid, and the defaults produce a scored result without NaN.
  - Scenario round trip, clamping, rejection and custom-car rebuild.
  - The trade-offer round trip (P4).
  - `canAddCar` at 3, 4 and 5 cars.
  - Every state-machine transition, plus Back and redirect decisions and titles.
  - The number-text table above.
  - Each new component (escaping, ARIA, sizes).
  - Each step renderer (copy, status labels, the just-buy layout, the limit state, escaped custom names).
- **`qa-steps.cjs`** (new, added to `npm run qa`, prints a summary even on failure), at 390 and 1280 px, with the Ledger, Night and Field saved themes:
  - A fresh load shows Step 1 with nothing pressed, and nothing has focus.
  - 3 taps reach the answer, which shows Keep My gas sedan plus the Bolt, Camry Hybrid and Corolla cards; focus is on the verdict heading.
  - Skip works from each step and shows the assumption line.
  - Browser Back and in-app Back work, with focus on each heading.
  - "Change my answers" works.
  - Path none: miles only, and no keep card.
  - The 4-car limit is announced and the 0-car rule holds.
  - Add, Enter and Remove for your own car keep focus sensible.
  - Status labels: Placeholder for the sedan, Source with an https link for the Lexus, Your number after an edit.
  - Commas in and out, invalid text, clamping.
  - Keyboard-only completes the flow.
  - Focus rings show; axe finds 0 violations on each screen; every control is at least 44 px; no overflow; no console errors; route names never match element ids.
- **Existing suites** (option A, measured on a Phase 2 emulation):
  - `qa.cjs`, `qa-analyst.cjs`, `qa-path.cjs` and `qa-visual.cjs` load `#answer` with a QA-only boot hook. Playwright sets a `window` global before load; the hook is never read from the URL, accepts only known names, and applies `LEGACY_SCENARIO`.
  - `qa.cjs` lines 125 to 146 are rewritten for the 4-car limit (161 checks unchanged, the rest re-targeted).
  - `qa-visual.cjs` masks the "Pick up to 4" line and the "Change my answers" link.
  - `qa-components.cjs` scopes its counts to `#style-guide` and `#ds-sheets`, checks that `#steps` is hidden on the guide, and expects Step 1 after "Back to the scorecard".
- **Deferred:**
  - Back through sheets, Fine-tune, share links and live answer updates: Phase 3.
  - The 320 px and 200% text audits: Phase 5.

## Commit plan
Verify green before each.
1. Host probe: a private throwaway page checks hash routing, `replaceState` and Back inside the real artifact frame. The result goes in this plan (no repo code).
2. `data.ts` fixes for the default cars (P2), each with a failing test first, and flagged to you.
3. `freshState()`, state-argument field helpers, `app/mutations.ts` and `canAddCar`, with the old page switched to them (no behavior change).
4. `MAX_SELECTED` becomes 4, `qa.cjs` lines 125 to 146 are rewritten, and the qa-visual mask is added (P3).
5. Old panels move to `ui/legacy/`; the old page's top line follows the current car (P10).
6. `numberText` and the `dsField` text mode; style guide.
7. `dsSlider`, `dsCheckRow` and `dsStatusLabel`; style guide; qa-components counts.
8. `app/scenario.ts` and `app/steps.ts` with tests; the QA hook and the `#answer` route; the old suites switch to the hook. The hook does real work here, because a fresh load now applies `PUBLIC_DEFAULTS`.
9. Steps 1, 2 and 3, each reachable by its hash, with renderer tests and their `qa-steps` checks.
10. The fresh load shows Step 1; router, focus, "Change my answers", titles; qa-components adapted.
11. Docs: decisions recorded in `08-open-decisions.md`, `02-ux-spec.md` and `03-architecture.md` updated, CLAUDE.md layout; a private preview of the full build checked on the real host.

**Floating:** raise the size baseline, in its own commit, immediately before the first commit that would exceed it (headroom is 7.7 KB).

## Risks
| Risk | Mitigation |
| --- | --- |
| The QA hook is a test-only branch in production code | one boot-time read; known names only; a unit test proves it reproduces today's state |
| The old suites no longer see the fresh load | `qa-steps.cjs` covers it |
| Text fields lose native number behavior | strict parser, visible range, `aria-invalid`, clamping; miles stays a native slider |
| Back behaves differently in the artifact frame | host probe first (commit 1) and an end-to-end preview last (commit 11) |
| Bolt supply ends around mid-2027 | dated note in the data; revisit the default EV at the quarterly data check |
| Estimate overrun | estimate below includes the review's additions |

## Estimate
About 3 days. `04-phases.md` says 1.5. The difference comes from the shared mutations refactor, three new components, status labels on every value, the data fixes, and adapting four existing suites.
