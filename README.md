# TBL Decision Scorecard

Triple-bottom-line (planet / people / profit) comparison for a personal purchase.
Test case: keep a 1999 Lexus LX 470 vs. replace with a Tesla Model Y, Rivian R2 or Chevy Bolt, on a loan or a lease.

- `src/engine.ts`: pure cost (NPV), lifecycle CO2e and scoring engine
- `src/data.ts`: defaults, each labeled Sourced (with link) or Assumption
- `src/ui.ts`, `src/style.css`: single-page UI with 3 themes and 3 scoring modes
- `npm run check`: typecheck, 121 unit tests, build to `dist/index.html`
- `node scripts/qa.cjs`: headless-browser QA (needs Playwright)

Data retrieved Nov 1, 2026; prices and offers change.

## Decision path and current car

- **Your decision** panel: sell then buy, trade in, or just buy (no car to dispose of). "Not sure" jumps to the AI analyst.
- California charges sales tax on the full price, so a trade-in changes only the money you receive (an editable discount below private-sale value, default 15%, a placeholder).
- "Just buy" removes the Keep option and the sale proceeds; anchored scoring falls back to the typical-new-car scale.
- The current car is editable (presets: Lexus example, and placeholder sedan, SUV and hybrid). The analyst can set the path, name the car, suggest its inputs, and add, build or remove cars (only from numbers the person gives).
- QA: `npm run check`, then `node scripts/qa.cjs`, `node scripts/qa-analyst.cjs`, `node scripts/qa-path.cjs`.

## Development package

See `CLAUDE.md` and `docs/dev-package/README.md` for the plan (guided-steps redesign and launch). Run `npm run verify` before every commit (one-time: `npm i -D playwright tsx && npx playwright install chromium`).
