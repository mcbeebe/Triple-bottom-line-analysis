# Phase 1 plan: design system

Status: **waiting for owner approval** (Nov 4, 2026). Decision 4 (plain TypeScript, no framework) is confirmed. Nothing in `src/` has changed yet.

## Goal
Build the parts the guided-steps screens will be made of, without changing the current page. That means tokens, two themes, the shared components from the Option B mockups, a bottom sheet with correct keyboard behavior, and a hidden `#style-guide` view that shows all of them. Source: `04-phases.md` Phase 1 and `02-ux-spec.md`. Reference screens: B1 to B4 in `docs/ux-options/ux-options.html`.

## Approach
- **New code sits beside the old page, not inside it.** New tokens get their own names (`--color-*`, `--space-*`, `--radius-*`, `--font-*`) and components get their own class prefix (`ds-`). The old `.chip`, `.card` and theme variables are untouched. The Phase 0 pixel check must still pass, which proves the old page did not change.
- **Components are pure functions that return HTML strings**, the same pattern the app uses today. Because they need no DOM, vitest can test every one of them in Node (escaping, ARIA attributes, disabled and selected states).
- **The bottom sheet's behavior is split in two.** A pure controller (`app/sheet.ts`) holds which sheet is open, where focus returns to, and the Tab-cycling math. A thin DOM layer (`ui/components/sheet.ts`) handles focus, Escape, scroll lock and marking the background `inert`. The controller gets unit tests; the DOM layer gets browser tests.

## Files

| File | What it holds |
| --- | --- |
| `src/ui/tokens.css` | Color, type, spacing, radius and shadow tokens for Ledger (light) and Night (dark) |
| `src/ui/components.css` | Styles for `ds-` components only |
| `src/ui/components/button.ts` | Primary and secondary buttons, link button (48 px tall per the mockups) |
| `src/ui/components/chip.ts` | Existing `chip` kept as is, plus a new `dsChip` |
| `src/ui/components/optionButton.ts` | Large one-tap choice for Step 1 (title and one-line description) |
| `src/ui/components/stepHeader.ts` | "Step 2 of 3", a 3-segment progress bar, heading and sub-heading; Back and "Skip to answer" footer |
| `src/ui/components/optionCard.ts` | Answer card: name, tag, score out of 100, 8-year cost, carbon, People score |
| `src/ui/components/disclosure.ts` | Native `<details>`/`<summary>` row with a meta line, for "Why" and "All assumptions" |
| `src/ui/components/field.ts` | Labeled money and number input with unit and allowed range (Step 2) |
| `src/ui/components/sheet.ts` | Bottom sheet markup plus the DOM behavior |
| `src/app/sheet.ts` | Pure sheet controller and focus-cycling helpers |
| `src/ui/styleGuide.ts` | `#style-guide` view: every component in every state, with a theme toggle |
| `scripts/qa-components.cjs` | Browser suite for the style guide, added to `npm run qa` |

`build.mjs` concatenates `tokens.css`, `components.css` and `style.css` into the single `dist/index.html`. `template.html` gets one hidden mount point, `<div id="style-guide" hidden>`.

## Tests (written first)
**Unit tests (vitest):**
- Each component escapes all text, sets the right ARIA state (`aria-pressed`, `aria-current="step"`, `aria-disabled`) and renders its disabled and selected variants.
- Step header: the step text matches the progress segments, and Back is disabled on step 1.
- Sheet controller: open, close, opening a second sheet replaces the first, closing restores the saved focus target, and Tab or Shift-Tab wraps at both ends.
- Tokens: every `--color-*` text and background pair used by a component meets 4.5:1 in both themes, and every control border meets 3:1. The test parses `tokens.css`, so the check runs on the real values.

**Browser tests (`qa-components.cjs`, at 390 px and 1280 px, both themes):**
- Every component renders, with no horizontal overflow and no console errors.
- axe finds no WCAG 2.1 AA violations, including color contrast.
- Every interactive element is at least 44 by 44 px.
- Sheet: focus moves into it, Tab stays inside, Escape closes it, focus returns to the opener, and the page behind does not scroll.
- Keyboard only: every control in the style guide can be reached and used.

## Commit plan (verify green before each)
1. `tokens.css` and the build concatenation, with token contrast tests. The old page stays pixel-identical.
2. `app/sheet.ts` with tests.
3. Component renderers with tests (button, chip, option button, step header, option card, disclosure, field).
4. Sheet DOM behavior.
5. Style guide view and `#style-guide` route.
6. `qa-components.cjs` with axe, touch-target and sheet checks; add `axe-core` as a dev dependency (version 4.14.0, current on npm).
7. Raise the size-guard baseline to the Phase 1 result, if needed; update docs.

## Done when
- The style guide shows every component in both themes.
- axe reports zero violations in both themes at both widths.
- The old page is pixel-identical to the Phase 0 baseline.
- `npm run verify` is green, and a one-paragraph summary goes to the owner.

## Decisions for the owner (recommended default first)

| # | Question | Recommendation | Why |
| --- | --- | --- | --- |
| A | The spec names two themes (Ledger, Night); today's page has three, including Field guide. | Build only Ledger and Night as new tokens. Keep Field guide on the old page until Phase 3 removes the old layout, then drop it; a saved "field" choice falls back to Ledger. | Removing Field now would change the current page, which Phase 1 must not do. |
| B | Night currently uses a monospace font (JetBrains Mono) for headings. The spec says Source Serif 4 for headings. | Use Source Serif 4 headings in both themes. | One type system is simpler to test and matches the approved mockups. |
| C | Borders are 1.4:1 (Ledger) and 1.3:1 (Night) against the card color. WCAG 2.1 asks for 3:1 when a border is the only sign of where a control is. | Add a stronger control-border token (at least 3:1) for inputs and unselected chips in the new components. Keep the light divider color for decorative lines. | Inputs and unselected chips would otherwise fail WCAG 1.4.11. The old page keeps its borders until Phase 3. |
| D | The spec puts the theme picker inside Fine-tune, which does not exist until Phase 3. | Use a theme toggle on the style guide for now. The old page's Design bar stays. | It keeps Phase 1 free of any change to the visible page. |
| E | The style guide ships inside the production bundle. | Keep it, behind `#style-guide`. It adds an estimated 3 to 5 KB. | One build target. The spec asks for a hidden view, and only a plain `#name` hash works on the artifact host. |

## Risks

| Risk | Mitigation |
| --- | --- |
| The bundle grows past the 5% guard (estimated +6 to +10 KB of CSS and JS, which is 5% to 8%) | Raise the baseline deliberately in commit 7, with the new number in the commit message |
| axe flags contrast problems in Night that the token test missed (for example text over semi-transparent fills) | axe runs on the rendered page, so it catches what the token test cannot; fix tokens, not tests |
| `inert` support | Chrome, Safari and Firefox all ship it. The sheet also traps focus itself, so behavior does not depend on `inert` alone |
| New CSS leaks onto the old page | `ds-` prefix and new token names; the pixel check fails on any leak |

## Estimate
About 1 day of build time, matching `04-phases.md`.
