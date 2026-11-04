# 00 Kickoff prompts (paste into Claude Code, one per phase)

Open Claude Code in the repo root so it reads `CLAUDE.md`. Each prompt tells it to plan and wait for approval.

## First session
```
Read CLAUDE.md and docs/dev-package/README.md, then 01 through 04. Summarize in 10 bullets what you understood, list any contradictions or missing information you found, and run `npm run verify` to confirm the baseline is green. Do not change code yet.
```

## Phase 0
```
Start Phase 0 from docs/dev-package/04-phases.md. First write a short plan (files to create, what moves where, risks) and stop for my approval. After approval: do the module split with no behavior change, one commit per module, take before/after screenshots at 390 px and 1280 px, and run `npm run verify`. Finish with a summary.
```

## Phase 1
```
Start Phase 1 (design system). Read docs/dev-package/02-ux-spec.md and the Option B screens in docs/ux-options/ux-options.html. Plan the tokens and components, wait for my approval, then build with tests. Show me the style guide view when done.
```

## Phase 2
```
Start Phase 2 (guided steps). Write the failing tests first for the step state machine, scenario mapping and defaults, show me the plan, and wait for approval. Then implement Steps 1 to 3 exactly per 02-ux-spec.md, add scripts/qa-steps.cjs, and make `npm run verify` pass.
```

## Phase 3
```
Start Phase 3 (answer screen and Fine-tune). Tests first for every verdict branch, the break-even sentence and share-link round trip. Plan, wait for approval, build, then compare the result against mockups B1 to B4 and confirm no feature from 01-product-brief.md was lost.
```

## Phase 4
```
Start Phase 4 (analyst as an opt-in shortcut). Keep sanitizeAnswer and tap-to-apply unchanged. Plan, wait for approval, then implement the AnalystClient fallback behavior and the sheet. Confirm the whole flow works with the AI unavailable.
```

## Phase 5
```
Start Phase 5 (quality and usability test). Add axe and Lighthouse checks, test at 320 px and 200% zoom, and prepare the usability test kit from 07-test-plan.md (task cards, observation sheet, report template). Report results against the targets in 01-product-brief.md.
```

## Launch (L1 to L6)
```
Start launch phase L2 (AI backend) from docs/dev-package/05-ai-backend-spec.md. Plan first and wait for approval. Never put the API key in client code; log counts only; show me the load-test results.
```

## When something is unclear
```
Stop and ask me. List the options with trade-offs and your recommendation. Do not guess prices, rules or rebates; look them up and cite the source.
```
