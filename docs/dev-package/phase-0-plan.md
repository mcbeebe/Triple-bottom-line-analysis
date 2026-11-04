# Phase 0 plan: safety net and module split

Status: **approved Nov 4, 2026; built on branch `phase-0-module-split`.** Results are at the end of this file.

Baseline measured in this session, tagged `phase-0-baseline`:

| Check | Result |
| --- | --- |
| `tsc --noEmit` | clean |
| `vitest run` | 121 passed, 0 failed |
| `node scripts/build.mjs` | `dist/index.html` 132,998 bytes (129.9 KB) |
| `npm run qa` (3 Playwright suites) | 165 PASS, 0 FAIL |
| Page height at 390 px / 1280 px | 15,160 px / 9,148 px |

## Goal
Move `src/ui.ts` (1,562 lines) into the module layout from `03-architecture.md` with **no behavior change**, add the `AnalystClient` seam, and add the checks that prove nothing moved: a pixel compare against the baseline and a bundle-size guard.

## What is already done (no approval needed)
- `npm run qa` and `npm run verify` scripts exist in `package.json` and are documented in `README.md` and `CLAUDE.md` (Phase 0 task 1).
- `tsx` added as a devDependency so `npx tsx scripts/dump.ts` works as documented.
- `docs/ux-options/ux-options.html` (the approved Option B design page, missing from the handoff snapshot) regenerated from `build_html.py`. Generated scratch (`project/`, `__pycache__`) and `dist/` are now ignored.

## Move map (every top-level symbol in `ui.ts` has one destination)

| `ui.ts` lines | Symbols | Destination | Layer |
| --- | --- | --- | --- |
| 49 to 127 | `Theme`, `View`, `Tab`, `State`, `MAX_SELECTED`, `THEMES`, `MODES`, `PRESET_LABELS`, `clone`, `state` | `app/state.ts` | app (no DOM) |
| 129 to 132 | `esc`, `$`, `usd`, `num` | `ui/format.ts` | ui |
| 133 to 205 | `lx`, `vehicle`, `hasCar`, `activeVehicles`, `keepOf`, `carNow`, `allOptions`, `visibleOptions`, `scoring`, `optionName`, `tagFor`, `scaleLabel`, `scaleBlurb`, `kindLabel`, `gasBreakEven`, `paybackText`, `incentiveTotal` | `app/options.ts` (selectors over state and engine) | app |
| 169 to 177 | `safeStore` | `app/storage.ts` | app |
| 208 to 273 | `sensitivityGrid`, `buildVerdict` | `ui/answer/verdict.ts` (Phase 3 replaces it with the pure `app/verdict.ts`) | ui |
| 275 to 347 | `pillarRow`, `renderCards`, `colorKey`, `renderBars` | `ui/answer/cards.ts` | ui |
| 349 to 411, 841 to 850 | `planetTable`, `peopleTable`, `profitTable`, `renderSens`, `renderSources` | `ui/answer/why.ts` | ui |
| 413 to 494 | `Col`, `tableCols`, `sortedTableRows`, `renderTable`, `tableAsTsv` | `ui/answer/table.ts` | ui |
| 496 to 536 | `renderLive`, `renderResults` | `ui/answer/answer.ts` | ui |
| 538 to 562 | `chip`, `renderControls` | `ui/components/chip.ts`, `ui/controls.ts` | ui |
| 564 to 588 | `PATHS`, `pathBlurb`, `renderPath` | `ui/steps/decision.ts` (old panel; Phase 2 rewrites it in place) | ui |
| 590 to 616 | `pickChip`, `renderPicker` | `ui/steps/cars.ts` (same) | ui |
| 618 to 663 | `Field`, `fieldRegistry`, `fieldId`, `holderOf`, `readField`, `defaultOf`, `writeField`, `isEdited` | `app/fields.ts` | app |
| 665 to 840 | `badge`, `srcLinks`, `fmtDefault`, `control`, `resetBtn`, `gridRow`, key lists, `MATRIX_ROWS`, `SUB_OF`, `matrixCell`, `renderMatrix`, `renderNotes`, `section`, `renderAssumptions`, `refreshEdited` | `ui/answer/fineTune.ts` | ui |
| 852 to 866 | `SampleApi`, `analyst` session object | `app/analystClient.ts` (interface + `ArtifactSampleClient`), `app/analystSession.ts` (the mutable session: text, busy, answer, history) | app |
| 868 to 948 | `AN_EXAMPLES`, `toShown`, `fromShown`, `fmtField`, `analystFields`, `addableCars`, `analystPrompt` | `app/analystBridge.ts` (state to prompt, no DOM) | app |
| 950 to 1272 | `setAnStatus`, `runAnalyst`, `syncAnButtons`, `renderAnalyst`, `renderAnalystOut`, `applyAnalystField`, `onAnalystAction`, `initAnalyst` | `ui/analyst/sheet.ts` | ui |
| 1273 to 1534 | `applyTheme`, `refreshAll`, `onAction`, `bindEvents` | `ui/events.ts` | ui |
| 1536 to 1562 | `init` (and the `window.__tbl` QA hook) | `ui/init.ts`; `src/ui.ts` becomes a one-line re-export so `main.ts` and the QA hook are untouched | ui |

