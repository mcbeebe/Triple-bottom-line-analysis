# Phase 2 plan: guided steps 1 to 3

Status: **draft, under review, not yet sent to the owner** (Nov 4, 2026).

Owner decisions in force: 4 (plain TypeScript), 7 (default current car is the older gas sedan, labeled placeholder; the Lexus stays as an example), 8 (one EV, one hybrid and one gas car), 9 (car limit 4), and thousands separators in money fields.

## Goal
A new visitor answers three questions, one per screen, and reaches the (still old-style) answer in 3 taps with defaults. Source: `04-phases.md` Phase 2 and `02-ux-spec.md` Steps 1 to 3. The answer screen itself is rebuilt in Phase 3.

## How Phase 2 fits next to the old page
- **Routes.** `#step-1`, `#step-2`, `#step-3` and `#answer`, plus the existing `#style-guide`. These are plain `#name` hashes, which the artifact host passes through, and none match an element id. A fresh load (no hash) shows Step 1.
- **The answer in Phase 2 is today's page** (`<main>`), shown on `#answer`. It is re-rendered from state every time it is entered, so changes made in the steps and changes made on the old page never drift apart.
- **The steps render into a new mount point**, `<div id="steps">`, outside `<main>`. Step fields get their own ids, so they never duplicate the old page's input ids.
- **The new public defaults live in `src/app/scenario.ts`, not in `data.ts`.** That leaves the engine and its 97 tests untouched ("Engine is sacred").

## Defaults (decisions 7 and 8)
- **Current car:** the "Older gas sedan" preset (placeholder values: $9,000, 28 mpg).
- **Cars compared:** Chevy Bolt (EV), Toyota Camry Hybrid, Toyota Corolla (gas). This is the sedan-class trio and the cheapest of each kind. Measured with the real engine, sell path, app default scoring:

| Rank | Option | Overall | Cost over 8 years | Carbon | People |
| --- | --- | --- | --- | --- | --- |
| 1 | Keep my gas sedan | 61.6 | $20,984 | 25.2 t | 50 |
| 2 | Bolt (loan) | 59.6 | $39,648 | 21.4 t | 55 |
| 3 | Camry Hybrid (loan) | 58.1 | $37,736 | 29.9 t | 56 |
| 4 | Camry Hybrid (lease) | 56.6 | $46,891 | 29.9 t | 56 |
| 5 | Bolt (lease) | 56.2 | $59,102 | 21.4 t | 55 |
| 6 | Corolla (loan) | 53.3 | $34,338 | 35.9 t | 45 |

- Any trio with the Tesla Model Y flips the default answer to "buy the Tesla on a loan" (64.7). The main reason is a People rating of 5 for "built locally in Fremont, CA", which is only local for Bay Area buyers. That is the EV-biased look decision 8 wants to avoid.
- **Data problems found** (to fix or confirm before this ships as the public default; see the fact check):
  - The Corolla's source link points to a Camry LE dealer listing, and its 35 mpg comes from a low-authority summary.
  - The Bolt's sourced lease offer ends Nov 4, 2026, and GM is ending Bolt production.
  - No gas car in the catalog has lease terms, so the gas option is always loan-only.

## Screens (copy is the spec's unless marked *proposed*)
**Step 1, "What are you deciding?"** Sub: "Pick the closest one. You can change it later."
- Four option buttons. One tap chooses and moves to Step 2. Nothing is preselected on a fresh load.
  - Sell my car, then buy / "Sell it yourself and put the money toward the next car"
  - Trade my car in / "A dealer takes it off the price"
  - Just buy / "No car to sell, or I am keeping mine"
  - Not sure: describe it in a sentence / *proposed sub:* "Opens the analyst". Shown only when the AI is available. Until Phase 4 builds the analyst sheet, it opens the answer screen with focus in the existing analyst box.
- Footer: Back (disabled) and Skip to answer.

**Step 2, "Your car and your driving".** Sub: "Start from a preset. Values marked as placeholders are not sourced."
- "Car you have now": chips for Older gas sedan (default), Older gas SUV, Older hybrid, "Lexus LX 470 (example)" and "Something else". Something else opens fields for name, value, mpg, repair cost per mile and insurance, starting from the sedan's placeholder values.
- "What it would sell for": a money field with commas and a "Placeholder" or "Sourced" label with its link.
  - *Proposed for the trade path:* the label becomes "What it would sell for privately", with a line underneath: "A dealer offer is assumed 15% lower: about $7,650." The model stores the private value and a discount, so editing the offer directly would mean silently rewriting one or the other.
