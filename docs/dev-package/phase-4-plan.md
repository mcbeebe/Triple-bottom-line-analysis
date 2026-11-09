# Phase 4 plan: fill the steps from one sentence

Status: **draft for owner approval** (Nov 8, 2026). Mockups: `phase-4-mockups.html` (real renderers and engine; the analyst's reply is the fake one the tests use).

## Goal (from `04-phases.md`)
"A typed sentence can fill steps 1 to 3 and land on the confirm-first answer; nothing applies without a tap." With the AI unavailable, every entry point stays hidden and the steps work as they do now.

## Already done (Phase 3a addendum and 3b)
- The analyst sheet opens from Step 1 ("Not sure? Describe it in a sentence") and from the answer ("Ask the analyst").
- Its replies go through `sanitizeAnswer`, and each suggestion has its own Apply.
- The panel uses design-system styles, and every error code has plain words.
- With the AI unavailable, the entry points are hidden. The checks for this are in `qa-ai.cjs`.

## What is new
1. **Map the reply onto the steps.** The analyst's reply covers the path, your car's name and numbers, miles, cars to add or drop, and scoring settings. A pure `proposalFrom(answer, state)` turns it into a short list of proposed step answers:
   - Step 1: what you are deciding.
   - Step 2: your car's name and numbers, and miles.
   - Step 3: cars to add (catalog or built from your numbers) and cars to drop.
   - Settings: scoring and weighting.

   It respects the rules the steps already enforce:
   - The 4-car limit: an item that would break it is shown, disabled, with the reason.
   - On "just buy" there is no car of yours.
   - Your own car is never dropped.
2. **Apply in one tap.** `applyProposal(state, ids)` applies only the ticked items, using the existing mutations. Choosing a path counts as answering Step 1. If the analyst gave your car a name or numbers, Step 2 switches to "Something else", so the name shows; the mockups found that it is hidden today. It returns a snapshot for Undo.
3. **The confirm-first answer.** After the tap, the answer opens with a box: "Filled in from your description", listing what changed, with three buttons:
   - **Looks right** hides the box.
   - **Change** goes to Step 1.
   - **Undo** restores everything exactly as it was before the tap, including names.

   The verdict below updates as usual and the change is announced.
4. **Today's detail cards stay below the list** for what does not map to a step: questions with Set, other suggested values such as gas price, what the results mean, and caveats.

## Decision for the owner
| # | Question | Options | Recommendation |
| --- | --- | --- | --- |
| E1 | How the sentence fills the steps | **A** review a short list mapped to the steps, untick anything wrong, one tap to the answer (mockups A1, A2); **B** go through Steps 1 to 3 pre-filled, marked "From you", then the answer (mockup B); **C** keep today's cards and add "Apply all and see my answer" (mockup C) | **A**: one screen shows what will change, step by step; one tap; still opt-in. A also has a "Go through the steps instead" link (applies the ticked items, then opens Step 1), which covers B's strength without its extra screens. |

## Tests written first
**Unit (vitest):**
- `proposalFrom`: one test per kind of item, covering:
  - path;
  - your car's name and numbers, merged into one Step 2 item;
  - miles;
  - catalog car added;
  - new car built from numbers;
  - car dropped;
  - settings.
  It also covers the 4-car limit (disabled, with the reason), just buy (no car of yours), and that unknown ids are already dropped by `sanitizeAnswer`.
- `applyProposal`:
  - applies only the ticked items;
  - marks the path as chosen;
  - switches Step 2 to "Something else" when the car is named or numbered;
  - returns a snapshot such that Undo puts every value back, names and cars included.
- Confirm box renderer: lists exactly what was applied, in plain words.

**Browser (`qa-ai.cjs`):**
- Typing a sentence (fake AI) shows "From what you said" with the expected items. Nothing has changed before the tap.
- Untick one item, then use the rest: the answer opens with the box. The box lists only what was used, and the unticked item did not change.
- Steps 1 to 3 show the new answers: Trade pressed, your car's name in Step 2, the new car ticked in Step 3.
- Undo restores the snapshot exactly. Looks right hides the box. Change goes to Step 1.
- "Go through the steps instead" opens Step 1 with the path pressed.
- At the 4-car limit, the add item is disabled and gives the reason.
- With no AI, nothing is offered and the steps still work. This check exists already.
- axe, 44 px and cut-off checks at 390 and 1280 px in both themes, for the list and the box.

## Commit plan (verify green before each; PR `phase-4`)
1. `src/app/proposal.ts` (`proposalFrom`, `applyProposal`, snapshot and restore) with its unit tests.
2. "From what you said" list in the sheet, with "Use these N and see my answer" and "Go through the steps instead", plus browser checks.
3. Confirm-first box on the answer (Looks right, Change, Undo), plus browser checks.
4. Docs (`02-ux-spec.md` analyst sheet, `03-architecture.md`, `CLAUDE.md` layout), results, republish the preview.

Unchanged: `src/analyst.ts` (prompt and `sanitizeAnswer`), the engine, the data.

## Risks
| Risk | Mitigation |
| --- | --- |
| The live AI call on claude.ai still fails for an unknown reason (the owner's last test) | Not fixable without the error code; the panel now shows it. Phase 4 is built and tested against the fake AI; owner retests on the preview and sends the code if it fails |
| A wrong reading of the sentence changes the answer silently | Nothing applies without the tap; the list shows every change; the confirm box and Undo come after |
| Undo misses part of the state | Undo restores a full snapshot taken before the tap; a unit test compares every value, names and cars included |
| The analyst proposes more cars than the limit allows | The list shows the item disabled with the reason; the test covers it |

## Estimate
About 1.5 days (`04-phases.md`: about 1). The extra half day is Undo and the confirm box, which the spec's "confirm-first answer" needs.
