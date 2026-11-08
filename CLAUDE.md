# TBL Decision Scorecard: instructions for Claude Code

Triple-bottom-line (planet / people / profit) scorecard for personal purchases. Test case: keep an old car, or sell or trade it in and buy an EV, hybrid or gas car, on a loan or a lease. Owner: Mike Beebe (product manager; reviews outcomes, does not hand-code).

Read `docs/dev-package/README.md` first. The plan is in `docs/dev-package/04-phases.md`.

## How to work with this owner
- **Plan first, then wait for approval** on any multi-file change. Outline the approach and trade-offs, then stop and ask. Single-file fixes need no approval.
- **Give status updates** at each phase boundary and when a direction changes. Use bullets, bold and a short summary.
- **Never say "done" until QA passes.** Pushing code that fails tests is unacceptable. Run `npm run verify` (see below) and look at the rendered page for any UI change.
- **Say "I don't know"** rather than guessing. Look things up (docs, sources) before asserting facts. Cite sources with links for any number, rebate, rate or rule.
- **Commit often.** One commit per logical step, authored as `Mike Beebe <mcbeebe@gmail.com>`, with these trailers:
  - `Co-Authored-By: Claude <noreply@anthropic.com>` (use the model name you are running as)
  - `Claude-Session: <session url, if known>`
- **Archive, do not overwrite.** Superseded design files or deliverables go in an `archive/` folder next to them; only the latest version is referenced.

## Stack and commands
- TypeScript only. ESM. esbuild bundles to a single file: `dist/index.html`.
- `npm run check`: typecheck, unit tests (vitest), build.
- `npm run qa`: four headless-browser suites (`qa-components.cjs` the design system; `qa-steps.cjs` the guided steps; `qa-answer.cjs` the answer screen and its panels: Why this result, Fine-tune, Table, Share, desktop side panels, paths; `qa-ai.cjs` the "Ask the analyst" sheet with a stubbed AI), each with axe, 44 px and cut-off checks; the port-ledger guard (`qa-ledger.cjs`: every check of the deleted old-page suites is ported or retired with a reason, see `docs/dev-package/phase-3b-port-ledger.md`); and a bundle-size guard (5% over the baseline in `scripts/qa-size.cjs`). Needs `npm i -D playwright tsx && npx playwright install chromium` once. Some checks boot the original Lexus test case through `window.__TBL_QA__ = { scenario: 'legacy' }` (set by Playwright, never read from the URL).
- `npm run verify`: `check` then `qa`. Run before every commit.
- `npx tsx scripts/dump.ts`: print default results (useful for sample numbers).

## Code rules
- **Engine is sacred.** `src/engine.ts`, `src/data.ts` and `src/analyst.ts` are pure and tested. Do not change scoring or defaults without a failing test first, and tell the owner.
- **Unit tests ship with every feature** (vitest). Prefer pure functions so they are testable. New logic without tests is not finished.
- **JSDoc on every exported function.** Inline comments only where they explain why.
- **All AI output goes through `sanitizeAnswer`.** Nothing the AI returns is applied without a user tap. Render AI text with the `esc` helper, never as raw HTML.
- **Sourced vs assumed.** Every default in `data.ts` is labeled `sourced` (with a link in `SRC`) or `assumption`. Keep that distinction in the UI.
- **Plain words in the UI.** Say "cost over 8 years", not "NPV"; "carbon", not "CO2e", unless explained in one line.
- **Accessibility.** Real `<button>`/`<a>`/`<label>`; 44 px touch targets; text contrast at least 4.5:1; visible focus; keyboard-only works; do not rely on color alone.
- **Privacy.** No accounts, no stored scenarios. Never log scenario text. Analytics is counts only.

## Layout
- `src/engine.ts`, `src/data.ts`, `src/analyst.ts` (+ tests): pure logic.
- `src/app/`: state (`freshState()`, `themeFrom`), fields and units (`fields.ts`), assumption sections, each car's field groups and the analyst's field list (`assumptions.ts`), the all-options table (`table.ts`), option selectors, formatters, number text (`numberText.ts`), shared mutations (`mutations.ts`), scenario, defaults, edits and settings (`scenario.ts`), share links (`share.ts`), verdict sentences and card tags (`verdict.ts`), step routes and rules (`steps.ts`), sheet controller, analyst session, prompt bridge and `AnalystClient`. No DOM; imports only core and app.
- `src/ui/`: rendering and events. `steps/` (the guided Steps 1 to 3, `router.ts`, `actions.ts`), `answer/` (`screen.ts` the answer at `#answer`; its panels `whySheet.ts`, `fineTuneSheet.ts` with `assumptionsPanel.ts` and `fineTuneActions.ts`, `tableSheet.ts`, `shareSheet.ts`; `screenActions.ts`), `analyst/` (`sheet.ts` the analyst renderer, `aiSheet.ts` its bottom sheet, `offer.ts` the Step 1 and answer entry points), `events.ts` (analyst actions, remembered sections), `init.ts`, and `refresh.ts` (renderer hub that keeps the import graph acyclic). Old `#details` links open the answer.
- `src/ui/tokens.css` (Ledger and Night design tokens), `src/ui/base.css` (element rules only), `src/ui/components.css` (`ds-` classes only), `src/ui/components/` (`ds*` HTML renderers: button, chip, option button, step header, option card, disclosure, field, slider, sheet, status label), `src/ui/styleGuide.ts` (hidden `#style-guide` view). Panels are bottom sheets on phones and open beside the answer at 1024 px and up.
- `src/ui.ts`: one-line re-export of `init` for `main.ts`.
- Imports only go downward (ui -> app -> core); `src/modules.test.ts` fails on cycles, upward imports or exports without JSDoc.
- `scripts/`: build, QA suites, dump.
- `docs/ux-options/`: mockup generator and the approved design page.
- `docs/dev-package/`: this plan.

## Definition of done (every change)
1. Types, unit tests and build pass. 2. All QA suites pass. 3. The page was opened at 390 px and 1280 px and looks right (no overflow, nothing clipped). 4. No console errors. 5. Committed with a clear message. 6. The owner got a one-paragraph summary.
