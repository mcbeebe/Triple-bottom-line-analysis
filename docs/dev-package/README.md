# Development package: TBL Decision Scorecard, guided-steps redesign and launch

**Decision made (Nov 2, 2026): Option B, guided steps.** One question per screen, then one answer screen. The AI analyst is an opt-in shortcut ("or describe it in a sentence"), not the front door. Chat-first is parked and will be tested against B.

## Read in this order
| # | File | What it is |
| --- | --- | --- |
| 1 | `../../CLAUDE.md` | Working rules for Claude Code in this repo |
| 2 | `01-product-brief.md` | Goal, users, scope, success metrics, what exists today |
| 3 | `02-ux-spec.md` | Every screen: content, states, copy, rules, accessibility |
| 4 | `03-architecture.md` | Module layout, state, routing, share links, analyst client |
| 5 | `04-phases.md` | Phases 0 to 5: tasks, tests, acceptance, commit plan |
| 6 | `05-ai-backend-spec.md` | The server route the public site needs, cost and abuse control |
| 7 | `06-launch-plan.md` | Phases L1 to L6 and the launch checklist |
| 8 | `07-test-plan.md` | Unit, browser, accessibility, usability test protocol |
| 9 | `08-open-decisions.md` | What the owner still has to decide, with recommended defaults |
| 10 | `00-kickoff-prompts.md` | Copy-paste prompts to start each phase |

## References outside the repo
- Design mockups (approved: Option B): https://claude.ai/artifact/9E612DxNv1MRZW7DEzyTvy (source: `docs/ux-options/ux-options.html`; generator `docs/ux-options/build.py`)
- Planning doc with research and sources: https://claude.ai/artifact/TqKou6mtqo43ALSbMkKc1p
- Current published app (artifact build): https://claude.ai/artifact/Xf7GWrECpCrorpXVdCrKko

## Ground rules
- Phases are sequential; each ends with a commit, a green `npm run verify`, and a short demo summary to the owner.
- At the start of each phase: produce a plan, **wait for the owner's approval**, then build.
- Estimates (about 6 to 7 working days for Phases 0 to 5) are estimates, not measurements.