`src/style.css` and `src/template.html` do not move in Phase 0 (Phase 1 introduces `tokens.css`). DOM ids, `data-act` names, `data-field` ids and the `window.__tbl.snapshot()` shape stay byte-for-byte identical.

## The one design decision inside the split: cross-renderer calls
The analyst code calls `refreshAll`, `renderPicker`, `renderResults`, `renderControls` and `refreshEdited`; `renderPath` reads `analyst.sample` to show the "Not sure, ask the analyst" chip. Cut naively, that is an import cycle (`events -> analyst sheet -> events`). Proposal:

- `app/analystSession.ts` holds the session object, so both `ui/steps/decision.ts` and `ui/analyst/sheet.ts` import it downward. The chip condition becomes `analystSession.client !== null`.
- `ui/refresh.ts` is a tiny hub: `registerRenderers({...})` is called once from `ui/init.ts`; modules call `refresh.all()`, `refresh.results()` etc. through it. No ui module imports `events.ts`.
- A unit test (`src/modules.test.ts`) walks `import` lines under `src/` and fails on any cycle and on any upward import (core must not import app, app must not import ui).

## AnalystClient seam (Phase 0 task 3)
```ts
export interface AnalystClient {
  available(): Promise<boolean>;
  ask(prompt: string, signal: AbortSignal): Promise<unknown>; // raw JSON; sanitizeAnswer runs after
}
export class ArtifactSampleClient implements AnalystClient { /* wraps window.claude.use('sample').json(...) */ }
```
`runAnalyst` calls `client.ask(...)`; the `not_granted`, `rate_limited` and abort branches are unchanged. `HttpAnalystClient` is Phase 4 / L2, not now. The existing `qa-analyst.cjs` stubs of `window.claude.use` keep working because `ArtifactSampleClient` still goes through that object.

## New safety-net scripts
1. `scripts/qa-visual.cjs`: builds the `phase-0-baseline` tag in a temporary git worktree, screenshots both builds full-page at 390 px and 1280 px (device scale 1, fonts blocked so the result is deterministic), and fails unless the PNGs are byte-identical. Writes both images plus a diff to `qa-shots/` on failure. Added to `npm run qa`.
2. `scripts/qa-size.cjs`: fails if `dist/index.html` is more than 5% above the baseline (cap 139,647 bytes).

## Tests
- No scoring or data tests change. The 121 unit tests and 165 browser checks must pass unchanged after every commit.
- New: `src/modules.test.ts` (each new module imports in Node without touching the DOM; no cycles; no upward imports).
- New: `src/app/analystClient.test.ts` (`ArtifactSampleClient` returns unavailable when `window.claude` is missing, when `use` throws, and when `use` resolves null; passes the abort signal through).