- "Miles per year": a slider with a linked number field, 1,000 to 25,000 in steps of 500, default 7,500. The spec says 30,000, but the data allows 25,000; raising it is a `data.ts` change.
- Note: "Not sure of a number? Leave it. Placeholders are marked and you can change them from the answer screen."
- Primary: Continue to cars. Secondary: Back, Skip to answer.
- *Proposed for "Just buy":* heading "Your driving", sub "How much you drive changes the answer most.", miles only, still "Step 2 of 3".

**Step 3, "Which cars should we compare?"** Sub: "{n} of up to 4 chosen. Each is compared on a loan and, where known, a lease."
- Real checkboxes with labels, grouped under Electric, Hybrid, Gas and Your own. Each row shows name, type, price, and "Loan only" when there is no lease.
- At 4 cars the unchecked boxes are disabled, with the visible message "Pick up to 4. Uncheck one first." linked by `aria-describedby`.
- "+ Add my own car" opens an inline form: name, type (Electric, Hybrid, Gas), price, and mpg or kWh per 100 mi. It reuses `makeCustomVehicle`, and each of your own cars gets a Remove button.
- Primary: Show my answer. Secondary: Back, Skip to answer.
- With no cars chosen, Show my answer and Skip are disabled, with the reason "Pick at least one car to compare."

