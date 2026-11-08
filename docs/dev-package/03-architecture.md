# 03 Architecture

## Principle
Keep the pure core (`engine.ts`, `data.ts`, `analyst.ts`) untouched. Replace only the interface layer. Stay on plain TypeScript through launch (no framework rewrite mid-flight); revisit only if state handling becomes painful (open decision 4).

## Target module layout (created in Phase 0, filled in Phases 1 to 4)
```
src/
  engine.ts  data.ts  analyst.ts            # pure, tested, unchanged
  app/
    state.ts        # the single state object, selectors, mutations (no DOM)
    scenario.ts     # Scenario type, defaults, scenario <-> state mapping
    router.ts       # step routing (Back button), focus management
    share.ts        # encode/decode scenario for share links (pure, tested)
    verdict.ts      # verdict sentence + "what would change" (pure, tested)
    fields.ts       # field registry, read/write/default/isEdited (moved from ui.ts)
    analystClient.ts# AnalystClient interface + implementations
  ui/
    components/     # step header, chip, option button, card, disclosure, sheet
    steps/          # decision.ts, driving.ts, cars.ts
    answer/         # answer.ts, cards.ts, why.ts, fineTune.ts, table.ts, shareSheet.ts
    analyst/        # sheet.ts (render + actions)
    theme.css  tokens.css
  main.ts
  template.html
scripts/  qa*.cjs  build.mjs  dump.ts
```
Phase 0 moves code without changing behavior. A file may only import downward (ui -> app -> core).

## State
Single mutable `state` (today's object in `ui.ts`), moved to `app/state.ts`, plus `step: 'decision' | 'driving' | 'cars' | 'answer'` and `sheet: null | 'why' | 'fineTune' | 'table' | 'share' | 'analyst'`. Rendering is string templating into stable mount points (as today); each step renders only its own mount point. Every state change goes through a mutation function that triggers a targeted re-render, so unit tests can call mutations without a DOM.

## Scenario (what a share link and a saved session contain)
```ts
interface Scenario {
  v: 1;
  path: 'sell' | 'trade' | 'none';
  carPreset: string;            // 'lexus' | 'sedan' | 'suv' | 'hybrid' | 'custom'
  carOverrides: Record<string, number>; // owned-car fields that differ from the preset
  miles: number;
  selected: string[];           // catalog ids and custom car specs
  customCars: { name: string; kind: 'ice'|'hybrid'|'ev'; price: number; efficiency: number }[];
  edits: Record<string, number>;// field id -> value, only fields that differ from default
  settings: { mode: string; scale: string; preset: string; view: string };
}
```
Rules: store only differences from defaults; clamp on decode; reject unknown ids; cap payload at about 2 KB.

## Routing and share links
- **As built in Phase 2:** routes are `#step-1`, `#step-2`, `#step-3`, `#answer` and `#style-guide`. The pure parts (parse, next/prev, deep-link guard, back decision, titles) are in `app/steps.ts`; the DOM router is `ui/steps/router.ts`, which tags each history entry so in-app Back uses `history.back()` only when the previous entry is the wanted step. `app/scenario.ts` holds the Phase 2 subset of `Scenario` (no edits or settings yet; custom cars without names), `PUBLIC_DEFAULTS` and `LEGACY_SCENARIO`; `app/mutations.ts` is the one place state changes for the steps, the old page and the analyst. A QA-only boot hook (`window.__TBL_QA__`, set by Playwright, never read from the URL) loads the legacy scenario for the old suites.
- **Phase 3b, as built:** the old single page (`#details`, "All the details") is gone; an old `#details` link opens `#answer` and the address is corrected. Why this result, Fine-tune (top drivers, All assumptions with each car one at a time, Scoring and appearance), Table, Share and Ask the analyst are sheets over the answer: bottom sheets on phones, beside the answer at 1024 px and up. The analyst's list of editable values is `analystFieldList(state)` in `app/assumptions.ts`.
- **Phase 3a share links, as built:** `#s1-` followed by the scenario as compact JSON in lower-case base32 (letters and digits only, so it is a plain `#name` the artifact host passes through). Parts equal to the public defaults are left out (the default link is `#s1-pmrhmir2gf6q`); 2 KB cap; decoding goes through `normalizeScenario`. Opening Share also writes the name into the address; a later edit clears it.
- Steps and sheets use the history API so the browser Back button works. **On the artifact host only a plain `#name` hash is allowed**; on the website use `#step-2`, `#answer`, and `?s=<base64url scenario>` for share links. Abstract this behind `router.ts` so both hosts work.
- Decoding a share link lands on the Answer with the scenario applied and "Edit" available.
- Never put keys, tokens or free text (the analyst sentence) in the URL.

## Analyst client abstraction
```ts
interface AnalystClient {
  available(): Promise<boolean>;
  ask(input: AnalystRequest, signal: AbortSignal): Promise<unknown>; // raw JSON, validated later by sanitizeAnswer
}
```
- `ArtifactSampleClient`: current `claude.use('sample')` path (kept for the artifact build).
- `HttpAnalystClient`: `POST /api/analyst` (website; spec in `05-ai-backend-spec.md`).
- The UI depends only on `AnalystClient`. If `available()` is false, all analyst entry points are hidden.
- `sanitizeAnswer` stays client-side and is also run server-side on the response shape.

## Build and deploy
- esbuild keeps producing one self-contained `dist/index.html` for the artifact. For the website add a second build target that emits `dist/site/` (HTML, JS, CSS, landing and explainer pages) and `api/` functions; keep both from the same source.
- Environment configuration is injected at build or request time; no secrets in the bundle.

## Performance budget
Initial JS plus CSS under 150 KB gzipped (today's single file is about 130 KB uncompressed); first answer render under 100 ms on a mid-range phone; no layout shift when sheets open.

## Quality gates in CI (add in Phase 5)
Typecheck, unit tests, build, the Playwright suites, an axe accessibility pass on each screen, and Lighthouse on the built site.