## Commit plan (one commit per move, verify green before each)
1. Safety net: `qa-visual.cjs`, `qa-size.cjs`, `modules.test.ts`, package scripts.
2. `app/state.ts` + `app/storage.ts` + `ui/format.ts`.
3. `app/options.ts`.
4. `app/fields.ts`.
5. `ui/answer/*` (verdict, cards, why, table, answer, fineTune) and `ui/refresh.ts`.
6. `ui/components/chip.ts`, `ui/controls.ts`, `ui/steps/decision.ts`, `ui/steps/cars.ts`.
7. `app/analystClient.ts` + test, `app/analystSession.ts`, `app/analystBridge.ts`, `ui/analyst/sheet.ts`.
8. `ui/events.ts`, `ui/init.ts`; `ui.ts` reduced to a re-export; CLAUDE.md layout section updated.

## Done when
- `npm run verify` green (now 121 unit + 165 browser + visual + size + module tests).
- Screenshots at 390 px and 1280 px byte-identical to the baseline.
- Bundle within 5% of 132,998 bytes.
- `src/ui.ts` is under 10 lines; no module over 400 lines except `ui/answer/fineTune.ts` (about 240) and `ui/analyst/sheet.ts` (about 330).
- One-paragraph summary to the owner with the before and after numbers.

## Risks
| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| Import cycles after the cut | high | `ui/refresh.ts` hub plus the cycle test; esbuild tolerates runtime cycles, so a slip would not crash, but the test catches it |
| Screenshots differ for reasons other than code (font loading, timing) | medium | block the Google Fonts request in both runs, wait for `load` plus a fixed settle, device scale 1 |
| Bundle grows past 5% from module boilerplate | low | esbuild hoists ESM scopes; expect under 1% |
| Playwright on the owner's machine: `npm i -D playwright` plus a browser download | n/a here | this cloud session uses the pre-installed Playwright 1.63; the README instruction stands for local machines |
| Phase 1 to 3 then rewrite several of these files | certain | the split still pays off: state, fields, options, analyst bridge and client survive untouched |

## Estimate
About half a day of build time once approved, matching `04-phases.md`.

## Owner decisions this phase needs
- **Approve this plan**, or change the move map.
- **Create the GitHub repo.** Repo creation is blocked from this cloud session (only repository-scoped GitHub API calls are allowed). Create an empty `mcbeebe/tbl-scorecard` (no README, no license, private recommended) and grant the Claude GitHub App access at https://claude.ai/connect-github. The local repo has the baseline commit and the `phase-0-baseline` tag ready to push.
- Not needed yet, but due before Phase 2 (from `08-open-decisions.md`): default current-car preset (7), default compared cars (8), mobile car limit (9). Decision 4 (plain TypeScript) is assumed for Phase 1.

## Results (Nov 4, 2026)

| Check | Baseline | After split |
| --- | --- | --- |
| Unit tests | 121 | 160 (121 unchanged + 31 module tests + 8 `ArtifactSampleClient` tests) |
| Browser checks | 165 | 168 (165 unchanged + size guard + 2 visual compares) |
| Screenshots at 390 px and 1280 px | baseline | byte-identical (fonts blocked in both runs) |
| `dist/index.html` | 132,998 bytes | 133,609 bytes (+0.46%) |
| `src/ui.ts` | 1,562 lines | 2 lines (re-export) |
| Largest module | n/a | `ui/analyst/sheet.ts`, 334 lines |

Deviations from the plan, all minor:
- `esc`, `usd` and `num` live in `app/format.ts`, not `ui/format.ts`, because app code (the prompt bridge, option selectors) formats numbers. `$` lives in `ui/dom.ts`.
- `colorKey` moved to `app/options.ts`; every renderer needs it.
- `sensitivityGrid` sits in `app/options.ts` rather than `ui/answer/verdict.ts` because it is pure and both the verdict and the sensitivity table use it.
- `modules.test.ts` also fails on any export in `src/app` or `src/ui` without a JSDoc comment, enforcing the CLAUDE.md rule.
- The `phase-0-baseline` tag could not be pushed from the cloud session (the git proxy closes the connection on tag pushes, and the REST route is blocked). `qa-visual.cjs` accepts `TBL_BASELINE=89402fa` as a fallback.