## Behavior rules (all in pure, unit-tested functions)
- **Skip to answer** works from every step with current values. Skipping before a path is chosen assumes "Sell my car, then buy". The old answer page shows that path selected, so the assumption is visible.
- **Back.** In-app Back goes to the previous step. When that step is also the previous browser history entry, it calls `history.back()` instead, so browser Back and in-app Back never fight. Browser Back moves between steps because every step change is a hash change.
- **Focus** moves to the new screen's heading on every step change. It does not move on the first load.
- **Deep links and reloads** to `#step-2` or `#step-3` before a path is chosen go back to Step 1. `#answer` shows the answer with defaults; nothing is stored.
- **Car limit: 4 at every width and everywhere** (steps, the old picker and the analyst's add-car actions). A width-dependent limit would change state when a phone rotates.
- **Commas:** every new step field (money and miles) is a text input with `inputmode="decimal"`, shows thousands separators, and parses `$7,000` or `7000`. Text it cannot parse, and values out of range, show the allowed range with `aria-invalid`; out-of-range values clamp on blur. The old page's Fine-tune inputs stay `type=number` until Phase 3 replaces them. That keeps the pixel check and the old suites valid.

## Modules
| File | Contents |
| --- | --- |
| `src/app/state.ts` | add `freshState()`; the singleton becomes `freshState()` (no behavior change) |
| `src/app/scenario.ts` | `Scenario` (path, carPreset, carOverrides, miles, selected, customCars), `PUBLIC_DEFAULTS`, `LEGACY_SCENARIO` (Lexus + Tesla/Rivian/Bolt, for QA), `applyScenario(state, s)`, `scenarioFrom(state)`, validation (unknown ids rejected, values clamped to field ranges, at most 4 cars) |
| `src/app/steps.ts` | step state machine (`choosePath`, `next`, `back`, `skip`, `canShowAnswer`), car toggle with the limit, route parse and format |
| `src/app/numberText.ts` | `parseNumberText` and `formatNumberText` (commas, `$`, decimals) |
| `src/ui/components/field.ts` | text-mode field with commas, error state and `aria-invalid` |
| `src/ui/components/slider.ts`, `checkRow.ts` | new `dsSlider` and `dsCheckRow` |
| `src/ui/legacy/pathPanel.ts`, `pickerPanel.ts` | today's `ui/steps/decision.ts` and `cars.ts` moved here, so `ui/steps/` holds the new screens (no behavior change) |
| `src/ui/steps/decision.ts`, `driving.ts`, `cars.ts`, `router.ts` | the three screens and the hash router with focus management |
| `scripts/qa-steps.cjs` | new browser suite |

Scenario scope: Phase 2 maps only what the steps set. Fine-tune edits and scoring settings are added in Phase 3 together with share links. Free text (car names) stays in state and will never go into a URL.

## Tests (written first)
**Unit:**
- `freshState()` matches today's initial state.
- `PUBLIC_DEFAULTS` is valid: ids exist; one EV, one hybrid and one gas car; at most 4.
- Defaults produce a scored result with a keep option on the sell path and no NaN.
- `scenarioFrom(applyScenario(freshState(), s))` round-trips.
- Clamping (miles 30,000 becomes 25,000), unknown car and preset ids are rejected, the 5th car is refused.
- Custom cars are rebuilt from a spec.
- Every state-machine transition, including skip from each step, back from each step, path none, the deep-link guard, and skip blocked with zero cars.
- Route parse and format.
- `parseNumberText` and `formatNumberText`: `7,000`, `$7,000.50`, empty, `7k`, `4.85`, negative.
- The new components: escaping, ARIA, the disabled-with-reason state, and the formatted value.

**Browser (`qa-steps.cjs`, at 390 and 1280 px):**
- A fresh load shows Step 1 with nothing pressed.
- 3 taps reach the answer with defaults; the answer shows Keep my gas sedan plus Bolt, Camry Hybrid and Corolla.
- Browser Back and in-app Back move between steps, and focus lands on each new heading.
- Skip works from every step.
- Path none shows only miles and gives no keep card.
- The 4-car limit and its message.
- Add and remove your own car.
- Commas in, commas out; an out-of-range value clamps.
- Keyboard-only completes the flow.
- axe finds 0 violations on every step; every control is at least 44 px.
- No overflow and no console errors.
- The analyst option is hidden without AI, and when AI is stubbed it opens the old analyst box.

**Existing suites, "option A" (measured on a Phase 2 emulation: keeps all 165 old-page checks and both pixel checks):**
- `qa.cjs`, `qa-analyst.cjs` and `qa-path.cjs` load `#answer` with a QA-only boot hook (`window.__TBL_QA__`, set by Playwright before load and never read from the URL) that applies `LEGACY_SCENARIO`.
- `qa.cjs`'s limit block changes from 8 to 4. That is an intended change.
- `qa-visual.cjs` uses the same hook and route, and masks the one line that now reads "Pick up to 4 cars".
- `qa-components.cjs` scopes its counts to `#style-guide`, and its route test expects Step 1.

## Commit plan (verify green before each)
1. `freshState()` with a test (no behavior change).
2. Old panels move to `ui/legacy/` (no behavior change).
3. `numberText` with tests; `dsField` text mode with commas; style guide updated.
4. `dsSlider` and `dsCheckRow` with tests; style-guide entries.
5. `app/scenario.ts` with tests.
6. `app/steps.ts` (state machine and routes) with tests.
7. QA hook, `#answer` route, limit 4 everywhere, old suites adapted. A fresh load still shows the old page at this point.
8. Step screens, router and focus. A fresh load now shows Step 1.
9. `qa-steps.cjs`.
10. Size-baseline raise, in its own commit, right before the first commit that would exceed it, with the measured number.
11. Docs, plan results, and a private preview artifact to check hash routing and Back on the real host.

## Risks
| Risk | Mitigation |
| --- | --- |
| The QA hook is a test-only branch in production code | one read at boot, of a `window` global that only Playwright sets; it accepts only known scenario names and goes through the same `applyScenario` |
| The old suites no longer test the fresh load | `qa-steps.cjs` covers the fresh load and the default answer |
| Formatted text inputs lose native number behavior (spinbutton role, arrow-key stepping) | `inputmode="decimal"`, visible range, `aria-invalid` and clamping; the slider keeps arrow-key stepping for miles |
| The hero on the old answer page still names the Lexus test case | known limitation until Phase 3 replaces the page |
| Hash routing or Back behaves differently inside the artifact host's frame | preview artifact check in commit 11 |
| Bundle growth (headroom is 7.7 KB) | deliberate baseline raise in its own commit |
| Estimate overrun (Phase 1 ran 2 to 3 times over on size) | estimate below is honest about the new components and the QA rework |

## Estimate
About 2 to 2.5 days. `04-phases.md` says 1.5. The difference is two new components (slider, checkbox row), the comma-formatted field, and adapting four existing browser suites.
