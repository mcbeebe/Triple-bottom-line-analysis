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
- `npm run qa`: three headless-browser suites, a bundle-size guard (5% over the Phase 0 baseline) and a pixel compare against tag `phase-0-baseline` (needs `npm i -D playwright tsx && npx playwright install chromium` once; without the tag it compares against baseline commit 89402fa).
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
- `src/app/`: state, field registry, option selectors, formatters, analyst session, prompt bridge and `AnalystClient`. No DOM; imports only core and app.
- `src/ui/`: rendering and events. `answer/` (verdict, cards, why, table, fineTune), `steps/` (decision, cars), `analyst/sheet.ts`, `controls.ts`, `events.ts`, `init.ts`, and `refresh.ts` (renderer hub that keeps the import graph acyclic).
- `src/ui.ts`: one-line re-export of `init` for `main.ts`. `src/style.css`, `src/template.html`: unchanged until Phase 1.
- Imports only go downward (ui -> app -> core); `src/modules.test.ts` fails on cycles, upward imports or exports without JSDoc.
- `scripts/`: build, QA suites, dump.
- `docs/ux-options/`: mockup generator and the approved design page.
- `docs/dev-package/`: this plan.

## Definition of done (every change)
1. Types, unit tests and build pass. 2. All QA suites pass. 3. The page was opened at 390 px and 1280 px and looks right (no overflow, nothing clipped). 4. No console errors. 5. Committed with a clear message. 6. The owner got a one-paragraph summary.
