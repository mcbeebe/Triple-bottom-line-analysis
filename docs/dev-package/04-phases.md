# 04 Phases (development)

Rules for every phase: plan first and wait for the owner's approval; tests first for new logic; `npm run verify` green before each commit; open the page at 390 px and 1280 px; end with a short summary to the owner. Estimates are mine, not measured.

## Phase 0: Safety net and module split (about 0.5 day)
**Tasks**
1. Add `npm run qa` and `npm run verify` scripts (see `package.json`) and document the one-time Playwright setup.
2. Move code from `src/ui.ts` into the modules in `03-architecture.md` without changing behavior: `app/state.ts`, `app/fields.ts`, `ui/answer/*`, `ui/analyst/sheet.ts`, etc. Keep exports and DOM ids identical.
3. Add `AnalystClient` and wrap the current `claude.use('sample')` call in `ArtifactSampleClient`.
**Tests:** none new beyond a smoke test that each module imports. Existing 121 unit tests and the three QA suites must pass unchanged.
**Done when:** page is pixel-identical (compare screenshots before and after at 390 px and 1280 px), bundle size within 5%, `npm run verify` green.
**Commit plan:** one commit per module move.

## Phase 1: Design system (about 1 day)
**Tasks:** design tokens (`tokens.css`: color, type, spacing, radius) taken from `docs/ux-options`; two themes (Ledger and Night) selectable inside Fine-tune; shared components: step header with progress, chip, option button, card, disclosure, bottom sheet (focus trap, Escape, scroll lock); a hidden `#style-guide` view that renders all components.
**Tests:** unit tests for sheet open/close state; browser test that every component renders in both themes without overflow at 390 and 1280 px.
**Done when:** style guide shows every component; contrast at least 4.5:1 checked with axe in both themes; no visual change to the old page yet (new components unused).

## Phase 2: Guided steps 1 to 3 (about 1.5 days)
**Tasks:** `Scenario` type and defaults; step state machine; routing with Back button and focus management; Steps 1 to 3 per `02-ux-spec.md`; "Skip to answer"; limit of 4 cars on mobile; path `none` skips the car fields; custom car form.
**Tests (write first):** step transitions (including skip, back, path `none`); scenario <-> state mapping; defaults produce a valid result; car limit; browser test: from a fresh load, 3 taps reach the answer using defaults, Back returns to the previous step, keyboard-only completes the flow.
**Done when:** a new visitor reaches the (still old-style) answer in 3 taps; all acceptance rules in `02-ux-spec.md` for Steps 1 to 3 hold.

## Phase 3: Answer screen and Fine-tune (about 1.5 days)
**Tasks:** `verdict.ts` (sentence and "what would change this"); answer screen with 3 cards plus keep; basis line with Edit; sheets for Why, Fine-tune, Table, Share; share-link encode/decode (`share.ts`); footer notice and "data verified on" date; retire the old page layout.
**Tests (write first):** every verdict branch (keep wins, replace wins, top is cheapest, near-tie, no current car); break-even sentence for finite, `null` and already-cheaper cases; share round trip (encode, decode, clamp, reject unknown ids, size cap); browser: first card visible within one phone screen of the heading; edits in Fine-tune update the answer live; share link restores a scenario.
**Done when:** the whole flow matches the B1 to B4 mockups; old layout removed; no feature lost (compare against the feature list in `01-product-brief.md`).

## Phase 4: Analyst as an opt-in shortcut (about 1 day)
**Tasks:** analyst sheet reachable from Step 1 and the Answer; "fill the steps from one sentence" using the existing suggestions (path, current car name and values, cars, settings) mapped onto `Scenario`; clean fallback when the client is unavailable; keep the existing validation and Apply taps.
**Tests:** the mocked-AI browser suite updated for the sheet; with AI unavailable the whole flow still works and all entry points are hidden; sanitize and apply tests unchanged.
**Done when:** a typed sentence can fill steps 1 to 3 and land on the confirm-first answer; nothing applies without a tap.

## Phase 5: Quality and usability test (about 1 day)
**Tasks:** axe accessibility pass on each screen; Lighthouse (performance, accessibility, SEO) at least 90; 200% text zoom and 320 px checks; cross-browser (Chrome, Safari on iPhone, Firefox); run the 5-person usability test in `07-test-plan.md` and fix the findings.
**Done when:** the metrics in `01-product-brief.md` are met or each gap is logged with an owner decision.

## After Phase 5
Continue with the launch phases L1 to L6 in `06-launch-plan.md`. The prototype test of chat-first versus B can run at the Phase 5 test if the owner wants it (see `07-test-plan.md`).
